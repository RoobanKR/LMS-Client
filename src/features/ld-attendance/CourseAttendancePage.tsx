"use client";

import { ArrowLeft, BarChart3, Building2, CalendarCheck, CalendarDays, Layers, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/app/lms/shared/ui/Tabs";
import { StatusPill } from "@/app/lms/shared/ui";
import CourseAttendanceRegister from "./CourseAttendanceRegister";
import CourseAttendanceReport from "./CourseAttendanceReport";
import { COURSE_STATUS, periodLabel, type CourseRow } from "./lib";
import type { CourseTab } from "./AttendanceCourseList";

/* One course's attendance — the "View" destination from the list. A single
 * header line (back · course · status on the left, client / period /
 * batches / students on the right) so the table gets the height, then two
 * tabs in Course Setup's style: Attendance (the day's register, default)
 * and Report (generate → preview → print). */

// The underline tab look Course Setup's Courses | Report strip uses.
const TAB_TRIGGER =
    "relative mr-0 inline-flex h-10 flex-none items-center gap-2 whitespace-nowrap rounded-none rounded-t-lg border-0 bg-transparent px-3.5 text-sm font-bold tracking-tight text-subtle shadow-none hover:bg-row-hover hover:text-heading after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-brand-strong data-[state=active]:shadow-none data-[state=active]:after:bg-brand-500 [&[data-state=active]_svg]:text-brand-500";

export default function CourseAttendancePage({ course, tab, onTab, onBack }: {
    course: CourseRow;
    tab: CourseTab;
    onTab: (tab: CourseTab) => void;
    onBack: () => void;
}) {
    const status = COURSE_STATUS[course.status];
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* ── Course header — one line ── */}
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <div className="flex min-w-0 items-center gap-2.5">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Back to all courses"
                        title="Back to all courses"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-hairline text-subtle transition-colors hover:bg-row-hover hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    >
                        <ArrowLeft size={15} strokeWidth={2.2} />
                    </button>
                    <h1 className="min-w-0 truncate text-xl font-bold text-heading" title={course.name}>{course.name}</h1>
                    {course.code && (
                        <span className="inline-flex shrink-0 items-center rounded-chip bg-ink-50 px-2 py-0.5 font-mono text-[11px] font-medium text-heading">{course.code}</span>
                    )}
                    <StatusPill tone={status.tone} dot className="shrink-0">{status.label}</StatusPill>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
                    {course.client && (
                        <span className="inline-flex items-center gap-1.5"><Building2 size={13} className="text-faint" aria-hidden />{course.client}</span>
                    )}
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} className="text-faint" aria-hidden />{periodLabel(course.start, course.end)}</span>
                    {course.hasRealBatches && (
                        <span className="inline-flex items-center gap-1.5"><Layers size={13} className="text-faint" aria-hidden />{course.totalBatches} {course.totalBatches === 1 ? "batch" : "batches"}</span>
                    )}
                    <span className="inline-flex items-center gap-1.5"><Users size={13} className="text-faint" aria-hidden />{course.students} {course.students === 1 ? "student" : "students"}</span>
                </div>
            </header>

            {/* ── Tabs ── */}
            <Tabs value={tab} onValueChange={(v) => onTab(v as CourseTab)} activationMode="manual" className="mt-2 flex min-h-0 flex-1 flex-col">
                <div className="no-print shrink-0 border-b border-hairline">
                    <TabsList aria-label="Course attendance sections" className="h-auto gap-1 rounded-none border-b-0 bg-transparent p-0">
                        <TabsTrigger value="attendance" className={TAB_TRIGGER}>
                            <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Attendance
                        </TabsTrigger>
                        <TabsTrigger value="report" className={TAB_TRIGGER}>
                            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Report
                        </TabsTrigger>
                    </TabsList>
                </div>
                {/* One host for both tabs (no TabsContent), so switching back
                    and forth keeps nothing mounted that isn't on screen. */}
                <div className="mt-3 flex min-h-0 flex-1 flex-col">
                    {tab === "report"
                        ? <CourseAttendanceReport key={`report-${course.id}`} course={course} />
                        : <CourseAttendanceRegister key={`register-${course.id}`} course={course} />}
                </div>
            </Tabs>
        </div>
    );
}
