import React from "react";
import {
  useQuery,
  UseQueryResult,
  useInfiniteQuery,
} from "@tanstack/react-query";

export interface SingleParticipant {
  user: string | { $oid: string };
  status: string;
  enableEnrolmentDates: boolean;
  enrolmentStartsDate: string | null;
  enrolmentEndsDate: string | null;
  createdAt: string;
  updatedAt: string;
  _id: string;
}

export interface Course {
  _id: string;
  courseName: string;
  courseDescription: string;
  courseDuration: string;
  courseLevel: string;
  serviceType: string;
  courseImage: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  singleParticipants?: SingleParticipant[];
  groups?: string[];
}

interface CoursesApiResponse {
  data: Course[];
  message?: string;
  success?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
  };
}

interface CoursesQueryError {
  message: string;
  status?: number;
}

const normalizeMongoId = (id: string | { $oid: string }): string => {
  if (typeof id === "string") return id;
  if (id && typeof id === "object" && id.$oid) return id.$oid;
  return String(id);
};

export const getCurrentUserIdFromAuth = (): string | null => {
  if (typeof window === "undefined") return null;

  const userId =
    localStorage.getItem("smartcliff_userId") ||
    localStorage.getItem("user_id") ||
    sessionStorage.getItem("smartcliff_userId") ||
    sessionStorage.getItem("user_id");

  if (userId) return userId;

  try {
    const userDataStr =
      localStorage.getItem("user_data") || sessionStorage.getItem("user_data");

    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      return normalizeMongoId(userData._id || userData.id || "");
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  return null;
};

const fetchCourses = async (
  token: string,
  userId: string | null,
): Promise<CoursesApiResponse> => {
  if (!token) {
    throw new Error("Authentication token not found");
  }

  const response = await fetch(
    `http://localhost:5533/courses-structure/getAll`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        `HTTP error! status: ${response.status}` ||
        "Failed to fetch courses"
    );
  }

  const data: CoursesApiResponse = await response.json();

  if (!data.data || !Array.isArray(data.data)) {
    throw new Error("Invalid data format received from API");
  }

  let filteredCourses = data.data;

  if (userId) {
    const normalizedUserId = normalizeMongoId(userId);

    filteredCourses = data.data.filter((course) => {
      if (
        !course.singleParticipants ||
        !Array.isArray(course.singleParticipants)
      ) {
        return false;
      }

      const userParticipant = course.singleParticipants.find(
        (participant: SingleParticipant) => {
          // Handle both string user ID and populated user object
          const participantUserId = normalizeMongoId(participant.user);
          
          const matches = participantUserId === normalizedUserId;

          if (matches) {
            console.log('User found in course:', course.courseName);
          }

          return matches;
        }
      );

      const isEnrolled = userParticipant && userParticipant.status === "active";

      return isEnrolled;
    });
  }

  console.log('Filtered courses count:', filteredCourses.length);
  console.log('All courses count:', data.data.length);

  return {
    ...data,
    data: filteredCourses,
  };
};

export const coursesQueryKeys = {
  all: ["courses"] as const,
  lists: () => [...coursesQueryKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...coursesQueryKeys.lists(), { filters }] as const,
  infinite: () => [...coursesQueryKeys.all, "infinite"] as const,
  infiniteList: (filters: Record<string, any>) =>
    [...coursesQueryKeys.infinite(), { filters }] as const,
  details: () => [...coursesQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...coursesQueryKeys.details(), id] as const,
};

export const useCoursesInfiniteQuery = (
  token: string | null,
  userId: string | null,
  filters: {
    searchTerm: string;
    selectedCategory: string;
  }
) => {
  return useInfiniteQuery({
    queryKey: [...coursesQueryKeys.infiniteList(filters), userId, filters],
    queryFn: ({ pageParam = 1 }) => fetchCourses(token!, userId,),
    enabled: !!token && !!userId,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    initialPageParam: 1,
  });
};

export const useCoursesQuery = (
  token: string | null,
  userId: string | null
): UseQueryResult<Course[], CoursesQueryError> => {
  return useQuery({
    queryKey: [...coursesQueryKeys.lists(), userId],
    queryFn: () => fetchCourses(token!, userId).then((res) => res.data),
    enabled: !!token && !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export const useFilteredCourses = (
  courses: Course[] | undefined,
  filters: {
    searchTerm: string;
    selectedCategory: string;
  }
) => {
  return React.useMemo(() => {
    if (!courses) return [];

    return courses.filter((course) => {
      const matchesSearch =
        filters.searchTerm === "" ||
        course.courseName
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase());

      const matchesCategory =
        filters.selectedCategory === "All" ||
        course.serviceType === filters.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [courses, filters.searchTerm, filters.selectedCategory]);
};

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("smartcliff_token");
};

export const getCurrentUserId = (): string | null => {
  return getCurrentUserIdFromAuth();
};

export const prefetchCourses = (
  queryClient: any,
  token: string,
  userId: string
) => {
  queryClient.prefetchQuery({
    queryKey: [...coursesQueryKeys.lists(), userId],
    queryFn: () => fetchCourses(token, userId).then((res) => res.data),
    staleTime: 10 * 60 * 1000,
  });
};

export const invalidateCoursesCache = (queryClient: any) => {
  queryClient.invalidateQueries({
    queryKey: coursesQueryKeys.all,
  });
};

export const backgroundRefreshCourses = (
  queryClient: any,
  token: string,
  userId: string
) => {
  queryClient.refetchQueries({
    queryKey: [...coursesQueryKeys.lists(), userId],
  });
};
