"use client";
import { Loading } from "@/components/loading-ui/loading";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen, Users, Loader2,
  Target, LayoutGrid, List, GraduationCap, ArrowRight,
  ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence, cubicBezier } from 'framer-motion';
import {
  getAuthToken,
  getCurrentUserIdFromAuth,
  Course
} from '../.../../../../../apiServices/studentcoursepage';
import {
  useCoursesListQuery,
  useFilteredCourses,
  usePrefetchCourseDetail,
} from '@/queries/courses';
import { StudentLayout } from '../../component/student/student-layout';
import DashboardLayout from '../../component/layout';
import { StaffLayout } from '../../component/stafflayout/staff-layout';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  orange: '#F27757', orangeDark: '#E0623F', orangeGlow: 'rgba(242,119,87,0.22)', orangeLight: 'rgba(242,119,87,0.08)',
  textMain: '#1a1a2e', textSub: '#6b6b7e', textMuted: '#8b8b9e', textHint: '#bcbccc', border: '#ecedf1', bg: '#ffffff', pageBg: '#f8f8fa',
  dark: { bg: '#1a1a2e', surface: '#222240', card: '#252545', border: '#2e2e4a', textMain: '#e8e8f0', textSub: '#a0a0b8', textMuted: '#6b6b88', textHint: '#4a4a66', pageBg: '#12121f' }
};

const defaultCategories = ["All", "Web Development", "Data Science", "Mobile Development", "Design", "Cloud Computing", "Marketing", "Security"];
const LEVEL_OPTIONS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
const ITEMS_PER_PAGE = 8;

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface UserData { _id: string; email: string; firstName: string; lastName: string; role: { _id: string; originalRole: string; renameRole: string; roleValue: string } | string; permissions?: any[]; [key: string]: any }
interface RoleSwitchState { isDummyStudent: boolean; originalRole?: string; originalRenameRole?: string; switchTimestamp?: number }

// ─── Animations ───────────────────────────────────────────────────────────────
const containerV = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const cardV = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: cubicBezier(0.22, 1, 0.36, 1) } } };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getUser = (): { valid: boolean; user: UserData | null } => {
  try {
    const s = localStorage.getItem("smartcliff_userData");
    if (!s) return { valid: false, user: null };
    return { valid: true, user: JSON.parse(s) }
  } catch {
    return { valid: false, user: null }
  }
};


const isDummyMode = (): boolean => {
  try {
    const s = localStorage.getItem('smartcliff_roleSwitch');
    if (s) {
      const d: RoleSwitchState = JSON.parse(s);
      return d.isDummyStudent === true
    }
    return localStorage.getItem('smartcliff_isDummyStudent') === 'true'
  } catch {
    return false
  }
};

// Function to get the actual user role from localStorage
const getUserRole = (): string | null => {
  try {
    const roleValue = localStorage.getItem('smartcliff_roleValue');
    if (roleValue) return roleValue.toLowerCase();

    const { valid, user } = getUser();
    if (valid && user) {
      if (typeof user.role === 'object' && user.role !== null) {
        const role = (user.role as any).roleValue || (user.role as any).originalRole || (user.role as any).renameRole;
        if (role) return role.toLowerCase();
      } else if (typeof user.role === 'string') {
        return user.role.toLowerCase();
      }
    }

    return null;
  } catch {
    return null;
  }
};

const getLevelCfg = (l: string) => {
  switch (l) {
    case 'Beginner': return { bg: '#ecfdf5', text: '#059669', dot: '#10b981' };
    case 'Intermediate': return { bg: '#fff7ed', text: '#ea580c', dot: '#f97316' };
    default: return { bg: '#fff1f2', text: '#e11d48', dot: '#f43f5e' };
  }
};

// ─── Banner gradient per course level ────────────────────────────────────────
const BANNER_GRADIENTS: Record<string, string> = {
  Beginner: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  Intermediate: 'linear-gradient(135deg, #F27757 0%, #f5a623 100%)',
  Advanced: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  Expert: 'linear-gradient(135deg, #e11d48 0%, #7c3aed 100%)',
};
const fallbackGradient = (name: string) => {
  const hues = [210, 150, 270, 30, 180, 320, 60, 0];
  const h = hues[(name.charCodeAt(0) || 0) % hues.length];
  return `linear-gradient(135deg, hsl(${h},65%,45%) 0%, hsl(${(h + 40) % 360},70%,60%) 100%)`;
};
const getBanner = (course: Course) =>
  BANNER_GRADIENTS[course.courseLevel] || fallbackGradient(course.courseName || '');

