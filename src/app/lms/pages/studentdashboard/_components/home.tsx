'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Student Dashboard — redesigned home.
//
// Presentation only. Every number comes from the DashboardModel built in
// ../_lib/metrics (real pedagogy content, the student's own answers, attendance
// and tracked time). Sections fall back to explicit empty states when a source
// has no data — never placeholder numbers. The app shell (StudentLayout) and the
// sidebar are untouched; this file only restyles the dashboard content.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
    BookOpen, Clock3, TrendingUp, CalendarCheck2, Award, Plus, CalendarDays, Play,
    ChevronRight, ArrowRight, CheckCircle2, FileText, Bell, Sparkles, Code2, Database,
} from 'lucide-react';
import { durationParts, shortDuration, timeAgo } from '../_lib/metrics';
import type { DashboardModel, CourseModel, DeadlineItem, ActivityEvent } from '../_lib/metrics';

/* ── palette (from the approved mock) ────────────────────────────────────── */

const T = {
    orange: '#F47721', orangeDeep: '#C2540F', orangeSoft: '#FFF2E7',
    blue: '#5279E7', blueSoft: '#EEF2FF',
    green: '#20936A', greenSoft: '#EAF7F1',
    purple: '#745BC7', purpleSoft: '#F2EFFF',
    red: '#B42318', redSoft: '#FEF2F2',
    muted: '#8190A3',
};

/* ── primitives ──────────────────────────────────────────────────────────── */

const Panel = ({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        {...rest}
        className={
            'rounded-[16px] border border-[#E8EBF0] bg-white shadow-[0_8px_28px_rgba(25,43,65,0.045)] ' +
            'dark:border-[#2A2D34] dark:bg-[#1C1E23] ' + className
        }
    >
        {children}
    </div>
);

const Meter = ({ value, color, track = '#F0F2F5', height = 6 }: { value: number; color: string; track?: string; height?: number }) => (
    <div className="w-full overflow-hidden rounded-full dark:bg-[#2A2D34]" style={{ height, background: track }}>
        <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color, transition: 'width 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
    </div>
);

const HeadLink = ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button
        onClick={onClick}
        className="flex shrink-0 items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ color: T.orangeDeep }}
    >
        {label}
        <ArrowRight size={13} strokeWidth={2.4} />
    </button>
);

