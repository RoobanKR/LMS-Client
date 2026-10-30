'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Student Dashboard — home (multi-course layout).
//
// Presentation only. Every number comes from the DashboardModel built in
// ../_lib/metrics (pedagogy content, the student's own answers, attendance and
// tracked time); sections fall back to plain empty states, never placeholders.
//
// Built for students taking several courses at once, so no single course is
// spotlighted. Top to bottom:
//   1. Header      — one sentence: courses enrolled, what is overdue / due soon
//   2. Stat cards  — overall progress · pending tasks · attendance · score
//   3. My courses  — every course as an equal card (or a compare table); each
//                    card answers "how far am I" and "what's next" in the same
//                    place, so cards can be compared at a glance
//   4. Deadlines   — across all courses, grouped by time, tagged by course
//   5. This week + Recent results
// Stage colours match the course view (I Do orange · We Do violet · You Do
// teal). Each course keeps one tint wherever it appears (card, deadline, result).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import {
    ArrowRight, ArrowUpDown, Award, CalendarCheck, ChevronDown, ChevronRight, ChevronUp,
    CircleAlert, CircleCheck, ClipboardList, Clock, Flame, LayoutGrid, List, PartyPopper,
    Sparkles, TrendingUp,
} from 'lucide-react';
import { calendarDaysUntil, timeAgo } from '../_lib/metrics';
import type { DashboardModel, CourseModel, DeadlineItem } from '../_lib/metrics';

/* ── tokens ──────────────────────────────────────────────────────────────── */

const STAGES = [
    { key: 'learn', label: 'I Do', noun: 'resources', color: '#F97316' },
    { key: 'practice', label: 'We Do', noun: 'assignments', color: '#7C6FF7' },
    { key: 'assess', label: 'You Do', noun: 'assessments', color: '#0EA5A0' },
] as const;
type StageKey = (typeof STAGES)[number]['key'];

const stageColor = (stage: string) => (stage === 'We Do' ? '#7C6FF7' : stage === 'You Do' ? '#0EA5A0' : '#F97316');

/** One soft tint per course, by position, reused on its card, deadlines and results. */
const TINTS = [
    'bg-[#EFF6FF] text-[#1D4ED8]', 'bg-[#FFF1F2] text-[#BE123C]', 'bg-[#ECFDF5] text-[#047857]',
    'bg-[#FFFBEB] text-[#B45309]', 'bg-[#EEF2FF] text-[#4338CA]', 'bg-[#ECFEFF] text-[#0E7490]',
    'bg-[#FDF4FF] text-[#A21CAF]', 'bg-[#F1F5F9] text-[#334155]',
];

type Tone = 'danger' | 'brand' | 'neutral' | 'info' | 'success';

const CHIP: Record<Tone, string> = {
    danger: 'bg-danger-50 text-danger-700',
    brand: 'bg-brand-100 text-brand-700',
    neutral: 'bg-ink-100 text-ink-600',
    info: 'bg-info-50 text-info-700',
    success: 'bg-success-50 text-success-700',
};

const NEXT_BOX: Record<Tone, { box: string; accent: string }> = {
    danger: { box: 'bg-danger-50', accent: 'text-danger-700' },
    brand: { box: 'bg-brand-50', accent: 'text-brand-700' },
    neutral: { box: 'bg-ink-50', accent: 'text-ink-600' },
    info: { box: 'bg-info-50', accent: 'text-info-700' },
    success: { box: 'bg-success-50', accent: 'text-success-700' },
};

const CARD = 'rounded-2xl border border-hairline bg-surface shadow-xs';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const fullDate = () =>
    new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const shortDate = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const ago = (d: Date) => timeAgo(d).replace(/^Just now$/, 'just now');

