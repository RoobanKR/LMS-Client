export interface ManagedCourse {
  _id: string;
  courseName?: string;
  courseCode?: string;
  clientId?: string | { _id?: string };
  clientName?: string;
  serviceType?: string;
  serviceModal?: string;
  status?: string;
  moduleCount?: number;
  batchAndParticipants?: { users?: { user?: unknown; status?: string }[] }[];
}

function idOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const obj = value as { _id?: unknown; $oid?: unknown };
    return idOf(obj._id ?? obj.$oid);
  }
  return '';
}

export function enrolledCourses(courses: ManagedCourse[], userId: string): ManagedCourse[] {
  if (!userId) return [];
  return courses.filter((course) => course.batchAndParticipants?.some((batch) =>
    batch.users?.some((entry) => idOf(entry.user) === userId &&
      !['suspended', 'dropped'].includes((entry.status || '').toLowerCase()))));
}

export interface ClientCourses { id: string; name: string; courses: ManagedCourse[] }

export function groupCourseClients(courses: ManagedCourse[]): ClientCourses[] {
  const groups = new Map<string, ClientCourses>();
  for (const course of courses) {
    const name = course.clientName?.trim() || 'Client not specified';
    const id = idOf(course.clientId) || `name:${name.toLowerCase()}`;
    const group = groups.get(id) || { id, name, courses: [] };
    if (!group.courses.some((item) => item._id === course._id)) group.courses.push(course);
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
