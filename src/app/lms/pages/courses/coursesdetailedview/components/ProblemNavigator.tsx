"use client";

// The problems of a coding exercise, in the NeetCode manner. Beside Hide
// description sits "☰ Problems 2/9 ‹ ›": the arrows step through the
// problems, the button opens a drawer listing every problem with its status
// and difficulty — search, difficulty filter and sort live there too. In a
// controlled flow a problem stays locked until the ones before it are
// submitted (or skipped).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, Check, ChevronLeft, ChevronRight, ListOrdered, Lock, Search, SkipForward, X } from "lucide-react";

export type NavProblem = { id: string | number; title: string; difficulty?: string };

type Props = {
    // The exercise's name, the drawer's heading.
    title: string;
    problems: NavProblem[];
    currentIndex: number;
    solved: Set<number>;
    skipped?: Set<number>;
    freeFlow: boolean;
    onSelect: (index: number) => void;
    onPrev: () => void;
    onNext: () => void;
    // Shown when the exercise allows skipping.
    onSkip?: () => void;
    // A section-based test steps past its first / last problem into the next
    // section, so it decides when the arrows are off (and names Next).
    prevDisabled?: boolean;
    nextDisabled?: boolean;
    nextTitle?: string;
    // Keep the arrows for a single problem (section-based tests).
    showWhenSingle?: boolean;
    theme?: "light" | "dark" | string;
    font?: string;
};

const PALETTE = {
    light: {
        panel: "#FFFFFF", page: "#FBFAF7", border: "#E7E5DF", hairline: "#EFEDE8", navy: "#101B3B", text: "#344054",
        muted: "#667085", soft: "#F7F6F3", current: "#EEF0FF", currentBorder: "#C7CCFA", hover: "#F7F6F3",
        teal: "#009F9A", tealBorder: "#7FD0C4", mint: "#E8F6F3", tealDark: "#0F766E", disabled: "#A3A9B5",
    },
    dark: {
        panel: "#111827", page: "#0B1220", border: "#374151", hairline: "#1F2937", navy: "#F9FAFB", text: "#D1D5DB",
        muted: "#9CA3AF", soft: "#1F2937", current: "rgba(99,102,241,0.18)", currentBorder: "#4F46E5", hover: "#1F2937",
        teal: "#009F9A", tealBorder: "#0F9D94", mint: "rgba(15,157,148,0.18)", tealDark: "#5EEAD4", disabled: "#6B7280",
    },
};
const DIFF_TEXT = {
    light: { easy: "#12A765", medium: "#D97706", hard: "#DC2626" },
    dark: { easy: "#86EFAC", medium: "#FCD34D", hard: "#FCA5A5" },
};
const DIFF_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
const label = (d?: string) => {
    const v = String(d || "").toLowerCase();
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
};

