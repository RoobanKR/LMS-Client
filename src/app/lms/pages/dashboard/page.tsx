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
    Download,
    Search,
    UserCheck,
    Percent,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    ChevronLeft,
    Home,
    Grid3X3,
    List,
    Edit,
    ChevronDown,
    Star,
    Trophy,
    Wifi,
    MoreHorizontal,
    Circle,
    Square,
    Triangle,
    BookMarked,
    Calendar,
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
import { StaffLayout } from '../../component/stafflayout/staff-layout';

// ─── Types ──────────────────────────────────────────────────────────────────

interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: string;
    role?: { renameRole?: string; originalRole?: string; roleValue?: string };
}

interface ProgressDetail {
    completed: number;
    total: number;
    percentage: number;
}

interface StudentProgress {
    overall: number;
    [pedagogyType: string]: any;
    metadata?: { totalExercisesInCourse: number; totalAttempts: number; pedagogyStructure: { [p: string]: string[] } };
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
    categoryStats: { [key: string]: { averageCompletion: number } };
}

interface CourseAnalytic {
    course: {
        _id: string;
        courseName: string;
        courseCode: string;
        courseLevel: string;
        serviceType: string;
        totalModules: number;
        totalParticipants: number;
        totalStudents: number;
        pedagogyStructure?: { [p: string]: string[] };
    };
    stats: CourseStats;
    students: StudentAnalytic[];
}

interface OverallStats {
    totalCourses: number;
    totalStudents: number;
    averageCourseProgress: number;
    performanceDistribution: { excellent: number; good: number; average: number; poor: number };
    allPedagogyCategories: { [p: string]: string[] };
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
}

interface StudentDetailData {
    course: { courseName: string; courseCode: string; courseLevel: string };
    student: User;
    progress: {
        overall: number;
        averageScore: number;
        totalExercises: number;
        completedExercises: number;
        pendingExercises: number;
        exercises: Exercise[];
        categoryStats: { [p: string]: { [c: string]: { total: number; completed: number; percentage: number; averageScore: number } } };
    };
    summary: { [p: string]: { [c: string]: Exercise[] } };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COURSE_PALETTE = [
    { bg: '#eeeafd', icon: '#7c6be8', dot: '#7c6be8' },
    { bg: '#fdeee9', icon: '#e87c5a', dot: '#e87c5a' },
    { bg: '#edf8ee', icon: '#5abf65', dot: '#5abf65' },
    { bg: '#fdf6e9', icon: '#e8b95a', dot: '#e8b95a' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const progressColor = (p: number) =>
    p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : p >= 30 ? '#ef4444' : '#9ca3af';

// ─── Mini Components ─────────────────────────────────────────────────────────

const ProgressBar = ({ percentage, color = '#7c6be8' }: { percentage: number; color?: string }) => (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, backgroundColor: color }} />
    </div>
);

// Gauge / speedometer for performance panel
const GaugeChart = ({ value, max = 10000 }: { value: number; max?: number }) => {
    const pct = Math.min(value / max, 1);
    // Half-circle: sweep from 180° to 0° (left to right)
    const r = 60;
    const cx = 80;
    const cy = 80;
    const startAngle = Math.PI;
    const endAngle = 0;
    const angle = startAngle + pct * (endAngle - startAngle); // decreasing → rightward
    const needleX = cx + r * Math.cos(angle);
    const needleY = cy + r * Math.sin(angle);

    const arcPath = (innerR: number, outerR: number, fromDeg: number, toDeg: number, fill: string) => {
        const from = (fromDeg * Math.PI) / 180;
        const to = (toDeg * Math.PI) / 180;
        const x1o = cx + outerR * Math.cos(from);
        const y1o = cy + outerR * Math.sin(from);
        const x2o = cx + outerR * Math.cos(to);
        const y2o = cy + outerR * Math.sin(to);
        const x1i = cx + innerR * Math.cos(to);
        const y1i = cy + innerR * Math.sin(to);
        const x2i = cx + innerR * Math.cos(from);
        const y2i = cy + innerR * Math.sin(from);
        return (
            <path
                d={`M ${x1o} ${y1o} A ${outerR} ${outerR} 0 0 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${innerR} ${innerR} 0 0 0 ${x2i} ${y2i} Z`}
                fill={fill}
            />
        );
    };

    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 160 90" className="w-40 h-20 overflow-visible">
                {/* Track segments */}
                {arcPath(46, 62, 180, 216, '#ef4444')}
                {arcPath(46, 62, 216, 252, '#f97316')}
                {arcPath(46, 62, 252, 288, '#eab308')}
                {arcPath(46, 62, 288, 324, '#84cc16')}
                {arcPath(46, 62, 324, 360, '#10b981')}
                {/* Needle */}
                <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx={cx} cy={cy} r="5" fill="#374151" />
            </svg>
        </div>
    );
};

