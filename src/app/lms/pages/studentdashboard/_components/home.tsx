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
//   left:  stat cards · Learning Journey (I Do / We Do / You Do) · Course Progress
//   right: Today's Focus · Upcoming Schedule
// Course Progress and Upcoming Schedule take any spare screen height, so a
// tall screen shows the whole dashboard without scrolling. Narrower panels
// fall back to two columns, then one.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
    ArrowRight, BadgeCheck, BookOpen, BookOpenCheck, CalendarCheck, CalendarDays, ChartNoAxesColumn,
    Check, CircleCheck, CircleDashed, CirclePlay, ClipboardList, Clock, FileCheck, FileText, Flame,
    Hourglass, Layers, ListTodo, Presentation, Send, SignalMedium, Star, TriangleAlert, Trophy,
} from 'lucide-react';
import { calendarDaysUntil, dueLabel, shortDuration, timeAgo } from '../_lib/metrics';
import type { CourseModel, DashboardModel, DeadlineItem } from '../_lib/metrics';

/* ── tokens ──────────────────────────────────────────────────────────────── */

const CARD = 'min-w-0 rounded-[14px] border border-hairline bg-surface shadow-[0_1px_2px_rgb(20_24_60/.04),0_6px_18px_rgb(20_24_60/.05)]';
const INK = 'text-[#141933]';
const MUTED = 'text-[#767d98]';

