'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Loader2, RefreshCw, BookMarked, Download, Search, Filter, FileText,
} from 'lucide-react';
import { StaffLayout } from '../../component/stafflayout/staff-layout';
import {
  fetchLoginLogs, fetchCourseReport, fetchAllCourses,
  LoginLogEntry, ReportSession, CourseOption
} from '@/apiServices/activityLog';
import { userPermission } from '@/apiServices/tokenVerify';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  orange: '#F27757', orangeDark: '#E0623F',
  orangeLight: 'rgba(242,119,87,0.08)',
  textMain: '#1f2937', textSub: '#374151', textMuted: '#6b7280', textHint: '#9ca3af',
  border: '#e5e7eb', borderLight: '#f3f4f6', bg: '#ffffff',
};
const FONT = "'Inter',-apple-system,BlinkMacSystemFont,sans-serif";
const PAGE_SIZE = 10;

// ── Date / time helpers ─────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

// 28-05-2026 09:48 AM
const fmtDateTime = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())} ${ap}`;
};

// full timestamp (login tab + excel)
const fmtDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const relTime = (iso: string) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const initials = (name: string) =>
  name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '??';

const fmtDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${pad(m)}m ${pad(s)}s`;
  return `${s}s`;
};

// Compact duration for the course report (matches the report page)
const fmtHM = (seconds: number) => {
  if (!seconds || seconds < 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

// "Topic - h1", "Module - HTML", etc.
const NODE_TYPE_LABEL: Record<string, string> = { module: 'Module', submodule: 'Sub Module', topic: 'Topic', subtopic: 'Sub Topic' };
const nodeLabel = (nodeName?: string | null, nodeType?: string | null) => {
  if (!nodeName && !nodeType) return '—';
  const t = NODE_TYPE_LABEL[String(nodeType || '').toLowerCase()] || (nodeType ? String(nodeType) : '');
  return t ? `${t} - ${nodeName || '—'}` : (nodeName || '—');
};

// Resolve a logout time: explicit backend field, else login + sessionDuration.
const logoutOf = (log: LoginLogEntry): string => {
  const explicit = log.logoutTime || log.logoutAt || log.sessionEnd;
  if (explicit) return explicit;
  if (log.sessionDuration != null && log.createdAt) {
    return new Date(new Date(log.createdAt).getTime() + log.sessionDuration * 1000).toISOString();
  }
  return '';
};

// Session duration in seconds: explicit field, else logout − login.
const durationOf = (log: LoginLogEntry): number | null => {
  if (log.sessionDuration != null) return log.sessionDuration;
  const lo = logoutOf(log);
  if (lo && log.createdAt) {
    const d = Math.round((new Date(lo).getTime() - new Date(log.createdAt).getTime()) / 1000);
    return d >= 0 ? d : null;
  }
  return null;
};

const Avatar = ({ name, size = 30 }: { name: string; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', background: T.orange,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size > 28 ? 11 : 10, fontWeight: 700, color: '#fff', flexShrink: 0,
  }}>
    {initials(name || '?')}
  </div>
);

// ── Login table styles ──────────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  paddingTop: 10, paddingBottom: 10,
  fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em',
  color: '#64748b', fontFamily: FONT, textAlign: 'left',
  textTransform: 'uppercase', background: '#f8f9fb', whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = {
  paddingTop: 0, paddingBottom: 0, verticalAlign: 'middle',
  fontSize: 12.5, fontFamily: FONT, color: T.textMain,
};

// ── Pedagogy configuration ────────────────────────────────────────────────────
const PEDAGOGY_SUBCATS: Record<string, string[]> = {
  I_Do:   ['Learning Resources', 'References'],
  We_Do:  ['Exercises', 'Assignments'],
  You_Do: ['Assessments', 'Practice'],
};

const REFERENCE_TYPES = new Set(['link', 'url', 'reference', 'web', 'external', 'hyperlink']);
const VIDEO_TYPES     = new Set(['video', 'mp4', 'youtube', 'vimeo', 'mov']);

const normalizePedagogy = (m: string): string => {
  if (m === 'I_Do'   || m === 'i-do')   return 'I_Do';
  if (m === 'We_Do'  || m === 'we-do')  return 'We_Do';
  if (m === 'You_Do' || m === 'you-do') return 'You_Do';
  return m;
};

// ── Type badge + status colour ──────────────────────────────────────────────────
const typeBadge = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t.includes('learning'))                  return { bg: 'rgba(79,70,229,0.08)',  col: '#4f46e5' };
  if (t.includes('video'))                     return { bg: 'rgba(147,51,234,0.10)', col: '#9333ea' };
  if (t.includes('reference'))                 return { bg: 'rgba(217,119,6,0.12)',  col: '#d97706' };
  if (t.includes('exercise'))                  return { bg: 'rgba(225,29,72,0.10)',  col: '#e11d48' };
  if (t.includes('assignment'))                return { bg: 'rgba(37,99,235,0.10)',  col: '#2563eb' };
  if (t.includes('assessment'))                return { bg: 'rgba(147,51,234,0.10)', col: '#9333ea' };
  if (t.includes('topic') || t.includes('module')) return { bg: 'rgba(5,150,105,0.10)', col: '#059669' };
  return { bg: 'rgba(100,116,139,0.10)', col: '#475569' };
};

