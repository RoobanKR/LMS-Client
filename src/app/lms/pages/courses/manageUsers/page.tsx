"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactDOM from "react-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft, Users, ClipboardList, MoreVertical, Lock, X, AlertTriangle,
  Search, RefreshCw, CheckCircle, Clock, Mail,
} from "lucide-react";
import { retestApi, type RetestRequestRecord, type EnrolledStudent } from "@/apiServices/retest";
import { exerciseApi } from "@/apiServices/exercise";

// ─── Design tokens ──────────────────────────────────────────────────────────
const T = {
  blue: "#2563eb",
  cyan: "#0891b2",
  textMain: "#1a1a2e",
  textSub: "#475569",
  textMuted: "#64748b",
  textHint: "#94a3b8",
  border: "#e9eaf0",
  bg: "#ffffff",
  pageBg: "#f7f8fb",
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#16a34a",
};

const AVATAR_COLORS = [
  { bg: "#fee2e2", fg: "#dc2626" },
  { bg: "#dbeafe", fg: "#2563eb" },
  { bg: "#dcfce7", fg: "#16a34a" },
  { bg: "#fef3c7", fg: "#d97706" },
  { bg: "#ede9fe", fg: "#7c3aed" },
  { bg: "#cffafe", fg: "#0891b2" },
  { bg: "#fce7f3", fg: "#db2777" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string): string => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const colorForName = (name: string) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const formatDateTime = (d?: string | null): string => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
};

const toLocalInput = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Map enrolled-student exerciseProgress.status → a friendly submission badge
const STUDENT_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not Submitted", color: "#64748b", bg: "rgba(100,116,139,0.10)" },
  in_progress: { label: "In Progress", color: "#2563eb", bg: "rgba(37,99,235,0.10)" },
  evaluated: { label: "Submitted", color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
  completed: { label: "Submitted", color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
  submitted: { label: "Submitted", color: "#16a34a", bg: "rgba(22,163,74,0.10)" },
};

const REQUEST_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  Pending: { label: "Pending", color: "#b45309", bg: "rgba(245,158,11,0.12)" },
  Approved: { label: "Approved", color: "#15803d", bg: "rgba(22,163,74,0.12)" },
  Rejected: { label: "Rejected", color: "#b91c1c", bg: "rgba(239,68,68,0.12)" },
};

// ─── Avatar ─────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ name: string }> = ({ name }) => {
  const c = colorForName(name);
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: 34, height: 34, background: c.bg, color: c.fg, fontSize: 12, fontWeight: 700 }}
    >
      {getInitials(name)}
    </div>
  );
};

// ─── Status badge ───────────────────────────────────────────────────────────
const Badge: React.FC<{ label: string; color: string; bg: string }> = ({ label, color, bg }) => (
  <span
    className="inline-flex items-center px-2.5 py-1 rounded-full"
    style={{ fontSize: 11, fontWeight: 600, color, background: bg }}
  >
    {label}
  </span>
);

