// Attendance ▸ Excel.
//
// The workbook the team already keeps by hand ("<Client>-<Degree>-Attendance
// Summary"), so a download can be sent on without editing:
//   · Attendance — a title band ("<client> - <degree> - <batches>",
//     "Attendance_Tracker", "Date : 07-Sep-2026 Till 21-Oct-2026"), a Module
//     row carrying the course, then S.NO · Reg No · Student Name · Phase ·
//     Batch & Trainers · Email · Contact Number and one column per working day
//     (P / A / H — an absence in bold on red, a half-day on yellow). Two
//     columns on, the Attendance Summary Report: No of Working Days, Present,
//     Absent and Percentage as live formulas, so a corrected cell recounts.
//     Under the students, each day's Status count (Present / Absent / Half Day
//     / Total) and the date it was generated.
//   · Leave Reason — every absence by date, with the reason given.
//   · Total Count — students and trainers per batch.
// Phase and Batch & Trainers merge down their students, like the sample.

import { saveAs } from "file-saver";
import { phaseOrdinal } from "@/lib/phaseGroups";

export type WorkbookStatus = "P" | "A" | "H";

/** The roster shapes both callers hold (the report's and the modal's). */
type RosterStudent = {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    userId?: string;
    regNo?: string;
    phone?: string;
};
type RosterBatch = { id: string; name: string; phase?: string; trainers?: string[]; students: RosterStudent[] };

type Batch = { id: string; name: string; phase: string; trainers: string[] };
type Line = { s: RosterStudent; name: string; batch: Batch };

export interface AttendanceWorkbookSource {
    courseName: string;
    clientName?: string;
    degree?: string;
    studentType?: string;
    batchGroups: RosterBatch[];
    /** The students on the sheet. */
    students: RosterStudent[];
    /** Only these batches place a student (every batch when empty). */
    batchIds?: string[];
    from: string;
    to: string;
    /** The working days — one column each (UTC midnight). */
    days: Date[];
    records: { studentId: string; date: string; status: string; reason?: string }[];
}

