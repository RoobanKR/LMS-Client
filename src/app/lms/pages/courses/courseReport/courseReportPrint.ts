// Course Report → the shared Print Preview.
//
// Printing goes through Business Reports' PrintPreviewModal, so the course
// report gets the same Customize Fields / Customize Report Settings panels,
// the institution's saved letterhead and the same PDF / Excel / Print output
// as every other report in the LMS. That modal prints a GROUPED table: a
// block's "client"-scope cells are merged down its rows, and each of its
// "service" rows is one line. Each layout below says what a block is, what a
// row is, and which columns the trainer may tick.
//
// Column labels matter beyond the header: the sheet sizes and aligns a column
// by its label (designedExport.ts `reportColumnRole`), which is why the
// question text, the marks and the small figures each keep a fixed wording.

import type { FieldRow } from "@/app/lms/pages/businessreports/components/PrintPreviewModal";
import type { ReportClientBlock } from "@/app/lms/pages/servicemapping/components/serviceReport";
import { GROUP_SPAN_KEY } from "@/app/lms/pages/businessreports/groupSpans";
import {
  formatMarks, formatPercent, QUESTION_STATUS_LABEL, round1, STATUS_LABEL,
  type QuestionRow, type ReportExercise, type ReportStudent, type StudentResult, type StudentTotals,
} from "./reportData";

export type PrintLayout =
  | "exercise-list"
  | "exercise-summary"
  | "exercise-questions"
  | "student-totals"
  | "student-exercises"
  | "student-questions";

export const LAYOUT_LABEL: Record<PrintLayout, { label: string; hint: string }> = {
  "exercise-list": { label: "Exercise list", hint: "One row per exercise, with how the students did" },
  "exercise-summary": { label: "Summary", hint: "One row per student" },
  "exercise-questions": { label: "With question details", hint: "Every question for each student" },
  "student-totals": { label: "Totals only", hint: "One row per student, all exercises summed" },
  "student-exercises": { label: "Exercise-wise", hint: "Each student's result in every exercise" },
  "student-questions": { label: "With question details", hint: "Every question of every exercise" },
};

// `client` / `business` are the two block fields the modal reads directly;
// every other block-level column comes off `clientExtras` by its key.
const STUDENT_FIELDS: FieldRow[] = [
  { key: "regNo", label: "Register No", scope: "client", column: "Reg No", dataKey: "business" },
  { key: "student", label: "Student Name", required: true, scope: "client", column: "Student", dataKey: "client" },
  { key: "phase", label: "Phase", scope: "client", column: "Phase", dataKey: "phase" },
  { key: "batch", label: "Batch", scope: "client", column: "Batch", dataKey: "batch" },
  { key: "email", label: "Email", scope: "client", column: "Email", dataKey: "email" },
];

const QUESTION_FIELDS: FieldRow[] = [
  { key: "qNo", label: "Q. No.", scope: "service", column: "Q. No.", dataKey: "qNo" },
  { key: "question", label: "Question", required: true, scope: "service", column: "Question", dataKey: "question" },
  { key: "qType", label: "Question Type", scope: "service", column: "Type", dataKey: "qType" },
  { key: "difficulty", label: "Difficulty", scope: "service", column: "Difficulty", dataKey: "difficulty" },
  { key: "qSection", label: "Section", scope: "service", column: "Section", dataKey: "qSection" },
  { key: "qMax", label: "Max Marks", scope: "service", column: "Max", dataKey: "qMax" },
  { key: "qScored", label: "Marks Scored", scope: "service", column: "Scored", dataKey: "qScored" },
  { key: "qStatus", label: "Question Status", scope: "service", column: "Status", dataKey: "qStatus" },
];

