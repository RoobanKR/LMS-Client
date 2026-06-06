export type CoursesListFilters = {
  searchTerm: string;
  selectedCategory: string;
  selectedLevel: string;
  page: number;
};

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    currentUser: () => ["auth", "currentUser"] as const,
  },
  courses: {
    all: ["courses"] as const,
    lists: () => ["courses", "list"] as const,
    list: (userId: string | null) => ["courses", "list", { userId }] as const,
    details: () => ["courses", "detail"] as const,
    detail: (courseId: string) => ["courses", "detail", courseId] as const,
  },
  pedagogy: {
    all: ["pedagogy"] as const,
    views: () => ["pedagogy", "views"] as const,
    viewById: (id: string) => ["pedagogy", "view", id] as const,
    viewForCourse: (courseId: string) => ["pedagogy", "view-for-course", courseId] as const,
  },
  progress: {
    all: ["progress"] as const,
    forUserCourse: (userId: string, courseId: string) =>
      ["progress", userId, courseId] as const,
  },
} as const;
