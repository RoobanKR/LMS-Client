"use client"
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BookOpen, Clock, Users, Play, ChevronRight, Search, Loader2 } from 'lucide-react'
import { StudentLayout } from '../../component/student-layout'
import { useRouter } from "next/navigation";
import Breadcrumbs from '../../component/brudcrums';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useCoursesInfiniteQuery, 
  useFilteredCourses, 
  getAuthToken,
  Course 
} from '../.../../../../../apiServices/studentcoursepage';

// Get categories from service types dynamically or use a fixed list
const defaultCategories = ["All", "Web Development", "Data Science", "Mobile Development", "Design", "Cloud Computing", "Marketing", "Security"];

const levels = ["All", "Beginner", "Intermediate", "Advanced"];

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
      type: "spring",
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
      type: "spring",
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
      type: "spring",
      stiffness: 100,
      damping: 20
    }
  }
};

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const router = useRouter();

  // Get auth token on component mount
  useEffect(() => {
    const token = getAuthToken();
    setAuthToken(token);
    
    // Detect current theme
    const isDark = document.documentElement.classList.contains('dark');
    setCurrentTheme(isDark ? 'dark' : 'light');
  }, []);

  // Filters object for query key - simplified to only search and category
  const filters = {
    searchTerm,
    selectedCategory,
  };

  // Use React Query infinite query hook for fetching courses
  const { 
    data, 
    isLoading, 
    error, 
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch 
  } = useCoursesInfiniteQuery(authToken, filters);

  // Flatten all courses from all pages with useMemo to prevent unnecessary re-renders
  const allCourses = useMemo(() => 
    data?.pages.flatMap(page => page.data) || [], 
    [data]
  );

  // Extract unique service types for categories from loaded courses - FIXED
  const uniqueServiceTypes = useMemo(() => {
    if (allCourses.length === 0) return [];
    
    const types = Array.from(
      new Set(allCourses.map(course => course.serviceType).filter(Boolean))
    );
    return types;
  }, [allCourses]);

  // Update categories only when uniqueServiceTypes actually changes
  useEffect(() => {
    if (uniqueServiceTypes.length > 0) {
      setCategories(["All", ...uniqueServiceTypes]);
    } else {
      setCategories(defaultCategories);
    }
  }, [uniqueServiceTypes]); // Only depend on uniqueServiceTypes

  // Use filtered courses hook - simplified filtering
  const filteredCourses = useFilteredCourses(allCourses, filters);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (isFetchingNextPage || !hasNextPage || isLoading) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;

    // Load more when user is 300px from bottom
    if (scrollTop + clientHeight >= scrollHeight - 300) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage, isLoading]);

  // Add scroll event listener with proper cleanup
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const handleStartCourse = (courseId: string) => {
    // Pass both courseId and theme as query parameters
    router.push(`/student/pages/coursesdetailedview/${courseId}?theme=${currentTheme}`);
  };

  const handleRetry = () => {
    refetch();
  };

  // Show loading only for course cards section, keep header static
  const showCourseLoading = isLoading && !data;

  return (
    <>
      <style jsx global>{`
        /* Ultra-thin animated scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(37, 99, 235, 0.6) transparent;
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
          background: linear-gradient(45deg, #2563eb, #3b82f6);
          border-radius: 1px;
          box-shadow: 0 0 4px rgba(37, 99, 235, 0.3);
          transition: all 0.3s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #1d4ed8, #2563eb);
          box-shadow: 0 0 8px rgba(37, 99, 235, 0.6);
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
                    <motion.button 
                      onClick={handleRetry}
                      className="mt-3 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Try Again
                    </motion.button>
                  </motion.div>
                ) : filteredCourses.length === 0 ? (
                  // No courses found state
                  <motion.div 
                    className="text-center py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    key="empty"
                  >
                    <BookOpen className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-3 text-base font-medium text-gray-900 dark:text-white">
                      No courses found
                    </h3>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Try adjusting your search terms or filters
                    </p>
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
                          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg dark:hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer course-card"
                          variants={cardVariants}
                          whileHover={{ 
                            y: -4, 
                            scale: 1.02,
                            transition: { type: "spring", stiffness: 300, damping: 20 }
                          }}
                          whileTap={{ scale: 0.98 }}
                          layoutId={`course-${course._id}`}
                          onClick={() => handleStartCourse(course._id)}
                        >
                          {/* Course Image */}
                          <div className="relative h-28 overflow-hidden">
                            <img
                              src={course.courseImage || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=150&fit=crop&auto=format"}
                              alt={course.courseName}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=150&fit=crop&auto=format";
                              }}
                            />
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
                              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 bg-white/95 dark:bg-gray-900/95 px-1.5 py-0.5 rounded-full shadow-sm">
                                {course.courseDuration} {parseInt(course.courseDuration) === 1 ? 'week' : 'weeks'}
                              </span>
                            </div>
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
                            
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1.5 min-h-[2.25rem]">
                              {course.courseName}
                            </h3>
                            
                            <p className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2 mb-2.5 leading-relaxed">
                              {course.courseDescription || "No description available"}
                            </p>
                            
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
                              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 group/btn"
                              whileHover={{ 
                                scale: 1.02,
                                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
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
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          You've reached the end of the course list
                        </p>
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
  )
}