// Bar chart for Hours Spent
const HoursBarChart = ({ studyData, examData, labels }: { studyData: number[]; examData: number[]; labels: string[] }) => {
    const max = Math.max(...studyData, ...examData, 1);
    const h = 80; // px height of chart area

    return (
        <div className="w-full">
            {/* Y axis labels */}
            <div className="flex">
                <div className="flex flex-col justify-between text-[10px] text-gray-400 pr-2 h-[80px]">
                    {[80, 60, 40, 20, 0].map(v => <span key={v}>{v} Hr</span>)}
                </div>
                {/* Bars */}
                <div className="flex-1 flex items-end gap-3 border-l border-gray-100 dark:border-gray-700 pl-2">
                    {labels.map((label, i) => (
                        <div key={label} className="flex-1 flex flex-col items-center gap-1">
                            <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: h }}>
                                {/* Exam bar */}
                                <div
                                    className="w-3 rounded-t-md transition-all duration-700"
                                    style={{ height: `${(examData[i] / max) * h}px`, backgroundColor: '#fde68a' }}
                                />
                                {/* Study bar */}
                                <div
                                    className="w-3 rounded-t-md transition-all duration-700"
                                    style={{ height: `${(studyData[i] / max) * h}px`, backgroundColor: '#f97316' }}
                                />
                            </div>
                            <span className="text-[10px] text-gray-400">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Loading
const LoadingSpinner = ({ message = 'Loading...' }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
);

const EmptyState = ({ icon: Icon = BookOpen, title, description, action }: { icon?: React.ElementType; title: string; description: string; action?: React.ReactNode }) => (
    <div className="text-center py-12">
        <div className="w-14 h-14 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Icon className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">{description}</p>
        {action}
    </div>
);

// ─── Course Card ─────────────────────────────────────────────────────────────

const CourseCard = ({ course, palette, onClick }: { course: CourseAnalytic; palette: typeof COURSE_PALETTE[0]; onClick: () => void }) => (
    <div
        onClick={onClick}
        className="rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all duration-200 group"
        style={{ backgroundColor: palette.bg }}
    >
        <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: palette.icon + '30' }}>
                <BookOpen className="w-5 h-5" style={{ color: palette.icon }} />
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/60" style={{ color: palette.icon }}>
                {course.stats.averageProgress}%
            </span>
        </div>

        <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-800 leading-snug mb-1 line-clamp-2">
            {course.course.courseName}
        </h3>

        <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
            <span className="flex items-center gap-1">
                <BookMarked className="w-3 h-3" />
                {course.course.totalModules}
            </span>
            <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                8
            </span>
            <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {course.stats.totalStudents}
            </span>
        </div>

        <ProgressBar percentage={course.stats.averageProgress} color={palette.icon} />

        <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />{course.stats.completedStudents}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-yellow-500" />{course.stats.inProgressStudents}</span>
            <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-gray-400" />{course.stats.notStartedStudents}</span>
        </div>
    </div>
);

// ─── Student Card (condensed) ─────────────────────────────────────────────────

const StudentCard = ({ student, onClick }: { student: StudentAnalytic; onClick: (id: string) => void }) => {
    const pct = student.progress.overall;
    return (
        <div
            onClick={() => onClick(student.student._id)}
            className="bg-white dark:bg-[#1e2235] rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4 hover:shadow-md transition-all cursor-pointer"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white text-[11px] font-bold">
                        {student.student.firstName?.[0]}{student.student.lastName?.[0]}
                    </div>
                    <div>
                        <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{student.student.firstName} {student.student.lastName}</p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{student.student.email}</p>
                    </div>
                </div>
                <span className={cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded-full',
                    pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'
                )}>{pct}%</span>
            </div>
            <ProgressBar percentage={pct} color={progressColor(pct)} />
            {student.lastActivity && (
                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(student.lastActivity).toLocaleDateString()}
                </p>
            )}
        </div>
    );
};

