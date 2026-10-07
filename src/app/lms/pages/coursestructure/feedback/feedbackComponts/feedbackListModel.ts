// feedbackComponts/feedbackListModel.ts
//
// The Feedback page's data model, kept free of React so both list levels —
// the batches table and one batch's forms — read the same numbers, and the
// print sheets carry exactly what the screen shows.
//
//  - buildBatchRows groups a course's forms under its batches (the roster's
//    phase · batch labels), with the per-batch aggregates the overview tiles
//    and the batches table show.
//  - build*PrintSpec turn a listing into a FeedbackPrintSpec for the shared
//    Print / Preview modal (column picker + letterhead + Print).

import { format } from 'date-fns';
import type { Feedback } from '../types/feedback';
import { isStudentUser, type CourseRoster } from '@/queries/courseRoster';
import type { StatusPillTone } from '@/app/lms/shared/ui';
import type { FieldRow } from '@/app/lms/pages/businessreports/components/PrintPreviewModal';
import { sheetFileBase, type FeedbackPrintSpec } from '../report/FeedbackPrintPreview';

/** URL key of the trailing "No batch" group (forms with no batch or trainer batch). */
export const NO_BATCH_KEY = '__none__';

export type FormStatusKey = 'published' | 'draft' | 'inactive';

// Same precedence the old status badge used: inactive wins, then published.
export const formStatus = (fb: Feedback): FormStatusKey =>
  !fb.isActive ? 'inactive' : fb.isPublished ? 'published' : 'draft';

export const FORM_STATUS_META: Record<FormStatusKey, { label: string; tone: StatusPillTone }> = {
  published: { label: 'Published', tone: 'success' },
  draft: { label: 'Draft', tone: 'warn' },
  inactive: { label: 'Inactive', tone: 'neutral' },
};

export const responsesOf = (fb: Feedback) =>
  Array.isArray(fb.studentResponses) ? fb.studentResponses.length : fb.statistics?.totalStudents || 0;

export const avgOf = (fb: Feedback): number | null =>
  fb.statistics?.averageRating > 0 ? fb.statistics.averageRating : null;

export const rateOf = (responses: number, students: number | null): number | null =>
  students ? Math.min(100, Math.round((responses / students) * 100)) : null;

export const fmtDay = (iso?: string | null) =>
  iso && !Number.isNaN(Date.parse(iso)) ? format(new Date(iso), 'd MMM yyyy') : '';

export const windowOf = (fb: Feedback) => {
  const s = fmtDay(fb.startDate);
  const e = fmtDay(fb.endDate);
  return s && e ? `${s} – ${e}` : s ? `From ${s}` : '—';
};

export type BatchRow = {
  /** URL key: the label itself, or NO_BATCH_KEY. */
  key: string;
  /** "Phase I · Batch A" | "Batch A" | "No batch". */
  label: string;
  forms: Feedback[];
  /** Roster students in this batch; null for No batch / not in roster / roster not loaded. */
  students: number | null;
  published: number;
  drafts: number;
  inactive: number;
  /** Σ responses over every form. */
  responses: number;
  /** Published forms only — responses ÷ (students × published forms). */
  rate: number | null;
  /** Mean of the forms' average ratings (forms with one), 1 decimal. */
  avg: number | null;
  /** Unique trainer names, in form order. */
  trainers: string[];
};

// "Phase I · Batch A" — a phased course repeats its batch names, one entry
// per (phase, batch), so the phase is part of the label.
const labelOf = (phase: unknown, batchName: unknown) =>
  [String(phase || '').trim(), String(batchName || '').trim()].filter(Boolean).join(' · ');

