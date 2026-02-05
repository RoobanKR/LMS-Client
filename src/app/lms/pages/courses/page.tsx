"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Clock, Users, Play, ChevronRight, Search, Loader2, Target, DollarSign as Collaboration, Rocket, Sparkles, AlertCircle, Zap } from 'lucide-react';
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  useCoursesInfiniteQuery, 
  useFilteredCourses, 
  getAuthToken,
  getCurrentUserIdFromAuth,
  Course
} from '../.../../../../../apiServices/studentcoursepage';
import { StudentLayout } from '../../component/student/student-layout';
import RichTextDisplay from '../../component/RichTextDisplay';

const defaultCategories = ["All", "Web Development", "Data Science", "Mobile Development", "Design", "Cloud Computing", "Marketing", "Security"];

// Interface for user data
interface Permission {
  permissionName: string;
  permissionKey: string;
  permissionFunctionality: string[];
  icon: string;
  color: string;
  description: string;
  isActive: boolean;
  order: number;
  _id: string;
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    _id: string;
    originalRole: string;
    renameRole: string;
    roleValue: string;
  } | string;
  permissions?: Permission[];
  [key: string]: any;
}

interface RoleSwitchState {
  isDummyStudent: boolean
  originalRole?: string
  originalRenameRole?: string
  switchTimestamp?: number
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
      duration: 0.6
    }
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring" as const,
      stiffness: 120,
      damping: 20
    }
  }
};

const filterVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: "spring" as const,
      stiffness: 100,
      damping: 20
    }
  }
};

// Helper function to get user data from localStorage
const getCurrentUser = (): { valid: boolean; user: UserData | null } => {
  try {
    const userDataString = localStorage.getItem("smartcliff_userData");
    if (!userDataString) {
      return { valid: false, user: null };
    }
    
    const userData: UserData = JSON.parse(userDataString);
    return { valid: true, user: userData };
  } catch (error) {
    console.error("Error getting user data from localStorage:", error);
    return { valid: false, user: null };
  }
};

