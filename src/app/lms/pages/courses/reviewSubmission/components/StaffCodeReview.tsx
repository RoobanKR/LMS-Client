"use client"

import React, { useEffect, useState } from "react"
import { Loader2, Code2, Terminal as TerminalIcon, AlertCircle } from "lucide-react"

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
  /** Unique id for this submission — used to isolate its review folder. */
  submissionId?: string
  /** Languages allowed by the exercise (for debug configs). */
  selectedLanguages?: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// Staff Core-Programming review — shows the stored submission inside real VS Code
// (code-server), read-only-style, in an isolated review folder so it never touches
// a student's live workspace. Grading panel lives outside this component.
// ═══════════════════════════════════════════════════════════════════════════════
export default function StaffCodeReview({
  files, folders, questionTitle,
  submittedAt, attemptCount, lateSubmission, lastTestSubmittedAt,
  submissionId, selectedLanguages,
}: StaffCodeReviewProps) {
  const CODE_SERVER_URL =
    process.env.NEXT_PUBLIC_CODE_SERVER_URL || "https://docker-file-production-9bf1.up.railway.app"
      // process.env.NEXT_PUBLIC_CODE_SERVER_URL || "https://docker-file-production-9bf1.up.railway.app"

  const reviewId = submissionId || "current"
  const reviewSubdir = `_review/${reviewId}`

  const [ready, setReady] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Write the stored submission into its isolated review folder, then open it.
  useEffect(() => {
    let cancelled = false
    setReady(false)
    setIframeLoading(true)
    setError(null)

    ;(async () => {
      try {
        const res = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subdir: reviewSubdir,
            languages: selectedLanguages || [],
            files: files.map((f) => ({ path: f.path || `/${f.filename}`, content: f.content })),
          }),
        })
        const data = await res.json()
        if (cancelled) return
        if (!data?.ok) {
          setError(data?.error || "Could not load the submission into the editor.")
          return
        }
        setReady(true)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Could not reach the editor service.")
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId])

  const iframeSrc = `${CODE_SERVER_URL}/?folder=/home/coder/project/${reviewSubdir}`

  return (
    <div className="flex flex-col h-full w-full" style={{ background: "#1e1e1e", fontFamily: "Poppins, sans-serif" }}>
      {/* Header strip — Code Submission · Attempt · Submitted · Late (grading panel is separate) */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ background: "#f8f9fa", borderColor: "#e5e7eb" }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Code2 size={12} />
            Code Submission
          </div>
          <div className="text-xs font-semibold text-gray-900 truncate">{questionTitle}</div>
        </div>
        <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <TerminalIcon size={11} /> Run in the VS Code terminal (Ctrl + `)
          </span>
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

      {/* code-server iframe (the stored submission, opened in real VS Code) */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6" style={{ background: "#1e1e1e" }}>
            <AlertCircle className="w-6 h-6 text-rose-400" />
            <div className="text-sm text-rose-300">{error}</div>
            <div className="text-[11px] text-gray-500">Make sure code-server is running at {CODE_SERVER_URL}.</div>
          </div>
        ) : (
          <>
            {(!ready || iframeLoading) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: "#1e1e1e" }}>
                <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                <div className="text-sm text-gray-400">
                  {!ready ? "Loading the student's submission…" : "Loading VS Code…"}
                </div>
              </div>
            )}
            {ready && (
              <iframe
                key={reviewId}
                src={iframeSrc}
                title="Submission — VS Code (code-server)"
                className="w-full h-full"
                style={{ border: "none", display: "block" }}
                allow="clipboard-read; clipboard-write"
                onLoad={() => setIframeLoading(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
