// Course Report — the data layer.
//
// Everything on the Report page is derived from ONE payload: the same
// `/getAll/courses-data/{courseId}` response the Live Dashboard loads. It
// already carries every node's pedagogy (so every exercise) and every enrolled
// user with their stored answers (so every result), which means both views —
// by exercise and by student — are pure functions of it and no extra request
// is made per exercise or per student.
//
// The marks themselves are NOT recomputed here. `computeStudentMarks` and
// `getStudentQuestionsBreakdown` are the functions the Live Dashboard uses, so
// a number on this report is the number the trainer sees there.

import {
  computeStudentMarks,
  getStudentQuestionsBreakdown,
  scaleForPercent,
  type BreakdownStatus,
  type GradeBand,
} from "@/app/lms/pages/courses/liveDashboard/utils/computeStudentMarks";
import type { ExerciseView } from "./reportApi";

type Loose = Record<string, any>;

export type Section = "We_Do" | "You_Do";
export type ActivityType = "Assignment" | "Assessment";

export const ACTIVITY_OF: Record<Section, ActivityType> = {
  We_Do: "Assignment",
  You_Do: "Assessment",
};

export interface ReportExercise {
  id: string;
  name: string;
  section: Section;
  type: ActivityType;
  /** The pedagogy map key ("coding_test"), which is what filters compare. */
  subcategoryKey: string;
  /** "Coding Test" — the key made readable. */
  subcategory: string;
  module: string;
  subModule: string;
  topic: string;
  subTopic: string;
  /** "Module › Topic", skipping the levels this exercise does not sit under. */
  location: string;
  level: string;
  questionCount: number;
  totalMarks: number;
  startDate: string | null;
  endDate: string | null;
  /** The raw exercise, handed to the marks functions. */
  raw: Loose;
  /** A one-exercise stand-in for the course payload (see `miniCourseFor`). */
  mini: Loose;
  bands: GradeBand[];
  /** The batches this exercise is set for; null when every batch has it. */
  batchIds: Set<string> | null;
}

export interface ReportStudent {
  id: string;
  name: string;
  email: string;
  /** Trainer-entered register number, else the generated user id. */
  regNo: string;
  /** Every batch the student is enrolled in, joined. */
  batch: string;
  batches: string[];
  /** The same batches, by id — what exercises are matched against. */
  batchIds: string[];
  participant: Loose;
}

export type ResultStatus = "completed" | "in-progress" | "not-started";

export const STATUS_LABEL: Record<ResultStatus, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  "not-started": "Not Started",
};

export interface StudentResult {
  status: ResultStatus;
  scored: number;
  total: number;
  /** Null until the student has answered something — "—", not "0%". */
  percent: number | null;
  scale: string;
  attempted: number;
  totalQuestions: number;
}

export interface QuestionRow {
  questionId: string;
  no: number;
  title: string;
  type: string;
  difficulty: string;
  section: string;
  max: number;
  scored: number;
  status: BreakdownStatus;
}

export const QUESTION_STATUS_LABEL: Record<BreakdownStatus, string> = {
  evaluated: "Evaluated",
  submitted: "Submitted",
  not_answered: "Not Answered",
  pending: "Pending",
};

// ─── Small helpers ──────────────────────────────────────────────────────────

const idOf = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Loose;
    if (typeof o.$oid === "string") return o.$oid;
    if (o._id != null) return idOf(o._id);
  }
  return String(v);
};

const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map(text).filter(Boolean).join(" ");
  if (typeof v === "object") return text((v as Loose).value ?? (v as Loose).text ?? "");
  return String(v);
};

/** "coding_test" → "Coding Test". Keys are the course's own labels, lower-
 *  cased with spaces underscored, so this only has to undo that. */
export const humanize = (key: string): string =>
  key
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    // The default You Do subcategory is stored misspelt; show it spelt right.
    .replace(/\bAssesment\b/g, "Assessment");

export const round1 = (n: number): number => Math.round(n * 10) / 10;

export const formatPercent = (pct: number | null): string =>
  pct == null ? "—" : `${round1(pct)}%`;

export const formatMarks = (scored: number, total: number, answered: boolean): string =>
  answered ? `${round1(scored)} / ${round1(total)}` : `— / ${round1(total)}`;

export const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

