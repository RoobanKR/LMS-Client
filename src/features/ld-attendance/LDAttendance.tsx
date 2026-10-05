"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { attendanceApi } from "@/app/lms/pages/attendancemanagement/api/attendanceApi";
import AttendanceCourseList, { type CourseTab } from "./AttendanceCourseList";
import CourseAttendancePage from "./CourseAttendancePage";
import { toCourseRow, todayYmd, type CourseRow } from "./lib";

/* The L&D console's Attendance view: the course list, and — once a course
 * is opened — that course's Attendance / Report page in its place. The URL
 * stays at #attendance throughout; the console owns the screen. */

export type AttendanceScope = {
    /** Console-level client / course pick ("all" when none). */
    client: string;
    course: string;
    onCourse: (id: string) => void;
};

export function LDAttendance({ scope, header }: {
    scope: AttendanceScope;
    /** The console's page heading, shown above the list only. */
    header: ReactNode;
}) {
    const today = todayYmd();
    const overview = useQuery({
        queryKey: queryKeys.attendance.overview(today),
        queryFn: () => attendanceApi.overview(today),
        staleTime: 60 * 1000,
    });

    const rows = useMemo<CourseRow[] | undefined>(() => {
        if (!overview.data) return undefined;
        return overview.data.data
            .map((c) => toCourseRow(c, today))
            .filter((r): r is CourseRow => r !== null);
    }, [overview.data, today]);

    const [open, setOpen] = useState<{ id: string; tab: CourseTab } | null>(null);
    // A course picked in the console's own filter opens straight to that
    // course — a one-row list would only ask for a second click.
    const openId = open?.id ?? (scope.course !== "all" ? scope.course : null);
    const openRow = openId ? rows?.find((r) => r.id === openId) : undefined;

    const back = () => {
        setOpen(null);
        if (scope.course !== "all") scope.onCourse("all");
    };

    if (openRow) {
        return (
            <CourseAttendancePage
                course={openRow}
                tab={open?.tab ?? "attendance"}
                onTab={(tab) => setOpen({ id: openRow.id, tab })}
                onBack={back}
            />
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {header}
            <AttendanceCourseList
                rows={rows}
                loading={overview.isLoading}
                error={overview.isError}
                onRetry={() => void overview.refetch()}
                onOpen={(row, tab) => setOpen({ id: row.id, tab })}
                initialClients={scope.client !== "all" ? [scope.client] : []}
            />
        </div>
    );
}

export default LDAttendance;