export const LAYOUT_FIELDS: Record<PrintLayout, { fields: FieldRow[]; defaults: Set<string> }> = {
  "exercise-list": {
    fields: [
      { key: "exercise", label: "Exercise", required: true, scope: "client", column: "Exercise", dataKey: "client" },
      { key: "type", label: "Type", scope: "client", column: "Type", dataKey: "business" },
      { key: "subcategory", label: "Subcategory", scope: "client", column: "Subcategory", dataKey: "subcategory" },
      { key: "location", label: "Module › Topic", scope: "client", column: "Module › Topic", dataKey: "location" },
      { key: "dates", label: "Dates", scope: "client", column: "Dates", dataKey: "dates" },
      { key: "questions", label: "Questions", scope: "service", column: "Questions", dataKey: "questions" },
      { key: "totalMarks", label: "Total Marks", scope: "service", column: "Total Marks", dataKey: "totalMarks" },
      { key: "attempted", label: "Attempted", scope: "service", column: "Attempted", dataKey: "attempted" },
      { key: "completed", label: "Completed", scope: "service", column: "Completed", dataKey: "completed" },
      { key: "avg", label: "Average %", scope: "service", column: "Avg %", dataKey: "avg" },
    ],
    defaults: new Set(["exercise", "type", "location", "questions", "totalMarks", "attempted", "completed", "avg"]),
  },
  "exercise-summary": {
    fields: [
      ...STUDENT_FIELDS,
      { key: "status", label: "Test Status", scope: "service", column: "Status", dataKey: "status" },
      { key: "attempted", label: "Attempted", scope: "service", column: "Attempted", dataKey: "attempted" },
      { key: "marks", label: "Marks", scope: "service", column: "Marks", dataKey: "marks" },
      { key: "percent", label: "Marks (100)", scope: "service", column: "Marks (100)", dataKey: "percent" },
      { key: "scale", label: "Performance Level", scope: "service", column: "Performance Level", dataKey: "scale" },
    ],
    defaults: new Set(["student", "regNo", "status", "marks", "percent", "scale"]),
  },
  "exercise-questions": {
    fields: [
      ...STUDENT_FIELDS,
      { key: "stMarks", label: "Total Marks", scope: "client", column: "Total Marks", dataKey: "stMarks" },
      { key: "stPercent", label: "Marks (100)", scope: "client", column: "Marks (100)", dataKey: "stPercent" },
      { key: "stStatus", label: "Test Status", scope: "client", column: "Test Status", dataKey: "stStatus" },
      ...QUESTION_FIELDS,
    ],
    defaults: new Set(["student", "regNo", "stMarks", "stStatus", "qNo", "question", "qMax", "qScored", "qStatus"]),
  },
  "student-totals": {
    fields: [
      { key: "regNo", label: "Register No", scope: "service", column: "Reg No", dataKey: "regNo" },
      { key: "student", label: "Student Name", required: true, scope: "service", column: "Student", dataKey: "student" },
      { key: "phase", label: "Phase", scope: "client", column: "Phase", dataKey: "client" },
      { key: "batch", label: "Batch", scope: "service", column: "Batch", dataKey: "batch", mergeGroup: true },
      { key: "email", label: "Email", scope: "service", column: "Email", dataKey: "email" },
      { key: "assignments", label: "Assignments Completed", scope: "service", column: "Assignments", dataKey: "assignments" },
      { key: "assessments", label: "Assessments Completed", scope: "service", column: "Assessments", dataKey: "assessments" },
      { key: "marks", label: "Total Marks", scope: "service", column: "Total Marks", dataKey: "marks" },
      { key: "percent", label: "Overall Percentage", scope: "service", column: "Overall %", dataKey: "percent" },
      { key: "scale", label: "Performance Level", scope: "service", column: "Performance Level", dataKey: "scale" },
    ],
    defaults: new Set(["phase", "batch", "student", "regNo", "assignments", "assessments", "marks", "percent", "scale"]),
  },
  "student-exercises": {
    fields: [
      ...STUDENT_FIELDS,
      { key: "overallMarks", label: "Overall Marks", scope: "client", column: "Overall Marks", dataKey: "overallMarks" },
      { key: "overallPercent", label: "Overall Percentage", scope: "client", column: "Overall %", dataKey: "overallPercent" },
      { key: "exercise", label: "Exercise", required: true, scope: "service", column: "Exercise", dataKey: "exercise" },
      { key: "type", label: "Type", scope: "service", column: "Type", dataKey: "type" },
      { key: "subcategory", label: "Subcategory", scope: "service", column: "Subcategory", dataKey: "subcategory" },
      { key: "location", label: "Module › Topic", scope: "service", column: "Module › Topic", dataKey: "location" },
      { key: "status", label: "Status", scope: "service", column: "Status", dataKey: "status" },
      { key: "marks", label: "Marks", scope: "service", column: "Marks", dataKey: "marks" },
      { key: "percent", label: "Marks (100)", scope: "service", column: "Marks (100)", dataKey: "percent" },
      { key: "scale", label: "Performance Level", scope: "service", column: "Performance Level", dataKey: "scale" },
    ],
    defaults: new Set(["student", "regNo", "overallPercent", "exercise", "type", "status", "marks", "percent"]),
  },
  "student-questions": {
    fields: [
      ...STUDENT_FIELDS,
      // The block is one STUDENT (one S. No. each). The exercise columns
      // merge down that exercise's questions (`mergeGroup`).
      { key: "exercise", label: "Exercise", required: true, scope: "service", column: "Exercise", dataKey: "exercise", mergeGroup: true },
      { key: "type", label: "Type", scope: "service", column: "Type", dataKey: "type", mergeGroup: true },
      { key: "exMarks", label: "Exercise Marks", scope: "service", column: "Exercise Marks", dataKey: "exMarks", mergeGroup: true },
      { key: "exPercent", label: "Marks (100)", scope: "service", column: "Marks (100)", dataKey: "exPercent", mergeGroup: true },
      ...QUESTION_FIELDS,
    ],
    defaults: new Set(["student", "regNo", "exercise", "exMarks", "qNo", "question", "qMax", "qScored", "qStatus"]),
  },
};