// Mirrors the Live Dashboard's scale fallback, which lives unexported beside
// getExerciseGradeBands; kept in step with it by hand.
const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { label: "Poor", fromPercent: 0, toPercent: 40 },
  { label: "Average", fromPercent: 40, toPercent: 60 },
  { label: "Good", fromPercent: 60, toPercent: 80 },
  { label: "Excellent", fromPercent: 80, toPercent: 100 },
];

const bandsOf = (exercise: Loose): GradeBand[] => {
  const raw = exercise?.gradeSettings?.gradeBands;
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_GRADE_BANDS;
  const bands = raw
    .map((b: Loose): GradeBand => ({
      label: typeof b?.label === "string" ? b.label : String(b?.label ?? ""),
      fromPercent: Number(b?.fromPercent) || 0,
      toPercent: Number(b?.toPercent) || 0,
    }))
    .filter((b) => b.label.trim() !== "")
    .sort((a, b) => a.fromPercent - b.fromPercent);
  return bands.length ? bands : DEFAULT_GRADE_BANDS;
};

/** The marks functions locate the exercise by walking the whole course tree
 *  on every call. Handing them a course that holds just this one exercise
 *  keeps a students × exercises matrix from walking the tree thousands of
 *  times, and cannot change the answer: the walk only ever returns the
 *  exercise itself. */
const miniCourseFor = (section: Section, exercise: Loose): Loose => ({
  modules: [{ pedagogy: { [section]: { report: [exercise] } } }],
});

// ─── Exercises ──────────────────────────────────────────────────────────────

type Place = { module: string; subModule: string; topic: string; subTopic: string };

/** Every We Do / You Do exercise in the course, in syllabus order, as the
 *  batches see them. `views` is one course payload per batch (or a single
 *  one when every batch has the same material); an exercise in several views
 *  is listed once, carrying every batch it belongs to. Walks the same four
 *  levels `findExerciseInCourseData` does. An exercise with no questions has
 *  nothing to report and is left out. */
export function collectExercises(views: ExerciseView[]): ReportExercise[] {
  const byId = new Map<string, ReportExercise & { order: number }>();
  views.forEach((view, viewIdx) => collectView(view, viewIdx, byId));
  const out = [...byId.values()].sort((a, b) => a.order - b.order);

  // The exercise's total, taken the way the marks function takes it (it
  // accounts for section-based and dynamic totals that a plain sum of
  // question marks would miss). A participant with no courses yields zero
  // marks but the correct total.
  for (const ex of out) {
    ex.totalMarks = computeStudentMarks({
      courseData: ex.mini,
      courseId: "",
      exerciseId: ex.id,
      participant: { user: { courses: [] } },
    }).totalMarks;
  }
  return out;
}

/** Is this exercise set for (one of) this student's batches? */
export const appliesTo = (exercise: ReportExercise, student: ReportStudent): boolean =>
  !exercise.batchIds || student.batchIds.some((id) => exercise.batchIds!.has(id));