export function buildBatchRows(feedbacks: Feedback[] | undefined, roster: CourseRoster | undefined): BatchRow[] {
  // ── 1. Roster: batch order, students per batch, batches per user ──
  // A trainer can appear in several batch entries, so labels are
  // de-duplicated case-insensitively.
  const order: string[] = [];
  const studentsByLabel = new Map<string, Set<string>>();
  const batchesByUser = new Map<string, string[]>();
  (roster?.batchAndParticipants || []).forEach((b) => {
    if (!(b?.batchName || '').trim()) return;
    const label = labelOf(b.phase, b.batchName);
    let canonical = order.find((n) => n.toLowerCase() === label.toLowerCase());
    if (!canonical) {
      order.push(label);
      canonical = label;
    }
    const students = studentsByLabel.get(canonical.toLowerCase()) || new Set<string>();
    studentsByLabel.set(canonical.toLowerCase(), students);
    (b.users || []).forEach((entry) => {
      // A populated enrollment carries the user under `user`; tolerate a bare user.
      const u = (entry?.user || entry) as { _id?: unknown; id?: unknown };
      const id = String(u?._id || u?.id || '');
      if (!id) return;
      if (isStudentUser(u)) students.add(id);
      const prev = batchesByUser.get(id) || [];
      if (!prev.some((n) => n.toLowerCase() === label.toLowerCase())) prev.push(label);
      batchesByUser.set(id, prev);
    });
  });

  // ── 2. Forms under their batches ──
  // Forms carry the batch picked at creation; legacy forms without one use
  // their trainer's batches instead (appearing under each), and forms with
  // no trainer/batch fall into the trailing "No batch" group. A form saved
  // before feedback carried a phase lands under the bare batch name — its own
  // group rather than being merged into a phase it was never filed under.
  const groups: { label: string | null; forms: Feedback[] }[] = [];
  const idx = new Map<string, number>();
  const push = (label: string | null, fb: Feedback) => {
    const k = (label ?? NO_BATCH_KEY).toLowerCase();
    let i = idx.get(k);
    if (i === undefined) {
      i = groups.length;
      idx.set(k, i);
      groups.push({ label, forms: [] });
    }
    groups[i].forms.push(fb);
  };
  // Seeded with the roster order so batches follow it — including batches
  // with no forms yet, which still get a row (and a "No forms yet" count).
  order.forEach((label) => {
    idx.set(label.toLowerCase(), groups.length);
    groups.push({ label, forms: [] });
  });
  (Array.isArray(feedbacks) ? feedbacks : []).forEach((fb) => {
    if ((fb.batchName || '').trim()) {
      push(labelOf(fb.phase, fb.batchName), fb);
      return;
    }
    const trainerId = fb.trainerId ? String(fb.trainerId) : '';
    const names = trainerId ? batchesByUser.get(trainerId) || [] : [];
    if (names.length === 0) push(null, fb);
    else names.forEach((n) => push(n, fb));
  });

  // ── 3. Rows: roster batches, then form-only labels, then No batch ──
  const rows: BatchRow[] = groups
    .filter((g) => g.label !== null)
    .map((g) => toRow(g.label!, g.label!, g.forms, studentsByLabel.get(g.label!.toLowerCase())?.size ?? null));
  const none = groups.find((g) => g.label === null);
  if (none && none.forms.length) rows.push(toRow(NO_BATCH_KEY, 'No batch', none.forms, null));
  return rows;
}

function toRow(key: string, label: string, forms: Feedback[], students: number | null): BatchRow {
  let published = 0;
  let drafts = 0;
  let inactive = 0;
  let responses = 0;
  let publishedResponses = 0;
  const avgs: number[] = [];
  const trainers: string[] = [];
  forms.forEach((fb) => {
    const status = formStatus(fb);
    const n = responsesOf(fb);
    responses += n;
    if (status === 'published') {
      published += 1;
      publishedResponses += n;
    } else if (status === 'draft') drafts += 1;
    else inactive += 1;
    const a = avgOf(fb);
    if (a !== null) avgs.push(a);
    const t = String(fb.trainerName || '').trim();
    if (t && !trainers.includes(t)) trainers.push(t);
  });
  return {
    key,
    label,
    forms,
    students,
    published,
    drafts,
    inactive,
    responses,
    rate: students && published ? Math.min(100, Math.round((100 * publishedResponses) / (students * published))) : null,
    avg: avgs.length ? Math.round((avgs.reduce((s, v) => s + v, 0) / avgs.length) * 10) / 10 : null,
    trainers,
  };
}

export const findBatchRow = (rows: BatchRow[], key: string) =>
  rows.find((r) => r.key.toLowerCase() === key.toLowerCase());

/** Stand-in while the forms load, or for a ?batch= that no longer exists. */
export const fallbackBatchRow = (key: string): BatchRow => ({
  key,
  label: key === NO_BATCH_KEY ? 'No batch' : key,
  forms: [],
  students: null,
  published: 0,
  drafts: 0,
  inactive: 0,
  responses: 0,
  rate: null,
  avg: null,
  trainers: [],
});

