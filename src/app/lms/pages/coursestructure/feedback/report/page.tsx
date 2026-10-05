// app/lms/pages/coursestructure/feedback/report/page.tsx
'use client';
import { useCourseRosterQuery, rosterEnrollments, isStudentUser } from '@/queries/courseRoster';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Poppins } from 'next/font/google';
import {
  Home,
  BookMarked,
  MessageSquare,
  BarChart3,
  Download,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import DashboardLayout from '../../../../component/layout';
import { StaffLayout } from '../../../../component/stafflayout/staff-layout';
import { useGetFeedbackById } from '../hooks/useFeedback';
import { getUserRole } from '../../coursestructurecomponents/types/util';
import {
  buildWorkbook,
  Workbook,
  useBatchNameMap,
} from './workbookShared';
// The report body lives in its own module so the L&D console's Feedback tab
// renders the same analysis (a route file may only export the page).
import { buildReportStats, ReportAnalysisBody, type ReportStats } from './reportAnalysis';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function FeedbackReportPage() {
  return (
    <Suspense
      fallback={
        <div className={`${poppins.className} flex justify-center items-center h-screen bg-white`}>
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <ReportPageContent />
    </Suspense>
  );
}

function ReportPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const feedbackId = searchParams.get('feedbackId') || '';
  const courseId = searchParams.get('courseId') || '';

  const [userRole, setUserRole] = useState<string>('');
  useEffect(() => setUserRole(getUserRole()), []);

  const { data: feedback, isLoading, isError, error } = useGetFeedbackById(feedbackId);

  // Count of students (role === 'student') enrolled in the course. Fetched
  // from the same endpoint other pages use; null while loading so the card
  // can render a dash.
  // Derived from the shared roster entry (queries/courseRoster.ts) — this used
  // to be its own raw fetch of the FULL course payload. null while loading so
  // the card can still render a dash.
  const { data: roster, isLoading: rosterLoading } = useCourseRosterQuery(courseId || '');
  const enrolledStudents: number | null = useMemo(() => {
    if (rosterLoading) return null;
    return rosterEnrollments(roster)
      .map((e: any) => e?.user || e)
      .filter(isStudentUser).length;
  }, [roster, rosterLoading]);

  const stats: ReportStats | null = useMemo(
    () => (feedback ? buildReportStats(feedback) : null),
    [feedback]
  );

  // Workbook sheets (Master Data + Feedback) — same computation as the
  // Feedback Report page, so both show identical data.
  const batchNameByStudent = useBatchNameMap(courseId, feedback);
  const wb: Workbook | null = useMemo(
    () => (feedback ? buildWorkbook(feedback, batchNameByStudent) : null),
    [feedback, batchNameByStudent]
  );

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
      <div className="px-4 pt-2 flex-shrink-0">
        <Breadcrumb>
          <BreadcrumbList className="text-[11px]">
            <BreadcrumbItem>
              <BreadcrumbLink
                href={adminRole ? '/lms/pages/admindashboard' : '/lms/pages/staffdashboard'}
                className="flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-800 hover:underline dark:text-orange-400 dark:hover:text-orange-300"
              >
                <Home className="h-3 w-3" /> Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-300 dark:text-gray-600" />
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/lms/pages/coursestructure"
                className="flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-800 hover:underline dark:text-orange-400 dark:hover:text-orange-300"
              >
                <BookMarked className="h-3 w-3" /> Courses
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-300 dark:text-gray-600" />
            <BreadcrumbItem>
              <BreadcrumbLink
                href={
                  courseId
                    ? `/lms/pages/coursestructure/feedback?courseId=${courseId}`
                    : '/lms/pages/coursestructure'
                }
                className="flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-800 hover:underline dark:text-orange-400 dark:hover:text-orange-300"
              >
                <MessageSquare className="h-3 w-3" /> Feedback
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-300 dark:text-gray-600" />
            <BreadcrumbItem>
              <BreadcrumbLink
                href={`/lms/pages/coursestructure/feedback/report/generate?feedbackId=${feedbackId}${
                  courseId ? `&courseId=${courseId}` : ''
                }`}
                className="flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-800 hover:underline dark:text-orange-400 dark:hover:text-orange-300"
              >
                <Download className="h-3 w-3" /> Generated Report
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-300 dark:text-gray-600" />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-200">
                <BarChart3 className="h-3 w-3" /> Report Analysis
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Title row */}
      <div className="px-4 pt-1.5 pb-2 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight leading-tight truncate">
            {feedback?.feedbackTitle
              ? `Report Analysis — ${feedback.feedbackTitle}`
              : 'Report Analysis'}
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {!feedback && 'Loading…'}
            {(feedback as any)?.trainerName && (
              <>
                Trainer{' '}
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {(feedback as any).trainerName}
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() =>
            router.push(
              `/lms/pages/coursestructure/feedback/report/generate?feedbackId=${feedbackId}&courseId=${courseId}`
            )
          }
          disabled={!feedback}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Feedback Report
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-4 bg-gray-50/40 dark:bg-gray-950">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : isError || !feedback ? (
          <div className="max-w-md mx-auto mt-12 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-[14px] font-semibold text-gray-900 mb-1">Couldn't load report</h3>
            <p className="text-[12px] text-gray-500">
              {error?.message || 'Feedback document not found.'}
            </p>
          </div>
        ) : (
          <ReportAnalysisBody
            feedback={feedback}
            stats={stats!}
            enrolledStudents={enrolledStudents}
            wb={wb}
          />
        )}
      </div>

    </motion.div>
  );

  return adminRole ? <DashboardLayout>{content}</DashboardLayout> : <StaffLayout>{content}</StaffLayout>;
}
