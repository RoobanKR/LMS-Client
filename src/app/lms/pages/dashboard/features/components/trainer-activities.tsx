"use client";

import { useQueries } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { getToken } from "@/lib/session";
import { useUserId } from "@/features/ld-dashboard/hooks/use-ld-dashboard";
import type { StudentProgress } from "@/app/lms/pages/courses/liveDashboard/types/liveDashboard.types";
import type { CoursePerfRow } from "../hooks/use-trainer-dashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://lmsserver-yeve.onrender.com";

type TodayActivity = {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  nodeId: string;
  nodeType: "module" | "submodule" | "topic" | "subtopic";
  tabType: "We_Do" | "You_Do";
  subcategory: string;
  kind: "Assignment" | "Assessment" | "Practice";
  start: number | null;
  end: number | null;
};

type ActivityProgress = {
  totalStudents: number;
  students: StudentProgress[];
};

type Exercise = {
  _id?: unknown;
  exerciseInformation?: { exerciseId?: unknown; exerciseName?: string };
  approvalWorkflow?: { steps?: unknown[]; studentVisible?: boolean };
  availabilityPeriod?: { startDate?: string | number | Date; endDate?: string | number | Date };
  subcategory?: string;
};
type CourseNode = {
  _id?: unknown;
  pedagogy?: Partial<Record<"We_Do" | "You_Do", Record<string, Exercise[]>>>;
  topics?: CourseNode[];
  subTopics?: CourseNode[];
  subModules?: CourseNode[];
};
type CourseTree = { modules?: CourseNode[] };

const idOf = (value: unknown): string => {
  if (value && typeof value === "object" && "_id" in value) return String(value._id || "");
  return value == null ? "" : String(value);
};
const timeOf = (value: string | number | Date | undefined): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

function activitiesForToday(course: CourseTree | undefined, courseId: string, courseName: string, dayStart: number, dayEnd: number): TodayActivity[] {
  const found: TodayActivity[] = [];
  const seen = new Set<string>();
  const visit = (node: CourseNode | undefined, nodeType: TodayActivity["nodeType"]) => {
    if (!node) return;
    for (const tabType of ["We_Do", "You_Do"] as const) {
      for (const [subcategory, items] of Object.entries(node?.pedagogy?.[tabType] || {})) {
        if (!Array.isArray(items)) continue;
        for (const exercise of items) {
          const id = idOf(exercise?._id || exercise?.exerciseInformation?.exerciseId);
          if (!id || seen.has(id)) continue;
          const workflow = exercise?.approvalWorkflow;
          if (Array.isArray(workflow?.steps) && workflow.steps.length && workflow.studentVisible !== true) continue;
          const start = timeOf(exercise?.availabilityPeriod?.startDate);
          const end = timeOf(exercise?.availabilityPeriod?.endDate);
          // An undated activity cannot be called a task for today.
          if (start === null && end === null) continue;
          if ((start !== null && start >= dayEnd) || (end !== null && end < dayStart)) continue;
          seen.add(id);
          found.push({
            id,
            name: String(exercise?.exerciseInformation?.exerciseName || exercise?.subcategory || "Learning activity"),
            courseId,
            courseName,
            nodeId: idOf(node._id),
            nodeType,
            tabType,
            subcategory,
            kind: tabType === "We_Do" ? "Assignment" : /practice/i.test(subcategory) ? "Practice" : "Assessment",
            start,
            end,
          });
        }
      }
    }
  };
  for (const courseModule of course?.modules || []) {
    visit(courseModule, "module");
    for (const topic of courseModule.topics || []) {
      visit(topic, "topic");
      for (const subtopic of topic?.subTopics || []) visit(subtopic, "subtopic");
    }
    for (const submodule of courseModule.subModules || []) {
      visit(submodule, "submodule");
      for (const topic of submodule?.topics || []) {
        visit(topic, "topic");
        for (const subtopic of topic?.subTopics || []) visit(subtopic, "subtopic");
      }
    }
  }
  return found;
}

function progressCounts(progress: ActivityProgress) {
  let submitted = 0;
  let started = 0;
  let stopped = 0;
  for (const student of progress.students || []) {
    if (student.attemptStatus === "submitted" || student.submitted || student.parentSubmitted) submitted++;
    else if (student.attemptStatus === "terminated") stopped++;
    else if (student.inProgress || student.completed > 0 || student.attemptStatus === "active") started++;
  }
  return {
    submitted,
    started,
    stopped,
    notStarted: Math.max(0, progress.totalStudents - submitted - started - stopped),
  };
}

const activityHref = (activity: TodayActivity) => {
  const params = new URLSearchParams({
    assessmentId: activity.id,
    courseId: activity.courseId,
    nodeId: activity.nodeId,
    nodeType: activity.nodeType,
    tabType: activity.tabType,
    subcategory: activity.subcategory,
    assessmentName: activity.name,
    returnTo: "dashboard",
  });
  return `/lms/pages/courses/liveDashboard?${params.toString()}`;
};

