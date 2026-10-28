// Course Report ▸ Excel.
//
// The shared designed export writes one flat row per record. A course report
// is read and sent as a laid-out sheet, so this builds the workbook the team
// already hand-makes (modelled on their "Skill Based Assessment" sheets):
//   · a title band (client – degree programme, else the course)
//   · a "Date : 23-Oct-2026" band and a Course / Batch / exercise band
//   · light-blue bold headers: S.NO, Reg No, Student Name, Phase, Batch &
//     Trainers, Email, Contact Number, Performance Level, Marks(100),
//     Marks(<the exercise's own total>) — and, with question details, one
//     column per question "1. Title (10 marks)"
//   · Phase and Batch & Trainers merged down their students
//   · a Performance Level count table under the students
// One sheet per exercise; the totals layout is one sheet of course totals.

import { saveAs } from "file-saver";
import {
  QUESTION_STATUS_LABEL,
  type QuestionRow, type ReportExercise, type ReportStudent, type StudentResult, type StudentTotals,
} from "./reportData";
import type { StudentLine } from "./courseReportPrint";

type Cell = string | number | null;

export interface ExcelBatchInfo {
  name: string;
  phase: string;
  trainers: string[];
}

export interface CourseExcelBase {
  /** Band 1 — "Client – B.Sc" for a degree programme, else the course. */
  title: string;
  courseName: string;
  showPhase: boolean;
  batchInfo: (batchId: string) => ExcelBatchInfo | undefined;
  phoneOf: (student: ReportStudent) => string;
  filename: string;
}

