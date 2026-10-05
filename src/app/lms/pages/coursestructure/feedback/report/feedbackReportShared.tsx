// Feedback Report — the consolidated report the Feedback Report page
// (report/generate/page.tsx) renders and downloads: the Overall Percentage
// chart + captions, the Consolidated Report sheet, and the Excel (Master
// Data · Feedback · Consolidated Report) / PDF exports. Lifted out of the
// route file VERBATIM so the L&D console's Report tab produces the identical
// report and files; a page file may only export the route's own fields.
'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { format } from 'date-fns';
import { Feedback } from '../types/feedback';
import {
  GRADE_COLORS,
  PARAM_COLORS,
  Workbook,
  thCls,
  tdCls,
  numCls,
} from './workbookShared';

// ─────────────────────────────────────────────────────────────────────────────
// Export — Excel (.xlsx) and PDF downloads of the three workbook sheets
// ─────────────────────────────────────────────────────────────────────────────
const sanitizeFileName = (s: string) =>
  (s || 'Feedback Report').replace(/[\\/:*?"<>|]+/g, '').trim() || 'Feedback Report';

// 1-based column index → Excel letter(s)
const colLetter = (n: number) => {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export async function exportReportExcel(
  feedback: Feedback,
  wb: Workbook,
  audienceCount: number,
  notSubmitted: { id: string; name: string }[]
) {
  const ExcelJSMod: any = await import('exceljs');
  const ExcelJS = ExcelJSMod.default ?? ExcelJSMod;
  // file-saver's export shape differs between CJS/ESM interop — the function
  // can be the named export, live under default, or BE the default itself.
  const fileSaverMod: any = await import('file-saver');
  const saveAs: (blob: Blob, name: string) => void =
    fileSaverMod.saveAs || fileSaverMod.default?.saveAs || fileSaverMod.default;

  const { ratingQuestions, grades, scale, responses, masterRows, gradeCounts, columnTotals, consolidated } = wb;
  const qHeaders = ratingQuestions.map((q) => q.questionText);

  const book = new ExcelJS.Workbook();
  book.created = new Date();

  const styleHeaderRow = (row: any) => {
    row.eachCell((cell: any) => {
      cell.font = { bold: true, size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    row.height = 30;
  };

  // ── Sheet 1: Master Data ──
  const ws1 = book.addWorksheet('Master Data');
  const mdHeader = [
    'ID',
    'Completion Time',
    'Email',
    'Trainee Name',
    'Track / Batch',
    ...qHeaders,
    'Feedback / Comments',
  ];
  styleHeaderRow(ws1.addRow(mdHeader));
  masterRows.forEach((r) =>
    ws1.addRow([
      r.id,
      r.submittedAt ? format(new Date(r.submittedAt), 'dd MMM yyyy, h:mm a') : '',
      r.email,
      r.name,
      r.track,
      ...r.ratings.map((v) => v ?? ''),
      r.comments,
    ])
  );
  ws1.columns = [
    { width: 6 },
    { width: 20 },
    { width: 28 },
    { width: 22 },
    { width: 18 },
    ...qHeaders.map(() => ({ width: 24 })),
    { width: 50 },
  ] as any;
  // Column filters on by default when the file opens
  ws1.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: mdHeader.length } };

  // ── Sheet 2: Feedback ──
  const ws2 = book.addWorksheet('Feedback');
  const fbHeader = ['ID', 'Trainees Name', ...qHeaders, 'Feedback'];
  ws2.mergeCells(1, 1, 1, fbHeader.length);
  const title = ws2.getCell(1, 1);
  title.value = [
    feedback.feedbackTitle,
    feedback.trainerName ? `Trainer : ${feedback.trainerName}` : '',
    'TRAINEES FEEDBACK FORM',
  ]
    .filter(Boolean)
    .join('\n');
  title.font = { bold: true, size: 11 };
  title.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws2.getRow(1).height = 46;
  styleHeaderRow(ws2.addRow(fbHeader));
  masterRows.forEach((r) => ws2.addRow([r.id, r.name, ...r.ratings.map((v) => v ?? ''), r.comments]));
  ws2.columns = [
    { width: 6 },
    { width: 22 },
    ...qHeaders.map(() => ({ width: 24 })),
    { width: 50 },
  ] as any;
  ws2.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: fbHeader.length } };

  // Grade-count matrix below the responses (blank row ends the filter range)
  ws2.addRow([]);
  const label = ws2.addRow(['Grade → No. of Trainees']);
  label.font = { bold: true, size: 10 };
  styleHeaderRow(ws2.addRow(['Grade', ...qHeaders]));
  grades.forEach((g, gi) => ws2.addRow([g, ...gradeCounts.map((counts) => counts[gi])]));
  const totalRow = ws2.addRow(['Total', ...columnTotals]);
  totalRow.font = { bold: true };

  // ── Sheet 3: Consolidated Report ──
  const ws3 = book.addWorksheet('Consolidated Report');
  const csHeader = ['S.No', 'Parameter', ...grades.map((g) => String(g)), 'Percentage'];
  styleHeaderRow(ws3.addRow(csHeader));
  const denominator = responses.length * scale;
  consolidated.forEach((row, i) => {
    const r = ws3.addRow([row.sno, row.parameter, ...row.counts, 0]);
    const pctCell = r.getCell(csHeader.length);
    const excelRow = i + 2;
    const weighted = grades.map((g, gi) => `(${colLetter(3 + gi)}${excelRow}*${g})`).join('+');
    pctCell.value =
      denominator > 0
        ? { formula: `((${weighted})/${denominator})*100`, result: Number(row.percentage.toFixed(2)) }
        : 0;
    pctCell.numFmt = '0.00';
    r.getCell(2).alignment = { wrapText: true, vertical: 'middle' };
  });
  ws3.columns = [
    { width: 6 },
    { width: 60 },
    ...grades.map(() => ({ width: 8 })),
    { width: 12 },
  ] as any;
  ws3.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: csHeader.length } };

  // Submission summary
  ws3.addRow([]);
  const s1 = ws3.addRow([
    `Out of ${audienceCount || '—'} students — ${responses.length} submitted feedback, ${notSubmitted.length} not submitted.`,
  ]);
  s1.font = { bold: true, size: 10 };
  if (notSubmitted.length > 0) {
    const s2 = ws3.addRow(['Not Submitted Trainees:']);
    s2.font = { bold: true, size: 10 };
    const namesRow = ws3.addRow([notSubmitted.map((s) => s.name).join(', ')]);
    namesRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
  }

  const buf = await book.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${sanitizeFileName(feedback.feedbackTitle)} - Report.xlsx`
  );
}

export async function exportReportPdf(
  feedback: Feedback,
  wb: Workbook,
  audienceCount: number,
  notSubmitted: { id: string; name: string }[]
) {
  const { jsPDF } = await import('jspdf');
  const autoTableMod: any = await import('jspdf-autotable');
  const autoTable = autoTableMod.default ?? autoTableMod.autoTable ?? autoTableMod;

  const { ratingQuestions, grades, responses, masterRows, gradeCounts, columnTotals, consolidated } = wb;
  const qHeaders = ratingQuestions.map((q) => q.questionText);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(feedback.feedbackTitle || 'Feedback Report', margin, margin);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110);
  const sub = [
    feedback.trainerName ? `Trainer: ${feedback.trainerName}` : '',
    `Generated: ${format(new Date(), 'dd MMM yyyy, h:mm a')}`,
  ]
    .filter(Boolean)
    .join('   ·   ');
  doc.text(sub, margin, margin + 16);

  let y = margin + 36;
  const section = (titleText: string) => {
    if (y > pageH - 140) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(titleText, margin, y);
    y += 8;
  };
  const afterTable = () => {
    y = (doc as any).lastAutoTable.finalY + 26;
  };
  const tableTheme = {
    styles: { fontSize: 6.5, cellPadding: 3, textColor: 40 },
    headStyles: { fillColor: [238, 242, 255] as [number, number, number], textColor: 30, fontStyle: 'bold' as const },
    margin: { left: margin, right: margin },
  };

  section('Master Data');
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [['ID', 'Completion Time', 'Email', 'Trainee Name', 'Track / Batch', ...qHeaders, 'Feedback / Comments']],
    body: masterRows.map((r) => [
      String(r.id),
      r.submittedAt ? format(new Date(r.submittedAt), 'dd MMM yyyy, h:mm a') : '—',
      r.email,
      r.name,
      r.track,
      ...r.ratings.map((v) => (v == null ? '—' : String(v))),
      r.comments || '—',
    ]),
  });
  afterTable();

  section('Feedback — Grade → No. of Trainees');
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [['Grade', ...qHeaders]],
    body: grades.map((g, gi) => [String(g), ...gradeCounts.map((counts) => String(counts[gi]))]),
    foot: [['Total', ...columnTotals.map(String)]],
    footStyles: { fillColor: [243, 244, 246] as [number, number, number], textColor: 20, fontStyle: 'bold' as const },
  });
  afterTable();

  section('Consolidated Report');
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [['S.No', 'Parameter', ...grades.map(String), 'Percentage']],
    body: consolidated.map((row) => [
      String(row.sno),
      row.parameter,
      ...row.counts.map(String),
      `${row.percentage.toFixed(2)}%`,
    ]),
  });
  afterTable();

  if (y > pageH - 90) {
    doc.addPage();
    y = margin;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(
    `Out of ${audienceCount || '—'} students — ${responses.length} submitted feedback, ${notSubmitted.length} not submitted.`,
    margin,
    y
  );
  if (notSubmitted.length > 0) {
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90);
    const lines = doc.splitTextToSize(
      `Not submitted: ${notSubmitted.map((s) => s.name).join(', ')}`,
      doc.internal.pageSize.getWidth() - margin * 2
    );
    doc.text(lines, margin, y);
  }

  doc.save(`${sanitizeFileName(feedback.feedbackTitle)} - Report.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Consolidated Report sheet — per-parameter grade counts + percentage, then
// the submission summary and not-submitted list (the Excel sheet's bottom
// block). Shared by the report body below and the L&D console's preview.
// ─────────────────────────────────────────────────────────────────────────────
export const ConsolidatedReportTable: React.FC<{
  wb: Workbook;
  audienceCount: number;
  notSubmitted: { id: string; name: string }[];
}> = ({ wb, audienceCount, notSubmitted }) => {
  const { grades, responses, consolidated } = wb;
  return (
        <div className="space-y-4">
            <div className="overflow-auto border border-gray-100 dark:border-gray-800 rounded-md">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-800/80">
                  <tr>
                    <th className={`${thCls} text-center w-14`}>S.No</th>
                    <th className={thCls}>Parameter</th>
                    {grades.map((g) => (
                      <th key={g} className={`${thCls} text-center w-16`}>
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1"
                          style={{ background: GRADE_COLORS[g] || '#6366f1' }}
                        />
                        {g}
                      </th>
                    ))}
                    <th className={`${thCls} text-center w-24`}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidated.map((row) => (
                    <tr key={row.sno} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className={`${numCls} align-middle`}>{row.sno}</td>
                      <td className={`${tdCls} min-w-[280px] align-middle`}>{row.parameter}</td>
                      {row.counts.map((c, gi) => (
                        <td key={gi} className={`${numCls} align-middle`}>
                          {c}
                        </td>
                      ))}
                      <td className={`${numCls} font-bold align-middle`}>
                        <span
                          className={
                            row.percentage >= 90
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : row.percentage >= 75
                              ? 'text-blue-700 dark:text-blue-400'
                              : row.percentage >= 60
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {row.percentage.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Submission summary + not-submitted list (Excel bottom block) */}
            <div className="border border-gray-100 dark:border-gray-800 rounded-md p-3">
              <p className="text-[11.5px] text-gray-700 dark:text-gray-300">
                Out of <span className="font-semibold">{audienceCount || '—'}</span> student
                {audienceCount === 1 ? '' : 's'} —{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {responses.length}
                </span>{' '}
                submitted feedback,{' '}
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {Math.max(0, notSubmitted.length)}
                </span>{' '}
                not submitted.
              </p>
              {notSubmitted.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Not Submitted Trainees
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {notSubmitted.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[10.5px] border border-red-100 dark:border-red-900/40"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Report body — charts + the three workbook tabs
// ─────────────────────────────────────────────────────────────────────────────
export const GeneratedReportBody: React.FC<{
  feedback: Feedback;
  wb: Workbook;
  audienceCount: number;
  notSubmitted: { id: string; name: string }[];
}> = ({ feedback, wb, audienceCount, notSubmitted }) => {
  const { consolidated } = wb;

  // Parameter performance % (the consolidated percentage), sorted
  // worst → best so weak parameters surface first. Each parameter gets its
  // own color and a short code (P1, P2…) — the codes sit under the bars and
  // the caption panel beside the chart spells out what each code means.
  const perfData = [...consolidated]
    .sort((a, b) => a.percentage - b.percentage)
    .map((c, i) => ({
      code: `P${i + 1}`,
      full: c.parameter,
      pct: Number(c.percentage.toFixed(2)),
      color: PARAM_COLORS[i % PARAM_COLORS.length],
    }));

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ── Parameter performance — chart half, captions half ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-3">
            Overall Percentage
          </h3>
          <div className="w-full h-[320px]">
            {perfData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[12px] text-gray-400">
                No rating data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={perfData}
                  margin={{ top: 18, right: 8, bottom: 0, left: -12 }}
                  barCategoryGap={2}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="code"
                    interval={0}
                    tick={{ fontSize: 10.5, fill: '#6b7280', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                    contentStyle={{ fontSize: 11, padding: 6, border: '1px solid #e5e7eb', borderRadius: 4 }}
                    formatter={(v: any) => [`${v}%`, 'Score']}
                    labelFormatter={(_, payload: any) => payload?.[0]?.payload?.full ?? ''}
                  />
                  <Bar
                    dataKey="pct"
                    radius={[3, 3, 0, 0]}
                    barSize={16}
                    minPointSize={2}
                    isAnimationActive={false}
                  >
                    {perfData.map((d) => (
                      <Cell
                        key={d.code}
                        fill={d.pct >= 80 ? '#16a34a' : d.pct >= 60 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                    <LabelList
                      dataKey="pct"
                      position="top"
                      formatter={(v: any) => (typeof v === 'number' ? `${v.toFixed(0)}%` : v)}
                      style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Captions — what each colored bar stands for */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-3">
            Captions
          </h3>
          {perfData.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-[12px] text-gray-400">
              No rating data yet
            </div>
          ) : (
            <ul className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {perfData.map((d) => (
                <li
                  key={d.code}
                  className="flex items-start gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span
                    className="mt-0.5 inline-flex items-center justify-center h-5 min-w-[30px] px-1 rounded text-[10px] font-bold text-white shrink-0"
                    style={{ background: d.color }}
                  >
                    {d.code}
                  </span>
                  <span className="flex-1 text-[11.5px] leading-snug text-gray-700 dark:text-gray-300">
                    {d.full}
                  </span>
                  <span
                    className="text-[11.5px] font-bold tabular-nums shrink-0"
                    style={{ color: d.color }}
                  >
                    {d.pct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Consolidated Report — the only sheet shown here; Master Data
          and Feedback moved to the Report Analysis page ────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-4">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-3 inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> Consolidated Report
        </h4>
        <ConsolidatedReportTable wb={wb} audienceCount={audienceCount} notSubmitted={notSubmitted} />
      </div>
    </div>
  );
};
