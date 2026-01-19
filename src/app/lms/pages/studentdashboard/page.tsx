'use client';
import React, { useEffect, useState, useMemo } from 'react';
import {
    BookOpen,
    TrendingUp,
    Activity,
    FolderTree,
    Folder,
    FolderOpen,
    File,
    FileText as FileTextIcon,
    CheckCircle,
    LineChart,
    Eye,
    ClipboardCheck,
    FileText,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Bell,
    ChevronRight,
    Award,
    Clock,
    Zap,
    BarChart3,
    Users,
    Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentLayout } from '../../component/student/student-layout';
import { getCurrentUser } from '@/apiServices/tokenVerify';
import { getStudentDashboardAnalytics, getUserSpecificAnalytics } from '@/apiServices/studentAnalytics';
import { useRouter } from 'next/navigation';

// --- INTERFACES (UNCHANGED) ---
interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
    relatedEntity: string;
    relatedEntityId: { $oid: string };
    isRead: boolean;
    metadata: any;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
}

interface UserCourseProgress {
    courseId: string;
    answers: {
        I_Do: Record<string, any>;
        We_Do: {
            practical?: Array<{
                exerciseId: string;
                questions: Array<{
                    questionId: string;
                    status: string;
                    score?: number;
                    submittedAt: string;
                }>;
            }>;
        };
        You_Do: Record<string, any>;
    };
    lastAccessed: string;
}

interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    notifications: Notification[];
    courses: UserCourseProgress[];
}

interface ApiUserResponse {
    user: User;
}

interface AnalyticsData {
    courses: any[];
    analytics: {
        totalCourses: number;
        totalModules: number;
        totalSubModules: number;
        totalTopics: number;
        totalSubTopics: number;
        totalParticipants: number;
        totalActiveParticipants: number;
    };
    summary: {
        coursesByLevel: Record<string, number>;
        coursesByService: Record<string, number>;
    };
}

interface UserAnalyticsData {
    userCourses: any[];
    userStats: {
        enrolledCourses: number;
        totalModules: number;
        totalTopics: number;
        activeCourses: number;
        coursesByLevel: Record<string, number>;
        coursesByType: Record<string, number>;
    };
}

// --- MODERN CHART COMPONENTS ---

