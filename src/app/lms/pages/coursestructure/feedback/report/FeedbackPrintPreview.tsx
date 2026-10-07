'use client';

/* Feedback ▸ Print / Preview.
 *
 * A thin wrapper over the shared PrintPreviewModal — the same "Customize
 * Fields · Customize Report Settings · live paged preview · Print" flow
 * Client Management ▸ Reports, Course Setup ▸ Report and the Program
 * Calendar report use — so every feedback sheet reads the institution's
 * letterhead and saved report design.
 *
 * Callers hand over one FeedbackPrintSpec (title, scope, the columns the
 * reader may tick / reorder, and the rows keyed by each column's dataKey).
 * Every field is service-scope, which puts the paginator in per-row S. No.
 * mode: one printed row per record. The spec is built ONCE at click time and
 * kept in state by the caller — PrintPreviewModal resets the ticked columns
 * whenever `fields` / `defaultEnabled` change identity. */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  activeFormat,
  fetchReportSettings,
  newFormat,
  type ReportFormat,
  type ReportSettings,
} from '@/app/lms/pages/reportsettings/api/reportSettingsService';
import { BRAND_FALLBACK } from '@/app/lms/pages/reportsettings/api/brand';
import { fetchInstitutionById } from '@/app/lms/pages/instutionmanagement/api/institutionService';
import { PrintPreviewModal, type FieldRow } from '@/app/lms/pages/businessreports/components/PrintPreviewModal';
import type { ServiceMapping } from '@/app/lms/pages/servicemapping/api/serviceMappingService';
import type { ReportClientBlock } from '@/app/lms/pages/servicemapping/components/serviceReport';

export type FeedbackPrintSpec = {
  /** {title} token — e.g. "Feedback Forms — Phase I · Batch A". */
  title: string;
  /** {scope} token — what the sheet covers. */
  scope: string;
  /** {filters} token — "Filtered by  ·  …", or '' when nothing narrowed. */
  filters?: string;
  /** All scope 'service' (one printed row per record, own S. No.). */
  fields: FieldRow[];
  defaultEnabled: Set<string>;
  /** Keyed by FieldRow.dataKey; '' / '—' for empty. */
  rows: Record<string, string>[];
  filenameBase: string;
};

/** "Feedback-Forms-Batch-A-2026-10-07" — the naming every other report download uses. */
export const sheetFileBase = (...parts: string[]) =>
  parts
    .filter(Boolean)
    .join('-')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '') + `-${new Date().toISOString().slice(0, 10)}`;

// Stable identities while closed, so the modal's field reset never thrashes.
const EMPTY_FIELDS: FieldRow[] = [];
const EMPTY_ENABLED = new Set<string>();

export default function FeedbackPrintPreview({
  spec,
  onClose,
  showExport = false,
}: {
  spec: FeedbackPrintSpec | null;
  onClose: () => void;
  /** The modal's own PDF / Excel menu. Off by default — the per-form report
   *  keeps its existing downloads; list-level prints turn it on. */
  showExport?: boolean;
}) {
  const open = spec !== null;

  /* ── Letterhead + saved design (ProgramCalendarReportTab's pattern) ──
   *  Fetched the first time a sheet opens rather than on mount — most
   *  visits never print. Silent fall-back to the built-in layout / brand
   *  wording, so a missing setting can never block the print. */
  const [reportSettings, setReportSettings] = useState<ReportSettings | undefined>();
  const [letterhead, setLetterhead] = useState<{ org: string; address: string; contact: string }>(BRAND_FALLBACK);
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    const institutionId = typeof window === 'undefined' ? null : localStorage.getItem('smartcliff_institution');
    if (!institutionId) return;
    fetchReportSettings(institutionId)
      .then(setReportSettings)
      .catch(() => { /* plain layout */ });
    fetchInstitutionById(institutionId)
      .then((inst) =>
        setLetterhead({
          org: inst?.inst_name?.trim() || BRAND_FALLBACK.org,
          address: inst?.address?.trim() || '',
          contact: inst?.phone?.trim() || '',
        })
      )
      .catch(() => { /* fallback wording */ });
  }, [open]);

  const initialFormat: ReportFormat = useMemo(
    () => activeFormat(reportSettings) ?? newFormat('Report layout', false),
    [reportSettings]
  );

  const generated = useMemo(() => (spec ? new Date().toLocaleString() : ''), [spec]);

  // One synthetic block — there is no client grouping on a feedback sheet.
  const blocks = useMemo<ReportClientBlock[]>(
    () => (spec ? [{ client: spec.title, business: '', services: spec.rows }] : []),
    [spec]
  );

  const meta = useMemo(
    () => ({
      title: spec?.title ?? '',
      scope: spec?.scope ?? '',
      generated,
      filters: spec?.filters ?? '',
      ...letterhead,
    }),
    [spec, generated, letterhead]
  );

  // Escape closes the sheet only — captured first so the export modal / L&D
  // designer underneath (which also close on Escape) stay open. With one of
  // the sheet's own menus open (Customize, Export), Escape closes just that
  // menu: Radix handles it on document capture, and a one-shot listener
  // queued behind it stops the key there.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-radix-popper-content-wrapper]')) {
        document.addEventListener('keydown', (ev) => ev.stopPropagation(), { capture: true, once: true });
        return;
      }
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  return (
    <PrintPreviewModal
      open={open}
      onClose={onClose}
      snapshot={{ draft: {}, rows: [] as ServiceMapping[], generated }}
      blocks={blocks}
      letterhead={letterhead}
      initialFormat={initialFormat}
      meta={meta}
      fields={spec?.fields ?? EMPTY_FIELDS}
      defaultEnabled={spec?.defaultEnabled ?? EMPTY_ENABLED}
      filenameBase={spec?.filenameBase}
      showExport={showExport}
      layerClassName="z-[1250]"
    />
  );
}