/** Learning Journey panel colours (I Do blue · We Do green · You Do red). */
const JOURNEY = {
    ido: { c: '#3a6cf4', bg: '#f2f6ff', border: '#dfe8ff', track: '#dfe7fb' },
    wedo: { c: '#1fb866', bg: '#effbf4', border: '#d3f2e0', track: '#d6f1e2' },
    youdo: { c: '#ef4444', bg: '#fff4f4', border: '#fde0e0', track: '#fbdcdc' },
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
    const done = items.filter((f) => f.done).length;
    // Deadline items carry their course on the deadline itself.
    const courseOf = (id: string, courseId?: string) =>
        courseId || m.deadlines.find((d) => `deadline-${d.id}` === id)?.courseId || '';
    return (
        <section className={`${CARD} flex flex-col px-4 py-3 [grid-area:focus]`}>
            <div className="mb-1 flex items-center justify-between gap-2.5">
                <p className={`flex items-center gap-2 text-sm font-semibold ${INK}`}>
                    <Trophy size={19} className="text-[#f59e0b]" fill="#fcd34d" />Today&apos;s Focus
                </p>
                {items.length > 0 && <span className={`text-[11px] ${MUTED}`}>{done} of {items.length} done</span>}
            </div>
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
                                        className="grid w-full grid-cols-[16px_minmax(0,1fr)] gap-[9px] py-0.5 text-left enabled:hover:opacity-80"
                                    >
                                        {f.done
                                            ? <span className="mt-px grid h-4 w-4 place-items-center rounded-full bg-[#1fb866] text-white"><Check size={10} strokeWidth={3.5} /></span>
                                            : <span className="mt-px h-4 w-4 rounded-full border-2 border-[#f97316]" />}
                                        <span className="min-w-0">
                                            <b className={`block text-xs font-semibold leading-[1.35] ${f.done ? 'text-[#767d98] line-through' : INK}`}>{f.label}</b>
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

const JourneyPanel = ({ k, title, name, pct, rows }: {
    k: keyof typeof JOURNEY; title: string; name: string; pct: number;
    rows: { Icon: React.ElementType; label: string; value: string }[];
}) => {
    const t = JOURNEY[k];
    return (
        <div className="flex flex-col rounded-xl border p-3.5" style={{ background: t.bg, borderColor: t.border }}>
            <div className="mb-3 flex items-center gap-3">
                <Ring pct={pct} color={t.c} track={t.track} size={52} width={6}>
                    <span className="text-xs font-bold" style={{ color: t.c }}>{pct}%</span>
                </Ring>
                <div>
                    <p className="text-sm font-bold tracking-[0.02em]" style={{ color: t.c }}>{title}</p>
                    <p className={`text-[12.5px] font-semibold ${INK}`}>{name}</p>
                </div>
            </div>
            <ul className="flex flex-1 flex-col justify-between gap-[7px]">
                {rows.map(({ Icon, label, value }) => (
                    <li key={label} className="flex items-center gap-[9px] text-xs text-[#394061]">
                        <Icon size={15} style={{ color: t.c }} />
                        {label}
                        <b className={`ml-auto font-semibold ${INK}`}>{value}</b>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const JourneyArrow = () => (
    <span className="hidden h-[22px] w-[22px] place-self-center place-items-center rounded-full border border-[#e2e5ee] bg-white text-[#a2a8bd] @min-[560px]:grid">
        <ArrowRight size={13} />
    </span>
);

const JourneyCard = ({ m, onGrades }: { m: DashboardModel; onGrades: () => void }) => {
    const { learn, practice, assess } = m.totals;
    const k = learn.byKind;
    const of = (o: { opened: number; total: number }) => `${o.opened} / ${o.total}`;
    return (
        <section className={`${CARD} px-4 py-3 [grid-area:journey]`}>
            <div className="mb-2 flex items-center justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                    <Send size={22} className="shrink-0 text-[#3a6cf4]" />
                    <div className="min-w-0">
                        <p className={`text-sm font-semibold ${INK}`}>Learning Journey</p>
                        <p className={`truncate text-[11px] ${MUTED}`}>Learn → Practice → Assess, pooled across your courses</p>
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
            <div className="@container">
                <div className="grid gap-2 @min-[560px]:grid-cols-[minmax(0,1fr)_22px_minmax(0,1fr)_22px_minmax(0,1fr)]">
                    <JourneyPanel
                        k="ido" title="I DO" name="Learning Resources" pct={learn.completionPct}
                        rows={[
                            { Icon: Layers, label: 'Resources', value: of({ opened: k.doc.opened + k.other.opened, total: k.doc.total + k.other.total }) },
                            { Icon: CirclePlay, label: 'Videos', value: of(k.video) },
                            { Icon: FileText, label: 'PDFs', value: of(k.pdf) },
                            { Icon: Presentation, label: 'Slides', value: of(k.ppt) },
                            { Icon: Clock, label: 'Time spent', value: shortDuration(m.time.contentSeconds) },
                        ]}
                    />
                    <JourneyArrow />
                    <JourneyPanel
                        k="wedo" title="WE DO" name="Assignments" pct={practice.completionPct}
                        rows={[
                            { Icon: ClipboardList, label: 'Assigned', value: String(practice.assigned) },
                            { Icon: Send, label: 'Submitted', value: String(practice.submitted) },
                            { Icon: BadgeCheck, label: 'Graded', value: String(practice.graded) },
                            { Icon: Hourglass, label: 'Awaiting review', value: String(practice.pendingReview) },
                            { Icon: Clock, label: 'Time spent', value: shortDuration(m.time.weDoSeconds) },
                        ]}
                    />
                    <JourneyArrow />
                    <JourneyPanel
                        k="youdo" title="YOU DO" name="Assessments" pct={assess.completionPct}
                        rows={[
                            { Icon: FileCheck, label: 'Assessments', value: `${assess.submitted} / ${assess.assigned}` },
                            { Icon: CircleCheck, label: 'Graded', value: String(assess.graded) },
                            { Icon: Star, label: 'Average score', value: assess.scorePct != null ? `${assess.scorePct}%` : '—' },
                            { Icon: CircleDashed, label: 'Not started', value: String(assess.notStarted) },
                            { Icon: Clock, label: 'Time spent', value: shortDuration(m.time.youDoSeconds) },
                        ]}
                    />
                </div>
            </div>
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

/* ── course progress ─────────────────────────────────────────────────────── */

const CourseRow = ({ c, onCourse }: { c: CourseModel; onCourse: (id: string) => void }) => (
    <tr>
        <td className="px-2 py-3">
            <div className="flex items-center gap-2.5">
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[#8b6cf8] to-[#6c4cf1] text-xs font-bold text-white @max-[419px]:h-[30px] @max-[419px]:w-[30px]">
                    {initials(c.name)}
                </span>
                <div className="min-w-0">
                    <b className={`block max-w-[220px] truncate text-[13px] font-semibold ${INK} @max-[519px]:max-w-[150px] @max-[419px]:max-w-[110px]`} title={c.name}>{c.name}</b>
                    {c.code && <small className={`block text-[11px] ${MUTED}`}>{c.code}</small>}
                </div>
            </div>
        </td>
        <td className="px-2 py-3 @max-[419px]:hidden">
            {c.category
                ? <span className="inline-flex h-[19px] items-center rounded-[5px] border border-[#cbd8ff] bg-[#f3f6ff] px-[7px] text-[10px] font-semibold uppercase text-[#2f5ee8]">{c.category}</span>
                : <span className={MUTED}>—</span>}
        </td>
        <td className="px-2 py-3 @max-[719px]:hidden">
            {c.level
                ? <span className="inline-flex items-center gap-[5px] text-xs text-[#394061]"><SignalMedium size={14} className="text-[#3a6cf4]" />{c.level}</span>
                : <span className={MUTED}>—</span>}
        </td>
        <td className="px-2 py-3">
            <div className={`flex items-center gap-2 text-xs font-semibold ${INK}`}>
                {/* Shrinks before anything spills out of the card; phones show the number only. */}
                <span className="block h-[7px] min-w-12 max-w-40 flex-1 overflow-hidden rounded-full bg-[#edf0f6] @max-[419px]:hidden">
                    <span className="block h-full rounded-full bg-gradient-to-r from-[#14b8a6] to-[#1fb866]" style={{ width: `${c.progress}%` }} />
                </span>
                {c.progress}%
            </div>
        </td>
        <td className="px-2 py-3 text-xs text-[#394061] @max-[519px]:hidden">{c.lastAccessed ? timeAgo(c.lastAccessed) : 'Not opened'}</td>
        <td className="px-2 py-3 text-right">
            <button
                type="button"
                onClick={() => onCourse(c.id)}
                className="h-8 rounded-[9px] bg-gradient-to-r from-[#fb8a3c] to-[#f97316] px-[18px] text-xs font-semibold text-white shadow-[0_4px_10px_-4px_rgb(249_115_22/.6)] transition-opacity hover:opacity-90 @max-[419px]:px-3"
            >
                {c.hasActivity ? 'Resume' : 'Start'}
            </button>
        </td>
    </tr>
);

const CourseProgressCard = ({ m, onCourse, onCourses }: { m: DashboardModel; onCourse: (id: string) => void; onCourses: () => void }) => {
    const th = `px-2 py-[7px] text-left text-[11px] font-medium ${MUTED} bg-[#f7f8fb]`;
    return (
        <section className={`${CARD} flex flex-col px-4 py-3 [grid-area:course] @min-[1000px]:flex-1`}>
            <div className="mb-2 flex items-center justify-between gap-2.5">
                <p className={`flex items-center gap-2 text-sm font-semibold ${INK}`}>
                    <IconSquare Icon={BookOpenCheck} from="#34cf80" to="#1fb866" />Course Progress
                </p>
                <ViewLink label="View All" onClick={onCourses} />
            </div>
            {m.courses.length ? (
                // Rows keep their own height at the top of the card; more courses make the card grow.
                <div className="@container">
                    <table className="w-full border-collapse whitespace-nowrap">
                        <thead>
                            <tr>
                                <th className={`${th} rounded-l-lg`}>Course</th>
                                <th className={`${th} @max-[419px]:hidden`}>Track</th>
                                <th className={`${th} @max-[719px]:hidden`}>Level</th>
                                <th className={th}>Progress</th>
                                <th className={`${th} @max-[519px]:hidden`}>Last Opened</th>
                                <th className={`${th} rounded-r-lg text-right`}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {m.courses.map((c) => <CourseRow key={c.id} c={c} onCourse={onCourse} />)}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className={`py-6 text-center text-xs ${MUTED}`}>You&apos;re not enrolled in any course yet.</p>
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
                "[grid-template-areas:'hero'_'stats'_'streak'_'focus'_'journey'_'sched'_'course']",
                "@min-[720px]:grid-cols-2 @min-[720px]:[grid-template-areas:'hero_hero'_'stats_stats'_'streak_focus'_'journey_journey'_'course_course'_'sched_sched']",
                // Desktop: banner + Streak, then two columns that fill the panel's height.
                "@min-[1000px]:min-h-[calc(100dvh-78px)] @min-[1000px]:grid-cols-[minmax(0,2.36fr)_minmax(0,1fr)] @min-[1000px]:grid-rows-[auto_1fr] @min-[1000px]:[grid-template-areas:'hero_streak'_'left_right']",
            ].join(' ')}
        >
            <Banner m={m} />
            <StreakCard m={m} onCalendar={onCalendar} />
            {/* Below 1000px these columns dissolve and each card takes its own grid area. */}
            <div className="contents [grid-area:left] @min-[1000px]:flex @min-[1000px]:min-w-0 @min-[1000px]:flex-col @min-[1000px]:gap-3">
                <StatCards m={m} onGrades={onGrades} />
                <JourneyCard m={m} onGrades={onGrades} />
                <CourseProgressCard m={m} onCourse={onCourse} onCourses={onCourses} />
            </div>
            <div className="contents [grid-area:right] @min-[1000px]:flex @min-[1000px]:min-w-0 @min-[1000px]:flex-col @min-[1000px]:gap-3">
                <FocusCard m={m} onCourse={onCourse} onCalendar={onCalendar} />
                <ScheduleCard m={m} onCourse={onCourse} onCalendar={onCalendar} />
            </div>
        </div>
    </div>
);
