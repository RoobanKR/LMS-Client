'use client';

/* Feedback ▸ one batch (level 2).
 *
 * The batch's own management view, opened from the batches table's
 * "Manage" (the page carries it as ?batch=, so refresh and browser Back
 * work). Laid out like Client Management: a one-line header (back · batch ·
 * students / responses / rate / rating / trainers), overview tiles that
 * double as status filters, a toolbar (search · trainers · columns ·
 * refresh · Report · Add Feedback), a selectable sortable table and a pager.
 *
 * Every per-form action the old nested table had is kept with the same
 * handlers — Manage Questions, View Responses and Report stay one click
 * away; View / Edit / Activate / Delete move into the row's kebab menu.
 * "Report" (or the bulk bar's "Print report") prints the selected forms, or
 * every form the filters leave when nothing is selected. */

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Eye, FileText, Layers, ListChecks, MessageSquare, MoreVertical,
  Pencil, Percent, Plus, Power, PowerOff, Printer, RefreshCw, Search, Star, Trash2, UserRound, Users, X,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DataTable, { type Column, type SortDir } from '@/app/lms/shared/listing/DataTable';
import TableFooter from '@/app/lms/shared/listing/TableFooter';
import { OverviewTiles, type OverviewTile } from '@/app/lms/shared/listing/OverviewTiles';
import { useAutoFitPageSize } from '@/app/lms/shared/listing/useAutoFitPageSize';
import { StatusPill } from '@/app/lms/shared/ui';
import { MappingMultiFilter } from '@/app/lms/pages/servicemapping/components/MappingReportFilters';
import type { Feedback } from '../types/feedback';
import {
  FORM_STATUS_META, avgOf, filtersLine, formStatus, rateOf, responsesOf, windowOf,
  type BatchRow, type FormStatusKey,
} from './feedbackListModel';

type TileKey = 'all' | FormStatusKey;

// Client Management's kebab trigger + menu item look.
const ICON_BUTTON_CLASS =
  'w-8 h-8 rounded-lg border border-transparent bg-transparent text-subtle flex items-center ' +
  'justify-center hover:text-heading hover:border-hairline hover:bg-row-hover ' +
  'data-[state=open]:bg-row-hover data-[state=open]:border-hairline data-[state=open]:text-heading ' +
  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30';
const ACTION_ITEM_CLASS = 'min-h-9 gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer [&_svg]:size-4 [&_svg]:stroke-[1.6]';
const MENU_CLASS = 'rounded-2xl border border-hairline bg-surface p-1.5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25),0_2px_8px_rgba(15,23,42,0.06)]';
// The inline action icons keep the old table's icons, titles and hover hues.
const INLINE_ICON = 'p-1.5 rounded-lg text-subtle transition-colors';

const DEFAULT_COLUMNS = ['num', 'title', 'trainer', 'questions', 'responses', 'rate', 'avg', 'status', 'created', 'actions'];
const ALL_COLUMNS: Array<{ key: string; label: string; alwaysOn?: boolean }> = [
  { key: 'num', label: '#', alwaysOn: true },
  { key: 'title', label: 'Feedback Title', alwaysOn: true },
  { key: 'trainer', label: 'Trainer' },
  { key: 'questions', label: 'Questions' },
  { key: 'responses', label: 'Responses' },
  { key: 'rate', label: 'Response Rate' },
  { key: 'avg', label: 'Avg Rating' },
  { key: 'window', label: 'Feedback Window' },
  { key: 'status', label: 'Status' },
  { key: 'created', label: 'Created' },
  { key: 'actions', label: 'Actions', alwaysOn: true },
];

const STATUS_ORDER: Record<FormStatusKey, number> = { published: 0, draft: 1, inactive: 2 };
const time = (iso?: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? Date.parse(iso) : 0);

export type FeedbackFormActions = {
  questions: (f: Feedback) => void;
  responses: (f: Feedback) => void;
  report: (f: Feedback) => void;
  view: (f: Feedback) => void;
  edit?: (f: Feedback) => void;
  toggle: (f: Feedback) => void;
  remove: (f: Feedback) => void;
};

