"use client"
// The exercise's own countdown, shown in the middle of the editor toolbar.
//
// Starts at the duration set in Exercise Settings (60 → "1:00:00", then
// "59:59", …) and the editor submits the work and closes when it reaches
// 00:00. Amber in the last 5 minutes, red and pulsing in the last minute.
import React from "react"
import { Clock } from "lucide-react"

/** 3600 → "1:00:00", 3599 → "59:59", 5 → "00:05". */
export const formatCountdown = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(sec).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export const CountdownPill: React.FC<{ seconds: number; font?: string }> = ({ seconds, font }) => {
  const danger = seconds < 60
  const warning = !danger && seconds < 300
  const c = danger
    ? { fg: "#dc2626", bg: "#fef2f2", bd: "#fecaca" }
    : warning
      ? { fg: "#b45309", bg: "#fffbeb", bd: "#fde68a" }
      : { fg: "#0F5B5D", bg: "#F0FBFA", bd: "#BFE9E5" }
  return (
    <div
      role="timer"
      aria-label={`Time left ${formatCountdown(seconds)}`}
      title="Time left. Your work is submitted automatically at 00:00."
      // Inline: it sits after Notes / Overview / Info in the toolbar's centre
      // group, which does the centring.
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 32, padding: "0 12px", borderRadius: 8, flexShrink: 0,
        border: `1px solid ${c.bd}`, background: c.bg, color: c.fg,
        fontFamily: font, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
        animation: danger ? "pulse 1s ease-in-out infinite" : undefined,
      }}
    >
      <Clock size={14} />
      <span>Time left</span>
      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 15, fontWeight: 800, letterSpacing: 0.5 }}>
        {formatCountdown(seconds)}
      </span>
    </div>
  )
}
