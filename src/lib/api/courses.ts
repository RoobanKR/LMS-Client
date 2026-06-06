import { api } from "../apiClient";
import type { Course, SingleParticipant } from "@/apiServices/studentcoursepage";

const normalizeMongoId = (id: string | { $oid: string }): string => {
  if (typeof id === "string") return id;
  if (id && typeof id === "object" && id.$oid) return id.$oid;
  return String(id);
};

export interface CoursesApiResponse {
  data: Course[];
  message?: string;
  success?: boolean;
}

export const fetchCoursesList = async (
  userId: string | null
): Promise<Course[]> => {
  const res = await api.get<CoursesApiResponse>(
    "/courses-structure/getAll"
  );
  if (!res.data || !Array.isArray(res.data)) {
    throw new Error("Invalid data format received from API");
  }
  if (!userId) return res.data;

  const normalizedUserId = normalizeMongoId(userId);
  return res.data.filter((course) => {
    if (!course.singleParticipants || !Array.isArray(course.singleParticipants))
      return false;
    const p = course.singleParticipants.find(
      (participant: SingleParticipant) =>
        normalizeMongoId(participant.user) === normalizedUserId
    );
    return Boolean(p && p.status === "active");
  });
};

export interface CourseDetailResponse {
  data: {
    _id: string;
    courseName: string;
    courseDescription?: string;
    modules?: unknown[];
    singleParticipants?: unknown[];
    I_Do?: unknown;
    We_Do?: unknown;
    You_Do?: unknown;
    [key: string]: unknown;
  };
}

export const fetchCourseDetail = async (
  courseId: string
): Promise<CourseDetailResponse> => {
  return api.get<CourseDetailResponse>(`/getAll/courses-data/${courseId}`);
};

export const uploadResource = async (
  entityType: "module" | "submodule" | "topic" | "subtopic",
  entityId: string,
  formData: FormData,
  onUploadProgress?: (e: { loaded: number; total?: number }) => void
) => {
  const modelMap = {
    module: "modules",
    submodule: "submodules",
    topic: "topics",
    subtopic: "subtopics",
  } as const;
  return api.putForm<{ data?: unknown; message?: string }>(
    `/uploadResourses/${modelMap[entityType]}/${entityId}`,
    formData,
    {
      timeout: 20000000,
      onUploadProgress,
    }
  );
};
