"use client"

// Shared building blocks for the Profile page and its dialogs: the purple
// accent, cards, chips, meters, empty states, the avatar and a few formatters.
// The accent is spelled as literal classes (not CSS variables on the page)
// because the dialogs render in a portal outside the page's own tree.

import type React from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// ── Accent ───────────────────────────────────────────────────────────────────
export const ACCENT_TEXT = "text-[#5b47e0] dark:text-[#a396f7]"
export const ACCENT_WASH = "bg-[#f1eefe] dark:bg-[#7a6af0]/15"
export const ACCENT_RING = "focus-visible:ring-2 focus-visible:ring-[#5b47e0]/30 focus-visible:outline-none"

type BtnVariant = "primary" | "outline" | "ghost" | "danger" | "soft"
type BtnSize = "sm" | "md"

const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] font-medium transition-colors duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " + ACCENT_RING
const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "bg-[#5b47e0] text-white shadow-xs hover:bg-[#4a37c9] dark:bg-[#7a6af0] dark:hover:bg-[#8b7df3]",
  outline: "border border-hairline-strong bg-surface text-heading shadow-xs hover:bg-row-hover",
  ghost: "text-body hover:bg-row-hover hover:text-heading",
  danger: "bg-red-600 text-white shadow-xs hover:bg-red-700",
  soft: "border border-[#d9d2fb] bg-[#f6f4ff] text-[#4a37c9] hover:bg-[#ece8fe] dark:border-[#7a6af0]/40 dark:bg-[#7a6af0]/10 dark:text-[#b4aaf9]",
}
const BTN_SIZE: Record<BtnSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
}

