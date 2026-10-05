"use client";

import { useMemo } from "react";
import { useCourseRosterQuery, rosterEnrollments, isStudentUser } from "@/queries/courseRoster";
import type { Feedback } from "@/app/lms/pages/coursestructure/feedback/types/feedback";
import { buildWorkbook, useBatchNameMap } from "@/app/lms/pages/coursestructure/feedback/report/workbookShared";
import { buildReportStats, ReportAnalysisBody } from "@/app/lms/pages/coursestructure/feedback/report/reportAnalysis";

/* A form's Feedback tab — the Report Analysis the course's own Feedback
 * screen shows (stat cards, Feedback Overview chart, rating distribution,
 * comments, suggestions, Master Data / Feedback sheets), computed the same
 * way from the same document. Only the frame around it is the console's. */
export default function FeedbackAnalysisTab({ feedback, courseId }: { feedback: Feedback; courseId: string }) {
    // Students enrolled in the course — the first stat card. null while the
    // roster loads, so the card shows a dash rather than a wrong zero.
    const { data: roster, isLoading: rosterLoading } = useCourseRosterQuery(courseId || "");
    const enrolledStudents: number | null = useMemo(() => {
        if (rosterLoading) return null;
        return rosterEnrollments(roster).map((e) => e?.user || e).filter(isStudentUser).length;
    }, [roster, rosterLoading]);

    const stats = useMemo(() => buildReportStats(feedback), [feedback]);
    const batchNameByStudent = useBatchNameMap(courseId, feedback);
    const wb = useMemo(() => buildWorkbook(feedback, batchNameByStudent), [feedback, batchNameByStudent]);

    return (
        <div className="min-h-0 flex-1 overflow-y-auto pb-2 pr-1">
            <ReportAnalysisBody feedback={feedback} stats={stats} enrolledStudents={enrolledStudents} wb={wb} />
        </div>
    );
}