// ─── Users List row 3-dot menu → "Unlock Assessment" ──────────────────────────
const UsersRowMenu: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [open, setOpen] = useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    update();
    const close = (e: MouseEvent) => {
      const t = e.target as Element;
      if (btnRef.current && !btnRef.current.contains(t) && !t.closest?.(".users-row-menu")) setOpen(false);
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    document.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      document.removeEventListener("mousedown", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        title="Actions"
        className="p-1.5 rounded-lg"
        style={{ color: T.textHint, background: open ? "#f1f5f9" : "transparent", border: "none", cursor: "pointer", lineHeight: 0 }}
      >
        <MoreVertical size={16} />
      </button>
      {open && pos && typeof document !== "undefined" && ReactDOM.createPortal(
        <div
          className="users-row-menu"
          style={{
            position: "fixed", top: pos.top, right: pos.right, zIndex: 100000,
            background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)", padding: 4, minWidth: 184,
          }}
        >
          <button
            onClick={() => { setOpen(false); onUnlock(); }}
            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg"
            style={{ fontSize: 12.5, fontWeight: 600, color: T.cyan, background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(8,145,178,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Lock size={13} /> Unlock Assessment
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

// ─── Unlock confirmation modal (warning + per-student window) ─────────────────
interface UnlockModalProps {
  name: string;
  requireSchedule: boolean;
  onClose: () => void;
  onConfirm: (startISO?: string, endISO?: string) => void;
  loading?: boolean;
}
const UnlockModal: React.FC<UnlockModalProps> = ({ name, requireSchedule, onClose, onConfirm, loading }) => {
  const now = new Date();
  const [start, setStart] = useState(toLocalInput(now));
  const [end, setEnd] = useState(toLocalInput(new Date(now.getTime() + 24 * 60 * 60 * 1000)));
  const [touched, setTouched] = useState(false);

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const invalid = requireSchedule && (!startDate || !endDate || endDate <= startDate);

  const handleConfirm = () => {
    setTouched(true);
    if (invalid || loading) return;
    if (requireSchedule) onConfirm(new Date(start).toISOString(), new Date(end).toISOString());
    else onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: "rgba(15,15,30,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: 440, background: "#fffdf7", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full"
          style={{ color: T.textMuted, background: "transparent", border: "none", cursor: "pointer" }}
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center px-7 pt-7 pb-3">
          <div
            className="flex items-center justify-center rounded-full mb-3"
            style={{ width: 56, height: 56, background: "rgba(245,158,11,0.15)", color: T.amber }}
          >
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-[18px] font-bold" style={{ color: T.textMain }}>Unlock Assessment?</h3>
          <p className="text-[13px] mt-1.5" style={{ color: T.textSub }}>
            Are you sure you want to unlock the assessment for{" "}
            <span className="font-semibold" style={{ color: T.textMain }}>{name}</span>?
          </p>
        </div>

        {requireSchedule ? (
        /* Assessment window has ended — give this student their own retest window */
        <div className="px-7 pb-2">
          <div
            className="rounded-xl p-3.5"
            style={{ background: "#fff", border: `1px solid ${T.border}` }}
          >
            <p className="text-[11px] font-semibold mb-2.5" style={{ color: T.textMuted }}>
              The assessment window has ended — set a retest window for this student only
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: T.textSub }}>Start</label>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={e => setStart(e.target.value)}
                  className="w-full text-[12px] rounded-lg px-2.5 py-2 outline-none"
                  style={{ border: `1.5px solid ${T.border}`, color: T.textMain }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: T.textSub }}>End</label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                  className="w-full text-[12px] rounded-lg px-2.5 py-2 outline-none"
                  style={{ border: `1.5px solid ${touched && invalid ? "#fca5a5" : T.border}`, color: T.textMain }}
                />
              </div>
            </div>
            {touched && invalid && (
              <p className="text-[11px] mt-2 flex items-center gap-1" style={{ color: T.red }}>
                <AlertTriangle size={11} /> End time must be after the start time.
              </p>
            )}
            <p className="text-[10.5px] mt-2.5 leading-relaxed" style={{ color: T.textHint }}>
              The student's previous answers are cleared and the Start button reappears for them only during this window.
            </p>
          </div>
        </div>
        ) : (
        /* Assessment still open — a plain reset is enough, no schedule needed */
        <div className="px-7 pb-2">
          <div className="rounded-xl p-3.5" style={{ background: "#fff", border: `1px solid ${T.border}` }}>
            <p className="text-[12px] leading-relaxed" style={{ color: T.textSub }}>
              This assessment is still open, so no schedule is needed. Unlocking clears{" "}
              <span className="font-semibold" style={{ color: T.textMain }}>{name}</span>'s previous answers so they can retake it within the assessment's current window.
            </p>
          </div>
        </div>
        )}

        <div className="flex items-center gap-3 px-7 py-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold"
            style={{ background: "#fff", color: T.textSub, border: `1.5px solid ${T.border}`, cursor: loading ? "not-allowed" : "pointer" }}
          >
            No, Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || invalid}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2"
            style={{ background: loading || invalid ? "#fca5a5" : T.red, border: "none", cursor: loading || invalid ? "not-allowed" : "pointer" }}
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Unlocking…</>
            ) : (
              <><Lock size={14} /> Yes, Unlock</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main inner component ─────────────────────────────────────────────────────
function ManageUsersInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const courseId = sp.get("courseId") || "";
  const exerciseId = sp.get("exerciseId") || "";
  const assessmentName = sp.get("assessmentName") || "Assessment";
  const subcategory = sp.get("subcategory") || "";

  const [tab, setTab] = useState<"users" | "requests">(
    sp.get("tab") === "requests" ? "requests" : "users"
  );
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [requests, setRequests] = useState<RetestRequestRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [unlockTarget, setUnlockTarget] = useState<{
    studentId: string; name: string; requestId?: string;
    subcategory?: string; exerciseName?: string; exerciseId?: string;
  } | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  // Whether the assessment is still within its own schedule. If it has ended,
  // the coordinator sets a per-student retest window on unlock; if still open,
  // unlocking is a plain reset (the student retakes within the current window).
  const [assessmentActive, setAssessmentActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!exerciseId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await exerciseApi.getExerciseById(exerciseId);
        const ex = res?.data?.exercise || res?.exercise || res?.data;
        const end = ex?.availabilityPeriod?.endDate;
        if (!cancelled) setAssessmentActive(end ? new Date() <= new Date(end) : true);
      } catch {
        if (!cancelled) setAssessmentActive(null);
      }
    })();
    return () => { cancelled = true; };
  }, [exerciseId]);

  const fetchStudents = useCallback(async () => {
    if (!courseId || !exerciseId) return;
    setLoadingStudents(true);
    setError(null);
    try {
      const res = await retestApi.getEnrolledStudents(courseId, exerciseId);
      setStudents(res?.data?.students || res?.students || res?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  }, [courseId, exerciseId]);

  const fetchRequests = useCallback(async () => {
    if (!courseId || !exerciseId) return;
    setLoadingRequests(true);
    try {
      const res = await retestApi.getRequests(courseId, exerciseId);
      setRequests(res?.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to load requests");
    } finally {
      setLoadingRequests(false);
    }
  }, [courseId, exerciseId]);

  useEffect(() => { fetchStudents(); fetchRequests(); }, [fetchStudents, fetchRequests]);

  const handleUnlock = async (startISO?: string, endISO?: string) => {
    if (!unlockTarget) return;
    setUnlocking(true);
    try {
      await retestApi.unlock({
        targetUserId: unlockTarget.studentId,
        courseId,
        exerciseId: unlockTarget.exerciseId || exerciseId,
        subcategory: unlockTarget.subcategory || subcategory,
        category: "You_Do",
        exerciseName: unlockTarget.exerciseName || assessmentName,
        retestStart: startISO || undefined,
        retestEnd: endISO || undefined,
        requestId: unlockTarget.requestId,
      });
      toast.success(`Assessment unlocked for ${unlockTarget.name}`);
      setUnlockTarget(null);
      await Promise.all([fetchStudents(), fetchRequests()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to unlock assessment");
    } finally {
      setUnlocking(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const pendingCount = useMemo(() => requests.filter(r => r.status === "Pending").length, [requests]);

  return (
    <div className="min-h-screen" style={{ background: T.pageBg, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-3"
          style={{ color: T.blue, background: "transparent", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={15} /> Back to Assessments
        </button>

        {/* Title */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: T.textMain }}>Manage Users</h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: T.textMuted }}>
              {assessmentName}
            </p>
          </div>
          <button
            onClick={() => { fetchStudents(); fetchRequests(); }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold"
            style={{ color: T.textSub, background: T.bg, border: `1px solid ${T.border}`, cursor: "pointer" }}
          >
            <RefreshCw size={13} className={loadingStudents || loadingRequests ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: T.bg, border: `1px solid ${T.border}` }}>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 pt-2" style={{ borderBottom: `1px solid ${T.border}` }}>
            {([
              { key: "users", label: "Users List", icon: <Users size={15} /> },
              { key: "requests", label: "Request List", icon: <ClipboardList size={15} /> },
            ] as const).map(t => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold"
                  style={{
                    color: active ? T.blue : T.textMuted,
                    borderBottom: `2px solid ${active ? T.blue : "transparent"}`,
                    background: "transparent", cursor: "pointer", marginBottom: -1,
                  }}
                >
                  {t.icon}{t.label}
                  {t.key === "requests" && pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center text-[10px] font-bold text-white rounded-full"
                      style={{ minWidth: 18, height: 18, padding: "0 5px", background: T.amber }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Users List ── */}
          {tab === "users" && (
            <div>
              <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-[15px] font-bold" style={{ color: T.textMain }}>Enrolled Students</h2>
                  <p className="text-[11.5px]" style={{ color: T.textMuted }}>
                    View and manage students assigned to this assessment.
                  </p>
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.textHint }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search students…"
                    className="pl-7 pr-3 h-8 w-56 text-[12px] rounded-lg outline-none"
                    style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, color: T.textMain }}
                  />
                </div>
              </div>

              {error ? (
                <div className="px-4 py-10 text-center text-[13px]" style={{ color: T.red }}>{error}</div>
              ) : loadingStudents ? (
                <div className="px-4 py-16 flex flex-col items-center gap-3">
                  <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: T.blue, borderTopColor: "transparent" }} />
                  <p className="text-[12px]" style={{ color: T.textMuted }}>Loading students…</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="px-4 py-16 text-center text-[13px]" style={{ color: T.textMuted }}>No students found.</div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "#fafbfc", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
                      {["Student Name", "Email", "Status", "Action"].map((h, i) => (
                        <th key={h} className="text-left px-4 py-2.5"
                          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", color: T.textMuted, textAlign: i === 3 ? "right" : "left" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(s => {
                      const st = STUDENT_STATUS_META[s.exerciseProgress?.status || "not_started"] || STUDENT_STATUS_META.not_started;
                      return (
                        <tr key={s._id} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={s.name} />
                              <span className="text-[13px] font-semibold" style={{ color: T.textMain }}>{s.name || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[12.5px]" style={{ color: T.textSub }}>{s.email || "—"}</td>
                          <td className="px-4 py-3"><Badge label={st.label} color={st.color} bg={st.bg} /></td>
                          <td className="px-4 py-3 text-right">
                            <UsersRowMenu onUnlock={() => setUnlockTarget({ studentId: s._id, name: s.name })} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Request List ── */}
          {tab === "requests" && (
            <div>
              <div className="px-4 pt-4 pb-3">
                <h2 className="text-[15px] font-bold" style={{ color: T.textMain }}>Requested Retest List</h2>
                <p className="text-[11.5px]" style={{ color: T.textMuted }}>
                  View and manage students who have requested to retake the assessment.
                </p>
              </div>

              {loadingRequests ? (
                <div className="px-4 py-16 flex flex-col items-center gap-3">
                  <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: T.blue, borderTopColor: "transparent" }} />
                  <p className="text-[12px]" style={{ color: T.textMuted }}>Loading requests…</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="px-4 py-16 text-center">
                  <ClipboardList size={26} style={{ color: T.textHint }} className="mx-auto mb-2" />
                  <p className="text-[13px] font-semibold" style={{ color: T.textSub }}>No retest requests yet</p>
                  <p className="text-[12px] mt-0.5" style={{ color: T.textMuted }}>Requests from students will appear here.</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: "#fafbfc", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
                      {["Student Name", "Email", "Status", "Message (Reason)", "Requested On", "Action"].map((h, i) => (
                        <th key={h} className="text-left px-4 py-2.5"
                          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", color: T.textMuted, textAlign: i === 5 ? "right" : "left" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(r => {
                      const st = REQUEST_STATUS_META[r.status] || REQUEST_STATUS_META.Pending;
                      const isPending = r.status === "Pending";
                      return (
                        <tr key={r._id} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={r.studentName || ""} />
                              <span className="text-[13px] font-semibold" style={{ color: T.textMain }}>{r.studentName || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[12.5px]" style={{ color: T.textSub }}>{r.studentEmail || "—"}</td>
                          <td className="px-4 py-3"><Badge label={st.label} color={st.color} bg={st.bg} /></td>
                          <td className="px-4 py-3 text-[12px] max-w-[260px]" style={{ color: T.textSub }}>
                            <span className="line-clamp-2">{r.message || "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{ color: T.textMuted }}>
                            {formatDateTime(r.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isPending ? (
                              <button
                                onClick={() => setUnlockTarget({ studentId: r.studentId, name: r.studentName || "this student", requestId: r._id, subcategory: r.subcategory, exerciseName: r.exerciseName, exerciseId: r.exerciseId })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                                style={{ color: T.blue, background: "rgba(37,99,235,0.06)", border: `1px solid rgba(37,99,235,0.3)`, cursor: "pointer" }}
                              >
                                <Lock size={12} /> Unlock
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: T.green }}>
                                <CheckCircle size={13} /> Unlocked
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {unlockTarget && (
        <UnlockModal
          name={unlockTarget.name}
          requireSchedule={assessmentActive !== true}
          loading={unlocking}
          onClose={() => { if (!unlocking) setUnlockTarget(null); }}
          onConfirm={handleUnlock}
        />
      )}
    </div>
  );
}

export default function ManageUsersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.pageBg }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: T.blue, borderTopColor: "transparent" }} />
      </div>
    }>
      <ManageUsersInner />
    </Suspense>
  );
}