const statusInfo = (raw: string) => {
  const s = (raw || '').toLowerCase().replace(/[\s_-]/g, '');
  if (s === 'completed' || s === 'evaluated') return { label: 'Completed',   col: '#16a34a' };
  if (s === 'viewed')                          return { label: 'Viewed',      col: '#2563eb' };
  if (s === 'inprogress')                      return { label: 'In Progress', col: '#ea580c' };
  if (s === 'submitted')                       return { label: 'Submitted',   col: '#2563eb' };
  if (s === 'started')                         return { label: 'Started',     col: '#d97706' };
  if (s === 'visited')                         return { label: 'Visited',     col: '#0891b2' };
  return { label: raw || '—', col: '#64748b' };
};

// ── Flat activity row ─────────────────────────────────────────────────────────
interface FlatActivityRow {
  key: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  type: string;
  title: string;
  nodeName: string | null;
  nodeType: string | null;
  startTime: string;
  endTime: string | null;
  durationSec: number;
  activityDate: string; // = startTime (for filtering / sorting)
  pedagogy: string;
  subCategory: string;
}

// Map measured report sessions → flat rows for the course table.
function buildSessionRows(sessions: ReportSession[]): FlatActivityRow[] {
  return sessions.map((s, i) => ({
    key: `${s.studentId}-${i}-${s.startTime}`,
    studentId: s.studentId,
    studentName: s.studentName,
    studentEmail: s.studentEmail,
    type: s.type,
    title: s.title,
    nodeName: s.nodeName,
    nodeType: s.nodeType,
    startTime: s.startTime,
    endTime: s.endTime,
    durationSec: s.durationSec,
    activityDate: s.startTime,
    pedagogy: s.pedagogy,
    subCategory: s.subCategory || '',
  })).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

// ── Field label ───────────────────────────────────────────────────────────────
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label style={{
    fontSize: 10.5, fontWeight: 600, color: T.textMuted, letterSpacing: '0.02em',
    marginBottom: 3, display: 'block',
  }}>
    {children}
  </label>
);

