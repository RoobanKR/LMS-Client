// Main pages that use DashboardLayout. Course players and role-specific
// consoles outside this set continue to own their layouts.
const DASHBOARD_SECTIONS = [
  'admindashboard', 'usermanagement', 'clientmanagement', 'servicemapping',
  'businessmanagement', 'businessreports', 'approvals', 'attendancemanagement', 'calendar',
  'questionbanks', 'dynamicfieldsettings', 'logs', 'profile', 'notifications',
  'grades', 'instutionmanagement', 'programcalender', 'pedagogy', 'poc',
  'coursestructure/course-batches', 'coursestructure/course-sections',
  'coursestructure/course-participants', 'coursestructure/feedback',
  'coursestructure/programcalendar',
  'coursestructure/view-resources',
];
// pedagogy2 is deliberately absent: the builder is a wide, tool-dense canvas
// (zoom, merge, drag-reorder, full-view) and the 244px rail cost it horizontal
// room it needs. It renders bare and supplies its own background and padding,
// with the breadcrumb as its way back out.
const DASHBOARD_PAGES = [
  '/lms/pages/coursestructure', '/lms/pages/reports/performance',
  '/lms/pages/external/assessment', '/lms/pages/external/event',
];

export function isPersistentDashboardRoute(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '');
  return DASHBOARD_PAGES.includes(path) || DASHBOARD_SECTIONS.some((section) => {
    const prefix = `/lms/pages/${section}`;
    return path === prefix || path.startsWith(prefix + '/');
  });
}

// L&D Head / Subhead — they keep the L&D console rail (LDLayout) on the admin
// pages their rail links to, instead of falling into the admin sidebar.
export function usesLdShellRole(role: string): boolean {
  const r = role.toLowerCase().replace(/[^a-z]/g, '');
  return r.includes('ldhead') || r.includes('subhead');
}

// Business Management as the L&D rail reaches it: the three tab routes plus a
// client's drill-down (/lms/pages/clientmanagement/<id>) and the legacy
// /lms/pages/businessmanagement redirect.
export function isLdBusinessRoute(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '');
  return ['clientmanagement', 'servicemapping', 'businessreports', 'businessmanagement'].some((section) => {
    const prefix = `/lms/pages/${section}`;
    return path === prefix || path.startsWith(prefix + '/');
  });
}

// Approvals as the L&D rail reaches it (its "Approvals" item links here). The
// page wraps itself in the admin DashboardLayout, so without this the L&D
// user's sidebar flipped to the admin menu on click.
export function isLdApprovalsRoute(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '');
  return path === '/lms/pages/approvals' || path.startsWith('/lms/pages/approvals/');
}

// Notifications as the L&D rail reaches it (its "Notification" item). The page
// picks the admin DashboardLayout for L&D roles, which renders content-only
// once LDLayout is hosting it.
export function isLdNotificationsRoute(pathname: string): boolean {
  const path = cleanPath(pathname);
  return path === '/lms/pages/notifications' || path.startsWith('/lms/pages/notifications/');
}

// Course Management as the L&D rail reaches it: exactly the coursestructure
// routes the admin shell wraps (the list plus batches / sections /
// participants / feedback / program calendar). view-resources picks its own
// shell (it can already render LDLayout itself), and pedagogy2 stays bare for
// every role.
export function isLdCourseRoute(pathname: string): boolean {
  return isCourseManagementRoute(pathname) && !isCourseSubRoute(pathname, 'view-resources');
}

const COURSE_BASE = '/lms/pages/coursestructure';
const cleanPath = (pathname: string) => pathname.split(/[?#]/)[0].replace(/\/$/, '');
const isCourseSubRoute = (pathname: string, sub: string) => {
  const path = cleanPath(pathname);
  return path === `${COURSE_BASE}/${sub}` || path.startsWith(`${COURSE_BASE}/${sub}/`);
};

// Course Management as the admin sidebar opens it: /lms/pages/coursestructure
// plus the per-course screens the admin shell wraps (batches / sections /
// participants / feedback / program calendar / view-resources).
export function isCourseManagementRoute(pathname: string): boolean {
  const path = cleanPath(pathname);
  if (path !== COURSE_BASE && !path.startsWith(COURSE_BASE + '/')) return false;
  return isPersistentDashboardRoute(path);
}

// Trainer — same role test as shared/trainerCourseRoute.ts.
export function usesTrainerShellRole(role: string): boolean {
  return ['trainer', 'staff', 'teacher'].includes(role.toLowerCase().replace(/[\s_-]/g, ''));
}

// Course Management as the trainer rail reaches it. The trainer keeps the
// staff sidebar (StaffLayout) instead of the admin one. Feedback is left out:
// that page already renders StaffLayout itself for trainers.
export function isTrainerCourseRoute(pathname: string): boolean {
  return isCourseManagementRoute(pathname) && !isCourseSubRoute(pathname, 'feedback');
}

export function usesPersistentDashboardRole(role: string): boolean {
  // Match the canonical role values used by pages that select this shell.
  return ['admin', 'programcoordinator'].includes(
    role.toLowerCase().replace(/[^a-z]/g, ''),
  );
}