const initials = (name: string) =>
    name.replace(/[^A-Za-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'C';

/** "18h 25m" / "45m" — compact human duration. */
const hm = (seconds: number) => {
    if (!seconds || seconds < 60) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m}m`;
};

/** "Mon" for a YYYY-MM-DD key, read as a LOCAL date. */
const weekday = (key: string) => {
    const [y, mo, d] = key.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('en-GB', { weekday: 'short' });
};

const stageNums = (c: Pick<CourseModel, 'learn' | 'practice' | 'assess'>, key: StageKey) => {
    if (key === 'learn') return { done: c.learn.opened, total: c.learn.total, pct: c.learn.completionPct };
    const s = c[key];
    return { done: s.started, total: s.assigned, pct: s.completionPct };
};

const scrollToDeadlines = () =>
    document.getElementById('sd-deadlines')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* ── deadline classification ─────────────────────────────────────────────── */

/** Work the student can still act on: not submitted, open, and not past the late window. */
const isLive = (d: DeadlineItem) => !d.attempted && d.state !== 'opens' && (d.state !== 'overdue' || d.inGrace);

const dueInfo = (d: DeadlineItem): { tone: Tone; short: string; long: string } => {
    if (d.state === 'opens') return { tone: 'info', short: `Opens ${shortDate(d.date)}`, long: `Opens ${shortDate(d.date)} · ${clock(d.date)}` };
    if (d.state === 'overdue') return { tone: 'danger', short: 'Overdue', long: 'Overdue · late submission open' };
    const days = calendarDaysUntil(d.date);
    if (days <= 0) return { tone: 'brand', short: 'Due today', long: `Due today · ${clock(d.date)}` };
    if (days === 1) return { tone: 'brand', short: 'Due tomorrow', long: `Due tomorrow · ${clock(d.date)}` };
    return { tone: 'neutral', short: `In ${days} days`, long: `Due ${shortDate(d.date)} · ${clock(d.date)}` };
};

/* ── per-course view model ───────────────────────────────────────────────── */

type Status = 'in-progress' | 'not-started' | 'completed';

interface CourseView {
    c: CourseModel;
    tint: string;
    status: Status;
    live: DeadlineItem[];      // most urgent first (deadlines arrive sorted)
    opening: DeadlineItem[];
}

const buildViews = (m: DashboardModel): CourseView[] =>
    m.courses.map((c, i) => {
        const mine = m.deadlines.filter((d) => d.courseId === c.id);
        return {
            c,
            tint: TINTS[i % TINTS.length],
            status: c.progress >= 100 ? 'completed' : c.progress === 0 && !c.hasActivity ? 'not-started' : 'in-progress',
            live: mine.filter(isLive),
            opening: mine.filter((d) => d.state === 'opens'),
        };
    });

/* ── primitives ──────────────────────────────────────────────────────────── */

const Bar = ({ value, color = '#F97316', className = 'h-1.5' }: { value: number; color?: string; className?: string }) => (
    <span className={`block w-full overflow-hidden rounded-full bg-ink-100 ${className}`}>
        <span
            className="block h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
        />
    </span>
);

const Ring = ({ value, color, size = 52, stroke = 5 }: { value: number; color: string; size?: number; stroke?: number }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, value));
    return (
        <span className="relative ml-auto shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${v}% complete`}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
                {v > 0 && (
                    <circle
                        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
                        style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
                    />
                )}
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tracking-[-0.02em] text-heading">{v}%</span>
        </span>
    );
};

const CourseBadge = ({ name, tint, small = false }: { name: string; tint: string; small?: boolean }) => (
    <span
        title={name}
        className={`flex shrink-0 items-center justify-center font-semibold tracking-[0.02em] shadow-[inset_0_0_0_1px_rgb(16_24_40/0.05)] ${tint} ${
            small ? 'h-8 w-8 rounded-[9px] text-2xs' : 'h-10 w-10 rounded-[11px] text-sm'
        }`}
    >
        {initials(name)}
    </span>
);

const Dot = ({ color, size = 8 }: { color: string; size?: number }) => (
    <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color }} />
);

const HeadLink = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="-mr-2 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-chip px-2 py-1 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-wash"
    >
        {label}
        <ArrowRight size={14} />
    </button>
);

const CardHead = ({ title, sub, aside }: { title: string; sub?: string; aside?: React.ReactNode }) => (
    <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-heading">{title}</h2>
            {sub && <p className="mt-px text-xs text-subtle">{sub}</p>}
        </div>
        {aside}
    </div>
);

/* ── 1 · header ──────────────────────────────────────────────────────────── */

