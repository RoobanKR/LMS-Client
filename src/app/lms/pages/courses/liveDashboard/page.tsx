"use client";

import React, { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, MonitorPlay, Send,
  Users, CheckCircle2, Loader2, Clock, XCircle, Flag,
  GraduationCap, Layers, BookOpen, ClipboardList, Tag,
} from "lucide-react";
import { getSocket } from "@/apiServices/socketClient";
import { useLiveDashboard } from "./hooks/useLiveDashboard";
import StudentRow from "./components/StudentRow";
import StudentDetailsPage from "./components/StudentDetailsPage";
import MessageStudentModal from "./components/MessageStudentModal";
import BroadcastMessageModal from "./components/BroadcastMessageModal";

const HEADERS = [
  "S. No.", "Student Name", "Email", "Total Questions", "Completed",
  "Yet To Complete", "Not Attempted", "In Progress", "Completion %",
  "Test Status", "Actions",
];
const LEFT_ALIGN = new Set(["S. No.", "Student Name", "Email"]);

// Emit a proctor message over the shared socket and resolve with the server ack.
function emitWithAck(event: string, payload: Record<string, any>) {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    let settled = false;
    const done = (r: { ok: boolean; error?: string }) => { if (!settled) { settled = true; resolve(r); } };
    try {
      getSocket().emit(event, payload, (resp: any) =>
        done(resp?.ok ? { ok: true } : { ok: false, error: resp?.error || "Failed to send" }));
    } catch {
      done({ ok: false, error: "Connection error" });
    }
    setTimeout(() => done({ ok: false, error: "Timed out — check your connection." }), 10000);
  });
}

// Windowed page list, e.g. [1, '…', 4, 5, 6, '…', 12].
function buildPageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

