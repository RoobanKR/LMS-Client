"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CalendarCheck2, CheckCircle2, CircleAlert, ClipboardList, FileQuestion, FolderOpen, GraduationCap, Users } from "lucide-react";
import type { StudentRow } from "@/features/ld-dashboard/types";
import { attendanceListHref, markAttendanceHref, type UseTrainerDashboard } from "../hooks/use-trainer-dashboard";
import { TrainerActivities } from "./trainer-activities";

const courseHref = (id: string) => `/lms/pages/courses/uploadcourseresources?${new URLSearchParams({ courseId: id })}`;
const card = "rounded-[20px] border border-[#e9eaf1] bg-white p-5 shadow-[0_4px_20px_rgb(24_29_60/.04)]";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const reason = (student: StudentRow) => student.overall === 0 ? "Not started" : "Progress below 50%";

export function TrainerOverview({ data }: { data: UseTrainerDashboard }) {
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
  const displayedCourses = [...coursePerf].sort((a, b) => Number(b.id === attendanceBatch?.courseId) - Number(a.id === attendanceBatch?.courseId)).slice(0, 4);
  const notStarted = learners.filter((student) => student.overall === 0);
  const lowProgress = learners.filter((student) => student.overall > 0 && student.overall < 50);
  const followUp = [...notStarted, ...lowProgress].slice(0, 3);
  const tools = [
    { label: "Course resources", hint: "Prepare lessons", icon: FolderOpen, href: attendanceBatch ? courseHref(attendanceBatch.courseId) : coursePerf[0] ? courseHref(coursePerf[0].id) : "/lms/pages/courses", show: true, tone: "bg-[#fff0e7] text-[#ed671f]" },
    { label: "Review student work", hint: "Check submissions", icon: ClipboardList, href: "/lms/pages/grades", show: permissionKeys.has("grades"), tone: "bg-[#f1edff] text-[#7058d8]" },
    { label: "Question bank", hint: "Create questions", icon: FileQuestion, href: "/lms/pages/questionbanks", show: permissionKeys.has("questionbanks"), tone: "bg-[#eaf3ff] text-[#3473d7]" },
  ].filter((tool) => tool.show);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 @min-[1060px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section className="relative isolate min-h-[280px] overflow-hidden rounded-[22px] border border-white/70 px-6 py-6 shadow-[0_8px_28px_rgb(103_75_146/.09)] @min-[720px]:px-7" style={{ background: "radial-gradient(circle at 88% 17%,rgba(206,189,255,.48),transparent 41%),linear-gradient(110deg,#fff4e9 0%,#fff5f1 48%,#e9dcff 100%)" }} aria-labelledby="today-attendance-title">
          <div className="relative z-10 max-w-full @min-[600px]:max-w-[55%]">
            <div className="flex items-center gap-2 text-[#c95a20]"><CalendarCheck2 size={19} /><span className="text-[12px] font-bold uppercase tracking-[.1em]">Daily task</span></div>
            <h2 id="today-attendance-title" className="mt-2 text-[27px] font-extrabold leading-tight tracking-[-.035em] text-[#151a38] @min-[720px]:text-[30px]">Today&apos;s attendance</h2>
            {attendanceBatch ? (
              <>
                <p className="mt-3 text-[17px] font-bold text-[#202646]">{attendanceBatch.courseName} <span className="font-medium text-[#58617b]">· {attendanceBatch.batchName}</span></p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-[#4b5574]"><Users size={15} />{attendanceBatch.students} learners</p>
                <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold ${attendanceBatch.marked ? "bg-[#e6f7ed] text-[#168451]" : "bg-[#ffe5e3] text-[#bf2e24]"}`}>
                  {attendanceBatch.marked ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}{attendanceBatch.marked ? "Attendance marked" : "Not marked yet"}
                </p>
              </>
            ) : <p className="mt-4 max-w-[320px] text-[14px] leading-relaxed text-[#4b5574]">No attendance register is due for your courses today.</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={attendanceHref} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#f46a21] px-4 py-2 text-[13px] font-bold text-white shadow-[0_5px_12px_rgb(229_94_30/.22)] transition-colors hover:bg-[#df5716] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8621c]/40">
                {canMark ? attendanceBatch ? attendanceBatch.marked ? "View register" : "Mark attendance" : "View attendance" : "Open course"}<ArrowRight size={16} />
              </Link>
              {attendanceBatch && canMark && <Link href={courseHref(attendanceBatch.courseId)} className="text-[13px] font-semibold text-[#5e4bb5] hover:underline">Open course <ArrowRight size={14} className="inline" /></Link>}
              {pending > 1 && <span className="text-[12px] text-[#5d6680]">{pending - 1} more registers need marking</span>}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {attendanceBatch && !attendanceBatch.marked && <img src="/assets/trainer-dashboard/attendance-register.webp" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 hidden h-[98%] w-[43%] object-contain object-right-bottom @min-[600px]:block" />}
          {attendanceBatch?.marked && <span aria-hidden="true" className="pointer-events-none absolute bottom-9 right-[11%] hidden size-28 place-items-center rounded-full bg-[#e3f8ea] text-[#28965c] shadow-[0_8px_24px_rgb(40_150_92/.12)] @min-[600px]:grid"><CheckCircle2 size={58} strokeWidth={1.5} /></span>}
        </section>

        <section className={card} aria-labelledby="follow-up-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="follow-up-title" className="text-[20px] font-bold tracking-[-.02em] text-[#151b39]">Students to follow up</h2>
            <GraduationCap size={20} className="shrink-0 text-[#7c6cce]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-[#fff0ef] px-3.5 py-3"><span className="block text-[27px] font-extrabold leading-none text-[#ba332f]">{notStarted.length}</span><span className="mt-1 block text-[12px] font-medium text-[#5e677e]">not started</span></div>
            <div className="rounded-xl bg-[#f1efff] px-3.5 py-3"><span className="block text-[27px] font-extrabold leading-none text-[#5f50c8]">{lowProgress.length}</span><span className="mt-1 block text-[12px] font-medium text-[#5e677e]">below 50% progress</span></div>
          </div>
          <div className="mt-3 divide-y divide-[#ecedf3]">
            {followUp.length ? followUp.map((student, index) => (
              <Link key={`${student.courseId}-${student.id || index}`} href={courseHref(student.courseId)} aria-label={`Open ${student.course} for ${student.name}`} className="group flex items-center gap-2.5 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f4e9ff] text-[11px] font-bold text-[#6b55bc]">{initials(student.name)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-semibold text-[#202640]">{student.name}</span><span className="block truncate text-[11px] text-[#727b95]">{student.course}</span></span>
                <span className="shrink-0 text-[11px] font-medium text-[#b54c37]">{reason(student)}</span>
                <ArrowRight size={13} className="shrink-0 text-[#a1a9bd] group-hover:text-[#e56521]" />
              </Link>
            )) : <p className="py-4 text-[13px] text-[#69728d]">No learners need follow-up in this view.</p>}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#828aa0]">Not started means no learning attempts. Below 50% means started but attempted less than half of the course work. Counts are per course enrolment.</p>
        </section>
      </div>

      <div className="grid gap-4 @min-[980px]:grid-cols-[minmax(0,1.6fr)_minmax(0,.9fr)]">
        <section className={card} aria-labelledby="my-courses-title">
          <div className="flex items-center justify-between gap-2"><h2 id="my-courses-title" className="text-[20px] font-bold text-[#151b39]">My courses</h2><Link href="/lms/pages/courses" className="text-[12px] font-semibold text-[#dd5b16] hover:underline">View all <ArrowRight size={13} className="inline" /></Link></div>
          <div className="mt-3 divide-y divide-[#ecedf3]">
            {displayedCourses.map((course) => (
              <Link key={course.id} href={courseHref(course.id)} className={`group flex flex-wrap items-center gap-3 rounded-xl px-2 py-3 hover:bg-[#fff9f5] ${course.id === attendanceBatch?.courseId ? "bg-[#fff8f3]" : ""}`}>
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${course.id === attendanceBatch?.courseId ? "bg-[#ffebe0] text-[#e96822]" : "bg-[#efedff] text-[#6e5acb]"}`}><BookOpen size={19} /></span>
                <span className="min-w-[140px] flex-1"><span className="block truncate text-[13px] font-bold text-[#202640]">{course.name}</span><span className="block text-[11px] text-[#737c96]">{course.code || "Assigned course"}</span></span>
                <span className="text-[12px] text-[#4c5671]"><b className="text-[#202640]">{course.students}</b> learners</span>
                <span className="min-w-[145px] text-[11px] text-[#5f6983]">
                  <span className="mb-1 flex items-center justify-between gap-2"><span>Average progress</span><b className="text-[#202640]">{course.avg === null ? "—" : `${Math.round(course.avg)}%`}</b></span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-[#e7e7ef]"><span className={`block h-full rounded-full ${course.id === attendanceBatch?.courseId ? "bg-[#fa762f]" : "bg-[#7767df]"}`} style={{ width: `${Math.max(0, Math.min(100, course.avg ?? 0))}%` }} /></span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-[#a1a9bd] group-hover:text-[#e56521]" />
              </Link>
            ))}
            {!coursePerf.length && <p className="py-5 text-[13px] text-[#69728d]">No courses are assigned in this view.</p>}
          </div>
        </section>
        <section className={card} aria-labelledby="teaching-tools-title">
          <h2 id="teaching-tools-title" className="text-[20px] font-bold text-[#151b39]">Teaching tools</h2>
          <div className="mt-3 divide-y divide-[#ecedf3]">
            {tools.map((tool) => (
              <Link key={tool.label} href={tool.href} className="group flex items-center gap-3 py-3.5">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tool.tone}`}><tool.icon size={19} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[#202640]">{tool.label}</span><span className="block text-[11px] text-[#7b839a]">{tool.hint}</span></span>
                <ArrowRight size={16} className="shrink-0 text-[#a1a9bd] group-hover:text-[#e56521]" />
              </Link>
            ))}
          </div>
        </section>
      </div>
      <TrainerActivities courses={coursePerf} batchIdByCourse={todayBatchIdByCourse} />
    </div>
  );
}
