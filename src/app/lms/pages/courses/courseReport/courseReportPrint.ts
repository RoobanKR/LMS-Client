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
  "exercise-questions": { label: "With question details", hint: "One row per student, a column per question" },
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

// The exercise figures on a "With question details" sheet, in the order the
// team's own sheets put them: Performance Level, Marks(100), Marks(total).
const QUESTION_SHEET_TOTALS: FieldRow[] = [
  { key: "stStatus", label: "Test Status", scope: "service", column: "Test Status", dataKey: "stStatus" },
  { key: "scale", label: "Performance Level", scope: "service", column: "Performance Level", dataKey: "scale" },
  { key: "stPercent", label: "Marks (100)", scope: "service", column: "Marks (100)", dataKey: "stPercent" },
  { key: "stMarks", label: "Total Marks", scope: "service", column: "Total Marks", dataKey: "stMarks" },
];

const questionKey = (questionId: string) => `q_${questionId}`;

// A non-graded exercise records no marks: its own sheets leave these out.
const MARK_KEYS = new Set(["marks", "percent", "scale", "stPercent", "stMarks"]);
const withoutMarks = (set: { fields: FieldRow[]; defaults: Set<string> }) => ({
  fields: set.fields.filter((f) => !MARK_KEYS.has(f.key)),
  defaults: new Set([...set.defaults].filter((k) => !MARK_KEYS.has(k))),
});

/** "Summary" fields for one exercise — without the marks for a non-graded one. */
export const exerciseSummaryFields = (graded: boolean) =>
  graded ? LAYOUT_FIELDS["exercise-summary"] : withoutMarks(LAYOUT_FIELDS["exercise-summary"]);

/** Field key for an activity's "completed / set" column. */
const activityFieldKey = (activityKey: string) => `act_${activityKey.replace(/[^a-z0-9]+/gi, "_")}`;

/** "Totals only" fields: the student, one "completed / set" column per
 *  activity — the course's own names (Practical, Practice…) — then marks. */
export function studentTotalsFields(activities: { key: string; label: string }[]): { fields: FieldRow[]; defaults: Set<string> } {
  const base = LAYOUT_FIELDS["student-totals"];
  const perActivity: FieldRow[] = activities.map((a) => ({
    key: activityFieldKey(a.key),
    label: `${a.label} Completed`,
    scope: "service",
    column: a.label,
    dataKey: activityFieldKey(a.key),
  }));
  const at = base.fields.findIndex((f) => f.key === "marks");
  return {
    fields: [...base.fields.slice(0, at), ...perActivity, ...base.fields.slice(at)],
    defaults: new Set([...base.defaults, ...perActivity.map((f) => f.key)]),
  };
}

export interface QuestionColumn { id: string; no: number; title: string; max: number }

/** The questions of one exercise for these students, in question order —
 *  the columns of its "With question details" sheet. */
export function exerciseQuestionColumns(
  exercise: ReportExercise,
  students: ReportStudent[],
  src: PrintSources,
): QuestionColumn[] {
  const seen = new Map<string, QuestionColumn>();
  for (const s of students) {
    for (const q of src.questionsOf(exercise, s)) {
      if (!seen.has(q.questionId)) seen.set(q.questionId, { id: q.questionId, no: q.no, title: q.title, max: q.max });
    }
  }
  return [...seen.values()].sort((a, b) => a.no - b.no);
}

/** "With question details" fields: the student, the exercise figures, then
 *  one column per question — "1. Title (10)" holding the marks scored. A
 *  non-graded exercise has no marks: its question columns ("1. Title") hold
 *  each question's status, and the Test Status shows instead of the marks. */
export function exerciseQuestionFields(questions: QuestionColumn[], graded = true): { fields: FieldRow[]; defaults: Set<string> } {
  const perQuestion: FieldRow[] = questions.map((q) => ({
    key: questionKey(q.id),
    label: `${q.no}. ${q.title}`,
    scope: "service",
    column: graded ? `${q.no}. ${q.title} (${round1(q.max)})` : `${q.no}. ${q.title}`,
    dataKey: questionKey(q.id),
  }));
  const base = graded ? LAYOUT_FIELDS["exercise-questions"] : withoutMarks(LAYOUT_FIELDS["exercise-questions"]);
  return {
    fields: [...base.fields, ...perQuestion],
    defaults: new Set([...base.defaults, ...(graded ? [] : ["stStatus"]), ...perQuestion.map((f) => f.key)]),
  };
}