export default function FeedbackBatchView({
  batch, loading, refreshing, onRefresh, onBack, onCreate, togglingId, actions, onReport,
}: {
  batch: BatchRow;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onCreate?: () => void;
  /** The form whose Activate / Deactivate is in flight. */
  togglingId?: string;
  actions: FeedbackFormActions;
  /** The forms to print (selected, else filtered) and the "Filtered by" line. */
  onReport: (forms: Feedback[], filtersText: string) => void;
}) {
  const [tile, setTile] = useState<TileKey>('all');
  const [search, setSearch] = useState('');
  const [trainerFilter, setTrainerFilter] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const { cardRef, footerRef, pageSize, setManual } = useAutoFitPageSize();

  const trainerOptions = useMemo(() => batch.trainers.map((t) => ({ value: t, label: t })), [batch.trainers]);

  // A deleted form drops out of the selection.
  useEffect(() => {
    setSelected((prev) => {
      const next = prev.filter((id) => batch.forms.some((f) => f._id === id));
      return next.length === prev.length ? prev : next;
    });
  }, [batch.forms]);

  // Every form of the batch in the current sort — Report keeps this order.
  const sortedAll = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const num = (v: number | null) => (v == null ? -1 : v);
    const by = (a: Feedback, b: Feedback): number => {
      switch (sortKey) {
        case 'title': return (a.feedbackTitle || '').localeCompare(b.feedbackTitle || '') * dir;
        case 'trainer': return (a.trainerName || '').localeCompare(b.trainerName || '') * dir;
        case 'questions': return ((a.questions?.length || 0) - (b.questions?.length || 0)) * dir;
        case 'responses':
        case 'rate': return (responsesOf(a) - responsesOf(b)) * dir;
        case 'avg': return (num(avgOf(a)) - num(avgOf(b))) * dir;
        case 'start': return (time(a.startDate) - time(b.startDate)) * dir;
        case 'status': return (STATUS_ORDER[formStatus(a)] - STATUS_ORDER[formStatus(b)]) * dir;
        case 'created': return (time(a.createdAt) - time(b.createdAt)) * dir;
        default: return 0; // the order the forms came in
      }
    };
    return sortKey ? [...batch.forms].sort(by) : batch.forms;
  }, [batch.forms, sortKey, sortDir]);

  // Tile counts follow search + trainers, not the tile itself.
  const toolbarFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedAll.filter((f) => {
      if (trainerFilter.length && !trainerFilter.includes(String(f.trainerName || '').trim())) return false;
      if (q && !`${f.feedbackTitle || ''} ${f.trainerName || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sortedAll, search, trainerFilter]);

  const counts = useMemo(() => ({
    all: toolbarFiltered.length,
    published: toolbarFiltered.filter((f) => formStatus(f) === 'published').length,
    draft: toolbarFiltered.filter((f) => formStatus(f) === 'draft').length,
    inactive: toolbarFiltered.filter((f) => formStatus(f) === 'inactive').length,
  }), [toolbarFiltered]);

  const filtered = useMemo(
    () => (tile === 'all' ? toolbarFiltered : toolbarFiltered.filter((f) => formStatus(f) === tile)),
    [toolbarFiltered, tile]
  );

  const hasActiveFilters = Boolean(search.trim() || trainerFilter.length || tile !== 'all');
  const clearFilters = () => { setSearch(''); setTrainerFilter([]); setTile('all'); };

  useEffect(() => { setPage(1); }, [search, trainerFilter, tile, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const columnsDirty = visibleColumns.length !== DEFAULT_COLUMNS.length || visibleColumns.some((k) => !DEFAULT_COLUMNS.includes(k));
  const toggleColumn = (key: string) => setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const reportForms = selected.length ? sortedAll.filter((f) => selected.includes(f._id)) : filtered;
  const report = () => {
    if (!reportForms.length) return;
    const q = search.trim();
    onReport(reportForms, filtersLine([
      tile !== 'all' ? `Status: ${FORM_STATUS_META[tile].label}` : '',
      trainerFilter.length ? `Trainer: ${trainerFilter.join(', ')}` : '',
      q ? `Search: "${q}"` : '',
      selected.length ? `Selected: ${selected.length} of ${batch.forms.length} forms` : '',
    ].filter(Boolean)));
  };

  const columns: Column<Feedback>[] = [
    {
      key: 'num', label: '#',
      className: 'w-[4%] pl-4 pr-2 text-left text-xs text-faint tabular-nums align-middle whitespace-nowrap',
      skeletonWidth: '20px',
      render: (_f, i) => (currentPage - 1) * pageSize + i + 1,
    },
    {
      key: 'title', label: 'Feedback Title', sortKey: 'title',
      className: 'w-[20%] px-3 text-left align-middle',
      skeletonWidth: '80%',
      render: (f) => (
        <span className="block truncate font-medium text-heading" title={f.feedbackTitle || 'Untitled'}>
          {f.feedbackTitle || 'Untitled'}
        </span>
      ),
    },
    {
      key: 'trainer', label: 'Trainer', sortKey: 'trainer',
      className: 'w-[13%] px-3 text-left align-middle',
      render: (f) => (f.trainerName
        ? <span className="block truncate text-subtle" title={f.trainerName}>{f.trainerName}</span>
        : <span className="text-faint">—</span>),
    },
    {
      key: 'questions', label: 'Questions', sortKey: 'questions',
      className: 'w-[7%] px-3 text-left align-middle tabular-nums',
      render: (f) => {
        const n = f.questions?.length || 0;
        return <span className={n ? 'text-body' : 'text-faint'}>{n}</span>;
      },
    },
    {
      key: 'responses', label: 'Responses', sortKey: 'responses',
      className: 'w-[9%] px-3 text-left align-middle tabular-nums whitespace-nowrap',
      render: (f) => {
        const n = responsesOf(f);
        return (
          <span className={n ? 'font-medium text-heading' : 'text-faint'}>
            {n}{batch.students ? <span className="font-normal text-faint"> / {batch.students}</span> : null}
          </span>
        );
      },
    },
    {
      key: 'rate', label: 'Response Rate', sortKey: 'rate',
      className: 'w-[9%] px-3 text-left align-middle tabular-nums',
      render: (f) => {
        const r = rateOf(responsesOf(f), batch.students);
        return r == null ? <span className="text-faint">—</span> : <span className="text-body">{r}%</span>;
      },
    },
    {
      key: 'avg', label: 'Avg Rating', sortKey: 'avg',
      className: 'w-[8%] px-3 text-left align-middle tabular-nums whitespace-nowrap',
      render: (f) => {
        const a = avgOf(f);
        return a == null ? <span className="text-faint">—</span> : <span className="font-medium text-amber-700 dark:text-amber-400">★ {a.toFixed(1)}</span>;
      },
    },
    {
      key: 'window', label: 'Feedback Window', sortKey: 'start',
      className: 'w-[14%] px-3 text-left align-middle',
      render: (f) => <span className="block truncate text-xs tabular-nums text-subtle" title={windowOf(f)}>{windowOf(f)}</span>,
    },
    {
      key: 'status', label: 'Status', sortKey: 'status',
      className: 'w-[9%] px-3 text-left align-middle',
      render: (f) => {
        const s = FORM_STATUS_META[formStatus(f)];
        return <StatusPill tone={s.tone} dot>{s.label}</StatusPill>;
      },
    },
    {
      key: 'created', label: 'Created', sortKey: 'created',
      className: 'w-[9%] px-3 text-left align-middle whitespace-nowrap',
      render: (f) => (
        <span className="text-xs text-subtle">
          {f.createdAt ? format(new Date(f.createdAt), 'MMM d, yyyy') : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Actions',
      className: 'no-print w-[12%] pl-2 pr-3 text-right align-middle whitespace-nowrap',
      skeletonWidth: '60px',
      render: (f) => {
        const toggling = togglingId === f._id;
        return (
          // The menu portals, but React still bubbles its clicks and keys
          // through here — keep them off the row.
          <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => actions.questions(f)}
              className={`${INLINE_ICON} hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20`}
              title="Manage Questions"
              aria-label={`Manage questions of ${f.feedbackTitle || 'Untitled'}`}
            >
              <ListChecks className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => actions.responses(f)}
              className={`${INLINE_ICON} hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20`}
              title="View Responses"
              aria-label={`View responses of ${f.feedbackTitle || 'Untitled'}`}
            >
              <MessageSquare className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => actions.report(f)}
              className={`${INLINE_ICON} hover:text-violet-600 hover:bg-violet-50 dark:hover:text-violet-400 dark:hover:bg-violet-900/20`}
              title="Report"
              aria-label={`Report of ${f.feedbackTitle || 'Untitled'}`}
            >
              <BarChart3 className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" title="More actions" aria-label={`More actions for ${f.feedbackTitle || 'Untitled'}`} className={ICON_BUTTON_CLASS}>
                  <MoreVertical size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4} collisionPadding={8} className={`w-52 ${MENU_CLASS}`}>
                <DropdownMenuItem onSelect={() => actions.view(f)} className={ACTION_ITEM_CLASS}>
                  <Eye /> View details
                </DropdownMenuItem>
                {actions.edit && (
                  <DropdownMenuItem onSelect={() => actions.edit?.(f)} className={ACTION_ITEM_CLASS}>
                    <Pencil /> Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="mx-1 my-1.5" />
                {/* Stays open (Client Management's toggle does too) so the
                    reader sees "Updating…" turn into the new state. */}
                <DropdownMenuItem
                  disabled={toggling}
                  onSelect={(event) => { event.preventDefault(); actions.toggle(f); }}
                  className={ACTION_ITEM_CLASS}
                >
                  <Power />
                  <span className={toggling ? 'animate-pulse' : ''}>
                    {toggling ? 'Updating…' : f.isActive ? 'Deactivate' : 'Activate'}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-1 my-1.5" />
                <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(f)} className={ACTION_ITEM_CLASS}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
  const visibleColumnDefs = columns.filter((c) => visibleColumns.includes(c.key));

  const tiles: OverviewTile<TileKey>[] = [
    { key: 'all', label: 'Total forms', value: loading ? undefined : counts.all, icon: ClipboardList, chip: 'bg-brand-wash text-brand-strong', tint: '#fff4e9', tintOn: '#ffe7d2', ring: '#c2540f' },
    { key: 'published', label: 'Published', value: loading ? undefined : counts.published, icon: CheckCircle2, chip: 'bg-emerald-50 text-emerald-600', tint: '#e6f7f0', tintOn: '#d0efe2', ring: '#059669' },
    { key: 'draft', label: 'Draft', value: loading ? undefined : counts.draft, icon: FileText, chip: 'bg-amber-50 text-amber-600', tint: '#fff7e6', tintOn: '#feeccb', ring: '#d97706' },
    { key: 'inactive', label: 'Inactive', value: loading ? undefined : counts.inactive, icon: PowerOff, chip: 'bg-ink-100 text-subtle', tint: '#f3f4f6', tintOn: '#e5e7eb', ring: '#6b7280' },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Batch header — one line ── */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to all batches"
            title="Back to all batches"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-hairline text-subtle transition-colors hover:bg-row-hover hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            <ArrowLeft size={15} strokeWidth={2.2} />
          </button>
          <h2 className="min-w-0 truncate text-lg font-bold text-heading" title={batch.label}>{batch.label}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
          {batch.students != null && (
            <span className="inline-flex items-center gap-1.5"><Users size={13} className="text-faint" aria-hidden />{batch.students} students</span>
          )}
          <span className="inline-flex items-center gap-1.5"><MessageSquare size={13} className="text-faint" aria-hidden />{batch.responses} responses</span>
          {batch.rate != null && (
            <span className="inline-flex items-center gap-1.5" title="Responses across published forms ÷ (students × published forms)">
              <Percent size={13} className="text-faint" aria-hidden />{batch.rate}% response rate
            </span>
          )}
          {batch.avg != null && (
            <span className="inline-flex items-center gap-1.5"><Star size={13} className="text-faint" aria-hidden />{batch.avg.toFixed(1)} avg rating</span>
          )}
          <span className="inline-flex items-center gap-1.5" title={batch.trainers.join(', ') || undefined}>
            <UserRound size={13} className="text-faint" aria-hidden />{batch.trainers.length} {batch.trainers.length === 1 ? 'trainer' : 'trainers'}
          </span>
        </div>
      </header>

      <div className="mt-3">
        <OverviewTiles tiles={tiles} active={tile} allKey="all" onSelect={setTile} ariaLabel="Form overview — filter the forms" />
      </div>

      {/* ── Toolbar: Search · Trainers · Columns · Refresh · Report · Add Feedback ── */}
      <div className="no-print mt-3 flex min-w-0 shrink-0 flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-[200px] sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search form or trainer…"
            aria-label="Search feedback forms"
            className="h-8 w-full rounded-control border border-hairline-strong bg-surface pl-8 pr-8 text-xs text-body transition-colors duration-150 placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-chip text-faint hover:bg-ink-100 hover:text-heading">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="w-full min-w-0 sm:w-[160px]">
          <MappingMultiFilter label="Trainers" options={trainerOptions} value={trainerFilter} onChange={setTrainerFilter} placeholder="All trainers" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" title="Show or hide table columns" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-hairline-strong bg-surface px-2.5 text-xs font-medium text-body hover:bg-row-hover focus:outline-none focus:ring-2 focus:ring-brand/15">
              <Layers className="size-3.5" />
              Columns
              {columnsDirty && (
                <span className="ml-0.5 inline-flex items-center rounded-full bg-brand-strong px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white">{visibleColumns.length}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} collisionPadding={8} className={`w-60 ${MENU_CLASS}`}>
            <DropdownMenuLabel className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-faint">Visible columns</DropdownMenuLabel>
            <DropdownMenuSeparator className="mx-1 my-1" />
            <div className="max-h-80 overflow-y-auto">
              {ALL_COLUMNS.map(({ key, label, alwaysOn }) => (
                <label key={key} className={`flex min-h-8 cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium text-body hover:bg-row-hover ${alwaysOn ? 'cursor-not-allowed opacity-60' : ''}`}>
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(key)}
                    disabled={alwaysOn}
                    onChange={() => toggleColumn(key)}
                    className="size-3.5 shrink-0 cursor-pointer rounded border-hairline-strong accent-brand-strong disabled:cursor-not-allowed"
                  />
                  <span className="truncate">{label}</span>
                </label>
              ))}
            </div>
            {columnsDirty && (
              <>
                <DropdownMenuSeparator className="mx-1 my-1" />
                <button type="button" onClick={() => setVisibleColumns(DEFAULT_COLUMNS)} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-strong hover:bg-brand-wash">
                  Reset to default
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <span role="status" title={`${filtered.length} of ${batch.forms.length} forms match the current filters`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-brand-500/30 bg-brand-wash px-2.5 text-xs font-semibold text-brand-strong">
            <span className="tabular-nums">{filtered.length.toLocaleString()}</span>
            <span className="font-medium opacity-80">of {batch.forms.length.toLocaleString()}</span>
          </span>
        )}
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-control px-2 text-xs font-medium text-subtle hover:bg-row-hover hover:text-heading">
            <X className="size-3.5" /> Clear all
          </button>
        )}

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh"
            aria-label="Refresh"
            className="inline-flex size-8 items-center justify-center rounded-control border border-hairline-strong bg-surface text-subtle transition-colors hover:bg-row-hover hover:text-heading"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={report}
            disabled={!reportForms.length}
            title={selected.length
              ? 'Print the selected forms — pick columns, preview, print or export'
              : 'Print the listed forms — pick columns, preview, print or export'}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-brand-300 bg-surface px-2.5 text-xs font-semibold text-brand-strong transition-colors hover:border-brand-400 hover:bg-brand-wash disabled:cursor-not-allowed disabled:border-hairline-strong disabled:text-faint"
          >
            <Printer className="size-3.5" /> {selected.length ? `Report (${selected.length})` : 'Report'}
          </button>
          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control bg-brand-strong px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-800"
            >
              <Plus className="size-3.5" /> Add Feedback
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div ref={cardRef} aria-busy={loading} className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
        <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
          <DataTable
            rows={pageRows}
            columns={visibleColumnDefs}
            rowKey={(f) => f._id}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            isLoading={loading}
            isFiltered={hasActiveFilters}
            fixedLayout={!columnsDirty}
            fillHeight
            selectedKeys={selected}
            onSelectionChange={setSelected}
            bulkActions={() => (
              <button
                type="button"
                onClick={report}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
              >
                <Printer size={13} /> Print report
              </button>
            )}
            emptyTitle={hasActiveFilters ? 'No forms match these filters' : 'No feedback forms in this batch yet'}
            emptyHint={hasActiveFilters
              ? 'Try widening or clearing them to see more.'
              : 'Forms created for this batch appear here.'}
            emptyAction={hasActiveFilters ? 'Clear filters' : onCreate ? 'Add Feedback' : undefined}
            onEmptyAction={hasActiveFilters ? clearFilters : onCreate}
            minWidth={visibleColumns.length * 130}
          />
        </div>
        <div ref={footerRef} className="no-print min-h-11 border-t border-hairline">
          <TableFooter
            from={filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            to={Math.min(currentPage * pageSize, filtered.length)}
            total={filtered.length}
            pageSize={pageSize}
            onPageSize={(n) => { setManual(n); setPage(1); }}
            currentPage={currentPage}
            totalPages={totalPages}
            onPage={setPage}
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  );
}