// ── Labelled select (full width) ────────────────────────────────────────────────
const FilterSelect = ({
  label, value, onChange, options, placeholder, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    <FieldLabel>{label}</FieldLabel>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="logs-select"
      style={{
        height: 32, width: '100%', padding: '0 28px 0 10px', fontSize: 12, fontWeight: 500,
        borderRadius: 7, border: `1px solid ${T.border}`,
        background: T.bg, color: disabled ? T.textHint : T.textSub,
        fontFamily: FONT, cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none', minWidth: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center',
        opacity: disabled ? 0.6 : 1,
      } as React.CSSProperties}
    >
      {placeholder && <option value="all">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ── Pagination page list ──────────────────────────────────────────────────────
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);
  if (current <= 3) { start = 2; end = 4; }
  if (current >= total - 2) { start = total - 3; end = total - 1; }
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

// ════════════════════════════════════════════════════════════════════════════════
export default function LogsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'course'>('login');

  // ── Login tab ────────────────────────────────────────────────────────────────
  const [loginLogs, setLoginLogs]       = useState<LoginLogEntry[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState<string | null>(null);
  const [loginSearch, setLoginSearch]   = useState(sp?.get('q') || '');
  const [loginFilter, setLoginFilter]   = useState<'today' | 'week' | 'all'>('all');
  // date range — draft (bound to inputs) + applied (read by filter)
  const [lFromDraft, setLFromDraft]     = useState('');
  const [lToDraft, setLToDraft]         = useState('');
  const [lFrom, setLFrom]               = useState('');
  const [lTo, setLTo]                   = useState('');

  // ── Course tab base ───────────────────────────────────────────────────────────
  const [courses, setCourses]                   = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseLogs, setCourseLogs]             = useState<ReportSession[]>([]);
  const [courseLoading, setCourseLoading]       = useState(false);
  const [courseError, setCourseError]           = useState<string | null>(null);

  // ── Course filters: draft (bound to controls) ─────────────────────────────────
  const [dPedagogy, setDPedagogy]   = useState<'all' | 'I_Do' | 'We_Do' | 'You_Do'>('all');
  const [dSubCat, setDSubCat]       = useState('all');
  const [dStudent, setDStudent]     = useState('all');
  const [dFrom, setDFrom]           = useState('');
  const [dTo, setDTo]               = useState('');
  const [dSearch, setDSearch]       = useState('');

  // ── Course filters: applied (read by table) ───────────────────────────────────
  const [aPedagogy, setAPedagogy]   = useState<'all' | 'I_Do' | 'We_Do' | 'You_Do'>('all');
  const [aSubCat, setASubCat]       = useState('all');
  const [aStudent, setAStudent]     = useState('all');
  const [aFrom, setAFrom]           = useState('');
  const [aTo, setATo]               = useState('');
  const [aSearch, setASearch]       = useState('');

  const [page, setPage] = useState(1);

  // ── URL param sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = sp?.get('q') || '';
    setLoginSearch(q);
    const t = sp?.get('tab');
    if (t === 'course') setActiveTab('course');
    else if (t === 'login') setActiveTab('login');
  }, [sp]);

  // ── Load courses (role-filtered) ──────────────────────────────────────────────
  useEffect(() => {
    fetchAllCourses().then(all => {
      const { user } = userPermission();
      if (!user) { setCourses(all); return; }
      const role = (
        (user.role as any)?.roleValue ||
        (user.role as any)?.originalRole ||
        (user.role as any)?.renameRole || ''
      ).toLowerCase().replace(/\s+/g, '_');
      const isAdmin = role === 'admin' || role === 'super_admin' || role === 'superadmin';
      if (isAdmin) {
        setCourses(all);
      } else {
        const uid = user._id?.toString();
        setCourses(all.filter(c => {
          const ps: any[] = c.singleParticipants || [];
          return ps.some(p => {
            const pid = typeof p.user === 'object' ? p.user?._id?.toString() : p.user?.toString();
            return pid === uid && (!p.status || p.status === 'active');
          });
        }));
      }
    }).catch(() => {});
  }, []);

  // ── Load login logs ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'login') return;
    setLoginLoading(true); setLoginError(null);
    fetchLoginLogs()
      .then(setLoginLogs)
      .catch(e => setLoginError(e.message || 'Failed to load'))
      .finally(() => setLoginLoading(false));
  }, [activeTab]);

  // ── Load course activity logs ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCourseId) return;
    setCourseLoading(true); setCourseError(null);
    setCourseLogs([]);
    resetCourseFilters();
    fetchCourseReport(selectedCourseId)
      .then(setCourseLogs)
      .catch(e => setCourseError(e.message || 'Failed to load'))
      .finally(() => setCourseLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  // Reset draft sub-category when draft pedagogy changes
  useEffect(() => { setDSubCat('all'); }, [dPedagogy]);

  // ── Login memo ────────────────────────────────────────────────────────────────
  const filteredLoginLogs = useMemo(() => {
    let list = loginLogs;
    if (loginFilter === 'today') {
      const s = new Date(); s.setHours(0, 0, 0, 0);
      list = list.filter(l => new Date(l.createdAt) >= s);
    } else if (loginFilter === 'week') {
      list = list.filter(l => new Date(l.createdAt) >= new Date(Date.now() - 7 * 86400000));
    }
    if (lFrom) {
      const from = new Date(lFrom).setHours(0, 0, 0, 0);
      list = list.filter(l => new Date(l.createdAt).getTime() >= from);
    }
    if (lTo) {
      const to = new Date(lTo).setHours(23, 59, 59, 999);
      list = list.filter(l => new Date(l.createdAt).getTime() <= to);
    }
    if (loginSearch.trim()) {
      const q = loginSearch.toLowerCase();
      list = list.filter(l => l.userName.toLowerCase().includes(q) || l.userEmail.toLowerCase().includes(q));
    }
    return list;
  }, [loginLogs, loginFilter, loginSearch, lFrom, lTo]);

  const applyLoginDateRange = () => { setLFrom(lFromDraft); setLTo(lToDraft); };
  const clearLoginDateRange = () => { setLFromDraft(''); setLToDraft(''); setLFrom(''); setLTo(''); };

  // ── Course memos ──────────────────────────────────────────────────────────────
  const flatRows = useMemo(() => buildSessionRows(courseLogs), [courseLogs]);

  const studentOptions = useMemo(() => {
    const m = new Map<string, string>();
    courseLogs.forEach(s => { if (s.studentId && !m.has(s.studentId)) m.set(s.studentId, s.studentName || s.studentEmail || s.studentId); });
    return Array.from(m, ([value, label]) => ({ value, label }));
  }, [courseLogs]);

  const subCatOptions = useMemo(() => {
    if (dPedagogy === 'all') return [];
    const set = new Set<string>();
    courseLogs.forEach(s => { if (s.pedagogy === dPedagogy && s.subCategory) set.add(s.subCategory); });
    return Array.from(set, v => ({ value: v, label: v }));
  }, [courseLogs, dPedagogy]);

  const filteredRows = useMemo(() => {
    let list = flatRows;
    if (aStudent !== 'all')   list = list.filter(r => r.studentId === aStudent);
    if (aPedagogy !== 'all')  list = list.filter(r => r.pedagogy === aPedagogy);
    if (aSubCat !== 'all')    list = list.filter(r => r.subCategory === aSubCat);
    // From-only → consider just that single day; From+To → range; To-only → up to that day.
    if (aFrom && !aTo) {
      const dayStart = new Date(aFrom).setHours(0, 0, 0, 0);
      const dayEnd = new Date(aFrom).setHours(23, 59, 59, 999);
      list = list.filter(r => { const ts = r.activityDate ? new Date(r.activityDate).getTime() : NaN; return ts >= dayStart && ts <= dayEnd; });
    } else {
      if (aFrom) {
        const from = new Date(aFrom).setHours(0, 0, 0, 0);
        list = list.filter(r => r.activityDate && new Date(r.activityDate).getTime() >= from);
      }
      if (aTo) {
        const to = new Date(aTo).setHours(23, 59, 59, 999);
        list = list.filter(r => r.activityDate && new Date(r.activityDate).getTime() <= to);
      }
    }
    if (aSearch.trim()) {
      const q = aSearch.toLowerCase();
      list = list.filter(r => r.title.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
    }
    return list;
  }, [flatRows, aStudent, aPedagogy, aSubCat, aFrom, aTo, aSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);

  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const startEntry = filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(page * PAGE_SIZE, filteredRows.length);

  const selectedCourse = courses.find(c => c._id === selectedCourseId);

  function resetCourseFilters() {
    setDPedagogy('all'); setDSubCat('all'); setDStudent('all'); setDFrom(''); setDTo(''); setDSearch('');
    setAPedagogy('all'); setASubCat('all'); setAStudent('all'); setAFrom(''); setATo(''); setASearch('');
    setPage(1);
  }

  const applyFilters = () => {
    setAPedagogy(dPedagogy); setASubCat(dSubCat); setAStudent(dStudent);
    setAFrom(dFrom); setATo(dTo); setASearch(dSearch);
    setPage(1);
  };

  // ── Exports ───────────────────────────────────────────────────────────────────
  const exportLoginLogsToExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('User Logs');
    ws.columns = [
      { header: '#',                key: 'num',      width: 5  },
      { header: 'Name',             key: 'name',     width: 26 },
      { header: 'Email',            key: 'email',    width: 32 },
      { header: 'Role',             key: 'role',     width: 16 },
      { header: 'Status',           key: 'status',   width: 10 },
      { header: 'Login Time',       key: 'time',     width: 26 },
      { header: 'Logout Time',      key: 'logout',   width: 26 },
      { header: 'IP Address',       key: 'ip',       width: 16 },
      { header: 'Location',         key: 'location', width: 22 },
      { header: 'Device',           key: 'device',   width: 14 },
      { header: 'Browser',          key: 'browser',  width: 14 },
      { header: 'OS',               key: 'os',       width: 16 },
      { header: 'Session Duration', key: 'session',  width: 18 },
    ];
    const hdr = ws.getRow(1);
    hdr.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF27757' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    hdr.height = 22;
    filteredLoginLogs.forEach((log, i) => {
      const s = (log.status || 'success').toLowerCase();
      const ok = s === 'success' || s === '' || s === 'active';
      const lo = logoutOf(log);
      const dur = durationOf(log);
      const row = ws.addRow({
        num: i + 1, name: log.userName || '—', email: log.userEmail || '—',
        role: log.userRole || 'user', status: ok ? 'Success' : 'Failed',
        time: log.createdAt ? fmtDate(log.createdAt) : '—',
        logout: lo ? fmtDate(lo) : 'Active',
        ip: log.details?.ipAddress || '—', location: log.details?.location || '—',
        device: log.details?.device || '—', browser: log.details?.browser || '—',
        os: log.details?.os || '—',
        session: dur != null ? fmtDuration(dur) : '—',
      });
      row.height = 18;
      row.eachCell(cell => {
        cell.alignment = { vertical: 'middle' };
        if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF9F8' } };
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `user-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportCourseLogsToExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Course Activity Logs');
    ws.columns = [
      { header: '#',             key: 'num',    width: 5  },
      { header: 'Student Name',  key: 'name',   width: 24 },
      { header: 'Type',          key: 'type',   width: 14 },
      { header: 'Title',         key: 'title',  width: 30 },
      { header: 'Node Type',     key: 'node',   width: 24 },
      { header: 'Start',         key: 'start',  width: 22 },
      { header: 'End',           key: 'end',    width: 22 },
      { header: 'Duration',      key: 'dur',    width: 12 },
    ];
    const hdr = ws.getRow(1);
    hdr.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF27757' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    hdr.height = 22;
    filteredRows.forEach((row, i) => {
      const r = ws.addRow({
        num: i + 1,
        name: row.studentName || '—',
        type: row.type || '—', title: row.title || '—',
        node: nodeLabel(row.nodeName, row.nodeType),
        start: fmtDateTime(row.startTime),
        end: fmtDateTime(row.endTime || ''),
        dur: fmtHM(row.durationSec),
      });
      r.height = 18;
      r.eachCell(cell => {
        cell.alignment = { vertical: 'middle' };
        if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF9F8' } };
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `course-logs-${(selectedCourse?.courseName || 'course').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ════════════════════════════════════════════════════════════════════════════════
  return (
    <StaffLayout>
      <style jsx global>{`
        .logs-page * { font-family: ${FONT} !important; }
        .logs-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .logs-scroll::-webkit-scrollbar-track { background: transparent; }
        .logs-scroll::-webkit-scrollbar-thumb { background: #e4e4ed; border-radius: 99px; }
        .logs-scroll::-webkit-scrollbar-thumb:hover { background: ${T.orange}; }
        .logs-tr:hover td { background: #fafbfc !important; }
        .logs-input:focus, .logs-select:focus { border-color: ${T.orange} !important; outline: none; box-shadow: 0 0 0 3px rgba(242,119,87,0.12); }
        .logs-export-btn:hover { background: rgba(16,185,129,0.12) !important; }
        .logs-apply-btn:hover { background: ${T.orangeDark} !important; }
        .logs-page-btn:hover { border-color: ${T.orange} !important; color: ${T.orange} !important; }
      `}</style>

      <div className="logs-page" style={{
        height: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', padding: 6, boxSizing: 'border-box', background: '#f6f7f9',
      }}>

        {/* ══════════════════════ LOGIN TAB ══════════════════════════════════ */}
        {activeTab === 'login' && (
          <div style={{
            flex: 1, minHeight: 0, background: '#fff', borderRadius: 14,
            border: `1.5px solid ${T.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Filter bar */}
            <div style={{ padding: '8px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.textHint, pointerEvents: 'none' }} />
                <input
                  className="logs-input"
                  value={loginSearch}
                  onChange={e => setLoginSearch(e.target.value)}
                  placeholder="Search user..."
                  style={{ height: 30, paddingLeft: 26, paddingRight: 8, width: 180, fontSize: 12.5, borderRadius: 7, border: `1px solid ${T.border}`, background: '#fff', color: T.textMain, fontFamily: FONT }}
                />
              </div>
              {(['today', 'week', 'all'] as const).map(f => (
                <button key={f} onClick={() => setLoginFilter(f)}
                  style={{ height: 30, padding: '0 12px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: 'pointer', border: loginFilter === f ? 'none' : `1px solid ${T.border}`, background: loginFilter === f ? T.orange : T.bg, color: loginFilter === f ? '#fff' : T.textMuted }}>
                  {f === 'week' ? 'This Week' : f === 'today' ? 'Today' : 'All Time'}
                </button>
              ))}
              <button
                onClick={() => { setLoginLoading(true); fetchLoginLogs().then(setLoginLogs).catch(() => {}).finally(() => setLoginLoading(false)); }}
                title="Refresh"
                style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.bg, color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RefreshCw size={12} className={loginLoading ? 'animate-spin' : ''} />
              </button>

              {/* Date range + apply */}
              <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0, margin: '0 2px' }} />
              <input
                type="date" value={lFromDraft} onChange={e => setLFromDraft(e.target.value)} title="From date"
                className="logs-input"
                style={{ height: 30, padding: '0 8px', fontSize: 12, borderRadius: 7, border: `1px solid ${lFrom ? T.orange : T.border}`, background: lFrom ? T.orangeLight : '#fff', color: lFrom ? T.orange : T.textSub, fontFamily: FONT, flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, color: T.textMuted }}>–</span>
              <input
                type="date" value={lToDraft} onChange={e => setLToDraft(e.target.value)} title="To date"
                className="logs-input"
                style={{ height: 30, padding: '0 8px', fontSize: 12, borderRadius: 7, border: `1px solid ${lTo ? T.orange : T.border}`, background: lTo ? T.orangeLight : '#fff', color: lTo ? T.orange : T.textSub, fontFamily: FONT, flexShrink: 0 }}
              />
              <button className="logs-apply-btn" onClick={applyLoginDateRange}
                style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: 'pointer', border: 'none', background: T.orange, color: '#fff', transition: 'background 0.15s', flexShrink: 0 }}>
                <Filter size={12} /> Apply
              </button>
              {(lFrom || lTo) && (
                <button onClick={clearLoginDateRange}
                  style={{ height: 30, padding: '0 10px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: 'pointer', border: `1px solid ${T.border}`, background: T.bg, color: T.textMuted, flexShrink: 0 }}>
                  Clear
                </button>
              )}

              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: T.textHint }}>{filteredLoginLogs.length} record{filteredLoginLogs.length !== 1 ? 's' : ''}</span>
              {filteredLoginLogs.length > 0 && (
                <button className="logs-export-btn" onClick={exportLoginLogsToExcel}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: 'pointer', border: '1px solid #bbf7d0', background: 'rgba(16,185,129,0.06)', color: '#059669', transition: 'background 0.15s' }}>
                  <Download size={12} /> Export
                </button>
              )}
            </div>

            {loginLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: T.orange }} />
              </div>
            ) : loginError ? (
              <div style={{ padding: '52px 0', textAlign: 'center', fontSize: 13, color: T.textMuted }}>{loginError}</div>
            ) : filteredLoginLogs.length === 0 ? (
              <div style={{ padding: '52px 0', textAlign: 'center', fontSize: 13, color: T.textMuted }}>No login records found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div className="logs-scroll" style={{ overflowX: 'auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div style={{ borderBottom: `1px solid ${T.border}`, flexShrink: 0, position: 'sticky', top: 0, zIndex: 2 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 980 }}>
                      <thead><tr>
                        {[
                          { label: '#',            w: '3%',  pl: 14 },
                          { label: 'Username',     w: '13%', pl: 10 },
                          { label: 'Status',       w: '7%',  pl: 10 },
                          { label: 'Login Time',   w: '12%', pl: 10 },
                          { label: 'Logout Time',  w: '12%', pl: 10 },
                          { label: 'IP Address',   w: '9%',  pl: 10 },
                          { label: 'Location',     w: '10%', pl: 10 },
                          { label: 'Device',       w: '8%',  pl: 10 },
                          { label: 'Browser',      w: '8%',  pl: 10 },
                          { label: 'OS',           w: '8%',  pl: 10 },
                          { label: 'Session Dur.', w: '10%', pl: 10 },
                        ].map(h => (
                          <th key={h.label} style={{ ...TH, width: h.w, paddingLeft: h.pl, paddingRight: 6, textAlign: h.label === 'Session Dur.' ? 'center' : 'left' }}>{h.label}</th>
                        ))}
                      </tr></thead>
                    </table>
                  </div>
                  <div className="logs-scroll" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 980 }}>
                      <colgroup>
                        <col style={{ width: '3%' }} /><col style={{ width: '13%' }} />
                        <col style={{ width: '7%' }} /><col style={{ width: '12%' }} />
                        <col style={{ width: '12%' }} /><col style={{ width: '9%' }} />
                        <col style={{ width: '10%' }} /><col style={{ width: '8%' }} />
                        <col style={{ width: '8%' }} /><col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                      </colgroup>
                      <tbody>
                        {filteredLoginLogs.map((log, i) => {
                          const st = (log.status || 'success').toLowerCase();
                          const ok = st === 'success' || st === '' || st === 'active';
                          const lo = logoutOf(log);
                          const dur = durationOf(log);
                          return (
                            <tr key={log._id || i} className="logs-tr" style={{ height: 46, borderBottom: `1px solid ${T.borderLight}` }}>
                              <td style={{ ...TD, paddingLeft: 14, paddingRight: 6 }}>
                                <span style={{ fontSize: 11, fontFamily: 'ui-monospace,monospace', color: T.textHint }}>{i + 1}</span>
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                                  <Avatar name={log.userName || log.userEmail || '?'} size={26} />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.textMain }}>{log.userName || '—'}</div>
                                    <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.userRole || 'user'}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 6 }}>
                                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: ok ? '#059669' : '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                                  {ok ? 'Success' : 'Failed'}
                                </span>
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 6 }}>
                                <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textMain }}>{relTime(log.createdAt)}</div>
                                <div style={{ fontSize: 10, color: T.textMuted }}>{fmtDate(log.createdAt)}</div>
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 6 }}>
                                {lo ? (
                                  <>
                                    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textMain }}>{relTime(lo)}</div>
                                    <div style={{ fontSize: 10, color: T.textMuted }}>{fmtDate(lo)}</div>
                                  </>
                                ) : (
                                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669' }} /> Active
                                  </span>
                                )}
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 6 }}>
                                <span style={{ fontSize: 11, fontFamily: 'ui-monospace,monospace', color: T.textSub, whiteSpace: 'nowrap' }}>{log.details?.ipAddress || '—'}</span>
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 6 }}>
                                <span style={{ fontSize: 11.5, color: T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{log.details?.location || '—'}</span>
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 6 }}>
                                <span style={{ fontSize: 11.5, color: T.textSub, whiteSpace: 'nowrap' }}>{log.details?.device || '—'}</span>
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 6 }}>
                                <span style={{ fontSize: 11.5, color: T.textSub, whiteSpace: 'nowrap' }}>{log.details?.browser || '—'}</span>
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 6 }}>
                                <span style={{ fontSize: 11.5, color: T.textSub, whiteSpace: 'nowrap' }}>{log.details?.os || '—'}</span>
                              </td>
                              <td style={{ ...TD, paddingLeft: 10, paddingRight: 14, textAlign: 'center' }}>
                                <span style={{ fontSize: 11.5, color: T.textSub }}>{dur != null ? fmtDuration(dur) : '—'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ COURSE ACTIVITY TAB ════════════════════════════ */}
        {activeTab === 'course' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* ── Filter card ── */}
              <div style={{ flexShrink: 0, background: '#fff', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

                {/* Row 1 — selects */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 9 }}>
                  <FilterSelect
                    label="Course"
                    value={selectedCourseId || 'all'}
                    onChange={v => setSelectedCourseId(v === 'all' ? '' : v)}
                    options={courses.map(c => ({ value: c._id, label: c.courseName }))}
                    placeholder="Select Course"
                  />
                  <FilterSelect
                    label="Pedagogy"
                    value={dPedagogy}
                    onChange={v => setDPedagogy(v as 'all' | 'I_Do' | 'We_Do' | 'You_Do')}
                    options={[
                      { value: 'I_Do',   label: 'I Do'   },
                      { value: 'We_Do',  label: 'We Do'  },
                      { value: 'You_Do', label: 'You Do' },
                    ]}
                    placeholder="All Pedagogy"
                    disabled={!selectedCourseId}
                  />
                  <FilterSelect
                    label="Sub Category"
                    value={dSubCat}
                    onChange={setDSubCat}
                    options={subCatOptions}
                    placeholder={dPedagogy === 'all' ? 'Sub Category' : 'All Sub Categories'}
                    disabled={!selectedCourseId || dPedagogy === 'all'}
                  />
                  <FilterSelect
                    label="Student"
                    value={dStudent}
                    onChange={setDStudent}
                    options={studentOptions}
                    placeholder="All Students"
                    disabled={!selectedCourseId || courseLogs.length === 0}
                  />
                </div>

                {/* Row 2 — dates / search / actions */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                  {/* From */}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 170px', minWidth: 140 }}>
                    <FieldLabel>From Date</FieldLabel>
                    <input
                      type="date" value={dFrom} onChange={e => setDFrom(e.target.value)} disabled={!selectedCourseId}
                      className="logs-input"
                      style={{ height: 32, width: '100%', padding: '0 9px', fontSize: 12, borderRadius: 7, border: `1px solid ${T.border}`, background: T.bg, color: T.textSub, fontFamily: FONT, cursor: !selectedCourseId ? 'not-allowed' : 'pointer', opacity: !selectedCourseId ? 0.6 : 1 }}
                    />
                  </div>
                  {/* To */}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 170px', minWidth: 140 }}>
                    <FieldLabel>To Date</FieldLabel>
                    <input
                      type="date" value={dTo} onChange={e => setDTo(e.target.value)} disabled={!selectedCourseId}
                      className="logs-input"
                      style={{ height: 32, width: '100%', padding: '0 9px', fontSize: 12, borderRadius: 7, border: `1px solid ${T.border}`, background: T.bg, color: T.textSub, fontFamily: FONT, cursor: !selectedCourseId ? 'not-allowed' : 'pointer', opacity: !selectedCourseId ? 0.6 : 1 }}
                    />
                  </div>
                  {/* Search */}
                  <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textHint, pointerEvents: 'none' }} />
                    <input
                      className="logs-input"
                      value={dSearch}
                      onChange={e => setDSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') applyFilters(); }}
                      placeholder="Search by title or type..."
                      disabled={!selectedCourseId}
                      style={{ height: 32, width: '100%', paddingLeft: 30, paddingRight: 10, fontSize: 12, borderRadius: 7, border: `1px solid ${T.border}`, background: T.bg, color: T.textMain, fontFamily: FONT, opacity: !selectedCourseId ? 0.6 : 1 }}
                    />
                  </div>
                  {/* Apply */}
                  <button
                    className="logs-apply-btn"
                    onClick={applyFilters}
                    disabled={!selectedCourseId}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 14px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: !selectedCourseId ? 'not-allowed' : 'pointer', border: 'none', background: T.orange, color: '#fff', transition: 'background 0.15s', flexShrink: 0, opacity: !selectedCourseId ? 0.6 : 1 }}>
                    <Filter size={13} /> Apply Filters
                  </button>
                  {/* Generate Report */}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (selectedCourseId) params.set('courseId', selectedCourseId);
                      const course = courses.find(c => c._id === selectedCourseId);
                      if (course) params.set('courseName', course.courseName);
                      if (dPedagogy !== 'all') params.set('pedagogy', dPedagogy);
                      if (dSubCat !== 'all') params.set('subCat', dSubCat);
                      if (dStudent !== 'all') params.set('student', dStudent);
                      if (dFrom) params.set('from', dFrom);
                      if (dTo) params.set('to', dTo);
                      router.push('/lms/pages/logs/report?' + params.toString());
                    }}
                    disabled={!selectedCourseId}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 14px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: !selectedCourseId ? 'not-allowed' : 'pointer', border: 'none', background: '#1f2937', color: '#fff', transition: 'background 0.15s', flexShrink: 0, opacity: !selectedCourseId ? 0.6 : 1 }}>
                    <FileText size={13} /> Generate Report
                  </button>
                  {/* Reset */}
                  <button
                    className="logs-page-btn"
                    onClick={resetCourseFilters}
                    disabled={!selectedCourseId}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: !selectedCourseId ? 'not-allowed' : 'pointer', border: `1px solid ${T.border}`, background: T.bg, color: T.textMuted, transition: 'all 0.15s', flexShrink: 0, opacity: !selectedCourseId ? 0.6 : 1 }}>
                    <RefreshCw size={12} className={courseLoading ? 'animate-spin' : ''} /> Reset
                  </button>
                </div>
              </div>

              {/* ── Table card ── */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

                {!selectedCourseId ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <BookMarked size={36} style={{ color: T.textHint }} />
                    <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Select a course above to view student activity logs</p>
                  </div>

                ) : courseLoading ? (
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Loader2 size={24} className="animate-spin" style={{ color: T.orange }} />
                  </div>

                ) : courseError ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: T.textMuted }}>{courseError}</div>

                ) : flatRows.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: T.textMuted }}>No activity data found for this course</div>

                ) : (
                  <>
                    <div className="logs-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: '4%' }} /><col style={{ width: '16%' }} />
                          <col style={{ width: '9%' }} /><col style={{ width: '21%' }} />
                          <col style={{ width: '17%' }} /><col style={{ width: '13%' }} />
                          <col style={{ width: '13%' }} /><col style={{ width: '7%' }} />
                        </colgroup>
                        <thead>
                          <tr>
                            {['#', 'Student Name', 'Type', 'Title', 'Node Type', 'Start Date-Time', 'End Date-Time', 'Duration'].map((h, idx) => (
                              <th key={h} style={{
                                position: 'sticky', top: 0, zIndex: 2,
                                padding: '9px 10px', fontSize: 10, fontWeight: 600, color: T.textMuted,
                                textAlign: 'left', whiteSpace: 'nowrap', background: '#fafbfc',
                                borderBottom: `1px solid ${T.border}`, paddingLeft: idx === 0 ? 14 : 10,
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row, i) => {
                            const tb = typeBadge(row.type);
                            return (
                              <tr key={row.key} className="logs-tr" style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                                <td style={{ padding: '8px 10px 8px 14px', fontSize: 10.5, color: T.textHint, fontFamily: 'ui-monospace,monospace' }}>{startEntry + i}</td>
                                <td style={{ padding: '8px 10px', minWidth: 0 }}>
                                  <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.studentName || '—'}</div>
                                  <div style={{ fontSize: 10, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.studentEmail || '—'}</div>
                                </td>
                                <td style={{ padding: '8px 10px', overflow: 'hidden' }}>
                                  <span style={{ display: 'inline-block', maxWidth: '100%', padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: tb.bg, color: tb.col, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.type}</span>
                                </td>
                                <td style={{ padding: '8px 10px', fontSize: 11.5, fontWeight: 600, color: T.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</td>
                                <td style={{ padding: '8px 10px', fontSize: 11, color: T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nodeLabel(row.nodeName, row.nodeType)}</td>
                                <td style={{ padding: '8px 10px', fontSize: 10.5, color: T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtDateTime(row.startTime)}</td>
                                <td style={{ padding: '8px 10px', fontSize: 10.5, color: T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtDateTime(row.endTime || '')}</td>
                                <td style={{ padding: '8px 10px', fontSize: 11.5, fontWeight: 600, color: T.textMain, whiteSpace: 'nowrap' }}>{fmtHM(row.durationSec)}</td>
                              </tr>
                            );
                          })}
                          {pageRows.length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ padding: '50px 0', textAlign: 'center', fontSize: 13, color: T.textMuted }}>
                                No measured activity matches the selected filters
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer / pagination */}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '10px 16px', borderTop: `1px solid ${T.border}`, background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, color: T.textMuted }}>
                          Showing {startEntry} to {endEntry} of {filteredRows.length.toLocaleString()} entries
                        </span>
                        {filteredRows.length > 0 && (
                          <button className="logs-export-btn" onClick={exportCourseLogsToExcel}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', border: '1px solid #bbf7d0', background: 'rgba(16,185,129,0.06)', color: '#059669', transition: 'background 0.15s' }}>
                            <Download size={11} /> Export
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <button
                          className="logs-page-btn"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          style={{ height: 28, padding: '0 10px', fontSize: 11, fontWeight: 500, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, color: page === 1 ? T.textHint : T.textSub, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                          Previous
                        </button>
                        {pageList(page, totalPages).map((p, idx) =>
                          p === '…' ? (
                            <span key={`e${idx}`} style={{ padding: '0 4px', fontSize: 11, color: T.textHint }}>…</span>
                          ) : (
                            <button
                              key={p}
                              className={p === page ? '' : 'logs-page-btn'}
                              onClick={() => setPage(p)}
                              style={{
                                minWidth: 28, height: 28, padding: '0 7px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                                border: p === page ? 'none' : `1px solid ${T.border}`,
                                background: p === page ? T.orange : T.bg,
                                color: p === page ? '#fff' : T.textSub,
                                cursor: 'pointer',
                              }}>
                              {p}
                            </button>
                          )
                        )}
                        <button
                          className="logs-page-btn"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          style={{ height: 28, padding: '0 10px', fontSize: 11, fontWeight: 500, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, color: page === totalPages ? T.textHint : T.textSub, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
          </div>
        )}

      </div>
    </StaffLayout>
  );
}