// ─── Exercise Card ────────────────────────────────────────────────────────────

const ExerciseCard = ({ exercise }: { exercise: Exercise }) => {
    const pct = exercise.totalQuestions > 0 ? Math.round((exercise.completedQuestions / exercise.totalQuestions) * 100) : 0;
    const statusMap: Record<string, { label: string; color: string }> = {
        evaluated: { label: 'Evaluated', color: '#10b981' },
        attempted: { label: 'In Progress', color: '#f59e0b' },
        submitted: { label: 'Submitted', color: '#3b82f6' },
    };
    const s = statusMap[exercise.status] || { label: 'Not Started', color: '#9ca3af' };

    return (
        <div className="bg-white dark:bg-[#1e2235] rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{exercise.exerciseName}</p>
                    <p className="text-[11px] text-gray-400 capitalize mt-0.5">{exercise.type.replace(/_/g, ' ')} · {exercise.category.replace(/_/g, ' ')}</p>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full ml-2 flex-shrink-0" style={{ backgroundColor: s.color + '20', color: s.color }}>
                    {s.label}
                </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
                <span>Questions: {exercise.completedQuestions}/{exercise.totalQuestions}</span>
                {exercise.score > 0 && <span>Score: {exercise.score}/{exercise.maxScore}</span>}
            </div>
            <ProgressBar percentage={pct} />
        </div>
    );
};

// ─── Right Panel ──────────────────────────────────────────────────────────────

