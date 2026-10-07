// report/feedbackPrintSheets.ts
//
// The Feedback Report page's Print / Preview sheets — the same data the
// on-page report and the Excel / PDF downloads carry (Consolidated Report,
// Master Data, submission status), shaped as FeedbackPrintSpecs for the
// shared Print / Preview modal so the reader can pick and reorder columns,
// see the paged sheet on the institution's letterhead, and print.
//
// The Excel / PDF downloads are NOT built from here — they stay on
// feedbackReportShared's exporters, byte for byte.

import { format } from 'date-fns';
import type { Feedback } from '../types/feedback';
import type { FieldRow } from '@/app/lms/pages/businessreports/components/PrintPreviewModal';
import type { Workbook } from './workbookShared';
import { sheetFileBase, type FeedbackPrintSpec } from './FeedbackPrintPreview';

export type FormSheetKind = 'consolidated' | 'responses' | 'submission';

export const FORM_SHEETS: { kind: FormSheetKind; label: string; hint: string }[] = [
  { kind: 'consolidated', label: 'Consolidated report', hint: 'Grade counts and percentage per parameter' },
  { kind: 'responses', label: 'Responses (Master Data)', hint: 'One row per response — pick questions & columns' },
  { kind: 'submission', label: 'Submission status', hint: 'Who submitted and who has not' },
];

export type FormSheetContext = {
  feedback: Feedback;
  wb: Workbook;
  audience: { id: string; name: string }[];
  notSubmitted: { id: string; name: string }[];
  batchLabel: string;
  trainerLabel: string;
  filtersText: string;
};

const field = (key: string, label: string, column = label, required = false): FieldRow => ({
  key,
  label,
  ...(required ? { required: true } : {}),
  scope: 'service',
  column,
  dataKey: key,
});

const stamp = (iso?: string | null) =>
  iso && !Number.isNaN(Date.parse(iso)) ? format(new Date(iso), 'dd MMM yyyy, h:mm a') : '—';

// Fields / defaults are built per call; the caller keeps the spec in state,
// so their identity is stable for as long as the sheet is open.
export function buildFormSheetSpec(kind: FormSheetKind, ctx: FormSheetContext): FeedbackPrintSpec {
  const { feedback, wb } = ctx;
  const title = feedback.feedbackTitle || 'Feedback';
  const shared = {
    scope: [
      ctx.batchLabel && `Batch ${ctx.batchLabel}`,
      `Trainer: ${ctx.trainerLabel}`,
      `${wb.responses.length} of ${ctx.audience.length} responded`,
    ].filter(Boolean).join('  ·  '),
    filters: ctx.filtersText,
    filenameBase: sheetFileBase(title, kind),
  };

  if (kind === 'consolidated') {
    const fields: FieldRow[] = [
      field('code', 'Question No.', 'Q. No.'),
      field('parameter', 'Parameter', 'Parameter', true),
      ...wb.grades.map((g) => field(`g${g}`, `Grade ${g} — no. of trainees`, String(g))),
      field('total', 'Total responses', 'Total'),
      field('percentage', 'Percentage'),
    ];
    const rows = wb.consolidated.map((row, qi) => ({
      code: `Q${row.sno}`,
      parameter: row.parameter,
      ...Object.fromEntries(wb.grades.map((g, gi) => [`g${g}`, String(row.counts[gi])])),
      total: String(wb.columnTotals[qi]),
      percentage: `${row.percentage.toFixed(2)}%`,
    }));
    return {
      ...shared,
      title: `Consolidated Report — ${title}`,
      fields,
      defaultEnabled: new Set(fields.map((f) => f.key)),
      rows,
    };
  }

  if (kind === 'responses') {
    // Q-codes match the Consolidated sheet's Q. No. column.
    const questionFields = wb.ratingQuestions.map((q, i) => field(`q${i}`, `Q${i + 1} · ${q.questionText}`, `Q${i + 1}`));
    const fields: FieldRow[] = [
      field('completion', 'Completion Time', 'Completed On'),
      field('name', 'Trainee Name', 'Trainee Name', true),
      field('email', 'Email'),
      field('track', 'Track / Batch', 'Batch'),
      ...questionFields,
      field('avg', 'Average Rating', 'Avg'),
      field('comments', 'Comments'),
    ];
    const rows = wb.masterRows.map((m) => {
      const rated = m.ratings.filter((v): v is number => v !== null);
      return {
        completion: stamp(m.submittedAt),
        name: m.name,
        email: m.email || '—',
        track: m.track,
        ...Object.fromEntries(m.ratings.map((v, i) => [`q${i}`, v === null ? '—' : String(v)])),
        avg: rated.length ? (rated.reduce((s, v) => s + v, 0) / rated.length).toFixed(2) : '—',
        comments: m.comments || '—',
      };
    });
    return {
      ...shared,
      title: `Feedback Responses — ${title}`,
      fields,
      defaultEnabled: new Set(['name', ...questionFields.map((f) => f.key), 'avg', 'comments']),
      rows,
    };
  }

  // Submission status — who in the audience has / hasn't responded.
  const pending = new Set(ctx.notSubmitted.map((s) => s.id));
  const submittedAt = new Map<string, string>();
  (feedback.studentResponses || []).forEach((r: { studentId?: unknown; submittedAt?: string }) => {
    if (r?.studentId != null) submittedAt.set(String(r.studentId), r.submittedAt || '');
  });
  const fields: FieldRow[] = [
    field('name', 'Student Name', 'Student Name', true),
    field('batch', 'Batch'),
    field('status', 'Status'),
    field('submitted', 'Submitted On'),
  ];
  const rows = [...ctx.audience]
    .sort((a, b) => Number(!pending.has(a.id)) - Number(!pending.has(b.id)) || a.name.localeCompare(b.name))
    .map((s) => ({
      name: s.name,
      batch: ctx.batchLabel || '—',
      status: pending.has(s.id) ? 'Not submitted' : 'Submitted',
      submitted: pending.has(s.id) ? '—' : stamp(submittedAt.get(s.id)),
    }));
  return {
    ...shared,
    title: `Submission Status — ${title}`,
    fields,
    defaultEnabled: new Set(fields.map((f) => f.key)),
    rows,
  };
}