// ─── Blocks ─────────────────────────────────────────────────────────────────

const studentCells = (s: ReportStudent, src: PrintSources) => {
  const place = src.placeOf(s);
  return {
    client: s.name,
    business: s.regNo || "—",
    extras: { email: s.email || "—", phase: place.phase || "—", batch: place.batch || "—" },
  };
};

const answered = (r: StudentResult) => r.status !== "not-started";

const questionService = (q: QuestionRow): Record<string, string> => ({
  qNo: String(q.no),
  question: q.title,
  qType: q.type,
  difficulty: q.difficulty || "—",
  qSection: q.section || "—",
  qMax: String(round1(q.max)),
  qScored: q.status === "pending" || q.status === "not_answered" ? "—" : String(round1(q.scored)),
  qStatus: QUESTION_STATUS_LABEL[q.status],
});

// A student who never opened the exercise gets ONE line saying so, not a
// line per question all reading "Pending". A block with no rows prints
// nothing at all, so an empty question list gets a line too.
const NOT_STARTED: Record<string, string> = { qNo: "—", question: "Not started", qStatus: STATUS_LABEL["not-started"] };
const NO_QUESTIONS: Record<string, string> = { qNo: "—", question: "No questions in this exercise" };

const questionRows = (r: StudentResult, questions: QuestionRow[]) =>
  !answered(r) ? [NOT_STARTED] : questions.length ? questions.map(questionService) : [NO_QUESTIONS];

export interface PrintSources {
  /** The student's phase(s) and batch name(s), each on its own. */
  placeOf: (student: ReportStudent) => { phase: string; batch: string };
  resultOf: (exerciseId: string, studentId: string) => StudentResult;
  questionsOf: (exercise: ReportExercise, student: ReportStudent) => QuestionRow[];
  totalsOf: (student: ReportStudent) => StudentTotals;
  /** Whether the exercise is set for the student's batch. */
  appliesTo: (exercise: ReportExercise, student: ReportStudent) => boolean;
}

/** By Exercise list: one line per exercise with the roster's figures. */
export function exerciseListBlocks(
  exercises: ReportExercise[],
  tally: (exercise: ReportExercise) => { students: number; attempted: number; completed: number; avg: number | null },
  dates: (exercise: ReportExercise) => string,
): ReportClientBlock[] {
  return exercises.map((ex) => {
    const t = tally(ex);
    return {
      client: ex.name,
      business: ex.type,
      clientExtras: { subcategory: ex.subcategory || "—", location: ex.location || "—", dates: dates(ex) },
      services: [{
        questions: String(ex.questionCount),
        totalMarks: String(round1(ex.totalMarks)),
        attempted: `${t.attempted} / ${t.students}`,
        completed: `${t.completed} / ${t.students}`,
        avg: formatPercent(t.avg),
      }],
    };
  });
}

/** By Exercise: the chosen students in ONE exercise. */
export function exerciseBlocks(
  layout: "exercise-summary" | "exercise-questions",
  exercise: ReportExercise,
  students: ReportStudent[],
  src: PrintSources,
): ReportClientBlock[] {
  return students.map((s) => {
    const r = src.resultOf(exercise.id, s.id);
    const cells = studentCells(s, src);
    if (layout === "exercise-summary") {
      return {
        client: cells.client,
        business: cells.business,
        clientExtras: cells.extras,
        services: [{
          status: STATUS_LABEL[r.status],
          attempted: `${r.attempted} / ${r.totalQuestions}`,
          marks: formatMarks(r.scored, r.total, answered(r)),
          percent: formatPercent(r.percent),
          scale: r.scale || "—",
        }],
      };
    }
    return {
      client: cells.client,
      business: cells.business,
      clientExtras: {
        ...cells.extras,
        stMarks: formatMarks(r.scored, r.total, answered(r)),
        stPercent: formatPercent(r.percent),
        stStatus: STATUS_LABEL[r.status],
      },
      services: questionRows(r, answered(r) ? src.questionsOf(exercise, s) : []),
    };
  });
}

