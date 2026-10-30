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

import { useQuery } from '@tanstack/react-query';
import { notificationsService, notificationKeys } from '@/app/lms/pages/notifications/api/notifications';
import { buildDashboard, idStr } from './_lib/metrics';
import { StudentHome } from './_components/home';

/* ── loading skeleton ────────────────────────────────────────────────────── */

const Shimmer = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse rounded-[20px] border border-[#E5E7EB] bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}>
        <div className="h-full w-full rounded-[20px] bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
    </div>
);

const DashboardSkeleton = () => (
    <div className="mx-auto max-w-[1440px] space-y-5">
        <Shimmer className="h-[76px]" />
        <Shimmer className="h-[206px] rounded-[17px]" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-[112px]" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.56fr_0.9fr]">
            <Shimmer className="h-[260px]" />
            <Shimmer className="h-[260px]" />
        </div>
        <Shimmer className="h-[240px]" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.24fr_0.76fr]">
            <Shimmer className="h-[220px]" />
            <Shimmer className="h-[220px]" />
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

    // Unread notifications for the topbar bell — the SAME cached read the rail
    // already makes, so this adds no extra network cost.
    const { data: notif } = useQuery({
        queryKey: notificationKeys.all,
        queryFn: () => notificationsService.fetchNotifications(),
        staleTime: 30 * 1000,
        refetchOnWindowFocus: true,
    });
    const unreadCount = notif?.unreadCount || 0;

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
    const goNotifications = useCallback(() => router.push('/lms/pages/notifications'), [router]);
    const goProfile = useCallback(() => router.push('/lms/pages/profile'), [router]);

    if (loading) {
        return <StudentLayout><DashboardSkeleton /></StudentLayout>;
    }

    if (error || !model) {
        return (
            <StudentLayout>
                <div className="mx-auto flex max-w-[520px] flex-col items-center justify-center gap-3 py-24 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                        <GraduationCap size={22} strokeWidth={2.2} />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">We couldn&apos;t load your dashboard</h2>
                    <p className="text-sm text-slate-500">{error || 'Please try again in a moment.'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-1 h-10 rounded-[14px] px-4 text-sm font-semibold text-white"
                        style={{ backgroundColor: '#C2540F' }}
                    >
                        Retry
                    </button>
                </div>
            </StudentLayout>
        );
    }

    return (
        <StudentLayout>
            <StudentHome
                m={model}
                onCourse={goCourse}
                onCourses={goCourses}
                onCalendar={goCalendar}
                onGrades={goGrades}
                onNotifications={goNotifications}
                onProfile={goProfile}
                unreadCount={unreadCount}
            />
        </StudentLayout>
    );
}
