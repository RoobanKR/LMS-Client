"use client"

// AI code review — what a student gets when they answer "Yes" to
// "Evaluate your code with AI?" on Submit. The server (POST /ai/code-review)
// asks Gemini for time & space complexity, a rating per parameter, strengths,
// improvements and missed edge cases; this file holds the request, the
// opt-in prompt and the review view shown in the Test Results drawer.
// Feedback only — the review never changes the answer's marks.

import React from "react"
import {
  AlertTriangle, CheckCircle2, Clock, Cpu, Lightbulb, Loader2, RefreshCw, Sparkles, Target, X, XCircle,
} from "lucide-react"
import { http } from "@/lib/http"

export interface AiReviewComplexity {
  value: string
  explanation: string
  rating: "optimal" | "acceptable" | "needs-improvement"
}

export interface AiCodeReview {
  overallScore: number
  verdict: string
  summary: string
  timeComplexity: AiReviewComplexity
  spaceComplexity: AiReviewComplexity
  optimal: { time: string; space: string; note: string }
  parameters: { key: string; label: string; score: number; comment: string }[]
  strengths: string[]
  improvements: string[]
  edgeCasesMissed: string[]
  suggestedApproach: string
  model?: string
  reviewedAt?: string
}

export type AiReviewState =
  | { status: "loading" }
  | { status: "done"; data: AiCodeReview }
  | { status: "error"; error: string }

export interface AiReviewRequest {
  code: string
  language: string
  question: { title?: string; description?: string; constraints?: unknown[] }
  testSummary?: { passed: number; total: number }
}

export async function requestAiCodeReview(body: AiReviewRequest): Promise<AiCodeReview> {
  try {
    const { data } = await http.post("/ai/code-review", body, { timeout: 120000 })
    if (!data?.success || !data?.data) throw new Error(data?.message || "AI review failed.")
    return data.data as AiCodeReview
  } catch (e: any) {
    throw new Error(e?.response?.data?.message || e?.message || "AI review failed.")
  }
}

const FONT = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif"
const VIOLET = "#6941C6"

const scoreTone = (n: number) =>
  n >= 80 ? { fg: "#046C4E", bg: "#ECFDF3", bar: "#12B76A", border: "#BBF7D0" }
    : n >= 60 ? { fg: "#B54708", bg: "#FFFAEB", bar: "#F79009", border: "#F5DFA8" }
      : { fg: "#B42318", bg: "#FEF3F2", bar: "#F04438", border: "#FBD3CE" }

const RATING: Record<AiReviewComplexity["rating"], { label: string; fg: string; bg: string }> = {
  optimal: { label: "Optimal", fg: "#046C4E", bg: "#ECFDF3" },
  acceptable: { label: "Acceptable", fg: "#B54708", bg: "#FFFAEB" },
  "needs-improvement": { label: "Needs improvement", fg: "#B42318", bg: "#FEF3F2" },
}

// ─── The opt-in prompt on Submit ────────────────────────────────────────────