function LiveDashboardInner() {
  const router = useRouter();
  const params = useSearchParams();
  const assessmentId = params.get("assessmentId") || params.get("exerciseId") || "";
  const courseId = params.get("courseId") || "";
  const nodeId = params.get("nodeId") || "";
  const nodeType = params.get("nodeType") || "";
  const moduleName = params.get("moduleName") || "";
  const submoduleName = params.get("submoduleName") || "";
  const topicName = params.get("topicName") || "";
  const subtopicName = params.get("subtopicName") || "";
  const tabType = params.get("tabType") || "";
  const subcategory = params.get("subcategory") || "";

  // Open the Live Screen Monitoring page, forwarding the same context params.
  const openLiveScreens = () => {
    const qs = new URLSearchParams();
    if (assessmentId) { qs.set("assessmentId", assessmentId); qs.set("exerciseId", assessmentId); }
    if (courseId) qs.set("courseId", courseId);
    if (nodeId) qs.set("nodeId", nodeId);
    if (nodeType) qs.set("nodeType", nodeType);
    router.push(`/lms/pages/courses/liveScreens?${qs.toString()}`);
  };

  const { students, totalStudents, assessmentName, courseName, isLoading, error } = useLiveDashboard({
    assessmentId, courseId, nodeId, nodeType,
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messageStudentId, setMessageStudentId] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Stable callbacks → StudentRow memoization stays intact.
  const handleViewDetails = useCallback((id: string) => setSelectedStudentId(id), []);
  const handleSendMessage = useCallback((id: string) => setMessageStudentId(id), []);

  const messageStudent = useMemo(
    () => students.find(s => s.id === messageStudentId) || null,
    [students, messageStudentId],
  );

  const sendIndividual = useCallback(
    (text: string) =>
      emitWithAck("proctor:send_message", { assessmentId, studentId: messageStudentId, message: text }),
    [assessmentId, messageStudentId],
  );
  const sendBroadcast = useCallback(
    (text: string) => emitWithAck("proctor:broadcast_message", { assessmentId, message: text }),
    [assessmentId],
  );

  // ── Summary stats (top cards) ──────────────────────────────────────────────
  const total = totalStudents || students.length;
  const stats = useMemo(() => {
    const completed = students.filter(s => (s.completionPercent ?? 0) >= 100).length;
    const inProgress = students.filter(s => s.inProgress).length;
    const notAttempted = students.filter(
      s => (s.completed ?? 0) === 0 && !s.inProgress && (s.completionPercent ?? 0) < 100,
    ).length;
    const yetToComplete = Math.max(0, total - completed - inProgress);
    const totalQuestions = students.reduce((m, s) => Math.max(m, s.totalQuestions || 0), 0);
    const pct = (n: number) => (total ? `${((n / total) * 100).toFixed(2)}%` : "0%");
    return { completed, inProgress, notAttempted, yetToComplete, totalQuestions, pct };
  }, [students, total]);

  const totalPages = Math.max(1, Math.ceil(students.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * rowsPerPage;
  const pageStudents = useMemo(
    () => students.slice(startIdx, startIdx + rowsPerPage),
    [students, startIdx, rowsPerPage],
  );
  const pageItems = useMemo(() => buildPageItems(safePage, totalPages), [safePage, totalPages]);

  // ── Breadcrumb trail: course › module › submodule › topic › subtopic › tab › subcategory ──
  // (course name comes from the dashboard API; every other level comes from the URL, shown only when present.)
  const tabLabel = tabType.replace(/_/g, " ").trim(); // "You_Do" → "You Do"
  const baseCrumbs: { label: string; Icon?: any; onClick?: () => void }[] = [
    ...(courseName ? [{ label: courseName, Icon: GraduationCap, onClick: () => router.back() }] : []),
    ...(moduleName ? [{ label: moduleName, Icon: Layers }] : []),
    ...(submoduleName ? [{ label: submoduleName, Icon: Layers }] : []),
    ...(topicName ? [{ label: topicName, Icon: BookOpen }] : []),
    ...(subtopicName ? [{ label: subtopicName, Icon: BookOpen }] : []),
    ...(tabLabel ? [{ label: tabLabel, Icon: ClipboardList }] : []),
    ...(subcategory ? [{ label: subcategory, Icon: Tag }] : []),
  ];

  // Shared breadcrumb bar — identical markup for the dashboard and the student-details view.
  const renderBreadcrumbBar = (
    crumbs: { label: string; Icon?: any; onClick?: () => void }[],
    onBack: () => void,
  ) => (
    <div className="flex items-center gap-2.5 px-5 py-3 border-b border-gray-100 flex-shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <nav className="flex items-center min-w-0 overflow-hidden text-[12.5px]">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const clickable = !isLast && !!c.onClick;
          return (
            <React.Fragment key={`${c.label}-${i}`}>
              {i > 0 && <ChevronRight size={13} strokeWidth={2} className="text-gray-300 flex-shrink-0 mx-0.5" />}
              <button
                type="button"
                onClick={clickable ? c.onClick : undefined}
                disabled={!clickable}
                className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-colors ${
                  isLast
                    ? "text-slate-600 font-semibold cursor-default"
                    : "text-blue-600 hover:text-blue-700 hover:underline"
                }`}
              >
                {c.Icon && <c.Icon size={13} strokeWidth={2} className="flex-shrink-0" />}
                <span className={!isLast ? "truncate max-w-[200px]" : "whitespace-nowrap"}>{c.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );

  // ── Student details view (after "View Details") — same breadcrumb, then details ──
  if (selectedStudentId) {
    const studentCrumbs = [
      ...baseCrumbs,
      { label: "Live Dashboard", onClick: () => setSelectedStudentId(null) },
      { label: "Student Details" },
    ];
    return (
      <div className="h-screen flex flex-col bg-white">
        {renderBreadcrumbBar(studentCrumbs, () => setSelectedStudentId(null))}
        <div className="flex-1 min-h-0 flex flex-col p-5">
          <StudentDetailsPage
            assessmentId={assessmentId}
            studentId={selectedStudentId}
            onBack={() => setSelectedStudentId(null)}
          />
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Students", value: total, sub: "All Enrolled", subClass: "text-gray-400", Icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
    { label: "Completed", value: stats.completed, sub: stats.pct(stats.completed), subClass: "text-green-600", Icon: CheckCircle2, iconBg: "bg-green-50", iconColor: "text-green-600" },
    { label: "In Progress", value: stats.inProgress, sub: stats.pct(stats.inProgress), subClass: "text-amber-500", Icon: Loader2, iconBg: "bg-amber-50", iconColor: "text-amber-500" },
    { label: "Yet To Complete", value: stats.yetToComplete, sub: stats.pct(stats.yetToComplete), subClass: "text-purple-600", Icon: Clock, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
    { label: "Not Attempted", value: stats.notAttempted, sub: stats.pct(stats.notAttempted), subClass: "text-red-500", Icon: XCircle, iconBg: "bg-red-50", iconColor: "text-red-500" },
    { label: "Total Questions", value: stats.totalQuestions, sub: "Across Test", subClass: "text-gray-400", Icon: Flag, iconBg: "bg-indigo-50", iconColor: "text-indigo-600" },
  ];

  const breadcrumbs = [...baseCrumbs, { label: "Live Dashboard" }];

  // ── All-students dashboard ──────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-white">
      {renderBreadcrumbBar(breadcrumbs, () => router.back())}

      {/* Content area — header + cards stay fixed; only the table below scrolls */}
      <div className="flex-1 min-h-0 flex flex-col p-5 gap-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold text-gray-900">Live Dashboard – Students Progress</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {assessmentName || "Assessment"} · Live Session
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setBroadcastOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm"
              title="Send a message to all students in live session"
            >
              <Send size={16} />
              Send Message to All
            </button>
            <button
              type="button"
              onClick={openLiveScreens}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
              title="View students' live screens"
            >
              <MonitorPlay size={16} />
              Live Screens
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 flex-shrink-0">
          {cards.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <c.Icon size={18} className={c.iconColor} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-gray-500 truncate">{c.label}</p>
                  <p className="text-[22px] font-bold text-gray-900 leading-tight">{c.value}</p>
                </div>
              </div>
              <p className={`text-[11px] font-semibold mt-2 ${c.subClass}`}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Table — fills remaining height; body scrolls, pagination stays pinned */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-[13px] text-gray-400">Loading live dashboard…</div>
          ) : error ? (
            <div className="p-10 text-center text-[13px] text-red-500">{error}</div>
          ) : (
            <>
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {HEADERS.map(h => (
                        <th
                          key={h}
                          className={`sticky top-0 z-10 bg-gray-50 px-4 py-3 text-[12px] font-semibold text-gray-600 whitespace-nowrap ${LEFT_ALIGN.has(h) ? "text-left" : "text-center"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageStudents.map((s, i) => (
                      <StudentRow
                        key={s.id}
                        student={s}
                        index={startIdx + i}
                        onViewDetails={handleViewDetails}
                        onSendMessage={handleSendMessage}
                      />
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={HEADERS.length} className="px-4 py-10 text-center text-[13px] text-gray-400">
                          No students have joined yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer / pagination — pinned at the bottom of the card, always visible */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 flex-shrink-0">
                <span className="text-[13px] text-gray-500">
                  {students.length === 0
                    ? "No students"
                    : `Showing ${startIdx + 1} to ${Math.min(startIdx + rowsPerPage, students.length)} of ${students.length} students`}
                </span>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-[13px] text-gray-700 outline-none focus:border-indigo-400"
                    >
                      {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {pageItems.map((p, idx) =>
                      p === "…" ? (
                        <span key={`e${idx}`} className="w-8 h-8 flex items-center justify-center text-[13px] text-gray-400">…</span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition-colors ${
                            p === safePage
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}

                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messaging popups */}
      <MessageStudentModal
        student={messageStudent}
        onClose={() => setMessageStudentId(null)}
        onSend={sendIndividual}
      />
      <BroadcastMessageModal
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        onSend={sendBroadcast}
      />
    </div>
  );
}

export default function LiveDashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-[13px] text-gray-400">Loading…</div>}>
      <LiveDashboardInner />
    </Suspense>
  );
}