function collectView(view: ExerciseView, viewIdx: number, byId: Map<string, ReportExercise & { order: number }>) {
  const courseData = view.data;
  if (!courseData || !Array.isArray(courseData.modules)) return;
  // Every view walks the same tree, so a node's sequence number is the same
  // in each — which keeps a batch's own exercises in syllabus position.
  let nodeSeq = 0;

  const take = (pedagogy: Loose | undefined, place: Place) => {
    nodeSeq += 1;
    if (!pedagogy) return;
    (["We_Do", "You_Do"] as const).forEach((section, sectionIdx) => {
      const tab = pedagogy[section];
      if (!tab || typeof tab !== "object") return;
      let pos = 0;
      for (const [subKey, list] of Object.entries(tab)) {
        if (!Array.isArray(list)) continue;
        for (const ex of list as Loose[]) {
          pos += 1;
          const id = idOf(ex?._id);
          const name = text(ex?.exerciseInformation?.exerciseName);
          const questions = Array.isArray(ex?.questions) ? ex.questions : [];
          if (!id || !name || !questions.length) continue;
          const known = byId.get(id);
          if (known) {
            if (known.batchIds && view.batchIds) view.batchIds.forEach((b) => known.batchIds!.add(b));
            else known.batchIds = null;
            continue;
          }
          const mini = miniCourseFor(section, ex);
          byId.set(id, {
            id,
            name,
            section,
            type: ACTIVITY_OF[section],
            subcategoryKey: subKey,
            subcategory: humanize(subKey),
            ...place,
            location: [place.module, place.subModule, place.topic, place.subTopic]
              .filter(Boolean)
              .join(" › "),
            level: humanize(String(ex?.exerciseInformation?.exerciseLevel || "")),
            questionCount: questions.length,
            // Filled in below from the marks function, so the total matches
            // what every student's "x / total" shows.
            totalMarks: 0,
            startDate: ex?.availabilityPeriod?.startDate || null,
            endDate: ex?.availabilityPeriod?.endDate || null,
            raw: ex,
            mini,
            bands: bandsOf(ex),
            batchIds: view.batchIds ? new Set(view.batchIds) : null,
            order: nodeSeq * 1e6 + sectionIdx * 1e5 + viewIdx * 1e3 + pos,
          });
        }
      }
    });
  };

  for (const mod of courseData.modules as Loose[]) {
    const module = text(mod?.title);
    take(mod?.pedagogy, { module, subModule: "", topic: "", subTopic: "" });
    const topicsUnder = (topics: Loose[] | undefined, subModule: string) => {
      for (const topic of topics || []) {
        const topicName = text(topic?.title);
        take(topic?.pedagogy, { module, subModule, topic: topicName, subTopic: "" });
        for (const st of topic?.subTopics || []) {
          take(st?.pedagogy, { module, subModule, topic: topicName, subTopic: text(st?.title) });
        }
      }
    };
    topicsUnder(mod?.topics, "");
    for (const sub of mod?.subModules || []) {
      const subModule = text(sub?.title);
      take(sub?.pedagogy, { module, subModule, topic: "", subTopic: "" });
      topicsUnder(sub?.topics, subModule);
    }
  }
}

// ─── Students ───────────────────────────────────────────────────────────────

// A batch's `users[]` also holds the trainers who serve it, so the roster is
// filtered to students the same way the Live Dashboard's server does
// (utils/batchResources.js `isStudentUser`, plus the legacy string role).
const isStudent = (user: Loose | null | undefined): boolean => {
  const role = user?.role;
  if (typeof role === "string") return role.trim().toLowerCase() === "student";
  if (!role || typeof role !== "object") return false;
  return [role.originalRole, role.renameRole, role.roleName, role.roleValue]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes("student");
};

/** How a batch reads on the report ("Phase 1 · Batch A"). */
export const batchLabel = (batch: Loose | null | undefined): string =>
  [text(batch?.phase), text(batch?.batchName)].filter(Boolean).join(" · ");

