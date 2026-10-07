// Course Report — what it loads.
//
// One full `/getAll/courses-data` read gives the roster and every student's
// stored answers. The exercises, though, are served as ONE batch sees them:
// a course whose We Do / You Do material differs per batch keeps each batch's
// own exercises apart, and a plain read lands on a single batch. So for such a
// course the report also reads each batch's view (`pedagogyOnly=1`, no roster)
// and marks every exercise with the batches it belongs to. A server that
// predates `pedagogyOnly` returns the full payload instead — a superset.

import axios from "axios";
import { API_ORIGIN } from "@/lib/apiBase";

type Loose = Record<string, any>;

export interface ExerciseView {
  data: Loose | null;
  /** The batches this view is for; null when every batch sees the same. */
  batchIds: string[] | null;
}

export interface ReportPayload {
  course: Loose;
  views: ExerciseView[];
}

const authHeaders = (): Record<string, string> => {
  const token = typeof window === "undefined" ? null : localStorage.getItem("smartcliff_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** The course's live batch containers (the ones students sit in). */
export const liveBatches = (course: Loose | null | undefined): Loose[] =>
  ((course?.batchAndParticipants || []) as Loose[]).filter((b) => b?._id && !b?.archivedBySync);

export async function fetchReportPayload(courseId: string): Promise<ReportPayload> {
  const read = async (params: Record<string, string>): Promise<Loose | null> => {
    const res = await axios.get(`${API_ORIGIN}/getAll/courses-data/${courseId}`, { params, headers: authHeaders() });
    return res.data?.data ?? null;
  };

  const course = await read({});
  if (!course) throw new Error("Course not found");

  const batchIds = liveBatches(course).map((b) => String(b._id));
  const cfg = course.batchResources || {};
  const perBatch = batchIds.length > 1
    && cfg.sameForAllBatches === false
    && ((cfg.batchwiseElements || []) as string[]).some((s) => s === "We_Do" || s === "You_Do");
  if (!perBatch) return { course, views: [{ data: course, batchIds: null }] };

  const views = await Promise.all(batchIds.map(async (id) => ({
    data: await read({ pedagogyOnly: "1", batchId: id }),
    batchIds: [id],
  })));
  return { course, views };
}
