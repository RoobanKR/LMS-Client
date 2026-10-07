// Which You Do tests are "Mock": the assessments that never lock after an
// attempt (the student retakes them with Retest) and whose programming tests
// open in the multi-file editor. One rule, shared by the assessment list, the
// instructions page and the test page.
//
// Mock = an item in the You Do → Assessment tab whose test type is anything
// but Final (Mock, Practice, or unset — the server defaults new tests to mock).
// Final tests keep their lock and their editor.

// Assessment-tab key variants (handles legacy spellings), matching
// coursesdetailedview/[id]/page.tsx.
const ASSESSMENT_KEYS = new Set(["assessment", "assessments", "assesment", "assesments"]);

const normalizeKey = (v: unknown) => String(v || "").toLowerCase().replace(/\s+/g, "_");

/** The fields the Mock test screens read from a You Do exercise. */
export interface MockExercise {
  _id?: string;
  questions?: unknown[];
  securitySettings?: Record<string, unknown>;
  exerciseInformation?: { exerciseName?: string; testType?: string; totalDuration?: number; [k: string]: unknown };
  context?: { courseId?: string; nodeId?: string; nodeType?: string; hierarchy?: string[]; [k: string]: unknown };
  courseId?: string;
  courseName?: string;
  [k: string]: unknown;
}

export const isAssessmentSubcategory = (subcategory: unknown): boolean =>
  ASSESSMENT_KEYS.has(normalizeKey(subcategory));

export const isFinalTest = (exercise: unknown): boolean =>
  String((exercise as MockExercise | null | undefined)?.exerciseInformation?.testType || "").toLowerCase() === "final";

export const isMockAssessment = (exercise: unknown, subcategory: unknown): boolean =>
  isAssessmentSubcategory(subcategory) && !isFinalTest(exercise);