const Header = ({ m, live }: { m: DashboardModel; live: DeadlineItem[] }) => {
    const n = m.courses.length;
    const overdue = live.filter((d) => d.state === 'overdue').length;
    const week = live.filter((d) => d.state !== 'overdue' && calendarDaysUntil(d.date) <= 7).length;

    let line: React.ReactNode;
    if (!n) {
        line = <>You&apos;re not enrolled in a course yet — your courses will appear here once you&apos;re added.</>;
    } else {
        const parts: React.ReactNode[] = [];
        if (overdue) parts.push(
            <button
                key="overdue"
                type="button"
                onClick={scrollToDeadlines}
                className="font-semibold text-danger-700 underline decoration-1 underline-offset-[3px]"
            >
                {plural(overdue, 'task')} {overdue === 1 ? 'is' : 'are'} overdue
            </button>,
        );
        if (week) parts.push(
            <span key="week">
                <b className="font-semibold text-heading">{overdue ? `${week} more` : plural(week, 'task')} {week === 1 ? 'is' : 'are'} due</b> in the next 7 days
            </span>,
        );
        line = (
            <>
                You&apos;re enrolled in <b className="font-semibold text-heading">{plural(n, 'course')}</b>.{' '}
                {parts.length
                    ? <>{parts[0]}{parts[1] ? <> and {parts[1]}</> : null}.</>
                    : <>Nothing is due right now — you&apos;re all caught up.</>}
            </>
        );
    }

    return (
        <header>
            <p className="text-xs font-medium text-subtle">{fullDate()}</p>
            <h1 className="mt-0.5 text-[19px] font-bold leading-[26px] tracking-[-0.02em] text-heading sm:text-[22px] sm:leading-[30px]">
                {greeting()}, {m.student.firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-ink-600 sm:text-base">{line}</p>
        </header>
    );
};

/* ── 2 · stat cards ──────────────────────────────────────────────────────── */

const StatCard = ({
    label, icon, iconClass, value, valueClass = 'text-heading', caption, bar, onClick,
}: {
    label: string; icon: React.ReactNode; iconClass: string; value: React.ReactNode; valueClass?: string;
    caption: React.ReactNode; bar?: number; onClick?: () => void;
}) => {
    const cls = `${CARD} flex flex-col p-3.5 text-left sm:px-5 sm:py-[18px]`;
    const body = (
        <>
            <span className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-subtle">{label}</span>
                <span className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] sm:h-9 sm:w-9 sm:rounded-tile ${iconClass}`}>
                    {icon}
                </span>
            </span>
            <span className={`text-2xl font-bold tracking-[-0.025em] sm:text-3xl ${valueClass}`}>{value}</span>
            {bar != null && <Bar value={bar} className="my-1 h-[5px]" />}
            <span className="text-xs text-subtle">{caption}</span>
        </>
    );
    return onClick ? (
        <button type="button" onClick={onClick} className={`${cls} transition hover:-translate-y-px hover:border-line-hover hover:shadow-md`}>
            {body}
        </button>
    ) : (
        <div className={cls}>{body}</div>
    );
};

const StatCards = ({ m, views, live, onGrades }: { m: DashboardModel; views: CourseView[]; live: DeadlineItem[]; onGrades: () => void }) => {
    const inProgress = views.filter((v) => v.status === 'in-progress').length;
    const overdue = live.filter((d) => d.state === 'overdue').length;
    const today = live.filter((d) => d.state === 'due-today').length;
    const att = m.attendance;
    const graded = m.totals.practice.graded + m.totals.assess.graded;
    const icon = 'h-[15px] w-[15px] sm:h-[18px] sm:w-[18px]';

    return (
        <section aria-label="Your standing" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
                label="Overall progress" icon={<TrendingUp className={icon} />} iconClass="bg-brand-100 text-brand-700"
                value={`${m.overallProgress}%`} bar={m.overallProgress}
                caption={m.courses.length ? `${plural(inProgress, 'course')} in progress` : 'No courses yet'}
            />
            <StatCard
                label="Pending tasks" icon={<ClipboardList className={icon} />} iconClass="bg-info-50 text-info-700"
                value={live.length} onClick={scrollToDeadlines}
                caption={
                    overdue || today ? (
                        <>
                            {overdue > 0 && <span className="font-semibold text-danger-700">{overdue} overdue</span>}
                            {overdue > 0 && today > 0 && ' · '}
                            {today > 0 && <span className="font-semibold text-brand-700">{today} due today</span>}
                        </>
                    ) : live.length ? 'None due today' : 'All caught up'
                }
            />
            <StatCard
                label="Attendance" icon={<CalendarCheck className={icon} />} iconClass="bg-success-50 text-success-700"
                value={att.pct == null ? '—' : `${att.pct}%`}
                valueClass={att.pct == null ? 'text-heading' : att.pct < 75 ? 'text-danger-700' : 'text-success-700'}
                caption={att.hasData ? `${att.present} of ${att.totalDays} days present` : 'Not marked yet'}
            />
            <StatCard
                label="Average score" icon={<Award className={icon} />} iconClass="bg-[#F1EFFE] text-[#5C52D9]"
                value={m.scorePct == null ? '—' : `${m.scorePct}%`} onClick={onGrades}
                caption={m.scorePct == null ? 'Nothing graded yet' : `Grade ${m.grade.letter} · ${graded} graded`}
            />
        </section>
    );
};

/* ── 3 · my courses ──────────────────────────────────────────────────────── */

const nextBox = (v: CourseView): { tone: Tone; Icon: React.ElementType; title: string; meta: string; more: string } => {
    const { c } = v;
    const next = v.live[0];
    if (next) {
        const d = dueInfo(next);
        return {
            tone: d.tone, Icon: d.tone === 'danger' ? CircleAlert : Clock, title: next.title,
            meta: `${next.stage} · ${d.long}`, more: v.live.length > 1 ? `+${v.live.length - 1} more` : '',
        };
    }
    if (v.status === 'completed') return { tone: 'success', Icon: PartyPopper, title: 'Course completed', meta: 'Revisit any lesson whenever you like', more: '' };
    if (v.status === 'not-started') {
        const waiting = [
            c.learn.total ? plural(c.learn.total, 'resource') : '',
            c.practice.assigned ? plural(c.practice.assigned, 'assignment') : '',
        ].filter(Boolean).join(' and ');
        return { tone: 'info', Icon: Sparkles, title: 'Ready to start', meta: waiting ? `${waiting} waiting` : 'Content appears here once published', more: '' };
    }
    if (v.opening[0]) {
        const o = v.opening[0];
        return { tone: 'success', Icon: CircleCheck, title: 'All caught up', meta: `Next: ${o.title} opens ${shortDate(o.date)}`, more: '' };
    }
    return { tone: 'success', Icon: CircleCheck, title: 'All caught up', meta: 'Nothing pending in this course', more: '' };
};

const CourseCard = ({ v, onOpen }: { v: CourseView; onOpen: (id: string) => void }) => {
    const { c } = v;
    const n = nextBox(v);
    const box = NEXT_BOX[n.tone];
    const cta = v.status === 'not-started' ? 'Start course' : v.status === 'completed' ? 'Review' : 'Resume';
    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`${c.name}, ${c.progress}% complete`}
            onClick={() => onOpen(c.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(c.id); } }}
            className={`group @container cursor-pointer ${CARD} transition hover:-translate-y-px hover:border-line-hover hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`}
        >
            {/* A lone or very wide card lays itself out in one row instead of stretching. */}
            <div className="flex h-full flex-col gap-4 p-[18px] @min-[680px]:grid @min-[680px]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] @min-[680px]:items-center @min-[680px]:gap-x-9 @min-[680px]:gap-y-[18px] @min-[680px]:px-6 @min-[680px]:py-[22px]">
                <div className="flex items-center gap-3">
                    <CourseBadge name={c.name} tint={v.tint} />
                    <div className="min-w-0">
                        <h3 className="line-clamp-2 text-md font-semibold leading-[21px] text-heading">{c.name}</h3>
                        <p className="mt-px truncate text-xs text-subtle">{[c.code, c.level].filter(Boolean).join(' · ') || 'Course'}</p>
                    </div>
                    <Ring value={c.progress} color={v.status === 'completed' ? '#22C55E' : '#F97316'} />
                </div>

                <div className="flex flex-col gap-[9px]">
                    {STAGES.map((s) => {
                        const k = stageNums(c, s.key);
                        return (
                            <div key={s.key} title={`${k.done} of ${k.total} ${s.noun}`} className="grid grid-cols-[62px_minmax(0,1fr)_46px] items-center gap-2.5 text-xs">
                                <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-body"><Dot color={s.color} />{s.label}</span>
                                <Bar value={k.pct} color={s.color} className="h-[5px]" />
                                <span className="whitespace-nowrap text-right text-faint"><b className="font-semibold text-heading">{k.done}</b>/{k.total}</span>
                            </div>
                        );
                    })}
                </div>

                <div className={`flex items-start gap-2.5 rounded-tile px-3 py-2.5 ${box.box}`}>
                    <n.Icon size={16} className={`mt-0.5 shrink-0 ${box.accent}`} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-heading">{n.title}</p>
                        <p className={`mt-px text-xs ${box.accent}`}>{n.meta}</p>
                    </div>
                    {n.more && (
                        <span className="ml-auto shrink-0 rounded-full bg-surface px-[7px] py-px text-2xs font-semibold text-subtle ring-1 ring-inset ring-hairline">
                            {n.more}
                        </span>
                    )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline pt-3.5 text-xs text-subtle @min-[680px]:col-span-3 @min-[680px]:mt-0">
                    <span className="inline-flex items-center gap-[5px]">
                        <Clock size={13} />
                        {c.lastAccessed ? `Last studied ${ago(c.lastAccessed)}` : 'Not opened yet'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                        {cta}
                        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>
            </div>
        </div>
    );
};

const CompareTable = ({ list, onOpen }: { list: CourseView[]; onOpen: (id: string) => void }) => (
    <div className={`mt-4 overflow-x-auto ${CARD}`}>
        <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
                <tr>
                    {['Course', 'Overall', 'I Do', 'We Do', 'You Do', 'Next deadline', 'Last studied', ''].map((h, i) => (
                        <th key={i} className="whitespace-nowrap border-b border-hairline bg-ink-50 px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-[0.05em] text-subtle">
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {list.map((v) => {
                    const { c } = v;
                    const d = v.live[0] ? dueInfo(v.live[0]) : null;
                    return (
                        <tr
                            key={c.id}
                            tabIndex={0}
                            onClick={() => onOpen(c.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') onOpen(c.id); }}
                            className="cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-row-hover"
                        >
                            <td className="px-4 py-3">
                                <div className="flex min-w-[210px] items-center gap-2.5">
                                    <CourseBadge name={c.name} tint={v.tint} small />
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-heading">{c.name}</p>
                                        <p className="text-xs text-subtle">{c.code || c.level || 'Course'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex min-w-[150px] items-center gap-2.5">
                                    <Bar value={c.progress} color={v.status === 'completed' ? '#22C55E' : '#F97316'} className="h-[5px] flex-1" />
                                    <b className="w-9 text-right text-heading">{c.progress}%</b>
                                </div>
                            </td>
                            {STAGES.map((s) => {
                                const k = stageNums(c, s.key);
                                return (
                                    <td key={s.key} className="px-4 py-3">
                                        <div className="min-w-[78px] text-xs text-faint">
                                            <b className="text-sm font-semibold text-heading">{k.done}</b>/{k.total}
                                            <Bar value={k.pct} color={s.color} className="mt-[5px] h-1 w-16" />
                                        </div>
                                    </td>
                                );
                            })}
                            <td className="px-4 py-3">
                                {d
                                    ? <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-md px-2 text-2xs font-semibold ${CHIP[d.tone]}`}>{d.short}</span>
                                    : <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-md px-2 text-2xs font-semibold ${CHIP.success}`}>{v.status === 'completed' ? 'Completed' : 'Nothing due'}</span>}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-subtle">{c.lastAccessed ? ago(c.lastAccessed) : '—'}</td>
                            <td className="px-4 py-3"><ChevronRight size={16} className="text-faint" /></td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

type SortKey = 'default' | 'deadline' | 'recent' | 'low';
type Filter = 'all' | Status;
const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'in-progress', label: 'In progress' },
    { key: 'not-started', label: 'Not started' },
    { key: 'completed', label: 'Completed' },
];
const CARD_LIMIT = 6;

const CoursesSection = ({ views, onCourse }: { views: CourseView[]; onCourse: (id: string) => void }) => {
    const [filter, setFilter] = useState<Filter>('all');
    const [sort, setSort] = useState<SortKey>('default');
    const [view, setView] = useState<'cards' | 'table'>('cards');
    const [expanded, setExpanded] = useState(false);

    const counts: Record<Filter, number> = {
        all: views.length,
        'in-progress': views.filter((v) => v.status === 'in-progress').length,
        'not-started': views.filter((v) => v.status === 'not-started').length,
        completed: views.filter((v) => v.status === 'completed').length,
    };
    const active: Filter = counts[filter] ? filter : 'all';

    // Default order stays fixed so a course keeps its place day to day;
    // urgency shows on each card instead of reshuffling the grid.
    const list = useMemo(() => {
        const l = views.filter((v) => active === 'all' || v.status === active);
        const nextAt = (v: CourseView) => v.live[0]?.date.getTime() ?? Infinity;
        const seen = (v: CourseView) => v.c.lastAccessed?.getTime() ?? 0;
        if (sort === 'deadline') return [...l].sort((a, b) => nextAt(a) - nextAt(b));
        if (sort === 'recent') return [...l].sort((a, b) => seen(b) - seen(a));
        if (sort === 'low') return [...l].sort((a, b) => a.c.progress - b.c.progress);
        return l;
    }, [views, active, sort]);

    const many = views.length > 1;
    const shown = expanded ? list : list.slice(0, CARD_LIMIT);

    return (
        <section aria-labelledby="sd-courses">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="sd-courses" className="flex items-center gap-2 text-xl font-semibold tracking-[-0.015em] text-heading">
                    My courses
                    <span className="rounded-full bg-ink-100 px-2 text-xs font-semibold leading-5 text-ink-600">{views.length}</span>
                </h2>
                {many && (
                    <div className="flex items-center gap-2">
                        <label className="inline-flex h-[34px] items-center gap-1.5 rounded-control border border-hairline-strong bg-surface pl-2.5 pr-1.5 text-subtle">
                            <ArrowUpDown size={14} />
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as SortKey)}
                                aria-label="Sort courses"
                                className="cursor-pointer border-0 bg-transparent pr-0.5 text-sm font-medium text-heading outline-none"
                            >
                                <option value="default">Default order</option>
                                <option value="deadline">Next deadline</option>
                                <option value="recent">Recently studied</option>
                                <option value="low">Lowest progress</option>
                            </select>
                        </label>
                        <div role="group" aria-label="View" className="inline-flex gap-0.5 rounded-control bg-ink-100 p-[3px]">
                            {(['cards', 'table'] as const).map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => setView(k)}
                                    aria-pressed={view === k}
                                    title={k === 'cards' ? 'Cards' : 'Compare'}
                                    className={`flex h-7 w-[30px] items-center justify-center rounded-[7px] transition-colors ${view === k ? 'bg-surface text-heading shadow-sm' : 'text-subtle hover:text-heading'}`}
                                >
                                    {k === 'cards' ? <LayoutGrid size={16} /> : <List size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {many && (
                <div role="group" aria-label="Filter courses" className="mt-3.5 flex gap-2 overflow-x-auto pb-0.5">
                    {FILTERS.map((f) => {
                        const on = active === f.key;
                        return (
                            <button
                                key={f.key}
                                type="button"
                                disabled={!counts[f.key]}
                                aria-pressed={on}
                                onClick={() => { setFilter(f.key); setExpanded(false); }}
                                className={`inline-flex h-8 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-45 ${
                                    on ? 'border-ink-900 bg-ink-900 text-white' : 'border-hairline-strong bg-surface text-ink-600 enabled:hover:bg-ink-50'
                                }`}
                            >
                                {f.label}
                                <span className="text-2xs font-semibold opacity-75">{counts[f.key]}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {views.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-hairline-strong px-6 py-10 text-center text-sm text-subtle">
                    You&apos;re not enrolled in any course yet. Your courses will show up here.
                </div>
            ) : view === 'table' ? (
                <CompareTable list={list} onOpen={onCourse} />
            ) : (
                <>
                    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
                        {shown.map((v) => <CourseCard key={v.c.id} v={v} onOpen={onCourse} />)}
                    </div>
                    {list.length > CARD_LIMIT && (
                        <div className="mt-4 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setExpanded((x) => !x)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-control border border-hairline-strong bg-surface px-4 text-sm font-semibold text-body transition-colors hover:bg-ink-50"
                            >
                                {expanded ? 'Show fewer' : `Show all ${list.length} courses`}
                                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

/* ── 4 · deadlines across all courses ────────────────────────────────────── */

const DEADLINE_GROUPS: { label: string; danger?: boolean; test: (d: DeadlineItem) => boolean }[] = [
    { label: 'Overdue · late submission open', danger: true, test: (d) => d.state === 'overdue' },
    { label: 'Today', test: (d) => d.state !== 'overdue' && calendarDaysUntil(d.date) <= 0 },
    { label: 'Tomorrow', test: (d) => calendarDaysUntil(d.date) === 1 },
    { label: 'Next 7 days', test: (d) => { const n = calendarDaysUntil(d.date); return n >= 2 && n <= 7; } },
    { label: 'Later', test: (d) => calendarDaysUntil(d.date) > 7 },
];
const DEADLINE_ROWS = 7;

const DeadlinesCard = ({
    live, opening, tintOf, onCourse, onCalendar,
}: {
    live: DeadlineItem[]; opening: DeadlineItem[]; tintOf: (courseId: string) => string;
    onCourse: (id: string) => void; onCalendar: () => void;
}) => {
    const groups = [
        ...DEADLINE_GROUPS.map((g) => ({ ...g, items: live.filter(g.test) })),
        { label: 'Opening soon', danger: false, items: opening },
    ].filter((g) => g.items.length);

    let budget = DEADLINE_ROWS;
    let hidden = 0;
    const visible = groups.map((g) => {
        const take = g.items.slice(0, Math.max(0, budget));
        budget -= take.length;
        hidden += g.items.length - take.length;
        return { ...g, take };
    }).filter((g) => g.take.length);

    return (
        <section id="sd-deadlines" aria-labelledby="sd-deadlines-title" className={`${CARD} scroll-mt-4 p-4 sm:p-5`}>
            <div className="mb-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 id="sd-deadlines-title" className="text-lg font-semibold tracking-[-0.01em] text-heading">Deadlines</h2>
                    <p className="mt-px text-xs text-subtle">Across all your courses</p>
                </div>
                <HeadLink label="Open calendar" onClick={onCalendar} />
            </div>

            {visible.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-7 text-center text-sm text-subtle">
                    <CircleCheck size={28} className="text-success-500" />
                    <b className="text-base font-semibold text-heading">You&apos;re all caught up</b>
                    New assignments and assessments will show up here.
                </div>
            ) : (
                <>
                    {visible.map((g, gi) => (
                        <div key={g.label} className={gi ? 'mt-3.5' : ''}>
                            <p className={`mb-1 flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.06em] after:h-px after:flex-1 after:bg-hairline ${g.danger ? 'text-danger-700' : 'text-subtle'}`}>
                                {g.label}
                            </p>
                            <div className="-mx-2">
                                {g.take.map((d) => {
                                    const days = calendarDaysUntil(d.date);
                                    return (
                                        <button
                                            key={`${d.id}-${d.date.getTime()}`}
                                            type="button"
                                            onClick={() => onCourse(d.courseId)}
                                            className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-tile px-2 py-[9px] text-left transition-colors hover:bg-row-hover"
                                        >
                                            <CourseBadge name={d.courseName} tint={tintOf(d.courseId)} small />
                                            <span className="min-w-0">
                                                <span className="block truncate text-base font-semibold text-heading max-md:line-clamp-2 max-md:whitespace-normal">{d.title}</span>
                                                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle">
                                                    <Dot color={stageColor(d.stage)} size={6} />
                                                    <span className="shrink-0">{d.stage}</span>
                                                    <span className="truncate max-md:hidden">· {d.courseName}</span>
                                                </span>
                                            </span>
                                            <span className="whitespace-nowrap text-right">
                                                {d.state === 'overdue' ? (
                                                    <span className={`inline-flex h-[22px] items-center rounded-md px-2 text-2xs font-semibold ${CHIP.danger}`}>Submit now</span>
                                                ) : (
                                                    <>
                                                        <b className="block text-sm font-semibold text-heading">{d.state !== 'opens' && days <= 0 ? clock(d.date) : shortDate(d.date)}</b>
                                                        <small className="text-2xs text-subtle">
                                                            {d.state === 'opens' ? `opens ${clock(d.date)}` : days <= 0 ? 'Today' : clock(d.date)}
                                                        </small>
                                                    </>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {hidden > 0 && (
                        <div className="mt-3 flex justify-center border-t border-dashed border-hairline pt-3">
                            <HeadLink label={`+${hidden} more in calendar`} onClick={onCalendar} />
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

/* ── 5 · this week ───────────────────────────────────────────────────────── */

const WeekCard = ({ m }: { m: DashboardModel }) => {
    const mm = m.momentum;
    const max = Math.max(1, ...mm.week.map((d) => d.count));
    return (
        <section className={`${CARD} p-4 sm:p-5`}>
            <CardHead
                title="This week"
                sub="We Do & You Do answers submitted"
                aside={
                    <span className={`inline-flex h-[26px] shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${mm.streak > 0 ? CHIP.brand : CHIP.neutral}`}>
                        <Flame size={14} />
                        {mm.streak > 0 ? `${mm.streak}-day streak` : 'No streak yet'}
                    </span>
                }
            />
            <div
                className="flex h-[118px] items-end gap-2"
                role="img"
                aria-label={`Submissions this week: ${mm.week.filter((d) => !d.isFuture).map((d) => `${weekday(d.key)} ${d.count}`).join(', ')}`}
            >
                {mm.week.map((d) => (
                    <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                        <span className="h-3.5 text-2xs font-semibold text-ink-600">{d.count || ''}</span>
                        <span
                            className={`w-full max-w-[30px] rounded-[7px] ${
                                d.isFuture ? 'border border-dashed border-ink-300' : d.count ? (d.isToday ? 'bg-brand-500' : 'bg-brand-300') : 'bg-ink-100'
                            }`}
                            style={{ height: d.count && !d.isFuture ? Math.max(10, Math.round((d.count / max) * 74)) : 6 }}
                        />
                        <span className={`text-2xs ${d.isToday ? 'font-bold text-brand-700' : 'text-subtle'}`}>{d.isToday ? 'Today' : weekday(d.key)}</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
                    <b className="block text-lg font-bold leading-tight text-heading">{mm.weekTotal}</b>
                    <span className="text-2xs text-subtle">answers this week</span>
                </div>
                <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
                    <b className="block text-lg font-bold leading-tight text-heading">{m.time.tracked ? hm(m.time.totalSeconds) : '—'}</b>
                    <span className="text-2xs text-subtle">total study time</span>
                </div>
            </div>
        </section>
    );
};

/* ── 6 · recent results ──────────────────────────────────────────────────── */

const ResultsCard = ({ m, tintOfName, onGrades }: { m: DashboardModel; tintOfName: (name: string) => string; onGrades: () => void }) => {
    const subs = m.activity.filter((a) => a.kind === 'submission').slice(0, 4);
    return (
        <section className={`${CARD} p-4 sm:p-5`}>
            <CardHead title="Recent results" aside={<HeadLink label="Grades" onClick={onGrades} />} />
            {subs.length === 0 ? (
                <p className="py-3 text-xs text-subtle">No submissions yet — your scores will appear here.</p>
            ) : (
                subs.map((a, i) => {
                    const title = a.stage ? a.title.replace(`${a.stage} · `, '') : a.title;
                    const tone: Tone = a.scorePct == null ? 'neutral' : a.scorePct >= 75 ? 'success' : a.scorePct >= 50 ? 'brand' : 'danger';
                    return (
                        <div key={`${a.title}-${i}`} className={`grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 ${i ? 'border-t border-hairline' : ''}`}>
                            <CourseBadge name={a.detail || 'Course'} tint={tintOfName(a.detail)} small />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-heading">{title}</p>
                                <p className="mt-px truncate text-xs text-subtle">{[a.stage, a.detail].filter(Boolean).join(' · ')}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-md px-2 text-2xs font-semibold ${CHIP[tone]}`}>
                                    {a.scorePct == null ? 'Submitted' : `${a.scorePct}%`}
                                </span>
                                <small className="whitespace-nowrap text-2xs text-subtle">{ago(a.at)}</small>
                            </div>
                        </div>
                    );
                })
            )}
        </section>
    );
};

