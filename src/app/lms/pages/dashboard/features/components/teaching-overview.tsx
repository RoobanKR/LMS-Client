"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarCheck, CheckCircle2, ClipboardList, GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { count, pct } from "@/features/ld-dashboard/lib/format";
import { Chip, Meter, SectionCard } from "@/features/ld-dashboard/components/ui-kit";
import { EmptyState } from "@/features/ld-dashboard/components/states";
import type { StudentRow } from "@/features/ld-dashboard/types";
import type { WorkSummary, WorkCategory } from "@/features/ld-dashboard/lib/work-summary";
import type { UseTrainerDashboard } from "../hooks/use-trainer-dashboard";
import { TrainerQuickActions } from "./trainer-panels";

const actionClass = "inline-flex items-center gap-1.5 rounded-control border border-brand-500/30 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-400 dark:hover:bg-brand-500/10";
const courseHref = (id: string) => `/lms/pages/courses/uploadcourseresources?${new URLSearchParams({ courseId: id })}`;

function WorkCard({ stage, summary, categories }: { stage: string; summary: WorkSummary; categories: WorkCategory[] }) {
  return (
    <div className="rounded-control border border-hairline p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-heading">{stage} activities</h3>
        <Chip tone="brand">{stage}</Chip>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-heading">{pct(summary.score)}</p>
      <p className="mt-1 text-xs text-subtle">Score across configured activities</p>
      <div className="mt-4 border-t border-hairline pt-3">
        <p className="text-sm font-medium text-body">{count(summary.attempted)} / {count(summary.total)} attempted</p>
        <Meter className="mt-2" value={summary.total ? summary.attempted / summary.total * 100 : null} tone="brand" label={`${stage} activities attempted`} />
        {!summary.total && <p className="mt-2 text-xs text-subtle">No tracked activities in this view.</p>}
        {!!summary.total && !summary.attempted && <p className="mt-2 text-xs text-subtle">No attempts recorded yet.</p>}
      </div>
      {categories.length > 0 && <ul className="mt-4 space-y-3 border-t border-hairline pt-3" aria-label={`${stage} configured activity categories`}>
        {categories.map((category) => <li key={category.name} className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="break-words text-sm font-medium text-heading">{category.name.replace(/_/g, " ")}</p><p className="mt-1 text-xs text-subtle">{count(category.attempted)} / {count(category.total)} attempted</p></div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-body" aria-label={`${category.name} score`}>{pct(category.score)}</span>
        </li>)}
      </ul>}
    </div>
  );
}

