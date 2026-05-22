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
import DashboardLayout from '../../component/layout';
import { StaffLayout } from '../../component/stafflayout/staff-layout';

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

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const circleCardVariants = {
    hidden: {
        opacity: 0,
        scale: 0.8,
        rotate: -5
    },
    visible: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 15,
            duration: 0.5
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

// Helper function to determine if user is admin
const isAdminUser = (): boolean => {
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
        const storedRoleValue = localStorage.getItem("smartcliff_roleValue") || '';

        userRole = userRole || storedRoleValue;

        // Check if role contains 'admin' (case-insensitive)
        return userRole.toLowerCase().includes('admin');
    } catch (error) {
        console.error("Error checking admin role:", error);
        return false;
    }
};

// Helper function to get institution ID
const getInstitutionId = (): string | null => {
    try {
        return localStorage.getItem("smartcliff_institution");
    } catch (error) {
        console.error("Error getting institution ID:", error);
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
                <span className="text-xs">Grades</span>
            </div>
        </div>
    );
};

export default function GradePage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [institutionId, setInstitutionId] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>(defaultCategories);
    const [isStudent, setIsStudent] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState<boolean>(false);
    const [coursesError, setCoursesError] = useState<string | null>(null);
    const router = useRouter();

    // Get user role from localStorage on component mount
    useEffect(() => {
        const role = localStorage.getItem('smartcliff_roleValue');
        setUserRole(role);
        setInstitutionId(getInstitutionId());
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = getAuthToken();
                setAuthToken(token);
                let currentUserId = getCurrentUserIdFromAuth();
                setUserId(currentUserId);
                setInstitutionId(getInstitutionId());

                // Check user roles
                const studentCheck = isStudentUser();
                const adminCheck = isAdminUser();
                
                setIsStudent(studentCheck);
                setIsAdmin(adminCheck);
                
                console.log("Role check:", {
                    isStudent: studentCheck,
                    isAdmin: adminCheck,
                    userId: currentUserId,
                    institutionId: getInstitutionId()
                });

                // Listen for storage changes (role switches)
                const handleStorageChange = () => {
                    const newRole = localStorage.getItem('smartcliff_roleValue');
                    setUserRole(newRole);
                    setInstitutionId(getInstitutionId());
                    
                    // Re-check roles
                    const newStudentCheck = isStudentUser();
                    const newAdminCheck = isAdminUser();
                    setIsStudent(newStudentCheck);
                    setIsAdmin(newAdminCheck);
                };

                window.addEventListener('storage', handleStorageChange);

                return () => {
                    window.removeEventListener('storage', handleStorageChange);
                };
            } catch (error) {
                console.error('Error in fetchUserData:', error);
            }
        };

        fetchUserData();
    }, []);

    // For admin, fetch all institution courses directly from API
    useEffect(() => {
        const fetchAllInstitutionCourses = async () => {
            if (!isAdmin || !authToken || !institutionId) return;
            
            setIsLoadingCourses(true);
            setCoursesError(null);
            
            try {
                const response = await fetch('http://localhost:5533/courses-structure/getAll', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                
                const result = await response.json();
                
                if (result.message?.[0]?.key === 'success') {
                    // Filter courses by institution ID to be safe
                    const institutionCourses = result.data.filter(
                        (course: any) => course.institution === institutionId
                    );
                    setAllCourses(institutionCourses);
                    console.log("Admin courses loaded:", institutionCourses.length);
                } else {
                    setCoursesError('Failed to load courses');
                }
            } catch (error) {
                console.error('Error fetching all courses:', error);
                setCoursesError('Error loading courses');
            } finally {
                setIsLoadingCourses(false);
            }
        };

        fetchAllInstitutionCourses();
    }, [isAdmin, authToken, institutionId]);

    // For non-admin users, use the existing query hook
    const filters = {
        searchTerm,
        selectedCategory,
    };

    const {
        data: userCoursesData,
        isLoading: userCoursesLoading,
        error: userCoursesError,
        isError: userCoursesIsError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch
    } = useCoursesInfiniteQuery(
        !isAdmin ? authToken : null, 
        !isAdmin ? userId : null, 
        !isAdmin ? filters : { searchTerm: '', selectedCategory: 'All' }
    );

    // Determine which courses to display based on role
    const displayedCourses = useMemo(() => {
        if (isAdmin) {
            return allCourses;
        } else {
            return userCoursesData?.pages.flatMap(page => page.data) || [];
        }
    }, [isAdmin, allCourses, userCoursesData]);

    const uniqueServiceTypes = useMemo(() => {
        if (displayedCourses.length === 0) return [];

        const types = Array.from(
            new Set(displayedCourses.map(course => course.serviceType).filter(Boolean))
        );
        return types;
    }, [displayedCourses]);

    useEffect(() => {
        if (uniqueServiceTypes.length > 0) {
            setCategories(["All", ...uniqueServiceTypes]);
        } else {
            setCategories(defaultCategories);
        }
    }, [uniqueServiceTypes]);

    const filteredCourses = useFilteredCourses(displayedCourses, filters);

    const handleScroll = useCallback(() => {
        if (isAdmin) return; // No infinite scroll for admin since we load all at once
        
        if (isFetchingNextPage || !hasNextPage || userCoursesLoading) return;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;

        if (scrollTop + clientHeight >= scrollHeight - 300) {
            fetchNextPage();
        }
    }, [isAdmin, isFetchingNextPage, hasNextPage, userCoursesLoading, fetchNextPage]);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const handleStartCourse = (courseId: string) => {
        console.log("Role-based navigation check - isStudent:", isStudent, "isAdmin:", isAdmin);
        router.push(`/lms/pages/grades/${courseId}`);
    };

    const handleRetry = () => {
        if (isAdmin) {
            // Refetch admin courses
            const fetchAllInstitutionCourses = async () => {
                if (!authToken || !institutionId) return;
                
                setIsLoadingCourses(true);
                setCoursesError(null);
                
                try {
                    const response = await fetch('http://localhost:5533/courses-structure/getAll', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json',
                        },
                    });
                    
                    const result = await response.json();
                    
                    if (result.message?.[0]?.key === 'success') {
                        const institutionCourses = result.data.filter(
                            (course: any) => course.institution === institutionId
                        );
                        setAllCourses(institutionCourses);
                    } else {
                        setCoursesError('Failed to load courses');
                    }
                } catch (error) {
                    console.error('Error fetching all courses:', error);
                    setCoursesError('Error loading courses');
                } finally {
                    setIsLoadingCourses(false);
                }
            };
            
            fetchAllInstitutionCourses();
        } else {
            refetch();
        }
    };

    const showCourseLoading = isAdmin ? isLoadingCourses : (userCoursesLoading && !userCoursesData);
    const hasError = isAdmin ? !!coursesError : userCoursesIsError;
    const errorMessage = isAdmin ? coursesError : (userCoursesError as any)?.message;

    // Determine what to display based on role and courses
    const getDisplayMessage = () => {
        if (isAdmin) {
            return {
                title: 'All Institution Courses',
                description: 'View grades for all courses in your institution',
                emptyMessage: 'No courses found in the institution',
                emptySubMessage: 'Add courses to get started'
            };
        } else if (isStudent) {
            return {
                title: 'My Enrolled Courses',
                description: 'Select a course to view your grades',
                emptyMessage: 'No enrolled courses found',
                emptySubMessage: 'You are not enrolled in any courses yet. Contact your administrator.'
            };
        } else {
            return {
                title: 'My Assigned Courses',
                description: 'Select a course to manage grades',
                emptyMessage: 'No assigned courses found',
                emptySubMessage: 'You are not assigned to any courses yet.'
            };
        }
    };

    const displayInfo = getDisplayMessage();

    // Page content
    const pageContent = (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            <style jsx global>{`
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

                .course-circle-card {
                    transform: translateZ(0);
                    backface-visibility: hidden;
                    perspective: 1000px;
                }

                * {
                    box-sizing: border-box;
                }

                .glass-header {
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }

                /* Circle card specific styles */
                .circle-image {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: 3px solid white;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }

                .dark .circle-image {
                    border: 3px solid #1f2937;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                }
            `}</style>

            {/* Fixed Header with Breadcrumbs and Filters */}
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
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{displayInfo.title}</h1>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {displayInfo.description}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                <BookOpen className="w-3 h-3" />
                                <span>{displayedCourses.length} {isAdmin ? 'institution courses' : isStudent ? 'enrolled courses' : 'assigned courses'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                <Users className="w-3 h-3" />
                                <span>{isAdmin ? 'Admin' : isStudent ? 'Student' : 'Staff'}</span>
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
                                className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </motion.div>

                        {/* Filter Controls */}
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
                                {!isAdmin && hasNextPage && !showCourseLoading && ' + more'}
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
                            // Loading state with circle skeletons
                            <motion.div
                                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                key="loading"
                            >
                                {Array.from({ length: 12 }).map((_, index) => (
                                    <motion.div
                                        key={index}
                                        className="flex flex-col items-center"
                                        variants={circleCardVariants}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse mb-2 overflow-hidden">
                                            <div className="absolute inset-0 animate-shimmer" />
                                        </div>
                                        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                                        <div className="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : hasError ? (
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
                                    {errorMessage || 'Something went wrong'}
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
                        ) : filteredCourses.length === 0 && !userId && !isAdmin ? (
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
                                    Please log in to view courses
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
                                    {displayInfo.emptyMessage}
                                </h3>
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                    {displayInfo.emptySubMessage}
                                </p>
                                {!isAdmin && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                        Please contact your administrator for access.
                                    </p>
                                )}
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
                            // Circle course cards grid
                            <>
                                <motion.div
                                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    key="courses"
                                >
                                    {filteredCourses.map((course: Course, index: number) => (
                                        <motion.div
                                            key={course._id}
                                            className="flex flex-col items-center course-circle-card cursor-pointer group"
                                            variants={circleCardVariants}
                                            whileHover={{
                                                scale: 1.1,
                                                transition: { type: "spring", stiffness: 300, damping: 20 }
                                            }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleStartCourse(course._id)}
                                        >
                                            {/* Circle Image Container */}
                                            <div className="relative w-24 h-24 mb-3">
                                                <div className="w-full h-full rounded-full circle-image overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg group-hover:shadow-xl transition-all duration-300">
                                                    <img
                                                        src={course.courseImage || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200&h=200&fit=crop&auto=format"}
                                                        alt={course.courseName}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.currentTarget.src = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200&h=200&fit=crop&auto=format";
                                                        }}
                                                    />
                                                </div>
                                                
                                                {/* Badge for course level */}
                                                <div className="absolute -top-1 -right-1">
                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${course.courseLevel === 'Beginner' ? 'bg-green-500 text-white' :
                                                            course.courseLevel === 'Intermediate' ? 'bg-yellow-500 text-white' :
                                                            'bg-red-500 text-white'
                                                        }`}>
                                                        {course.courseLevel.charAt(0)}
                                                    </span>
                                                </div>
                                                
                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 rounded-full bg-blue-600/0 group-hover:bg-blue-600/20 transition-all duration-300 flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <div className="bg-blue-600 text-white rounded-full p-1.5">
                                                            <ChevronRight className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Course Title */}
                                            <div className="text-center">
                                                <h3 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                                    {course.courseName}
                                                </h3>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                    {course.serviceType}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>

                                {/* Loading indicator for infinite scroll (non-admin only) */}
                                {!isAdmin && isFetchingNextPage && (
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

                                {/* End of results message (non-admin only) */}
                                {!isAdmin && !hasNextPage && filteredCourses.length > 0 && (
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
    );

    // Show loading state while determining role
    if (userRole === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    // Conditionally wrap with appropriate layout based on user role
    if (userRole === 'admin') {
        return <DashboardLayout>{pageContent}</DashboardLayout>;
    } else {
        // All other roles (programcoordinator, faculty, etc.) get StaffLayout
        return <StaffLayout>{pageContent}</StaffLayout>;
    }
}