// ─── Course Card ──────────────────────────────────────────────────────────────
const CourseCard = React.memo(function CourseCard({ course, isStudent, onStart, onPrefetch, viewMode, isDark }: { course: Course; isStudent: boolean; onStart: (id: string) => void; onPrefetch: (id: string) => void; viewMode: 'grid' | 'list'; isDark: boolean }) {
  const [imgError, setImgError] = useState(false);

  const lv = getLevelCfg(course.courseLevel);
  const abbr = (course.courseName || 'C').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3);
  const banner = getBanner(course);
  const hasImg = !!(course as any).courseImage && !imgError;

  const handlePrefetch = useCallback(() => onPrefetch(course._id), [onPrefetch, course._id]);
  const handleStart = useCallback(() => onStart(course._id), [onStart, course._id]);

  // ── LIST view ────────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <motion.div layout variants={cardV}
        className="group flex items-center gap-4 p-3.5 rounded-xl cursor-pointer"
        style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}`, transition: 'border-color .15s, box-shadow .15s' }}
        onClick={handleStart}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.orange; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${T.orangeGlow}`; handlePrefetch(); }}
        onFocus={handlePrefetch}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isDark ? T.dark.border : T.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
      >
        {/* Thumbnail */}
        <div className="h-14 w-20 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ background: banner }}>
          {hasImg
            ? <img src={(course as any).courseImage} onError={() => setImgError(true)} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-white font-extrabold text-[15px]">{abbr}</div>
          }
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: lv.bg, color: lv.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: lv.dot }} />{course.courseLevel}
            </span>
            {course.serviceType && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded max-w-[120px] truncate" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f5', color: isDark ? T.dark.textMuted : T.textMuted }}>
                {course.serviceType}
              </span>
            )}
          </div>
          <h3 className="text-[13.5px] font-bold leading-snug truncate" style={{ color: isDark ? T.dark.textMain : T.textMain }}>{course.courseName}</h3>
          <div className="flex items-center gap-3 mt-0.5">
            {course.courseDuration && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>
                <BookOpen className="w-3 h-3" style={{ color: T.orange }} />{course.courseDuration} modules
              </span>
            )}
            {course.clientName && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>
                <Users className="w-3 h-3" style={{ color: T.orange }} />{course.clientName}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); handleStart(); }}
          onMouseEnter={handlePrefetch}
          onFocus={handlePrefetch}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white"
          style={{ background: T.orange, transition: 'background .15s' }}
        >
          {isStudent ? 'Start' : 'Manage'}<ArrowRight className="w-3 h-3" />
        </button>
      </motion.div>
    );
  }

  // ── GRID view — Udemy-style ──────────────────────────────────────────────────
  return (
    <motion.div layout variants={cardV}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: isDark ? T.dark.card : T.bg,
        border: `1px solid ${isDark ? T.dark.border : T.border}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'transform .18s, box-shadow .18s, border-color .18s',
      }}
      onClick={handleStart}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${T.orangeGlow}`; (e.currentTarget as HTMLElement).style.borderColor = T.orange + '88'; handlePrefetch(); }}
      onFocus={handlePrefetch}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = isDark ? T.dark.border : T.border }}
    >
      {/* ── Thumbnail ── */}
      <div className="relative h-[160px] flex-shrink-0 overflow-hidden">
        {hasImg ? (
          <img src={(course as any).courseImage} onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5" style={{ background: banner }}>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(255,255,255,.6) 24px,rgba(255,255,255,.6) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,.6) 24px,rgba(255,255,255,.6) 25px)' }} />
            <span className="relative text-white font-extrabold text-[36px] tracking-[-0.04em] leading-none select-none" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
              {abbr}
            </span>
            <span className="relative text-white text-[10px] font-semibold opacity-80 tracking-widest uppercase select-none">
              {course.courseLevel || 'Course'}
            </span>
          </div>
        )}

        {/* Category / service type badge — top left */}
        {course.serviceType && (
          <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-12px)]">
            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md block truncate"
              style={{ background: lv.bg, color: lv.text }}>
              {course.serviceType}
            </span>
          </div>
        )}

        {/* Level badge — bottom left */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(0,0,0,0.52)', color: '#fff' }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: lv.dot }} />
            {course.courseLevel || 'Course'}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <h3 className="text-[13.5px] font-bold leading-snug line-clamp-2 mb-2"
          style={{ color: isDark ? T.dark.textMain : T.textMain }}>
          {course.courseName}
        </h3>

        {/* Batch / instructor row */}
        {course.clientName && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})` }}>
              {(course.clientName[0] || 'B').toUpperCase()}
            </div>
            <span className="text-[11.5px] truncate" style={{ color: isDark ? T.dark.textSub : T.textSub }}>
              {course.clientName}
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-1 mt-auto pt-2.5" style={{ borderTop: `1px solid ${isDark ? T.dark.border : T.border}` }}>
          {course.courseDuration && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>
              <BookOpen className="w-3 h-3 flex-shrink-0" style={{ color: T.orange }} />
              {course.courseDuration} modules
            </span>
          )}
          <span className="ml-auto text-[11.5px] font-bold" style={{ color: T.orange }}>
            {course.courseLevel || '—'}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={e => { e.stopPropagation(); handleStart(); }}
          onMouseEnter={handlePrefetch}
          onFocus={handlePrefetch}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-bold text-white"
          style={{ background: T.orange, transition: 'background .15s' }}
        >
          {isStudent ? 'Start Course' : 'Manage'}<ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skel = ({ isDark }: { isDark: boolean }) => (
  <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }}>
    <div className="h-[160px]" style={{ background: isDark ? T.dark.surface : '#ededf0' }} />
    <div className="p-4 space-y-2.5">
      <div className="h-4 rounded-full w-4/5" style={{ background: isDark ? T.dark.surface : '#ededf0' }} />
      <div className="h-3.5 rounded-full w-3/5" style={{ background: isDark ? T.dark.surface : '#ededf0' }} />
      <div className="h-px mt-1" style={{ background: isDark ? T.dark.border : T.border }} />
      <div className="flex justify-between">
        <div className="h-3 rounded-full w-1/3" style={{ background: isDark ? T.dark.surface : '#ededf0' }} />
        <div className="h-3 rounded-full w-1/5" style={{ background: isDark ? T.dark.surface : '#ededf0' }} />
      </div>
      <div className="h-9 rounded-xl mt-1" style={{ background: isDark ? T.dark.surface : '#ededf0' }} />
    </div>
  </div>
);

const Empty = ({ onClear, hasSearch, isDark }: { onClear: () => void; hasSearch: boolean; isDark: boolean }) => (
  <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 rounded-xl"
    style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px dashed ${isDark ? T.dark.border : T.border}` }}>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: T.orangeLight }}>
      <GraduationCap className="w-6 h-6" style={{ color: T.orange }} />
    </div>
    <h3 className="text-[14px] font-bold mb-1" style={{ color: isDark ? T.dark.textMain : T.textMain }}>No courses found</h3>
    <p className="text-[12px]" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>Try adjusting your search or category filter.</p>
    {hasSearch && <button onClick={onClear} className="mt-3 text-[12px] font-bold" style={{ color: T.orange }}>Clear search ×</button>}
  </motion.div>
);

