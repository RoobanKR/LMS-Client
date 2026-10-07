'use client';

/* Feedback ▸ batches (level 1).
 *
 * One row per batch of the course, laid out like Client Management / the L&D
 * console's feedback list: overview tiles that double as filters, a toolbar
 * (search · refresh · Report · Add Feedback), a sortable table and a pager.
 * "Manage" (or a row click) opens that batch's own management view — the old
 * nested "View / Hide feedback" dropdown is gone. "Report" prints the listed
 * batches through the shared Print / Preview modal. */

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight, FileText, Inbox, Layers, MessageSquare, Plus, Printer, RefreshCw, Search, Settings2, Users, X,
} from 'lucide-react';
import DataTable, { type Column, type SortDir } from '@/app/lms/shared/listing/DataTable';
import TableFooter from '@/app/lms/shared/listing/TableFooter';
import { OverviewTiles, type OverviewTile } from '@/app/lms/shared/listing/OverviewTiles';
import { useAutoFitPageSize } from '@/app/lms/shared/listing/useAutoFitPageSize';
import { filtersLine, formStatus, responsesOf, type BatchRow } from './feedbackListModel';

type TileKey = 'all' | 'live' | 'drafts' | 'empty';

const TILE_LABEL: Record<TileKey, string> = {
  all: 'Total batches',
  live: 'Collecting feedback',
  drafts: 'With drafts',
  empty: 'No forms yet',
};

const matchesTile = (r: BatchRow, tile: TileKey) =>
  tile === 'live' ? r.published > 0 : tile === 'drafts' ? r.drafts > 0 : tile === 'empty' ? r.forms.length === 0 : true;