export function PButton({
  variant = "outline", size = "md", loading, className, children, disabled, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; loading?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

// ── Cards ────────────────────────────────────────────────────────────────────
export const CARD = "rounded-2xl border border-hairline bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]"

/** A content card: purple icon, title, optional subtitle and a right-aligned
 *  action, over its body. */
export function Panel({
  icon: Icon, title, subtitle, action, children, className, bodyClassName,
}: {
  icon?: React.ElementType; title: string; subtitle?: React.ReactNode; action?: React.ReactNode
  children: React.ReactNode; className?: string; bodyClassName?: string
}) {
  return (
    <section className={cn(CARD, "min-w-0", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && <Icon className={cn("h-5 w-5 flex-shrink-0", ACCENT_TEXT)} />}
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-heading">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-subtle">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  )
}

export function Chip({ tone = "neutral", children, className }: {
  tone?: "neutral" | "success" | "accent" | "warning"; children: React.ReactNode; className?: string
}) {
  const t = {
    neutral: "bg-surface-sunken text-body ring-hairline",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
    accent: "bg-[#f1eefe] text-[#4a37c9] ring-[#5b47e0]/20 dark:bg-[#7a6af0]/15 dark:text-[#b4aaf9] dark:ring-[#7a6af0]/30",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  }[tone]
  return (
    <span className={cn("inline-flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", t, className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status, size = "md" }: { status?: string; size?: "sm" | "md" }) {
  if (!status) return null
  const s = status.toLowerCase()
  const cls = s === "active"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30"
    : s === "pending"
      ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30"
      : "bg-surface-sunken text-body ring-hairline"
  const dot = s === "active" ? "bg-emerald-500" : s === "pending" ? "bg-amber-500" : "bg-gray-400"
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset",
      size === "md" ? "px-2.5 py-0.5 text-[13px]" : "px-2 py-0.5 text-xs",
      cls,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {cap(status)}
    </span>
  )
}

/** A thin progress bar: purple while under way, green once complete. */
export function Meter({ pct, className }: { pct: number; className?: string }) {
  const w = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-hairline", className)}
      role="progressbar" aria-valuenow={w} aria-valuemin={0} aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", w >= 100 ? "bg-emerald-500" : "bg-[#5b47e0] dark:bg-[#8b7df3]")}
        style={{ width: `${w}%` }}
      />
    </div>
  )
}

/** A circular percentage ring. */
export function Ring({ pct, size = 96, stroke = 9, label }: { pct: number; size?: number; stroke?: number; label?: string }) {
  const w = Math.max(0, Math.min(100, Math.round(pct)))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-[#ece8fe] dark:stroke-white/10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - w / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", w >= 100 ? "stroke-emerald-500" : "stroke-[#5b47e0] dark:stroke-[#8b7df3]")}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums text-heading" aria-label={label}>
        {w}%
      </span>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }: {
  icon: React.ElementType; title: string; text?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className={cn("mb-3 grid h-11 w-11 place-items-center rounded-full", ACCENT_WASH)}>
        <Icon className={cn("h-5 w-5", ACCENT_TEXT)} />
      </span>
      <p className="text-sm font-medium text-heading">{title}</p>
      {text && <p className="mt-1 max-w-sm text-xs text-subtle">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-hairline", className)} />
}

// ── Avatar ───────────────────────────────────────────────────────────────────
/** The stored default is a URL to `default_profile_image.svg` (older records
 *  carry the string "default") — neither is a photo the person chose. */
export const hasRealPhoto = (url?: string | null) =>
  !!url && url !== "default" && !url.includes("default_profile_image")

export function Avatar({ src, firstName, lastName, className, textClassName }: {
  src?: string | null; firstName?: string; lastName?: string; className?: string; textClassName?: string
}) {
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase()
  return (
    <div className={cn("grid flex-shrink-0 place-items-center overflow-hidden rounded-full bg-[#ece8fe] text-[#4a37c9] dark:bg-[#7a6af0]/20 dark:text-[#c9c1fb]", className)}>
      {hasRealPhoto(src) ? (
        <Image src={src as string} alt={`${firstName || ""} ${lastName || ""}`.trim() || "Profile photo"} width={160} height={160} className="h-full w-full object-cover" />
      ) : (
        <span className={cn("font-semibold", textClassName)}>{initials || "?"}</span>
      )}
    </div>
  )
}

// ── Dialog frame ─────────────────────────────────────────────────────────────
/** The page's dialogs share one frame: title + description, body, footer. */
export function DialogFrame({
  open, onRequestClose, title, description, children, footer, width = "sm:max-w-[520px]",
}: {
  open: boolean; onRequestClose: () => void; title: string; description?: string
  children: React.ReactNode; footer?: React.ReactNode; width?: string
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onRequestClose() }}>
      <DialogContent className={cn("gap-0 overflow-hidden rounded-xl p-0", width)}>
        <DialogHeader className="border-b border-hairline px-6 py-4 text-left">
          <DialogTitle className="text-base font-semibold text-heading">{title}</DialogTitle>
          {description && <DialogDescription className="text-[13px] leading-relaxed text-subtle">{description}</DialogDescription>}
        </DialogHeader>
        <div className="max-h-[70dvh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <DialogFooter className="border-t border-hairline bg-surface-sunken/50 px-6 py-3">{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** "Discard these changes?" — shown when a dialog with unsaved input closes. */
export function DiscardDialog({ open, onKeep, onDiscard, text }: {
  open: boolean; onKeep: () => void; onDiscard: () => void; text?: string
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onKeep() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Discard your changes?</DialogTitle>
          <DialogDescription>{text || "What you entered has not been saved and will be lost."}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <PButton size="sm" variant="outline" onClick={onKeep}>Keep editing</PButton>
          <PButton size="sm" variant="danger" onClick={onDiscard}>Discard</PButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A labelled form field with one line under it: the error in red or a hint. */
export function Field({ id, label, hint, error, children, optional }: {
  id: string; label: string; hint?: string; error?: string; children: React.ReactNode; optional?: boolean
}) {
  const message = error || hint
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-medium text-body">
        {label}
        {optional && <span className="text-xs font-normal text-subtle">Optional</span>}
      </label>
      {children}
      {message && (
        <p id={`${id}-msg`} className={cn("mt-1 text-xs", error ? "text-red-600 dark:text-red-400" : "text-subtle")}>{message}</p>
      )}
    </div>
  )
}

export const inputCls = (error?: string) => cn(
  "h-10 w-full rounded-[9px] border bg-surface px-3 text-sm text-heading placeholder:text-faint transition-colors focus:outline-none focus:ring-2",
  error
    ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
    : "border-field hover:border-field-hover focus:border-[#5b47e0] focus:ring-[#5b47e0]/15",
)

// ── Formatting ───────────────────────────────────────────────────────────────
export const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "")

const validDate = (d?: string | Date | null) => {
  if (!d) return null
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? null : x
}
export const fmtDate = (d?: string | Date | null) =>
  validDate(d)?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) || ""
export const fmtDateTime = (d?: string | Date | null) => {
  const x = validDate(d)
  return x ? `${fmtDate(x)}, ${x.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""
}
/** "just now", "5 min ago", "3 h ago", "2 d ago", then the date. */
export const relTime = (d?: string | Date | null) => {
  const x = validDate(d)
  if (!x) return ""
  const s = Math.round((Date.now() - x.getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`
  return fmtDate(x)
}

export const stripHtml = (html?: string) =>
  String(html || "")
    .replace(/<(br|\/p|\/li|\/h[1-6]|\/div)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()

/** Hand the browser a file to save. */
export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
