import { canonicalPermissionKey } from './navRoutes';

// A trainer's course grant opens the Courses page — the card grid of the
// courses it is enrolled in (Analytics / Manage per course) — not the admin's
// client-by-client Course Management list.
export const TRAINER_COURSE_ROUTE = '/lms/pages/courses';

export function trainerCourseRoute(key: string, role?: {
  roleValue?: string; originalRole?: string; renameRole?: string;
}): string | null {
  const trainer = [role?.roleValue, role?.originalRole, role?.renameRole]
    .some((value) => ['trainer', 'staff', 'teacher'].includes((value || '').toLowerCase().replace(/[\s_-]/g, '')));
  return trainer && ['courses', 'coursestructure'].includes(canonicalPermissionKey(key))
    ? TRAINER_COURSE_ROUTE : null;
}