// ── Look ───────────────────────────────────────────────────────────────────
const FONT = "Arial";
const FILL_DATE = "FFE39696";
const FILL_COURSE = "FFF0D3E6";
const FILL_HEAD = "FFC0EBF0";
const FILL_LEVEL = "FFEDEDED";
const THIN = { style: "thin" as const, color: { argb: "FF9CA3AF" } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const solid = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

/** A Performance Level's tint, the way the hand-made sheet colours it. */
function levelFill(level: string): { fill: string; font: string } {
  const l = level.toLowerCase();
  if (l.includes("excellent")) return { fill: "FFC6EFCE", font: "FF006100" };
  if (l.includes("very good")) return { fill: "FFD9EAD3", font: "FF1E5631" };
  if (l.includes("good")) return { fill: "FFE2EFDA", font: "FF375623" };
  if (l.includes("average") || l.includes("fair")) return { fill: "FFFFEB9C", font: "FF7F6000" };
  if (l.includes("poor") || l.includes("absent")) return { fill: "FFFFC7CE", font: "FF9C0006" };
  return { fill: FILL_LEVEL, font: "FF374151" };
}

const LEVEL_ORDER = ["excellent", "very good", "good", "average", "fair", "poor"];
const levelRank = (level: string) => {
  const i = LEVEL_ORDER.findIndex((k) => level.toLowerCase().startsWith(k));
  if (i >= 0) return i;
  if (/^absent/i.test(level)) return 50;
  if (/^in progress/i.test(level)) return 51;
  if (/^not started/i.test(level)) return 52;
  return 40;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Excel sheet names: 31 characters, none of []:*?/\ , unique in the book. */
function sheetNameFor(name: string, used: Set<string>): string {
  const base = (name.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim() || "Sheet").slice(0, 31);
  let out = base;
  for (let n = 2; used.has(out.toLowerCase()); n++) {
    const tag = ` (${n})`;
    out = `${base.slice(0, 31 - tag.length)}${tag}`;
  }
  used.add(out.toLowerCase());
  return out;
}

const dateText = () => {
  const d = new Date();
  const mon = d.toLocaleString("en-US", { month: "short" });
  return `Date : ${String(d.getDate()).padStart(2, "0")}-${mon}-${d.getFullYear()}`;
};

/** "Batch I\nMs. Sundari & Mr. Ragu" — the batch with its trainers. */
const batchCell = (info: ExcelBatchInfo | undefined, fallback: string) => {
  const name = info?.name || fallback || "No batch";
  const trainers = (info?.trainers || []).filter(Boolean);
  return trainers.length ? `${name}\n${trainers.join(" & ")}` : name;
};

interface SheetSpec {
  name: string;
  detail: string[];
  headers: { text: string; width: number }[];
  /** One entry per student line, cells in header order. */
  rows: { line: StudentLine; cells: Cell[]; level: string }[];
  /** Header indexes (0-based) of the Phase / Batch / Performance Level columns. */
  phaseCol: number | null;
  batchCol: number;
  levelCol: number;
  /** What the count table's second column is headed. */
  summaryTitle: string;
  /** What the count table counts — "Performance Level" unless given. */
  levelTitle?: string;
}

/** Lays one sheet out in the workbook. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeSheet(wb: any, spec: SheetSpec, base: CourseExcelBase, used: Set<string>) {
  const ws = wb.addWorksheet(sheetNameFor(spec.name, used), { views: [{ state: "frozen", ySplit: 4, xSplit: 3 }] });
  const cols = spec.headers.length;
  spec.headers.forEach((h, i) => { ws.getColumn(i + 1).width = h.width; });

  const band = (row: number, text: string, opts: { size: number; fill?: string; height: number }) => {
    ws.mergeCells(row, 1, row, cols);
    const cell = ws.getCell(row, 1);
    cell.value = text;
    cell.font = { name: FONT, size: opts.size, bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (opts.fill) cell.fill = solid(opts.fill);
    ws.getRow(row).height = opts.height;
  };
  band(1, base.title, { size: 18, height: 34 });
  band(2, dateText(), { size: 13, fill: FILL_DATE, height: 22 });
  band(3, spec.detail.join("\n"), { size: 12, fill: FILL_COURSE, height: Math.max(22, spec.detail.length * 17 + 6) });

  // Headers
  const head = ws.getRow(4);
  spec.headers.forEach((h, i) => {
    const cell = head.getCell(i + 1);
    cell.value = h.text;
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: "FF000000" } };
    cell.fill = solid(FILL_HEAD);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  head.height = spec.headers.some((h) => h.text.length > 24) ? 64 : 34;

  // Students — names and emails read left-aligned, everything else centred.
  const first = 5;
  const nameCol = spec.headers.findIndex((h) => h.text === "Student Name");
  const emailCol = spec.headers.findIndex((h) => h.text === "Email");
  spec.rows.forEach((r, i) => {
    const row = ws.getRow(first + i);
    r.cells.forEach((v, c) => {
      const cell = row.getCell(c + 1);
      cell.value = v === null ? "" : v;
      cell.font = { name: FONT, size: 11 };
      cell.alignment = {
        horizontal: c === nameCol || c === emailCol ? "left" : "center",
        vertical: "middle",
        wrapText: c !== emailCol,
      };
    });
    const tone = levelFill(r.level);
    const levelCell = row.getCell(spec.levelCol + 1);
    levelCell.fill = solid(tone.fill);
    levelCell.font = { name: FONT, size: 11, bold: true, color: { argb: tone.font } };
  });

  // Phase / Batch & Trainers merged down their students.
  const mergeRuns = (col: number, keyOf: (l: StudentLine) => string) => {
    for (let i = 0; i < spec.rows.length;) {
      let j = i;
      while (j < spec.rows.length && keyOf(spec.rows[j].line) === keyOf(spec.rows[i].line)) j++;
      if (j - i > 1) ws.mergeCells(first + i, col + 1, first + j - 1, col + 1);
      const cell = ws.getCell(first + i, col + 1);
      cell.font = { name: FONT, size: 11, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      i = j;
    }
  };
  if (spec.phaseCol !== null) mergeRuns(spec.phaseCol, (l) => l.phase);
  mergeRuns(spec.batchCol, (l) => `${l.phase}|${l.batchId}`);

  // Borders on the whole table, bands included.
  const lastRow = first + spec.rows.length - 1;
  for (let r = 1; r <= Math.max(lastRow, 4); r++) {
    for (let c = 1; c <= cols; c++) ws.getCell(r, c).border = BORDER;
  }

  // Performance Level counts under the table.
  if (spec.rows.length) {
    const counts = new Map<string, number>();
    for (const r of spec.rows) counts.set(r.level || "—", (counts.get(r.level || "—") || 0) + 1);
    const levels = [...counts.keys()].sort((a, b) => levelRank(a) - levelRank(b) || a.localeCompare(b));
    const top = lastRow + 3;
    const c1 = spec.levelCol + 1;
    const c2 = Math.min(cols, c1 + 1);
    const put = (row: number, label: string, value: Cell, bold: boolean, fill?: string) => {
      const a = ws.getCell(row, c1);
      const b = ws.getCell(row, c2);
      a.value = label;
      b.value = value;
      for (const cell of [a, b]) {
        cell.font = { name: FONT, size: 11, bold };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = BORDER;
        if (fill) cell.fill = solid(fill);
      }
    };
    put(top, spec.levelTitle || "Performance Level", spec.summaryTitle, true, FILL_HEAD);
    levels.forEach((lvl, i) => {
      put(top + 1 + i, lvl, counts.get(lvl) || 0, false);
      const tone = levelFill(lvl);
      ws.getCell(top + 1 + i, c1).fill = solid(tone.fill);
    });
    put(top + 1 + levels.length, "Total", spec.rows.length, true);
  }
}

const baseHeaders = (base: CourseExcelBase) => [
  { text: "S.NO", width: 7 },
  { text: "Reg No", width: 18 },
  { text: "Student Name", width: 30 },
  ...(base.showPhase ? [{ text: "Phase", width: 14 }] : []),
  { text: "Batch & Trainers", width: 26 },
  { text: "Email", width: 34 },
  { text: "Contact Number", width: 17 },
];

const baseCells = (base: CourseExcelBase, l: StudentLine, i: number): Cell[] => [
  i + 1,
  l.student.regNo || "",
  l.student.name,
  ...(base.showPhase ? [l.phase || ""] : []),
  batchCell(base.batchInfo(l.batchId), l.batch),
  l.student.email || "",
  base.phoneOf(l.student) || "",
];

const batchLine = (lines: StudentLine[], base: CourseExcelBase) => {
  const phases = [...new Set(lines.map((l) => l.phase).filter(Boolean))];
  const batches = [...new Set(lines.map((l) => l.batch).filter(Boolean))];
  return [
    base.showPhase && phases.length ? `Phase : ${phases.join(", ")}` : "",
    batches.length ? `Batch : ${batches.join(", ")}` : "",
  ].filter(Boolean);
};

/** A student's level in one exercise, in words. */
function levelOf(r: StudentResult, ex: ReportExercise, now: number): string {
  if (r.status === "not-started") {
    const closed = ex.endDate && new Date(ex.endDate).getTime() < now;
    return closed ? "Absent" : "Not started";
  }
  if (r.status === "in-progress") return "In progress";
  return r.scale || "—";
}

// ── Exercise sheets (Exercise-wise / With question details) ───────────────
export async function exportExerciseWorkbook(input: CourseExcelBase & {
  exercises: ReportExercise[];
  /** The students an exercise is set for, as list lines. */
  linesFor: (exercise: ReportExercise) => StudentLine[];
  resultOf: (exerciseId: string, studentId: string) => StudentResult;
  /** Present = "with question details": a column per question. */
  questionsOf?: (exercise: ReportExercise, student: ReportStudent) => QuestionRow[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const used = new Set<string>();
  const now = Date.now();

  for (const ex of input.exercises) {
    const lines = input.linesFor(ex);
    const total = round1(ex.totalMarks);
    // A non-graded exercise has no marks: a Status column stands in for
    // Performance Level / Marks, and each question column holds the answer's
    // status instead of its marks.
    const graded = ex.graded;

    // The question columns, in question order, from any student's rows.
    let questions: { id: string; head: string }[] = [];
    const qByStudent = new Map<string, QuestionRow[]>();
    if (input.questionsOf) {
      const seen = new Map<string, { no: number; head: string }>();
      for (const l of lines) {
        const rows = input.questionsOf(ex, l.student);
        qByStudent.set(l.student.id, rows);
        for (const q of rows) {
          if (!seen.has(q.questionId)) {
            seen.set(q.questionId, { no: q.no, head: graded ? `${q.no}. ${q.title} (${round1(q.max)} marks)` : `${q.no}. ${q.title}` });
          }
        }
      }
      questions = [...seen.entries()].sort((a, b) => a[1].no - b[1].no).map(([id, v]) => ({ id, head: v.head }));
    }

    const headers = [
      ...baseHeaders(input),
      ...(graded
        ? [
          { text: "Performance Level", width: 20 },
          { text: "Marks(100)", width: 12 },
          { text: `Marks(${total})`, width: 12 },
        ]
        : [{ text: "Status", width: 16 }]),
      ...questions.map((q) => ({ text: q.head, width: 24 })),
    ];
    const levelCol = baseHeaders(input).length;

    const rows = lines.map((l, i) => {
      const r = input.resultOf(ex.id, l.student.id);
      const level = !graded && r.status === "completed" ? "Completed" : levelOf(r, ex, now);
      const started = r.status !== "not-started";
      const absent = level === "Absent";
      const qRows = qByStudent.get(l.student.id) || [];
      const qCells: Cell[] = questions.map((q) => {
        const row = qRows.find((x) => x.questionId === q.id);
        if (!graded) return started && row ? QUESTION_STATUS_LABEL[row.status] : "";
        if (!started) return absent ? 0 : "";
        if (!row || row.status === "pending" || row.status === "not_answered") return row ? 0 : "";
        return round1(row.scored);
      });
      return {
        line: l,
        level,
        cells: [
          ...baseCells(input, l, i),
          level,
          ...(graded
            ? [started ? round1(r.percent ?? 0) : absent ? 0 : "", started ? round1(r.scored) : absent ? 0 : ""]
            : []),
          ...qCells,
        ],
      };
    });

    writeSheet(wb, {
      name: ex.name,
      detail: [
        `Course : ${input.courseName}`,
        ...batchLine(lines, input),
        `${ex.activity} : ${ex.name}`,
        ex.location ? `Module : ${ex.location}` : "",
        graded ? `Total Marks : ${total}` : "Non-graded",
      ].filter(Boolean),
      headers,
      rows,
      phaseCol: input.showPhase ? 3 : null,
      batchCol: input.showPhase ? 4 : 3,
      levelCol,
      summaryTitle: ex.name,
      levelTitle: graded ? undefined : "Status",
    }, input, used);
  }

  if (!input.exercises.length) wb.addWorksheet("Report");
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${input.filename}.xlsx`);
}

// ── Course totals (Totals only) ────────────────────────────────────────────
export async function exportTotalsWorkbook(input: CourseExcelBase & {
  lines: StudentLine[];
  totalsOf: (student: ReportStudent) => StudentTotals;
  exerciseCount: number;
  /** One "<Activity> Completed" column each — the course's own names. */
  activities: { key: string; label: string }[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const used = new Set<string>();

  const headers = [
    ...baseHeaders(input),
    { text: "Performance Level", width: 20 },
    { text: "Marks(100)", width: 12 },
    { text: "Marks Scored", width: 13 },
    { text: "Total Marks", width: 12 },
    ...input.activities.map((a) => ({ text: `${a.label} Completed`, width: 16 })),
  ];
  const levelCol = baseHeaders(input).length;

  const rows = input.lines.map((l, i) => {
    const t = input.totalsOf(l.student);
    const started = t.percent !== null;
    const level = started ? t.scale || "—" : "Not started";
    return {
      line: l,
      level,
      cells: [
        ...baseCells(input, l, i),
        level,
        started ? round1(t.percent ?? 0) : "",
        round1(t.scored),
        round1(t.total),
        ...input.activities.map((a) => {
          const c = t.activities[a.key];
          return c ? `${c.done} / ${c.total}` : "";
        }),
      ],
    };
  });

  writeSheet(wb, {
    name: "Course Totals",
    detail: [
      `Course : ${input.courseName}`,
      ...batchLine(input.lines, input),
      `Totals over ${input.exerciseCount} exercise${input.exerciseCount === 1 ? "" : "s"}`,
    ],
    headers,
    rows,
    phaseCol: input.showPhase ? 3 : null,
    batchCol: input.showPhase ? 4 : 3,
    levelCol,
    summaryTitle: "Students",
  }, input, used);

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${input.filename}.xlsx`);
}
