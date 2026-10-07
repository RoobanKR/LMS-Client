// components/FeedbackList.tsx
//
// The Feedback page's container. Owns the course's forms, the roster, the
// delete / publish mutations and the per-form modals, and shows one of two
// levels laid out like Client Management:
//  - FeedbackBatchTable — one row per batch, with a "Manage" button;
//  - FeedbackBatchView  — that batch's own forms (cards, list, Report).
// The open batch is the page's ?batch= when the page drives it (so refresh
// and browser Back work), else local state. Every print goes through the
// shared Print / Preview modal via FeedbackPrintPreview.

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  useGetAllFeedback,
  useDeleteFeedback,
  useToggleFeedbackStatus,
} from '../hooks/useFeedback';
import { Feedback } from '../types/feedback';
import { Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { FeedbackViewModal } from './FeedbackViewModal';
import { FeedbackResponsesModal } from './FeedbackResponsesModal';
import { useCourseRosterQuery } from '@/queries/courseRoster';
import FeedbackBatchTable from './FeedbackBatchTable';
import FeedbackBatchView from './FeedbackBatchView';
import {
  buildBatchRows,
  buildBatchesPrintSpec,
  buildFormsPrintSpec,
  fallbackBatchRow,
  findBatchRow,
} from './feedbackListModel';
import FeedbackPrintPreview, { type FeedbackPrintSpec } from '../report/FeedbackPrintPreview';

interface FeedbackListProps {
  courseId?: string;
  onEdit?: (feedback: Feedback) => void;
  onView?: (feedback: Feedback) => void;
  onCreate?: () => void;
  /** Batch whose management view is open (the page's ?batch=). */
  batchKey?: string | null;
  /** Called to open (key) / leave (null) a batch. When omitted the list keeps the batch in local state. */
  onBatchChange?: (key: string | null) => void;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({
  courseId,
  onEdit,
  onView,
  onCreate,
  batchKey,
  onBatchChange,
}) => {
  const router = useRouter();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  // Built once per click — the print modal resets its column picks whenever
  // the spec's fields change identity.
  const [printSpec, setPrintSpec] = useState<FeedbackPrintSpec | null>(null);

  const {
    data: feedbacks,
    isLoading,
    error,
    isError,
    isFetching,
    refetch,
  } = useGetAllFeedback(courseId);

  // Derived from the shared roster entry (queries/courseRoster.ts): batch
  // order, students per batch and the trainer → batches map legacy forms
  // (saved without a batch) are grouped by.
  const { data: roster, isLoading: rosterLoading } = useCourseRosterQuery(courseId || '');
  // Legacy forms are placed by the roster, so hold the skeleton until both
  // land — otherwise rows reshuffle into their batches a beat later.
  const loading = isLoading || rosterLoading;

  useEffect(() => {
    if (courseId) {
      refetch();
    }
  }, [courseId, refetch]);

  const rows = useMemo(
    () => buildBatchRows(Array.isArray(feedbacks) ? (feedbacks as Feedback[]) : undefined, roster),
    [feedbacks, roster]
  );

  // The open batch — driven by the page's ?batch= when it passes one.
  const [localKey, setLocalKey] = useState<string | null>(null);
  const activeKey = onBatchChange ? (batchKey ?? null) : localKey;
  const changeBatch = onBatchChange ?? setLocalKey;
  const activeRow = activeKey ? (findBatchRow(rows, activeKey) ?? fallbackBatchRow(activeKey)) : null;

  const courseLabel = roster?.courseName
    ? `${roster.courseName}${roster.courseCode ? ` (${roster.courseCode})` : ''}`
    : 'Course';

  const deleteMutation = useDeleteFeedback();
  const toggleStatusMutation = useToggleFeedbackStatus();
  const togglingId = toggleStatusMutation.isPending ? toggleStatusMutation.variables?.id : undefined;

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
    setShowDeleteModal(false);
  };

  const handleToggleStatus = (id: string, isActive: boolean) => {
    toggleStatusMutation.mutate({
      id,
      data: { isActive: !isActive },
    });
  };

  const handleViewFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setShowViewModal(true);
    if (onView) onView(feedback);
  };

  const handleViewResponses = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setShowResponsesModal(true);
  };

  // Same URLs as before, plus the open batch so their Back lands here again.
  const q = (feedbackId: string) =>
    new URLSearchParams({
      feedbackId,
      ...(courseId ? { courseId } : {}),
      ...(activeKey ? { batch: activeKey } : {}),
    }).toString();
  const openQuestions = (f: Feedback) => router.push(`/lms/pages/coursestructure/feedback/questions?${q(f._id)}`);
  const openReport = (f: Feedback) => router.push(`/lms/pages/coursestructure/feedback/report/generate?${q(f._id)}`);

  if (isError || error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-8">
        <div className="text-red-600 flex flex-col items-center gap-3">
          <AlertCircle className="h-10 w-10" />
          <div className="text-center">
            <h3 className="text-base font-semibold">Error Loading Feedbacks</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {error?.message || 'Failed to load feedback data'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {activeRow ? (
        <FeedbackBatchView
          key={activeRow.key.toLowerCase()}
          batch={activeRow}
          loading={loading}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          onBack={() => changeBatch(null)}
          onCreate={onCreate}
          togglingId={togglingId}
          actions={{
            questions: openQuestions,
            responses: handleViewResponses,
            report: openReport,
            view: handleViewFeedback,
            edit: onEdit,
            toggle: (f) => handleToggleStatus(f._id, f.isActive),
            remove: (f) => {
              setSelectedFeedback(f);
              setShowDeleteModal(true);
            },
          }}
          onReport={(forms, filtersText) =>
            setPrintSpec(buildFormsPrintSpec(forms, activeRow, { courseLabel, filtersText }))
          }
        />
      ) : (
        <FeedbackBatchTable
          rows={rows}
          loading={loading}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          onCreate={onCreate}
          onManage={(r) => changeBatch(r.key)}
          onReport={(rs, filtersText) => setPrintSpec(buildBatchesPrintSpec(rs, { courseLabel, filtersText }))}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Feedback
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "<span className="font-medium text-gray-900 dark:text-white">{selectedFeedback.feedbackTitle}</span>"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedFeedback._id)}
                className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      <FeedbackViewModal
        feedback={selectedFeedback}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedFeedback(null);
        }}
      />

      {/* Responses Modal */}
      <FeedbackResponsesModal
        feedback={selectedFeedback}
        isOpen={showResponsesModal}
        onClose={() => {
          setShowResponsesModal(false);
          setSelectedFeedback(null);
        }}
      />

      {/* Print / Preview — list-level sheets keep the modal's Export menu. */}
      <FeedbackPrintPreview spec={printSpec} onClose={() => setPrintSpec(null)} showExport />
    </div>
  );
};