const MiniAreaChart = ({ data, color = '#6366f1', height = 60 }: { data: number[], color?: string, height?: number }) => {
    const max = Math.max(...data, 1);
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = height - ((val / max) * height);
        return `${x},${y}`;
    }).join(' ');
    
    const areaPoints = `0,${height} ${points} 100,${height}`;

    return (
        <svg width="100%" height={height} className="overflow-visible">
            <defs>
                <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
            </defs>
            <polyline
                points={areaPoints}
                fill={`url(#gradient-${color})`}
                stroke="none"
            />
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

const CircularProgress = ({ 
    percentage, 
    size = 120, 
    strokeWidth = 8,
    color = '#6366f1',
    showLabel = true,
    label = ''
}: { 
    percentage: number, 
    size?: number, 
    strokeWidth?: number,
    color?: string,
    showLabel?: boolean,
    label?: string
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
                {showLabel && label && <span className="text-xs text-gray-500 mt-1">{label}</span>}
            </div>
        </div>
    );
};

const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    trend, 
    color = '#6366f1',
    sparklineData = []
}: { 
    icon: any, 
    label: string, 
    value: string | number, 
    trend?: number,
    color?: string,
    sparklineData?: number[]
}) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-300 hover:border-gray-300">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3 text-green-600" /> : <ArrowDownRight className="w-3 h-3 text-red-600" />}
                        <span className={`text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Math.abs(trend)}%
                        </span>
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
            </div>
            {sparklineData.length > 0 && (
                <div className="mt-4">
                    <MiniAreaChart data={sparklineData} color={color} height={40} />
                </div>
            )}
        </div>
    );
};

const ProgressBar = ({ 
    label, 
    value, 
    max, 
    color = '#6366f1',
    showPercentage = true 
}: { 
    label: string, 
    value: number, 
    max: number,
    color?: string,
    showPercentage?: boolean
}) => {
    const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
    
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-sm font-semibold text-gray-900">
                    {showPercentage ? `${percentage}%` : `${value}/${max}`}
                </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div 
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
};

const CompactCourseCard = ({ 
    course, 
    progress, 
    onClick 
}: { 
    course: any, 
    progress: number,
    onClick: () => void
}) => {
    return (
        <div 
            onClick={onClick}
            className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-5 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:border-indigo-300"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {course.courseName}
                    </h3>
                    <p className="text-xs text-gray-500">{course.level || 'Beginner'}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    <span>{course.modules?.length || 0} Modules</span>
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">Progress</span>
                        <span className="text-xs font-bold text-indigo-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function StudentDashboardPage() {
    const [user, setUser] = useState<ApiUserResponse | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [userAnalytics, setUserAnalytics] = useState<UserAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [userData, analyticsData] = await Promise.all([
                getCurrentUser(),
                getStudentDashboardAnalytics()
            ]);

            setUser(userData);
            setAnalytics(analyticsData);

            const userId = userData.user._id;
            const userAnalyticsData = getUserSpecificAnalytics(analyticsData, userId);
            setUserAnalytics(userAnalyticsData);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCourseFromAnalytics = useMemo(() => {
        return (courseId: string) => {
            if (!analytics?.courses) return null;
            return analytics.courses.find(course => course._id === courseId);
        };
    }, [analytics]);

    const getTotalExercisesForCourse = useMemo(() => {
        return (course: any) => {
            if (!course?.modules) return 0;
            let totalExercises = 0;
            course.modules.forEach((module: any) => {
                if (module.subModules) {
                    module.subModules.forEach((subModule: any) => {
                        if (subModule.topics) {
                            subModule.topics.forEach((topic: any) => {
                                if (topic.pedagogy?.We_Do?.practical) totalExercises += topic.pedagogy.We_Do.practical.length;
                                if (topic.pedagogy?.We_Do?.project_development) totalExercises += topic.pedagogy.We_Do.project_development.length;
                            });
                        }
                    });
                }
            });
            return totalExercises;
        };
    }, []);

    const getTotalQuestionsForCourse = useMemo(() => {
        return (course: any) => {
            if (!course?.modules) return 0;
            let totalQuestions = 0;
            course.modules.forEach((module: any) => {
                if (module.subModules) {
                    module.subModules.forEach((subModule: any) => {
                        if (subModule.topics) {
                            subModule.topics.forEach((topic: any) => {
                                if (topic.pedagogy?.We_Do?.practical) {
                                    topic.pedagogy.We_Do.practical.forEach((exercise: any) => {
                                        if (exercise.questions) totalQuestions += exercise.questions.length;
                                    });
                                }
                                if (topic.pedagogy?.We_Do?.project_development) {
                                    topic.pedagogy.We_Do.project_development.forEach((exercise: any) => {
                                        if (exercise.questions) totalQuestions += exercise.questions.length;
                                    });
                                }
                            });
                        }
                    });
                }
            });
            return totalQuestions;
        };
    }, []);

    const getCourseProgress = useMemo(() => {
        return (courseId: string) => {
            const userCourse = user?.user?.courses?.find(
                uc => uc.courseId === courseId || uc.courseId?.toString() === courseId
            );

            if (!userCourse?.answers?.We_Do?.practical) return 0;

            const practicalExercises = userCourse.answers.We_Do.practical;
            if (practicalExercises.length === 0) return 0;

            let attemptedExercises = 0;
            let attemptedQuestions = 0;

            practicalExercises.forEach(exercise => {
                if (exercise.questions && exercise.questions.length > 0) {
                    attemptedExercises++;
                    const attemptedQs = exercise.questions.filter(q =>
                        q.status === 'attempted' || q.status === 'evaluated' || q.submittedAt
                    ).length;
                    attemptedQuestions += attemptedQs;
                }
            });

            const courseFromAnalytics = getCourseFromAnalytics(courseId);
            if (!courseFromAnalytics) return 0;

            const totalExercises = getTotalExercisesForCourse(courseFromAnalytics);
            const totalQuestions = getTotalQuestionsForCourse(courseFromAnalytics);

            const exerciseProgress = totalExercises > 0 ? (attemptedExercises / totalExercises) * 100 : 0;
            const questionProgress = totalQuestions > 0 ? (attemptedQuestions / totalQuestions) * 100 : 0;

            return Math.round((exerciseProgress * 0.4) + (questionProgress * 0.6));
        };
    }, [user, getCourseFromAnalytics, getTotalExercisesForCourse, getTotalQuestionsForCourse]);

    const getTotalExerciseQuestionStats = useMemo(() => {
        if (!userAnalytics?.userCourses || userAnalytics.userCourses.length === 0) {
            return { totalExercises: 0, totalQuestions: 0 };
        }
        let totalExercises = 0;
        let totalQuestions = 0;
        userAnalytics.userCourses.forEach((course: any) => {
            const courseExercises = getTotalExercisesForCourse(course);
            const courseQuestions = getTotalQuestionsForCourse(course);
            totalExercises += courseExercises;
            totalQuestions += courseQuestions;
        });
        return { totalExercises, totalQuestions };
    }, [userAnalytics, getTotalExercisesForCourse, getTotalQuestionsForCourse]);

    const getUserAttemptedStats = useMemo(() => {
        if (!user?.user?.courses || user.user.courses.length === 0) {
            return { attemptedExercises: 0, attemptedQuestions: 0 };
        }
        let attemptedExercises = 0;
        let attemptedQuestions = 0;
        user.user.courses.forEach((course: UserCourseProgress) => {
            if (course.answers?.We_Do?.practical) {
                const practicalExercises = course.answers.We_Do.practical;
                practicalExercises.forEach(exercise => {
                    if (exercise.questions && exercise.questions.length > 0) {
                        attemptedExercises++;
                        const attemptedQs = exercise.questions.filter(q =>
                            q.status === 'attempted' || q.status === 'evaluated' || q.submittedAt
                        ).length;
                        attemptedQuestions += attemptedQs;
                    }
                });
            }
        });
        return { attemptedExercises, attemptedQuestions };
    }, [user]);

    const calculateExerciseBasedProgress = useMemo(() => {
        const totalStats = getTotalExerciseQuestionStats;
        const attemptedStats = getUserAttemptedStats;
        if (totalStats.totalExercises === 0 || totalStats.totalQuestions === 0) return 0;
        const exerciseProgress = (attemptedStats.attemptedExercises / totalStats.totalExercises) * 100;
        const questionProgress = (attemptedStats.attemptedQuestions / totalStats.totalQuestions) * 100;
        return Math.round((exerciseProgress * 0.4) + (questionProgress * 0.6));
    }, [getTotalExerciseQuestionStats, getUserAttemptedStats]);

    const displayedCourses = useMemo(() => {
        if (userAnalytics?.userCourses && userAnalytics.userCourses.length > 0) {
            return userAnalytics.userCourses.slice(0, 6);
        }
        return [];
    }, [userAnalytics]);

    const notificationsToShow = user?.user?.notifications?.slice(0, 5) || [];

    const handleStartCourse = (courseId: string) => {
        router.push(`/lms/pages/courses/coursesdetailedview/${courseId}`);
    };

    if (loading) {
        return (
            <StudentLayout>
                <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                        <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
                    </div>
                </div>
            </StudentLayout>
        );
    }

    const totalStats = getTotalExerciseQuestionStats;
    const attemptedStats = getUserAttemptedStats;
    const overallProgress = calculateExerciseBasedProgress;

    return (
        <StudentLayout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 p-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Welcome back, {user?.user.firstName}! 👋
                            </h1>
                            <p className="text-gray-600">Here's your learning progress at a glance</p>
                        </div>
                        <Button 
                            onClick={() => router.push('/lms/pages/analytics/detailed')}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Full Analytics
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard 
                        icon={BookOpen}
                        label="Enrolled Courses"
                        value={userAnalytics?.userStats?.enrolledCourses || 0}
                        trend={12}
                        color="#6366f1"
                        sparklineData={[3, 5, 4, 7, 6, 8, 7]}
                    />
                    <StatCard 
                        icon={Target}
                        label="Overall Progress"
                        value={`${overallProgress}%`}
                        trend={8}
                        color="#10b981"
                        sparklineData={[45, 52, 58, 63, 68, 72, overallProgress]}
                    />
                    <StatCard 
                        icon={CheckCircle}
                        label="Exercises Done"
                        value={`${attemptedStats.attemptedExercises}/${totalStats.totalExercises}`}
                        trend={15}
                        color="#f59e0b"
                        sparklineData={[10, 15, 22, 28, 35, 40, attemptedStats.attemptedExercises]}
                    />
                    <StatCard 
                        icon={Award}
                        label="Questions Solved"
                        value={`${attemptedStats.attemptedQuestions}/${totalStats.totalQuestions}`}
                        trend={10}
                        color="#8b5cf6"
                        sparklineData={[25, 40, 55, 70, 85, 95, attemptedStats.attemptedQuestions]}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Progress Overview */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Learning Progress Overview</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Circular Progress */}
                            <div className="flex flex-col items-center justify-center">
                                <CircularProgress 
                                    percentage={overallProgress}
                                    size={160}
                                    strokeWidth={12}
                                    color="#6366f1"
                                    showLabel={true}
                                    label="Complete"
                                />
                                <p className="mt-4 text-sm font-medium text-gray-600">Overall Course Progress</p>
                            </div>

                            {/* Progress Bars */}
                            <div className="space-y-6">
                                <ProgressBar 
                                    label="Modules"
                                    value={userAnalytics?.userStats?.totalModules || 0}
                                    max={analytics?.analytics?.totalModules || 1}
                                    color="#6366f1"
                                />
                                <ProgressBar 
                                    label="Topics"
                                    value={userAnalytics?.userStats?.totalTopics || 0}
                                    max={analytics?.analytics?.totalTopics || 1}
                                    color="#10b981"
                                />
                                <ProgressBar 
                                    label="Exercises"
                                    value={attemptedStats.attemptedExercises}
                                    max={totalStats.totalExercises || 1}
                                    color="#f59e0b"
                                />
                                <ProgressBar 
                                    label="Questions"
                                    value={attemptedStats.attemptedQuestions}
                                    max={totalStats.totalQuestions || 1}
                                    color="#8b5cf6"
                                />
                            </div>
                        </div>

                        {/* Learning Hierarchy */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Learning Structure</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[
                                    { icon: BookOpen, label: 'Courses', value: userAnalytics?.userStats?.enrolledCourses || 0, color: '#6366f1' },
                                    { icon: Folder, label: 'Modules', value: userAnalytics?.userStats?.totalModules || 0, color: '#10b981' },
                                    { icon: FolderOpen, label: 'Sub-Modules', value: analytics?.analytics?.totalSubModules || 0, color: '#f59e0b' },
                                    { icon: FileTextIcon, label: 'Topics', value: userAnalytics?.userStats?.totalTopics || 0, color: '#8b5cf6' },
                                    { icon: File, label: 'Sub-Topics', value: analytics?.analytics?.totalSubTopics || 0, color: '#ec4899' },
                                ].map((item, idx) => (
                                    <div key={idx} className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="inline-flex p-2 rounded-lg mb-2" style={{ backgroundColor: `${item.color}15` }}>
                                            <item.icon className="w-5 h-5" style={{ color: item.color }} />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">{item.value}</p>
                                        <p className="text-xs text-gray-600 mt-1">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                                {notificationsToShow.filter(n => !n.isRead).length} New
                            </Badge>
                        </div>

                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {notificationsToShow.length > 0 ? (
                                notificationsToShow.map((notification) => (
                                    <div 
                                        key={notification._id}
                                        className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer ${
                                            !notification.isRead 
                                                ? 'bg-indigo-50 border-indigo-200' 
                                                : 'bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${
                                                !notification.isRead ? 'bg-indigo-200' : 'bg-gray-200'
                                            }`}>
                                                <Bell className={`w-4 h-4 ${
                                                    !notification.isRead ? 'text-indigo-700' : 'text-gray-600'
                                                }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 mb-1">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-600 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(notification.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">No notifications yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Active Courses */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Your Active Courses</h2>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push('/lms/pages/courses')}
                            className="text-indigo-600 hover:text-indigo-700"
                        >
                            View All
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>

                    {displayedCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayedCourses.map((course: any) => {
                                const progress = getCourseProgress(course._id);
                                return (
                                    <CompactCourseCard
                                        key={course._id}
                                        course={course}
                                        progress={progress}
                                        onClick={() => handleStartCourse(course._id)}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
                            <p className="text-gray-600 mb-6">Start your learning journey by enrolling in a course</p>
                            <Button 
                                onClick={() => router.push('/lms/pages/courses')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Browse Courses
                            </Button>
                        </div>
                    )}
                </div>

                {/* Quick Stats Footer */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <Zap className="w-6 h-6 opacity-80" />
                            <span className="text-2xl font-bold">{userAnalytics?.userStats?.activeCourses || 0}</span>
                        </div>
                        <p className="text-sm font-medium opacity-90">Active Courses</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <Activity className="w-6 h-6 opacity-80" />
                            <span className="text-2xl font-bold">{overallProgress}%</span>
                        </div>
                        <p className="text-sm font-medium opacity-90">Avg. Progress</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <Target className="w-6 h-6 opacity-80" />
                            <span className="text-2xl font-bold">{attemptedStats.attemptedExercises}</span>
                        </div>
                        <p className="text-sm font-medium opacity-90">Completed Tasks</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <Calendar className="w-6 h-6 opacity-80" />
                            <span className="text-2xl font-bold">7</span>
                        </div>
                        <p className="text-sm font-medium opacity-90">Day Streak</p>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
}