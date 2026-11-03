// The Attendance Report's printed sheet, laid out through the Business
// Reports Preview & Print modal (the one Service Mapping and Course Report
// use), with the columns of the team's Attendance Summary workbook: S.No ·
// Student Name · Specialization · Batch & Trainers (merged down its students)
// · Email · Contact Number · one column per working day (P / A / H) · No of
// Working Days · No of Days Present · No of Days Absent · Percentage.

import type { FieldRow } from "@/app/lms/pages/businessreports/components/PrintPreviewModal";
import type { ReportClientBlock } from "@/app/lms/pages/servicemapping/components/serviceReport";
import { GROUP_SPAN_KEY } from "@/app/lms/pages/businessreports/groupSpans";
import { parseKey, toDayKey, type Student } from "@/app/lms/pages/attendancemanagement/features/attendanceReportShared";
import type { useAttendanceReport } from "@/app/lms/pages/attendancemanagement/features/useAttendanceReport";
import { attendanceApi } from "@/app/lms/pages/attendancemanagement/api/attendanceApi";
import {
    batchCaption, downloadAttendanceWorkbook, orderedLines, runs,
} from "@/app/lms/pages/attendancemanagement/features/attendanceWorkbook";

type Report = ReturnType<typeof useAttendanceReport>;

// "03-Nov-26", as the workbook's date headers read.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}-${MONTHS[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(-2)}`;
const dateWords = (key: string) =>
    parseKey(key).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
export const studentName = (s: Student) => `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email || "Student";
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const STATUS_WORDS: Record<string, string> = { P: "Present", A: "Absent", H: "Half-day", N: "Not marked" };

export function attendancePrintFields(days: Date[], showDept: boolean): FieldRow[] {
    return [
        { key: "student", label: "Student Name", required: true, scope: "service", column: "Student Name", dataKey: "student" },
        ...(showDept ? [{ key: "dept", label: "Specialization", scope: "service" as const, column: "Specialization", dataKey: "dept" }] : []),
        { key: "batch", label: "Batch & Trainers", scope: "service", column: "Batch & Trainers", dataKey: "batch", mergeGroup: true },
        { key: "email", label: "Email", scope: "service", column: "Email", dataKey: "email" },
        { key: "phone", label: "Contact Number", scope: "service", column: "Contact Number", dataKey: "phone" },
        ...days.map((d): FieldRow => {
            const k = `day:${toDayKey(d)}`;
            return { key: k, label: `Day: ${dayLabel(d)}`, scope: "service", column: dayLabel(d), dataKey: k };
        }),
        { key: "workingDays", label: "No of Working Days", scope: "service", column: "No of Working Days", dataKey: "workingDays" },
        { key: "present", label: "No of Days Present", scope: "service", column: "No of Days Present", dataKey: "present" },
        { key: "absent", label: "No of Days Absent", scope: "service", column: "No of Days Absent", dataKey: "absent" },
        { key: "percentage", label: "Percentage", scope: "service", column: "Percentage", dataKey: "percentage" },
        { key: "regNo", label: "Register No (extra)", scope: "service", column: "Reg No", dataKey: "regNo" },
    ];
}

/** Every column of the workbook starts ticked — every day included; Reg No
 *  is offered but off, as the workbook has none. */
export function attendancePrintDefaults(days: Date[], showDept: boolean): Set<string> {
    const keys = ["student", "batch", "email", "phone", "workingDays", "present", "absent", "percentage"];
    if (showDept) keys.push("dept");
    for (const d of days) keys.push(`day:${toDayKey(d)}`);
    return new Set(keys);
}

/** The filtered students in the workbook's order (phase → batch → name) as
 *  one block, each batch's run of rows marked so Batch & Trainers merges. */
export function attendancePrintBlocks(r: Report): ReportClientBlock[] {
    const lines = orderedLines(r.batchGroups, r.filteredStudents, r.appliedBatches);
    const services = lines.map((l) => {
        const rs = r.rowStats(l.s._id);
        const cells = r.grid.get(l.s._id);
        const row: Record<string, string> = {
            __batch: l.batch.id || l.batch.name,
            student: l.name,
            dept: (l.s.department || "").trim(),
            batch: l.batch.trainers.length ? `${batchCaption(l.batch)} · ${l.batch.trainers.join(" & ")}` : batchCaption(l.batch),
            email: l.s.email || "",
            phone: l.s.phone || "",
            workingDays: String(r.workingDays),
            present: num(rs.p + rs.h * 0.5),
            absent: num(rs.a + rs.h * 0.5),
            percentage: `${Math.round(rs.attPct)}%`,
            regNo: l.s.regNo || l.s.userId || "",
        };
        for (const d of r.workingDayList) {
            const k = toDayKey(d);
            row[`day:${k}`] = cells?.get(k) || "";
        }
        return row;
    });
    for (const [start, len] of runs(services, (row) => row.__batch)) {
        services[start][GROUP_SPAN_KEY] = String(len);
        for (let k = start + 1; k < start + len; k++) services[k][GROUP_SPAN_KEY] = "0";
    }
    return [{ client: "", business: "", services }];
}

/** Excel — the "Attendance Summary" workbook for the generated report. The
 *  cells (with their leave reasons) are fetched for exactly these students
 *  and dates, rather than read off the screen's grid. */
export async function downloadReportWorkbook(r: Report): Promise<void> {
    const ids = r.filteredStudents.map((s) => s._id);
    const records = ids.length
        ? await attendanceApi.list(r.courseId, r.appliedFrom, r.appliedTo, undefined, undefined, ids)
        : [];
    await downloadAttendanceWorkbook({
        courseName: r.course?.courseName || "Course",
        clientName: r.rosterInfo?.clientName,
        degree: r.rosterInfo?.degree,
        studentType: r.rosterInfo?.studentType,
        batchGroups: r.batchGroups,
        students: r.filteredStudents,
        batchIds: r.appliedBatches,
        from: r.appliedFrom,
        to: r.appliedTo,
        days: r.workingDayList,
        records: records.map((rec) => ({
            studentId: String(rec.studentId),
            date: toDayKey(new Date(rec.date)),
            status: rec.status,
            reason: rec.reason,
        })),
    });
}

/** The line under the sheet's title, in plain words:
 *  "Dates: 01 Oct 2026 – 23 Oct 2026   |   Batch: Batch I (Phase III)". */
export function attendanceFilterWords(r: Report, batchLabel: (id: string) => string): string {
    const named = (values: string[], noun: string) =>
        values.length > 3 ? `${values.length} ${noun}` : values.join(", ");
    const parts = [
        r.appliedFrom === r.appliedTo
            ? `Date: ${dateWords(r.appliedFrom)}`
            : `Dates: ${dateWords(r.appliedFrom)} – ${dateWords(r.appliedTo)}`,
    ];
    if (r.appliedBatches.length) parts.push(`Batch: ${named(r.appliedBatches.map(batchLabel), "batches")}`);
    if (r.appliedStudent !== "all" && r.appliedStudent.length) {
        const byId = new Map(r.students.map((s) => [s._id, studentName(s)]));
        parts.push(`Students: ${named(r.appliedStudent.map((id) => byId.get(id) || "Student"), "students")}`);
    }
    if (r.appliedStatus !== "all") parts.push(`Status: ${STATUS_WORDS[r.appliedStatus]}`);
    return parts.join("   |   ");
}