type FollowUp = "low" | "new" | "inactive";
function StudentFollowUp({ learners }: { learners: StudentRow[] }) {
  const [filter, setFilter] = useState<FollowUp>("low");
  const [limit, setLimit] = useState(8);
  const now = Date.now();
  const groups: Record<FollowUp, StudentRow[]> = {
    low: learners.filter((student) => student.overall > 0 && student.overall < 50).sort((a, b) => a.overall - b.overall),
    new: learners.filter((student) => student.overall === 0),
    inactive: learners.filter((student) => student.overall > 0 && student.overall < 80 && student.last && now - new Date(student.last).getTime() > 7 * 86400000),
  };
  const filters: { id: FollowUp; label: string; explanation: string }[] = [
    { id: "low", label: "Progress below 50%", explanation: "Students who have started and attempted less than half their learning work. This is a follow-up list, not a pass/fail result or a deadline warning." },
    { id: "new", label: "Not started", explanation: "Course enrolments with no learning attempts recorded yet." },
    { id: "inactive", label: "Inactive 7+ days", explanation: "Students below 80% progress whose last recorded course access was more than seven days ago." },
  ];
  const selected = filters.find((item) => item.id === filter)!;
  const rows = groups[filter];
  return (
    <SectionCard title="Students to follow up" meta={`${count(rows.length)} enrolments`}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose students to follow up">
        {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setLimit(8); }} className={cn("rounded-control border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500", filter === item.id ? "border-brand-500/30 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400" : "border-hairline text-subtle hover:bg-row-hover")}>
          {item.label} <span className="ml-1 tabular-nums">{count(groups[item.id].length)}</span>
        </button>)}
      </div>
      <p className="mt-3 max-w-4xl text-xs leading-relaxed text-subtle">{selected.explanation}</p>
      {!rows.length ? <EmptyState title="No students in this group" hint="Choose another group to review its students." /> : <>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{selected.label}: students and course progress</caption>
            <thead className="border-b border-hairline bg-canvas text-xs text-subtle">
              <tr>
                <th scope="col" className="px-3 py-3">Student</th>
                <th scope="col" className="px-3 py-3">Course</th>
                <th scope="col" className="px-3 py-3">Learning progress</th>
                <th scope="col" className="px-3 py-3">Last course access</th>
                <th scope="col" className="px-3 py-3">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>{rows.slice(0, limit).map((student, index) => <tr key={`${student.courseId}-${student.id || student.name}-${index}`} className="border-b border-hairline last:border-0 hover:bg-row-hover">
              <th scope="row" className="px-3 py-3 font-medium text-heading">{student.name}</th>
              <td className="px-3 py-3 text-body">{student.course}</td>
              <td className="min-w-[150px] px-3 py-3">
                <div className="flex items-center gap-3">
                  <Meter className="w-20" value={student.overall} tone="brand" label={`${student.name} learning progress`} />
                  <span className="tabular-nums text-body">{pct(student.overall)}</span>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs text-subtle">{student.last && Number.isFinite(new Date(student.last).getTime()) ? new Date(student.last).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Not recorded"}</td>
              <td className="px-3 py-3">
                <Link className={actionClass} href={courseHref(student.courseId)}>Open course <ArrowRight size={13} aria-hidden />
                </Link>
              </td>
            </tr>)}</tbody>
          </table>
        </div>
        {rows.length > limit && <button type="button" className={`${actionClass} mt-4`} onClick={() => setLimit((value) => value + 8)}>Show more students</button>}
      </>}
    </SectionCard>
  );
}

