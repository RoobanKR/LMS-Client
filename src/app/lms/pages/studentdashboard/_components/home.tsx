'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Student Dashboard — home (LearnTrack layout).
//
// Presentation only. Every number comes from the DashboardModel built in
// ../_lib/metrics (pedagogy content, the student's own answers, attendance and
// tracked time); anything with no data yet shows "—", never a placeholder.
//
// Desktop: a banner + Streak row, then two independent columns that end level
// with each other —
//   left:  stat cards · Learning Journey (a card per course: I Do / We Do / You Do)
//   right: Today's Focus · Upcoming Schedule
// Learning Journey and Upcoming Schedule take any spare screen height so the
// two columns end level. Narrower panels fall back to two columns, then one.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
    ArrowRight, BookOpen, CalendarCheck, CalendarDays, ChartNoAxesColumn, Check, Clock,
    Flame, ListTodo, Send, TriangleAlert, Trophy,
} from 'lucide-react';
import { calendarDaysUntil, dueLabel } from '../_lib/metrics';
import type { CourseModel, DashboardModel, DeadlineItem, SubSection } from '../_lib/metrics';

/* ── tokens ──────────────────────────────────────────────────────────────── */

const CARD = 'min-w-0 rounded-[14px] border border-hairline bg-surface shadow-[0_1px_2px_rgb(20_24_60/.04),0_6px_18px_rgb(20_24_60/.05)]';
const INK = 'text-[#141933]';
const MUTED = 'text-[#767d98]';

/** Learning Journey stage colours (I Do blue · We Do green · You Do red). */
const JOURNEY = {
    ido: { c: '#3a6cf4', bg: '#edf2ff', track: '#e3eafc' },
    wedo: { c: '#1fb866', bg: '#e9f8f0', track: '#dcf3e6' },
    youdo: { c: '#ef4444', bg: '#fff0f0', track: '#fde2e2' },
} as const;

const TAG = {
    red: 'bg-[#ffe8e8] text-[#dc2626]',
    amber: 'bg-[#fff0d6] text-[#d97706]',
    blue: 'bg-[#e7eeff] text-[#2f5ee8]',
    pink: 'bg-[#ffe7ee] text-[#e11d48]',
} as const;
type TagTone = keyof typeof TAG;