export function AiReviewPrompt({
  open, onClose, onSubmitOnly, onSubmitWithAi,
}: {
  open: boolean
  onClose: () => void
  onSubmitOnly: () => void
  onSubmitWithAi: () => void
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  if (!open) return null
  const checks = ["Time complexity", "Space complexity", "Correctness", "Efficiency", "Code quality & readability", "Edge cases & best practices"]
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1160, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT }} role="dialog" aria-modal="true" aria-labelledby="ai-review-prompt-title">
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(16,24,40,0.45)" }} />
      <div className="animate-in fade-in zoom-in-95 duration-150" style={{ position: "relative", width: "min(440px, 100%)", background: "#fff", borderRadius: 16, boxShadow: "0 24px 48px rgba(16,24,40,0.24)", padding: 22 }}>
        <button type="button" onClick={onClose} aria-label="Cancel" className="hover:bg-[#F2F4F7]" style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: 8, border: 0, background: "transparent", color: "#667085", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={16} />
        </button>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "#F4F3FF", color: VIOLET, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={22} />
        </span>
        <h2 id="ai-review-prompt-title" style={{ margin: "14px 0 4px", fontSize: 17, fontWeight: 700, color: "#101828" }}>Evaluate your code with AI?</h2>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#475467" }}>
          Your answer is submitted either way. With AI review you also get a detailed report on your code — it does not change your marks.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", margin: "14px 0 18px", padding: 12, borderRadius: 10, background: "#F9FAFB", border: "1px solid #EAECF0" }}>
          {checks.map((c) => (
            <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#344054" }}>
              <CheckCircle2 size={13} style={{ color: VIOLET, flexShrink: 0 }} />{c}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" onClick={onSubmitOnly} className="hover:bg-[#F9FAFB]" style={{ height: 38, padding: "0 16px", borderRadius: 9, border: "1px solid #D0D5DD", background: "#fff", color: "#344054", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            No, just submit
          </button>
          <button type="button" onClick={onSubmitWithAi} autoFocus className="hover:brightness-105" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 9, border: 0, background: `linear-gradient(180deg, #7F56D9, ${VIOLET})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(105,65,198,0.3)" }}>
            <Sparkles size={15} /> Yes, submit & review
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── The review, inside the results drawer ─────────────────────────────────

export function AiCodeReviewView({ review, onRetry }: { review: AiReviewState; onRetry?: () => void }) {
  if (review.status === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "48px 16px" }} aria-live="polite">
        <span style={{ width: 48, height: 48, borderRadius: 14, background: "#F4F3FF", color: VIOLET, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={22} className="animate-spin" />
        </span>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#101828" }}>Reviewing your code…</div>
        <div style={{ fontSize: 12.5, color: "#667085", maxWidth: 300, lineHeight: 1.5 }}>Checking time & space complexity, correctness, code quality and edge cases. This takes a few seconds.</div>
      </div>
    )
  }
  if (review.status === "error") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, padding: "40px 16px" }}>
        <AlertTriangle size={26} style={{ color: "#B54708" }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: "#101828" }}>AI review could not be completed</div>
        <div style={{ fontSize: 12.5, color: "#667085", maxWidth: 320, lineHeight: 1.5 }}>{review.error} Your answer was still submitted.</div>
        {onRetry && (
          <button type="button" onClick={onRetry} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 8, border: `1px solid ${VIOLET}`, background: "#fff", color: VIOLET, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={13} /> Try again
          </button>
        )}
      </div>
    )
  }

  const r = review.data
  const tone = scoreTone(r.overallScore)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Overall */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 14, borderRadius: 12, border: "1px solid #E9D7FE", background: "linear-gradient(180deg, #FAF8FF, #FFFFFF)" }}>
        <ScoreRing value={r.overallScore} color={tone.bar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: VIOLET, textTransform: "uppercase", letterSpacing: 0.4 }}>
            <Sparkles size={12} /> AI code review
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#101828", marginTop: 3, lineHeight: 1.35 }}>{r.verdict || "Review complete"}</div>
        </div>
      </div>
      {r.summary && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#344054" }}>{r.summary}</p>}

      {/* Complexity */}
      <Section title="Complexity analysis">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ComplexityCard icon={<Clock size={14} />} label="Time" c={r.timeComplexity} />
          <ComplexityCard icon={<Cpu size={14} />} label="Space" c={r.spaceComplexity} />
        </div>
        {(r.optimal.time || r.optimal.space) && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "#F9FAFB", border: "1px dashed #D0D5DD", fontSize: 12.5, color: "#344054", lineHeight: 1.55 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#101828" }}>
              <Target size={13} style={{ color: VIOLET }} /> Best possible: {[r.optimal.time && `Time ${r.optimal.time}`, r.optimal.space && `Space ${r.optimal.space}`].filter(Boolean).join(" · ")}
            </div>
            {r.optimal.note && <div style={{ marginTop: 4 }}>{r.optimal.note}</div>}
          </div>
        )}
      </Section>

      {/* Parameters */}
      <Section title="Evaluation parameters">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {r.parameters.map((p) => {
            const t = scoreTone(p.score)
            return (
              <div key={p.key} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #EAECF0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#101828" }}>{p.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: t.fg }}>{p.score}/100</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "#F2F4F7", marginTop: 6, overflow: "hidden" }} aria-hidden="true">
                  <div style={{ width: `${p.score}%`, height: "100%", borderRadius: 99, background: t.bar }} />
                </div>
                {p.comment && <div style={{ fontSize: 12.5, color: "#475467", marginTop: 6, lineHeight: 1.5 }}>{p.comment}</div>}
              </div>
            )
          })}
        </div>
      </Section>

      {r.strengths.length > 0 && (
        <Section title="What you did well">
          <Bullets items={r.strengths} icon={<CheckCircle2 size={14} style={{ color: "#12B76A" }} />} />
        </Section>
      )}
      {r.improvements.length > 0 && (
        <Section title="How to improve">
          <Bullets items={r.improvements} icon={<Lightbulb size={14} style={{ color: "#F79009" }} />} />
        </Section>
      )}
      {r.edgeCasesMissed.length > 0 && (
        <Section title="Edge cases to handle">
          <Bullets items={r.edgeCasesMissed} icon={<XCircle size={14} style={{ color: "#F04438" }} />} />
        </Section>
      )}
      {r.suggestedApproach && (
        <Section title="Suggested approach">
          <p style={{ margin: 0, padding: "10px 12px", borderRadius: 10, background: "#F4F3FF", color: "#3E1C96", fontSize: 12.5, lineHeight: 1.6 }}>{r.suggestedApproach}</p>
        </Section>
      )}

      <div style={{ fontSize: 11.5, color: "#98A2B3", lineHeight: 1.5 }}>
        AI feedback is a model&apos;s assessment and does not change your marks{r.model ? ` · ${r.model}` : ""}.
      </div>
    </div>
  )
}

function ScoreRing({ value, color }: { value: number; color: string }) {
  const r = 24
  const c = 2 * Math.PI * r
  return (
    <svg width={60} height={60} viewBox="0 0 60 60" role="img" aria-label={`Overall ${value} out of 100`} style={{ flexShrink: 0 }}>
      <circle cx={30} cy={30} r={r} fill="none" stroke="#EAECF0" strokeWidth={6} />
      <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 30 30)" />
      <text x={30} y={34} textAnchor="middle" fontSize={15} fontWeight={700} fill="#101828">{value}</text>
    </svg>
  )
}

function ComplexityCard({ icon, label, c }: { icon: React.ReactNode; label: string; c: AiReviewComplexity }) {
  const rating = RATING[c.rating] || RATING.acceptable
  return (
    <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #EAECF0", background: "#fff", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#667085" }}>{icon}{label} complexity</div>
      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 17, fontWeight: 700, color: "#101828", marginTop: 4, overflowWrap: "anywhere" }}>{c.value}</div>
      <span style={{ display: "inline-block", marginTop: 5, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, color: rating.fg, background: rating.bg }}>{rating.label}</span>
      {c.explanation && <div style={{ fontSize: 12, color: "#475467", marginTop: 6, lineHeight: 1.5 }}>{c.explanation}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#667085", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function Bullets({ items, icon }: { items: string[]; icon: React.ReactNode }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map((t, i) => (
        <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "#344054", lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, marginTop: 2 }}>{icon}</span>{t}
        </li>
      ))}
    </ul>
  )
}