export default function ProblemNavigator({
    title, problems, currentIndex, solved, skipped, freeFlow, onSelect, onPrev, onNext, onSkip, theme = "light", font,
    prevDisabled: prevOff, nextDisabled: nextOff, nextTitle, showWhenSingle = false,
}: Props) {
    const dark = theme === "dark";
    const C = dark ? PALETTE.dark : PALETTE.light;
    const D = dark ? DIFF_TEXT.dark : DIFF_TEXT.light;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [difficulty, setDifficulty] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"default" | "difficulty" | "title">("default");
    const listRef = useRef<HTMLDivElement>(null);

    const last = problems.length - 1;
    const done = (i: number) => solved.has(i) || Boolean(skipped?.has(i));
    // Controlled flow: everything up to the first problem not yet submitted
    // (or skipped) is open; the rest waits.
    const frontier = useMemo(() => {
        for (let i = 0; i < problems.length; i++) if (!solved.has(i) && !skipped?.has(i)) return i;
        return problems.length;
    }, [problems.length, solved, skipped]);
    const isLocked = (i: number) => !freeFlow && i > Math.max(frontier, currentIndex);
    const prevDisabled = prevOff ?? currentIndex <= 0;
    const nextDisabled = nextOff ?? (currentIndex >= last || (!freeFlow && !solved.has(currentIndex)));
    const solvedCount = problems.filter((_, i) => solved.has(i)).length;

    const counts = useMemo(() => {
        const out: Record<string, number> = {};
        problems.forEach((p) => {
            const d = String(p.difficulty || "").toLowerCase();
            if (d) out[d] = (out[d] || 0) + 1;
        });
        return out;
    }, [problems]);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = problems
            .map((p, index) => ({ ...p, index }))
            .filter((p) => (difficulty === "all" || String(p.difficulty || "").toLowerCase() === difficulty)
                && (!q || p.title.toLowerCase().includes(q) || String(p.index + 1) === q));
        if (sortBy === "title") list.sort((a, b) => a.title.localeCompare(b.title));
        if (sortBy === "difficulty") {
            list.sort((a, b) => (DIFF_ORDER[String(a.difficulty || "").toLowerCase()] ?? 9) - (DIFF_ORDER[String(b.difficulty || "").toLowerCase()] ?? 9) || a.index - b.index);
        }
        return list;
    }, [problems, query, difficulty, sortBy]);

    // Escape closes; the current problem scrolls into view on open.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                setOpen(false);
            }
        };
        window.addEventListener("keydown", onKey, true);
        requestAnimationFrame(() => listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" }));
        return () => window.removeEventListener("keydown", onKey, true);
    }, [open]);

    if (problems.length < 2 && !showWhenSingle) return null;
    const listed = problems.length > 1;

    const iconBtn = (disabled: boolean): React.CSSProperties => ({
        display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6,
        border: `1px solid ${C.border}`, background: C.panel, color: disabled ? C.disabled : C.navy,
        cursor: disabled ? "not-allowed" : "pointer", flexShrink: 0, opacity: disabled ? 0.7 : 1,
    });
    const textBtn = (disabled: boolean): React.CSSProperties => ({
        ...iconBtn(disabled), width: "auto", gap: 4, padding: "0 12px",
        fontSize: 12.5, fontWeight: 600, fontFamily: font, whiteSpace: "nowrap",
    });
    const chip = (active: boolean): React.CSSProperties => ({
        height: 30, padding: "0 12px", borderRadius: 999, fontSize: 12.5, fontWeight: active ? 700 : 500, fontFamily: font,
        border: `1px solid ${active ? C.navy : C.border}`, background: active ? C.navy : "transparent",
        color: active ? C.panel : C.text, cursor: "pointer", whiteSpace: "nowrap",
    });

    const pick = (i: number) => {
        if (isLocked(i)) return;
        setOpen(false);
        if (i !== currentIndex) onSelect(i);
    };

    const drawer = open ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, fontFamily: font }} role="presentation">
            <div onClick={() => setOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(16,27,59,0.35)" }} />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Problems"
                style={{
                    position: "absolute", top: 0, right: 0, bottom: 0, width: "min(780px, 100vw)", background: C.page,
                    boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 8px" }}>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Close problems"
                        title="Close (Esc)"
                        style={{
                            height: 30, padding: "0 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.panel,
                            color: C.text, fontSize: 12, fontWeight: 700, letterSpacing: 0.4, cursor: "pointer", fontFamily: font,
                        }}
                    >
                        ESC
                    </button>
                    <span style={{ fontSize: 13, color: C.muted }}>Pick a problem to open it</span>
                    <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ ...iconBtn(false), marginLeft: "auto", border: "none", background: "transparent" }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ margin: "4px 18px 0", border: `1px solid ${C.border}`, borderRadius: 12, background: C.panel, display: "flex", flexDirection: "column", minHeight: 0, flex: 1, overflow: "hidden" }}>
                    {/* Heading: the exercise, how far along, and the tools. */}
                    <div style={{ padding: "14px 18px 12px", borderBottom: `1px solid ${C.hairline}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <h2 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={title}>
                                {title}
                            </h2>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                                {solvedCount} / {problems.length} solved
                            </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: C.soft, marginTop: 10, overflow: "hidden" }} aria-hidden="true">
                            <div style={{ height: "100%", width: `${(solvedCount / problems.length) * 100}%`, background: C.teal, borderRadius: 999, transition: "width .3s" }} />
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12 }}>
                            <button type="button" aria-pressed={difficulty === "all"} onClick={() => setDifficulty("all")} style={chip(difficulty === "all")}>
                                All {problems.length}
                            </button>
                            {(["easy", "medium", "hard"] as const).filter((d) => counts[d]).map((d) => (
                                <button key={d} type="button" aria-pressed={difficulty === d} onClick={() => setDifficulty(difficulty === d ? "all" : d)} style={chip(difficulty === d)}>
                                    {label(d)} {counts[d]}
                                </button>
                            ))}
                            <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, height: 32, minWidth: 170, flex: "0 1 230px", padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel, color: C.muted }}>
                                <Search size={14} />
                                <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search problems</span>
                                <input
                                    autoFocus
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search problems"
                                    style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: C.navy, fontSize: 13, fontFamily: font }}
                                />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 8px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel, color: C.text }} title="Sort">
                                <ArrowUpDown size={14} />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                    aria-label="Sort problems"
                                    style={{ border: "none", outline: "none", background: "transparent", color: C.navy, fontSize: 12.5, fontFamily: font, cursor: "pointer" }}
                                >
                                    <option value="default">Order</option>
                                    <option value="difficulty">Difficulty</option>
                                    <option value="title">Title A–Z</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    {/* The list */}
                    <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                            <thead>
                                <tr style={{ position: "sticky", top: 0, background: C.panel, zIndex: 1 }}>
                                    <th style={{ width: "clamp(76px, 18vw, 88px)", padding: "10px 0 10px 18px", textAlign: "left", fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: C.text, borderBottom: `1px solid ${C.hairline}` }}>STATUS</th>
                                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: C.text, borderBottom: `1px solid ${C.hairline}` }}>PROBLEM</th>
                                    <th style={{ width: "clamp(84px, 20vw, 110px)", padding: "10px 18px 10px 0", textAlign: "right", fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: C.text, borderBottom: `1px solid ${C.hairline}` }}>DIFFICULTY</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((p) => {
                                    const current = p.index === currentIndex;
                                    const locked = isLocked(p.index);
                                    const isSolved = solved.has(p.index);
                                    const isSkipped = !isSolved && Boolean(skipped?.has(p.index));
                                    const diff = String(p.difficulty || "").toLowerCase() as keyof typeof D;
                                    return (
                                        <tr
                                            key={`${p.id}-${p.index}`}
                                            aria-current={current ? "true" : undefined}
                                            onClick={() => pick(p.index)}
                                            title={locked ? `Submit problem ${frontier + 1} first` : current ? "You are here" : `Open problem ${p.index + 1}`}
                                            style={{
                                                cursor: locked ? "not-allowed" : "pointer",
                                                background: current ? C.current : undefined,
                                                borderBottom: `1px solid ${C.hairline}`,
                                            }}
                                            onMouseEnter={(e) => { if (!current && !locked) e.currentTarget.style.background = C.hover; }}
                                            onMouseLeave={(e) => { if (!current) e.currentTarget.style.background = ""; }}
                                        >
                                            <td style={{ padding: "12px 0 12px 18px" }}>
                                                {isSolved ? (
                                                    <span title="Submitted" style={{ width: 24, height: 24, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#12A765", color: "#fff" }}>
                                                        <Check size={14} strokeWidth={3} />
                                                    </span>
                                                ) : isSkipped ? (
                                                    <span title="Skipped" style={{ width: 24, height: 24, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1.5px dashed ${C.muted}`, color: C.muted }}>
                                                        <SkipForward size={11} />
                                                    </span>
                                                ) : (
                                                    <span title={current ? "Open now" : "Not submitted"} style={{ width: 24, height: 24, borderRadius: 999, display: "inline-block", border: `1.5px solid ${current ? C.currentBorder : C.border}`, opacity: locked ? 0.6 : 1 }} />
                                                )}
                                            </td>
                                            <td style={{ padding: "12px 12px", minWidth: 0 }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                                    <span style={{ fontSize: 14.5, lineHeight: 1.35, fontWeight: current ? 700 : 500, color: locked ? C.muted : C.navy, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflowWrap: "anywhere" }}>
                                                        {p.index + 1}. {p.title}
                                                    </span>
                                                    {locked && <Lock size={14} style={{ color: "#D99A2B", flexShrink: 0 }} aria-label="Locked" />}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px 18px 12px 0", textAlign: "right", fontSize: 13, fontWeight: 700, color: D[diff] || C.muted, opacity: locked ? 0.55 : 1, whiteSpace: "nowrap" }}>
                                                {label(p.difficulty) || "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!rows.length && (
                            <div style={{ padding: "40px 18px", textAlign: "center", fontSize: 13, color: C.muted }}>
                                No problems match{query.trim() ? ` “${query.trim()}”` : ""}{difficulty !== "all" ? ` in ${label(difficulty)}` : ""}.
                            </div>
                        )}
                    </div>
                    {!freeFlow && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderTop: `1px solid ${C.hairline}`, fontSize: 12.5, color: C.muted }}>
                            <Lock size={13} style={{ color: "#D99A2B" }} /> Submit a problem to unlock the next one.
                        </div>
                    )}
                </div>
                <div style={{ height: 18, flexShrink: 0 }} />
            </aside>
        </div>
    ) : null;

    return (
        <>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {listed && <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    title="All problems"
                    style={{
                        display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 12px", borderRadius: 6,
                        border: `1px solid ${C.border}`, background: C.panel, color: C.navy, fontSize: 12.5, fontWeight: 600,
                        fontFamily: font, cursor: "pointer", whiteSpace: "nowrap",
                    }}
                >
                    <ListOrdered size={15} />
                    Problems
                    <span style={{ color: C.muted, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {currentIndex + 1}/{problems.length}
                    </span>
                </button>}
                <button type="button" onClick={onPrev} disabled={prevDisabled} title="Previous problem" style={textBtn(prevDisabled)}>
                    <ChevronLeft size={16} /> Previous
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={nextDisabled}
                    title={!freeFlow && !solved.has(currentIndex) ? "Submit this problem before moving on" : nextTitle || "Next problem"}
                    style={textBtn(nextDisabled)}
                >
                    {nextTitle || "Next"} <ChevronRight size={16} />
                </button>
                {onSkip && (
                    <button
                        type="button"
                        onClick={onSkip}
                        disabled={currentIndex >= last || done(currentIndex)}
                        aria-label="Skip this problem"
                        title="Skip this problem"
                        style={iconBtn(currentIndex >= last || done(currentIndex))}
                    >
                        <SkipForward size={15} />
                    </button>
                )}
            </div>
            {drawer && typeof document !== "undefined" ? createPortal(drawer, document.body) : null}
        </>
    );
}