/** "Filtered by  ·  a  ·  b" — the {filters} line every report prints; '' when nothing narrowed. */
export const filtersLine = (parts: string[]) => (parts.length ? `Filtered by  ·  ${parts.join('  ·  ')}` : '');

// ─────────────────────────────────────────────────────────────────────────────
// Print sheets — module-level so the modal's column picker keeps its state.
// ─────────────────────────────────────────────────────────────────────────────

const field = (key: string, label: string, column = label, required = false): FieldRow => ({
  key,
  label,
  ...(required ? { required: true } : {}),
  scope: 'service',
  column,
  dataKey: key,
});

export const FORM_PRINT_FIELDS: FieldRow[] = [
  field('title', 'Feedback Title', 'Feedback Title', true),
  field('trainer', 'Trainer'),
  field('batch', 'Batch'),
  field('questions', 'Questions'),
  field('responses', 'Responses'),
  field('rate', 'Response Rate'),
  field('avg', 'Avg Rating'),
  field('status', 'Status'),
  field('window', 'Feedback Window'),
  field('created', 'Created On'),
];
export const FORM_PRINT_DEFAULT = new Set(['title', 'trainer', 'questions', 'responses', 'rate', 'avg', 'status', 'created']);

export const BATCH_PRINT_FIELDS: FieldRow[] = [
  field('batch', 'Batch', 'Batch', true),
  field('students', 'Students'),
  field('forms', 'Feedback Forms', 'Forms'),
  field('published', 'Published'),
  field('drafts', 'Drafts'),
  field('inactive', 'Inactive'),
  field('responses', 'Responses'),
  field('rate', 'Response Rate'),
  field('avg', 'Avg Rating'),
  field('trainers', 'Trainers'),
];
export const BATCH_PRINT_DEFAULT = new Set(['batch', 'students', 'forms', 'published', 'responses', 'rate', 'avg']);

const pct = (v: number | null) => (v === null ? '—' : `${v}%`);

/** One batch's forms (the listed or selected ones) as a print sheet. */
export function buildFormsPrintSpec(
  forms: Feedback[],
  batch: BatchRow,
  ctx: { courseLabel: string; filtersText: string }
): FeedbackPrintSpec {
  const rows = forms.map((fb) => {
    const n = responsesOf(fb);
    const avg = avgOf(fb);
    return {
      title: fb.feedbackTitle || 'Untitled',
      trainer: fb.trainerName || '—',
      batch: batch.label,
      questions: String(fb.questions?.length || 0),
      responses: batch.students ? `${n} / ${batch.students}` : `${n}`,
      rate: pct(rateOf(n, batch.students)),
      avg: avg ? avg.toFixed(1) : '—',
      status: FORM_STATUS_META[formStatus(fb)].label,
      window: windowOf(fb),
      created: fmtDay(fb.createdAt) || '—',
    };
  });
  return {
    title: `Feedback Forms — ${batch.label}`,
    scope: `${ctx.courseLabel}  ·  ${forms.length} form${forms.length === 1 ? '' : 's'}`,
    filters: ctx.filtersText,
    fields: FORM_PRINT_FIELDS,
    defaultEnabled: FORM_PRINT_DEFAULT,
    rows,
    filenameBase: sheetFileBase('Feedback-Forms', batch.label),
  };
}

/** The batches table (the listed ones) as a print sheet. */
export function buildBatchesPrintSpec(
  rows: BatchRow[],
  ctx: { courseLabel: string; filtersText: string }
): FeedbackPrintSpec {
  return {
    title: 'Feedback Summary by Batch',
    scope: `${ctx.courseLabel}  ·  ${rows.length} batch${rows.length === 1 ? '' : 'es'}`,
    filters: ctx.filtersText,
    fields: BATCH_PRINT_FIELDS,
    defaultEnabled: BATCH_PRINT_DEFAULT,
    rows: rows.map((r) => ({
      batch: r.label,
      students: r.students === null ? '—' : String(r.students),
      forms: String(r.forms.length),
      published: String(r.published),
      drafts: String(r.drafts),
      inactive: String(r.inactive),
      responses: String(r.responses),
      rate: pct(r.rate),
      avg: r.avg === null ? '—' : r.avg.toFixed(1),
      trainers: r.trainers.join(', ') || '—',
    })),
    filenameBase: sheetFileBase('Feedback-Batches', ctx.courseLabel),
  };
}