/* ── helpers ─────────────────────────────────────────────────────────────── */

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const initials = (name: string) =>
    name.replace(/[^A-Za-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'C';

/** Work the student can still act on: not submitted, open, and not past the late window. */
const isLive = (d: DeadlineItem) => !d.attempted && d.state !== 'opens' && (d.state !== 'overdue' || d.inGrace);
/** Closed without a submission. */
const isMissed = (d: DeadlineItem) => d.state === 'overdue' && !d.inGrace && !d.attempted;

/* ── primitives ──────────────────────────────────────────────────────────── */

const Ring = ({ pct, color, track, size, width, children }: {
    pct: number; color: string; track: string; size: number; width: number; children?: React.ReactNode;
}) => (
    <span
        className="grid shrink-0 place-items-center rounded-full"
        style={{ width: size, height: size, background: `conic-gradient(${color} ${Math.max(0, Math.min(100, pct))}%, ${track} 0)` }}
        role="img"
        aria-label={`${pct}%`}
    >
        <span className="grid place-items-center rounded-full bg-white" style={{ width: size - width * 2, height: size - width * 2 }}>
            {children}
        </span>
    </span>
);

const ViewLink = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#edf2ff] px-2.5 text-[11px] font-semibold text-[#3a6cf4] transition-colors hover:bg-[#e2eaff]"
    >
        {label}
        <ArrowRight size={13} />
    </button>
);

const IconSquare = ({ Icon, from, to }: { Icon: React.ElementType; from: string; to: string }) => (
    <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg text-white" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <Icon size={15} />
    </span>
);

const Tag = ({ tone, children }: { tone: TagTone; children: React.ReactNode }) => (
    <span className={`inline-flex h-[19px] items-center whitespace-nowrap rounded-[5px] px-[7px] text-[10px] font-semibold ${TAG[tone]}`}>{children}</span>
);

/* ── welcome banner ──────────────────────────────────────────────────────── */

const Banner = ({ m }: { m: DashboardModel }) => {
    const s = m.student;
    const who = [s.department || s.degree, s.rollNumber && `Roll ${s.rollNumber}`].filter(Boolean) as string[];
    return (
        <section
            className="relative isolate min-h-[200px] overflow-hidden rounded-[18px] px-6 py-[17px] [grid-area:hero]"
            style={{ background: 'radial-gradient(ellipse at 86% 7%,rgba(255,255,255,.58),transparent 24%),radial-gradient(ellipse at 84% 100%,rgba(126,82,255,.20),transparent 38%),linear-gradient(105deg,#fff1e6 0%,#ffe0cc 45%,#eed9fc 75%,#c6b5ff 100%)' }}
        >
            <div className="relative z-10 max-w-[55%] @max-[719px]:max-w-none">
                <p className={`text-[15px] font-medium ${INK}`}>Welcome back,</p>
                <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#161a3a] @min-[1100px]:text-[28px]">
                    {s.fullName} <span className="text-[24px]">👋</span>
                </h1>
                {who.length > 0 && (
                    <p className="mt-1 flex items-center gap-3 text-[12.5px] font-medium text-[#394061]">
                        {who.map((w, i) => (
                            <React.Fragment key={w}>
                                {i > 0 && <i className="h-[13px] w-px bg-[#c9b9ad]" />}
                                <span>{w}</span>
                            </React.Fragment>
                        ))}
                    </p>
                )}
                <p className={`mt-2 text-[13px] font-bold leading-[1.35] ${INK} @min-[1100px]:text-[14px]`}>
                    &ldquo;The best investment you can make<br />is in yourself.&rdquo;
                </p>
                <p className="mt-[5px] text-xs text-[#394061]">
                    Keep going, {s.firstName} — small daily<br />progress compounds.
                </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/assets/student-dashboard/welcome-hero-v2.webp"
                alt=""
                aria-hidden
                className="pointer-events-none absolute bottom-0 right-3 h-[94%] w-auto max-w-none @max-[719px]:opacity-25"
            />
        </section>
    );
};

/* ── streak ──────────────────────────────────────────────────────────────── */

const StreakCard = ({ m, onCalendar }: { m: DashboardModel; onCalendar: () => void }) => {
    const mo = m.momentum;
    return (
        <section className={`${CARD} px-4 py-3 [grid-area:streak]`} style={{ background: 'linear-gradient(160deg,#fff 55%,#fff6f6)' }}>
            <div className="flex items-start justify-between">
                <div>
                    <p className={`flex items-center gap-[7px] text-sm font-semibold ${INK}`}>
                        <Flame size={20} className="text-[#f4511e]" fill="#ff8a3d" />Streak
                    </p>
                    <p className={`ml-[27px] mt-0.5 text-[11.5px] ${MUTED}`}>{mo.activeDays30} active days / 30</p>
                </div>
                <button
                    type="button"
                    onClick={onCalendar}
                    title="Open calendar"
                    aria-label="Open calendar"
                    className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[#ffe9ec] text-[#e5484d] transition-colors hover:bg-[#ffdfe4]"
                >
                    <CalendarDays size={19} />
                </button>
            </div>
            <p className={`mt-0.5 text-[27px] font-bold leading-[1.1] ${INK}`}>{plural(mo.streak, 'day')}</p>
            <p className={`text-[11.5px] ${MUTED}`}>{plural(mo.weekTotal, 'submission')} this week</p>
            <div className="mt-2.5 grid grid-cols-7 justify-items-center gap-1.5">
                {mo.week.map((d) => (
                    <span
                        key={d.key}
                        title={d.count ? plural(d.count, 'submission') : d.isFuture ? 'Upcoming' : 'No submissions'}
                        className={`grid h-6 w-6 place-items-center rounded-full text-white ${
                            d.count > 0 ? 'bg-[#3a6cf4]' : d.isToday ? 'bg-white ring-2 ring-inset ring-[#3a6cf4]/40' : 'bg-[#eef0f5]'
                        }`}
                    >
                        {d.count > 0 && <Check size={13} strokeWidth={3} />}
                    </span>
                ))}
            </div>
            <div className={`mt-1 grid grid-cols-7 gap-1.5 text-center text-[10.5px] font-medium ${MUTED}`}>
                {mo.week.map((d) => <span key={d.key} className={d.isToday ? `font-semibold ${INK}` : ''}>{d.dom}</span>)}
            </div>
        </section>
    );
};

/* ── stat cards ──────────────────────────────────────────────────────────── */

const StatCard = ({ label, value, unit, none, sub, subRed, aside, onClick }: {
    label: string; value: string; unit?: string; none?: boolean; sub: string; subRed?: boolean;
    aside: React.ReactNode; onClick?: () => void;
}) => {
    const body = (
        <>
            <p className="text-[11px] font-semibold leading-[1.3] text-[#394061] @min-[820px]:text-xs">{label}</p>
            <div className="mb-1 mt-[5px] flex items-center justify-between gap-1.5">
                <span className={`whitespace-nowrap text-[22px] font-bold leading-[1.1] ${none ? 'text-[#a2a8bd]' : INK}`}>
                    {value}{unit && <small className="ml-0.5 text-[13px] font-semibold text-[#394061]">{unit}</small>}
                </span>
                {aside}
            </div>
            <p className={`text-[11px] leading-[1.3] ${subRed ? 'font-semibold text-[#dc2626]' : MUTED}`}>{sub}</p>
        </>
    );
    const cls = `${CARD} flex flex-col px-2.5 py-2.5 text-left @min-[820px]:px-3`;
    return onClick
        ? <button type="button" onClick={onClick} className={`${cls} transition-colors hover:border-line-hover`}>{body}</button>
        : <div className={cls}>{body}</div>;
};

const StatIcon = ({ Icon, tint }: { Icon: React.ElementType; tint: string }) => (
    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg @min-[820px]:h-8 @min-[820px]:w-8 @min-[820px]:rounded-[9px] ${tint}`}>
        <Icon size={16} />
    </span>
);

const StatCards = ({ m, onGrades }: { m: DashboardModel; onGrades: () => void }) => {
    const live = m.deadlines.filter(isLive);
    const missed = m.deadlines.filter(isMissed).length;
    const weekDue = live.filter((d) => d.state !== 'overdue' && calendarDaysUntil(d.date) <= 7).length;
    const att = m.attendance;
    return (
        <div className="@container [grid-area:stats]">
            <div className="grid grid-cols-2 gap-2 @min-[560px]:grid-cols-4">
                <StatCard
                    label="Overall Progress"
                    value={String(m.overallProgress)}
                    unit="%"
                    sub={`${m.solvedThisMonth} solved · 30d`}
                    aside={<Ring pct={m.overallProgress} color="#1fb866" track="#dcf3e6" size={32} width={5} />}
                />
                <StatCard
                    label="Attendance"
                    value={att.pct != null ? String(att.pct) : '—'}
                    unit={att.pct != null ? '%' : undefined}
                    none={att.pct == null}
                    sub={att.hasData ? `${att.present} of ${plural(att.totalDays, 'day')}` : 'Not marked yet'}
                    aside={<StatIcon Icon={CalendarCheck} tint="bg-[#fff3e8] text-[#f97316]" />}
                />
                <StatCard
                    label="Current Grade"
                    value={m.grade.letter}
                    none={m.scorePct == null}
                    sub={m.scorePct != null ? `${m.scorePct}% average` : 'Nothing graded'}
                    aside={<StatIcon Icon={ChartNoAxesColumn} tint="bg-[#fff6e3] text-[#e08a00]" />}
                    onClick={onGrades}
                />
                <StatCard
                    label="Pending Tasks"
                    value={String(live.length)}
                    sub={missed > 0 ? `${missed} missed` : live.length ? `${weekDue} due this week` : 'All caught up'}
                    subRed={missed > 0}
                    aside={<StatIcon Icon={ListTodo} tint="bg-[#fff0f0] text-[#ef4444]" />}
                />
            </div>
        </div>
    );
};

/* ── today's focus ───────────────────────────────────────────────────────── */

const Dartboard = () => (
    <svg viewBox="0 0 80 80" aria-hidden className="w-[78px]">
        <circle cx="40" cy="42" r="36" fill="#f1edff" />
        <circle cx="38" cy="44" r="27" fill="#ef4444" /><circle cx="38" cy="44" r="21" fill="#fff" />
        <circle cx="38" cy="44" r="15" fill="#ef4444" /><circle cx="38" cy="44" r="9" fill="#fff" /><circle cx="38" cy="44" r="4" fill="#ef4444" />
        <path d="M39 43 L66 16" stroke="#6c4cf1" strokeWidth="3" strokeLinecap="round" />
        <path d="M62 12 l8 -2 -2 8 -6 2z" fill="#8b6cf8" />
        <path d="M66 10 l6 -4 M70 14 l4 -6" stroke="#8b6cf8" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const FocusCard = ({ m, onCourse, onCalendar }: { m: DashboardModel; onCourse: (id: string) => void; onCalendar: () => void }) => {
    const items = m.focus.slice(0, 3);
    // Deadline items carry their course on the deadline itself.
    const courseOf = (id: string, courseId?: string) =>
        courseId || m.deadlines.find((d) => `deadline-${d.id}` === id)?.courseId || '';
    return (
        <section className={`${CARD} flex flex-col px-4 py-3 [grid-area:focus]`}>
            <p className={`mb-1 flex items-center gap-2 text-sm font-semibold ${INK}`}>
                <Trophy size={19} className="text-[#f59e0b]" fill="#fcd34d" />Today&apos;s Focus
            </p>
            <div className="grid flex-1 grid-cols-[minmax(0,1fr)_78px] items-center gap-2">
                {items.length ? (
                    <ul>
                        {items.map((f, i) => {
                            // meta reads "Course · Due tomorrow" for deadlines, a single phrase otherwise.
                            const [tag, rest] = f.meta.includes(' · ') ? f.meta.split(' · ') : ['', f.meta];
                            const target = courseOf(f.id, f.courseId);
                            return (
                                <li key={f.id} className={i > 0 ? 'border-t border-hairline' : ''}>
                                    <button
                                        type="button"
                                        disabled={!target}
                                        onClick={() => target && onCourse(target)}
                                        className="grid w-full grid-cols-[6px_minmax(0,1fr)] gap-[9px] py-1 text-left enabled:hover:opacity-80"
                                    >
                                        <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                                        <span className="min-w-0">
                                            <b className={`block text-xs font-semibold leading-[1.35] ${INK}`}>{f.label}</b>
                                            <span className={`mt-[3px] flex flex-wrap items-center gap-2 text-[10.5px] ${MUTED}`}>
                                                {tag && <Tag tone="pink">{tag}</Tag>}
                                                <span className="inline-flex items-center gap-1">{tag && <Clock size={12} />}{rest}</span>
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className={`text-xs ${MUTED}`}>Nothing planned for today — you&apos;re all caught up.</p>
                )}
                <Dartboard />
            </div>
            <div className="flex justify-end">
                <ViewLink label="View full plan" onClick={onCalendar} />
            </div>
        </section>
    );
};

/* ── learning journey ────────────────────────────────────────────────────── */

const share = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0);

const JOURNEY_STAGES = [
    { k: 'ido', tag: 'I DO', unit: 'resources opened', empty: 'No learning resources in this course' },
    { k: 'wedo', tag: 'WE DO', unit: 'exercises submitted', empty: 'No We Do exercises in this course' },
    { k: 'youdo', tag: 'YOU DO', unit: 'exercises submitted', empty: 'No You Do exercises in this course' },
] as const;

/** One stage of one course: its % and a row per sub-section the course has. */
const JourneyStage = ({ stage, pct, sections }: {
    stage: (typeof JOURNEY_STAGES)[number]; pct: number; sections: SubSection[];
}) => {
    const t = JOURNEY[stage.k];
    return (
        <div>
            <div className="mb-[5px] flex items-center gap-2">
                <span className="rounded-[5px] px-[7px] py-0.5 text-[10px] font-bold tracking-[0.03em]" style={{ background: t.bg, color: t.c }}>{stage.tag}</span>
                {sections.length > 0 && <span className={`text-[11px] ${MUTED} @max-[330px]:hidden`}>{stage.unit}</span>}
                <span className="ml-auto text-xs font-bold" style={{ color: sections.length ? t.c : '#a2a8bd' }}>{sections.length ? `${pct}%` : '—'}</span>
            </div>
            <div className="ml-1 flex flex-col gap-[5px] border-l-2 pl-2.5" style={{ borderColor: t.track }}>
                {sections.length ? sections.map((sec) => {
                    const p = share(sec.done, sec.total);
                    return (
                        <div key={sec.key} className="grid grid-cols-[minmax(0,1fr)_72px_52px] items-center gap-2.5 text-[11.5px] @max-[330px]:grid-cols-[minmax(0,1fr)_48px_44px] @max-[330px]:gap-2">
                            <span className="truncate text-[#394061]" title={sec.name}>{sec.name}</span>
                            <span className="h-1.5 overflow-hidden rounded-full" style={{ background: t.track }}>
                                <i className="block h-full rounded-full" style={{ width: `${p ? Math.max(p, 4) : 0}%`, background: t.c }} />
                            </span>
                            <span className={`whitespace-nowrap text-right ${INK}`}>
                                <b className="font-semibold">{sec.done}</b><span className="text-[#a2a8bd]"> / </span>{sec.total}
                            </span>
                        </div>
                    );
                }) : <p className="text-[11px] italic text-[#a2a8bd]">{stage.empty}</p>}
            </div>
        </div>
    );
};

const JourneyCourse = ({ c, onCourse }: { c: CourseModel; onCourse: (id: string) => void }) => {
    const stagePct = { ido: c.learn.completionPct, wedo: c.practice.completionPct, youdo: c.assess.completionPct };
    const stageSections = { ido: c.sections.learn, wedo: c.sections.practice, youdo: c.sections.assess };
    return (
        <article className="@container min-w-0 rounded-xl border border-[#eceef4] bg-[#fcfcfe] px-[13px] pb-3 pt-[11px]">
            <button
                type="button"
                onClick={() => onCourse(c.id)}
                className="mb-2.5 flex w-full items-center gap-2.5 border-b border-[#eceef4] pb-2.5 text-left transition-opacity hover:opacity-80"
            >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-[#8b6cf8] to-[#6c4cf1] text-[11px] font-bold text-white">
                    {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                    <b className={`block truncate text-[12.5px] font-semibold ${INK}`} title={c.name}>{c.name}</b>
                    {c.code && <span className={`block text-[10.5px] ${MUTED}`}>{c.code}</span>}
                </span>
                <span className="shrink-0 text-right">
                    <b className={`block text-[17px] font-bold leading-[1.1] ${INK}`}>{c.progress}%</b>
                    <span className={`text-[10px] ${MUTED}`}>overall</span>
                </span>
            </button>
            <div className="flex flex-col gap-2.5">
                {JOURNEY_STAGES.map((stage) => (
                    <JourneyStage key={stage.k} stage={stage} pct={stagePct[stage.k]} sections={stageSections[stage.k]} />
                ))}
            </div>
        </article>
    );
};

const JourneyCard = ({ m, onCourse, onCourses, onGrades }: {
    m: DashboardModel; onCourse: (id: string) => void; onCourses: () => void; onGrades: () => void;
}) => {
    // One card per course, 2 x 2 at most: most recently opened first.
    const shown = [...m.courses]
        .sort((a, b) => (b.lastAccessed?.getTime() ?? 0) - (a.lastAccessed?.getTime() ?? 0))
        .slice(0, 4);
    return (
        <section className={`${CARD} px-4 py-3 [grid-area:journey] @min-[1000px]:flex-1`}>
            <div className="mb-2.5 flex items-center justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                    <Send size={22} className="shrink-0 text-[#3a6cf4]" />
                    <div className="min-w-0">
                        <p className={`text-sm font-semibold ${INK}`}>Learning Journey</p>
                        <p className={`text-[11px] ${MUTED}`}>Your progress in each course: Learn → Practice → Assess</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onGrades}
                    className="h-[26px] shrink-0 rounded-lg bg-[#edf2ff] px-2.5 text-[11px] font-semibold text-[#3a6cf4] transition-colors hover:bg-[#e2eaff]"
                >
                    View Details
                </button>
            </div>
            {shown.length ? (
                <div className="@container">
                    <div className={`grid gap-2.5 ${shown.length > 1 ? '@min-[560px]:grid-cols-2' : ''}`}>
                        {shown.map((c) => <JourneyCourse key={c.id} c={c} onCourse={onCourse} />)}
                    </div>
                </div>
            ) : (
                <p className={`text-xs ${MUTED}`}>You&apos;re not enrolled in any course yet.</p>
            )}
            {m.courses.length > shown.length && (
                <p className={`mt-2.5 text-center text-[11.5px] ${MUTED}`}>
                    Showing {shown.length} of {m.courses.length} courses ·{' '}
                    <button type="button" onClick={onCourses} className="font-semibold text-[#3a6cf4] hover:underline">View all courses →</button>
                </p>
            )}
        </section>
    );
};

/* ── upcoming schedule ───────────────────────────────────────────────────── */

const SCHEDULE_ROWS = 5;

const scheduleLook = (d: DeadlineItem): { box: string; tag: [TagTone, string]; sub?: [string, string] } => {
    if (d.state === 'overdue') {
        const late = `${Math.max(1, -calendarDaysUntil(d.date))}d overdue${d.durationMins ? ` · ${d.durationMins} min` : ''}`;
        return d.inGrace
            ? { box: 'bg-[#ffecec] text-[#dc2626]', tag: ['red', 'Late window'], sub: ['text-[#dc2626]', `${late} · still open`] }
            : { box: 'bg-[#ffecec] text-[#dc2626]', tag: ['red', 'Missed'], sub: ['text-[#dc2626]', late] };
    }
    if (d.state === 'due-today' || d.state === 'due-soon') {
        return { box: 'bg-[#fff3df] text-[#ea8a00]', tag: ['amber', d.state === 'due-today' ? 'Due today' : 'Due soon'], sub: ['text-[#ea8a00]', dueLabel(d.date)] };
    }
    if (d.state === 'opens') return { box: 'bg-[#ebf1ff] text-[#2f5ee8]', tag: ['blue', 'Opens'] };
    return { box: 'bg-[#ebf1ff] text-[#2f5ee8]', tag: ['blue', d.kind] };
};

const ScheduleCard = ({ m, onCourse, onCalendar }: { m: DashboardModel; onCourse: (id: string) => void; onCalendar: () => void }) => {
    // Submitted work is done — the schedule lists what still needs the student.
    const rows = m.deadlines.filter((d) => !d.attempted).slice(0, SCHEDULE_ROWS);
    const missed = m.deadlines.filter(isMissed).length;
    return (
        <section className={`${CARD} flex flex-col px-4 py-3 [grid-area:sched] @min-[1000px]:flex-1`}>
            <div className="mb-2 flex items-center justify-between gap-2.5">
                <p className={`flex items-center gap-2 text-sm font-semibold ${INK}`}>
                    <IconSquare Icon={CalendarDays} from="#8b6cf8" to="#6c4cf1" />Upcoming Schedule
                </p>
                <ViewLink label="View All" onClick={onCalendar} />
            </div>
            {rows.length ? rows.map((d, i) => {
                const look = scheduleLook(d);
                return (
                    <button
                        key={`${d.id}-${i}`}
                        type="button"
                        onClick={() => onCourse(d.courseId)}
                        className={`grid grid-cols-[42px_minmax(0,1fr)] gap-3 py-1.5 text-left transition-opacity hover:opacity-80 ${i > 0 ? 'border-t border-hairline' : ''}`}
                    >
                        <span className={`flex h-11 w-[42px] flex-col items-center justify-center rounded-[10px] leading-none ${look.box}`}>
                            <b className="text-lg font-bold">{d.date.getDate()}</b>
                            <small className="mt-[3px] text-[10.5px] font-medium text-[#394061]">{d.date.toLocaleDateString('en-GB', { month: 'short' })}</small>
                        </span>
                        <span className="min-w-0">
                            <b className={`line-clamp-2 block text-[11.5px] font-semibold leading-[1.3] ${INK}`}>{d.title}</b>
                            <span className={`mt-[3px] flex flex-wrap items-center gap-2.5 text-[10.5px] ${MUTED}`}>
                                <Tag tone={look.tag[0]}>{look.tag[1]}</Tag>
                                <span className="inline-flex items-center gap-1"><Clock size={12} />{clock(d.date)}</span>
                                <span className="inline-flex min-w-0 items-center gap-1"><BookOpen size={12} /><span className="truncate">{d.courseName}</span></span>
                            </span>
                            {look.sub && <span className={`mt-0.5 block text-[10.5px] font-medium ${look.sub[0]}`}>{look.sub[1]}</span>}
                        </span>
                    </button>
                );
            }) : (
                <p className={`py-6 text-center text-xs ${MUTED}`}>Nothing scheduled — you&apos;re all caught up.</p>
            )}
            {missed > 0 && (
                <p className="mt-auto flex items-center gap-2 rounded-[10px] bg-[#fff0f0] px-3 py-[7px] text-[11.5px] font-medium text-[#dc2626]">
                    <TriangleAlert size={15} />{plural(missed, 'item')} past the deadline
                </p>
            )}
        </section>
    );
};

/* ── page body ───────────────────────────────────────────────────────────── */

export const StudentHome = ({
    m,
    onCourse,
    onCourses,
    onCalendar,
    onGrades,
}: {
    m: DashboardModel;
    onCourse: (id: string) => void;
    onCourses: () => void;
    onCalendar: () => void;
    onGrades: () => void;
}) => (
    <div className="@container">
        <div
            className={[
                'grid gap-3',
                "[grid-template-areas:'hero'_'stats'_'streak'_'focus'_'journey'_'sched']",
                "@min-[720px]:grid-cols-2 @min-[720px]:[grid-template-areas:'hero_hero'_'stats_stats'_'streak_focus'_'journey_journey'_'sched_sched']",
                // Desktop: banner + Streak, then two columns that fill the panel's height.
                "@min-[1000px]:min-h-[calc(100dvh-78px)] @min-[1000px]:grid-cols-[minmax(0,2.36fr)_minmax(0,1fr)] @min-[1000px]:grid-rows-[auto_1fr] @min-[1000px]:[grid-template-areas:'hero_streak'_'left_right']",
            ].join(' ')}
        >
            <Banner m={m} />
            <StreakCard m={m} onCalendar={onCalendar} />
            {/* Below 1000px these columns dissolve and each card takes its own grid area. */}
            <div className="contents [grid-area:left] @min-[1000px]:flex @min-[1000px]:min-w-0 @min-[1000px]:flex-col @min-[1000px]:gap-3">
                <StatCards m={m} onGrades={onGrades} />
                <JourneyCard m={m} onCourse={onCourse} onCourses={onCourses} onGrades={onGrades} />
            </div>
            <div className="contents [grid-area:right] @min-[1000px]:flex @min-[1000px]:min-w-0 @min-[1000px]:flex-col @min-[1000px]:gap-3">
                <FocusCard m={m} onCourse={onCourse} onCalendar={onCalendar} />
                <ScheduleCard m={m} onCourse={onCourse} onCalendar={onCalendar} />
            </div>
        </div>
    </div>
);
