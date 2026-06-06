import axios from 'axios';

const API_BASE_URL = 'https://lms-server-ym1q.onrender.com';

const authHeaders = () => {
  const token = localStorage.getItem('smartcliff_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

export interface LoginLogEntry {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  status?: string;
  details: {
    ipAddress?: string;
    location?: string;
    device?: string;
    browser?: string;
    os?: string;
    userAgent?: string;
  };
  sessionDuration?: number; // seconds
  logoutTime?: string;      // ISO – set on logout
  logoutAt?: string;        // ISO – alt field name
  sessionEnd?: string;      // ISO – alt field name
  createdAt: string;
}

export interface StudentActivityLog {
  userId: string;
  userName: string;
  userEmail: string;
  lastActive: string | null;
  nodeVisits: { nodeId: string; nodeName: string; nodeType: string; visitedAt: string }[];
  methodSelections: { action: string; method: string; activity: string | null; nodeName: string | null; selectedAt: string }[];
  resourceOpens: { resourceId: string; resourceName: string; resourceType: string; openedAt: string }[];
  exerciseSubmissions: { exerciseId: string | null; exerciseName: string; method: string; activity: string; status: string; submittedAt: string }[];
}

export interface CourseOption {
  _id: string;
  courseName: string;
  courseCode?: string;
  singleParticipants?: { user: any; status?: string }[];
}

export const fetchLoginLogs = async (): Promise<LoginLogEntry[]> => {
  const res = await axios.get(`${API_BASE_URL}/activity-logs/logins`, {
    headers: authHeaders(),
    timeout: 10000,
  });
  return res.data.data || [];
};

export const fetchCourseActivityLogs = async (courseId: string): Promise<StudentActivityLog[]> => {
  const res = await axios.get(`${API_BASE_URL}/activity-logs/courses/${courseId}`, {
    headers: authHeaders(),
    timeout: 15000,
  });
  return res.data.data || [];
};

// ── Report sessions (measured time only: viewed resources, submitted assignments/assessments) ──
export interface ReportSession {
  studentId: string;
  studentName: string;
  studentEmail: string;
  pedagogy: 'I_Do' | 'We_Do' | 'You_Do';
  type: string;          // 'PDF' | 'Video' | ... | 'Assignment' | 'Assessment'
  title: string;         // resource / assignment / assessment name
  subCategory: string | null;
  nodeName: string | null;
  nodeType: string | null;   // 'module' | 'submodule' | 'topic' | 'subtopic'
  startTime: string;     // ISO
  endTime: string | null; // ISO
  durationSec: number;
}

export const fetchCourseReport = async (courseId: string): Promise<ReportSession[]> => {
  const res = await axios.get(`${API_BASE_URL}/activity-logs/courses/${courseId}/report`, {
    headers: authHeaders(),
    timeout: 15000,
  });
  return res.data.data || [];
};

export const fetchAllCourses = async (): Promise<CourseOption[]> => {
  const res = await axios.get(`${API_BASE_URL}/courses-structure/getAll`, {
    headers: authHeaders(),
    timeout: 10000,
  });
  const data = res.data.data || res.data || [];
  return Array.isArray(data) ? data : [];
};

// Called on logout to record the logout time + session duration on the backend.
// Backend should implement POST /activity-logs/logout to stamp logoutTime on the
// user's most recent open login session and compute sessionDuration.
export const postLogout = async (): Promise<void> => {
  try {
    await axios.post(
      `${API_BASE_URL}/activity-logs/logout`,
      { logoutTime: new Date().toISOString() },
      { headers: authHeaders(), timeout: 5000 }
    );
  } catch {
    // Best effort — backend may not have this endpoint yet
  }
};

// Called after login to store browser/device/IP details on the backend.
// Backend should implement POST /activity-logs/login-session to persist these.
export const postLoginDetails = async (details: {
  browser?: string;
  os?: string;
  device?: string;
  ipAddress?: string;
  location?: string;
  userAgent?: string;
}): Promise<void> => {
  try {
    await axios.post(
      `${API_BASE_URL}/activity-logs/login-session`,
      { details },
      { headers: authHeaders(), timeout: 6000 }
    );
  } catch {
    // Best effort — backend may not have this endpoint yet
  }
};
