import type { FbFormRow } from "@/app/lms/pages/lddashboard/FeedbackReportDesignerModal";
import type { StatusPillTone } from "@/app/lms/shared/ui";

/* Shared vocabulary for the L&D console's Feedback screens — the form list,
 * a form's Feedback tab and its Report tab read a form through these. */

/* ── Form state ───────────────────────────────────────────────────────── */

export type FormStatus = "open" | "upcoming" | "closed";

export const FORM_STATUS: Record<FormStatus, { label: string; tone: StatusPillTone }> = {
    open: { label: "Open", tone: "success" },
    upcoming: { label: "Upcoming", tone: "info" },
    closed: { label: "Closed", tone: "neutral" },
};

/** Not yet started → Upcoming; otherwise the form's own active flag, which
 *  the server's scheduler keeps in step with its start / end dates. */
export function formStatusOf(raw: { startDate?: string; isActive?: boolean } | null | undefined, now = Date.now()): FormStatus {
    const start = raw?.startDate ? Date.parse(raw.startDate) : NaN;
    if (Number.isFinite(start) && now < start) return "upcoming";
    return raw?.isActive ? "open" : "closed";
}

/* ── Rating level ─────────────────────────────────────────────────────── */

/** Average rating (out of 5) → a word. The same bands the Detailed report
 *  designer uses, so a form reads the same level in both places. */
export type RatingLevel = "excellent" | "good" | "average" | "poor";

export const RATING_LEVEL: Record<RatingLevel, { label: string; text: string; dot: string }> = {
    excellent: { label: "Excellent", text: "text-emerald-700", dot: "bg-emerald-500" },
    good: { label: "Good", text: "text-blue-700", dot: "bg-blue-500" },
    average: { label: "Average", text: "text-amber-700", dot: "bg-amber-500" },
    poor: { label: "Poor", text: "text-red-700", dot: "bg-red-500" },
};

export const ratingLevelOf = (avg: number | null): RatingLevel | null => {
    if (avg == null || !Number.isFinite(avg) || avg <= 0) return null;
    if (avg >= 4) return "excellent";
    if (avg >= 3) return "good";
    if (avg >= 2) return "average";
    return "poor";
};

/* ── Dates ────────────────────────────────────────────────────────────── */

/** ISO date → "05 Oct 2026". Empty / invalid → "". */
export const fmtDate = (iso: string | undefined | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const windowLabel = (start?: string | null, end?: string | null): string => {
    const s = fmtDate(start);
    const e = fmtDate(end);
    if (s && e) return `${s} – ${e}`;
    if (s) return `From ${s}`;
    return "—";
};

/* ── List row ─────────────────────────────────────────────────────────── */

/** One form as the list shows it: the row the console already builds for
 *  the Detailed report designer, plus what the list displays and filters. */
export type FeedbackRow = FbFormRow & {
    status: FormStatus;
    level: RatingLevel | null;
    start: string;
    end: string;
};

export function toFeedbackRow(form: FbFormRow, now = Date.now()): FeedbackRow {
    const raw = form.raw || {};
    return {
        ...form,
        status: formStatusOf(raw, now),
        level: ratingLevelOf(form.avg),
        start: raw.startDate || "",
        end: raw.endDate || "",
    };
}
