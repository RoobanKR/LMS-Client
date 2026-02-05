// staff-dashboard.tsx
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import {
    Users,
    BookOpen,
    TrendingUp,
    Activity,
    Award,
    Target,
    CheckCircle,
    Clock,
    BarChart3,
    ChevronRight,
    Eye,
    Download,
    Filter,
    Search,
    Calendar,
    UserCheck,
    Users as UsersIcon,
    Percent,
    FileText,
    FolderTree,
    LineChart,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStaffStudentAnalytics, getStudentCourseProgress } from '@/apiServices/staffAnalytics';
import { getCurrentUser } from '@/apiServices/tokenVerify';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { StudentLayout } from '../../component/student/student-layout';

// Type Definitions
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: string;
  role?: string;
}

interface ProgressDetail {
  completed: number;
  total: number;
  percentage: number;
  questionProgress?: number;
}

interface StudentProgress {
  overall: number;
  weDo: {
    practical: ProgressDetail;
    project_development: ProgressDetail;
    others: ProgressDetail;
  };
  youDo: {
    assessments: ProgressDetail;
  };
}

interface StudentAnalytic {
  student: User & { enrolledAt?: string };
  progress: StudentProgress;
  lastActivity?: string;
}

interface CourseStats {
  totalStudents: number;
  averageProgress: number;
  completedStudents: number;
  inProgressStudents: number;
  notStartedStudents: number;
  weDoStats: {
    practical: { averageCompletion: number };
    project_development: { averageCompletion: number };
  };
}

interface CourseAnalytic {
  course: {
    _id: string;
    courseName: string;
    courseCode: string;
    courseLevel: string;
    serviceType: string;
    courseImage?: string;
    totalModules: number;
  };
  stats: CourseStats;
  students: StudentAnalytic[];
}

interface OverallStats {
  totalCourses: number;
  totalStudents: number;
  averageCourseProgress: number;
  performanceDistribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  weDoEngagement: {
    practical: number;
    project: number;
  };
}

interface AnalyticsData {
  courses: CourseAnalytic[];
  overall: OverallStats;
}

interface Exercise {
  type: string;
  category: string;
  exerciseId: string;
  exerciseName: string;
  status: string;
  completedQuestions: number;
  totalQuestions: number;
  score: number;
  maxScore: number;
  lastAttempt?: string;
  attempts: number;
  submissionDate?: string;
  evaluated?: boolean;
}

interface StudentDetailData {
  course: {
    courseName: string;
    courseCode: string;
    courseLevel: string;
  };
  student: User;
  progress: {
    overall: number;
    averageScore: number;
    totalExercises: number;
    completedExercises: number;
    pendingExercises: number;
    exercises: Exercise[];
  };
  summary: {
    weDo: {
      practical: Exercise[];
      project_development: Exercise[];
    };
    youDo: {
      assessments: Exercise[];
    };
  };
}

interface StudentDetailResponse {
  success: boolean;
  data: StudentDetailData;
}

interface UserData {
  user: User;
}

// Chart Components
const ProgressBar = ({ 
    percentage, 
    color = '#3b82f6',
    height = 8,
    showLabel = true 
}: { 
    percentage: number; 
    color?: string;
    height?: number;
    showLabel?: boolean;
}) => {
    return (
        <div className="space-y-1">
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                />
            </div>
            {showLabel && (
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{percentage}%</span>
                </div>
            )}
        </div>
    );
};

