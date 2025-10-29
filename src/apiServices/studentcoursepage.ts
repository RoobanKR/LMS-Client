import React from 'react'
import { useQuery, UseQueryResult, useInfiniteQuery } from '@tanstack/react-query'

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

// API service function with pagination
const fetchCourses = async (token: string, page: number = 1, limit: number = 8): Promise<CoursesApiResponse> => {
  if (!token) {
    throw new Error("Authentication token not found");
  }

  const response = await fetch(`http://localhost:5533/courses-structure/getAll?page=${page}&limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || 
      `HTTP error! status: ${response.status}` ||
      'Failed to fetch courses'
    );
  }

  const data: CoursesApiResponse = await response.json();
  
  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid data format received from API');
  }

  return data;
};

// Query key factory for better cache management
export const coursesQueryKeys = {
  all: ['courses'] as const,
  lists: () => [...coursesQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...coursesQueryKeys.lists(), { filters }] as const,
  infinite: () => [...coursesQueryKeys.all, 'infinite'] as const,
  infiniteList: (filters: Record<string, any>) => [...coursesQueryKeys.infinite(), { filters }] as const,
  details: () => [...coursesQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...coursesQueryKeys.details(), id] as const,
};

// Custom hook for fetching courses with pagination
export const useCoursesInfiniteQuery = (
  token: string | null, 
  filters: {
    searchTerm: string;
    selectedCategory: string;
  }
) => {
  return useInfiniteQuery({
    queryKey: [...coursesQueryKeys.infiniteList(filters), filters],
    queryFn: ({ pageParam = 1 }) => fetchCourses(token!, pageParam, 8), // 8 items per page
    enabled: !!token,
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

// Keep the original hook for backward compatibility
export const useCoursesQuery = (token: string | null): UseQueryResult<Course[], CoursesQueryError> => {
  return useQuery({
    queryKey: coursesQueryKeys.lists(),
    queryFn: () => fetchCourses(token!).then(res => res.data),
    enabled: !!token,
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

// Simplified filtering - only by service type and search by name
export const useFilteredCourses = (
  courses: Course[] | undefined,
  filters: {
    searchTerm: string;
    selectedCategory: string;
  }
) => {
  return React.useMemo(() => {
    if (!courses) return [];

    return courses.filter(course => {
      // Search by course name only
      const matchesSearch = filters.searchTerm === "" || 
                           course.courseName.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      // Filter by service type (category)
      const matchesCategory = filters.selectedCategory === "All" || 
                             course.serviceType === filters.selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [courses, filters.searchTerm, filters.selectedCategory]);
};

// Utility function to get token from localStorage
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('smartcliff_token');
};

// Prefetch courses function for better UX
export const prefetchCourses = (queryClient: any, token: string) => {
  queryClient.prefetchQuery({
    queryKey: coursesQueryKeys.lists(),
    queryFn: () => fetchCourses(token).then(res => res.data),
    staleTime: 10 * 60 * 1000,
  });
};

// Invalidate courses cache function
export const invalidateCoursesCache = (queryClient: any) => {
  queryClient.invalidateQueries({
    queryKey: coursesQueryKeys.all,
  });
};

// Background refresh function
export const backgroundRefreshCourses = (queryClient: any, token: string) => {
  queryClient.refetchQueries({
    queryKey: coursesQueryKeys.lists(),
  });
};