"use client"

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import Script from "next/script"
import {
  ChevronRight, ChevronDown, FileCode, Folder, FolderOpen,
  Files, Loader2, FileText, Code2, Play, Terminal as TerminalIcon, X,
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
interface FileEntry {
  id: string
  filename: string
  content: string
  language: string
  path: string
  folderPath: string
  isEntryPoint?: boolean
}

interface FolderEntry {
  id: string
  name: string
  path: string
  parentPath: string
  depth: number
}

interface StaffCodeReviewProps {
  files: FileEntry[]
  folders: FolderEntry[]
  questionTitle: string
  submittedAt?: string
  attemptCount?: number
  lateSubmission?: boolean
  lastTestSubmittedAt?: string
}

// ─── Detect Monaco language from filename ─────────────────────────────────────
const monacoLanguageFor = (filename: string, hinted?: string): string => {
  const h = (hinted || "").toLowerCase()
  if (h === "python" || h === "javascript" || h === "typescript" || h === "html" || h === "css" || h === "json" || h === "xml" || h === "markdown") return h
  const ext = (filename.split(".").pop() || "").toLowerCase()
  const map: Record<string, string> = {
    py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    html: "html", htm: "html", css: "css", json: "json", xml: "xml", md: "markdown",
    java: "java", c: "c", cpp: "cpp", cs: "csharp", go: "go", rs: "rust",
    rb: "ruby", php: "php", sql: "sql", sh: "shell", yml: "yaml", yaml: "yaml",
  }
  return map[ext] || "plaintext"
}

// ─── Tree builder ─────────────────────────────────────────────────────────────
type TreeNode =
  | { type: "folder"; folder: FolderEntry; children: TreeNode[] }
  | { type: "file"; file: FileEntry }

const buildTree = (files: FileEntry[], folders: FolderEntry[]): TreeNode[] => {
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
// Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function StaffCodeReview({
  files, folders, questionTitle,
  submittedAt, attemptCount, lateSubmission, lastTestSubmittedAt,
}: StaffCodeReviewProps) {
  const initialActiveId = useMemo(() => {
    const entry = files.find((f) => f.isEntryPoint)
    if (entry) return entry.id
    return files[0]?.id || null
  }, [files])

  const [activeId, setActiveId] = useState<string | null>(initialActiveId)
  const [openIds, setOpenIds] = useState<string[]>(initialActiveId ? [initialActiveId] : [])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(["/", ...folders.map((f) => f.path)]),
  )
  const [showExplorer, setShowExplorer] = useState(true)

  // ─── Pyodide execution state ────────────────────────────────────────────────
  const [pyodideReady, setPyodideReady] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [terminalLogs, setTerminalLogs] = useState<
    Array<{ id: string; kind: "stdout" | "stderr" | "system" | "success" | "error"; message: string }>
  >([])
  const pyodideRef = useRef<any>(null)

  const addLog = useCallback((kind: "stdout" | "stderr" | "system" | "success" | "error", message: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind, message },
    ])
  }, [])

  const clearTerminal = useCallback(() => setTerminalLogs([]), [])

  // Detect if any Python files exist — only then we offer Run
  const hasPython = useMemo(
    () => files.some((f) => (f.filename || "").toLowerCase().endsWith(".py")),
    [files],
  )

  // ─── Pyodide bootstrap (shared window-level promise, polls if script already loaded) ──
  const initPyodide = useCallback(async () => {
    if (pyodideRef.current) { setPyodideReady(true); return }
    const w = window as any
    if (!w.loadPyodide) return
    try {
      if (!w.__pyodidePromise) {
        w.__pyodidePromise = w.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
        })
      }
      const pyodide = await w.__pyodidePromise
      pyodideRef.current = pyodide
      setPyodideReady(true)
    } catch (e: any) {
      addLog("error", `Failed to load Python runtime: ${e?.message || e}`)
    }
  }, [addLog])

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

  // ─── Mount workspace + run entry ────────────────────────────────────────────
  const findEntry = (): FileEntry | null => {
    const explicit = files.find((f) => f.isEntryPoint && f.filename.toLowerCase().endsWith(".py"))
    if (explicit) return explicit
    const mainPy = files.find((f) => f.filename.toLowerCase() === "main.py")
    if (mainPy) return mainPy
    return files.find((f) => f.filename.toLowerCase().endsWith(".py")) || null
  }

  const mountWorkspace = useCallback(() => {
    const pyodide = pyodideRef.current
    if (!pyodide) return
    try {
      pyodide.runPython(`
import shutil, os
if os.path.exists('/workspace'):
    shutil.rmtree('/workspace')
os.makedirs('/workspace', exist_ok=True)
`)
    } catch { /* ignore */ }

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

  const runStudentCode = async () => {
    if (!pyodideReady || !pyodideRef.current) {
      setShowTerminal(true)
      addLog("error", "Python runtime is not ready yet.")
      return
    }
    const entry = findEntry()
    if (!entry) {
      setShowTerminal(true)
      addLog("error", "No Python entry file in this submission.")
      return
    }
    if (isRunning) return

    setIsRunning(true)
    setShowTerminal(true)
    clearTerminal()
    addLog("system", `Running ${entry.filename}…`)

    const pyodide = pyodideRef.current
    try {
      pyodide.setStdout({ batched: (msg: string) => addLog("stdout", msg) })
      pyodide.setStderr({ batched: (msg: string) => addLog("stderr", msg) })

      mountWorkspace()

      // Flush any cached modules from /workspace so we run the submitted code as-is
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

  const activeFile = useMemo(() => files.find((f) => f.id === activeId) || null, [files, activeId])
  const openFiles = useMemo(
    () => openIds.map((id) => files.find((f) => f.id === id)).filter(Boolean) as FileEntry[],
    [openIds, files],
  )
  const tree = useMemo(() => buildTree(files, folders), [files, folders])

  const open = (id: string) => {
    setActiveId(id)
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }
  const closeTab = (id: string) => {
    setOpenIds((prev) => {
      const next = prev.filter((x) => x !== id)
      if (activeId === id) setActiveId(next[next.length - 1] || null)
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

  const renderTreeNode = (node: TreeNode, depth: number): React.ReactNode => {
    if (node.type === "folder") {
      const isOpen = expandedFolders.has(node.folder.path)
      return (
        <div key={node.folder.id}>
          <div
            className="flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-gray-100"
            style={{ paddingLeft: 8 + depth * 12, color: "#374151", fontFamily: "Poppins, sans-serif" }}
            onClick={() => toggleFolder(node.folder.path)}
          >
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {isOpen ? <FolderOpen size={13} color="#d97706" /> : <Folder size={13} color="#d97706" />}
            <span className="flex-1 truncate">{node.folder.name}</span>
          </div>
          {isOpen && node.children.map((c) => renderTreeNode(c, depth + 1))}
        </div>
      )
    }
    const isActive = activeId === node.file.id
    return (
      <div
        key={node.file.id}
        className={`flex items-center gap-1 px-2 py-1 text-xs cursor-pointer ${
          isActive ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700"
        }`}
        style={{ paddingLeft: 8 + depth * 12 + 12, fontFamily: "Poppins, sans-serif" }}
        onClick={() => open(node.file.id)}
      >
        <FileCode size={12} color={(node.file.language || "").toLowerCase() === "python" ? "#3776ab" : "#888"} />
        <span className="flex-1 truncate">{node.file.filename}</span>
        {node.file.isEntryPoint && (
          <span className="text-[9px] px-1 py-0 rounded bg-blue-100 text-blue-700 border border-blue-200 font-semibold">
            ENTRY
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"
        onLoad={initPyodide}
        strategy="afterInteractive"
      />
      <div className="flex flex-col h-full w-full" style={{ background: "#fff", fontFamily: "Poppins, sans-serif" }}>
      {/* Header strip — Code Submission · Run · Attempt · Submitted · Late */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ background: "#f8f9fa", borderColor: "#e5e7eb" }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Code2 size={12} />
            Code Submission
          </div>
          <div className="text-xs font-semibold text-gray-900 truncate">{questionTitle}</div>
        </div>
        <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
          {/* Run button — only when submission contains Python files */}
          {hasPython && (
            <button
              onClick={runStudentCode}
              disabled={!pyodideReady || isRunning}
              title={pyodideReady ? "Run the submitted code" : "Python runtime is loading…"}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 6, border: "none",
                background: (!pyodideReady || isRunning) ? "#9ca3af" : "#3b82f6",
                color: "#fff", fontSize: 11, fontWeight: 600,
                cursor: (!pyodideReady || isRunning) ? "not-allowed" : "pointer",
                opacity: (!pyodideReady || isRunning) ? 0.7 : 1,
              }}
            >
              {isRunning ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              {!pyodideReady ? "Loading…" : isRunning ? "Running" : "Run"}
            </button>
          )}
          {attemptCount != null && (
            <span className="px-2 py-0.5 rounded font-semibold" style={{ background: "#f3f4f6", color: "#374151" }}>
              Attempt {attemptCount}
            </span>
          )}
          {submittedAt && (
            <span className="px-2 py-0.5 rounded" style={{ background: "#f3f4f6", color: "#6b7280" }}>
              Submitted {new Date(submittedAt).toLocaleString()}
            </span>
          )}
          {lateSubmission && (
            <span
              className="px-2 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse"
              style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}
              title={lastTestSubmittedAt ? `Submitted late at ${new Date(lastTestSubmittedAt).toLocaleString()}` : "Late submission"}
            >
              ⚠ LATE SUBMISSION
              {lastTestSubmittedAt && (
                <span className="font-medium ml-1" style={{ color: "#7f1d1d" }}>
                  {new Date(lastTestSubmittedAt).toLocaleString()}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* VS Code-style activity bar — Explorer toggle */}
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

        {/* Collapsible file tree */}
        {showExplorer && (
          <div className="flex flex-col flex-shrink-0 overflow-hidden border-r" style={{ width: 240, background: "#fafafa", borderColor: "#e5e7eb" }}>
            <div className="px-3 py-2 border-b flex items-center justify-between gap-1.5" style={{ background: "#f3f4f6", borderColor: "#e5e7eb" }}>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                Explorer
              </span>
              <span className="text-[9px] text-gray-500 font-mono">
                {files.length} file{files.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {tree.length === 0 ? (
                <div className="text-[11px] text-gray-500 px-3 py-2">No files submitted.</div>
              ) : (
                tree.map((n) => renderTreeNode(n, 0))
              )}
            </div>
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center overflow-x-auto flex-shrink-0 border-b" style={{ background: "#f3f4f6", borderColor: "#e5e7eb", minHeight: 34 }}>
            {openFiles.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-500">No file selected</div>
            ) : (
              openFiles.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => setActiveId(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r flex-shrink-0 ${
                    tab.id === activeId ? "bg-white text-gray-900" : "text-gray-600 hover:bg-gray-200"
                  }`}
                  style={{ borderColor: "#e5e7eb" }}
                >
                  <FileCode size={11} color={(tab.language || "").toLowerCase() === "python" ? "#3776ab" : "#888"} />
                  <span>{tab.filename}</span>
                  {tab.isEntryPoint && (
                    <span className="text-[8px] px-1 rounded bg-blue-100 text-blue-700 font-semibold">ENTRY</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                    className="ml-1 p-0.5 rounded hover:bg-gray-300 text-gray-500"
                    title="Close tab"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Read-only Monaco */}
          <div className="flex-1 min-h-0 overflow-hidden" style={{ background: "#fff" }}>
            {activeFile ? (
              <MonacoEditor
                key={activeFile.id}
                height="100%"
                language={monacoLanguageFor(activeFile.filename, activeFile.language)}
                theme="vs-light"
                value={activeFile.content}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'ui-monospace, "Fira Code", Consolas, monospace',
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  renderLineHighlight: "none",
                  domReadOnly: true,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                <FileText className="w-5 h-5 mr-2" />
                Select a file from the tree to view it.
              </div>
            )}
          </div>

          {/* ── Terminal output (visible when Run is clicked) ── */}
          {showTerminal && (
            <div
              className="flex flex-col flex-shrink-0 overflow-hidden border-t"
              style={{ height: 200, background: "#fff", borderColor: "#e5e7eb" }}
            >
              <div
                className="flex items-center justify-between px-3 py-1 border-b"
                style={{ background: "#f3f4f6", borderColor: "#e5e7eb" }}
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-gray-600">
                  <TerminalIcon size={11} />
                  Output
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearTerminal}
                    className="text-[10px] text-gray-500 hover:text-gray-900 px-2 py-0.5 rounded hover:bg-gray-200"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowTerminal(false)}
                    className="text-gray-500 hover:text-gray-900 p-0.5 rounded hover:bg-gray-200"
                    title="Hide output"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 font-mono text-[12px] leading-relaxed" style={{ background: "#fafafa" }}>
                {terminalLogs.length === 0 ? (
                  <span className="text-gray-400 italic text-[11px]">No output yet.</span>
                ) : (
                  terminalLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        color: log.kind === "stderr" || log.kind === "error" ? "#dc2626"
                          : log.kind === "success" ? "#15803d"
                          : log.kind === "system" ? "#2563eb"
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
          )}
        </div>
      </div>
    </div>
    </>
  )
}