// Helper function to determine if user is a student
const isStudentUser = (): boolean => {
  try {
    const userResult = getCurrentUser();
    if (!userResult.valid || !userResult.user) return false;
    
    const user = userResult.user;
    let userRole = '';
    
    // Get role value from user data
    if (typeof user.role === 'object' && user.role !== null) {
      userRole = (user.role as any).roleValue || 
                 (user.role as any).originalRole || 
                 (user.role as any).renameRole || '';
    } else if (typeof user.role === 'string') {
      userRole = user.role;
    }
    
    // Also check localStorage for role value
    const storedRoleValue = localStorage.getItem("smartcliff_roleValue") || 
                           localStorage.getItem("smartcliff_originalRole") || 
                           localStorage.getItem("smartcliff_role") || '';
    
    userRole = userRole || storedRoleValue;
    
    // Check if role contains 'student' (case-insensitive)
    const isStudent = userRole.toLowerCase().includes('student');
    console.log("User role check:", { 
      roleFromUser: userRole, 
      storedRoleValue, 
      isStudent 
    });
    
    return isStudent;
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
};

// Helper function to check if user is in dummy student mode
const isDummyStudentMode = (): boolean => {
  try {
    // Check localStorage for dummy student flag
    const roleSwitchString = localStorage.getItem('smartcliff_roleSwitch');
    if (roleSwitchString) {
      const roleSwitchData: RoleSwitchState = JSON.parse(roleSwitchString);
      return roleSwitchData.isDummyStudent === true;
    }
    
    // Also check the simplified flag
    const isDummyStudent = localStorage.getItem('smartcliff_isDummyStudent');
    return isDummyStudent === 'true';
  } catch (error) {
    console.error("Error checking dummy student mode:", error);
    return false;
  }
};

// Get original role info
const getOriginalRoleInfo = (): { roleName: string; renameRole: string } | null => {
  try {
    const roleSwitchString = localStorage.getItem('smartcliff_roleSwitch');
    if (roleSwitchString) {
      const roleSwitchData: RoleSwitchState = JSON.parse(roleSwitchString);
      if (roleSwitchData.originalRole || roleSwitchData.originalRenameRole) {
        return {
          roleName: roleSwitchData.originalRole || '',
          renameRole: roleSwitchData.originalRenameRole || ''
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting original role info:", error);
    return null;
  }
};

const Breadcrumbs = () => {
  const router = useRouter();
  
  return (
    <div className="flex items-center gap-1 text-xs mb-3 px-1 text-gray-800 dark:text-gray-200">
      <div
        className="flex items-center gap-1 px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => router.push('/lms/pages/studentdashboard')}
      >
        <BookOpen className="w-3 h-3" />
        <span className="text-xs">Dashboard</span>
      </div>
      <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-600 mx-1" />
      <div className="flex items-center gap-1 px-2 py-1 text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 rounded transition-colors">
        <BookOpen className="w-3 h-3" />
        <span className="text-xs">Courses</span>
      </div>
    </div>
  );
};

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [isStudent, setIsStudent] = useState<boolean>(false);
  const [isDummyStudent, setIsDummyStudent] = useState<boolean>(false);
  const [originalRoleInfo, setOriginalRoleInfo] = useState<{ roleName: string; renameRole: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getAuthToken();
        setAuthToken(token);
        let currentUserId = getCurrentUserIdFromAuth();
        setUserId(currentUserId);
        const isDark = document.documentElement.classList.contains('dark');
        setCurrentTheme(isDark ? 'dark' : 'light');
        
        // Check if user is a student
        const studentCheck = isStudentUser();
        
        // Check if user is in dummy student mode
        const dummyStudentCheck = isDummyStudentMode();
        setIsDummyStudent(dummyStudentCheck);
        
        // Get original role info if in dummy student mode
        if (dummyStudentCheck) {
          const originalInfo = getOriginalRoleInfo();
          setOriginalRoleInfo(originalInfo);
        }
        
        // User is considered a "student" if they are either:
        // 1. Actual student role, OR
        // 2. In dummy student mode
        const finalIsStudent = studentCheck || dummyStudentCheck;
        setIsStudent(finalIsStudent);
        
        console.log("Role status:", {
          actualStudent: studentCheck,
          dummyStudent: dummyStudentCheck,
          finalIsStudent: finalIsStudent,
          originalRoleInfo: originalRoleInfo
        });

        // Listen for storage changes (role switch from navbar)
        const handleStorageChange = () => {
          const newDummyStudentCheck = isDummyStudentMode();
          setIsDummyStudent(newDummyStudentCheck);
          if (newDummyStudentCheck) {
            const originalInfo = getOriginalRoleInfo();
            setOriginalRoleInfo(originalInfo);
          } else {
            setOriginalRoleInfo(null);
          }
          setIsStudent(studentCheck || newDummyStudentCheck);
        };

        window.addEventListener('storage', handleStorageChange);

        // Listen for theme changes
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
              const isDark = document.documentElement.classList.contains('dark');
              setCurrentTheme(isDark ? 'dark' : 'light');
            }
          });
        });

        observer.observe(document.documentElement, { attributes: true });

        return () => {
          observer.disconnect();
          window.removeEventListener('storage', handleStorageChange);
        };
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      }
    };

    fetchUserData();
  }, []);

  const filters = {
    searchTerm,
    selectedCategory,
  };

  const { 
    data, 
    isLoading, 
    error, 
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch 
  } = useCoursesInfiniteQuery(authToken, userId, filters);

  const allCourses = useMemo(() => 
    data?.pages.flatMap(page => page.data) || [], 
    [data]
  );

  const uniqueServiceTypes = useMemo(() => {
    if (allCourses.length === 0) return [];
    
    const types = Array.from(
      new Set(allCourses.map(course => course.serviceType).filter(Boolean))
    );
    return types;
  }, [allCourses]);

  useEffect(() => {
    if (uniqueServiceTypes.length > 0) {
      setCategories(["All", ...uniqueServiceTypes]);
    } else {
      setCategories(defaultCategories);
    }
  }, [uniqueServiceTypes]);

  const filteredCourses = useFilteredCourses(allCourses, filters);

  const handleScroll = useCallback(() => {
    if (isFetchingNextPage || !hasNextPage || isLoading) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - 300) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage, isLoading]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleStartCourse = (courseId: string) => {
    console.log("Role-based navigation check:", {
      isStudent,
      isDummyStudent,
      originalRole: originalRoleInfo?.renameRole
    });
    
    if (isStudent) {
      // For real students AND dummy students: navigate to course detailed view
      console.log(`Student/dummy student navigating to detailed view for course: ${courseId}`);
      router.push(`/lms/pages/courses/coursesdetailedview/${courseId}?theme=${currentTheme}`);
    } else {
      // For non-students (admin/staff/other roles): navigate to upload resources page
      console.log(`Non-student navigating to upload resources for course: ${courseId}`);
      const query = new URLSearchParams({
        courseId: courseId,
      }).toString();
      router.push(`/lms/pages/courses/uploadcourseresources?${query}`);
    }
  };

  const handleRetry = () => {
    refetch();
  };
 

  const showCourseLoading = isLoading && !data;

  return (
    <>
      <style jsx global>{`
        /* Keep all existing styles */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.6) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 1px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #3b82f6, #2563eb);
          border-radius: 1px;
          box-shadow: 0 0 4px rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #2563eb, #1d4ed8);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
          width: 4px;
        }

        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #60a5fa, #3b82f6);
          box-shadow: 0 0 4px rgba(96, 165, 250, 0.4);
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #3b82f6, #2563eb);
          box-shadow: 0 0 8px rgba(96, 165, 250, 0.6);
        }

        .custom-scrollbar {
          scroll-behavior: smooth;
        }

        @keyframes scrollGlow {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          animation: scrollGlow 2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: 200px 0;
          }
        }

        .animate-shimmer {
          background: linear-gradient(
            90deg,
            transparent 25%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 75%
          );
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }

        .dark .animate-shimmer {
          background: linear-gradient(
            90deg,
            transparent 25%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 75%
          );
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }

        .course-card {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }

        * {
          box-sizing: border-box;
        }

        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .glass-header {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
      `}</style>

      <StudentLayout>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          {/* Fixed Header with Breadcrumbs and Filters - Always visible */}
          <motion.div 
            className="flex-shrink-0 border-b bg-white/80 dark:bg-gray-900/80 glass-header sticky top-0 z-10 border-gray-200 dark:border-gray-800"
            initial="hidden"
            animate="visible"
            variants={headerVariants}
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
              {/* Breadcrumbs */}
              <motion.div 
                className="mb-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Breadcrumbs />
              </motion.div>
              
              {/* Header with title and stats */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                      {isStudent ? 'My Enrolled Courses' : 'Course Management'}
                    </h1>
                    {isDummyStudent && (
                      <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full animate-pulse">
                        STUDENT VIEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {isStudent ? 'Continue your learning journey' : 'Manage and organize course resources'}
                    {isDummyStudent && originalRoleInfo && (
                      <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                        (Temporary view - Switch back to {originalRoleInfo.renameRole})
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                    <BookOpen className="w-3 h-3" />
                    <span>{allCourses.length} {isStudent ? 'enrolled courses' : 'courses assigned'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                    <Users className="w-3 h-3" />
                    <span>
                      {isDummyStudent ? 'Student (View Mode)' : isStudent ? 'Student' : originalRoleInfo?.renameRole || 'Staff/Admin'}
                    </span>
                  </div>
                  
                 
                </div>
              </div>

              {/* Filters Section - Modified for role-based display */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between"
                variants={filterVariants}
              >
                {/* Search Bar - Always visible for all users */}
                <motion.div 
                  className="relative flex-1 max-w-md"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder={isStudent ? "Search your enrolled courses..." : "Search courses by name..."}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </motion.div>

                {/* Filter Controls - Only show for non-student users */}
                {!isStudent && (
                  <motion.div 
                    className="flex flex-wrap gap-2 items-center"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <select 
                      className="text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-[130px]"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    
                    <motion.div 
                      className="text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50"
                      key={filteredCourses.length}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 150 }}
                    >
                      {showCourseLoading ? 'Loading...' : `${filteredCourses.length} ${filteredCourses.length === 1 ? 'course' : 'courses'}`}
                      {hasNextPage && !showCourseLoading && ' + more'}
                    </motion.div>
                  </motion.div>
                )}
                
                {/* For student users, show the course count in a different position or adjust layout */}
                {isStudent && (
                  <motion.div 
                    className="text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50 self-end sm:self-center"
                    key={filteredCourses.length}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 150 }}
                  >
                    {showCourseLoading ? 'Loading...' : `${filteredCourses.length} ${filteredCourses.length === 1 ? 'enrolled course' : 'enrolled courses'}`}
                    {hasNextPage && !showCourseLoading && ' + more'}
                  </motion.div>
                )}
              </motion.div>
            </div>
          </motion.div>

          {/* Scrollable Course Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
              <AnimatePresence mode="wait">
                {showCourseLoading ? (
                  // Loading state
                  <motion.div 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    key="loading"
                  >
                    {/* Loading skeleton cards */}
                    {Array.from({ length: 8 }).map((_, index) => (
                      <motion.div 
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden course-card"
                        variants={cardVariants}
                        transition={{ delay: index * 0.1 }}
                      >
                        {/* Skeleton Image */}
                        <div className="relative h-28 overflow-hidden bg-gray-200 dark:bg-gray-700">
                          <div className="absolute inset-0 animate-shimmer" />
                        </div>

                        {/* Skeleton Content */}
                        <div className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                            <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                          </div>
                          
                          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1.5 animate-pulse"></div>
                          <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2.5 animate-pulse"></div>
                          
                          <div className="flex items-center justify-between text-[10px] mb-2.5">
                            <div className="flex items-center gap-0.5">
                              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            </div>
                          </div>
                          
                          <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : isError ? (
                  // Error state
                  <motion.div 
                    className="text-center py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    key="error"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
                    >
                      <BookOpen className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                    </motion.div>
                    <h3 className="mt-3 text-base font-medium text-gray-900 dark:text-white">
                      Error loading courses
                    </h3>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {error?.message || 'Something went wrong'}
                    </p>
                    <div className="flex gap-2 justify-center mt-3">
                      <motion.button 
                        onClick={handleRetry}
                        className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-3 py-1.5 rounded-lg transition-all duration-200 shadow-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Try Again
                      </motion.button>
                    </div>
                  </motion.div>
                ) : filteredCourses.length === 0 && !userId ? (
                  // No user ID found state
                  <motion.div 
                    className="text-center py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    key="no-user"
                  >
                    <BookOpen className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-3 text-base font-medium text-gray-900 dark:text-white">
                      User not identified
                    </h3>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Please log in to view your enrolled courses
                    </p>
                    <motion.button 
                      onClick={() => router.push('/login')}
                      className="mt-3 text-xs bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-3 py-1.5 rounded-lg transition-all duration-200 shadow-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Go to Login
                    </motion.button>
                  </motion.div>
                ) : filteredCourses.length === 0 ? (
                  // No enrolled courses state
                  <motion.div 
                    className="text-center py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    key="empty"
                  >
                    <BookOpen className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-3 text-base font-medium text-gray-900 dark:text-white">
                      No {isStudent ? 'enrolled' : 'assigned'} courses found
                    </h3>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {isStudent 
                        ? 'You are not enrolled in any courses yet.'
                        : 'You are not assigned to any courses yet.'
                      }
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      Please contact your administrator {isStudent ? 'for enrollment' : 'for course assignments'}.
                    </p>
                    <div className="flex gap-2 justify-center mt-3">
                      <motion.button 
                        onClick={() => router.push('/lms')}
                        className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white px-3 py-1.5 rounded-lg transition-all duration-200 shadow-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Go to Dashboard
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  // Course cards grid - UPDATED BUTTON TEXT BASED ON ROLE
                  <>
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      key="courses"
                    >
                      {filteredCourses.map((course: Course, index: number) => (
                        <motion.div 
                          key={course._id} 
                          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg dark:hover:shadow-xl/30 transition-all duration-300 overflow-hidden group cursor-pointer course-card"
                          variants={cardVariants}
                          whileHover={{ 
                            y: -4, 
                            scale: 1.02,
                            boxShadow: "0 8px 25px rgba(59, 130, 246, 0.15)",
                            transition: { type: "spring", stiffness: 300, damping: 20 }
                          }}
                          whileTap={{ scale: 0.98 }}
                          layoutId={`course-${course._id}`}
                          onClick={() => handleStartCourse(course._id)}
                        >
                          {/* Course Image with blue overlay on hover */}
                          <div className="relative h-28 overflow-hidden">
                            <img
                              src={course.courseImage || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=150&fit=crop&auto=format"}
                              alt={course.courseName}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=150&fit=crop&auto=format";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute top-1.5 left-1.5">
                              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                                course.courseLevel === 'Beginner' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' :
                                course.courseLevel === 'Intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
                                'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                              }`}>
                                {course.courseLevel}
                              </span>
                            </div>
                            <div className="absolute top-1.5 right-1.5">
                              <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 bg-white/95 dark:bg-gray-900/95 px-1.5 py-0.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                                {course.courseDuration} {parseInt(course.courseDuration) === 1 ? 'week' : 'weeks'}
                              </span>
                            </div>
                            {/* Blue gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>

                          {/* Course Content */}
                          <div className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-800">
                                {course.serviceType}
                              </span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {new Date(course.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1.5 min-h-[2.25rem] group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-200">
                              {course.courseName}
                            </h3>
                            
                            {/* FIXED: Changed from <p> to <div> to avoid nesting block elements */}
                            <div className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2 mb-2.5 leading-relaxed">
                              <RichTextDisplay
                                content={course.courseDescription}
                                className="min-h-0 text-xs leading-relaxed"
                              />
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-2.5">
                              <div className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{course.courseDuration} {parseInt(course.courseDuration) === 1 ? 'week' : 'weeks'}</span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <BookOpen className="w-2.5 h-2.5" />
                                <span>{course.courseLevel}</span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" />
                                <span>{course.clientName}</span>
                              </div>
                            </div>
                            
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click event
                                handleStartCourse(course._id);
                              }}
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 group/btn shadow-sm hover:shadow-md"
                              whileHover={{ 
                                scale: 1.02,
                                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)"
                              }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Play className="w-3 h-3" />
                              <span>{isStudent ? 'Start Course' : 'Manage Resources'}</span>
                              <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Loading indicator for infinite scroll */}
                    {isFetchingNextPage && (
                      <motion.div 
                        className="flex justify-center py-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading more courses...
                        </div>
                      </motion.div>
                    )}

                    {/* End of results message */}
                    {!hasNextPage && filteredCourses.length > 0 && (
                      <motion.div 
                        className="text-center py-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg border border-blue-100 dark:border-blue-800">
                          <BookOpen className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            You've viewed all {isStudent ? 'your enrolled courses' : 'assigned courses'} ({filteredCourses.length})
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </StudentLayout>
    </>
  );
}