const PanelHead = ({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) => (
    <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[#24364C] dark:text-white">{title}</h3>
            {sub && <p className="mt-0.5 truncate text-xs text-[#97A2B1] dark:text-slate-400">{sub}</p>}
        </div>
        {action}
    </div>
);

const EmptyRow = ({ text }: { text: string }) => (
    <div className="flex items-center justify-center rounded-[12px] border border-dashed border-[#E8EBF0] py-8 text-center text-xs text-[#98A4B2] dark:border-[#2A2D34] dark:text-slate-400">
        {text}
    </div>
);

/* ── helpers ─────────────────────────────────────────────────────────────── */

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good morning', emoji: '☀️' };
    if (h < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    return { text: 'Good evening', emoji: '🌙' };
};

const fullDate = () =>
    new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

/** "18h 25m" / "45m" — compact human duration. */
const hm = (seconds: number) => {
    if (!seconds || seconds < 60) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return h ? `${h}h ${m}m` : `${m}m`;
};

const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** The course to spotlight in the hero: the most recently touched in-progress one. */
const pickHeroCourse = (courses: CourseModel[]): CourseModel | null => {
    if (!courses.length) return null;
    const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100);
    const withActivity = courses.filter((c) => c.hasActivity);
    const pool = inProgress.length ? inProgress : withActivity.length ? withActivity : courses;
    return [...pool].sort((a, b) => (b.lastAccessed?.getTime() || 0) - (a.lastAccessed?.getTime() || 0))[0];
};

/** Friendly chip for a deadline, coloured by urgency. */
const deadlineChip = (d: DeadlineItem): { label: string; color: string; soft: string } => {
    const days = Math.ceil((d.date.getTime() - Date.now()) / 86400000);
    if (d.state === 'overdue') return { label: 'Overdue', color: T.red, soft: T.redSoft };
    if (d.state === 'due-today') return { label: 'Due today', color: T.orangeDeep, soft: T.orangeSoft };
    if (d.state === 'opens') return { label: 'Opens soon', color: T.green, soft: T.greenSoft };
    if (days <= 1) return { label: 'Due tomorrow', color: T.orangeDeep, soft: T.orangeSoft };
    if (days <= 3) return { label: `In ${days} days`, color: T.blue, soft: T.blueSoft };
    return { label: `In ${days} days`, color: T.green, soft: T.greenSoft };
};

/* ── page head ───────────────────────────────────────────────────────────── */

export const PageHead = ({ m, onCourses }: { m: DashboardModel; onCourses: () => void }) => {
    const g = greeting();
    return (
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.13em]" style={{ color: T.orangeDeep }}>
                    {fullDate()}
                </p>
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-[-0.035em] text-[#17283F] sm:text-[28px] dark:text-white">
                    {g.text}, {m.student.firstName}
                    <span aria-hidden>{g.emoji}</span>
                </h1>
                <p className="mt-1.5 text-sm text-[#7F8DA0] dark:text-slate-400">
                    You&apos;re building great momentum. Here&apos;s your learning at a glance.
                </p>
            </div>

            {/* md:mr-12 clears the shell's corner-pinned notification bell. */}
            <div className="flex shrink-0 flex-wrap items-center gap-2.5 md:mr-12">
                <span className="flex h-10 items-center gap-2 rounded-[11px] border border-[#E8EBF0] bg-white px-3.5 text-sm font-semibold text-[#57677C] dark:border-[#2A2D34] dark:bg-[#1C1E23] dark:text-slate-300">
                    <CalendarDays size={15} strokeWidth={2} /> This week
                </span>
                <button
                    onClick={onCourses}
                    className="flex h-10 items-center gap-2 rounded-[11px] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: T.orangeDeep }}
                >
                    <Plus size={15} strokeWidth={2.4} /> Explore courses
                </button>
            </div>
        </header>
    );
};

/* ── hero: continue learning ─────────────────────────────────────────────── */

export const ContinueHero = ({ m, onCourse, onCourses }: { m: DashboardModel; onCourse: (id: string) => void; onCourses: () => void }) => {
    const hero = pickHeroCourse(m.courses);

    if (!hero) {
        return (
            <section
                className="relative overflow-hidden rounded-[17px] px-6 py-8 text-white"
                style={{ background: 'linear-gradient(110deg,#1B304A 0%,#243B58 61%,#304E6B 100%)' }}
            >
                <div className="relative z-10 max-w-[560px]">
                    <h2 className="text-xl font-semibold tracking-[-0.03em]">Start your learning journey</h2>
                    <p className="mt-2 text-sm text-[#C1CCDA]">Enrol in a course to see your progress across I Do, We Do and You Do here.</p>
                    <button onClick={onCourses} className="mt-4 flex h-9 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-white" style={{ background: T.orange }}>
                        <Plus size={15} strokeWidth={2.4} /> Browse courses
                    </button>
                </div>
            </section>
        );
    }

    const next =
        m.deadlines.find((d) => d.courseName === hero.name && !d.attempted && d.state !== 'opens') ||
        m.deadlines.find((d) => !d.attempted && d.state !== 'opens') ||
        null;

    return (
        <section
            className="relative isolate overflow-hidden rounded-[17px] px-6 py-6 text-white sm:px-7"
            style={{ background: 'linear-gradient(110deg,#1B304A 0%,#243B58 61%,#304E6B 100%)' }}
        >
            {/* decorative rings */}
            <span aria-hidden className="pointer-events-none absolute -top-40 right-[18%] -z-10 h-72 w-72 rounded-full border border-white/5 shadow-[0_0_0_30px_rgba(255,255,255,.03),0_0_0_61px_rgba(255,255,255,.02)]" />
            <span aria-hidden className="pointer-events-none absolute -bottom-48 -right-12 -z-10 h-60 w-60 rounded-full" style={{ background: '#F4772122', filter: 'blur(2px)' }} />

            <div className="grid gap-6 lg:grid-cols-[1.25fr_0.8fr] lg:items-center">
                <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFBD8A]">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#70D1A3', boxShadow: '0 0 0 4px #70d1a31b' }} />
                        Continue your learning
                    </div>
                    <h2 className="truncate text-2xl font-semibold tracking-[-0.03em] sm:text-[26px]">{hero.name}</h2>
                    <p className="mt-2 max-w-[490px] text-sm leading-relaxed text-[#C1CCDA]">
                        Pick up where you left off — resources, practice exercises and assessments, tracked together.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#D5DCE6]">
                        <span className="flex items-center gap-1.5">
                            <BookOpen size={13} strokeWidth={1.9} style={{ color: '#FFAD70' }} /> Progress across I Do, We Do &amp; You Do
                        </span>
                        {m.time.tracked && (
                            <span className="flex items-center gap-1.5">
                                <Clock3 size={13} strokeWidth={1.9} style={{ color: '#FFAD70' }} /> {hm(m.time.totalSeconds)} tracked study time
                            </span>
                        )}
                    </div>
                </div>

                <div className="rounded-[14px] border border-white/20 bg-white/[0.07] p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-[#CED8E4]">Overall course progress</span>
                        <strong className="text-base font-semibold">{hero.progress}%</strong>
                    </div>
                    <div className="my-2.5">
                        <Meter value={hero.progress} color="linear-gradient(90deg,#FF9D59,#FFD2A9)" track="rgba(255,255,255,.22)" height={6} />
                    </div>
                    <p className="text-[11px] text-[#AEBDCE]">
                        I Do {hero.learn.opened}/{hero.learn.total} · We Do {hero.practice.started}/{hero.practice.assigned} · You Do {hero.assess.started}/{hero.assess.assigned}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                        <div className="min-w-0">
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-[#9FB0C3]">
                                Next task{next ? ` · ${next.stage}` : ''}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-medium">{next ? next.title : "You're all caught up"}</p>
                        </div>
                        <button
                            onClick={() => onCourse(hero.id)}
                            aria-label="Continue course"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white transition-transform hover:scale-105"
                            style={{ background: T.orange }}
                        >
                            <Play size={14} fill="currentColor" strokeWidth={0} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

/* ── stat strip ──────────────────────────────────────────────────────────── */

const StatCard = ({
    icon, tint, soft, label, value, unit, foot, onClick,
}: {
    icon: React.ReactNode; tint: string; soft: string; label: string;
    value: React.ReactNode; unit?: string; foot: string; onClick?: () => void;
}) => (
    <Panel
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={'flex flex-col p-4 ' + (onClick ? 'cursor-pointer transition-transform hover:-translate-y-0.5' : '')}
    >
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#8190A3] dark:text-slate-400">{label}</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: soft, color: tint }}>
                {icon}
            </span>
        </div>
        <p className="mt-2.5 flex items-baseline gap-1 text-[22px] font-bold leading-none tracking-[-0.04em] text-[#1C2D43] dark:text-white">
            {value}
            {unit && <span className="text-xs font-semibold text-[#8592A3]">{unit}</span>}
        </p>
        <p className="mt-1.5 truncate text-[11px] text-[#8C98A8] dark:text-slate-400" title={foot}>{foot}</p>
    </Panel>
);

export const StatsRow = ({ m, onGrades }: { m: DashboardModel; onGrades: () => void }) => {
    const study = durationParts(m.time.totalSeconds);
    const attColor = m.attendance.pct != null && m.attendance.pct < 75 ? T.red : T.green;
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
                icon={<Clock3 size={15} strokeWidth={1.9} />} tint={T.orangeDeep} soft={T.orangeSoft}
                label="Tracked study time"
                value={m.time.tracked ? hm(m.time.totalSeconds) : study.value}
                unit={m.time.tracked ? undefined : study.unit}
                foot={m.time.tracked ? `${shortDuration(m.time.exerciseSeconds)} on We Do & You Do` : 'No tracked time yet'}
            />
            <StatCard
                icon={<TrendingUp size={15} strokeWidth={1.9} />} tint={T.blue} soft={T.blueSoft}
                label="Overall progress" value={`${m.overallProgress}%`}
                foot="Across courses with content"
            />
            <StatCard
                icon={<CalendarCheck2 size={15} strokeWidth={1.9} />} tint={attColor} soft={T.greenSoft}
                label="Attendance"
                value={m.attendance.pct == null ? '—' : `${m.attendance.pct}%`}
                foot={m.attendance.hasData ? `${m.attendance.present} of ${m.attendance.totalDays} days present` : 'Not marked yet'}
            />
            <StatCard
                icon={<Award size={15} strokeWidth={1.9} />} tint={T.purple} soft={T.purpleSoft}
                label="Current grade" value={m.grade.letter}
                unit={m.scorePct == null ? undefined : `${m.scorePct}%`}
                foot={m.scorePct == null ? 'Nothing graded yet' : 'Based on graded submissions'}
                onClick={onGrades}
            />
        </div>
    );
};

/* ── submission activity (7-day bars) ────────────────────────────────────── */

export const SubmissionActivity = ({ m }: { m: DashboardModel }) => {
    const week = m.momentum.week;
    const max = Math.max(4, ...week.map((d) => d.count));
    return (
        <Panel className="flex flex-col p-4 sm:p-5">
            <PanelHead
                title="Submission activity"
                sub="We Do & You Do work across the last 7 days"
                action={<span className="shrink-0 rounded-[7px] border border-[#EDF0F3] px-2 py-1 text-[10px] font-semibold text-[#8390A1] dark:border-[#2A2D34] dark:text-slate-400">Last 7 days</span>}
            />
            <div className="mb-1 flex items-baseline gap-2">
                <strong className="text-[22px] font-bold leading-none tracking-[-0.04em] text-[#1C2D43] dark:text-white">{m.momentum.weekTotal}</strong>
                <span className="text-[11px] text-[#8794A4] dark:text-slate-400">submitted questions this week</span>
            </div>

            {m.momentum.hasAny ? (
                <div className="mt-3 flex h-[150px] items-end gap-2 sm:gap-3">
                    {week.map((d) => {
                        const h = Math.round((d.count / max) * 100);
                        return (
                            <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                                <div className="flex w-full flex-1 items-end justify-center">
                                    <div
                                        title={`${d.count} submitted`}
                                        className="w-[55%] max-w-[26px] rounded-t-[5px]"
                                        style={{
                                            height: `${d.count > 0 ? Math.max(h, 8) : 4}%`,
                                            minHeight: 4,
                                            background: d.count > 0 ? 'linear-gradient(180deg,#FA9E5B,#F47721)' : '#EEF0F3',
                                        }}
                                    />
                                </div>
                                <span className="text-[11px] font-semibold" style={{ color: d.isToday ? T.orangeDeep : T.muted }}>
                                    {d.dow}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-3"><EmptyRow text="No submissions yet this week — your first one starts the chart." /></div>
            )}
        </Panel>
    );
};

/* ── coming up (deadlines) ───────────────────────────────────────────────── */

export const ComingUp = ({ m, onCalendar }: { m: DashboardModel; onCalendar: () => void }) => {
    const actionable = m.deadlines.filter((d) => d.state !== 'opens');
    const list = (actionable.length ? actionable : m.deadlines).slice(0, 3);
    return (
        <Panel className="flex flex-col p-4 sm:p-5">
            <PanelHead title="Coming up" sub="Your next deadlines" action={<HeadLink label="Full calendar" onClick={onCalendar} />} />
            {list.length === 0 ? (
                <EmptyRow text="Nothing due right now. New assignments appear here." />
            ) : (
                <div className="flex flex-col">
                    {list.map((d, i) => {
                        const chip = deadlineChip(d);
                        return (
                            <div
                                key={d.id}
                                className={'grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 ' + (i < list.length - 1 ? 'border-b border-[#F1F2F5] dark:border-[#2A2D34]' : '')}
                            >
                                <div className="flex h-[42px] flex-col items-center justify-center rounded-[9px] border border-[#F2E7DC] bg-[#FFF8F2] dark:border-[#3A2E20] dark:bg-[#241B10]" style={{ color: T.orangeDeep }}>
                                    <b className="text-sm leading-none">{d.date.getDate()}</b>
                                    <small className="text-[8px] font-semibold uppercase tracking-wide">{d.date.toLocaleString('en-US', { month: 'short' })}</small>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-[13px] font-semibold text-[#35485F] dark:text-slate-200">{d.title}</p>
                                    <p className="mt-0.5 truncate text-[11px] text-[#99A4B2] dark:text-slate-400">
                                        {d.courseName} · {d.stage} · {clock(d.date)}
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-[6px] px-2 py-1 text-[10px] font-semibold" style={{ background: chip.soft, color: chip.color }}>
                                    {chip.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </Panel>
    );
};

/* ── courses ─────────────────────────────────────────────────────────────── */

const LOGOS = [
    { Icon: Code2, color: T.orangeDeep, soft: T.orangeSoft },
    { Icon: Database, color: T.blue, soft: T.blueSoft },
    { Icon: FileText, color: T.purple, soft: T.purpleSoft },
];
const TRACK_COLORS = [T.orange, T.blue, T.purple];

const CourseCard = ({ c, index, onOpen }: { c: CourseModel; index: number; onOpen: (id: string) => void }) => {
    const logo = LOGOS[index % LOGOS.length];
    const track = TRACK_COLORS[index % TRACK_COLORS.length];
    return (
        <button
            onClick={() => onOpen(c.id)}
            className="flex min-w-0 flex-col rounded-[11px] border border-[#EDF0F3] bg-white p-3 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[#F0C19D] dark:border-[#2A2D34] dark:bg-[#1C1E23]"
        >
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: logo.soft, color: logo.color }}>
                    <logo.Icon size={15} strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[13px] font-semibold text-[#33475F] dark:text-slate-100">{c.name}</strong>
                    <small className="block truncate text-[11px] text-[#9AA5B3]">{c.level || 'Course'} · I Do / We Do / You Do</small>
                </span>
                <ChevronRight size={14} className="shrink-0 text-[#AEB7C2]" />
            </div>

            <div className="mb-1.5 mt-3 flex items-center justify-between text-[11px] text-[#8A97A7]">
                <span>Overall course progress</span>
                <strong className="font-semibold text-[#42566E] dark:text-slate-200">{c.progress}%</strong>
            </div>
            <Meter value={c.progress} color={track} height={4} />

            <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-[#9AA5B3]">
                <span className="flex items-center gap-1 whitespace-nowrap">
                    <Clock3 size={11} /> {c.lastAccessed ? `Last studied ${timeAgo(c.lastAccessed)}` : 'Not started'}
                </span>
                <span className="truncate">{c.learn.opened}/{c.learn.total} · {c.practice.started}/{c.practice.assigned} · {c.assess.started}/{c.assess.assigned}</span>
            </div>
        </button>
    );
};

export const CoursesPanel = ({ m, onOpen, onViewAll }: { m: DashboardModel; onOpen: (id: string) => void; onViewAll: () => void }) => (
    <Panel className="p-4 sm:p-5">
        <PanelHead
            title="Your courses"
            sub="Keep moving forward across your learning paths"
            action={
                <div className="flex items-center gap-2.5">
                    <span className="rounded-[7px] border border-[#EDF0F3] px-2 py-1 text-[10px] text-[#8390A1] dark:border-[#2A2D34] dark:text-slate-400">{m.courses.length} enrolled</span>
                    <HeadLink label="View all" onClick={onViewAll} />
                </div>
            }
        />
        {m.courses.length === 0 ? (
            <EmptyRow text="You're not enrolled in any course yet." />
        ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {m.courses.map((c, i) => <CourseCard key={c.id} c={c} index={i} onOpen={onOpen} />)}
                <button
                    onClick={onViewAll}
                    className="flex min-h-[116px] items-center justify-center gap-2 rounded-[11px] border border-dashed border-[#E6E9ED] bg-[#FCFCFD] text-[13px] font-semibold text-[#718198] transition-colors hover:border-[#F0C19D] dark:border-[#2A2D34] dark:bg-[#1C1E23] dark:text-slate-400"
                >
                    <span className="flex h-6 w-6 items-center justify-center rounded-[8px] border border-[#E6E9ED] text-lg dark:border-[#2A2D34]" style={{ color: T.orangeDeep }}>+</span>
                    Browse all courses
                </button>
            </div>
        )}
    </Panel>
);

/* ── recent activity ─────────────────────────────────────────────────────── */

const activityVisual = (a: ActivityEvent): { Icon: React.ElementType; color: string; soft: string } => {
    if (a.kind === 'notification') return { Icon: Bell, color: T.orangeDeep, soft: T.orangeSoft };
    if (a.solved) return { Icon: CheckCircle2, color: T.green, soft: T.greenSoft };
    return { Icon: FileText, color: T.blue, soft: T.blueSoft };
};

export const RecentActivityPanel = ({ m, onViewAll }: { m: DashboardModel; onViewAll: () => void }) => {
    const list = m.activity.slice(0, 4);
    return (
        <Panel className="flex flex-col p-4 sm:p-5">
            <PanelHead title="Recent activity" sub="Your latest wins and learning moments" action={<HeadLink label="See all" onClick={onViewAll} />} />
            {list.length === 0 ? (
                <EmptyRow text="No activity yet — submit your first answer to see it here." />
            ) : (
                <div className="flex flex-col">
                    {list.map((a, i) => {
                        const v = activityVisual(a);
                        return (
                            <div
                                key={`${a.title}-${i}`}
                                className={'grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 ' + (i < list.length - 1 ? 'border-b border-[#F2F3F6] dark:border-[#2A2D34]' : '')}
                            >
                                <span className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: v.soft, color: v.color }}>
                                    <v.Icon size={14} strokeWidth={1.9} />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-[#3B4E65] dark:text-slate-200">
                                        {a.title}{a.scorePct != null ? ` · ${a.scorePct}%` : ''}
                                    </p>
                                    {a.detail && <p className="mt-0.5 truncate text-[11px] text-[#9AA5B3]">{a.detail}</p>}
                                </div>
                                <span className="shrink-0 whitespace-nowrap text-[11px] text-[#A3ADBA]">{timeAgo(a.at)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </Panel>
    );
};

/* ── submission streak ───────────────────────────────────────────────────── */

export const StreakPanel = ({ m }: { m: DashboardModel }) => {
    const mm = m.momentum;
    const activeThisWeek = mm.week.filter((d) => d.count > 0).length;
    const toSeven = Math.max(0, 7 - mm.streak);
    return (
        <Panel className="flex flex-col p-4 sm:p-5">
            <PanelHead
                title="Submission streak"
                sub="Days you submit We Do or You Do work"
                action={<span className="shrink-0 rounded-[7px] border border-[#EDF0F3] px-2 py-1 text-[10px] text-[#8390A1] dark:border-[#2A2D34] dark:text-slate-400">{mm.streak} day{mm.streak === 1 ? '' : 's'} in a row</span>}
            />

            <div className="flex items-center gap-3 py-1">
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] border border-[#F5DFC6] dark:border-[#3A2E20]" style={{ background: 'radial-gradient(circle at 50% 40%,#fff 0,#FFF9F0 58%,#FFF2DF 100%)', color: '#D7822F' }}>
                    <Sparkles size={26} strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                    <strong className="block text-[13px] font-semibold text-[#364A62] dark:text-slate-100">
                        {mm.hasAny ? 'Consistency is building.' : 'Start your streak.'}
                    </strong>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#8F9BAB] dark:text-slate-400">
                        {mm.hasAny
                            ? `${mm.streak} submission day${mm.streak === 1 ? '' : 's'} in a row. Keep it up to earn the 7-Day Streak.`
                            : 'Submit a We Do or You Do answer to begin a daily streak.'}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[10px] font-semibold" style={{ background: T.orangeSoft, color: '#AE671F' }}>
                        {mm.streak >= 7 ? '7-Day Streak earned 🎉' : `${toSeven} more day${toSeven === 1 ? '' : 's'} to earn it`}
                    </span>
                </div>
            </div>

            <div className="mt-3 rounded-[10px] border border-[#F1F2F5] bg-[#FAFBFC] p-3 dark:border-[#2A2D34] dark:bg-[#17181C]">
                <div className="flex items-center justify-between text-[11px] text-[#69798E] dark:text-slate-400">
                    <span>This week</span>
                    <strong className="font-semibold text-[#3E526B] dark:text-slate-200">{activeThisWeek} / 7 days</strong>
                </div>
                <div className="mt-2.5 grid grid-cols-7 gap-1.5">
                    {mm.week.map((d) => {
                        const done = d.count > 0;
                        return (
                            <div key={d.key} className="flex flex-col items-center gap-1 text-[10px] text-[#A1ACB9]">
                                <span>{d.dow}</span>
                                <span
                                    className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-semibold"
                                    style={{
                                        background: d.isToday ? T.orange : done ? T.orangeSoft : '#EEF0F3',
                                        color: d.isToday ? '#fff' : done ? '#BC5B18' : d.isFuture ? '#CBD5E1' : '#A5AFBC',
                                    }}
                                    title={`${d.count} submission${d.count === 1 ? '' : 's'}`}
                                >
                                    {done ? '✓' : d.isToday ? '•' : d.dom}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Panel>
    );
};

/* ── composed home ───────────────────────────────────────────────────────── */

export const StudentHome = ({
    m, onCourse, onCourses, onCalendar, onGrades, onNotifications,
}: {
    m: DashboardModel;
    onCourse: (id: string) => void;
    onCourses: () => void;
    onCalendar: () => void;
    onGrades: () => void;
    onNotifications: () => void;
}) => (
    <div className="mx-auto max-w-[1440px] space-y-5">
        <PageHead m={m} onCourses={onCourses} />
        <ContinueHero m={m} onCourse={onCourse} onCourses={onCourses} />
        <StatsRow m={m} onGrades={onGrades} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.56fr_0.9fr]">
            <SubmissionActivity m={m} />
            <ComingUp m={m} onCalendar={onCalendar} />
        </div>
        <CoursesPanel m={m} onOpen={onCourse} onViewAll={onCourses} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.24fr_0.76fr]">
            <RecentActivityPanel m={m} onViewAll={onNotifications} />
            <StreakPanel m={m} />
        </div>
        <p className="pt-1 text-center text-[11px] text-[#B0B9C3] dark:text-slate-500">
            Based on your SmartCliff LMS data — I Do resources, We Do assignments, You Do assessments, study time, attendance, grades and deadlines.
        </p>
    </div>
);
