"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChartNoAxesColumn, CheckCircle2, ChevronRight, CircleHelp, Code2, Database, FileText, Users, type LucideIcon } from "lucide-react";
import type { StudentRow } from "@/features/ld-dashboard/types";
import { attendanceListHref, markAttendanceHref, type UseTrainerDashboard } from "../hooks/use-trainer-dashboard";
import { TrainerActivities } from "./trainer-activities";

const courseHref = (id: string) => `/lms/pages/courses/uploadcourseresources?${new URLSearchParams({ courseId: id })}`;
const card = "rounded-[20px] border border-[#e9eaf1] bg-white p-5 shadow-[0_4px_20px_rgb(24_29_60/.04)] @min-[820px]:p-6";

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

export function TrainerOverview({ data }: { data: UseTrainerDashboard }) {
  const [showAllStudents, setShowAllStudents] = useState(false);
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
  const tools = [
    { label: "Course resources", hint: "Prepare lessons", icon: FileText, href: attendanceBatch ? courseHref(attendanceBatch.courseId) : coursePerf[0] ? courseHref(coursePerf[0].id) : "/lms/pages/courses", show: true, tone: "bg-[#fff0e7] text-[#ed671f]" },
    { label: "Review student work", hint: "Check submissions", icon: Users, href: "/lms/pages/grades", show: permissionKeys.has("grades"), tone: "bg-[#f1edff] text-[#7058d8]" },
    { label: "Question bank", hint: "Create questions", icon: CircleHelp, href: "/lms/pages/questionbanks", show: permissionKeys.has("questionbanks"), tone: "bg-[#eaf3ff] text-[#3473d7]" },
  ].filter((tool) => tool.show);

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 @min-[820px]:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <section className="relative isolate min-h-[310px] min-w-0 overflow-hidden rounded-[22px] border border-white/70 px-6 py-6 shadow-[0_8px_28px_rgb(103_75_146/.09)] @min-[820px]:min-h-[405px] @min-[820px]:p-7" style={{ background: "radial-gradient(circle at 88% 17%,rgba(206,189,255,.48),transparent 41%),linear-gradient(110deg,#fff4e9 0%,#fff5f1 48%,#e9dcff 100%)" }} aria-labelledby="today-attendance-title">
          <div className="relative z-10 max-w-full @min-[820px]:max-w-[56%]">
            <h2 id="today-attendance-title" className="text-[27px] font-extrabold leading-tight tracking-[-.035em] text-[#151a38] @min-[820px]:text-[32px]">Today&apos;s attendance</h2>
            {attendanceBatch ? (
              <>
                <p className="mt-3 text-[17px] font-bold text-[#202646]">{attendanceBatch.courseName} · {attendanceBatch.batchName}</p>
                <p className="mt-1 text-[14px] font-medium text-[#4b5574]">{attendanceBatch.students} learners</p>
                <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold ${attendanceBatch.marked ? "bg-[#e6f7ed] text-[#168451]" : "bg-[#ffe5e3] text-[#bf2e24]"}`}>
                  {attendanceBatch.marked ? <CheckCircle2 size={15} /> : <span className="size-2 rounded-full bg-[#d92d20]" />}{attendanceBatch.marked ? "Attendance marked" : "Not marked yet"}
                </p>
              </>
            ) : <p className="mt-4 max-w-[320px] text-[14px] leading-relaxed text-[#4b5574]">No attendance register is due for your courses today.</p>}
            <div className="mt-7 flex flex-wrap items-center gap-3 @min-[820px]:mt-20">
              <Link href={attendanceHref} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#f46a21] px-4 py-2 text-[13px] font-bold text-white shadow-[0_5px_12px_rgb(229_94_30/.22)] transition-colors hover:bg-[#df5716] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8621c]/40">
                {canMark ? attendanceBatch ? attendanceBatch.marked ? "View register" : "Mark attendance" : "View attendance" : "Open course"}<ArrowRight size={16} />
              </Link>
              {pending > 1 && <span className="text-[12px] text-[#5d6680]">{pending - 1} more registers need marking</span>}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {attendanceBatch && !attendanceBatch.marked && <img src="/assets/trainer-dashboard/attendance-register.webp" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 hidden h-[98%] w-[49%] object-contain object-right-bottom @min-[820px]:block" />}
          {attendanceBatch?.marked && <span aria-hidden="true" className="pointer-events-none absolute bottom-9 right-[11%] hidden size-28 place-items-center rounded-full bg-[#e3f8ea] text-[#28965c] shadow-[0_8px_24px_rgb(40_150_92/.12)] @min-[820px]:grid"><CheckCircle2 size={58} strokeWidth={1.5} /></span>}
        </section>

        <section className={`${card} flex min-w-0 flex-col`} aria-labelledby="follow-up-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="follow-up-title" className="text-[20px] font-bold tracking-[-.02em] text-[#151b39] @min-[820px]:text-[23px]">Students to follow up</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-[#fff0ef] px-3.5 py-3"><span className="block text-[27px] font-extrabold leading-none text-[#ba332f]">{notStarted.length}</span><span className="mt-1 block text-[12px] font-medium text-[#5e677e]">not started</span></div>
            <div className="rounded-xl bg-[#f1efff] px-3.5 py-3"><span className="block text-[27px] font-extrabold leading-none text-[#5f50c8]">{lowProgress.length}</span><span className="mt-1 block text-[12px] font-medium text-[#5e677e]">below 50% progress</span></div>
          </div>
          <div className="mt-3 divide-y divide-[#ecedf3]">
            {followUp.length ? followUp.slice(0, 3).map((student, index) => (
              <Link key={`${student.courseId}-${student.id || index}`} href={permissionKeys.has("grades") ? `/lms/pages/grades/${student.courseId}` : courseHref(student.courseId)} aria-label={`View ${student.name} in ${student.course}`} title={student.course} className="group flex items-center gap-3 py-2.5">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${AVATAR_TONES[index % AVATAR_TONES.length]}`}>{initial(student.name)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-[#202640]">{student.name}</span><span className="block truncate text-[11px] text-[#727b95]">{reason(student)}</span></span>
                <ChevronRight size={16} className="shrink-0 text-[#a1a9bd] group-hover:text-[#e56521]" />
              </Link>
            )) : <p className="py-4 text-[13px] text-[#69728d]">No learners need follow-up in this view.</p>}
          </div>
          <button type="button" onClick={() => setShowAllStudents((current) => !current)} aria-expanded={showAllStudents} aria-controls="follow-up-students" className="mt-auto flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#e5e7ef] bg-[#f8f9fc] px-3 text-[13px] font-bold text-[#1d2444] hover:border-[#f2b38f] hover:bg-[#fff6f0]">
            {showAllStudents ? "Hide students" : "View students"}<ArrowRight size={15} className={showAllStudents ? "rotate-90" : ""} />
          </button>
        </section>
      </div>

      {showAllStudents && <section id="follow-up-students" className={card} aria-label="Students to follow up">
        <p className="text-[13px] font-semibold text-[#27304d]">{followUp.length} students need follow-up across your courses</p>
        <div className="mt-3 grid max-h-[320px] gap-2 overflow-y-auto sm:grid-cols-2">
          {followUp.map((student, index) => <Link key={`${student.courseId}-${student.id || index}`} href={permissionKeys.has("grades") ? `/lms/pages/grades/${student.courseId}` : courseHref(student.courseId)} className="flex items-center gap-3 rounded-xl border border-[#eceef4] px-3 py-2 hover:border-[#f2b38f] hover:bg-[#fffaf6]">
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold ${AVATAR_TONES[index % AVATAR_TONES.length]}`}>{initial(student.name)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-[#202640]">{student.name}</span><span className="block truncate text-[11px] text-[#727b95]">{reason(student)} · {student.course}</span></span>
            <ArrowRight size={14} className="shrink-0 text-[#a1a9bd]" />
          </Link>)}
          {!followUp.length && <p className="text-[13px] text-[#69728d]">No learners need follow-up in this view.</p>}
        </div>
      </section>}

      <div className="grid min-w-0 gap-4 @min-[820px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className={card} aria-labelledby="my-courses-title">
          <div className="flex items-center justify-between gap-2"><h2 id="my-courses-title" className="text-[20px] font-bold text-[#151b39] @min-[820px]:text-[23px]">My courses</h2>{coursePerf.length > displayedCourses.length && <Link href="/lms/pages/courses" className="text-[12px] font-semibold text-[#dd5b16] hover:underline">View all <ArrowRight size={13} className="inline" /></Link>}</div>
          <div className="mt-3 divide-y divide-[#ecedf3]">
            {displayedCourses.map((course, index) => {
              const today = course.id === attendanceBatch?.courseId;
              const tone = COURSE_TONES[index % COURSE_TONES.length];
              const Icon = courseIcon(course.name);
              const startedPct = course.students > 0 ? Math.round((course.started / course.students) * 100) : null;
              return (
                <Link key={course.id} href={courseHref(course.id)} className={`group flex flex-wrap items-center gap-3 rounded-xl border px-2.5 py-3 hover:bg-[#fff9f5] ${today ? "border-[#ffd9c2] bg-[#fff8f3]" : "border-transparent"}`}>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${today ? "bg-[#ffebe0] text-[#e96822]" : tone.icon}`}><Icon size={20} /></span>
                  <span className="min-w-[140px] flex-1"><span className="block truncate text-[14px] font-bold text-[#202640]">{course.name}</span><span className="block text-[12px] text-[#737c96]">{batchNameOf(course.id) || course.code || "Assigned course"}</span></span>
                  <span className="w-14 text-[12px] leading-tight text-[#4c5671]"><b className="block text-[14px] text-[#202640]">{course.students}</b>learners</span>
                  <span className="w-[190px] text-[12px] text-[#5f6983]">
                    <span className="mb-1 block">Started learning</span>
                    <span className="flex items-center gap-2.5">
                      <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7e7ef]"><span className={`block h-full rounded-full ${today ? "bg-[#fa762f]" : tone.bar}`} style={{ width: `${startedPct ?? 0}%` }} /></span>
                      <b className="w-9 text-right text-[#202640]">{startedPct === null ? "—" : `${startedPct}%`}</b>
                    </span>
                  </span>
                  <span className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-bold ${today ? "border-[#ffd2b8] bg-[#fff1e8] text-[#dc5c1d]" : "border-[#e1e4ec] bg-[#f8f9fc] text-[#27304d]"}`}>Open course <ArrowRight size={14} /></span>
                </Link>
              );
            })}
            {!coursePerf.length && <p className="py-5 text-[13px] text-[#69728d]">No courses are assigned in this view.</p>}
          </div>
        </section>
        <section className={card} aria-labelledby="teaching-tools-title">
          <h2 id="teaching-tools-title" className="text-[20px] font-bold text-[#151b39] @min-[820px]:text-[23px]">Teaching tools</h2>
          <div className="mt-3 divide-y divide-[#ecedf3]">
            {tools.map((tool) => (
              <Link key={tool.label} href={tool.href} className="group flex items-center gap-3 py-3.5">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tool.tone}`}><tool.icon size={19} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[#202640]">{tool.label}</span><span className="block text-[11px] text-[#7b839a]">{tool.hint}</span></span>
                <ChevronRight size={18} className="shrink-0 text-[#a1a9bd] group-hover:text-[#e56521]" />
              </Link>
            ))}
          </div>
        </section>
      </div>
      <TrainerActivities courses={coursePerf} batchIdByCourse={todayBatchIdByCourse} />
    </div>
  );
}
