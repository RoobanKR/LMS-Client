"use client"

// A toolbar filter with its label floating on the top border (outlined-field
// style), opening a styled list instead of the browser's native <select>.
// Turns orange while it holds a non-default value. Closes on a pick, an
// outside click or Escape.

import React, { useEffect, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"

export interface FloatingOption<T extends string> {
  value: T
  label: string
  /** Shown after the label, e.g. how many rows the option leaves. */
  count?: number
}

// ── Due date ─────────────────────────────────────────────────────────────────
export type DueFilter = "any" | "week" | "later" | "custom"

const fmtDay = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""

/** "Oct 12 – Oct 20", "From Oct 12", "Until Oct 20". */
const rangeLabel = (from: string, to: string) =>
  from && to ? `${fmtDay(from)} – ${fmtDay(to)}` : from ? `From ${fmtDay(from)}` : to ? `Until ${fmtDay(to)}` : "Custom range"

/** The Due date filter: three presets plus a custom From / To range picked
 *  inside the same dropdown, so the toolbar never grows a second row. */
export function FloatingDueDateFilter({
  value, from, to, onChange, minWidth = 160,
}: {
  value: DueFilter
  from: string
  to: string
  onChange: (value: DueFilter, from: string, to: string) => void
  minWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setDraftFrom(from); setDraftTo(to); setCustomOpen(value === "custom")
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const presets: { value: DueFilter; label: string }[] = [
    { value: "any", label: "Any time" },
    { value: "week", label: "Due this week" },
    { value: "later", label: "Due later" },
  ]
  const active = value !== "any"
  const shown = value === "custom" ? rangeLabel(from, to) : presets.find((p) => p.value === value)?.label || "Any time"
  const rangeInvalid = Boolean(draftFrom && draftTo && draftFrom > draftTo)

  const dateCls =
    "h-9 w-full rounded-control border border-hairline-strong bg-surface px-2.5 text-[12.5px] font-medium text-body focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"

  return (
    <div ref={ref} className="relative shrink-0" style={{ minWidth }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Due date: ${shown}`}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-control border bg-surface pl-3 pr-2 text-[12.5px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 ${
          active ? "border-brand text-brand-strong" : "border-hairline-strong text-body hover:border-[#CBD1D9]"
        }`}
      >
        <span className="truncate">{shown}</span>
        <ChevronDown size={14} className={`shrink-0 text-subtle transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -top-[7px] left-2 bg-surface px-1 text-[10.5px] font-medium leading-[14px] ${active ? "text-brand-strong" : "text-subtle"}`}
      >
        Due date
      </span>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-[260px] rounded-xl border border-hairline bg-surface p-1 shadow-lg">
          {presets.map((p) => {
            const selected = p.value === value
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => { onChange(p.value, "", ""); setOpen(false) }}
                className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors duration-150 ${
                  selected ? "bg-[#FFF4EC] font-semibold text-brand-strong" : "font-medium text-body hover:bg-row-hover"
                }`}
              >
                {p.label}
                {selected && <Check size={13} className="shrink-0" />}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            aria-expanded={customOpen}
            className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors duration-150 ${
              value === "custom" ? "bg-[#FFF4EC] font-semibold text-brand-strong" : "font-medium text-body hover:bg-row-hover"
            }`}
          >
            Custom range
            <ChevronDown size={13} className={`shrink-0 transition-transform duration-150 ${customOpen ? "rotate-180" : ""}`} />
          </button>

          {customOpen && (
            <div className="mx-1 mb-1 mt-1 rounded-lg border border-hairline bg-surface-sunken/60 p-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-subtle">From</span>
                  <input type="date" value={draftFrom} max={draftTo || undefined} onChange={(e) => setDraftFrom(e.target.value)} className={dateCls} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-subtle">To</span>
                  <input type="date" value={draftTo} min={draftFrom || undefined} onChange={(e) => setDraftTo(e.target.value)} className={dateCls} />
                </label>
              </div>
              {rangeInvalid && <p className="mt-1.5 text-[11px] text-red-600">“From” must be on or before “To”.</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 rounded-control border border-hairline-strong bg-surface px-3 text-[12px] font-medium text-body hover:bg-row-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={(!draftFrom && !draftTo) || rangeInvalid}
                  onClick={() => { onChange("custom", draftFrom, draftTo); setOpen(false) }}
                  className="h-8 rounded-control bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FloatingFilterSelect<T extends string>({
  label, value, options, onChange, defaultValue, minWidth = 140,
}: {
  label: string
  value: T
  options: FloatingOption<T>[]
  onChange: (value: T) => void
  /** The "no filter" value — anything else paints the control as active. */
  defaultValue: T
  minWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const current = options.find((o) => o.value === value) ?? options[0]
  const active = value !== defaultValue

  return (
    <div ref={ref} className="relative shrink-0" style={{ minWidth }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label}`}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-control border bg-surface pl-3 pr-2 text-[12.5px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 ${
          active ? "border-brand text-brand-strong" : "border-hairline-strong text-body hover:border-[#CBD1D9]"
        }`}
      >
        <span className="truncate">
          {current?.label}
          {current?.count !== undefined && <span className={active ? "" : "text-subtle"}> ({current.count})</span>}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-subtle transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      {/* The floating label, sitting on the top border. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -top-[7px] left-2 bg-surface px-1 text-[10.5px] font-medium leading-[14px] ${active ? "text-brand-strong" : "text-subtle"}`}
      >
        {label}
      </span>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-40 mt-1 w-max min-w-full rounded-xl border border-hairline bg-surface p-1 shadow-lg"
        >
          {options.map((o) => {
            const selected = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors duration-150 ${
                  selected ? "bg-[#FFF4EC] font-semibold text-brand-strong" : "font-medium text-body hover:bg-row-hover"
                }`}
              >
                <span className="whitespace-nowrap">
                  {o.label}
                  {o.count !== undefined && <span className="ml-1 text-subtle tabular-nums">({o.count})</span>}
                </span>
                {selected && <Check size={13} className="shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
