"use client"

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { FileText } from "lucide-react"
import { API_ORIGIN } from "@/lib/apiBase"

// Course Setup › Resource Type › PPT › Viewer. "default" keeps the slide-image
// viewer as it is; the other two show the deck in a frame instead:
//   libreoffice → the server's LibreOffice SVG slideshow. Animations play, and
//                 our Prev / Next drive it: Next plays the next click animation,
//                 then moves on once the slide has none left.
//   office      → Microsoft Office Online's embed, with its own controls. It
//                 needs the file on a public https URL.
export type PptViewerMode = "default" | "libreoffice" | "office"

export const pptShowMode = (mode?: string | null): "libreoffice" | "office" | null =>
  mode === "libreoffice" || mode === "office" ? mode : null

export interface PptShowState { slide: number; total: number; canNext: boolean; canPrev: boolean }
export interface PptShowHandle { next: () => void; prev: () => void; goTo: (slide: number) => void }

const showUrlCache: Record<string, string> = {}

const PptShowFrame = forwardRef<PptShowHandle, {
  pptUrl: string
  mode: "libreoffice" | "office"
  title?: string
  onState?: (state: PptShowState) => void
}>(function PptShowFrame({ pptUrl, mode, title, onState }, ref) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  const [showUrl, setShowUrl] = useState(mode === "libreoffice" ? showUrlCache[pptUrl] || "" : "")
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (mode !== "libreoffice" || !pptUrl) return
    if (showUrlCache[pptUrl]) { setShowUrl(showUrlCache[pptUrl]); return }
    let cancelled = false
    setError(null)
    fetch(`${API_ORIGIN}/api/ppt/convert-show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pptUrl }),
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.success && data.showUrl) { showUrlCache[pptUrl] = data.showUrl; setShowUrl(data.showUrl) }
        else setError(data.error || "Conversion failed")
      })
      .catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [mode, pptUrl, retry])

  useEffect(() => {
    if (mode !== "libreoffice") return
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || e.data?.type !== "lms-ppt-state") return
      const { slide, total, canNext, canPrev } = e.data
      onStateRef.current?.({ slide, total, canNext: !!canNext, canPrev: !!canPrev })
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [mode])

  const send = (cmd: string, slide?: number) =>
    frameRef.current?.contentWindow?.postMessage({ type: "lms-ppt", cmd, slide }, "*")
  useImperativeHandle(ref, () => ({
    next: () => send("next"),
    prev: () => send("prev"),
    goTo: (slide: number) => send("goto", slide),
  }), [])

  const src = mode === "office"
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pptUrl)}`
    : showUrl

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", maxWidth: 420, margin: "0 auto" }}>
        <FileText size={28} style={{ color: "#ef4444", marginBottom: 12 }} />
        <p style={{ fontWeight: 700, color: "#6b7280", marginBottom: 8, fontSize: 15 }}>Slideshow conversion failed</p>
        <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 20, lineHeight: 1.5 }}>{error}</p>
        <button onClick={() => setRetry(c => c + 1)}
          style={{ padding: "10px 20px", background: "linear-gradient(135deg,#F97316,#EA580C)", color: "white", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
          Retry
        </button>
      </div>
    )
  }

  if (!src) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ width: 48, height: 48, border: "4px solid rgba(249,115,22,0.15)", borderTopColor: "#F97316", borderRadius: "50%", animation: "spin 0.75s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Preparing slideshow…</p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>This may take 30–60 seconds on first load</p>
      </div>
    )
  }

  return (
    <div style={{
      width: "100%", aspectRatio: "16 / 9", maxHeight: "calc(100dvh - 200px)", minHeight: 320,
      background: "white", borderRadius: 8, overflow: "hidden", boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
    }}>
      {/* Client pages send COEP (next.config.ts). Our slideshow file opts in by
          its headers; Microsoft's viewer can't, so it loads as a credentialless
          frame (Chrome / Edge) instead. */}
      <iframe ref={frameRef} key={src} src={src} title={title || "Presentation"} allow="fullscreen"
        {...(mode === "office" ? { credentialless: "" } : {})}
        style={{ width: "100%", height: "100%", border: "none", background: "white" }} />
    </div>
  )
})

export default PptShowFrame