const Err = ({ onRetry, isDark, message }: { onRetry: () => void; isDark: boolean; message?: string }) => (
  <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 rounded-xl"
    style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }}>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: '#fff1f2' }}>
      <Target className="w-6 h-6" style={{ color: '#e11d48' }} />
    </div>
    <h3 className="text-[14px] font-bold mb-1" style={{ color: isDark ? T.dark.textMain : T.textMain }}>Failed to load courses</h3>
    <p className="text-[12px] mb-4" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>{message || 'Something went wrong.'}</p>
    <button onClick={onRetry} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: T.orange }}>Try Again</button>
  </motion.div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL-synced filter state — survives refresh, supports back/forward
  const urlSearchTerm = sp?.get('q') || '';
  const urlCategory = sp?.get('category') || 'All';
  const urlLevel = (LEVEL_OPTIONS as readonly string[]).includes(sp?.get('level') || '') ? (sp?.get('level') as string) : 'All';
  const urlPage = Math.max(1, parseInt(sp?.get('page') || '1', 10) || 1);
  const urlView = (sp?.get('view') === 'list' ? 'list' : 'grid') as 'grid' | 'list';

  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedLevel, setSelectedLevel] = useState(urlLevel);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(urlView);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [isStudent, setIsStudent] = useState(false);
  const [, setIsDummyStudent] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [showCatDrop, setShowCatDrop] = useState(false);
  const [showLevelDrop, setShowLevelDrop] = useState(false);
  const [, setUserName] = useState('');
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    const c = () => setIsDark(document.documentElement.classList.contains('dark'));
    c();
    const o = new MutationObserver(c);
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect()
  }, []);

  useEffect(() => {
    try {
      const role = getUserRole();
      setUserRole(role);
      const isStudentRole = role === 'student';
      const dummyMode = isDummyMode();
      setIsDummyStudent(dummyMode);
      setIsStudent(isStudentRole || dummyMode);
      setAuthToken(getAuthToken());
      setUserId(getCurrentUserIdFromAuth());
      try {
        const userData = localStorage.getItem('smartcliff_userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          setUserName(parsed.firstName || '');
        }
      } catch { /* noop */ }
      const handleStorageChange = () => {
        const newRole = getUserRole();
        const newDummyMode = isDummyMode();
        setUserRole(newRole);
        setIsStudent(newRole === 'student' || newDummyMode);
        setIsDummyStudent(newDummyMode);
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    } finally {
      setIsRoleLoading(false);
    }
  }, []);

  // Keep local state in sync with URL navigation (back/forward, navbar search updates)
  useEffect(() => { setSearchTerm(urlSearchTerm); }, [urlSearchTerm]);
  useEffect(() => { setSelectedCategory(urlCategory); }, [urlCategory]);
  useEffect(() => { setSelectedLevel(urlLevel); }, [urlLevel]);
  useEffect(() => { setCurrentPage(urlPage); }, [urlPage]);
  useEffect(() => { setViewMode(urlView); }, [urlView]);

  // Write filter/page changes back to URL (replace, so we don't pollute history per keypress)
  const syncUrl = useCallback((next: { q?: string; category?: string; level?: string; page?: number; view?: 'grid' | 'list' }) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (next.q !== undefined) {
      if (next.q) params.set('q', next.q); else params.delete('q');
    }
    if (next.category !== undefined) {
      if (next.category && next.category !== 'All') params.set('category', next.category); else params.delete('category');
    }
    if (next.level !== undefined) {
      if (next.level && next.level !== 'All') params.set('level', next.level); else params.delete('level');
    }
    if (next.page !== undefined) {
      if (next.page > 1) params.set('page', String(next.page)); else params.delete('page');
    }
    if (next.view !== undefined) {
      if (next.view !== 'grid') params.set('view', next.view); else params.delete('view');
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname]);

  // Stable filter object for downstream memoization
  const filters = useMemo(
    () => ({ searchTerm, selectedCategory, selectedLevel }),
    [searchTerm, selectedCategory, selectedLevel]
  );

  const {
    data: allCourses,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useCoursesListQuery(userId);

  useEffect(() => {
    if (isError && (error as any)?.status === 401) {
      router.push('/login');
    }
  }, [isError, error, router]);

  const uniqueTypes = useMemo(
    () => (allCourses && allCourses.length ? Array.from(new Set(allCourses.map((c) => c.serviceType).filter(Boolean))) : []),
    [allCourses]
  );
  useEffect(() => {
    setCategories(uniqueTypes.length > 0 ? ["All", ...uniqueTypes] : defaultCategories);
  }, [uniqueTypes]);

  const filtered = useFilteredCourses(allCourses, filters);

  // Reset page to 1 when filter changes; reflect in URL.
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      syncUrl({ page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory, selectedLevel]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = useMemo(
    () => filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
    [filtered, safePage]
  );

  const prefetchCourseDetail = usePrefetchCourseDetail();

  // Prefetch the next-page course details — by the time the user clicks Next,
  // detail data for those cards is already warm.
  useEffect(() => {
    if (!filtered.length || safePage >= totalPages) return;
    const nextPageItems = filtered.slice(safePage * ITEMS_PER_PAGE, (safePage + 1) * ITEMS_PER_PAGE);
    nextPageItems.forEach((c) => prefetchCourseDetail(c._id));
  }, [filtered, safePage, totalPages, prefetchCourseDetail]);

  const onStart = useCallback((id: string) => {
    if (isStudent)
      router.push(`/lms/pages/courses/coursesdetailedview/${id}`);
    else
      router.push(`/lms/pages/courses/uploadcourseresources?${new URLSearchParams({ courseId: id }).toString()}`);
  }, [isStudent, router]);

  const onPrefetch = useCallback((id: string) => {
    // staff path lands on a different page that doesn't share the detail query,
    // so prefetch only when it will be used (student detail view).
    if (isStudent) prefetchCourseDetail(id);
  }, [isStudent, prefetchCourseDetail]);

  const handlePageChange = useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    setCurrentPage(clamped);
    syncUrl({ page: clamped });
  }, [totalPages, syncUrl]);

  const handleViewModeChange = useCallback((m: 'grid' | 'list') => {
    setViewMode(m);
    syncUrl({ view: m });
  }, [syncUrl]);

  const handleCategoryChange = useCallback((c: string) => {
    setSelectedCategory(c);
    syncUrl({ category: c });
    setShowCatDrop(false);
  }, [syncUrl]);

  const handleLevelChange = useCallback((l: string) => {
    setSelectedLevel(l);
    syncUrl({ level: l });
    setShowLevelDrop(false);
  }, [syncUrl]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedLevel('All');
    syncUrl({ q: '', category: 'All', level: 'All' });
  }, [syncUrl]);

  const loading = isLoading && !allCourses;

  // ── Content ────────────────────────────────────────────────────────────────
  const content = (
    <div className="sc-courses-font">
      <style jsx global>{`
        .sc-courses-font,.sc-courses-font *{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif!important}
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* ── Header bar: title + count ── */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{ color: isDark ? T.dark.textMain : T.textMain, letterSpacing: '-0.03em' }}>
            Courses
          </h1>
          {!loading && (
            <p className="text-[12px] mt-0.5" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>
              {filtered.length} course{filtered.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      </div>

      {/* ── Filter / toolbar bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">

        {/* Category dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowCatDrop(v => !v); setShowLevelDrop(false) }}
            className="flex items-center gap-1.5 h-[36px] px-3 rounded-lg text-[12px] font-semibold"
            style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px solid ${selectedCategory !== 'All' ? T.orange : (isDark ? T.dark.border : T.border)}`, color: selectedCategory !== 'All' ? T.orange : isDark ? T.dark.textSub : T.textSub }}
          >
            All Categories{selectedCategory !== 'All' ? `: ${selectedCategory.slice(0, 10)}` : ''}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showCatDrop && (
            <div className="absolute top-full left-0 mt-1 w-48 py-1 z-50 rounded-xl"
              style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
              {categories.map(c => (
                <button key={c} onClick={() => handleCategoryChange(c)}
                  className="w-full text-left px-3 py-1.5 text-[12px]"
                  style={{ fontWeight: selectedCategory === c ? 700 : 500, color: selectedCategory === c ? T.orange : isDark ? T.dark.textSub : T.textSub, background: selectedCategory === c ? (isDark ? 'rgba(242,119,87,0.08)' : T.orangeLight) : 'transparent' }}
                  onMouseEnter={e => { if (selectedCategory !== c) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f7f7f9' }}
                  onMouseLeave={e => { if (selectedCategory !== c) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >{c}</button>
              ))}
            </div>
          )}
        </div>

        {/* Level dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowLevelDrop(v => !v); setShowCatDrop(false) }}
            className="flex items-center gap-1.5 h-[36px] px-3 rounded-lg text-[12px] font-semibold"
            style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px solid ${selectedLevel !== 'All' ? T.orange : (isDark ? T.dark.border : T.border)}`, color: selectedLevel !== 'All' ? T.orange : isDark ? T.dark.textSub : T.textSub }}
          >
            Level{selectedLevel !== 'All' ? `: ${selectedLevel}` : ''}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showLevelDrop && (
            <div className="absolute top-full left-0 mt-1 w-36 py-1 z-50 rounded-xl"
              style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
              {LEVEL_OPTIONS.map(l => (
                <button key={l} onClick={() => handleLevelChange(l)}
                  className="w-full text-left px-3 py-1.5 text-[12px]"
                  style={{ fontWeight: selectedLevel === l ? 700 : 500, color: selectedLevel === l ? T.orange : isDark ? T.dark.textSub : T.textSub, background: selectedLevel === l ? (isDark ? 'rgba(242,119,87,0.08)' : T.orangeLight) : 'transparent' }}
                  onMouseEnter={e => { if (selectedLevel !== l) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f7f7f9' }}
                  onMouseLeave={e => { if (selectedLevel !== l) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >{l}</button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center p-0.5 rounded-lg" style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px solid ${isDark ? T.dark.border : T.border}` }}>
          {(['grid', 'list'] as const).map(m => {
            const a = viewMode === m; const I = m === 'grid' ? LayoutGrid : List; return (
              <button key={m} onClick={() => handleViewModeChange(m)} className="p-1.5 rounded-md"
                style={{ background: a ? (isDark ? 'rgba(242,119,87,0.12)' : T.orangeLight) : 'transparent', color: a ? T.orange : isDark ? T.dark.textMuted : T.textMuted, transition: 'background .15s' }}>
                <I className="w-3.5 h-3.5" />
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Cards ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" : "space-y-2.5"}>
            {[...Array(8)].map((_, i) => viewMode === 'grid'
              ? <Skel key={i} isDark={isDark} />
              : <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }} />
            )}
          </motion.div>
        ) : isError ? (
          <Err onRetry={() => refetch()} isDark={isDark} message={(error as any)?.message} />
        ) : filtered.length === 0 ? (
          <Empty onClear={handleClearFilters} hasSearch={!!searchTerm} isDark={isDark} />
        ) : (
          <motion.div key={`${viewMode}-${safePage}`} variants={containerV} initial="hidden" animate="visible"
            className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" : "space-y-2.5"}>
            {paginatedCourses.map(c => (
              <CourseCard
                key={c._id}
                course={c}
                isStudent={isStudent}
                onStart={onStart}
                onPrefetch={onPrefetch}
                viewMode={viewMode}
                isDark={isDark}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background refresh indicator — keeps list visible while refetch happens */}
      {isFetching && !loading && (
        <div className="flex justify-center mt-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }}>
            <Loader2 className="w-3 h-3 animate-spin" style={{ color: T.orange }} />
            <span className="text-[10px] font-semibold" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>Refreshing…</span>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-8 mb-2">
          {/* Prev */}
          <button
            onClick={() => handlePageChange(safePage - 1)}
            disabled={safePage === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px solid ${isDark ? T.dark.border : T.border}`, color: safePage === 1 ? (isDark ? T.dark.border : T.border) : isDark ? T.dark.textMuted : T.textSub, cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          {(() => {
            const pages: (number | '...')[] = [];
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              pages.push(1);
              if (safePage > 3) pages.push('...');
              for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
              if (safePage < totalPages - 2) pages.push('...');
              pages.push(totalPages);
            }
            return pages.map((p, i) => p === '...'
              ? <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-[12px]" style={{ color: isDark ? T.dark.textHint : T.textHint }}>…</span>
              : (
                <button key={p} onClick={() => handlePageChange(p as number)}
                  className="w-8 h-8 rounded-lg text-[12.5px] font-semibold transition-all"
                  style={{
                    background: safePage === p ? T.orange : isDark ? T.dark.card : T.bg,
                    border: `1.5px solid ${safePage === p ? T.orange : isDark ? T.dark.border : T.border}`,
                    color: safePage === p ? '#fff' : isDark ? T.dark.textSub : T.textSub,
                    boxShadow: safePage === p ? `0 2px 8px ${T.orangeGlow}` : 'none',
                  }}
                >{p}</button>
              )
            );
          })()}

          {/* Next */}
          <button
            onClick={() => handlePageChange(safePage + 1)}
            disabled={safePage === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px solid ${isDark ? T.dark.border : T.border}`, color: safePage === totalPages ? (isDark ? T.dark.border : T.border) : isDark ? T.dark.textMuted : T.textSub, cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  if (isRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: isDark ? T.dark.pageBg : T.pageBg }}>
        <Loading size="size-8" />
      </div>
    );
  }

  if (userRole === 'admin') {
    return <DashboardLayout>{content}</DashboardLayout>;
  }

  if (userRole === 'student' || isStudent) {
    return <StudentLayout>{content}</StudentLayout>;
  }

  return <StaffLayout>{content}</StaffLayout>;
}
