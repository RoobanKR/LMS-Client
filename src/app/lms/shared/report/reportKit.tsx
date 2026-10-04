"use client"

/* The report-page kit — the look first built for Course Management ▸ Report,
 * shared so Business Reports and User Management ▸ Report read exactly the
 * same: a flat heading + filter row on a warm page ground, Reset → Preview
 * Report → Generate Report bottom-right, a "next step" glow on Preview
 * Report once a report is generated, "Showing:" chips, a
 * beige-ruled table and a pager. Each page keeps its own filters and data;
 * only the chrome comes from here. */

import { useCallback, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
    BarChart3, ChevronLeft, ChevronRight, Eye, FileText, Loader2, RotateCcw, X,
    type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Warm page ground every report page sits on. */
export const REPORT_PAGE_BG = 'bg-[#fffdf9]'

/** A filter's caption: a small coloured line icon, then the label in full
 *  (never truncated), so a row of filters reads as one set. */
export function FilterLabel({ icon: Icon, tone, children }: { icon: LucideIcon; tone: string; children: ReactNode }) {
    return (
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium leading-4 text-heading">
            <Icon className={`size-3.5 shrink-0 ${tone}`} strokeWidth={2} aria-hidden />
            <span>{children}</span>
        </p>
    )
}

/** Wraps one filter (label + trigger). The shared filter triggers are the
 *  direct child button, so this restyles them for report pages only — full
 *  width, h-9, 10px radius, beige border — and leaves their active-state
 *  wash (bg-brand-wash) alone so a filter in use still reads as one. */
export const REPORT_FIELD = 'min-w-0 [&>button]:h-9 [&>button]:w-full [&>button]:rounded-[10px] [&>button]:border-[#e7ddd1] [&>button]:px-3 [&>button]:shadow-xs [&>button]:transition-colors [&>button:hover]:border-brand-300 [&>button[data-state=open]]:border-brand-400'

/** The page title — a single heading line, no subtitle. */
export function ReportHeading({ title = 'Generate Report' }: { title?: string }) {
    return <h1 className="text-base font-semibold tracking-[-0.01em] text-heading sm:text-lg">{title}</h1>
}

/* Masks a box down to its 2px padding ring, so whatever is painted inside
 * (the turning conic below) only shows as a border. */
const RING_MASK: CSSProperties = {
    padding: 2,
    WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    WebkitMaskComposite: 'xor',
    mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
    maskComposite: 'exclude',
}

/** The "do this next" cue. After a report is generated, a soft orange
 *  light travels round the wrapped button and a faint ring pulses out
 *  from it, so the eye moves from Generate on to Preview / Print without
 *  a permanent step bar. Everything is drawn outside the button's box
 *  (absolute, pointer-events-none, aria-hidden), so turning it on or off
 *  never moves the layout. Reduced motion gets a still orange ring. */
export function NextStepGlow({ active, children }: { active: boolean; children: ReactNode }) {
    const reduceMotion = useReducedMotion()
    return (
        <span className={`relative inline-flex rounded-[10px] transition-shadow duration-300 ${active
            ? 'shadow-[0_0_0_3px_rgba(249,115,22,0.10),0_6px_16px_-6px_rgba(249,115,22,0.45)]'
            : ''}`}
        >
            {children}
            {active && (
                <>
                    <span aria-hidden="true" className="pointer-events-none absolute -inset-[2px] overflow-hidden rounded-[12px]" style={RING_MASK}>
                        <span
                            className={reduceMotion ? 'absolute inset-0 bg-brand-400' : 'absolute animate-spin [animation-duration:2.6s]'}
                            style={reduceMotion ? undefined : {
                                left: '50%', top: '50%', width: 420, height: 420, marginLeft: -210, marginTop: -210,
                                background: 'conic-gradient(from 0deg, transparent 0deg 200deg, rgba(251,140,60,0.35) 260deg, #f97316 330deg, transparent 360deg)',
                            }}
                        />
                    </span>
                    {!reduceMotion && (
                        <motion.span
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-[2px] rounded-[12px] border border-brand-400"
                            initial={{ opacity: 0.55, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.12 }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                        />
                    )}
                </>
            )}
        </span>
    )
}

/** Tracks whether the report on screen still matches the filters, and
 *  whether the reader has taken the next step (opened Preview / Print).
 *  `markGenerated(draft)` remembers the draft OBJECT the report was built
 *  from: any filter edit replaces the draft, which makes the report stale
 *  and stops the glow without an effect. */
export function useNextStepNudge<D>(draft: D) {
    const [generatedFrom, setGeneratedFrom] = useState<D | null>(null)
    const [seen, setSeen] = useState(false)
    const markGenerated = useCallback((from: D) => {
        setGeneratedFrom(from)
        setSeen(false)
    }, [])
    const markSeen = useCallback(() => setSeen(true), [])
    const clear = useCallback(() => setGeneratedFrom(null), [])
    const isFresh = generatedFrom !== null && generatedFrom === draft
    return { isFresh, seen, markGenerated, markSeen, clear }
}

/** The solid orange lead action — the same CTA recipe the Course
 *  Management screens use. */
export const REPORT_PRIMARY_BTN = 'inline-flex h-9 min-w-[176px] items-center justify-center gap-2 rounded-[10px] bg-gradient-to-b from-brand-400 to-brand-600 px-5 text-[13px] font-bold text-white shadow-brand transition-[filter,transform] duration-150 hover:brightness-105 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none'

/** Reset → Preview Report → Generate Report, under a thin divider. Generate
 *  is the only solid orange button; Preview is an orange outline that stays
 *  disabled until there is a report, then carries the glow. */
export function ReportActionRow({
    onReset, resetDisabled, onPreview, previewDisabled, nudge, onGenerate, generateDisabled, loading,
}: {
    onReset: () => void
    resetDisabled: boolean
    onPreview: () => void
    previewDisabled: boolean
    nudge: boolean
    onGenerate: () => void
    generateDisabled: boolean
    loading: boolean
}) {
    return (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#ece3d8] pt-3">
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
                <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-[10px] border-[#e2dbd3] px-3.5 text-xs font-medium text-body"
                    disabled={resetDisabled}
                    onClick={onReset}
                >
                    <RotateCcw className="size-3.5 text-subtle" />Reset
                </Button>

                <NextStepGlow active={nudge}>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-[10px] border-brand-300 bg-surface px-3.5 text-xs font-semibold text-brand-strong hover:border-brand-400 hover:bg-brand-wash hover:text-brand-strong disabled:border-[#e2dbd3] disabled:text-faint"
                        disabled={previewDisabled}
                        onClick={onPreview}
                        title={previewDisabled ? 'Generate a report first' : 'Preview & print the report'}
                    >
                        <Eye className="size-4 text-brand-500" />Preview Report
                    </Button>
                </NextStepGlow>

                <button
                    type="button"
                    className={REPORT_PRIMARY_BTN}
                    disabled={generateDisabled}
                    onClick={onGenerate}
                >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" strokeWidth={2.25} />}
                    {loading ? 'Generating…' : 'Generate Report'}
                </button>
            </div>
        </div>
    )
}

/** One "Showing:" chip. A narrowed filter is orange with × (the page drops
 *  that filter and regenerates); an untouched one reads "All …". */
export type ReportChip<K extends string = string> = { key: K; title: string; label: string; narrowed: boolean }

/** Up to two picks by name, then "+N"; "All …" when nothing is narrowed. */
export function chipLabel(values: string[], narrowed: boolean, allWord: string) {
    if (!narrowed) return allWord
    return values.length <= 2 ? values.join(', ') : `${values.slice(0, 2).join(', ')} +${values.length - 2}`
}

/** "Showing:" + one chip per filter. */
export function ReportShowingRow<K extends string>({ chips, onRemove, loading }: {
    chips: ReportChip<K>[]
    onRemove: (key: K) => void
    loading: boolean
}) {
    return (
        <div className="no-print mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-heading">Showing:</span>
            {chips.map((chip) => (
                <span
                    key={chip.key}
                    title={chip.title}
                    className={`inline-flex h-7 max-w-64 items-center gap-1 rounded-full border text-xs font-medium ${chip.narrowed
                        ? 'border-brand-500/30 bg-brand-wash pl-2.5 pr-1 text-brand-strong'
                        : 'border-[#e7ddd1] bg-surface px-2.5 text-body'}`}
                >
                    <span className="truncate">{chip.label}</span>
                    {chip.narrowed && (
                        <button
                            type="button"
                            aria-label={`Remove ${chip.title} filter`}
                            onClick={() => onRemove(chip.key)}
                            disabled={loading}
                            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-brand-500/15"
                        >
                            <X size={11} />
                        </button>
                    )}
                </span>
            ))}
        </div>
    )
}

/** Before anything is generated. */
export function ReportEmptyState() {
    return (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#e7ddd1] p-6 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-tile bg-brand-wash">
                <BarChart3 className="size-5 text-brand-strong" aria-hidden />
            </div>
            <h2 className="text-sm font-semibold text-heading">Generate a report to see the results</h2>
            <p className="mt-1 max-w-sm text-xs leading-5 text-subtle">
                Choose your filters above and click <span className="font-semibold text-heading">Generate Report</span>.
            </p>
        </div>
    )
}

/** Generated, but nothing matched. */
export function ReportNoMatches() {
    return (
        <p className="rounded-xl border border-dashed border-[#e7ddd1] py-12 text-center text-sm text-subtle">
            Nothing matches this combination. Try a wider scope.
        </p>
    )
}

/* Table classes, shared so every report table reads the same. */
export const REPORT_TABLE_CARD = 'flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-[#ece3d8] bg-surface shadow-xs'
export const REPORT_TH = 'sticky top-0 z-10 border-b border-[#ece3d8] border-r-[#f1ebe4] bg-[#fdf8f2] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-subtle'
export const REPORT_TD = 'border-r border-[#f1ebe4] px-3 py-2.5 align-middle'
export const REPORT_WRAP: CSSProperties = { wordBreak: 'break-word', overflowWrap: 'anywhere' }
/** Row rules: heavier between client groups, faint inside one. */
export const reportRowRule = (groupStart: boolean) => (groupStart ? 'border-t-2 border-[#e3d7c9]' : 'border-t border-[#f1ebe4]')
export const REPORT_ROW_HOVER = 'hover:bg-[#fffaf5]'

export const PAGER_BTN = 'flex size-8 items-center justify-center rounded-[8px] border border-[#e7ddd1] bg-surface text-subtle transition-colors duration-150 hover:border-brand-300 hover:text-heading disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#e7ddd1] disabled:hover:text-subtle'

/** Page numbers to show: all of them up to 7, otherwise first / last with
 *  the current page centred between ellipses. */
export function pageWindow(current: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
    if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '…', current - 1, current, current + 1, '…', total]
}

/** Paging state over any list (client blocks, or user rows). The page is
 *  remembered against the list it was picked on, so a new list — a fresh
 *  Generate — starts back on page 1 without an effect. Pass a memoised
 *  list, or every render reads as a new one. */
export function usePaged<T>(items: T[], initialSize = 10) {
    const [pageSize, setPageSizeRaw] = useState(initialSize)
    const [picked, setPicked] = useState<{ page: number; of: T[] | null }>({ page: 1, of: null })
    const total = items.length
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(picked.of === items ? picked.page : 1, pageCount)
    const start = (page - 1) * pageSize
    const setPage = (p: number) => setPicked({ page: p, of: items })
    const setPageSize = (n: number) => { setPageSizeRaw(n); setPicked({ page: 1, of: items }) }
    return { pageSize, setPageSize, page, setPage, pageCount, start, total, items: items.slice(start, start + pageSize) }
}

/** Rows per page on the left; "1–3 of 3 clients" and the pager on the right. */
export function ReportPager({ paged, noun }: {
    paged: {
        pageSize: number; setPageSize: (n: number) => void
        page: number; setPage: (p: number) => void
        pageCount: number; start: number; total: number
    }
    /** Plural noun for the count, e.g. "clients". */
    noun: string
}) {
    const { pageSize, setPageSize, page, setPage, pageCount, start, total } = paged
    const singular = noun.replace(/s$/, '')
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece3d8] px-4 py-2">
            <label className="inline-flex items-center gap-2 text-xs text-subtle">
                Rows per page
                <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-8 rounded-[8px] border border-[#e7ddd1] bg-surface px-2 text-xs font-medium text-heading focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                    {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
            </label>
            <div className="flex items-center gap-3">
                <span className="text-xs tabular-nums text-subtle">
                    {total ? start + 1 : 0}–{Math.min(start + pageSize, total)} of {total} {total === 1 ? singular : noun}
                </span>
                <nav aria-label="Report pages" className="flex items-center gap-1">
                    <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)} className={PAGER_BTN}>
                        <ChevronLeft className="size-4" />
                    </button>
                    {pageWindow(page, pageCount).map((p, i) => (p === '…'
                        ? <span key={`gap-${i}`} className="flex size-8 items-center justify-center text-xs text-faint">…</span>
                        : (
                            <button
                                key={p}
                                type="button"
                                aria-label={`Page ${p}`}
                                aria-current={p === page ? 'page' : undefined}
                                onClick={() => setPage(p)}
                                className={p === page
                                    ? 'flex size-8 items-center justify-center rounded-[8px] bg-brand-500 text-xs font-semibold tabular-nums text-white shadow-xs'
                                    : `${PAGER_BTN} text-xs font-medium tabular-nums`}
                            >
                                {p}
                            </button>
                        )))}
                    <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage(page + 1)} className={PAGER_BTN}>
                        <ChevronRight className="size-4" />
                    </button>
                </nav>
            </div>
        </div>
    )
}