const MiniBarChart = ({ 
    data, 
    labels, 
    color = '#3b82f6', 
    height = 60 
}: { 
    data: number[]; 
    labels?: string[]; 
    color?: string; 
    height?: number;
}) => {
    const max = Math.max(...data, 1);
    
    return (
        <div className="flex items-end justify-between h-16 w-full px-2">
            {data.map((value, index) => (
                <div key={index} className="flex flex-col items-center flex-1 mx-0.5">
                    <div 
                        className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                        style={{ 
                            height: `${(value / max) * height}px`,
                            backgroundColor: color,
                            opacity: 0.7 + (value / max) * 0.3
                        }}
                    />
                    {labels && labels[index] && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-full">
                            {labels[index]}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
};

const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    change, 
    color = '#3b82f6',
    description 
}: { 
    icon: React.ElementType; 
    title: string; 
    value: string | number; 
    change?: number; 
    color?: string;
    description?: string;
}) => {
    return (
        <div className={cn(
            "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5",
            "hover:shadow-lg transition-all duration-300"
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                </div>
                {change !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        change >= 0 
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}>
                        {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(change)}%
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
                {description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{description}</p>
                )}
            </div>
        </div>
    );
};

const CourseCard = ({ 
    course, 
    onClick 
}: { 
    course: CourseAnalytic; 
    onClick: () => void;
}) => {
    const getPerformanceColor = (percentage: number) => {
        if (percentage >= 80) return '#10b981';
        if (percentage >= 50) return '#f59e0b';
        if (percentage >= 30) return '#ef4444';
        return '#9ca3af';
    };

    return (
        <div 
            onClick={onClick}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all duration-300 cursor-pointer group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {course.course.courseName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{course.course.courseCode}</p>
                    </div>
                </div>
                <Badge 
                    className="text-xs"
                    style={{ 
                        backgroundColor: `${getPerformanceColor(course.stats.averageProgress)}20`,
                        color: getPerformanceColor(course.stats.averageProgress)
                    }}
                >
                    {course.stats.averageProgress}%
                </Badge>
            </div>
            
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <UsersIcon className="w-4 h-4" />
                        <span>{course.stats.totalStudents} Students</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {course.stats.completedStudents} Completed
                    </div>
                </div>
                
                <ProgressBar percentage={course.stats.averageProgress} color={getPerformanceColor(course.stats.averageProgress)} />
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>{course.stats.completedStudents}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-yellow-500" />
                        <span>{course.stats.inProgressStudents}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-gray-500" />
                        <span>{course.stats.notStartedStudents}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentCard = ({ 
    student, 
    courseId, 
    onClick 
}: { 
    student: StudentAnalytic; 
    courseId: string; 
    onClick: (studentId: string) => void;
}) => {
    return (
        <div 
            onClick={() => onClick(student.student._id)}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all duration-300 cursor-pointer group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {student.student.firstName?.[0]}{student.student.lastName?.[0]}
                        </span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {student.student.firstName} {student.student.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{student.student.email}</p>
                    </div>
                </div>
                <Badge 
                    className={`text-xs ${
                        student.progress.overall >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        student.progress.overall >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        student.progress.overall >= 30 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}
                >
                    {student.progress.overall}%
                </Badge>
            </div>
            
            <div className="space-y-3">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Overall Progress</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{student.progress.overall}%</span>
                    </div>
                    <ProgressBar percentage={student.progress.overall} />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                        <div className="font-semibold text-blue-600 dark:text-blue-400">
                            We_Do: {student.progress.weDo?.practical?.percentage || 0}%
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                            {student.progress.weDo?.practical?.completed || 0}/{student.progress.weDo?.practical?.total || 0} exercises
                        </div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                        <div className="font-semibold text-purple-600 dark:text-purple-400">
                            You_Do: {student.progress.youDo?.assessments?.percentage || 0}%
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                            {student.progress.youDo?.assessments?.completed || 0}/{student.progress.youDo?.assessments?.total || 0} assessments
                        </div>
                    </div>
                </div>
                
                {student.lastActivity && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>Last active: {new Date(student.lastActivity).toLocaleDateString()}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Exercise Card Component
const ExerciseCard = ({ 
    exercise 
}: { 
    exercise: Exercise;
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'evaluated': return '#10b981';
            case 'attempted': return '#f59e0b';
            case 'submitted': return '#3b82f6';
            default: return '#9ca3af';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'evaluated': return 'Evaluated';
            case 'attempted': return 'In Progress';
            case 'submitted': return 'Submitted';
            default: return 'Not Started';
        }
    };

    const completionPercentage = exercise.totalQuestions > 0 
        ? Math.round((exercise.completedQuestions / exercise.totalQuestions) * 100)
        : 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{exercise.exerciseName}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {exercise.type} • {exercise.category}
                        </span>
                        <span>ID: {exercise.exerciseId}</span>
                    </div>
                </div>
                <Badge 
                    style={{ 
                        backgroundColor: `${getStatusColor(exercise.status)}20`,
                        color: getStatusColor(exercise.status)
                    }}
                >
                    {getStatusText(exercise.status)}
                </Badge>
            </div>
            
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Questions: {exercise.completedQuestions}/{exercise.totalQuestions}
                    </div>
                    {exercise.score > 0 && (
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            Score: {exercise.score}/{exercise.maxScore}
                        </div>
                    )}
                </div>
                
                <ProgressBar percentage={completionPercentage} />
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>
                            {exercise.lastAttempt 
                                ? `Last attempt: ${new Date(exercise.lastAttempt).toLocaleDateString()}`
                                : 'No attempts yet'
                            }
                        </span>
                    </div>
                    {exercise.attempts > 0 && (
                        <span>Attempts: {exercise.attempts}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

// Main Staff Dashboard Component
export default function StaffDashboardPage() {
    const [user, setUser] = useState<UserData | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedCourse, setSelectedCourse] = useState<CourseAnalytic | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [studentDetail, setStudentDetail] = useState<StudentDetailResponse | null>(null);
    const [studentLoading, setStudentLoading] = useState<boolean>(false);
    
    const router = useRouter();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [userData, analyticsData] = await Promise.all([
                getCurrentUser(),
                getStaffStudentAnalytics()
            ]);
            setUser(userData);
            setAnalytics(analyticsData);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentDetail = async (studentId: string, courseId: string) => {
        setStudentLoading(true);
        try {
            const data = await getStudentCourseProgress(courseId, studentId);
            setStudentDetail(data);
        } catch (error) {
            console.error('Failed to fetch student details:', error);
        } finally {
            setStudentLoading(false);
        }
    };

    const handleViewCourse = (course: CourseAnalytic) => {
        setSelectedCourse(course);
        setStudentDetail(null);
    };

    const handleViewStudent = (studentId: string) => {
        if (selectedCourse) {
            fetchStudentDetail(studentId, selectedCourse.course._id);
        }
    };

    const handleBackToCourses = () => {
        setSelectedCourse(null);
        setStudentDetail(null);
    };

    const handleBackToStudents = () => {
        setStudentDetail(null);
    };

    const filteredCourses = useMemo(() => {
        if (!analytics?.courses) return [];
        return analytics.courses.filter(course => {
            if (filter === 'all') return true;
            if (filter === 'high' && course.stats?.averageProgress >= 80) return true;
            if (filter === 'medium' && course.stats?.averageProgress >= 50 && course.stats?.averageProgress < 80) return true;
            if (filter === 'low' && course.stats?.averageProgress < 50) return true;
            return false;
        });
    }, [analytics, filter]);

    const filteredStudents = useMemo(() => {
        if (!selectedCourse?.students) return [];
        return selectedCourse.students.filter(student => {
            const fullName = `${student.student?.firstName || ''} ${student.student?.lastName || ''}`.toLowerCase();
            const email = student.student?.email?.toLowerCase() || '';
            const query = searchQuery.toLowerCase();
            
            return fullName.includes(query) || email.includes(query);
        });
    }, [selectedCourse, searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading staff dashboard...</p>
                </div>
            </div>
        );
    }

    const overallStats = analytics?.overall || {
        totalCourses: 0,
        totalStudents: 0,
        averageCourseProgress: 0,
        performanceDistribution: {
            excellent: 0,
            good: 0,
            average: 0,
            poor: 0
        },
        weDoEngagement: {
            practical: 0,
            project: 0
        }
    };

    return (
                    <StudentLayout>

        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Staff Analytics Dashboard
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Monitor student progress across all courses
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {user?.user?.firstName} {user?.user?.lastName}
                        </Badge>
                        <Button
                            onClick={() => router.push('/staff/analytics/reports')}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export Reports
                        </Button>
                    </div>
                </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={Users}
                    title="Total Students"
                    value={overallStats.totalStudents}
                    change={12}
                    color="#3b82f6"
                    description="Across all courses"
                />
                <StatCard
                    icon={BookOpen}
                    title="Active Courses"
                    value={overallStats.totalCourses}
                    change={5}
                    color="#10b981"
                    description="With enrolled students"
                />
                <StatCard
                    icon={TrendingUp}
                    title="Avg. Progress"
                    value={`${overallStats.averageCourseProgress}%`}
                    change={8}
                    color="#f59e0b"
                    description="Across all students"
                />
                <StatCard
                    icon={Award}
                    title="We_Do Engagement"
                    value={`${overallStats.weDoEngagement.practical}%`}
                    change={15}
                    color="#8b5cf6"
                    description="Practical exercises completion"
                />
            </div>

            {/* Performance Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course Performance Distribution</h2>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Based on average progress</span>
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Excellent', value: overallStats.performanceDistribution.excellent, color: '#10b981', min: 80 },
                        { label: 'Good', value: overallStats.performanceDistribution.good, color: '#f59e0b', min: 50 },
                        { label: 'Average', value: overallStats.performanceDistribution.average, color: '#ef4444', min: 30 },
                        { label: 'Poor', value: overallStats.performanceDistribution.poor, color: '#9ca3af', min: 0 }
                    ].map((item, index) => (
                        <div key={index} className="text-center">
                            <div className={`text-2xl font-bold mb-1`} style={{ color: item.color }}>
                                {item.value}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{item.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">≥{item.min}% progress</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            {!selectedCourse ? (
                // Course List View
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Courses</h2>
                        <div className="flex items-center gap-3">
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by performance" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    <SelectItem value="high">High (≥80%)</SelectItem>
                                    <SelectItem value="medium">Medium (50-79%)</SelectItem>
                                    <SelectItem value="low">Low (&lt;50%)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {filteredCourses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCourses.map((course, index) => (
                                <CourseCard
                                    key={course.course._id || index}
                                    course={course}
                                    onClick={() => handleViewCourse(course)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No courses found</h3>
                            <p className="text-gray-600 dark:text-gray-400">No courses match the selected filter</p>
                        </div>
                    )}
                </div>
            ) : !studentDetail ? (
                // Student List View for Selected Course
                <div>
                    <div className="mb-6">
                        <Button
                            variant="ghost"
                            onClick={handleBackToCourses}
                            className="mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                            ← Back to all courses
                        </Button>
                        
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {selectedCourse.course.courseName}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {selectedCourse.stats.totalStudents} students • {selectedCourse.course.courseCode}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Search students..."
                                        className="pl-9 w-64"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                    Avg: {selectedCourse.stats.averageProgress}%
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Course Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                                {selectedCourse.stats.completedStudents}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Completed Students</div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                                {selectedCourse.stats.inProgressStudents}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-1">
                                {selectedCourse.stats.notStartedStudents}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Not Started</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                                {selectedCourse.stats.weDoStats.practical.averageCompletion}%
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">We_Do Engagement</div>
                        </div>
                    </div>

                    {/* Students Grid */}
                    {filteredStudents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStudents.map((student, index) => (
                                <StudentCard
                                    key={student.student._id || index}
                                    student={student}
                                    courseId={selectedCourse.course._id}
                                    onClick={handleViewStudent}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No students found</h3>
                            <p className="text-gray-600 dark:text-gray-400">No students match your search criteria</p>
                        </div>
                    )}
                </div>
            ) : (
                // Student Detail View
                <div>
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Button
                                variant="ghost"
                                onClick={handleBackToStudents}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                                ← Back to students
                            </Button>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                                {studentDetail.data?.student?.firstName} {studentDetail.data?.student?.lastName}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {studentDetail.data?.student?.firstName} {studentDetail.data?.student?.lastName}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {studentDetail.data?.student?.email} • {studentDetail.data?.course?.courseName}
                                </p>
                            </div>
                            <Badge className={`text-lg px-4 py-1 ${
                                (studentDetail.data?.progress?.overall || 0) >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                (studentDetail.data?.progress?.overall || 0) >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                (studentDetail.data?.progress?.overall || 0) >= 30 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                                {studentDetail.data?.progress?.overall || 0}% Overall
                            </Badge>
                        </div>
                    </div>

                    {studentLoading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto"></div>
                        </div>
                    ) : (
                        <>
                            {/* Progress Overview */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress Overview</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {studentDetail.data?.progress?.overall || 0}%
                                                </span>
                                            </div>
                                            <ProgressBar 
                                                percentage={studentDetail.data?.progress?.overall || 0} 
                                                height={10}
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Score</span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {studentDetail.data?.progress?.averageScore || 0}%
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Based on evaluated exercises
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exercises Completed</span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                        {studentDetail.data?.progress?.completedExercises || 0}/{studentDetail.data?.progress?.totalExercises || 0}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Total exercises in course
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">We_Do Exercises</span>
                                            </div>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {studentDetail.data?.summary?.weDo?.practical?.length || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                                    <FolderTree className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Projects</span>
                                            </div>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {studentDetail.data?.summary?.weDo?.project_development?.length || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                                                    <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">Assessments</span>
                                            </div>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {studentDetail.data?.summary?.youDo?.assessments?.length || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Exercises Breakdown */}
                            <Tabs defaultValue="all" className="mb-8">
                                <TabsList className="grid grid-cols-4 mb-4">
                                    <TabsTrigger value="all">All Exercises</TabsTrigger>
                                    <TabsTrigger value="we_do">We_Do</TabsTrigger>
                                    <TabsTrigger value="projects">Projects</TabsTrigger>
                                    <TabsTrigger value="assessments">Assessments</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="all" className="space-y-4">
                                    {studentDetail.data?.progress?.exercises?.map((exercise, index) => (
                                        <ExerciseCard key={index} exercise={exercise} />
                                    ))}
                                </TabsContent>
                                
                                <TabsContent value="we_do" className="space-y-4">
                                    {studentDetail.data?.summary?.weDo?.practical?.map((exercise, index) => (
                                        <ExerciseCard key={index} exercise={exercise} />
                                    ))}
                                </TabsContent>
                                
                                <TabsContent value="projects" className="space-y-4">
                                    {studentDetail.data?.summary?.weDo?.project_development?.map((exercise, index) => (
                                        <ExerciseCard key={index} exercise={exercise} />
                                    ))}
                                </TabsContent>
                                
                                <TabsContent value="assessments" className="space-y-4">
                                    {studentDetail.data?.summary?.youDo?.assessments?.map((exercise, index) => (
                                        <ExerciseCard key={index} exercise={exercise} />
                                    ))}
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </div>
            )}
        </div>
                    </StudentLayout>

    );
}