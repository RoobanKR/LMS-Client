// Course Insights — the course's We Do / You Do work as students' stored
// answers show it: per exercise, per student and per question. Built on the
// Course Report's payload and marks functions, so the two never disagree.

import {
  appliesTo, questionsFor, resultFor, round1,
  type QuestionRow, type ReportExercise, type ReportStudent, type StudentResult,
} from "@/app/lms/pages/courses/courseReport/reportData";

type Loose = Record<string, any>;

/** One student in one exercise. */
export interface Cell {
  result: StudentResult;
  questions: QuestionRow[];
  /** Questions answered (submitted or graded). */
  solved: number;
  /** Answers that are fully right (every test passed, a correct MCQ, …). */
  correct: number;
  /** Test cases passed, out of every test the exercise's questions have —
   *  an unanswered question's tests count as not passed. */
  testsPassed: number;
  testsTotal: number;
}

const answered = (q: QuestionRow) => q.status === "submitted" || q.status === "evaluated";

/** The test cases each question carries in the exercise itself. */
const definedTests = (exercise: ReportExercise): Map<string, number> => {
  const out = new Map<string, number>();
  for (const q of (exercise.raw?.questions || []) as Loose[]) {
    out.set(String(q?._id), Array.isArray(q?.testCases) ? q.testCases.length : 0);
  }
  return out;
};

export function cellFor(courseId: string, exercise: ReportExercise, student: ReportStudent, tests?: Map<string, number>): Cell {
  const result = resultFor(courseId, exercise, student);
  // A student who never opened it has nothing to break down.
  const questions = result.status === "not-started" ? [] : questionsFor(courseId, exercise, student, result);
  const perQ = tests || definedTests(exercise);
  let solved = 0, correct = 0, testsPassed = 0, testsTotal = 0;
  if (questions.length) {
    for (const q of questions) {
      if (answered(q)) solved += 1;
      if (q.correct) correct += 1;
      testsPassed += q.testsPassed ?? 0;
      testsTotal += q.testsTotal ?? perQ.get(q.questionId) ?? 0;
    }
  } else {
    for (const n of perQ.values()) testsTotal += n;
  }
  return { result, questions, solved, correct, testsPassed, testsTotal };
}

/** Every (exercise, student) cell for the exercises and students given —
 *  only where the exercise is set for the student's batch. */
export function buildCells(courseId: string, exercises: ReportExercise[], students: ReportStudent[]): Map<string, Cell> {
  const cells = new Map<string, Cell>();
  for (const ex of exercises) {
    const tests = definedTests(ex);
    for (const s of students) {
      if (!appliesTo(ex, s)) continue;
      cells.set(`${ex.id}|${s.id}`, cellFor(courseId, ex, s, tests));
    }
  }
  return cells;
}

export const cellKey = (exerciseId: string, studentId: string) => `${exerciseId}|${studentId}`;

/** Sums over a set of cells — the figures every table and tile prints. */
export interface Totals {
  cells: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  solved: number;
  /** Questions the cells could have answered. */
  possible: number;
  correct: number;
  testsPassed: number;
  testsTotal: number;
  /** Marks over graded exercises only. */
  scored: number;
  marksTotal: number;
  gradedCells: number;
  /** Average percentage over completed, graded attempts. */
  avgPercent: number | null;
}

export function sumCells(list: { cell: Cell; exercise: ReportExercise }[]): Totals {
  const t: Totals = {
    cells: list.length, completed: 0, inProgress: 0, notStarted: 0, solved: 0, possible: 0, correct: 0,
    testsPassed: 0, testsTotal: 0, scored: 0, marksTotal: 0, gradedCells: 0, avgPercent: null,
  };
  let pctSum = 0, pctN = 0;
  for (const { cell, exercise } of list) {
    const r = cell.result;
    if (r.status === "completed") t.completed += 1;
    else if (r.status === "in-progress") t.inProgress += 1;
    else t.notStarted += 1;
    t.solved += cell.solved;
    t.possible += r.totalQuestions || exercise.questionCount;
    t.correct += cell.correct;
    t.testsPassed += cell.testsPassed;
    t.testsTotal += cell.testsTotal;
    if (exercise.graded) {
      t.gradedCells += 1;
      t.marksTotal += r.total;
      if (r.status !== "not-started") t.scored += r.scored;
      if (r.status === "completed" && r.percent != null) { pctSum += r.percent; pctN += 1; }
    }
  }
  t.avgPercent = pctN ? pctSum / pctN : null;
  return t;
}

/** "45%" of a part over a whole, or "—" when there is no whole. */
export const pct = (part: number, whole: number): string =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";

export const ratio = (part: number, whole: number): number | null => (whole > 0 ? part / whole : null);

/** One question across the students who were set the exercise. */
export interface QuestionInsight {
  questionId: string;
  no: number;
  title: string;
  difficulty: string;
  max: number;
  students: number;
  answered: number;
  correct: number;
  testsPassed: number;
  testsTotal: number;
  /** Average marks over the students who answered (graded exercises). */
  avgMarks: number | null;
}

export function questionInsights(exercise: ReportExercise, cells: Cell[]): QuestionInsight[] {
  const defined = definedTests(exercise);
  const byId = new Map<string, QuestionInsight & { marksSum: number }>();
  ((exercise.raw?.questions || []) as Loose[]).forEach((q, i) => {
    const id = String(q?._id);
    byId.set(id, {
      questionId: id, no: i + 1,
      title: "", difficulty: "", max: 0,
      students: cells.length, answered: 0, correct: 0, testsPassed: 0, testsTotal: 0,
      avgMarks: null, marksSum: 0,
    });
  });
  for (const cell of cells) {
    const seen = new Set<string>();
    for (const q of cell.questions) {
      const row = byId.get(q.questionId);
      if (!row) continue;
      seen.add(q.questionId);
      row.title = row.title || q.title;
      row.difficulty = row.difficulty || q.difficulty;
      row.max = q.max;
      if (answered(q)) { row.answered += 1; row.marksSum += q.scored; }
      if (q.correct) row.correct += 1;
      row.testsPassed += q.testsPassed ?? 0;
      row.testsTotal += q.testsTotal ?? defined.get(q.questionId) ?? 0;
    }
    // A student who never started still counts every test as not passed.
    for (const [id, row] of byId) if (!seen.has(id)) row.testsTotal += defined.get(id) ?? 0;
  }
  // Titles for questions nobody has answered yet come from the exercise.
  ((exercise.raw?.questions || []) as Loose[]).forEach((q, i) => {
    const row = byId.get(String(q?._id));
    if (row && !row.title) row.title = String(q?.title || q?.mcqQuestionTitle || `Question ${i + 1}`).replace(/<[^>]*>/g, "");
  });
  return [...byId.values()].map(({ marksSum, ...row }) => ({
    ...row,
    avgMarks: exercise.graded && row.answered ? round1(marksSum / row.answered) : null,
  }));
}
