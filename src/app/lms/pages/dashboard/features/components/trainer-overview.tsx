"use client";

// Trainer dashboard — same look as the student dashboard: a welcome banner
// with today's attendance beside it, a row of stat cards, then two columns —
//   left:  stat cards · My courses · today's assignments & assessments
//   right: Students to follow up · Teaching tools
// Narrower panels fall back to two columns, then one.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BookOpen, CalendarCheck, ChartNoAxesColumn, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Code2,
  Database, FileText, GraduationCap, LibraryBig, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { getSessionJSON, SESSION_KEYS } from "@/lib/session";
import type { StudentRow } from "@/features/ld-dashboard/types";
import { attendanceListHref, markAttendanceHref, type UseTrainerDashboard } from "../hooks/use-trainer-dashboard";
import { TrainerActivities } from "./trainer-activities";

/* ── tokens (shared with the student dashboard look) ─────────────────────── */

const CARD = "min-w-0 rounded-[14px] border border-hairline bg-surface shadow-[0_1px_2px_rgb(20_24_60/.04),0_6px_18px_rgb(20_24_60/.05)]";
const INK = "text-[#141933]";
const MUTED = "text-[#767d98]";

const courseHref = (id: string) => `/lms/pages/courses/uploadcourseresources?${new URLSearchParams({ courseId: id })}`;
const initial = (name: string) => (name.trim()[0] || "?").toUpperCase();
const reason = (student: StudentRow) => student.overall === 0 ? "Not started" : "Progress below 50%";
const AVATAR_TONES = ["bg-[#fff0e6] text-[#e8621c]", "bg-[#e9f1ff] text-[#2f6bd8]", "bg-[#f1ecff] text-[#6b55bc]"];

/** A course's row icon, picked from its name; anything unrecognised gets a book. */
const COURSE_ICONS: { test: RegExp; icon: LucideIcon }[] = [
  { test: /data\s*struct|database|\bsql\b|dbms|mongo/i, icon: Database },
  { test: /python|analytic|machine learning|\bml\b|\bai\b|statistic|data science/i, icon: ChartNoAxesColumn },
  { test: /web|html|css|java|react|front|code|program|develop/i, icon: Code2 },
];
const courseIcon = (name: string) => COURSE_ICONS.find((c) => c.test.test(name))?.icon ?? BookOpen;
const COURSE_TONES = [
  { icon: "bg-[#e8f1ff] text-[#3473d7]", bar: "bg-[#3a7be0]" },
  { icon: "bg-[#efedff] text-[#6e5acb]", bar: "bg-[#7767df]" },
];

/* ── primitives ──────────────────────────────────────────────────────────── */

const IconSquare = ({ Icon, from, to }: { Icon: LucideIcon; from: string; to: string }) => (
  <span className="grid size-[26px] shrink-0 place-items-center rounded-lg text-white" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
    <Icon size={15} />
  </span>
);

const Ring = ({ pct, color, track, size, width }: { pct: number; color: string; track: string; size: number; width: number }) => (
  <span className="grid shrink-0 place-items-center rounded-full" style={{ width: size, height: size, background: `conic-gradient(${color} ${Math.max(0, Math.min(100, pct))}%, ${track} 0)` }} role="img" aria-label={`${pct}%`}>
    <span className="rounded-full bg-white" style={{ width: size - width * 2, height: size - width * 2 }} />
  </span>
);

const StatCard = ({ label, value, unit, aside }: { label: string; value: string; unit?: string; aside: React.ReactNode }) => (
  <div className={`${CARD} flex flex-col px-2.5 py-2.5 @min-[820px]:px-3`}>
    <p className="text-[11px] font-semibold leading-[1.3] text-[#394061] @min-[820px]:text-xs">{label}</p>
    <div className="mt-[5px] flex items-center justify-between gap-1.5">
      <span className={`whitespace-nowrap text-[22px] font-bold leading-[1.1] ${value === "—" ? "text-[#a2a8bd]" : INK}`}>
        {value}{unit && <small className="ml-0.5 text-[13px] font-semibold text-[#394061]">{unit}</small>}
      </span>
      {aside}
    </div>
  </div>
);

const StatIcon = ({ Icon, tint }: { Icon: LucideIcon; tint: string }) => (
  <span className={`grid size-7 shrink-0 place-items-center rounded-lg @min-[820px]:size-8 @min-[820px]:rounded-[9px] ${tint}`}>
    <Icon size={16} />
  </span>
);

