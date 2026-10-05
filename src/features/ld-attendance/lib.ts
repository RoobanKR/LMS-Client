import type { OverviewCourse } from "@/app/lms/pages/attendancemanagement/api/attendanceApi";
import {
    realBatchesOf,
    scheduleStateOf,
    todayYmd,
} from "@/app/lms/pages/attendancemanagement/features/attendanceManagementHelpers";
import { bandOf } from "@/app/lms/pages/attendancemanagement/features/attendanceReportShared";
import type { StatusPillTone } from "@/app/lms/shared/ui";

/* Shared vocabulary for the L&D console's Attendance screens — the course
 * list, the course's daily register and its report all read a course and a
 * mark through these, so a status is spelled (and coloured) one way. */

export { todayYmd };

/** "2026-10-05" → "05 Oct 2026". Empty in → empty out. */
export const fmtDate = (ymd: string): string => {
    if (!ymd) return "";
    const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return "";
    const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
    return `${String(d).padStart(2, "0")} ${mon} ${y}`;
};

/** "2026-10-05" → "Monday". Read in UTC so the label never drifts a day. */
export const weekdayOf = (ymd: string): string => {
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return "";
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
};

export const isWeekendYmd = (ymd: string): boolean => {
    const [y, m, d] = ymd.split("-").map(Number);
    const w = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1)).getUTCDay();
    return w === 0 || w === 6;
};

export const shiftYmd = (ymd: string, days: number): string => {
    const [y, m, d] = ymd.split("-").map(Number);
    const t = new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
    t.setUTCDate(t.getUTCDate() + days);
    return t.toISOString().slice(0, 10);
};

/** First of the month `ymd` falls in. */
export const monthStartOf = (ymd: string): string => `${ymd.slice(0, 7)}-01`;

export const clampYmd = (ymd: string, min?: string, max?: string): string => {
    if (min && ymd < min) return min;
    if (max && ymd > max) return max;
    return ymd;
};

/* ── Course state ─────────────────────────────────────────────────────── */

export type CourseStatus = "ongoing" | "upcoming" | "completed";

export const COURSE_STATUS: Record<CourseStatus, { label: string; tone: StatusPillTone }> = {
    ongoing: { label: "Ongoing", tone: "success" },
    upcoming: { label: "Upcoming", tone: "info" },
    completed: { label: "Completed", tone: "neutral" },
};

/** Today's marking for a course: every batch marked, some, none — or "none"
 *  when today is not a class day for it (not running, or a weekend nobody
 *  marked). */
export type TodayState = "marked" | "partial" | "pending" | "na";

export const TODAY_STATE: Record<TodayState, { label: string; dot: string; text: string }> = {
    marked: { label: "Marked", dot: "bg-success-500", text: "text-success-700" },
    partial: { label: "Partly marked", dot: "bg-warn-500", text: "text-warn-700" },
    pending: { label: "Not marked", dot: "bg-danger-500", text: "text-danger-700" },
    na: { label: "—", dot: "", text: "text-faint" },
};

export type BatchRef = { id: string; name: string };

/** One row of the course list, derived once from the overview payload. */
export type CourseRow = {
    id: string;
    code: string;
    name: string;
    client: string;
    category: string;
    serviceModel: string;
    start: string;
    end: string;
    status: CourseStatus;
    batches: BatchRef[];
    /** False for a batchless course, whose lone "Default" container is the
     *  course itself rather than a batch worth naming. */
    hasRealBatches: boolean;
    students: number;
    today: TodayState;
    markedBatches: number;
    totalBatches: number;
};

export function toCourseRow(c: OverviewCourse, today: string): CourseRow | null {
    const state = scheduleStateOf(c, today);
    // No Program Calendar → nothing to attend; Attendance Management leaves
    // these off its list too.
    if (state === "none") return null;
    const status: CourseStatus = state === "active" ? "ongoing" : state === "upcoming" ? "upcoming" : "completed";
    const real = realBatchesOf(c);
    const totalBatches = real.length || 1;
    const markedBatches = real.length
        ? real.filter((b) => b.markedToday).length
        : (c.batches.some((b) => b.markedToday) || c.legacyMarkedToday ? 1 : 0);
    let todayState: TodayState = "na";
    if (status === "ongoing") {
        if (markedBatches >= totalBatches) todayState = "marked";
        else if (markedBatches > 0) todayState = "partial";
        else todayState = isWeekendYmd(today) ? "na" : "pending";
    }
    return {
        id: String(c._id),
        code: c.courseCode || "",
        name: c.courseName || "Untitled course",
        client: c.clientName || "",
        category: c.category || "",
        serviceModel: c.serviceModal || "",
        start: c.trainingStart || "",
        end: c.trainingEnd || "",
        status,
        batches: c.batches.map((b) => ({ id: String(b._id), name: b.batchName || "Batch" })),
        hasRealBatches: real.length > 0,
        students: c.totalStudents || 0,
        today: todayState,
        markedBatches,
        totalBatches,
    };
}

/** "05 Oct 2026 – 20 Nov 2026", or the half that is known. */
export const periodLabel = (start: string, end: string): string => {
    if (start && end) return `${fmtDate(start)} – ${fmtDate(end)}`;
    if (start) return `From ${fmtDate(start)}`;
    return "—";
};

/* ── Marks ────────────────────────────────────────────────────────────── */

export type MarkStatus = "P" | "A" | "H" | "N";

export const MARK: Record<MarkStatus, { label: string; tone: StatusPillTone }> = {
    P: { label: "Present", tone: "success" },
    A: { label: "Absent", tone: "danger" },
    H: { label: "Half day", tone: "warn" },
    N: { label: "Not marked", tone: "neutral" },
};

/** Attendance % = (present + ½ × half-days) ÷ working days. */
export const attendancePct = (p: number, h: number, workingDays: number): number =>
    workingDays > 0 ? ((p + h * 0.5) / workingDays) * 100 : 0;

export { bandOf };

export const fmtPct = (v: number): string => `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