export default function FeedbackBatchTable({ rows, loading, refreshing, onRefresh, onCreate, onManage, onReport }: {
  rows: BatchRow[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onCreate?: () => void;
  onManage: (row: BatchRow) => void;
  /** The listed batches (after every filter) and the "Filtered by" line. */
  onReport: (rows: BatchRow[], filtersText: string) => void;
}) {
  const [tile, setTile] = useState<TileKey>('all');
  const [search, setSearch] = useState('');
  // null = roster order.
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const { cardRef, footerRef, pageSize, setManual } = useAutoFitPageSize();

  // Tile counts follow the search, not the tile itself, so a tile always
  // says how many rows clicking it would leave.
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.label.toLowerCase().includes(q) ||
      r.forms.some((f) => (f.feedbackTitle || '').toLowerCase().includes(q) || (f.trainerName || '').toLowerCase().includes(q))
    );
  }, [rows, search]);

  const counts = useMemo(() => ({
    all: searched.length,
    live: searched.filter((r) => matchesTile(r, 'live')).length,
    drafts: searched.filter((r) => matchesTile(r, 'drafts')).length,
    empty: searched.filter((r) => matchesTile(r, 'empty')).length,
  }), [searched]);

  const filtered = useMemo(() => {
    const list = searched.filter((r) => matchesTile(r, tile));
    if (!sortKey) return list;
    const dir = sortDir === 'asc' ? 1 : -1;
    const num = (v: number | null) => (v == null ? -1 : v);
    const by = (a: BatchRow, b: BatchRow): number => {
      switch (sortKey) {
        case 'batch': return a.label.localeCompare(b.label, undefined, { numeric: true }) * dir;
        case 'students': return (num(a.students) - num(b.students)) * dir;
        case 'forms': return (a.forms.length - b.forms.length) * dir;
        case 'published': return (a.published - b.published) * dir;
        case 'responses': return (a.responses - b.responses) * dir;
        case 'rate': return (num(a.rate) - num(b.rate)) * dir;
        case 'avg': return (num(a.avg) - num(b.avg)) * dir;
        default: return 0;
      }
    };
    return [...list].sort(by);
  }, [searched, tile, sortKey, sortDir]);

  const hasActiveFilters = Boolean(search.trim() || tile !== 'all');
  const clearFilters = () => { setSearch(''); setTile('all'); };

  useEffect(() => { setPage(1); }, [search, tile, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Whole-course figures for the toolbar summary (not narrowed by filters).
  const totals = useMemo(() => {
    // A legacy form without a stored batch can sit under several of its
    // trainer's batches — count each form once.
    const forms = new Map(rows.flatMap((r) => r.forms.map((f) => [f._id, f] as const)));
    let published = 0;
    let responses = 0;
    forms.forEach((f) => {
      if (formStatus(f) === 'published') published += 1;
      responses += responsesOf(f);
    });
    return { forms: forms.size, published, responses };
  }, [rows]);

  const report = () => {
    const q = search.trim();
    onReport(filtered, filtersLine([
      tile !== 'all' ? `Showing: ${TILE_LABEL[tile]}` : '',
      q ? `Search: "${q}"` : '',
    ].filter(Boolean)));
  };

  const columns: Column<BatchRow>[] = [
    {
      key: 'num', label: '#',
      className: 'w-[5%] pl-4 pr-2 text-left text-xs text-faint tabular-nums align-middle whitespace-nowrap',
      skeletonWidth: '20px',
      render: (_r, i) => (currentPage - 1) * pageSize + i + 1,
    },
    {
      key: 'batch', label: 'Batch', sortKey: 'batch',
      className: 'w-[22%] px-3 text-left align-middle',
      skeletonWidth: '70%',
      render: (r) => (
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-info-50 px-2.5 py-0.5 text-[11px] font-semibold text-info-700" title={r.label}>
          <Users className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{r.label}</span>
        </span>
      ),
    },
    {
      key: 'students', label: 'Students', sortKey: 'students',
      className: 'w-[10%] px-3 text-left align-middle tabular-nums',
      render: (r) => (r.students == null ? <span className="text-faint">—</span> : <span className="text-body">{r.students}</span>),
    },
    {
      key: 'forms', label: 'Feedback Forms', sortKey: 'forms',
      className: 'w-[11%] px-3 text-left align-middle tabular-nums whitespace-nowrap',
      render: (r) => (
        <span className="text-body">
          {r.forms.length}
          <span className="ml-1 text-[11px] text-faint">{r.forms.length === 1 ? 'form' : 'forms'}</span>
        </span>
      ),
    },
    {
      key: 'published', label: 'Published', sortKey: 'published',
      className: 'w-[10%] px-3 text-left align-middle tabular-nums',
      render: (r) => <span className="font-medium text-success-700">{r.published}</span>,
    },
    {
      key: 'responses', label: 'Responses', sortKey: 'responses',
      className: 'w-[10%] px-3 text-left align-middle tabular-nums',
      render: (r) => <span className={r.responses ? 'text-body' : 'text-faint'}>{r.responses}</span>,
    },
    {
      key: 'rate', label: 'Response Rate', sortKey: 'rate',
      className: 'w-[11%] px-3 text-left align-middle tabular-nums',
      render: (r) => (r.rate == null
        ? <span className="text-faint">—</span>
        : <span className="text-body" title="Responses across published forms ÷ (students × published forms)">{r.rate}%</span>),
    },
    {
      key: 'avg', label: 'Avg Rating', sortKey: 'avg',
      className: 'w-[9%] px-3 text-left align-middle tabular-nums whitespace-nowrap',
      render: (r) => (r.avg == null ? <span className="text-faint">—</span> : <span className="font-medium text-amber-700 dark:text-amber-400">★ {r.avg.toFixed(1)}</span>),
    },
    {
      key: 'action', label: 'Action',
      className: 'no-print w-[12%] pl-2 pr-4 text-right align-middle whitespace-nowrap',
      skeletonWidth: '60px',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onManage(r); }}
          // The row also opens on Enter / Space — keep the key off it so one press opens once.
          onKeyDown={(e) => e.stopPropagation()}
          title={`Manage ${r.label}'s feedback forms`}
          className="inline-flex h-7 items-center gap-1.5 rounded-control border border-brand-300 bg-surface px-2.5 text-xs font-semibold text-brand-strong transition-colors hover:border-brand-400 hover:bg-brand-wash"
        >
          <Settings2 className="size-3.5" /> Manage <ChevronRight className="size-3.5" />
        </button>
      ),
    },
  ];

  const tiles: OverviewTile<TileKey>[] = [
    { key: 'all', label: TILE_LABEL.all, value: loading ? undefined : counts.all, icon: Layers, chip: 'bg-brand-wash text-brand-strong', tint: '#fff4e9', tintOn: '#ffe7d2', ring: '#c2540f' },
    { key: 'live', label: TILE_LABEL.live, value: loading ? undefined : counts.live, icon: MessageSquare, chip: 'bg-emerald-50 text-emerald-600', tint: '#e6f7f0', tintOn: '#d0efe2', ring: '#059669' },
    { key: 'drafts', label: TILE_LABEL.drafts, value: loading ? undefined : counts.drafts, icon: FileText, chip: 'bg-amber-50 text-amber-600', tint: '#fff7e6', tintOn: '#feeccb', ring: '#d97706' },
    { key: 'empty', label: TILE_LABEL.empty, value: loading ? undefined : counts.empty, icon: Inbox, chip: 'bg-ink-100 text-subtle', tint: '#f3f4f6', tintOn: '#e5e7eb', ring: '#6b7280' },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <OverviewTiles tiles={tiles} active={tile} allKey="all" onSelect={setTile} ariaLabel="Batch overview — filter the batches" />

      {/* ── Toolbar: Search · summary · Refresh · Report · Add Feedback ── */}
      <div className="no-print mt-3 flex min-w-0 shrink-0 flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-[200px] sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch, form or trainer…"
            aria-label="Search batches"
            className="h-8 w-full rounded-control border border-hairline-strong bg-surface pl-8 pr-8 text-xs text-body transition-colors duration-150 placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-chip text-faint hover:bg-ink-100 hover:text-heading">
              <X size={12} />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <span role="status" title={`${filtered.length} of ${rows.length} batches match the current filters`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-brand-500/30 bg-brand-wash px-2.5 text-xs font-semibold text-brand-strong">
            <span className="tabular-nums">{filtered.length.toLocaleString()}</span>
            <span className="font-medium opacity-80">of {rows.length.toLocaleString()}</span>
          </span>
        )}
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-control px-2 text-xs font-medium text-subtle hover:bg-row-hover hover:text-heading">
            <X className="size-3.5" /> Clear all
          </button>
        )}

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          {!loading && (
            <span className="hidden text-xs text-subtle md:inline">
              <span className="font-semibold tabular-nums text-heading">{totals.forms}</span> forms
              <span className="text-faint"> · </span>
              <span className="font-semibold tabular-nums text-success-700">{totals.published}</span> published
              <span className="text-faint"> · </span>
              <span className="font-semibold tabular-nums text-heading">{totals.responses}</span> responses
            </span>
          )}
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
            disabled={!filtered.length}
            title="Print the listed batches — pick columns, preview, print or export"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-brand-300 bg-surface px-2.5 text-xs font-semibold text-brand-strong transition-colors hover:border-brand-400 hover:bg-brand-wash disabled:cursor-not-allowed disabled:border-hairline-strong disabled:text-faint"
          >
            <Printer className="size-3.5" /> Report
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
            columns={columns}
            rowKey={(r) => r.key}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            isLoading={loading}
            isFiltered={hasActiveFilters}
            fixedLayout
            fillHeight
            onRowClick={onManage}
            emptyTitle={hasActiveFilters ? 'No batches match' : 'No batches yet'}
            emptyHint={hasActiveFilters
              ? 'Try widening or clearing the filters to see more.'
              : "Add batches to this course's enrollment, or create a feedback form."}
            emptyAction={hasActiveFilters ? 'Clear filters' : undefined}
            onEmptyAction={hasActiveFilters ? clearFilters : undefined}
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
