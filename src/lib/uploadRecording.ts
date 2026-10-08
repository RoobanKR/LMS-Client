import { getToken } from "@/lib/session";
import { API_ORIGIN } from "@/lib/apiBase";

/** Upload an assessment recording to the authenticated VPS storage endpoint. */
export async function uploadRecordingToVps(blob: Blob, filename: string, purpose: "assessment" | "mock" = "assessment"): Promise<string> {
  const token = getToken() || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null) || "";
  if (!token) throw new Error("Please sign in again before uploading the recording");

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("purpose", purpose);
  const response = await fetch(`${API_ORIGIN}/storage/upload-recording`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.url) {
    throw new Error(result?.message || `Recording upload failed (${response.status})`);
  }
  return result.url as string;
}
