// app/lms/pages/coursestructure/feedback/report/generate/page.tsx
//
// "Feedback Report" page — a web replica of the Feedback_Report_Sample.xlsx
// workbook. Up top, the Parameter Performance chart (per-parameter colors)
// sits beside a caption panel explaining each colored bar; below is the
// Consolidated Report sheet — per-parameter grade counts + percentage
// (Excel: =(((C3*5)+(D3*4)+(E3*3)+(F3*2)+(G3*1))/(responses*5))*100).
// The Master Data and Feedback sheets are shown on the Report Analysis page;
// the Excel/PDF exports still include all three sheets.
'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Poppins } from 'next/font/google';
import {
  Home,
  BookMarked,
  MessageSquare,
  BarChart3,
  ArrowLeft,
  AlertCircle,
  FileSpreadsheet,
  Download,
  FileText,
  Loader2,
  Printer,
  ChevronDown,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import DashboardLayout from '../../../../../component/layout';
import { StaffLayout } from '../../../../../component/stafflayout/staff-layout';
import { useGetFeedbackById } from '../../hooks/useFeedback';
import { useReportFilters, ReportFilterBar } from '../ReportFilters';
import { getUserRole } from '../../../coursestructurecomponents/types/util';
import { buildWorkbook, Workbook } from '../workbookShared';
// The report body and its Excel / PDF exporters live in their own module so
// the L&D console's Report tab produces the same report (a route file may
// only export the page).
import { exportReportExcel, exportReportPdf, GeneratedReportBody } from '../feedbackReportShared';
// Print / Preview — the shared column-picker + letterhead print modal. The
// Excel / PDF downloads above are untouched; this only replaces "print".
import FeedbackPrintPreview, { type FeedbackPrintSpec } from '../FeedbackPrintPreview';
import { FORM_SHEETS, buildFormSheetSpec, type FormSheetKind } from '../feedbackPrintSheets';
import { filtersLine } from '../../feedbackComponts/feedbackListModel';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function GenerateFeedbackReportPage() {
  return (
    <Suspense
      fallback={
        <div className={`${poppins.className} flex justify-center items-center h-screen bg-white`}>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <GenerateReportContent />
    </Suspense>
  );
}

function GenerateReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const feedbackId = searchParams.get('feedbackId') || '';
  const courseId = searchParams.get('courseId') || '';
  // The batch view the report was opened from — carried back to the list.
  const batchQ = searchParams.get('batch');
  const batchSuffix = batchQ ? `&batch=${encodeURIComponent(batchQ)}` : '';

  const [userRole, setUserRole] = useState<string>('');
  useEffect(() => setUserRole(getUserRole()), []);

  const { data: feedback, isLoading, isError, error } = useGetFeedbackById(feedbackId);

  // Shared filter bar state — Batch / Semester / Section (degree courses) /
  // Trainer. The hook fetches the course doc, scopes the trainer list to the
  // selected batch, merges forms for "All trainers" and filters responses by
  // the responding student's section/semester. Same module as the Report
  // Analysis page, so both pages slice reports identically.
  const rf = useReportFilters(courseId, feedbackId, feedback);
  const { activeFeedback, audience, notSubmitted, batchNameByStudent, trainerOptions, trainerSel } = rf;

  const wb: Workbook | null = useMemo(
    () => (activeFeedback ? buildWorkbook(activeFeedback, batchNameByStudent) : null),
    [activeFeedback, batchNameByStudent]
  );

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const runExport = async (kind: 'excel' | 'pdf') => {
    if (!activeFeedback || !wb) return;
    setExportOpen(false);
    setExporting(kind);
    try {
      if (kind === 'excel') {
        await exportReportExcel(activeFeedback, wb, audience.length, notSubmitted);
      } else {
        await exportReportPdf(activeFeedback, wb, audience.length, notSubmitted);
      }
    } finally {
      setExporting(null);
    }
  };

  // Print / Preview — the sheet is built once per click and kept in state.
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [printSpec, setPrintSpec] = useState<FeedbackPrintSpec | null>(null);

  const trainerLabel =
    rf.trainerSel === 'all'
      ? rf.trainerOptions.length > 1
        ? `All trainers (${rf.trainerOptions.length})`
        : activeFeedback?.trainerName || 'All trainers'
      : rf.trainerOptions.find((o) => o.feedbackId === rf.trainerSel)?.trainerName || 'Trainer';
  const filtersText = filtersLine(
    [
      rf.isDegree && rf.secSel !== 'all' ? `Section ${rf.secSel}` : '',
      rf.isDegree && rf.semSel !== 'all' ? `Sem ${rf.semSel}` : '',
    ].filter(Boolean)
  );

  const openPrint = (kind: FormSheetKind) => {
    setPrintMenuOpen(false);
    if (!activeFeedback || !wb) return;
    setPrintSpec(
      buildFormSheetSpec(kind, {
        feedback: activeFeedback,
        wb,
        audience,
        notSubmitted,
        batchLabel: rf.batchSel,
        trainerLabel,
        filtersText,
      })
    );
  };

  const adminRole =
    userRole === 'admin' ||
    userRole === 'ldhead' ||
    userRole === 'subhead' ||
    userRole === 'programcoordinator';

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`${poppins.className} h-full flex flex-col bg-white dark:bg-gray-950 overflow-hidden`}
    >
      {/* Breadcrumb */}
      <div className="px-3 sm:px-4 pt-2 flex-shrink-0">
        <Breadcrumb>
          <BreadcrumbList className="text-[11px]">
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/lms/pages/admindashboard"
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Home className="h-3 w-3" /> Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-300 dark:text-gray-600" />
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/lms/pages/coursestructure"
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                <BookMarked className="h-3 w-3" /> Courses
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-300 dark:text-gray-600" />
            <BreadcrumbItem>
              <BreadcrumbLink
                href={
                  courseId
                    ? `/lms/pages/coursestructure/feedback?courseId=${courseId}${batchSuffix}`
                    : '/lms/pages/coursestructure'
                }
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                <MessageSquare className="h-3 w-3" /> Feedback
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-300 dark:text-gray-600" />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-200">
                <FileSpreadsheet className="h-3 w-3" /> Feedback Report
              </BreadcrumbPage>
            </BreadcrumbItem>
            {activeFeedback?.feedbackTitle && (
              <>
                <BreadcrumbSeparator className="text-gray-300 dark:text-gray-600" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 max-w-[240px] truncate">
                    {activeFeedback.feedbackTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Title row */}
      <div className="px-4 pt-1.5 pb-2 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight leading-tight truncate">
            {activeFeedback?.feedbackTitle
              ? `Feedback Report — ${activeFeedback.feedbackTitle}`
              : 'Feedback Report'}
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {!feedback && 'Loading…'}
            {trainerSel === 'all' && trainerOptions.length > 1 ? (
              <>
                Combined report —{' '}
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {trainerOptions.length} trainers
                </span>
              </>
            ) : (
              activeFeedback?.trainerName && (
                <>
                  Trainer{' '}
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {activeFeedback.trainerName}
                  </span>
                </>
              )
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <button
            onClick={() =>
              router.push(
                `/lms/pages/coursestructure/feedback/report?feedbackId=${
                  trainerSel === 'all' ? feedbackId : trainerSel
                }${courseId ? `&courseId=${courseId}` : ''}${batchSuffix}`
              )
            }
            disabled={!feedback}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-semibold border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Report Analysis
          </button>
          <div className="relative">
            <button
              onClick={() => setPrintMenuOpen((v) => !v)}
              disabled={!wb || !activeFeedback}
              title="Pick a sheet, choose its columns, preview and print"
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Preview
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {printMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPrintMenuOpen(false)} />
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 z-50 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1">
                  {FORM_SHEETS.map((sheet) => (
                    <button
                      key={sheet.kind}
                      onClick={() => openPrint(sheet.kind)}
                      className="w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="text-[12px] font-medium text-gray-700 dark:text-gray-200">{sheet.label}</span>
                      <span className="text-[10.5px] text-gray-500 dark:text-gray-400">{sheet.hint}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={!wb || exporting !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {exporting ? 'Exporting…' : 'Export'}
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1">
                  <button
                    onClick={() => runExport('excel')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => runExport('pdf')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <FileText className="h-3.5 w-3.5 text-red-600" />
                    PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar — fixed order: Degree, Batch, Department, Section,
          Semester (degree-only fields hidden on skilling courses), then
          Trainer (All trainers merges every listed form). Every table,
          chart and export below recomputes off the filters. */}
      <ReportFilterBar rf={rf} />

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto px-3 sm:px-4 py-4 bg-gray-50/40 dark:bg-gray-950">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : isError || !feedback || !wb ? (
          <div className="max-w-md mx-auto mt-12 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-[14px] font-semibold text-gray-900 mb-1">Couldn't load report</h3>
            <p className="text-[12px] text-gray-500">
              {(error as any)?.message || 'Feedback document not found.'}
            </p>
          </div>
        ) : (
          <GeneratedReportBody
            feedback={activeFeedback!}
            wb={wb}
            audienceCount={audience.length}
            notSubmitted={notSubmitted}
          />
        )}
      </div>

      {/* Print / Preview — Print only; the Export menu keeps the Excel / PDF downloads. */}
      <FeedbackPrintPreview spec={printSpec} onClose={() => setPrintSpec(null)} showExport={false} />
    </motion.div>
  );

  return adminRole ? <DashboardLayout>{content}</DashboardLayout> : <StaffLayout>{content}</StaffLayout>;
}