// ── Look (taken off the sample workbook) ───────────────────────────────────
const FONT = "Calibri";
const FILL_TITLE = "FFD9E1F2";
const FILL_MODULE = "FFF0D3E6";
const FILL_COURSE = "FFD7FC7E";
const FILL_HEAD = "FFC0EBF0";
const FILL_SUMMARY = "FF0070C0";
const FILL_ABSENT = "FFFF0000";
const FILL_HALF = "FFFFFF00";
const FILL_STATUS_DATE = "FF9BC2E6";
const FILL_TOTAL = "FFE39696";
const THIN = { style: "thin" as const, color: { argb: "FF000000" } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const solid = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayKeyOf = (d: Date) => d.toISOString().slice(0, 10);
/** "2026-09-07" → "07-Sep-2026". */
const dateWords = (key: string) => {
    const [y, m, d] = key.split("-");
    return `${d}-${MONTHS[Number(m) - 1] || m}-${y}`;
};
const keyToDate = (key: string) => new Date(`${key}T00:00:00.000Z`);
const nameOf = (s: RosterStudent) => `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email || "Student";
const colName = (n: number) => {
    let s = "";
    for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
    return s;
};
const fileSafe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "Attendance";

/** The students in sheet order — phase, then batch, then name — each placed
 *  in the first of their (picked) batches. */
function linesOf(src: AttendanceWorkbookSource): Line[] {
    const groups = src.batchIds?.length
        ? src.batchGroups.filter((g) => src.batchIds!.includes(g.id))
        : src.batchGroups;
    const placed = new Map<string, Batch>();
    for (const g of groups) {
        const batch: Batch = { id: g.id, name: g.name, phase: (g.phase || "").trim(), trainers: g.trainers || [] };
        for (const s of g.students) if (!placed.has(s._id)) placed.set(s._id, batch);
    }
    const none: Batch = { id: "", name: "No batch", phase: "", trainers: [] };
    const lines = src.students.map((s) => ({ s, name: nameOf(s), batch: placed.get(s._id) || none }));
    lines.sort((a, b) =>
        phaseOrdinal(a.batch.phase) - phaseOrdinal(b.batch.phase) ||
        a.batch.phase.localeCompare(b.batch.phase) ||
        a.batch.name.localeCompare(b.batch.name, undefined, { numeric: true }) ||
        a.batch.id.localeCompare(b.batch.id) ||
        a.name.localeCompare(b.name)
    );
    return lines;
}

/** [start, length] of each run of equal keys. */
function runs<T>(items: T[], key: (item: T) => string): [number, number][] {
    const out: [number, number][] = [];
    for (let i = 0; i < items.length;) {
        let j = i;
        while (j < items.length && key(items[j]) === key(items[i])) j++;
        out.push([i, j - i]);
        i = j;
    }
    return out;
}

export async function downloadAttendanceWorkbook(src: AttendanceWorkbookSource): Promise<void> {
    const ExcelJS = (await import("exceljs")).default;

    const lines = linesOf(src);
    const days = src.days;
    const dayKeys = days.map(dayKeyOf);
    const showPhase = src.batchGroups.some((g) => (g.phase || "").trim());

    // studentId → dayKey → mark
    const marks = new Map<string, Map<string, { status: WorkbookStatus; reason: string }>>();
    for (const r of src.records) {
        const status = String(r.status) as WorkbookStatus;
        if (status !== "P" && status !== "A" && status !== "H") continue;
        const sid = String(r.studentId);
        const dk = String(r.date || "").slice(0, 10);
        if (!marks.has(sid)) marks.set(sid, new Map());
        marks.get(sid)!.set(dk, { status, reason: String(r.reason || "").trim() });
    }

    // Title: "<client> - <degree> - Batch I - Batch VI", else the course.
    const degree = src.studentType === "degree-program" ? (src.degree || "").trim() : "";
    const head = [src.clientName?.trim(), degree].filter(Boolean).join(" - ") || src.courseName || "Course";
    const batchNames = [...new Set(lines.map((l) => l.batch.name).filter((n) => n !== "No batch"))];
    const batchText = batchNames.length > 1 ? `${batchNames[0]} - ${batchNames[batchNames.length - 1]}` : batchNames[0] || "";
    const title = [head, batchText].filter(Boolean).join(" - ");
    const period = `Date : ${dateWords(src.from)} Till ${dateWords(src.to)}`;

    const wb = new ExcelJS.Workbook();
    wb.creator = "SmartCliff LMS";
    wb.created = new Date();

    // ── Sheet 1 · Attendance ─────────────────────────────────────────────
    const infoHeads = ["S.NO", "Reg No", "Student Name", ...(showPhase ? ["Phase"] : []), "Batch & Trainers", "Email", "Contact Number"];
    const nInfo = infoHeads.length;
    const col = {
        sno: 1, reg: 2, name: 3,
        phase: showPhase ? 4 : 0,
        batch: showPhase ? 5 : 4,
        email: showPhase ? 6 : 5,
        phone: nInfo,
    };
    const firstDay = nInfo + 1;
    const lastDay = nInfo + days.length; // = nInfo when the range has no working day
    const sumStart = Math.max(lastDay, nInfo) + 3; // two empty columns, as in the sample
    const sumCols = { wd: sumStart, present: sumStart + 1, absent: sumStart + 2, pct: sumStart + 3 };
    // Frozen past the student's name and the three header rows.
    const ws = wb.addWorksheet("Attendance", {
        views: [{ state: "frozen", xSplit: col.name, ySplit: 3, zoomScale: 75, showGridLines: false }],
        pageSetup: {
            orientation: "portrait", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
            printTitlesRow: "1:3",
            margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        },
    });

    const style = (
        cell: import("exceljs").Cell,
        opts: { bold?: boolean; size?: number; fill?: string; color?: string; h?: "left" | "center"; wrap?: boolean; fmt?: string } = {},
    ) => {
        cell.font = { name: FONT, size: opts.size ?? 12, bold: !!opts.bold, color: { argb: opts.color || "FF000000" } };
        if (opts.fill) cell.fill = solid(opts.fill);
        cell.alignment = { horizontal: opts.h ?? "center", vertical: "middle", wrapText: opts.wrap ?? false };
        cell.border = BORDER;
        if (opts.fmt) cell.numFmt = opts.fmt;
    };
    const merge = (r1: number, c1: number, r2: number, c2: number) => {
        if (r2 > r1 || c2 > c1) ws.mergeCells(r1, c1, r2, c2);
    };
    const band = (r1: number, c1: number, r2: number, c2: number, value: string, fill: string, size = 14) => {
        merge(r1, c1, r2, c2);
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) style(ws.getCell(r, c), { bold: true, size, fill, wrap: true });
        ws.getCell(r1, c1).value = value;
    };

    // Row 1 — title band, and the summary's own band over rows 1–2.
    band(1, 1, 1, Math.max(lastDay, nInfo), `${title}\nAttendance_Tracker\n${period}`, FILL_TITLE);
    band(1, sumCols.wd, 2, sumCols.pct, `Attendance Summary Report\n${period}`, FILL_TITLE);
    // Row 2 — "Module" over the student columns, the course over the days.
    band(2, 1, 2, nInfo, "Module", FILL_MODULE);
    if (days.length) band(2, firstDay, 2, lastDay, src.courseName || "Course", FILL_COURSE);
    // Row 3 — headers.
    infoHeads.forEach((h, i) => {
        const cell = ws.getCell(3, i + 1);
        cell.value = h;
        style(cell, { bold: true, fill: FILL_HEAD, wrap: true });
    });
    days.forEach((d, i) => {
        const cell = ws.getCell(3, firstDay + i);
        cell.value = d;
        style(cell, { bold: true, fill: FILL_HEAD, fmt: "dd-mmm-yy" });
    });
    (["No of Working Days", "No of Days Present", "No of Days Absent", "Percentage"] as const).forEach((h, i) => {
        const cell = ws.getCell(3, sumCols.wd + i);
        cell.value = h;
        style(cell, { bold: true, fill: FILL_SUMMARY, color: "FFFFFFFF", wrap: true });
    });
    ws.getRow(1).height = 56.25;
    ws.getRow(2).height = 48.75;
    ws.getRow(3).height = 55.5;

    // Students.
    const FIRST_ROW = 4;
    const dayRange = (r: number) => `${colName(firstDay)}${r}:${colName(lastDay)}${r}`;
    lines.forEach((l, i) => {
        const r = FIRST_ROW + i;
        const row = ws.getRow(r);
        row.height = 17.1;
        const put = (c: number, value: import("exceljs").CellValue, opts: Parameters<typeof style>[1] = {}) => {
            const cell = ws.getCell(r, c);
            cell.value = value;
            style(cell, opts);
        };
        put(col.sno, i + 1);
        put(col.reg, l.s.regNo || l.s.userId || "");
        put(col.name, l.name, { h: "left", wrap: true });
        if (col.phase) put(col.phase, l.batch.phase || "—", { bold: true, wrap: true });
        put(col.batch, l.batch.trainers.length ? `${l.batch.name}\n${l.batch.trainers.join(" & ")}` : l.batch.name, { bold: true, wrap: true });
        put(col.email, l.s.email || "", { h: "left", wrap: true });
        const phone = (l.s.phone || "").replace(/\s+/g, "");
        put(col.phone, /^\d{6,15}$/.test(phone) ? Number(phone) : phone, { wrap: true, fmt: "0" });

        let p = 0, a = 0, h = 0;
        dayKeys.forEach((dk, k) => {
            const mark = marks.get(l.s._id)?.get(dk)?.status;
            if (mark === "P") p++;
            else if (mark === "A") a++;
            else if (mark === "H") h++;
            put(firstDay + k, mark || null, {
                bold: mark === "A",
                fill: mark === "A" ? FILL_ABSENT : mark === "H" ? FILL_HALF : undefined,
            });
        });
        const wdRef = `${colName(sumCols.wd)}${r}`;
        const prRef = `${colName(sumCols.present)}${r}`;
        if (days.length) {
            put(sumCols.wd, { formula: `COLUMNS(${dayRange(r)})`, result: days.length });
            put(sumCols.present, { formula: `COUNTIF(${dayRange(r)},"P")+COUNTIF(${dayRange(r)},"H")*0.5`, result: p + h * 0.5 });
            put(sumCols.absent, { formula: `COUNTIF(${dayRange(r)},"A")+COUNTIF(${dayRange(r)},"H")*0.5`, result: a + h * 0.5 });
        } else {
            put(sumCols.wd, 0);
            put(sumCols.present, 0);
            put(sumCols.absent, 0);
        }
        put(sumCols.pct, {
            formula: `IF(${wdRef}=0,0,${prRef}/${wdRef})`,
            result: days.length ? (p + h * 0.5) / days.length : 0,
        }, { bold: true, fmt: "0%" });
    });

    // Phase and Batch & Trainers merge down their students.
    const lastRow = FIRST_ROW + lines.length - 1;
    for (const [start, len] of runs(lines, (l) => l.batch.id || l.batch.name)) {
        merge(FIRST_ROW + start, col.batch, FIRST_ROW + start + len - 1, col.batch);
        // A one-student batch still shows its trainers on a second line.
        if (len === 1 && lines[start].batch.trainers.length) ws.getRow(FIRST_ROW + start).height = 34;
    }
    if (col.phase) {
        for (const [start, len] of runs(lines, (l) => l.batch.phase)) {
            merge(FIRST_ROW + start, col.phase, FIRST_ROW + start + len - 1, col.phase);
        }
    }

    // Absences stay red (and half-days yellow) when someone edits a cell.
    if (lines.length && days.length) {
        ws.addConditionalFormatting({
            ref: `${colName(firstDay)}${FIRST_ROW}:${colName(lastDay)}${lastRow}`,
            rules: [
                { type: "containsText", operator: "containsText", text: "A", priority: 1, style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: FILL_ABSENT } }, font: { bold: true } } },
                { type: "containsText", operator: "containsText", text: "H", priority: 2, style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: FILL_HALF } } } },
            ],
        });
    }

    // Each day's Status count, two rows under the students.
    if (days.length) {
        const top = (lines.length ? lastRow : FIRST_ROW - 1) + 3;
        const colRange = (c: number) => `${colName(c)}${FIRST_ROW}:${colName(c)}${Math.max(lastRow, FIRST_ROW)}`;
        const count = (k: number, status: WorkbookStatus) =>
            lines.filter((l) => marks.get(l.s._id)?.get(dayKeys[k])?.status === status).length;
        const unmarked = (k: number) => lines.filter((l) => !marks.get(l.s._id)?.get(dayKeys[k])).length;
        const anyUnmarked = days.some((_, k) => unmarked(k) > 0);

        const label = (r: number, text: string, fill?: string) => {
            const cell = ws.getCell(r, col.phone);
            cell.value = text;
            style(cell, { bold: true, size: 11, fill });
        };
        label(top, "Status", FILL_HEAD);
        days.forEach((d, k) => {
            const cell = ws.getCell(top, firstDay + k);
            cell.value = d;
            style(cell, { bold: true, fill: FILL_STATUS_DATE, fmt: "d-mmm-yy" });
        });
        const rowsOf: { text: string; fill?: string; formula: (c: number) => string; result: (k: number) => number }[] = [
            { text: "Present", formula: (c) => `COUNTIF(${colRange(c)},"P")`, result: (k) => count(k, "P") },
            { text: "Absent", fill: FILL_ABSENT, formula: (c) => `COUNTIF(${colRange(c)},"A")`, result: (k) => count(k, "A") },
            { text: "Half Day", fill: FILL_HALF, formula: (c) => `COUNTIF(${colRange(c)},"H")`, result: (k) => count(k, "H") },
            ...(anyUnmarked
                ? [{ text: "Not Marked", formula: (c: number) => `COUNTBLANK(${colRange(c)})`, result: unmarked }]
                : []),
        ];
        rowsOf.forEach((spec, i) => {
            const r = top + 1 + i;
            label(r, spec.text, spec.fill);
            days.forEach((_, k) => {
                const cell = ws.getCell(r, firstDay + k);
                cell.value = lines.length ? { formula: spec.formula(firstDay + k), result: spec.result(k) } : 0;
                style(cell);
            });
        });
        const totalRow = top + 1 + rowsOf.length;
        label(totalRow, "Total", FILL_TOTAL);
        days.forEach((_, k) => {
            const c = firstDay + k;
            const cell = ws.getCell(totalRow, c);
            cell.value = {
                formula: `SUM(${colName(c)}${top + 1}:${colName(c)}${totalRow - 1})`,
                result: rowsOf.reduce((sum, spec) => sum + (lines.length ? spec.result(k) : 0), 0),
            };
            style(cell, { bold: true, size: 11, fill: FILL_TOTAL });
        });
        const genCell = ws.getCell(totalRow + 3, col.phone);
        const now = new Date();
        genCell.value = `Generated on ${String(now.getDate()).padStart(2, "0")}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
        genCell.font = { name: FONT, size: 11, bold: true };
    }

    const width = (c: number, w: number) => { ws.getColumn(c).width = w; };
    width(col.sno, 7);
    width(col.reg, 16);
    width(col.name, 26);
    if (col.phase) width(col.phase, 12);
    width(col.batch, 20);
    width(col.email, 34);
    width(col.phone, 18);
    for (let c = firstDay; c <= lastDay; c++) width(c, 12.5);
    width(sumStart - 2, 9);
    width(sumStart - 1, 9);
    width(sumCols.wd, 13);
    width(sumCols.present, 13);
    width(sumCols.absent, 13);
    width(sumCols.pct, 12.6);

    // ── Sheet 2 · Leave Reason ───────────────────────────────────────────
    const lr = wb.addWorksheet("Leave Reason", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
    const lrHeads = ["Date", "Name", "Reg No", ...(showPhase ? ["Phase"] : []), "Batch", "Reason"];
    lrHeads.forEach((h, i) => {
        const cell = lr.getCell(1, i + 1);
        cell.value = h;
        style(cell, { bold: true, fill: FILL_HEAD });
    });
    const lrCol = { date: 1, name: 2, reg: 3, phase: showPhase ? 4 : 0, batch: showPhase ? 5 : 4, reason: showPhase ? 6 : 5 };
    type Leave = { dk: string; l: Line; reason: string };
    const leaves: Leave[] = [];
    for (const dk of dayKeys) {
        for (const l of lines) {
            const m = marks.get(l.s._id)?.get(dk);
            if (m?.status === "A") leaves.push({ dk, l, reason: m.reason });
        }
    }
    if (!leaves.length) {
        lr.mergeCells(2, 1, 2, lrHeads.length);
        const cell = lr.getCell(2, 1);
        cell.value = "No absences in this period";
        style(cell);
    }
    leaves.forEach((lv, i) => {
        const r = 2 + i;
        const put = (c: number, value: import("exceljs").CellValue, opts: Parameters<typeof style>[1] = {}) => {
            const cell = lr.getCell(r, c);
            cell.value = value;
            style(cell, opts);
        };
        put(lrCol.date, keyToDate(lv.dk), { fmt: "dd-mmm-yy" });
        put(lrCol.name, lv.l.name, { h: "left" });
        put(lrCol.reg, lv.l.s.regNo || lv.l.s.userId || "");
        if (lrCol.phase) put(lrCol.phase, lv.l.batch.phase || "—", { bold: true });
        put(lrCol.batch, lv.l.batch.name, { bold: true });
        put(lrCol.reason, lv.reason || "", { h: "left", wrap: true });
    });
    for (const [start, len] of runs(leaves, (lv) => lv.dk)) {
        if (len > 1) lr.mergeCells(2 + start, lrCol.date, 1 + start + len, lrCol.date);
        const day = leaves.slice(start, start + len);
        for (const [s2, len2] of runs(day, (lv) => lv.l.batch.id || lv.l.batch.name)) {
            if (len2 > 1) lr.mergeCells(2 + start + s2, lrCol.batch, 1 + start + s2 + len2, lrCol.batch);
        }
    }
    lr.getColumn(lrCol.date).width = 13;
    lr.getColumn(lrCol.name).width = 26;
    lr.getColumn(lrCol.reg).width = 16;
    if (lrCol.phase) lr.getColumn(lrCol.phase).width = 12;
    lr.getColumn(lrCol.batch).width = 16;
    lr.getColumn(lrCol.reason).width = 44;

    // ── Sheet 3 · Total Count ────────────────────────────────────────────
    const tc = wb.addWorksheet("Total Count", { views: [{ showGridLines: false }] });
    const tcHeads = ["S.No", ...(showPhase ? ["Phase"] : []), "Batch", "No Of Students", "Trainer/s"];
    tcHeads.forEach((h, i) => {
        const cell = tc.getCell(1, i + 1);
        cell.value = h;
        style(cell, { bold: true, fill: FILL_HEAD, wrap: true });
    });
    const batchRuns = runs(lines, (l) => l.batch.id || l.batch.name);
    batchRuns.forEach(([start, len], i) => {
        const b = lines[start].batch;
        const values: import("exceljs").CellValue[] = [i + 1, ...(showPhase ? [b.phase || "—"] : []), b.name, len, b.trainers.join(" & ")];
        values.forEach((v, c) => {
            const cell = tc.getCell(2 + i, c + 1);
            cell.value = v;
            style(cell, { h: c === values.length - 1 ? "left" : "center", wrap: true });
        });
    });
    const tcTotal = 2 + batchRuns.length;
    const countCol = showPhase ? 4 : 3;
    tc.getCell(tcTotal, countCol - 1).value = "Total";
    style(tc.getCell(tcTotal, countCol - 1), { bold: true, fill: FILL_TOTAL });
    tc.getCell(tcTotal, countCol).value = batchRuns.length
        ? { formula: `SUM(${colName(countCol)}2:${colName(countCol)}${tcTotal - 1})`, result: lines.length }
        : 0;
    style(tc.getCell(tcTotal, countCol), { bold: true, fill: FILL_TOTAL });
    tcHeads.forEach((h, i) => { tc.getColumn(i + 1).width = h === "Trainer/s" ? 36 : h === "S.No" ? 7 : 16; });

    const buf = await wb.xlsx.writeBuffer();
    const range = src.from === src.to ? src.from : `${src.from}_to_${src.to}`;
    saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `${fileSafe(title)}-Attendance Summary-${range}.xlsx`,
    );
}
