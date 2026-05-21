"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Clock, Users, Search, Loader2,
  Target, LayoutGrid, List, GraduationCap, ArrowRight,
  Sparkles, X, Plus, ChevronDown,
  FileText, CheckCircle, ClipboardCheck,
} from 'lucide-react';
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, cubicBezier } from 'framer-motion';
import {
  useCoursesInfiniteQuery,
  useFilteredCourses,
  getAuthToken,
  getCurrentUserIdFromAuth,
  Course
} from '../.../../../../../apiServices/studentcoursepage';
import { StudentLayout } from '../../component/student/student-layout';
import DashboardLayout from '../../component/layout';
import { StaffLayout } from '../../component/stafflayout/staff-layout';
import RichTextDisplay from '../../component/RichTextDisplay';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  orange: '#F27757', orangeDark: '#E0623F', orangeGlow: 'rgba(242,119,87,0.22)', orangeLight: 'rgba(242,119,87,0.08)',
  textMain: '#1a1a2e', textSub: '#6b6b7e', textMuted: '#8b8b9e', textHint: '#bcbccc', border: '#ecedf1', bg: '#ffffff', pageBg: '#f8f8fa',
  dark: { bg: '#1a1a2e', surface: '#222240', card: '#252545', border: '#2e2e4a', textMain: '#e8e8f0', textSub: '#a0a0b8', textMuted: '#6b6b88', textHint: '#4a4a66', pageBg: '#12121f' }
};

const defaultCategories = ["All", "Web Development", "Data Science", "Mobile Development", "Design", "Cloud Computing", "Marketing", "Security"];

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

const isStudentUser = (): boolean => { 
  try { 
    const { valid, user } = getUser(); 
    if (!valid || !user) return false; 
    let r = ''; 
    if (typeof user.role === 'object' && user.role !== null) 
      r = (user.role as any).roleValue || (user.role as any).originalRole || (user.role as any).renameRole || ''; 
    else if (typeof user.role === 'string') 
      r = user.role; 
    const s = localStorage.getItem("smartcliff_roleValue") || localStorage.getItem("smartcliff_originalRole") || localStorage.getItem("smartcliff_role") || ''; 
    return (r || s).toLowerCase().includes('student') 
  } catch { 
    return false 
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
    // First try to get from smartcliff_roleValue
    const roleValue = localStorage.getItem('smartcliff_roleValue');
    if (roleValue) return roleValue.toLowerCase();
    
    // If not, try from userData
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

// ─── Stat Card — compact ──────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, value, label, isDark }: { icon: React.ElementType; value: string | number; label: string; isDark: boolean }) => (
  <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl" style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }}>
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isDark ? 'rgba(242,119,87,0.12)' : T.orangeLight }}>
      <Icon className="w-4 h-4" style={{ color: T.orange }} strokeWidth={2} />
    </div>
    <div>
      <p className="text-[18px] font-extrabold leading-none tracking-tight" style={{ color: isDark ? T.dark.textMain : T.textMain }}>{value}</p>
      <p className="text-[11px] font-medium mt-0.5" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>{label}</p>
    </div>
  </div>
);