/** Enrolled students, one entry each even when enrolled in several batches. */
export function collectStudents(courseData: Loose | null | undefined): ReportStudent[] {
  const byId = new Map<string, ReportStudent>();
  for (const batch of (courseData?.batchAndParticipants || []) as Loose[]) {
    const batchName = batchLabel(batch);
    const batchId = idOf(batch?._id);
    for (const participant of (batch?.users || []) as Loose[]) {
      const user = participant?.user;
      if (!user || typeof user !== "object" || !isStudent(user)) continue;
      const id = idOf(user._id);
      if (!id) continue;
      const existing = byId.get(id);
      if (existing) {
        if (batchName && !existing.batches.includes(batchName)) {
          existing.batches.push(batchName);
          existing.batch = existing.batches.join(", ");
        }
        if (batchId && !existing.batchIds.includes(batchId)) existing.batchIds.push(batchId);
        continue;
      }
      const name = [text(user.firstName), text(user.lastName)].filter(Boolean).join(" ") || text(user.email) || "Student";
      byId.set(id, {
        id,
        name,
        email: text(user.email),
        regNo: text(user.rollNumber) || text(user.userId),
        batch: batchName,
        batches: batchName ? [batchName] : [],
        batchIds: batchId ? [batchId] : [],
        participant,
      });
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

// ─── Results ────────────────────────────────────────────────────────────────

/** One student's standing in one exercise. */
export function resultFor(
  courseId: string,
  exercise: ReportExercise,
  student: ReportStudent,
): StudentResult {
  const marks = computeStudentMarks({
    courseData: exercise.mini,
    courseId,
    exerciseId: exercise.id,
    participant: student.participant,
  });
  // Same reading the Live Dashboard gives these flags: a terminal answer
  // document is "submitted", any stored answer is "started".
  const status: ResultStatus = marks.parentSubmitted
    ? "completed"
    : marks.hasSubmitted
      ? "in-progress"
      : "not-started";
  const percent = marks.hasSubmitted && marks.totalMarks > 0
    ? (marks.scoredMarks / marks.totalMarks) * 100
    : null;
  return {
    status,
    scored: marks.hasSubmitted ? marks.scoredMarks : 0,
    total: marks.totalMarks,
    percent,
    // A grade describes a finished attempt; a partial one has no grade yet.
    scale: status === "completed" ? scaleForPercent(percent, exercise.bands) : "",
    attempted: marks.completedQuestions,
    totalQuestions: marks.totalQuestions,
  };
}

/** One student's per-question marks in one exercise. */
export function questionsFor(
  courseId: string,
  exercise: ReportExercise,
  student: ReportStudent,
  result: StudentResult,
): QuestionRow[] {
  const rows = getStudentQuestionsBreakdown({
    courseData: exercise.mini,
    courseId,
    exerciseId: exercise.id,
    participant: student.participant,
    studentSubmitted: result.status === "completed",
  });
  const difficultyById = new Map<string, string>(
    ((exercise.raw.questions || []) as Loose[]).map((q) => [idOf(q?._id), humanize(String(q?.difficulty || ""))]),
  );
  return rows.map((r) => ({
    questionId: r.questionId,
    no: r.questionNo,
    title: r.title,
    type: r.type,
    difficulty: difficultyById.get(r.questionId) || "",
    section: r.sectionName,
    max: r.totalMark,
    scored: r.scoredMark,
    status: r.status,
  }));
}

/** Totals for a student across a set of exercises. The overall percentage is
 *  marks-weighted — sum scored ÷ sum of the exercises' totals, the same two
 *  numbers the Marks column prints — so a 100-mark assessment counts for more
 *  than a 10-mark quiz. An exercise not attempted counts as zero once it is
 *  due; one still open and not yet started is left out (`open`), so a
 *  student is not marked down for work that is not due yet. Exercises the
 *  student's batch does not have (`results` gives undefined) are skipped. */
export interface StudentTotals {
  assignmentsDone: number;
  assignmentsTotal: number;
  assessmentsDone: number;
  assessmentsTotal: number;
  scored: number;
  total: number;
  percent: number | null;
  scale: string;
  /** Open, not-started exercises left out of `total`. */
  open: number;
}

export function totalsFor(
  exercises: ReportExercise[],
  results: (exerciseId: string) => StudentResult | undefined,
  now: number = Date.now(),
): StudentTotals {
  const t: StudentTotals = {
    assignmentsDone: 0, assignmentsTotal: 0, assessmentsDone: 0, assessmentsTotal: 0,
    scored: 0, total: 0, percent: null, scale: "", open: 0,
  };
  let attemptedAny = false;
  // The exercises' own grade bands when they all agree; the default otherwise.
  let bands: GradeBand[] | null = null;
  let bandsAgree = true;
  for (const ex of exercises) {
    const r = results(ex.id);
    if (!r) continue;
    const done = r.status === "completed";
    if (ex.type === "Assignment") { t.assignmentsTotal += 1; if (done) t.assignmentsDone += 1; }
    else { t.assessmentsTotal += 1; if (done) t.assessmentsDone += 1; }
    const started = r.status !== "not-started";
    const end = ex.endDate ? Date.parse(ex.endDate) : NaN;
    const due = Number.isNaN(end) || end <= now;
    if (!started && !due) { t.open += 1; continue; }
    t.total += r.total;
    if (started) {
      t.scored += r.scored;
      attemptedAny = true;
    }
    if (!bands) bands = ex.bands;
    else if (bandsAgree && JSON.stringify(bands) !== JSON.stringify(ex.bands)) bandsAgree = false;
  }
  // Null (prints "—") for a student who has not started anything, rather
  // than a 0% that reads as a failed attempt.
  t.percent = attemptedAny && t.total > 0 ? (t.scored / t.total) * 100 : null;
  t.scale = scaleForPercent(t.percent, bands && bandsAgree ? bands : DEFAULT_GRADE_BANDS);
  return t;
}