const RightPanel = ({
    analytics,
    user,
}: {
    analytics: AnalyticsData | null;
    user: { user: User } | null;
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const today = new Date();

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const adjustedFirstDay = (firstDay + 6) % 7; // Monday start

    const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const prevMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

    const todos = [
        { label: 'Developing Restaurant Apps', sub: 'Programming  |  08:00 AM', done: false },
        { label: 'Integrate API', sub: '', done: false },
        { label: 'Slicing Home Screen', sub: '', done: false },
        { label: 'Research Objective User', sub: 'Product Design  |  02:40 PM', done: false },
        { label: 'Report Analysis P2P Business', sub: 'Business  |  04:50 PM', done: true },
    ];

    const initials = user?.user ? `${user.user.firstName?.charAt(0) || ''}${user.user.lastName?.charAt(0) || ''}` : 'SC';
    const fullName = user?.user ? `${user.user.firstName} ${user.user.lastName}` : 'Student';
    const role = user?.user?.role?.renameRole || 'College Student';
    const overallPct = analytics?.overall?.averageCourseProgress || 0;

    return (
        <aside className="w-[260px] flex-shrink-0 flex flex-col gap-4">
            {/* Profile Card */}
            <div className="bg-white dark:bg-[#1e2235] rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">Profile</p>
                    <button className="p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Edit className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                </div>

                <div className="flex flex-col items-center">
                    {/* Circular progress ring */}
                    <div className="relative w-20 h-20 mb-3">
                        <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                            <circle
                                cx="40" cy="40" r="34" fill="none"
                                stroke="#14b8a6" strokeWidth="6"
                                strokeDasharray={`${2 * Math.PI * 34}`}
                                strokeDashoffset={`${2 * Math.PI * 34 * (1 - overallPct / 100)}`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-lg font-bold text-gray-700 dark:text-white">{initials}</span>
                        </div>
                    </div>

                    <p className="text-[13px] font-bold text-gray-900 dark:text-white flex items-center gap-1">
                        {fullName}
                        <CheckCircle className="w-3.5 h-3.5 text-teal-500" />
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{role}</p>
                </div>
            </div>

            {/* Calendar */}
            <div className="bg-white dark:bg-[#1e2235] rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={prevMonth} className="p-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </button>
                    <p className="text-[12px] font-bold text-gray-900 dark:text-white">{monthLabel}</p>
                    <button onClick={nextMonth} className="p-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-y-0.5">
                    {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const isToday = today.getDate() === day && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
                        return (
                            <button
                                key={day}
                                className={cn(
                                    "w-full aspect-square flex items-center justify-center text-[11px] rounded-full transition-colors font-medium",
                                    isToday
                                        ? "bg-orange-500 text-white font-bold"
                                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                )}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* To Do List */}
            <div className="bg-white dark:bg-[#1e2235] rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
                <p className="text-[13px] font-bold text-gray-900 dark:text-white mb-3">To Do List</p>
                <ul className="space-y-2.5">
                    {todos.map((todo, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                            <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                                todo.done
                                    ? "bg-orange-500 border-orange-500"
                                    : "border-gray-300 dark:border-gray-600"
                            )}>
                                {todo.done && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <div className="min-w-0">
                                <p className={cn(
                                    "text-[12px] font-medium leading-tight",
                                    todo.done ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200"
                                )}>
                                    {todo.label}
                                </p>
                                {todo.sub && <p className="text-[10px] text-gray-400 mt-0.5">{todo.sub}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
};

// ─── Leaderboard Row ─────────────────────────────────────────────────────────

const LeaderboardRow = ({ rank, name, course, hours, points, isHighlighted }: {
    rank: number;
    name: string;
    course: string;
    hours: number;
    points: number;
    isHighlighted?: boolean;
}) => (
    <tr className={cn("transition-colors", isHighlighted && "bg-orange-50 dark:bg-orange-900/10")}>
        <td className="py-3 pl-4 pr-2 text-[12px] font-semibold text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
                {rank <= 3 ? <span className="text-orange-500">▲</span> : null}
                {rank}
            </div>
        </td>
        <td className="py-3 px-2">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white text-[10px] font-bold">
                    {name.charAt(0)}
                </div>
                <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">{name}</span>
            </div>
        </td>
        <td className="py-3 px-2 text-[12px] text-gray-500">{course}</td>
        <td className="py-3 px-2 text-[12px] font-semibold text-gray-700 dark:text-gray-300">{hours}</td>
        <td className="py-3 pr-4 text-right text-[12px] font-bold text-orange-500">{points.toLocaleString()}</td>
    </tr>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function StaffDashboardPage() {
    const [user, setUser] = useState<{ user: User } | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<CourseAnalytic | null>(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [studentDetail, setStudentDetail] = useState<{ success: boolean; data: StudentDetailData } | null>(null);
    const [studentLoading, setStudentLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const router = useRouter();

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            const [userData, analyticsData] = await Promise.all([getCurrentUser(), getStaffStudentAnalytics()]);
            setUser(userData);
            setAnalytics(analyticsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentDetail = async (studentId: string, courseId: string) => {
        setStudentLoading(true);
        try {
            const data = await getStudentCourseProgress(courseId, studentId);
            setStudentDetail(data);
        } catch (e) {
            console.error(e);
        } finally {
            setStudentLoading(false);
        }
    };

    const handleViewCourse = (c: CourseAnalytic) => {
        setSelectedCourse(c);
        setStudentDetail(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleViewStudent = (id: string) => {
        if (selectedCourse) {
            fetchStudentDetail(id, selectedCourse.course._id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const filteredCourses = useMemo(() => {
        if (!analytics?.courses) return [];
        return analytics.courses.filter(c => {
            if (filter === 'high') return c.stats?.averageProgress >= 80;
            if (filter === 'medium') return c.stats?.averageProgress >= 50 && c.stats?.averageProgress < 80;
            if (filter === 'low') return c.stats?.averageProgress < 50;
            return true;
        });
    }, [analytics, filter]);

    const filteredStudents = useMemo(() => {
        if (!selectedCourse?.students) return [];
        const q = searchQuery.toLowerCase();
        return selectedCourse.students.filter(s => {
            const name = `${s.student?.firstName || ''} ${s.student?.lastName || ''}`.toLowerCase();
            return name.includes(q) || s.student?.email?.toLowerCase().includes(q);
        });
    }, [selectedCourse, searchQuery]);

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-[#f5f6fa] dark:bg-[#12131f]">
            <LoadingSpinner message="Loading dashboard..." />
        </div>
    );

    const overall = analytics?.overall || { totalCourses: 0, totalStudents: 0, averageCourseProgress: 0, performanceDistribution: { excellent: 0, good: 0, average: 0, poor: 0 }, allPedagogyCategories: {} };

    // Fake leaderboard data (replace with real data when available)
    const leaderboard = [
        { name: 'Charlie Rawal', course: 'UI Design', hours: 53, points: 13450 },
        { name: 'Priya Sharma', course: 'React Dev', hours: 88, points: 10333 },
        { name: 'Arun Kumar', course: 'Data Science', hours: 72, points: 9870 },
        { name: 'Sneha Patel', course: 'DevOps', hours: 60, points: 8990 },
    ];

    // Fake hours data
    const studyHours = [45, 30, 62, 55, 25, 40];
    const examHours = [30, 20, 35, 32, 18, 25];

    return (
        <StaffLayout>
            <div className="flex gap-5 min-h-full">
                {/* ── MAIN CONTENT ── */}
                <div className="flex-1 min-w-0">

                    {/* ── COURSE LIST VIEW ── */}
                    {!selectedCourse && (
                        <>
                            {/* Course cards */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">All Courses</h2>
                                    <p className="text-[12px] text-gray-400">{filteredCourses.length} courses</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                        <button onClick={() => setViewMode('grid')} className={cn("p-2 transition-colors", viewMode === 'grid' ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                                            <Grid3X3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setViewMode('list')} className={cn("p-2 transition-colors", viewMode === 'list' ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800")}>
                                            <List className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <select
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
                                        className="text-[12px] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-[#1e2235] text-gray-700 dark:text-gray-300 outline-none"
                                    >
                                        <option value="all">All Courses</option>
                                        <option value="high">High ≥80%</option>
                                        <option value="medium">Medium 50-79%</option>
                                        <option value="low">Low &lt;50%</option>
                                    </select>
                                </div>
                            </div>

                            {filteredCourses.length > 0 ? (
                                <div className={cn("grid gap-4 mb-6", viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
                                    {filteredCourses.map((course, i) => (
                                        <CourseCard
                                            key={course.course._id || i}
                                            course={course}
                                            palette={COURSE_PALETTE[i % COURSE_PALETTE.length]}
                                            onClick={() => handleViewCourse(course)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={BookOpen} title="No courses found" description="Try changing the filter." action={<button onClick={() => setFilter('all')} className="text-sm font-semibold text-orange-500 hover:underline">Show all</button>} />
                            )}

                            {/* Hours Spent + Performance row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                {/* Hours Spent */}
                                <div className="bg-white dark:bg-[#1e2235] rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Hours Spent</h3>
                                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Study</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-200 inline-block" /> Exams</span>
                                        </div>
                                    </div>
                                    <HoursBarChart studyData={studyHours} examData={examHours} labels={MONTHS} />
                                </div>

                                {/* Performance */}
                                <div className="bg-white dark:bg-[#1e2235] rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Performance</h3>
                                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                            <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                                            Point Progress
                                            <select className="ml-1 text-[11px] border-none outline-none bg-transparent text-gray-500">
                                                <option>Monthly</option>
                                                <option>Weekly</option>
                                            </select>
                                        </div>
                                    </div>

                                    <GaugeChart value={Math.round(overall.averageCourseProgress * 100)} max={10000} />

                                    <div className="text-center mt-2">
                                        <p className="text-[22px] font-bold text-gray-900 dark:text-white">
                                            Your Point: <span className="text-teal-500">{(overall.averageCourseProgress * 89.66).toFixed(0)}</span>
                                        </p>
                                        <p className="text-[12px] text-teal-500 mt-0.5 flex items-center justify-center gap-1">
                                            <Trophy className="w-3.5 h-3.5" />
                                            Top in Leaderboard
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Leaderboard */}
                            <div className="bg-white dark:bg-[#1e2235] rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
                                    <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Leader Board</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50 dark:border-gray-700/50">
                                                <th className="py-2.5 pl-4 pr-2 text-left">Rank</th>
                                                <th className="py-2.5 px-2 text-left">Name</th>
                                                <th className="py-2.5 px-2 text-left">Course</th>
                                                <th className="py-2.5 px-2 text-left">Hour</th>
                                                <th className="py-2.5 pr-4 text-right">Point</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaderboard.map((row, i) => (
                                                <LeaderboardRow
                                                    key={i}
                                                    rank={i + 1}
                                                    name={row.name}
                                                    course={row.course}
                                                    hours={row.hours}
                                                    points={row.points}
                                                    isHighlighted={i === 0}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── STUDENT LIST ── */}
                    {selectedCourse && !studentDetail && (
                        <div>
                            <button
                                onClick={() => { setSelectedCourse(null); setStudentDetail(null); }}
                                className="flex items-center gap-1.5 text-[12px] font-semibold text-orange-500 hover:underline mb-4"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back to All Courses
                            </button>

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">{selectedCourse.course.courseName}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-gray-400">{selectedCourse.course.courseCode}</span>
                                        <span className="text-[11px] text-gray-300">·</span>
                                        <span className="text-[11px] text-gray-400">{selectedCourse.stats.totalStudents} students</span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                        placeholder="Search students..."
                                        className="pl-8 pr-3 h-9 text-[12px] border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1e2235] text-gray-700 dark:text-gray-300 outline-none focus:border-orange-300"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Course stat chips */}
                            <div className="grid grid-cols-4 gap-3 mb-5">
                                {[
                                    { label: 'Completed', value: selectedCourse.stats.completedStudents, color: '#10b981', bg: '#ecfdf5' },
                                    { label: 'In Progress', value: selectedCourse.stats.inProgressStudents, color: '#f59e0b', bg: '#fffbeb' },
                                    { label: 'Not Started', value: selectedCourse.stats.notStartedStudents, color: '#9ca3af', bg: '#f9fafb' },
                                    { label: 'Avg Progress', value: `${selectedCourse.stats.averageProgress}%`, color: '#7c6be8', bg: '#f5f3ff' },
                                ].map(chip => (
                                    <div key={chip.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: chip.bg }}>
                                        <div className="text-[18px] font-bold" style={{ color: chip.color }}>{chip.value}</div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">{chip.label}</div>
                                    </div>
                                ))}
                            </div>

                            {filteredStudents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredStudents.map((s, i) => (
                                        <StudentCard key={s.student._id || i} student={s} onClick={handleViewStudent} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={Users} title="No students found" description={searchQuery ? `No results for "${searchQuery}"` : 'No students enrolled.'} action={searchQuery ? <button onClick={() => setSearchQuery('')} className="text-sm font-semibold text-orange-500 hover:underline">Clear search</button> : null} />
                            )}
                        </div>
                    )}

                    {/* ── STUDENT DETAIL ── */}
                    {studentDetail && (
                        <div>
                            <button
                                onClick={() => setStudentDetail(null)}
                                className="flex items-center gap-1.5 text-[12px] font-semibold text-orange-500 hover:underline mb-4"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back to Students
                            </button>

                            {studentLoading ? <LoadingSpinner message="Loading student details..." /> : (
                                <>
                                    <div className="bg-white dark:bg-[#1e2235] rounded-2xl border border-gray-100 dark:border-gray-700/50 p-5 mb-4">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">{studentDetail.data?.student?.firstName} {studentDetail.data?.student?.lastName}</h2>
                                                <p className="text-[12px] text-gray-400">{studentDetail.data?.student?.email}</p>
                                            </div>
                                            <span className={cn("text-[13px] font-bold px-3 py-1 rounded-full", (studentDetail.data?.progress?.overall || 0) >= 80 ? "bg-green-100 text-green-700" : (studentDetail.data?.progress?.overall || 0) >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600")}>
                                                {studentDetail.data?.progress?.overall || 0}% Overall
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4">
                                            {[
                                                { label: 'Avg Score', value: `${studentDetail.data?.progress?.averageScore || 0}%` },
                                                { label: 'Exercises', value: `${studentDetail.data?.progress?.completedExercises || 0}/${studentDetail.data?.progress?.totalExercises || 0}` },
                                                { label: 'Pending', value: studentDetail.data?.progress?.pendingExercises || 0 },
                                                { label: 'Completion', value: `${Math.round((studentDetail.data?.progress?.completedExercises || 0) / Math.max(studentDetail.data?.progress?.totalExercises || 1, 1) * 100)}%` },
                                            ].map(stat => (
                                                <div key={stat.label} className="text-center">
                                                    <div className="text-[20px] font-bold text-gray-900 dark:text-white">{stat.value}</div>
                                                    <div className="text-[11px] text-gray-400 mt-0.5">{stat.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-3">Exercises</h3>
                                    <div className="space-y-3">
                                        {studentDetail.data?.progress?.exercises?.map((ex, i) => (
                                            <ExerciseCard key={i} exercise={ex} />
                                        )) || <EmptyState icon={FileText} title="No exercises" description="No exercises attempted yet." />}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── RIGHT PANEL ── */}
                <div className="hidden xl:block">
                    <RightPanel analytics={analytics} user={user} />
                </div>
            </div>
        </StaffLayout>
    );
}