export function TrainerActivities({ courses, batchIdByCourse }: { courses: CoursePerfRow[]; batchIdByCourse: Record<string, string> }) {
  const userId = useUserId();
  const courseQueries = useQueries({
    queries: courses.map((course) => {
      const batchId = batchIdByCourse[course.id] || "";
      return {
        queryKey: ["course", course.id, batchId],
        staleTime: 5 * 60_000,
        queryFn: async () => {
          const token = getToken();
          const response = await axios.get(`${API_URL}/getAll/courses-data/${course.id}`, {
            params: batchId ? { batchId } : undefined,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          return response.data;
        },
      };
    }),
  });
  const dayStartDate = new Date();
  dayStartDate.setHours(0, 0, 0, 0);
  const dayStart = dayStartDate.getTime();
  const dayEnd = new Date(dayStartDate).setDate(dayStartDate.getDate() + 1);
  const activities = courseQueries.flatMap((query, index) =>
    activitiesForToday((query.data as { data?: CourseTree } | undefined)?.data, courses[index].id, courses[index].name, dayStart, dayEnd),
  ).sort((a, b) => (a.end ?? a.start ?? Infinity) - (b.end ?? b.start ?? Infinity));
  const visible = activities.slice(0, 6);
  const activityQueries = useQueries({
    queries: visible.map((activity) => ({
      queryKey: ["analytics", "trainer-activity", userId, activity.courseId, activity.id],
      enabled: !!userId,
      staleTime: 30_000,
      refetchInterval: 60_000,
      queryFn: async (): Promise<ActivityProgress> => {
        const token = getToken();
        const params = new URLSearchParams({
          assessmentId: activity.id,
          courseId: activity.courseId,
          nodeId: activity.nodeId,
          nodeType: activity.nodeType,
          category: activity.tabType,
        });
        const response = await axios.get(`${API_URL}/api/assessment/live-dashboard?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        return response.data;
      },
    })),
  });
  const loading = courseQueries.some((query) => query.isPending);
  const failed = courseQueries.some((query) => query.isError);

  return (
    <section className="min-w-0 rounded-[14px] border border-hairline bg-surface px-4 py-3 shadow-[0_1px_2px_rgb(20_24_60/.04),0_6px_18px_rgb(20_24_60/.05)]" aria-labelledby="trainer-activities-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="trainer-activities-title" className="flex items-center gap-2 text-sm font-semibold text-[#141933]">
          <span className="grid size-[26px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#34cf80] to-[#1fb866] text-white"><ClipboardList size={15} /></span>
          Today&apos;s assignments &amp; assessments
        </h2>
        <Link href="/lms/pages/courses" className="inline-flex h-[26px] items-center gap-1.5 rounded-lg bg-[#edf2ff] px-2.5 text-[11px] font-semibold text-[#3a6cf4] hover:bg-[#e2eaff]">All courses <ArrowRight size={13} /></Link>
      </div>
      {loading && !visible.length ? <p className="mt-5 text-sm text-[#66708b]">Loading today&apos;s activities…</p> : null}
      {!loading && !visible.length ? (
        <div className="mt-5 flex items-center gap-3 rounded-[14px] bg-[#f8f9fc] px-4 py-5 text-sm text-[#5e6781]">
          <ClipboardList size={21} className="shrink-0 text-[#7d86a4]" />
          {failed ? "Some course activities could not be loaded. Open a course to review them." : "No assignment or assessment is scheduled for today."}
        </div>
      ) : null}
      {visible.length > 0 && (
        <div className="mt-4 grid gap-2.5">
          {visible.map((activity, index) => {
            const query = activityQueries[index];
            const counts = query.data ? progressCounts(query.data) : null;
            const startsLater = activity.start !== null && activity.start > Date.now();
            const closed = activity.end !== null && activity.end < Date.now();
            const status = startsLater
              ? `Starts ${new Date(activity.start!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : closed ? "Closed today" : "Open now";
            return (
              <Link key={`${activity.courseId}-${activity.id}`} href={activityHref(activity)} className="group flex flex-wrap items-center gap-3 rounded-[14px] border border-[#e8eaf1] bg-[#fcfcfe] px-4 py-3 transition-colors hover:border-[#f4b28d] hover:bg-[#fffaf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f57a35]/40">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${activity.kind === "Assignment" ? "bg-[#fff1e8] text-[#c85413]" : "bg-[#f0edff] text-[#6754c5]"}`}>{activity.kind}</span>
                <span className="min-w-[170px] flex-1">
                  <span className="block truncate text-[14px] font-semibold text-[#19213e]">{activity.name}</span>
                  <span className="block truncate text-[12px] text-[#69728d]">{activity.courseName}</span>
                </span>
                <span className="rounded-full bg-[#f4f2ff] px-2 py-1 text-[11px] font-semibold text-[#6654bf]">{status}</span>
                <span className="text-[12px] font-medium text-[#59637e]">
                  {counts ? `${counts.submitted} submitted · ${counts.started} started · ${counts.notStarted} not started${counts.stopped ? ` · ${counts.stopped} stopped` : ""}` : query.isError ? "Progress unavailable" : "Loading learner progress…"}
                </span>
                <ArrowRight size={17} className="shrink-0 text-[#a1a7ba] transition-transform group-hover:translate-x-0.5 group-hover:text-[#e56521]" />
              </Link>
            );
          })}
          {activities.length > visible.length && <p className="text-right text-[12px] text-[#6b748f]">Showing {visible.length} of {activities.length} activities scheduled for today.</p>}
        </div>
      )}
    </section>
  );
}
