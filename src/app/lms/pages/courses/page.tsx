"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Clock, Users, Play, ChevronRight, Search, Loader2, Target, DollarSign as Collaboration, Rocket, Sparkles, AlertCircle } from 'lucide-react';
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from 'framer-motion';
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

const Breadcrumbs = () => {
  const router = useRouter();
  
  return (
    <div className="flex items-center gap-1 text-xs mb-3 px-1 text-black">
      <div
        className="flex items-center gap-1 px-2 py-1 text-black hover:text-gray-700 cursor-pointer rounded hover:bg-gray-100 transition-colors"
        onClick={() => router.push('/lms/pages/admindashboard')}
      >
        <BookOpen className="w-3 h-3" />
        <span className="text-xs">Home</span>
      </div>
      <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />
      <div className="flex items-center gap-1 px-2 py-1 text-black font-medium bg-gray-100 rounded transition-colors">
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
    router.push(`/lms/pages/courses/coursesdetailedview/${courseId}?theme=${currentTheme}`);
  };

  const handleRetry = () => {
    refetch();
  };

 
  const showCourseLoading = isLoading && !data;

  return (
    <>
      <style jsx global>{`
        /* Ultra-thin animated scrollbar with blue theme */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 181, 246, 0.6) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
          height: 2px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 1px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #64B5F6, #1976D2);
          border-radius: 1px;
          box-shadow: 0 0 4px rgba(100, 181, 246, 0.3);
          transition: all 0.3s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #42A5F5, #1565C0);
          box-shadow: 0 0 8px rgba(100, 181, 246, 0.6);
          width: 3px;
        }

        /* Smooth scroll behavior */
        .custom-scrollbar {
          scroll-behavior: smooth;
        }

        /* Custom scrollbar animation */
        @keyframes scrollGlow {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          animation: scrollGlow 2s ease-in-out infinite;
        }

        /* Shimmer animation for loading */
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

        /* Fix for animation performance */
        .course-card {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }

        /* Ensure smooth animations */
        * {
          box-sizing: border-box;
        }

        /* Line clamp utility */
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
      `}</style>

      <StudentLayout>
        <div className="min-h-screen bg-gray-50/30 dark:bg-gray-900/30 flex flex-col">
          {/* Fixed Header with Breadcrumbs and Filters - Always visible */}
          <motion.div 
            className="flex-shrink-0 border-b bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10 border-gray-200 dark:border-gray-700"
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
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Enrolled Courses</h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Explore and continue your learning journey
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                    <BookOpen className="w-3 h-3" />
                    <span>{allCourses.length} enrolled courses</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                    <Clock className="w-3 h-3" />
                    <span>Self-paced</span>
                  </div>
                </div>
              </div>

              {/* Filters Section */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between"
                variants={filterVariants}
              >
                {/* Search Bar */}
                <motion.div 
                  className="relative flex-1 max-w-md"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search courses by name..."
                    className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </motion.div>

                {/* Filter Controls - Only Category filter */}
                <motion.div 
                  className="flex flex-wrap gap-2 items-center"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <select 
                    className="text-xs px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-w-[130px]"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  
                  <motion.div 
                    className="text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800"
                    key={filteredCourses.length}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 150 }}
                  >
                    {showCourseLoading ? 'Loading...' : `${filteredCourses.length} ${filteredCourses.length === 1 ? 'course' : 'courses'}`}
                    {hasNextPage && !showCourseLoading && ' + more'}
                  </motion.div>

               
                </motion.div>
              </motion.div>

            
            </div>
          </motion.div>

          {/* Scrollable Course Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
              <AnimatePresence mode="wait">
                {showCourseLoading ? (
                  // Loading state for course cards only
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
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
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
                  // Error state for course cards only
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
                        className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-lg transition-all duration-200"
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
                      className="mt-3 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-lg transition-all duration-200"
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
                      No enrolled courses found
                    </h3>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      You are not enrolled in any courses yet.
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      Please contact your administrator for enrollment.
                    </p>
                    <div className="flex gap-2 justify-center mt-3">
                      <motion.button 
                        onClick={() => router.push('/lms')}
                        className="text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Go to Dashboard
                      </motion.button>
                     
                    </div>
                  </motion.div>
                ) : (
                  // Course cards grid
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
                          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg dark:hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer course-card"
                          variants={cardVariants}
                          whileHover={{ 
                            y: -4, 
                            scale: 1.02,
                            boxShadow: "0 8px 25px rgba(100, 181, 246, 0.15)",
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
                                course.courseLevel === 'Beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                course.courseLevel === 'Intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}>
                                {course.courseLevel}
                              </span>
                            </div>
                            <div className="absolute top-1.5 right-1.5">
                              <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 bg-white/95 dark:bg-gray-900/95 px-1.5 py-0.5 rounded-full shadow-sm">
                                {course.courseDuration} {parseInt(course.courseDuration) === 1 ? 'week' : 'weeks'}
                              </span>
                            </div>
                            {/* Blue gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>

                          {/* Course Content */}
                          <div className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
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
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 group/btn shadow-sm hover:shadow-md"
                              whileHover={{ 
                                scale: 1.02,
                                boxShadow: "0 4px 12px rgba(100, 181, 246, 0.4)"
                              }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Play className="w-3 h-3" />
                              <span>Start Course</span>
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
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                          <BookOpen className="w-4 h-4 text-blue-500" />
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            You've viewed all your enrolled courses ({filteredCourses.length})
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