export function TeachingOverview({ data }: { data: UseTrainerDashboard }) {
  const { model, learners, weDoWork, youDoWork, iDoCategories, weDoCategories, youDoCategories, batchesToday, coursePerf, permissionKeys } = data;
  if (!model) return null;
  const pending = batchesToday.filter((batch) => !batch.marked).length;
  const finished = learners.filter((student) => student.overall >= 100).length;
  const attendanceHref = permissionKeys.has("attendancemanagement") ? "/lms/pages/attendancemanagement" : "#todays-batches";
  const scopeCards = [
    { icon: BookOpen, value: count(model.courses), label: "My courses", detail: "On your teaching roster", href: "#course-performance" },
    { icon: GraduationCap, value: count(model.students), label: "Student enrolments", detail: "Across the selected courses", href: "#at-risk" },
    { icon: CheckCircle2, value: count(finished), label: "Fully attempted", detail: "100% of tracked learning work", href: "#learning-progress" },
    { icon: Users, value: count(model.notStarted), label: "Not started", detail: "No learning attempts recorded", href: "#at-risk" },
  ];
  return <>
    <SectionCard title="Start here today">
      <div className="grid gap-5 @3xl:grid-cols-3">
        <div className="flex gap-3">
          <CalendarCheck size={22} className="mt-1 shrink-0 text-brand-500" aria-hidden />
          <div>
            <h3 className="font-semibold text-heading">{pending ? `${pluralBatches(pending)} need attendance` : "Today’s attendance"}</h3>
            <p className="mt-1 text-xs text-subtle">{batchesToday.length ? `${batchesToday.length - pending} of ${batchesToday.length} batches marked` : "No batches scheduled today"}</p>
            <a className={`${actionClass} mt-3`} href={attendanceHref}>{permissionKeys.has("attendancemanagement") ? "Open attendance" : "View batches"}<ArrowRight size={13} aria-hidden />
            </a>
          </div>
        </div>
        <div className="flex gap-3">
          <ClipboardList size={22} className="mt-1 shrink-0 text-brand-500" aria-hidden />
          <div>
            <h3 className="font-semibold text-heading">Learning activities</h3>
            <p className="mt-1 text-xs text-subtle">Review work across your configured activities</p>{permissionKeys.has("grades") ? <Link className={`${actionClass} mt-3`} href="/lms/pages/grades">Review student work<ArrowRight size={13} aria-hidden />
            </Link> : <a className={`${actionClass} mt-3`} href="#work-results">View learning results<ArrowRight size={13} aria-hidden />
            </a>}</div>
        </div>
        <div className="flex gap-3">
          <Users size={22} className="mt-1 shrink-0 text-brand-500" aria-hidden />
          <div>
            <h3 className="font-semibold text-heading">Students to follow up</h3>
            <p className="mt-1 text-xs text-subtle">{count(model.atRiskCount)} started with progress below 50%</p>
            <a className={`${actionClass} mt-3`} href="#at-risk">Review students<ArrowRight size={13} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </SectionCard>

    <section aria-label="My teaching scope" className="grid grid-cols-2 gap-3 sm:gap-4 @3xl:grid-cols-4">
      {scopeCards.map((card) => <a key={card.label} href={card.href} className="flex min-w-0 items-center gap-3.5 rounded-tile border border-hairline bg-surface p-4 shadow-sm outline-none hover:border-brand-500/40 focus-visible:ring-2 focus-visible:ring-brand-500/40 sm:p-5">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-chip bg-brand-100 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
          <card.icon size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-3xl font-semibold leading-none tabular-nums text-heading">{card.value}</p>
          <p className="mt-1.5 text-sm font-medium text-body">{card.label}</p>
          <p className="mt-0.5 text-2xs text-subtle">{card.detail}</p>
        </div>
      </a>)}
    </section>

    <div className="grid gap-4 @5xl:grid-cols-3">
      <div id="todays-batches" className="scroll-mt-4 @5xl:col-span-2">
        <SectionCard title="Today's batches" meta={`${count(pending)} attendance pending`}>
          {!batchesToday.length ? <EmptyState title="No batches scheduled today" hint="Scheduled teaching batches appear here with their attendance status." /> : <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Today’s teaching batches and attendance status</caption>
              <thead className="border-b border-hairline bg-canvas text-xs text-subtle">
                <tr>
                  <th scope="col" className="px-3 py-3">Batch / course</th>
                  <th scope="col" className="px-3 py-3">Students</th>
                  <th scope="col" className="px-3 py-3">Attendance</th>{permissionKeys.has("attendancemanagement") && <th scope="col" className="px-3 py-3">
                    <span className="sr-only">Action</span>
                  </th>}</tr>
              </thead>
              <tbody>{batchesToday.map((batch) => <tr key={batch.key} className="border-b border-hairline last:border-0">
                <th scope="row" className="px-3 py-3">
                  <span className="block font-medium text-heading">{batch.batchName}</span>
                  <span className="mt-1 block text-xs font-normal text-subtle">{batch.courseName}</span>
                </th>
                <td className="px-3 py-3 tabular-nums text-body">{count(batch.students)}</td>
                <td className="px-3 py-3">
                  <Chip tone={batch.marked ? "success" : "warning"}>{batch.marked ? "Marked" : "Pending"}</Chip>
                </td>{permissionKeys.has("attendancemanagement") && <td className="px-3 py-3">
                  <Link className={actionClass} href={attendanceHref}>{batch.marked ? "View register" : "Mark attendance"}</Link>
                </td>}</tr>)}</tbody>
            </table>
          </div>}
        </SectionCard>
      </div>
      <TrainerQuickActions model={model} permissionKeys={permissionKeys} />
    </div>

    <div className="grid gap-4 @5xl:grid-cols-2">
      <div id="learning-progress" className="scroll-mt-4">
        <SectionCard title="Learning progress" meta="Attempts, not marks">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold tabular-nums text-heading">{model.activeCourses ? pct(model.completion) : "—"}</span>
            <h3 className="text-sm font-medium text-body">Average course progress</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-subtle">Average of each course’s student progress, excluding courses without enrolled students. Progress measures attempted learning work, not passing grades.</p>
          <Meter className="mt-4" value={model.activeCourses ? model.completion : null} tone="brand" label="Average course progress" />
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
            <div>
              <dt className="text-xs text-subtle">Fully attempted</dt>
              <dd className="mt-1 text-xl font-semibold text-heading">{count(finished)}</dd>
              <p className="text-2xs text-subtle">100% progress</p>
            </div>
            <div>
              <dt className="text-xs text-subtle">Started</dt>
              <dd className="mt-1 text-xl font-semibold text-heading">{count(learners.filter((student) => student.overall > 0 && student.overall < 100).length)}</dd>
              <p className="text-2xs text-subtle">Below 100% progress</p>
            </div>
            <div>
              <dt className="text-xs text-subtle">Not started</dt>
              <dd className="mt-1 text-xl font-semibold text-heading">{count(model.notStarted)}</dd>
              <p className="text-2xs text-subtle">0% progress</p>
            </div>
          </dl>
          <div className="mt-5 rounded-control bg-canvas p-3">
            <p className="text-sm font-medium text-body">I Do · Learning activities</p>
            <p className="mt-1 text-xs text-subtle">{pct(model.stages.find((stage) => stage.key === "iDo")?.value ?? null)} average progress for document MCQ checks. We Do and You Do activity attempts are shown separately.</p>
            {iDoCategories.length > 0 && <p className="mt-2 text-xs text-subtle">{iDoCategories.map((name) => name.replace(/_/g, " ")).join(" · ")}</p>}
          </div>
          <p className="mt-4 text-xs text-subtle">{count(model.active7)} enrolments active in the last 7 days, based on last recorded course access.</p>
        </SectionCard>
      </div>
      <div id="work-results" className="scroll-mt-4">
        <SectionCard title="Learning activities" meta="Separate results">
          <p className="mb-4 text-xs leading-relaxed text-subtle">Activity categories follow your course configuration. Each stage shows its own attempts and scores, separately from learning progress.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <WorkCard stage="We Do" summary={weDoWork} categories={weDoCategories} />
            <WorkCard stage="You Do" summary={youDoWork} categories={youDoCategories} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-subtle">Scores cover all assigned work. Unattempted work counts as zero, and scores can change after grading. “—” means no attempts or no assigned work in this view.</p>
        </SectionCard>
      </div>
    </div>

    <div id="at-risk" className="scroll-mt-4">
      <StudentFollowUp learners={learners} />
    </div>
    <div id="course-performance" className="scroll-mt-4">
      <SectionCard title="My courses at a glance" meta={`${count(coursePerf.length)} courses`}>
        {!coursePerf.length ? <EmptyState title="No courses assigned yet" hint="Courses appear here when you are assigned to their teaching batches." /> : <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Your courses with separate We Do and You Do activity scores</caption>
            <thead className="border-b border-hairline bg-canvas text-xs text-subtle">
              <tr>{["Course", "Enrolments", "Learning progress", "We Do score", "You Do score", "Below 50% progress", "Action"].map((heading) => <th key={heading} scope="col" className="px-3 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody>{coursePerf.map((row) => <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-row-hover">
              <th scope="row" className="px-3 py-3 font-medium text-heading">{row.name}</th>
              <td className="px-3 py-3 tabular-nums text-body">{count(row.students)}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <Meter className="w-20" value={row.avg} tone="brand" label={`${row.name} learning progress`} />
                  <span className="text-body">{pct(row.avg)}</span>
                </div>
              </td>
              <td className="px-3 py-3 tabular-nums text-body">{pct(row.weDoWork.score)}</td>
              <td className="px-3 py-3 tabular-nums text-body">{pct(row.youDoWork.score)}</td>
              <td className="px-3 py-3 tabular-nums text-body">{count(row.risk)}</td>
              <td className="px-3 py-3">
                <Link className={actionClass} href={courseHref(row.id)}>Open course<ArrowRight size={13} aria-hidden />
                </Link>
              </td>
            </tr>)}</tbody>
          </table>
        </div>}
      </SectionCard>
    </div>
    <p className="pb-2 text-xs leading-relaxed text-subtle">All figures follow the course filter. A student enrolled in two courses is counted once in each course. This view only includes courses on your teaching roster.</p>
  </>;
}

function pluralBatches(value: number) { return `${value} ${value === 1 ? "batch" : "batches"}`; }