/* ── composed home ───────────────────────────────────────────────────────── */

export const StudentHome = ({
    m, onCourse, onCalendar, onGrades,
}: {
    m: DashboardModel;
    onCourse: (id: string) => void;
    onCalendar: () => void;
    onGrades: () => void;
}) => {
    const views = useMemo(() => buildViews(m), [m]);
    const live = useMemo(() => m.deadlines.filter(isLive), [m]);
    const opening = useMemo(() => m.deadlines.filter((d) => d.state === 'opens'), [m]);

    const tints = useMemo(() => {
        const byId: Record<string, string> = {};
        const byName: Record<string, string> = {};
        views.forEach((v) => { byId[v.c.id] = v.tint; byName[v.c.name] = v.tint; });
        return { byId, byName };
    }, [views]);
    const fallback = TINTS[TINTS.length - 1];

    return (
        <div className="mx-auto flex max-w-[1320px] flex-col gap-[22px] md:gap-7">
            <Header m={m} live={live} />
            <StatCards m={m} views={views} live={live} onGrades={onGrades} />
            <CoursesSection views={views} onCourse={onCourse} />
            <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
                <DeadlinesCard
                    live={live}
                    opening={opening}
                    tintOf={(id) => tints.byId[id] || fallback}
                    onCourse={onCourse}
                    onCalendar={onCalendar}
                />
                <div className="flex flex-col gap-5">
                    <WeekCard m={m} />
                    <ResultsCard m={m} tintOfName={(name) => tints.byName[name] || fallback} onGrades={onGrades} />
                </div>
            </div>
        </div>
    );
};