/** The signed-in trainer's name from the session (client-only, so read after mount). */
function useTrainerName() {
  const [name, setName] = useState({ first: "", full: "" });
  useEffect(() => {
    const u = getSessionJSON<{ firstName?: string; lastName?: string }>(SESSION_KEYS.userData);
    const first = u?.firstName?.trim() || "";
    setName({ first, full: [first, u?.lastName?.trim()].filter(Boolean).join(" ") });
  }, []);
  return name;
}

/* ── overview ────────────────────────────────────────────────────────────── */

export function TrainerOverview({ data }: { data: UseTrainerDashboard }) {
  const [showAllStudents, setShowAllStudents] = useState(false);
  const name = useTrainerName();
  const { model, learners, batchesToday, coursePerf, batchIdByCourse, permissionKeys } = data;
  if (!model) return null;

  const attendanceBatch = batchesToday.find((batch) => !batch.marked) || batchesToday[0];
  const todayBatchIdByCourse = { ...batchIdByCourse };
  for (const batch of batchesToday) {
    if (batch.mine && batch.batchId) todayBatchIdByCourse[batch.courseId] = batch.batchId;
  }
  const pending = batchesToday.filter((batch) => !batch.marked).length;
  const canMark = permissionKeys.has("attendancemanagement");
  const attendanceHref = canMark ? attendanceBatch ? markAttendanceHref(attendanceBatch) : attendanceListHref() : attendanceBatch ? courseHref(attendanceBatch.courseId) : "/lms/pages/courses";
  const displayedCourses = [...coursePerf].sort((a, b) => Number(b.id === attendanceBatch?.courseId) - Number(a.id === attendanceBatch?.courseId)).slice(0, 3);
  const batchNameOf = (courseId: string) => batchesToday.find((batch) => batch.courseId === courseId && batch.mine)?.batchName;
  const notStarted = learners.filter((student) => student.overall === 0);
  const lowProgress = learners.filter((student) => student.overall > 0 && student.overall < 50);
  const followUp = [...notStarted, ...lowProgress];
  const followRows = showAllStudents ? followUp : followUp.slice(0, 3);
  const tools = [
    { label: "Course resources", hint: "Prepare lessons", icon: FileText, href: attendanceBatch ? courseHref(attendanceBatch.courseId) : coursePerf[0] ? courseHref(coursePerf[0].id) : "/lms/pages/courses", show: true, tone: "bg-[#fff0e7] text-[#ed671f]" },
    { label: "Review student work", hint: "Check submissions", icon: Users, href: "/lms/pages/grades", show: permissionKeys.has("grades"), tone: "bg-[#f1edff] text-[#7058d8]" },
    { label: "Question bank", hint: "Create questions", icon: CircleHelp, href: "/lms/pages/questionbanks", show: permissionKeys.has("questionbanks"), tone: "bg-[#eaf3ff] text-[#3473d7]" },
  ].filter((tool) => tool.show);

  // Stat cards: footprint and how far learners have got, pooled over the courses.
  const learnerTotal = coursePerf.reduce((n, c) => n + c.students, 0);
  const startedTotal = coursePerf.reduce((n, c) => n + c.started, 0);
  const startedPct = learnerTotal > 0 ? Math.round((startedTotal / learnerTotal) * 100) : null;
  const weighted = coursePerf.filter((c) => c.avg !== null && c.students > 0);
  const weightedLearners = weighted.reduce((n, c) => n + c.students, 0);
  const avgProgress = weightedLearners > 0 ? Math.round(weighted.reduce((n, c) => n + (c.avg ?? 0) * c.students, 0) / weightedLearners) : null;
  const firstName = name.first || name.full.split(/\s+/)[0];

  return (
    <div className="@container">
      <div
        className={[
          "grid gap-3",
          "[grid-template-areas:'hero'_'attend'_'stats'_'courses'_'follow'_'activities'_'tools']",
          "@min-[720px]:grid-cols-2 @min-[720px]:[grid-template-areas:'hero_hero'_'stats_stats'_'attend_follow'_'courses_courses'_'activities_activities'_'tools_tools']",
          "@min-[1000px]:grid-cols-[minmax(0,2.36fr)_minmax(0,1fr)] @min-[1000px]:[grid-template-areas:'hero_attend'_'left_right']",
        ].join(" ")}
      >
        {/* welcome banner */}
        <section
          aria-labelledby="trainer-welcome-title"
          className="relative isolate min-h-[220px] overflow-hidden rounded-[22px] border border-white/80 px-5 py-5 shadow-[0_8px_24px_rgb(55_40_90/.08)] [grid-area:hero] @min-[720px]:min-h-[236px] @min-[1000px]:px-6"
          style={{ background: "radial-gradient(ellipse at 89% 12%,rgba(196,181,253,.40),transparent 32%),radial-gradient(ellipse at 93% 105%,rgba(255,211,181,.52),transparent 37%),linear-gradient(112deg,#fffdf9 0%,#fff8f1 53%,#f7f3ff 100%)" }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] @min-[480px]:block">
            <div className="absolute bottom-[8%] right-[7%] h-[82%] w-[86%] rounded-full bg-[#ffd9bf]/45 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/trainer-dashboard/attendance-register.webp" alt="" className="absolute bottom-0 right-0 h-full w-full max-w-none object-contain object-right-bottom" />
          </div>
          <div className="relative z-10 max-w-full @min-[480px]:max-w-[61%] @min-[720px]:max-w-[59%] @min-[1000px]:max-w-[60%]">
            <p className="text-[14px] font-semibold tracking-[0.01em] text-[#39415f]">Welcome back,</p>
            <div className="mt-0.5 flex min-w-0 items-start gap-2">
              <h2 id="trainer-welcome-title" className="min-w-0 break-words text-[24px] font-extrabold leading-[1.12] tracking-[-0.035em] text-[#111832] @min-[720px]:text-[28px] @min-[1000px]:text-[30px]">
                {name.full || "Trainer"}
              </h2>
              <span aria-hidden="true" className="shrink-0 pt-0.5 text-[22px] leading-none">👋</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#e6e0f4] bg-white/85 px-3 py-1 text-[12px] font-semibold text-[#303957] shadow-[0_1px_2px_rgb(34_37_75/.05)]">
                <GraduationCap aria-hidden="true" size={15} className="shrink-0 text-[#6652c6]" />Trainer
              </span>
              {coursePerf.length > 0 && (
                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#e6e0f4] bg-white/85 px-3 py-1 text-[12px] font-semibold text-[#303957] shadow-[0_1px_2px_rgb(34_37_75/.05)]">
                  <LibraryBig aria-hidden="true" size={14} className="shrink-0 text-[#6652c6]" />
                  {coursePerf.length} {coursePerf.length === 1 ? "course" : "courses"} · {learnerTotal} learners
                </span>
              )}
            </div>
            <div className="mt-3 max-w-[440px]">
              <p className="border-l-[3px] border-[#f46a21] pl-3 text-[14px] font-bold leading-[1.35] text-[#202744] @min-[720px]:text-[15px]">
                &ldquo;Teaching is the one profession that creates all others.&rdquo;
              </p>
              <p className="mt-1.5 pl-3 text-[13px] leading-[1.45] text-[#46506f]">
                {firstName ? `Here's what needs you today, ${firstName}.` : "Here's what needs you today."}
              </p>
            </div>
          </div>
        </section>

        {/* today's attendance — the compact card beside the banner */}
        <section className={`${CARD} flex flex-col px-4 py-3 [grid-area:attend]`} style={{ background: "linear-gradient(160deg,#fff 55%,#fff5ee)" }}>
          <div className="flex items-start justify-between gap-3">
            <p className={`flex items-center gap-2 text-sm font-semibold ${INK}`}>
              <IconSquare Icon={CalendarCheck} from="#ff9a5c" to="#f46a21" />Today&apos;s attendance
            </p>
            {pending > 1 && <span className={`whitespace-nowrap pt-1 text-[11px] ${MUTED}`}>{pending} to mark</span>}
          </div>
          {attendanceBatch ? (
            <>
              <p className={`mt-3 truncate text-[15px] font-bold ${INK}`} title={`${attendanceBatch.courseName} · ${attendanceBatch.batchName}`}>
                {attendanceBatch.courseName} · {attendanceBatch.batchName}
              </p>
              <p className={`text-[12px] ${MUTED}`}>{attendanceBatch.students} learners</p>
              <p className={`mt-2.5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-bold ${attendanceBatch.marked ? "bg-[#e6f7ed] text-[#168451]" : "bg-[#ffe5e3] text-[#bf2e24]"}`}>
                {attendanceBatch.marked ? <CheckCircle2 size={14} /> : <span className="size-2 rounded-full bg-[#d92d20]" />}
                {attendanceBatch.marked ? "Attendance marked" : "Not marked yet"}
              </p>
            </>
          ) : (
            <p className={`mt-3 text-[13px] leading-relaxed ${MUTED}`}>No attendance register is due for your courses today.</p>
          )}
          <div className="mt-auto pt-3">
            <Link
              href={attendanceHref}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#f46a21] px-3.5 text-[12.5px] font-bold text-white shadow-[0_5px_12px_rgb(229_94_30/.22)] transition-colors hover:bg-[#df5716] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8621c]/40"
            >
              {canMark ? attendanceBatch ? attendanceBatch.marked ? "View register" : "Mark attendance" : "View attendance" : "Open course"}<ArrowRight size={15} />
            </Link>
          </div>
        </section>

        {/* left column */}
        <div className="contents [grid-area:left] @min-[1000px]:flex @min-[1000px]:min-w-0 @min-[1000px]:flex-col @min-[1000px]:gap-3">
          <div className="@container [grid-area:stats]">
            <div className="grid grid-cols-2 gap-2 @min-[560px]:grid-cols-4">
              <StatCard label="My Courses" value={String(coursePerf.length)} aside={<StatIcon Icon={BookOpen} tint="bg-[#f1edff] text-[#6c4cf1]" />} />
              <StatCard label="Learners" value={String(learnerTotal)} aside={<StatIcon Icon={Users} tint="bg-[#edf2ff] text-[#3a6cf4]" />} />
              <StatCard label="Started Learning" value={startedPct === null ? "—" : String(startedPct)} unit={startedPct === null ? undefined : "%"} aside={<Ring pct={startedPct ?? 0} color="#1fb866" track="#dcf3e6" size={32} width={5} />} />
              <StatCard label="Average Progress" value={avgProgress === null ? "—" : String(avgProgress)} unit={avgProgress === null ? undefined : "%"} aside={<StatIcon Icon={ChartNoAxesColumn} tint="bg-[#fff6e3] text-[#e08a00]" />} />
            </div>
          </div>

          <section className={`${CARD} px-4 py-3 [grid-area:courses]`} aria-labelledby="my-courses-title">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p id="my-courses-title" className={`flex items-center gap-2 text-sm font-semibold ${INK}`}>
                <IconSquare Icon={BookOpen} from="#8b6cf8" to="#6c4cf1" />My courses
              </p>
              {coursePerf.length > displayedCourses.length && (
                <Link href="/lms/pages/courses" className="inline-flex h-[26px] items-center gap-1.5 rounded-lg bg-[#edf2ff] px-2.5 text-[11px] font-semibold text-[#3a6cf4] hover:bg-[#e2eaff]">
                  View all <ArrowRight size={13} />
                </Link>
              )}
            </div>
            <div className="space-y-1">
              {displayedCourses.map((course, index) => {
                const today = course.id === attendanceBatch?.courseId;
                const tone = COURSE_TONES[index % COURSE_TONES.length];
                const Icon = courseIcon(course.name);
                const started = course.students > 0 ? Math.round((course.started / course.students) * 100) : null;
                return (
                  <Link key={course.id} href={courseHref(course.id)} className={`group flex flex-wrap items-center gap-3 rounded-xl border px-2.5 py-2.5 hover:bg-[#fff9f5] ${today ? "border-[#ffd9c2] bg-[#fff8f3]" : "border-transparent"}`}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${today ? "bg-[#ffebe0] text-[#e96822]" : tone.icon}`}><Icon size={19} /></span>
                    <span className="min-w-[130px] flex-1">
                      <span className={`block truncate text-[13px] font-semibold ${INK}`}>{course.name}</span>
                      <span className={`block text-[11px] ${MUTED}`}>{batchNameOf(course.id) || course.code || "Assigned course"}</span>
                    </span>
                    <span className="w-14 text-[11px] leading-tight text-[#4c5671]"><b className={`block text-[13px] ${INK}`}>{course.students}</b>learners</span>
                    <span className="w-[170px] text-[11px] text-[#5f6983]">
                      <span className="mb-1 block">Started learning</span>
                      <span className="flex items-center gap-2">
                        <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7e7ef]"><span className={`block h-full rounded-full ${today ? "bg-[#fa762f]" : tone.bar}`} style={{ width: `${started ?? 0}%` }} /></span>
                        <b className={`w-9 text-right ${INK}`}>{started === null ? "—" : `${started}%`}</b>
                      </span>
                    </span>
                    <span className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-bold ${today ? "border-[#ffd2b8] bg-[#fff1e8] text-[#dc5c1d]" : "border-[#e1e4ec] bg-[#f8f9fc] text-[#27304d]"}`}>Open course <ArrowRight size={13} /></span>
                  </Link>
                );
              })}
              {!coursePerf.length && <p className={`py-5 text-[13px] ${MUTED}`}>No courses are assigned in this view.</p>}
            </div>
          </section>

          <div className="min-w-0 [grid-area:activities]">
            <TrainerActivities courses={coursePerf} batchIdByCourse={todayBatchIdByCourse} />
          </div>
        </div>

        {/* right column */}
        <div className="contents [grid-area:right] @min-[1000px]:flex @min-[1000px]:min-w-0 @min-[1000px]:flex-col @min-[1000px]:gap-3">
          <section className={`${CARD} flex flex-col px-4 py-3 [grid-area:follow]`} aria-labelledby="follow-up-title">
            <p id="follow-up-title" className={`flex items-center gap-2 text-sm font-semibold ${INK}`}>
              <IconSquare Icon={Users} from="#ff8a8a" to="#ef4444" />Students to follow up
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#fff0ef] px-3 py-2.5"><span className="block text-[22px] font-extrabold leading-none text-[#ba332f]">{notStarted.length}</span><span className="mt-1 block text-[11px] font-medium text-[#5e677e]">not started</span></div>
              <div className="rounded-xl bg-[#f1efff] px-3 py-2.5"><span className="block text-[22px] font-extrabold leading-none text-[#5f50c8]">{lowProgress.length}</span><span className="mt-1 block text-[11px] font-medium text-[#5e677e]">below 50% progress</span></div>
            </div>
            <div className={`mt-2 divide-y divide-hairline ${showAllStudents ? "max-h-[360px] overflow-y-auto pr-1" : ""}`}>
              {followRows.length ? followRows.map((student, index) => (
                <Link key={`${student.courseId}-${student.id || index}`} href={permissionKeys.has("grades") ? `/lms/pages/grades/${student.courseId}` : courseHref(student.courseId)} aria-label={`View ${student.name} in ${student.course}`} title={student.course} className="group flex items-center gap-3 py-2">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold ${AVATAR_TONES[index % AVATAR_TONES.length]}`}>{initial(student.name)}</span>
                  <span className="min-w-0 flex-1"><span className={`block truncate text-[12.5px] font-semibold ${INK}`}>{student.name}</span><span className={`block truncate text-[11px] ${MUTED}`}>{reason(student)}</span></span>
                  <ChevronRight size={15} className="shrink-0 text-[#a1a9bd] group-hover:text-[#e56521]" />
                </Link>
              )) : <p className={`py-4 text-[13px] ${MUTED}`}>No learners need follow-up in this view.</p>}
            </div>
            {followUp.length > 3 && (
              <button
                type="button"
                aria-expanded={showAllStudents}
                onClick={() => setShowAllStudents((current) => !current)}
                className="mt-2 inline-flex h-[30px] items-center justify-center gap-1.5 rounded-lg bg-[#edf2ff] px-2.5 text-[11.5px] font-semibold text-[#3a6cf4] transition-colors hover:bg-[#e2eaff]"
              >
                {showAllStudents ? "Show less" : `View all students (${followUp.length})`}
                <ChevronDown size={13} className={`transition-transform ${showAllStudents ? "rotate-180" : ""}`} />
              </button>
            )}
          </section>

          <section className={`${CARD} px-4 py-3 [grid-area:tools]`} aria-labelledby="teaching-tools-title">
            <p id="teaching-tools-title" className={`flex items-center gap-2 text-sm font-semibold ${INK}`}>
              <IconSquare Icon={Wrench} from="#5aa0ff" to="#3473d7" />Teaching tools
            </p>
            <div className="mt-1 divide-y divide-hairline">
              {tools.map((tool) => (
                <Link key={tool.label} href={tool.href} className="group flex items-center gap-3 py-2.5">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tool.tone}`}><tool.icon size={17} /></span>
                  <span className="min-w-0 flex-1"><span className={`block text-[12.5px] font-semibold ${INK}`}>{tool.label}</span><span className={`block text-[11px] ${MUTED}`}>{tool.hint}</span></span>
                  <ChevronRight size={16} className="shrink-0 text-[#a1a9bd] group-hover:text-[#e56521]" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
