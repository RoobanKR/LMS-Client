'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Student Dashboard
//
// Composition only — every number rendered here is derived in ./_lib/metrics
// from what the platform actually stores (pedagogy content, the student's own
// answer documents, and their attendance rows). Widgets fall back to explicit
// empty states rather than placeholder numbers when a source has no data.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';

import { StudentLayout } from '../../component/student/student-layout';
import { useCurrentUserQuery } from '@/queries/auth';
import {
    useStudentAnalyticsQuery,
    useMyAttendanceQuery,
    useMyLearningTimeQuery,
    attendanceWindow,
    getUserSpecificAnalytics,
} from '@/queries/studentDashboard';

import { buildDashboard, idStr } from './_lib/metrics';
import { StudentHome } from './_components/home';

/* ── loading skeleton (mirrors the home layout) ──────────────────────────── */

const Bone = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse rounded-2xl bg-ink-100 ${className}`} />
);

const DashboardSkeleton = () => (
    <div className="@container">
        <div className="grid gap-3 @min-[1000px]:grid-cols-[minmax(0,2.36fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
                <Bone className="h-[200px]" />
                <div className="grid grid-cols-2 gap-2 @min-[560px]:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-[88px] rounded-[14px]" />)}
                </div>
                <Bone className="h-[270px]" />
                <Bone className="h-[140px]" />
            </div>
            <div className="flex flex-col gap-3">
                <Bone className="h-[180px]" />
                <Bone className="h-[170px]" />
                <Bone className="h-[340px]" />
            </div>
        </div>
    </div>
);

/* ── page ────────────────────────────────────────────────────────────────── */

export default function StudentDashboardPage() {
    const router = useRouter();

    // Grades is no longer gated by a per-function toggle. Student Dashboard is
    // a flat permission now (see permissions.tree.ts) — the View Grades /
    // View Courses / Submit Assignments checkboxes are gone, so there is no
    // grant left to read. Holding the dashboard permission at all is what
    // shows the header's Grades affordance.

    // Three cached reads (queries/studentDashboard.ts) in place of one
    // useEffect with four useStates. The secondary two stay non-blocking, as
    // before: the dashboard renders as soon as the user + analytics resolve,
    // and attendance / study time fill in after.
    const { data: user, isLoading: userLoading, error: userError } = useCurrentUserQuery();
    const studentId = idStr((user as any)?.user?._id);

    const {
        data: analytics,
        isLoading: analyticsLoading,
        error: analyticsError,
    } = useStudentAnalyticsQuery(studentId || null);

    const userCourses = useMemo(
        () => (analytics && studentId ? getUserSpecificAnalytics(analytics, studentId)?.userCourses || [] : []),
        [analytics, studentId],
    );

    // The window is stable for the life of the page; recomputing it per render
    // would mint a new query key every time.
    const window180 = useMemo(() => attendanceWindow(), []);
    const courseIds = useMemo(() => userCourses.map((c: any) => idStr(c?._id)), [userCourses]);
    const { records: attendance } = useMyAttendanceQuery(courseIds, studentId || null, window180);
    const { data: learningTime = null } = useMyLearningTimeQuery(studentId || null);

    const loading = userLoading || (!!studentId && analyticsLoading);
    const error = userError || analyticsError
        ? ((userError || analyticsError) as Error)?.message || 'Could not load your dashboard right now.'
        : null;

    const model = useMemo(
        () => (user ? buildDashboard(user, userCourses, attendance, learningTime) : null),
        [user, userCourses, attendance, learningTime],
    );

    const goCourse = useCallback((id: string) => router.push(`/lms/pages/courses/coursesdetailedview/${id}`), [router]);
    const goCourses = useCallback(() => router.push('/lms/pages/courses'), [router]);
    // The learner's OWN calendar, not the admin holiday editor at
    // /lms/pages/calendar — that one needs the `calendar` module and answered
    // every student with Access Restricted.
    const goCalendar = useCallback(() => router.push('/lms/pages/studentcalendar'), [router]);
    const goGrades = useCallback(() => router.push('/lms/pages/grades'), [router]);

    if (loading) {
        return <StudentLayout><DashboardSkeleton /></StudentLayout>;
    }

    if (error || !model) {
        return (
            <StudentLayout>
                <div className="mx-auto flex max-w-[520px] flex-col items-center justify-center gap-3 py-24 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
                        <GraduationCap size={22} strokeWidth={2.2} />
                    </div>
                    <h2 className="text-lg font-semibold text-heading">We couldn&apos;t load your dashboard</h2>
                    <p className="text-sm text-subtle">{error || 'Please try again in a moment.'}</p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-1 h-10 rounded-control bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                    >
                        Retry
                    </button>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <StudentHome m={model} onCourse={goCourse} onCourses={goCourses} onCalendar={goCalendar} onGrades={goGrades} />
        </StudentLayout>
    );
}