/** One student under one batch — the student list's own line. */
export interface StudentLine {
  student: ReportStudent;
  phase: string;
  batchId: string;
  batch: string;
}

/** By Student, totals: the same lines the list shows, in its order. Each
 *  PHASE is a block (one Phase cell over its students); the Batch cell
 *  merges down its students; every student row has its own S. No. (the
 *  modal is opened with `serialPerRow`). An unphased course is one block
 *  with no Phase column. */
export function studentTotalsBlocks(lines: StudentLine[], src: PrintSources, phased: boolean): ReportClientBlock[] {
  const blocks: ReportClientBlock[] = [];
  let current: ReportClientBlock | null = null;
  let currentPhase: string | null = null;
  for (const l of lines) {
    const phase = phased ? l.phase || "—" : "";
    if (!current || currentPhase !== phase) {
      current = { client: phase, business: "", services: [] };
      blocks.push(current);
      currentPhase = phase;
    }
    const t = src.totalsOf(l.student);
    current.services.push({
      __batchId: l.batchId,
      batch: l.batch || "No batch",
      regNo: l.student.regNo || "—",
      student: l.student.name,
      email: l.student.email || "—",
      assignments: `${t.assignmentsDone} / ${t.assignmentsTotal}`,
      assessments: `${t.assessmentsDone} / ${t.assessmentsTotal}`,
      marks: `${round1(t.scored)} / ${round1(t.total)}`,
      percent: formatPercent(t.percent),
      scale: t.scale || "—",
    });
  }
  // Mark each batch's run of rows so the Batch column merges over it.
  for (const block of blocks) {
    const rows = block.services;
    for (let i = 0; i < rows.length;) {
      let j = i;
      while (j < rows.length && rows[j].__batchId === rows[i].__batchId) j++;
      rows[i][GROUP_SPAN_KEY] = String(j - i);
      for (let k = i + 1; k < j; k++) rows[k][GROUP_SPAN_KEY] = "0";
      i = j;
    }
  }
  return blocks;
}

/** By Student: the chosen students across the filtered exercises (each
 *  student only across the exercises set for their batch). */
export function studentBlocks(
  layout: "student-exercises" | "student-questions",
  students: ReportStudent[],
  exercises: ReportExercise[],
  src: PrintSources,
): ReportClientBlock[] {
  return students.map((s) => {
    const cells = studentCells(s, src);
    const t = src.totalsOf(s);
    const own = exercises.filter((ex) => src.appliesTo(ex, s));

    if (layout === "student-exercises") {
      return {
        client: cells.client,
        business: cells.business,
        clientExtras: {
          ...cells.extras,
          overallMarks: `${round1(t.scored)} / ${round1(t.total)}`,
          overallPercent: formatPercent(t.percent),
        },
        services: own.length
          ? own.map((ex) => {
            const r = src.resultOf(ex.id, s.id);
            return {
              exercise: ex.name,
              type: ex.type,
              subcategory: ex.subcategory,
              location: ex.location || "—",
              status: STATUS_LABEL[r.status],
              marks: formatMarks(r.scored, r.total, answered(r)),
              percent: formatPercent(r.percent),
              scale: r.scale || "—",
            };
          })
          : [{ exercise: "No exercises match the filters" }],
      };
    }

    // student-questions: one block per student; each exercise is a group of
    // rows whose exercise cells merge down its questions.
    const services: Record<string, string>[] = [];
    for (const ex of own) {
      const r = src.resultOf(ex.id, s.id);
      const head = {
        exercise: ex.name,
        type: ex.type,
        exMarks: formatMarks(r.scored, r.total, answered(r)),
        exPercent: formatPercent(r.percent),
      };
      const rows = questionRows(r, answered(r) ? src.questionsOf(ex, s) : []);
      rows.forEach((row, i) => services.push({
        ...head,
        ...row,
        [GROUP_SPAN_KEY]: i === 0 ? String(rows.length) : "0",
      }));
    }
    return {
      client: cells.client,
      business: cells.business,
      clientExtras: cells.extras,
      services: services.length ? services : [{ exercise: "No exercises match the filters" }],
    };
  });
}
