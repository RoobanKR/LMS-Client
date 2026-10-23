// The Attendance Report's printed sheet, laid out through the Business
// Reports Preview & Print modal (the one Service Mapping and Course Report
// use): one row per student — Reg No, Student, Phase, Batch — then their
// tallies, with Phase and Batch merged down each run of students.

import type { FieldRow } from "@/app/lms/pages/businessreports/components/PrintPreviewModal";
import type { ReportClientBlock } from "@/app/lms/pages/servicemapping/components/serviceReport";
import { GROUP_SPAN_KEY } from "@/app/lms/pages/businessreports/groupSpans";
import { phaseOrdinal } from "@/lib/phaseGroups";
import { parseKey, toDayKey, type Student } from "@/app/lms/pages/attendancemanagement/features/attendanceReportShared";
import type { useAttendanceReport } from "@/app/lms/pages/attendancemanagement/features/useAttendanceReport";
import { attendanceApi } from "@/app/lms/pages/attendancemanagement/api/attendanceApi";
import { downloadAttendanceWorkbook } from "@/app/lms/pages/attendancemanagement/features/attendanceWorkbook";

type Report = ReturnType<typeof useAttendanceReport>;

/** Per-day columns start ticked only while they still fit across a page. */
const DAY_COLUMNS_ON_UP_TO = 7;

const dayLabel = (d: Date) => d.toLocaleString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
const dateWords = (key: string) =>
    parseKey(key).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
export const studentName = (s: Student) => `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email || "Student";

const STATUS_WORDS: Record<string, string> = { P: "Present", A: "Absent", H: "Half-day", N: "Not marked" };

export function attendancePrintFields(days: Date[]): FieldRow[] {
    return [
        { key: "regNo", label: "Register No", scope: "service", column: "Reg No", dataKey: "regNo" },
        { key: "student", label: "Student Name", required: true, scope: "service", column: "Student", dataKey: "student" },
        { key: "phase", label: "Phase", scope: "client", column: "Phase", dataKey: "client" },
        { key: "batch", label: "Batch", scope: "service", column: "Batch", dataKey: "batch", mergeGroup: true },
        { key: "email", label: "Email", scope: "service", column: "Email", dataKey: "email" },
        ...days.map((d): FieldRow => {
            const k = `day:${toDayKey(d)}`;
            return { key: k, label: `Day: ${dayLabel(d)}`, scope: "service", column: dayLabel(d), dataKey: k };
        }),
        { key: "workingDays", label: "Working Days", scope: "service", column: "Working Days", dataKey: "workingDays" },
        { key: "present", label: "Present", scope: "service", column: "Present", dataKey: "present" },
        { key: "absent", label: "Absent", scope: "service", column: "Absent", dataKey: "absent" },
        { key: "halfDay", label: "Half-day", scope: "service", column: "Half-day", dataKey: "halfDay" },
        { key: "notMarked", label: "Not Marked", scope: "service", column: "Not Marked", dataKey: "notMarked" },
        { key: "attPct", label: "Attendance %", scope: "service", column: "Attendance %", dataKey: "attPct" },
        { key: "band", label: "Performance Level", scope: "service", column: "Performance Level", dataKey: "band" },
    ];
}

export function attendancePrintDefaults(days: Date[], phased: boolean): Set<string> {
    const keys = ["regNo", "student", "batch", "workingDays", "present", "absent", "halfDay", "notMarked", "attPct", "band"];
    if (phased) keys.push("phase");
    if (days.length <= DAY_COLUMNS_ON_UP_TO) for (const d of days) keys.push(`day:${toDayKey(d)}`);
    return new Set(keys);
}

/** The filtered students as phase blocks, ordered phase → batch → name, with
 *  each batch's run of rows marked so the Batch column merges over it. */
export function attendancePrintBlocks(r: Report, phased: boolean): ReportClientBlock[] {
    const lines = r.filteredStudents.map((s) => {
        const place = r.studentPlace.get(s._id);
        return {
            s,
            name: studentName(s),
            batch: place?.batches.join(", ") || "No batch",
            phase: phased ? place?.phases[0] || "—" : "",
        };
    });
    lines.sort((a, b) =>
        phaseOrdinal(a.phase) - phaseOrdinal(b.phase) ||
        a.phase.localeCompare(b.phase) ||
        a.batch.localeCompare(b.batch, undefined, { numeric: true }) ||
        a.name.localeCompare(b.name)
    );

    const blocks: ReportClientBlock[] = [];
    let current: ReportClientBlock | null = null;
    for (const l of lines) {
        if (!current || current.client !== l.phase) {
            current = { client: l.phase, business: "", services: [] };
            blocks.push(current);
        }
        const rs = r.rowStats(l.s._id);
        const cells = r.grid.get(l.s._id);
        const row: Record<string, string> = {
            __batch: l.batch,
            regNo: l.s.userId || "—",
            student: l.name,
            batch: l.batch,
            email: l.s.email || "—",
            workingDays: String(r.workingDays),
            present: String(rs.p),
            absent: String(rs.a),
            halfDay: String(rs.h),
            notMarked: String(rs.n),
            attPct: `${rs.attPct.toFixed(1)}%`,
            band: rs.band.label,
        };
        for (const d of r.workingDayList) {
            const k = toDayKey(d);
            row[`day:${k}`] = cells?.get(k) || "–";
        }
        current.services.push(row);
    }
    for (const block of blocks) {
        const rows = block.services;
        for (let i = 0; i < rows.length;) {
            let j = i;
            while (j < rows.length && rows[j].__batch === rows[i].__batch) j++;
            rows[i][GROUP_SPAN_KEY] = String(j - i);
            for (let k = i + 1; k < j; k++) rows[k][GROUP_SPAN_KEY] = "0";
            i = j;
        }
    }
    return blocks;
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