// ─── Course Card ──────────────────────────────────────────────────────────────
const CourseCard = ({ course, isStudent, onStart, viewMode, isDark }: { course: Course; isStudent: boolean; onStart: (id: string) => void; viewMode: 'grid' | 'list'; isDark: boolean }) => {
  const lv = getLevelCfg(course.courseLevel);
  const desc = course.courseDescription?.replace(/<[^>]+>/g, '') || 'No description available.';

  // ── LIST view ───────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <motion.div layout variants={cardV}
        className="group flex items-center gap-4 p-3.5 rounded-xl  transition-all"
        style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }}
        onClick={() => onStart(course._id)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.orange; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${T.orangeGlow}` }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isDark ? T.dark.border : T.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
      >
        {/* Thumbnail */}
        <div className="relative h-16 w-24 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={course.courseImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=150&fit=crop"}
            alt={course.courseName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.currentTarget.src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=150&fit=crop" }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mb-0.5" style={{ background: lv.bg, color: lv.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: lv.dot }} />{course.courseLevel}
          </span>
          <h3 className="text-[14px] font-bold leading-snug truncate" style={{ color: isDark ? T.dark.textMain : T.textMain }}>{course.courseName}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>
              <FileText className="w-3 h-3" style={{ color: T.orange }} />{course.courseDuration} Modules
            </span>
            <span style={{ color: isDark ? T.dark.border : T.border }}>|</span>
            <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>
              <Users className="w-3 h-3" style={{ color: T.orange }} />{course.clientName}
            </span>
          </div>
        </div>

        {/* Both buttons fully orange */}
        <button
          onClick={e => { e.stopPropagation(); onStart(course._id) }}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold text-white transition-all"
          style={{ background: T.orange, boxShadow: `0 3px 10px ${T.orangeGlow}` }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.orangeDark }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.orange }}
        >
          {isStudent ? 'Start' : 'Manage Resources'}<ArrowRight className="w-3 h-3" />
        </button>
      </motion.div>
    );
  }

  // ── GRID view ───────────────────────────────────────────────────────────────
  return (
    <motion.div layout variants={cardV}
      className="group flex flex-col rounded-xl overflow-hidden transition-all duration-200"
      style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = isDark ? '0 6px 24px rgba(0,0,0,0.28)' : '0 6px 24px rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
    >
      {/* Thumbnail — slightly shorter */}
      <div className="relative h-36 overflow-hidden cursor-pointer" onClick={() => onStart(course._id)}>
        <img
          src={course.courseImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop"}
          alt={course.courseName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { e.currentTarget.src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop" }}
        />
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: lv.bg, color: lv.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: lv.dot }} />{course.courseLevel}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4">
        <h3
          className="text-[14px] font-bold leading-snug cursor-pointer mb-1 line-clamp-2 transition-colors"
          style={{ color: isDark ? T.dark.textMain : T.textMain }}
          onClick={() => onStart(course._id)}
          onMouseEnter={e => (e.currentTarget.style.color = T.orange)}
          onMouseLeave={e => (e.currentTarget.style.color = isDark ? T.dark.textMain : T.textMain)}
        >
          {course.courseName}
        </h3>

        <p className="text-[12px] leading-relaxed line-clamp-2 mb-3" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>{desc}</p>

        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: isDark ? T.dark.textSub : T.textSub }}>
            <FileText className="w-3 h-3" style={{ color: T.orange }} />{course.courseDuration} Modules
          </span>
          <span style={{ color: isDark ? T.dark.border : T.border }}>|</span>
          <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: isDark ? T.dark.textSub : T.textSub }}>
            <Users className="w-3 h-3" style={{ color: T.orange }} />{course.clientName || '0'} Students
          </span>
        </div>

        {/* Both buttons fully orange — solid fill for both student and staff */}
        <div className="mt-auto">
          <button
            onClick={() => onStart(course._id)}
            className="w-full flex items-center cursor-pointer justify-center gap-1.5 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all"
            style={{ background: T.orange, boxShadow: `0 3px 10px ${T.orangeGlow}` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.orangeDark }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.orange }}
          >
            {isStudent ? 'Start Course' : 'Manage Resources'}<ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skel = ({ isDark }: { isDark: boolean }) => (
  <div className="rounded-xl overflow-hidden animate-pulse" style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }}>
    <div className="h-36" style={{ background: isDark ? T.dark.surface : '#f0f0f4' }} />
    <div className="p-4 space-y-2">
      <div className="h-3.5 rounded-full w-3/5" style={{ background: isDark ? T.dark.surface : '#f0f0f4' }} />
      <div className="h-3 rounded-full w-full" style={{ background: isDark ? T.dark.surface : '#f0f0f4' }} />
      <div className="h-9 rounded-lg mt-2" style={{ background: isDark ? T.dark.surface : '#f0f0f4' }} />
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

const Err = ({ onRetry, isDark }: { onRetry: () => void; isDark: boolean }) => (
  <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 rounded-xl"
    style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }}>
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: '#fff1f2' }}>
      <Target className="w-6 h-6" style={{ color: '#e11d48' }} />
    </div>
    <h3 className="text-[14px] font-bold mb-1" style={{ color: isDark ? T.dark.textMain : T.textMain }}>Failed to load courses</h3>
    <p className="text-[12px] mb-4" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>Something went wrong.</p>
    <button onClick={onRetry} className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white" style={{ background: T.orange }}>Try Again</button>
  </motion.div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [isStudent, setIsStudent] = useState(false);
  const [isDummyStudent, setIsDummyStudent] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [showCatDrop, setShowCatDrop] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [userName, setUserName] = useState('');
  const [isRoleLoading, setIsRoleLoading] = useState(true); // Add loading state for role
  const router = useRouter();

  useEffect(() => { 
    const c = () => setIsDark(document.documentElement.classList.contains('dark')); 
    c(); 
    const o = new MutationObserver(c); 
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); 
    return () => o.disconnect() 
  }, []);

  useEffect(() => {
    const initializeRole = async () => {
      try {
        // Get user role from localStorage
        const role = getUserRole();
        console.log('User role from localStorage:', role);
        
        setUserRole(role);
        
        // Set isStudent based on role
        const isStudentRole = role === 'student';
        setIsStudent(isStudentRole);
        
        // Check dummy mode
        const dummyMode = isDummyMode();
        setIsDummyStudent(dummyMode);
        
        // If in dummy mode, override isStudent to true
        if (dummyMode) {
          setIsStudent(true);
        }
        
        // Set auth token and user ID
        setAuthToken(getAuthToken());
        setUserId(getCurrentUserIdFromAuth());
        
        // Get user name
        try {
          const userData = localStorage.getItem('smartcliff_userData');
          if (userData) {
            const parsed = JSON.parse(userData);
            setUserName(parsed.firstName || '');
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
        
        // Listen for role changes
        const handleStorageChange = () => {
          const newRole = getUserRole();
          const newDummyMode = isDummyMode();
          
          setUserRole(newRole);
          setIsStudent(newRole === 'student' || newDummyMode);
          setIsDummyStudent(newDummyMode);
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
        
      } catch (error) {
        console.error('Error initializing role:', error);
      } finally {
        setIsRoleLoading(false);
      }
    };
    
    initializeRole();
  }, []);

  const filters = { searchTerm, selectedCategory };
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useCoursesInfiniteQuery(authToken, userId, filters);
  const allCourses = useMemo(() => data?.pages.flatMap(p => p.data) || [], [data]);
  const uniqueTypes = useMemo(() => allCourses.length ? Array.from(new Set(allCourses.map(c => c.serviceType).filter(Boolean))) : [], [allCourses]);
  useEffect(() => { setCategories(uniqueTypes.length > 0 ? ["All", ...uniqueTypes] : defaultCategories) }, [uniqueTypes]);
  const filtered = useFilteredCourses(allCourses, filters);

  const handleScroll = useCallback(() => { 
    if (isFetchingNextPage || !hasNextPage || isLoading) return; 
    if (window.scrollY + document.documentElement.clientHeight >= document.documentElement.scrollHeight - 300) 
      fetchNextPage() 
  }, [isFetchingNextPage, hasNextPage, fetchNextPage, isLoading]);
  
  useEffect(() => { 
    window.addEventListener('scroll', handleScroll); 
    return () => window.removeEventListener('scroll', handleScroll) 
  }, [handleScroll]);

  const onStart = (id: string) => {
    if (isStudent) 
      router.push(`/lms/pages/courses/coursesdetailedview/${id}`);
    else 
      router.push(`/lms/pages/courses/uploadcourseresources?${new URLSearchParams({ courseId: id }).toString()}`);
  };

  const loading = isLoading && !data;

  // ── Content ────────────────────────────────────────────────────────────────
  const content = (
    <div className="sc-courses-font">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .sc-courses-font,.sc-courses-font *{font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif!important}
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* ── Header row — compact ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-[20px] font-extrabold tracking-tight" style={{ color: isDark ? T.dark.textMain : T.textMain, letterSpacing: '-0.03em' }}>
            Welcome back, <span style={{ color: T.orange }}>{userName || 'User'}</span>!
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>
            {isStudent ? 'Continue your progress where you left off.' : 'Manage your courses and resources efficiently.'}
          </p>
        </div>
      </div>

      {/* ── Stats — compact ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard icon={BookOpen}      value={filtered.length || 0} label="Total Courses"  isDark={isDark} />
        <StatCard icon={Users}         value={45}                   label="Students"        isDark={isDark} />
        <StatCard icon={ClipboardCheck} value={18}                  label="Assignments"     isDark={isDark} />
        <StatCard icon={CheckCircle}   value="92%"                  label="Progress"        isDark={isDark} />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h2 className="text-[16px] font-extrabold tracking-tight" style={{ color: isDark ? T.dark.textMain : T.textMain }}>
          Course Management
        </h2>
        <div className="flex items-center gap-2">
          {/* Category dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCatDrop(!showCatDrop)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold"
              style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px solid ${isDark ? T.dark.border : T.border}`, color: T.orange }}
            >
              {selectedCategory}<ChevronDown className="w-3 h-3" style={{ color: T.orange }} />
            </button>
            {showCatDrop && (
              <div className="absolute top-full right-0 mt-1 w-44 py-1 z-50 rounded-xl overflow-hidden"
                style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}`, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.08)' }}>
                {categories.map(c => (
                  <button key={c} onClick={() => { setSelectedCategory(c); setShowCatDrop(false) }}
                    className="w-full text-left px-3 py-1.5 text-[12px] transition-colors"
                    style={{ fontWeight: selectedCategory === c ? 700 : 500, color: selectedCategory === c ? T.orange : isDark ? T.dark.textSub : T.textSub, background: selectedCategory === c ? (isDark ? 'rgba(242,119,87,0.08)' : T.orangeLight) : 'transparent' }}
                    onMouseEnter={e => { if (selectedCategory !== c) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.04)' : '#f7f7f9' }}
                    onMouseLeave={e => { if (selectedCategory !== c) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >{c}</button>
                ))}
              </div>
            )}
          </div>

          {/* Search toggle */}
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-lg"
            style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px solid ${isDark ? T.dark.border : T.border}`, color: showSearch ? T.orange : isDark ? T.dark.textMuted : T.textMuted }}>
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* View toggle */}
          <div className="flex items-center p-0.5 rounded-lg" style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px solid ${isDark ? T.dark.border : T.border}` }}>
            {(['grid', 'list'] as const).map(m => { const a = viewMode === m; const I = m === 'grid' ? LayoutGrid : List; return (
              <button key={m} onClick={() => setViewMode(m)} className="p-1.5 rounded-md transition-all"
                style={{ background: a ? (isDark ? 'rgba(242,119,87,0.12)' : T.orangeLight) : 'transparent', color: a ? T.orange : isDark ? T.dark.textMuted : T.textMuted }}>
                <I className="w-3.5 h-3.5" />
              </button>
            )})}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: isDark ? T.dark.textHint : T.textHint }} />
              <input type="text" placeholder="Search courses…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus
                className="w-full h-[40px] pl-10 pr-9 text-[13px] outline-none"
                style={{ background: isDark ? T.dark.card : T.bg, border: `1.5px solid ${isDark ? T.dark.border : T.border}`, borderRadius: '10px', color: isDark ? T.dark.textMain : T.textMain, fontFamily: 'inherit' }}
                onFocus={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.orangeLight}` }}
                onBlur={e => { e.currentTarget.style.borderColor = isDark ? T.dark.border : T.border; e.currentTarget.style.boxShadow = 'none' }}
              />
              {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}><X className="w-3.5 h-3.5" /></button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cards ── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-2.5"}>
            {[...Array(6)].map((_, i) => viewMode === 'grid'
              ? <Skel key={i} isDark={isDark} />
              : <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }} />
            )}
          </motion.div>
        ) : isError ? (
          <Err onRetry={() => refetch()} isDark={isDark} />
        ) : filtered.length === 0 ? (
          <Empty onClear={() => setSearchTerm('')} hasSearch={!!searchTerm} isDark={isDark} />
        ) : (
          <motion.div key={`${viewMode}-g`} variants={containerV} initial="hidden" animate="visible"
            className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-2.5"}>
            {filtered.map(c => <CourseCard key={c._id} course={c} isStudent={isStudent} onStart={onStart} viewMode={viewMode} isDark={isDark} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load more indicator */}
      {isFetchingNextPage && (
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: isDark ? T.dark.card : T.bg, border: `1px solid ${isDark ? T.dark.border : T.border}` }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: T.orange }} />
            <span className="text-[11px] font-semibold" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>Loading more…</span>
          </div>
        </div>
      )}

      {/* End of list */}
      {!hasNextPage && filtered.length > 0 && !loading && (
        <div className="flex items-center justify-center gap-3 mt-10 mb-3">
          <div className="h-px flex-1 max-w-12" style={{ background: isDark ? T.dark.border : T.border }} />
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: isDark ? T.dark.textHint : T.textHint }}>
            <Sparkles className="w-2.5 h-2.5" style={{ color: T.orange }} />All caught up
          </span>
          <div className="h-px flex-1 max-w-12" style={{ background: isDark ? T.dark.border : T.border }} />
        </div>
      )}
    </div>
  );

  // Show loading state while role is being determined
  if (isRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: isDark ? T.dark.pageBg : T.pageBg }}>
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: `3px solid ${T.orangeLight}`, borderTopColor: T.orange }} />
      </div>
    );
  }

  // Role-based layout rendering
  // Admin role → DashboardLayout
  if (userRole === 'admin') {
    return <DashboardLayout>{content}</DashboardLayout>;
  }
  
  // Student role → StudentLayout
  if (userRole === 'student' || isStudent) {
    return <StudentLayout>{content}</StudentLayout>;
  }
  
  // Any other role (staff, instructor, etc.) → StaffLayout
  return <StaffLayout>{content}</StaffLayout>;
}