export const LAYOUT_FIELDS: Record<PrintLayout, { fields: FieldRow[]; defaults: Set<string> }> = {
  "exercise-list": {
    fields: [
      { key: "exercise", label: "Exercise", required: true, scope: "client", column: "Exercise", dataKey: "client" },
      { key: "type", label: "Activity", scope: "client", column: "Activity", dataKey: "business" },
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
  // One row per student; the per-question columns depend on the exercise, so
  // the printed sheet takes its fields from exerciseQuestionFields() — this
  // entry is the question-less base.
  "exercise-questions": {
    fields: [...STUDENT_FIELDS, ...QUESTION_SHEET_TOTALS],
    defaults: new Set(["student", "regNo", "scale", "stPercent", "stMarks"]),
  },
  "student-totals": {
    fields: [
      { key: "regNo", label: "Register No", scope: "service", column: "Reg No", dataKey: "regNo" },
      { key: "student", label: "Student Name", required: true, scope: "service", column: "Student", dataKey: "student" },
      { key: "phase", label: "Phase", scope: "client", column: "Phase", dataKey: "client" },
      { key: "batch", label: "Batch", scope: "service", column: "Batch", dataKey: "batch", mergeGroup: true },
      { key: "email", label: "Email", scope: "service", column: "Email", dataKey: "email" },
      // One "completed / set" column per activity comes from studentTotalsFields().
      { key: "marks", label: "Total Marks", scope: "service", column: "Total Marks", dataKey: "marks" },
      { key: "percent", label: "Overall Percentage", scope: "service", column: "Overall %", dataKey: "percent" },
      { key: "scale", label: "Performance Level", scope: "service", column: "Performance Level", dataKey: "scale" },
    ],
    defaults: new Set(["phase", "batch", "student", "regNo", "marks", "percent", "scale"]),
  },
  "student-exercises": {
    fields: [
      ...STUDENT_FIELDS,
      { key: "overallMarks", label: "Overall Marks", scope: "client", column: "Overall Marks", dataKey: "overallMarks" },
      { key: "overallPercent", label: "Overall Percentage", scope: "client", column: "Overall %", dataKey: "overallPercent" },
      { key: "exercise", label: "Exercise", required: true, scope: "service", column: "Exercise", dataKey: "exercise" },
      { key: "type", label: "Activity", scope: "service", column: "Activity", dataKey: "type" },
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
      { key: "type", label: "Activity", scope: "service", column: "Activity", dataKey: "type", mergeGroup: true },
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

// `graded` false: a non-graded exercise's question — no Max / Scored.
const questionService = (q: QuestionRow, graded = true): Record<string, string> => ({
  qNo: String(q.no),
  question: q.title,
  qType: q.type,
  difficulty: q.difficulty || "—",
  qSection: q.section || "—",
  qMax: graded ? String(round1(q.max)) : "—",
  qScored: !graded || q.status === "pending" || q.status === "not_answered" ? "—" : String(round1(q.scored)),
  qStatus: QUESTION_STATUS_LABEL[q.status],
});

// A student who never opened the exercise gets ONE line saying so, not a
// line per question all reading "Pending". A block with no rows prints
// nothing at all, so an empty question list gets a line too.
const NOT_STARTED: Record<string, string> = { qNo: "—", question: "Not started", qStatus: STATUS_LABEL["not-started"] };
const NO_QUESTIONS: Record<string, string> = { qNo: "—", question: "No questions in this exercise" };

const questionRows = (r: StudentResult, questions: QuestionRow[], graded: boolean) =>
  !answered(r) ? [NOT_STARTED] : questions.length ? questions.map((q) => questionService(q, graded)) : [NO_QUESTIONS];

/** An exercise's marks as a mixed sheet prints them: "Non-graded" when it has none. */
const marksText = (ex: ReportExercise, r: StudentResult) =>
  ex.graded ? formatMarks(r.scored, r.total, answered(r)) : "Non-graded";

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
      business: ex.activity,
      clientExtras: { location: ex.location || "—", dates: dates(ex) },
      services: [{
        questions: String(ex.questionCount),
        totalMarks: ex.graded ? String(round1(ex.totalMarks)) : "Non-graded",
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
    // With question details: ONE row per student, each question's marks in
    // its own column (exerciseQuestionFields). An answer not given — or not
    // evaluated yet — reads 0, as on the Excel sheet; a student who never
    // started has the question columns empty. A non-graded exercise prints
    // each question's status instead.
    const perQuestion: Record<string, string> = {};
    if (answered(r)) {
      for (const q of src.questionsOf(exercise, s)) {
        perQuestion[questionKey(q.questionId)] = !exercise.graded
          ? QUESTION_STATUS_LABEL[q.status]
          : q.status === "pending" || q.status === "not_answered" ? "0" : String(round1(q.scored));
      }
    }
    return {
      client: cells.client,
      business: cells.business,
      clientExtras: cells.extras,
      services: [{
        stStatus: STATUS_LABEL[r.status],
        scale: r.scale || "—",
        stPercent: formatPercent(r.percent),
        stMarks: formatMarks(r.scored, r.total, answered(r)),
        ...perQuestion,
      }],
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
      ...Object.fromEntries(Object.entries(t.activities).map(([k, c]) => [activityFieldKey(k), `${c.done} / ${c.total}`])),
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
              type: ex.activity,
              location: ex.location || "—",
              status: STATUS_LABEL[r.status],
              marks: marksText(ex, r),
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
        type: ex.activity,
        exMarks: marksText(ex, r),
        exPercent: formatPercent(r.percent),
      };
      const rows = questionRows(r, answered(r) ? src.questionsOf(ex, s) : [], ex.graded);
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
