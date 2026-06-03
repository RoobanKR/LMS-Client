// ─── Live Dashboard shared types ────────────────────────────────────────────

export interface StudentProgress {
  id: string;
  studentName: string;
  email: string;
  totalQuestions: number;
  completed: number;
  yetToComplete: number;
  notAttempted: number;
  inProgress: boolean;
  completionPercent: number;
  lastActivity: string;
  submitted: boolean;
}

export interface LiveDashboardResponse {
  assessmentName: string;
  courseName?: string;
  startDate: string;
  endDate: string;
  totalStudents: number;
  students: StudentProgress[];
}

// ─── Student details (per-student question view) ─────────────────────────────

export type QuestionStatus = "submitted" | "pending" | "in_progress";

export interface StudentQuestion {
  id: string;
  questionNo: string;
  questionTitle: string;
  questionType: string;
  marks: number;
  status: QuestionStatus;
  submittedAt: string | null;
  timeTakenSeconds: number;
}

export interface StudentDetailsInfo {
  studentName: string;
  email: string;
  assessmentName: string;
  totalQuestions: number;
  completed: number;
  yetToComplete: number;
  completionPercent: number;
}

export interface StudentDetailsResponse extends StudentDetailsInfo {
  questions: StudentQuestion[];
}

// ─── Socket event payloads (server → teacher dashboard) ──────────────────────

/** "dashboard:student_update" — partial stats for one student row. */
export interface DashboardStudentUpdate {
  studentId: string;
  completed?: number;
  yetToComplete?: number;
  notAttempted?: number;
  completionPercent?: number;
  inProgress?: boolean;
  lastActivity?: string;
  submitted?: boolean;
}

/** "dashboard:student_joined" — a full new student row. */
export type DashboardStudentJoined = StudentProgress;

/** "student:question_update" — one question row for the details view. */
export interface StudentQuestionUpdate {
  studentId: string;
  questionId: string;
  status: QuestionStatus;
  submittedAt: string | null;
  timeTakenSeconds: number;
}
