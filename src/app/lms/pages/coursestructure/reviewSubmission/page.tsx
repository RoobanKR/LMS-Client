"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Script from 'next/script';
import { Inter, Montserrat } from 'next/font/google';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Search,
  Code,
  X,
  RefreshCw,
  FileCode,
  Users,
  Award,
  ArrowLeft,
  Copy,
  ChevronLeft,
  ChevronRight,
  Home,
  Folder,
  Layers,
  CheckCircle,
  Clock,
  Send,
  Play,
  Loader2,
  Terminal,
  MessageSquare,
  FileQuestion,
  Check,
  User,
  Trash2,
  Maximize2,
  Minimize2,
  AlertCircle,
  MoreVertical, // <--- Add this
  Lock, // <--- Add this (optional, for icon)
  Unlock // <--- Add this (optional, for icon)
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // <--- Add this
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast, Toaster } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import AdminFrontendCompiler from '@/app/lms/component/AdminFrontendCompiler';

// --- 2. Dynamically Import Monaco Editor ---
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-500 text-xs">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading Editor...
    </div>
  )
});

// Font Configuration
const inter = Inter({ subsets: ['latin'] });
const montserrat = Montserrat({ subsets: ['latin'] });

// API CONFIG
const BACKEND_API_URL = "https://lms-server-ym1q.onrender.com";
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";

// --- INTERFACES ---
interface ExerciseQuestion {
  _id: string;
  title: string;
  description: string;
  points: number;
  score?: number;
  timeLimit: number;
  memoryLimit: number;
  difficulty: string;
  sampleInput: string;
  sampleOutput: string;
  constraints?: string[];
  hints?: Array<{
    hintText: string;
    pointsDeduction: number;
    isPublic: boolean;
    sequence: number;
  }>;
  solutions?: {
    startedCode: string;
    functionName: string;
    language: string;
  };
}

interface Exercise {
  _id: string;
  exerciseInformation: {
    exerciseId: string;
    exerciseName: string;
    description: string;
    exerciseLevel: 'beginner' | 'intermediate' | 'advanced';
    totalPoints: number;
    totalQuestions: number;
    estimatedTime: number;
  };
  programmingSettings: {
    selectedModule: string;
    selectedLanguages: string[];
    levelConfiguration: {
      levelType: 'levelBased' | 'general';
      levelBased?: {
        easy: number;
        medium: number;
        hard: number;
      };
      general?: number;
    };
  };
  scoreSettings?: {
    scoreType: string;
    levelBasedMarks?: {
      easy: number;
      medium: number;
      hard: number;
    };
    evenMarks?: number;
    totalMarks?: number;
    separateMarks?: {
      general?: number[];
      levelBased?: {
        easy?: number[];
        medium?: number[];
        hard?: number[];
      };
    };
  };
  questions: ExerciseQuestion[];
  nodeType?: string;
  createdAt: string;
}

interface SubmissionQuestion {
  _id: string;
  questionId: string;
  codeAnswer: string;
  language: string;
  isCorrect: boolean;
  score: number;
  status: 'attempted' | 'evaluated' | 'pending';
  attemScore: number;
  submittedAt: string;
  feedback?: string;
  tags?: string[];
  timeTaken?: number;
  memoryUsed?: number;
}

interface ExerciseAnswer {
  _id: string;
  exerciseId: string;
  questions: SubmissionQuestion[];
  nodeId: string;
  nodeName: string;
  nodeType: string;
  subcategory: string;
  createdAt: string;
}

interface UserCourse {
  courseId: string;
  answers?: {
    We_Do?: {
      practical?: ExerciseAnswer[];
      project_development?: any[];
    };
    You_Do?: {
      practical?: ExerciseAnswer[];
      project_development?: any[];
    };
  };
  lastAccessed: string;
  _id: string;
}

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  profile: string;
  role: {
    renameRole: string;
  };
  department?: string;
  courses?: UserCourse[];
  permissions?: any[];
}

interface Participant {
  _id: string;
  user: User;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CourseModule {
  _id: string;
  title: string;
  subModules: Array<{
    _id: string;
    title: string;
    topics: Array<{
      _id: string;
      title: string;
      pedagogy?: {
        We_Do?: {
          practical?: Exercise[];
          project_development?: Exercise[];
        };
        You_Do?: {
          practical?: Exercise[];
          project_development?: Exercise[];
        }
      };
    }>;
  }>;
}

interface CourseData {
  _id: string;
  courseName: string;
  modules: CourseModule[];
  singleParticipants: Participant[];
}

interface BreadcrumbItem {
  title: string;
  icon: React.ReactNode;
  type: 'course' | 'module' | 'submodule' | 'topic' | 'exercise' | 'analytics' | 'grading';
}

interface LogEntry {
  id: string;
  type: 'stdout' | 'stderr' | 'stdin' | 'system';
  content: string;
  timestamp: number;
}

// --- HELPER COMPONENTS ---

const ScoreIndicator = ({ score, maxScore }: { score: number; maxScore: number }) => {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full absolute left-0 transition-all duration-500 ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
      <span className={`text-[11px] font-semibold text-slate-600 ${montserrat.className}`}>
        {score} / {maxScore}
      </span>
    </div>
  );
};

const InteractiveTerminal = ({ isOpen, onClose, logs, isWaitingForInput, onInputSubmit, isRunning, language, onClear, inputPlaceholder = "Type input here..." }: any) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (isWaitingForInput && inputRef.current) setTimeout(() => inputRef.current?.focus(), 50);
  }, [logs, isWaitingForInput, isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed z-[100] flex flex-col shadow-2xl rounded-lg overflow-hidden border border-slate-800 bg-slate-950 ${inter.className} transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-6`}
      style={isMaximized ? { top: '20px', left: '20px', right: '20px', bottom: '20px', width: 'auto', height: 'auto' } : { bottom: '32px', right: '32px', width: '500px', height: '400px' }}>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-emerald-500" />
          <div>
            <span className={`text-xs font-bold text-slate-200 block ${montserrat.className}`}>Console Output</span>
            <span className="text-[10px] text-slate-500 font-mono uppercase">{language} • {isRunning ? 'Running' : 'Idle'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onClear} className="h-6 w-6 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded"><Trash2 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMaximized(!isMaximized)} className="h-6 w-6 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded">{isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded"><X className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 custom-scrollbar bg-slate-950 cursor-text">
        {logs.map((log: any) => (
          <div key={log.id} className="break-all whitespace-pre-wrap leading-relaxed">
            {log.type === 'stdout' && <span className="text-slate-300">{log.content}</span>}
            {log.type === 'stderr' && <span className="text-rose-400">{log.content}</span>}
            {log.type === 'system' && <span className="text-emerald-600/70 italic select-none">➜ {log.content}</span>}
            {log.type === 'stdin' && <span className="text-amber-400 font-bold flex items-start gap-1"><span className="text-slate-600 select-none">$</span> {log.content}</span>}
          </div>
        ))}
        {isRunning && !isWaitingForInput && <div className="flex items-center gap-2 mt-2"><Loader2 className="w-3 h-3 text-emerald-500 animate-spin" /><span className="text-slate-500 italic">Processing...</span></div>}
        {isWaitingForInput && (
          <form onSubmit={(e) => { e.preventDefault(); onInputSubmit(inputValue); setInputValue(""); }} className="flex items-center gap-2 mt-2">
            <span className="text-amber-500 font-bold select-none">{">"}</span>
            <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-amber-400 font-bold placeholder:text-slate-700/50 caret-amber-400" placeholder={inputPlaceholder} autoComplete="off" autoFocus />
          </form>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function EnhancedSubmissionReview() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- STATE ---
  const [courseId] = useState(searchParams.get('courseId') || '');

  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [search, setSearch] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<ExerciseAnswer | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<ExerciseQuestion | null>(null);
  const [submissionQuestion, setSubmissionQuestion] = useState<SubmissionQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grading'>('list');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [modalQuestion, setModalQuestion] = useState<ExerciseQuestion | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [questionListMinimized, setQuestionListMinimized] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [gradingStats, setGradingStats] = useState({ graded: 0, pending: 0, total: 0, averageScore: 0 });
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- EXECUTION & TERMINAL STATE ---
  const [showTerminal, setShowTerminal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [executionLanguage, setExecutionLanguage] = useState('javascript');
  const inputResolverRef = useRef<((value: string) => void) | null>(null);
  const [pyodideReady, setPyodideReady] = useState(false);
  const pyodideRef = useRef<any>(null);

  const exerciseId = searchParams.get('exerciseId');

  // --- HELPER: Map Language for Monaco ---
  const getMonacoLanguage = (lang: string) => {
    const languageMap: { [key: string]: string } = {
      javascript: 'javascript',
      typescript: 'typescript',
      python: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'csharp',
      sql: 'sql',
      plsql: 'sql'
    };
    return languageMap[lang?.toLowerCase()] || 'javascript';
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (courseId) fetchCourseData();
  }, [courseId]);

  useEffect(() => {
    if (exercises.length > 0) {
      let exercise: Exercise | undefined;

      if (exerciseId) {
        // Try to match by _id OR by exerciseId string
        exercise = exercises.find(ex => ex._id === exerciseId || ex.exerciseInformation.exerciseId === exerciseId);
      }

      // Fallback: If no match found or no ID provided, pick the first one
      if (!exercise && exercises.length > 0) {
        exercise = exercises[0];
      }

      if (exercise) {
        setSelectedExercise(exercise);
        buildBreadcrumb(exercise);
        calculateGradingStats();
      }
    }
  }, [exerciseId, exercises, courseData, participants]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (saveSuccess) {
      timer = setTimeout(() => { setSaveSuccess(false); }, 2000);
    }
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  // --- DATA FETCHING & LOGIC ---
  const getQuestionMaxScore = (exercise: Exercise, question: ExerciseQuestion): number => {
    if (!exercise.scoreSettings) return question.points;
    const { scoreType, levelBasedMarks, evenMarks, totalMarks, separateMarks } = exercise.scoreSettings;
    if (scoreType === 'separateMarks') {
      if (question.score !== undefined && question.score > 0) return question.score;
      if (separateMarks) {
        const questionIndex = exercise.questions.findIndex(q => q._id === question._id);
        if (questionIndex !== -1) {
          if (separateMarks.general && separateMarks.general[questionIndex] !== undefined) return separateMarks.general[questionIndex];
          const diff = question.difficulty?.toLowerCase() || 'easy';
          if (diff.includes('easy') && separateMarks.levelBased?.easy && separateMarks.levelBased.easy[questionIndex] !== undefined) return separateMarks.levelBased.easy[questionIndex];
          if (diff.includes('medium') && separateMarks.levelBased?.medium && separateMarks.levelBased.medium[questionIndex] !== undefined) return separateMarks.levelBased.medium[questionIndex];
          if (diff.includes('hard') && separateMarks.levelBased?.hard && separateMarks.levelBased.hard[questionIndex] !== undefined) return separateMarks.levelBased.hard[questionIndex];
        }
      }
    }
    if (scoreType === 'levelBasedMarks' && levelBasedMarks) {
      const diff = question.difficulty?.toLowerCase() || 'easy';
      if (diff.includes('easy')) return levelBasedMarks.easy || 0;
      if (diff.includes('medium')) return levelBasedMarks.medium || 0;
      if (diff.includes('hard')) return levelBasedMarks.hard || 0;
    }
    if (scoreType === 'evenMarks') {
      if (evenMarks !== undefined && evenMarks > 0) return evenMarks;
      if (totalMarks) {
        const count = exercise.questions.length || exercise.exerciseInformation.totalQuestions || 1;
        return parseFloat((totalMarks / count).toFixed(2));
      }
    }
    return question.points;
  };

  const getDynamicExerciseTotal = (exercise: Exercise | null) => {
    if (!exercise || !exercise.questions) return 0;
    return exercise.questions.reduce((acc, q) => acc + getQuestionMaxScore(exercise, q), 0);
  };

  const initEngines = async () => {
    try {
      if (!pyodideReady && (window as any).loadPyodide) {
        const pyodide = await (window as any).loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/" });
        pyodideRef.current = pyodide;
        setPyodideReady(true);
      }
    } catch (e) { console.error("Pyodide Load Error", e); }
    (window as any).getReactInput = () => new Promise((resolve) => { setIsWaitingForInput(true); inputResolverRef.current = resolve; });
  };

  const addLog = (type: LogEntry['type'], content: string) => {
    setTerminalLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), type, content, timestamp: Date.now() }]);
  };
  const clearTerminal = () => setTerminalLogs([]);
  const handleTerminalInput = (value: string) => {
    addLog('stdin', value);
    if (inputResolverRef.current) { inputResolverRef.current(value); inputResolverRef.current = null; }
    setIsWaitingForInput(false);
  };

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_API_URL}/getAll/courses-data/${courseId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setCourseData(result.data);
        const sortedParticipants = (result.data.singleParticipants || []).sort((a: any, b: any) => {
          const aHas = getExerciseAnswersForSelectedExercise(a).length > 0;
          const bHas = getExerciseAnswersForSelectedExercise(b).length > 0;
          return aHas && !bHas ? -1 : !aHas && bHas ? 1 : 0;
        });
        setParticipants(sortedParticipants);
        const allExercises: Exercise[] = [];
        if (result.data.modules) {
          result.data.modules.forEach((module: any) => module.subModules?.forEach((subModule: any) => subModule.topics?.forEach((topic: any) => {
            // EXTRACT FROM ALL POSSIBLE PEDAGOGY LOCATIONS
            if (topic.pedagogy?.We_Do?.practical) allExercises.push(...topic.pedagogy.We_Do.practical);
            if (topic.pedagogy?.We_Do?.project_development) allExercises.push(...topic.pedagogy.We_Do.project_development);
            if (topic.pedagogy?.You_Do?.practical) allExercises.push(...topic.pedagogy.You_Do.practical);
            if (topic.pedagogy?.You_Do?.project_development) allExercises.push(...topic.pedagogy.You_Do.project_development);
          })));
        }
        setExercises(allExercises);

        // Immediate check logic inside fetch in case useEffect is too slow
        if (exerciseId && allExercises.length > 0) {
          const exercise = allExercises.find(ex => ex._id === exerciseId || ex.exerciseInformation.exerciseId === exerciseId);
          if (exercise) {
            setSelectedExercise(exercise);
            buildBreadcrumb(exercise);
            calculateGradingStats();
          }
        }
      }
    } catch (err) { toast.error('Failed to load course data'); } finally { setLoading(false); }
  };
  // --- UNLOCK FUNCTIONALITY ---
  // --- UNLOCK EXERCISE API HANDLER ---
  // --- UNLOCK EXERCISE API HANDLER ---
  const handleUnlockExercise = async (participantId: string) => {
    if (!selectedExercise || !courseId) {
      toast.error("Missing course or exercise data");
      return;
    }


    console.log(selectedExercise)
    const token = localStorage.getItem('smartcliff_token') || '';
    const loadingToast = toast.loading("Unlocking exercise for student...");

    try {
      // 1. MATCH THE LOG EXACTLY
      // Your log showed: {"category":"You_Do","subcategory":"assesments"}
      const targetCategory = 'You_Do';
      const targetSubcategory = 'assesments'; // <--- MATCHING YOUR SPELLING FROM LOG

      const payload = {
        targetUserId: participantId,
        courseId: courseId,
        exerciseId: exerciseId,
        category: targetCategory,
        subcategory: targetSubcategory,
        status: 'in-progress',
        isLocked: false,
        reason: "Unlocked by Instructor via Grading Console"
      };

      console.log("🔓 Unlocking with payload:", payload);

      const response = await fetch(`${BACKEND_API_URL}/exercise/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success("Exercise unlocked successfully");
        fetchCourseData(); // Refresh data
      } else {
        throw new Error(result.message || "Failed to unlock");
      }
    } catch (error: any) {
      console.error("Unlock error:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Error unlocking exercise");
    }
  };
  const calculateGradingStats = () => {
    if (!selectedExercise) return;
    let studentsWithSubmissions = 0, studentsGraded = 0, totalScoreSum = 0, totalMaxPointsSum = 0;
    participants.forEach(participant => {
      const answers = getExerciseAnswersForSelectedExercise(participant);
      const hasSubmissions = answers.length > 0 && answers.some(a => a.questions && a.questions.length > 0);
      if (hasSubmissions) {
        studentsWithSubmissions++;
        const isGraded = answers.some(a => a.questions.some(q => q.status === 'evaluated'));
        if (isGraded) studentsGraded++;
        answers.forEach(a => a.questions.forEach(q => {
          if (q.status === 'evaluated') {
            totalScoreSum += q.score;
            const questionDetails = selectedExercise.questions.find(sq => sq._id === q.questionId);
            totalMaxPointsSum += questionDetails ? getQuestionMaxScore(selectedExercise, questionDetails) : 0;
          }
        }));
      }
    });
    setGradingStats({ graded: studentsGraded, total: studentsWithSubmissions, pending: studentsWithSubmissions - studentsGraded, averageScore: totalMaxPointsSum > 0 ? Math.round((totalScoreSum / totalMaxPointsSum) * 100) : 0 });
  };

  const buildBreadcrumb = (exercise: Exercise) => {
    if (!courseData || !exercise) return;
    const breadcrumbItems: BreadcrumbItem[] = [{ title: courseData.courseName || 'Course', icon: <Home className="h-3.5 w-3.5" />, type: 'course' }];
    let found = false;
    for (const module of courseData.modules || []) {
      for (const subModule of module.subModules || []) {
        for (const topic of subModule.topics || []) {
          const weDoPract = topic.pedagogy?.We_Do?.practical || [];
          const youDoPract = topic.pedagogy?.You_Do?.practical || [];
          const allEx = [...weDoPract, ...youDoPract];

          if (allEx.some(ex => ex._id === exercise._id)) {
            breadcrumbItems.push({ title: module.title, icon: <Layers className="h-3.5 w-3.5" />, type: 'module' }, { title: subModule.title, icon: <Folder className="h-3.5 w-3.5" />, type: 'submodule' });
            found = true; break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }
    breadcrumbItems.push({ title: exercise.exerciseInformation.exerciseName, icon: <FileCode className="h-3.5 w-3.5" />, type: 'exercise' });
    breadcrumbItems.push({ title: 'Grading Console', icon: <Award className="h-3.5 w-3.5" />, type: 'grading' });
    setBreadcrumb(breadcrumbItems);
  };

  const renderBreadcrumb = () => (
    <nav aria-label="Breadcrumb" className="flex items-center select-none">
      <ol className="flex items-center flex-wrap gap-y-1">
        {breadcrumb.map((item, index) => (
          <li key={index} className="flex items-center animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 30}ms` }}>
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 mx-1 shrink-0 stroke-[2.5]" />}
            <div className={`group flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 ${index === breadcrumb.length - 1 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100 hover:text-black cursor-pointer'}`} title={item.title}>
              <span className={`shrink-0 ${index === breadcrumb.length - 1 ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'}`}>{item.icon}</span>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${montserrat.className}`}>{item.title}</span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );

  const getExerciseAnswers = (participant: Participant) => {
    if (!participant.user.courses) return [];
    const course = participant.user.courses.find(c => c.courseId === courseId);
    if (!course || !course.answers) return [];

    // Aggregate answers from all possible locations
    const weDoAnswers = course.answers.We_Do?.practical || [];
    const youDoAnswers = course.answers.You_Do?.practical || [];
    // Add other categories if needed

    return [...weDoAnswers, ...youDoAnswers];
  };

  const getExerciseAnswersForSelectedExercise = (participant: Participant) => { const all = getExerciseAnswers(participant); return selectedExercise ? all.filter(a => a.exerciseId === selectedExercise._id) : all; };
  const getSubmissionForQuestion = (questionId: string) => {
    if (!selectedParticipant) return null;
    const answers = getExerciseAnswersForSelectedExercise(selectedParticipant);
    for (const answer of answers) {
      const submission = answer.questions.find(q => q.questionId === questionId);
      if (submission) return submission;
    }
    return null;
  };

  const handleStartGrading = (participant: Participant) => {
    setSaveSuccess(false); setSelectedParticipant(participant);
    const answers = getExerciseAnswersForSelectedExercise(participant);
    const firstAnswer = answers[0];
    let targetQuestion = selectedExercise?.questions[0];
    let initialScore = 0, initialFeedback = '', submissionFound = null;
    if (firstAnswer && firstAnswer.questions.length > 0) {
      const firstSubmission = firstAnswer.questions.find(q => q.codeAnswer && q.status !== 'evaluated') || firstAnswer.questions[0];
      if (firstSubmission) {
        submissionFound = firstSubmission;
        const question = selectedExercise?.questions.find(q => q._id === firstSubmission.questionId);
        if (question) { targetQuestion = question; initialScore = firstSubmission.score || 0; initialFeedback = firstSubmission.feedback || ''; }
      }
    }
    if (targetQuestion && selectedExercise) {
      setSelectedAnswer(firstAnswer); setSubmissionQuestion(submissionFound); setSelectedQuestion(targetQuestion); setScore(initialScore);
      setMaxScore(getQuestionMaxScore(selectedExercise, targetQuestion));
      setFeedbackText(initialFeedback);
      setCurrentQuestionIndex(selectedExercise?.questions.findIndex(q => q._id === targetQuestion?._id) || 0);
    }
    setViewMode('grading');
  };

  const handleStudentChange = (id: string) => { const p = participants.find(p => p._id === id); if (p) handleStartGrading(p); };
  const handleNextStudent = () => { if (!selectedParticipant) return; const idx = participants.findIndex(p => p._id === selectedParticipant._id); if (idx < participants.length - 1) handleStartGrading(participants[idx + 1]); else toast.success('End of list'); };
  const handlePrevStudent = () => { if (!selectedParticipant) return; const idx = participants.findIndex(p => p._id === selectedParticipant._id); if (idx > 0) handleStartGrading(participants[idx - 1]); };
  const getCurrentStudentIndex = () => selectedParticipant ? participants.findIndex(p => p._id === selectedParticipant._id) : 0;
  const getTotalStudents = () => participants.length;

  const handleQuestionClick = (question: ExerciseQuestion, index: number) => {
    setSaveSuccess(false); setSelectedQuestion(question); setCurrentQuestionIndex(index);
    if (selectedExercise) {
      const allowedMax = getQuestionMaxScore(selectedExercise, question);
      setMaxScore(allowedMax);
      const submission = getSubmissionForQuestion(question._id);
      if (submission) { setSubmissionQuestion(submission); setScore(Math.min(submission.score || 0, allowedMax)); setFeedbackText(submission.feedback || ''); }
      else { setSubmissionQuestion(null); setScore(0); setFeedbackText(''); }
    }
  };

  const getStatusDot = (sub: SubmissionQuestion | null) => !sub ? 'bg-slate-300' : sub.status === 'evaluated' ? 'bg-emerald-500' : sub.codeAnswer ? 'bg-amber-500' : 'bg-slate-300';

  const saveGrade = async (): Promise<boolean> => {
    if (!selectedQuestion || !selectedParticipant || !selectedExercise) return false;
    if (score > maxScore) { toast.error(`Score cannot exceed ${maxScore}`); setScore(maxScore); return false; }
    setIsSaving(true); setSaveSuccess(false);
    try {
      const token = localStorage.getItem('smartcliff_token') || '';
      let submissionLanguage = 'plaintext';
      const answers = getExerciseAnswers(selectedParticipant);
      const targetAnswerGroup = selectedAnswer || answers.find((a: any) => a.questions.some((q: any) => q.questionId === selectedQuestion._id));
      if (targetAnswerGroup) {
        const qSub = targetAnswerGroup.questions.find((q: any) => q.questionId === selectedQuestion._id);
        if (qSub && qSub.language) submissionLanguage = qSub.language;
      }
      const payload = {
        courseId, exerciseId: selectedExercise._id, exerciseName: selectedExercise.exerciseInformation.exerciseName, participantId: selectedParticipant.user._id, questionId: selectedQuestion._id, questionTitle: selectedQuestion.title,
        score, totalScore: selectedQuestion.score, feedback: feedbackText, status: 'evaluated', language: submissionLanguage, category: 'We_Do', subcategory: 'practical'
      };
      const response = await fetch(`${BACKEND_API_URL}/users/update/submission-score`, { method: 'POST', headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok && !result.success) throw new Error(result.message || 'Failed to save');

      // Optimistic update
      const updatedParticipants = [...participants];
      const pIdx = updatedParticipants.findIndex(p => p._id === selectedParticipant._id);
      if (pIdx !== -1) {
        const participant = updatedParticipants[pIdx];
        const answers = getExerciseAnswers(participant);
        const ansIdx = selectedAnswer ? answers.findIndex(a => a._id === selectedAnswer._id) : -1;
        if (ansIdx !== -1) {
          const answer = answers[ansIdx];
          const qIdx = answer.questions.findIndex(q => q.questionId === selectedQuestion._id);
          const newStatus = 'evaluated';
          if (qIdx !== -1) {
            answer.questions[qIdx] = { ...answer.questions[qIdx], score, feedback: feedbackText, isCorrect: (score / maxScore) * 100 >= 60, status: newStatus };
          } else {
            answer.questions.push({ _id: Math.random().toString(), questionId: selectedQuestion._id, codeAnswer: "", language: submissionLanguage, isCorrect: (score / maxScore) * 100 >= 60, score, status: newStatus, attemScore: 0, submittedAt: new Date().toISOString(), feedback: feedbackText });
          }
          setParticipants(updatedParticipants);
          setSaveSuccess(true);
          return true;
        } else {
          await fetchCourseData();
          setSaveSuccess(true);
          return true;
        }
      }
      return false;
    } catch (err) { console.error(err); toast.error('Failed to save'); return false; } finally { setIsSaving(false); }
  };

  const handleSaveAndNext = async () => {
    if (await saveGrade()) {
      setTimeout(() => {
        if (selectedExercise && currentQuestionIndex < selectedExercise.questions.length - 1) {
          handleQuestionClick(selectedExercise.questions[currentQuestionIndex + 1], currentQuestionIndex + 1);
        } else {
          if (getCurrentStudentIndex() < getTotalStudents() - 1) handleNextStudent();
          else { toast.success('All graded!'); setViewMode('list'); }
        }
      }, 800);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('fromAnalytics', 'true');
    router.push(`/lms/pages/coursestructure/uploadcourseresources?${params.toString()}`);
  };

  const initiateRunCode = async () => {
    if (!submissionQuestion?.codeAnswer) { toast.error('No code'); return; }
    const lang = submissionQuestion.language || 'javascript';
    setExecutionLanguage(lang); setShowTerminal(true); clearTerminal();
    if (lang === 'python') {
      if (!pyodideReady) { toast.loading("Loading Python...", { duration: 2000 }); await initEngines(); }
      setIsExecuting(true); addLog('system', 'Initializing Python...');
      try {
        pyodideRef.current.setStdout({ batched: (msg: string) => addLog('stdout', msg) });
        pyodideRef.current.setStderr({ batched: (msg: string) => addLog('stderr', msg) });
        const preamble = `import js\nimport asyncio\nimport builtins\nasync def _async_input(prompt=""):\n if prompt: print(prompt, end="")\n return await js.getReactInput()\nbuiltins.input = _async_input\n`;
        await pyodideRef.current.runPythonAsync(preamble + "\n" + submissionQuestion.codeAnswer.replace(/input\s*\(/g, "await input("));
        addLog('system', 'Execution Finished');
      } catch (err: any) { addLog('stderr', err.message || String(err)); } finally { setIsExecuting(false); setIsWaitingForInput(false); }
      return;
    }
    setIsExecuting(true); addLog('system', `Preparing ${lang}...`);
    const needsInput = ['java', 'c', 'cpp'].some(l => lang.includes(l)) && (submissionQuestion.codeAnswer.includes('Scanner') || submissionQuestion.codeAnswer.includes('scanf') || submissionQuestion.codeAnswer.includes('cin'));
    let stdin = "";
    if (needsInput) {
      addLog('system', 'Batch Input Required. Enter inputs separated by spaces/newlines.');
      setIsWaitingForInput(true);
      stdin = await new Promise<string>((resolve) => { inputResolverRef.current = resolve; });
      addLog('system', 'Input received.');
    }
    try {
      const getPistonLang = (l: string) => ({ javascript: { language: "javascript", version: "18.15.0" }, java: { language: "java", version: "15.0.2" }, cpp: { language: "cpp", version: "10.2.0" }, c: { language: "c", version: "10.2.0" } }[l] || { language: "javascript", version: "18.15.0" });
      const config = getPistonLang(lang);
      const res = await fetch(PISTON_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: config.language, version: config.version, files: [{ content: submissionQuestion.codeAnswer }], stdin }) });
      const data = await res.json();
      if (data.run) {
        if (data.run.stdout) addLog('stdout', data.run.stdout);
        if (data.run.stderr) addLog('stderr', data.run.stderr);
        addLog('system', `Exited (Time: ${data.run.time || 0}ms)`);
      } else addLog('stderr', 'Execution failed.');
    } catch (err: any) { addLog('stderr', `Execution failed: ${err.message}`); } finally { setIsExecuting(false); setIsWaitingForInput(false); }
  };

  const filteredParticipants = participants.filter(p => !search || `${p.user.firstName} ${p.user.lastName}`.toLowerCase().includes(search.toLowerCase()));
  const filteredQuestions = useMemo(() => !selectedExercise ? [] : difficultyFilter === 'all' ? selectedExercise.questions : selectedExercise.questions.filter(q => q.difficulty.toLowerCase() === difficultyFilter.toLowerCase()), [selectedExercise, difficultyFilter]);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div>;

  // SAFEGUARD: If no exercise is found yet (and not loading), show error
  if (!selectedExercise) {
    return <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-500">
      <AlertCircle className="w-10 h-10 mb-4 text-slate-400" />
      <h3 className={`text-lg font-bold text-slate-700 mb-2 ${montserrat.className}`}>Assessment Not Found</h3>
      <p className="mb-6 max-w-sm text-center">We couldn't locate the specific exercise ID from the course data. This might be due to a mismatch in IDs or the exercise being in a different module.</p>

      {/* FALLBACK ACTIONS */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={handleBack} className={montserrat.className}>Go Back</Button>
        {exercises.length > 0 && (
          <Button onClick={() => setSelectedExercise(exercises[0])} className={`bg-indigo-600 hover:bg-indigo-700 ${montserrat.className}`}>Load First Available</Button>
        )}
      </div>
    </div>;
  }

  return (
    <div className={`h-screen flex flex-col bg-white overflow-hidden ${inter.className}`}>
      <Toaster position="top-center" richColors />
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" onLoad={initEngines} strategy="afterInteractive" />
      <InteractiveTerminal isOpen={showTerminal} onClose={() => setShowTerminal(false)} logs={terminalLogs} isRunning={isExecuting} isWaitingForInput={isWaitingForInput} onInputSubmit={handleTerminalInput} language={executionLanguage} onClear={clearTerminal} />

      {/* HEADER */}
      <div className="flex-none z-50 border-b border-slate-200 bg-white px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 flex-1 mr-6 min-w-0">
            {viewMode !== 'grading' && <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" /></Button>}
            {renderBreadcrumb()}
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <Button variant="outline" size="sm" onClick={fetchCourseData} className={`h-9 px-4 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-50 rounded-md shadow-sm transition-all ${montserrat.className}`}>
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sync Data
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'list' ? (
          /* STUDENT LIST VIEW */
          <div className="flex flex-col h-full bg-white">
            {/* Stats Cards */}
            <div className="flex-none w-full px-6 py-8 bg-slate-50/50 border-b border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Enrollment", val: participants.length, icon: Users, style: "bg-indigo-50 text-indigo-600", border: "hover:border-indigo-200" },
                  { label: "Submissions", val: gradingStats.total, icon: Send, style: "bg-emerald-50 text-emerald-600", border: "hover:border-emerald-200" },
                  { label: "Evaluated", val: gradingStats.graded, icon: CheckCircle, style: "bg-blue-50 text-blue-600", border: "hover:border-blue-200" },
                  { label: "Awaiting", val: participants.length - gradingStats.total, icon: Clock, style: "bg-slate-100 text-slate-600", border: "hover:border-slate-300" }
                ].map((stat, i) => (
                  <div key={i} className={`group bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 ${stat.border}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <p className={`text-xs font-semibold uppercase tracking-wider text-slate-500 ${montserrat.className}`}>{stat.label}</p>
                        <h3 className={`text-2xl font-bold text-slate-800 ${montserrat.className}`}>{stat.val}</h3>
                      </div>
                      <div className={`p-3 rounded-full flex items-center justify-center ${stat.style}`}><stat.icon className="w-5 h-5" strokeWidth={2.5} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Search Bar */}
            <div className="flex-none px-6 py-5 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className={`text-lg font-bold text-slate-900 ${montserrat.className}`}>Repository Review</h1>
                    <Badge variant="outline" className={`bg-indigo-50/50 text-indigo-600 border-indigo-100 font-semibold px-2 py-0 text-[10px] uppercase ${montserrat.className}`}>{selectedExercise.exerciseInformation.exerciseName}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">{filteredParticipants.length} students • {selectedExercise.questions.length} questions</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input placeholder="Search students..." className="pl-9 h-9 text-xs w-64 border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            {/* Table */}
            <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className={`w-12 px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center ${montserrat.className}`}>No.</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${montserrat.className}`}>Student Identity</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${montserrat.className}`}>Grading Status</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center ${montserrat.className}`}>Progress</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center ${montserrat.className}`}>Result</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center ${montserrat.className}`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.map((participant, index) => {
                    const answers = getExerciseAnswersForSelectedExercise(participant);
                    const hasSubmissions = answers.length > 0;
                    const totalScore = answers.reduce((sum, a) => sum + a.questions.reduce((s, q) => s + q.score, 0), 0);
                    const max = getDynamicExerciseTotal(selectedExercise);
                    const isGraded = answers.some(a => a.questions.some(q => q.status === 'evaluated'));
                    return (
                      <TableRow key={participant._id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors group">
                        <TableCell className="px-4 py-3 text-center"><span className={`text-xs font-semibold text-slate-400 group-hover:text-indigo-500 ${montserrat.className}`}>{String(index + 1).padStart(2, '0')}</span></TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold rounded-md shadow-sm ${montserrat.className}`}>{participant.user.firstName[0]}{participant.user.lastName[0]}</div>
                            <div>
                              <div className={`text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors ${montserrat.className}`}>{participant.user.firstName} {participant.user.lastName}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{participant.user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">{hasSubmissions ? <Badge className={`font-bold text-[9px] uppercase tracking-wider py-0.5 px-2 border-none rounded ${isGraded ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"} ${montserrat.className}`}>{isGraded ? 'Evaluated' : 'Needs Review'}</Badge> : <Badge variant="outline" className={`text-[9px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50 border-slate-200 py-0.5 px-2 rounded ${montserrat.className}`}>No Action</Badge>}</TableCell>
                        <TableCell className="px-4 py-3 text-center"><div className={`text-xs font-bold text-slate-600 ${montserrat.className}`}>{answers.reduce((count, a) => count + a.questions.filter(q => q.codeAnswer).length, 0)}<span className="text-slate-300 mx-1">/</span>{selectedExercise.questions.length}</div></TableCell>
                        <TableCell className="px-4 py-3 text-center"><div className="flex flex-col items-center"><div className={`flex items-center gap-1 mb-1 ${montserrat.className}`}><span className="text-xs font-bold text-slate-900">{totalScore}</span><span className="text-xs font-bold text-slate-400">/</span><span className="text-xs font-bold text-slate-500">{max}</span></div><ScoreIndicator score={totalScore} maxScore={max} /></div></TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Existing Grading Button */}
                            <Button
                              variant={hasSubmissions ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleStartGrading(participant)}
                              className={`h-8 px-4 text-[10px] font-bold rounded-md transition-all shadow-sm ${montserrat.className} ${hasSubmissions ? 'bg-slate-900 hover:bg-indigo-600 text-white border-transparent' : 'border-slate-200 text-slate-600 bg-white hover:text-indigo-600'}`}
                            >
                              {isGraded ? 'View Details' : 'Start Grading'}
                            </Button>

                            {/* NEW: Dropdown Menu for Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  // Pass the participant ID AND the specific exercise ID you want to unlock
                                  onClick={() => handleUnlockExercise(participant.user._id, selectedExercise._id)}

                                  className="text-xs font-medium cursor-pointer text-slate-600 focus:text-indigo-600 focus:bg-indigo-50"
                                >
                                  <Unlock className="mr-2 h-3.5 w-3.5" />
                                  <span>Unlock Exercise</span>
                                </DropdownMenuItem>

                                {/* You can add Lock here too if needed */}
                                {/* <DropdownMenuItem 
           onClick={() => handleLockExercise(participant.user._id)} // You would need a handleLock function similar to handleUnlock
           className="text-xs font-medium cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
         >
           <Lock className="mr-2 h-3.5 w-3.5" />
           <span>Lock Access</span>
         </DropdownMenuItem> 
         */}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* GRADING VIEW (SPLIT SCREEN) */
          <div className="h-full overflow-hidden bg-white flex flex-col">
            <div className="flex-none border-b border-slate-200 bg-white px-2 py-1">
              <div className="flex items-center justify-between w-full bg-white px-6 py-3">
                <div className="flex items-center">
                  <Button variant="outline" size="sm" onClick={() => setViewMode('list')} className={`h-9 px-4 text-xs font-bold text-slate-600 border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 rounded-full group ${montserrat.className}`}>
                    <ArrowLeft className="h-3.5 w-3.5 mr-2 text-slate-400 group-hover:text-rose-500 transition-colors" /> Exit Panel
                  </Button>
                </div>
                <div className="flex items-center space-x-6">
                  {selectedParticipant && (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                        <span className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${montserrat.className}`}>Current Student</span>
                      </div>
                      <span className={`text-sm font-bold text-slate-800 leading-none ${montserrat.className}`}>{selectedParticipant.user.firstName} {selectedParticipant.user.lastName}</span>
                    </div>
                  )}
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={handlePrevStudent} disabled={getCurrentStudentIndex() === 0} className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-full"><ChevronLeft className="h-5 w-5" /></Button>
                    <Select value={selectedParticipant?._id} onValueChange={handleStudentChange}>
                      <SelectTrigger className={`h-9 border border-slate-200 bg-slate-50 focus:ring-0 px-3 min-w-[200px] text-xs font-bold text-slate-700 justify-between rounded-full hover:border-indigo-300 hover:bg-white transition-all ${montserrat.className}`}>
                        <div className="flex items-center gap-2"><div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200"><User className="h-3 w-3 text-indigo-500" /></div><span>{selectedParticipant ? `${selectedParticipant.user.firstName} ${selectedParticipant.user.lastName}` : "Select Student"}</span></div>
                      </SelectTrigger>
                      <SelectContent align="end" className="max-h-[300px]">
                        {participants.map(p => (
                          <SelectItem key={p._id} value={p._id} className={`text-xs font-medium cursor-pointer py-2 ${montserrat.className}`}>
                            <div className="flex items-center gap-2"><div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><User className="h-3.5 w-3.5 text-slate-400" /></div><span>{p.user.firstName} {p.user.lastName}</span></div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={handleNextStudent} disabled={getCurrentStudentIndex() === getTotalStudents() - 1} className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-full"><ChevronRight className="h-5 w-5" /></Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* QUESTION SIDEBAR */}
              <div className={`${questionListMinimized ? 'w-14' : 'w-72'} border-r border-slate-100 bg-white transition-all duration-300 flex flex-col`}>
                {!questionListMinimized ? (
                  <>
                    <div className="p-4 border-b border-slate-50 flex-shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${montserrat.className}`}>Assessment Qs</h3>
                        <Button variant="ghost" size="sm" onClick={() => setQuestionListMinimized(true)} className="h-6 w-6 p-0 hover:bg-slate-50 rounded-md text-slate-400"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap ${montserrat.className}`}>Select Level</Label>
                        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                          <SelectTrigger className="h-8 text-xs font-semibold border-slate-200 rounded-md bg-slate-50/50 flex-1"><SelectValue placeholder="All" /></SelectTrigger>
                          <SelectContent><SelectItem value="all">All Questions</SelectItem><SelectItem value="easy">Easy Level</SelectItem><SelectItem value="medium">Medium Level</SelectItem><SelectItem value="hard">Hard Level</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-0 py-2 space-y-0 custom-scrollbar">
                      {filteredQuestions.map((question, index) => {
                        const submission = getSubmissionForQuestion(question._id);
                        const isCurrent = selectedQuestion?._id === question._id;
                        const hasSubmission = !!submission?.codeAnswer;
                        const allowedMax = selectedExercise ? getQuestionMaxScore(selectedExercise, question) : question.points;
                        const getDiffStyle = (diff: string) => { switch (diff?.toLowerCase()) { case 'hard': return 'text-rose-600 bg-rose-50 border-rose-100'; case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100'; default: return 'text-emerald-600 bg-emerald-50 border-emerald-100'; } };
                        return (
                          <div key={question._id} onClick={() => handleQuestionClick(question, index)} className={`group flex items-center justify-between gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${isCurrent ? 'bg-indigo-50' : 'hover:bg-slate-50'} ${!hasSubmission ? 'opacity-90' : ''}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDot(submission)}`} />
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs font-bold ${montserrat.className} ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>{index + 1}.</span>
                                <span className={`text-sm font-medium truncate ${isCurrent ? 'text-indigo-900' : 'text-slate-700'}`}>{question.title}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getDiffStyle(question.difficulty)}`}>{question.difficulty}</span>
                              <span className={`text-[10px] font-bold ${submission?.score ? 'text-indigo-600' : 'text-slate-400'} ${montserrat.className}`}>{submission?.score || 0} / {allowedMax}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center pt-4 space-y-3">
                    <Button variant="ghost" size="sm" onClick={() => setQuestionListMinimized(false)} className="h-8 w-8 rounded-full"><ChevronRight className="h-4 w-4" /></Button>
                    {selectedExercise?.questions.map((_, index) => {
                      const submission = getSubmissionForQuestion(selectedExercise.questions[index]._id);
                      const hasSubmission = !!submission?.codeAnswer;
                      return (
                        <div key={index} className={`w-8 h-8 flex items-center justify-center rounded-md text-[10px] font-bold transition-all cursor-pointer ${montserrat.className} ${selectedQuestion?._id === selectedExercise.questions[index]._id ? 'bg-indigo-600 text-white' : !hasSubmission ? 'bg-rose-50 text-rose-300 border border-rose-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`} onClick={() => handleQuestionClick(selectedExercise.questions[index], index)}>{index + 1}</div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* CENTRAL CODE AREA (CONDITIONAL RENDER) */}
              <div className="flex-1 border-r border-slate-100 flex flex-col bg-white">
                {/* Check if module is Frontend */}
                {selectedExercise?.programmingSettings?.selectedModule === 'Frontend' ? (
                  <AdminFrontendCompiler
                    title={selectedQuestion?.title}
                    codeAnswer={submissionQuestion?.codeAnswer || ""}
                    readOnly={true}
                    selectedLanguages={selectedExercise?.programmingSettings?.selectedLanguages || []}
                  />
                ) : (
                  // STANDARD MONACO EDITOR VIEW
                  <>
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-50 flex-shrink-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-md"><FileCode className="h-4 w-4 text-indigo-600" /></div>
                        <div>
                          <h3 className={`text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight ${montserrat.className}`}>Source Code <Badge variant="outline" className={`text-[9px] font-bold bg-slate-900 text-white border-none py-0 px-1.5 ${montserrat.className}`}>{submissionQuestion?.language || 'plain'}</Badge></h3>
                          <p className={`text-[10px] text-slate-500 font-semibold uppercase tracking-wide leading-none mt-0.5 ${montserrat.className}`}>Question {currentQuestionIndex + 1}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowQuestionModal(true)} className={`h-8 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md ${montserrat.className}`}><FileQuestion className="h-3.5 w-3.5 mr-2" /> Question Details</Button>
                        {submissionQuestion?.codeAnswer && (
                          <>
                            <Button variant="outline" size="sm" onClick={initiateRunCode} className={`h-8 px-3 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-md ${montserrat.className}`}><Play className="h-3 w-3 mr-1.5 fill-current" /> Execute</Button>
                            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(submissionQuestion.codeAnswer); toast.success('Copied'); }} className={`h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 rounded-md ${montserrat.className}`}><Copy className="h-3 w-3 mr-1.5" /> Copy</Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                      {submissionQuestion?.codeAnswer ? (
                        <div className="h-full w-full">
                          <MonacoEditor
                            height="100%"
                            language={getMonacoLanguage(submissionQuestion.language || 'javascript')}
                            theme="vs-dark"
                            value={submissionQuestion.codeAnswer}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              fontSize: 13,
                              padding: { top: 16, bottom: 16 },
                              lineNumbers: 'on',
                              renderLineHighlight: 'all',
                              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                              fontLigatures: true,
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4 border border-slate-800"><Code className="h-6 w-6 text-slate-600" /></div>
                          <h4 className={`text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 ${montserrat.className}`}>No Code Found</h4>
                          <p className="text-xs text-slate-600 max-w-xs font-medium leading-relaxed">The student has not submitted any code for this question yet. You can still grade it manually.</p>
                        </div>
                      )}

                      <div className="absolute bottom-4 right-6 flex items-center gap-3 pointer-events-none">
                        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 flex items-center gap-3">
                          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div><span className={`text-[9px] font-bold text-slate-400 uppercase tracking-widest ${montserrat.className}`}>Ready</span></div>
                          <Separator orientation="vertical" className="h-3 bg-slate-800" />
                          <span className={`text-[9px] font-bold text-indigo-400 uppercase tracking-widest ${montserrat.className}`}>UTF-8</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* GRADING SIDEBAR (RIGHT) */}
              <div className="w-72 flex flex-col bg-white">
                <div className="p-5 h-full flex flex-col gap-6">
                  <div>
                    <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 ${montserrat.className}`}><Award className="h-3.5 w-3.5 text-amber-500" /> Grading</h3>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between mb-2">
                          <Label className={`text-xs font-bold text-slate-700 ${montserrat.className}`}>Score Awarded</Label>
                          <span className={`text-[10px] font-semibold text-slate-500 ${montserrat.className}`}>Max: {maxScore}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input type="number" min="0" max={maxScore} value={score} onChange={(e) => { const val = e.target.value === '' ? 0 : parseInt(e.target.value); setScore(Math.min(maxScore, Math.max(0, val))); }} className={`h-9 bg-white border-slate-300 text-sm font-bold text-slate-900 ${montserrat.className}`} />
                          <div className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-400"><Award className="h-4 w-4" /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                    <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 ${montserrat.className}`}><MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> Feedback</h3>
                    <Textarea placeholder="Enter your observations or corrections here..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="flex-1 bg-slate-50 border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-700 resize-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all custom-scrollbar" />
                  </div>

                  <div className="pt-4 border-t border-slate-50 relative">
                    {saveSuccess && (
                      <div className="absolute -top-3 left-0 right-0 flex justify-center animate-in slide-in-from-bottom-2 fade-in duration-300 pointer-events-none">
                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-emerald-100">
                          <Check className="h-3 w-3" /><span className={`text-[10px] font-bold uppercase tracking-wide ${montserrat.className}`}>Saved</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => saveGrade()} disabled={isSaving} className={`flex-1 h-10 text-[10px] font-bold uppercase tracking-wide border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 ${montserrat.className}`}>{isSaving ? 'Saving...' : 'Save'}</Button>
                      <Button onClick={handleSaveAndNext} disabled={isSaving} className={`flex-1 h-10 text-[10px] font-bold uppercase tracking-wide bg-slate-900 hover:bg-indigo-600 text-white rounded-md shadow-sm transition-all ${montserrat.className}`}>{isSaving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Saving...</> : 'Save & Next'}</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUESTION MODAL */}
      <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
        <DialogContent className={`max-w-3xl rounded-xl border-none shadow-2xl p-0 overflow-hidden bg-white ${inter.className}`}>
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 pb-4 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <DialogTitle className={`text-lg font-bold text-slate-900 uppercase tracking-tight ${montserrat.className}`}>Question Profile</DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowQuestionModal(false)} className="rounded-full h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
              </div>
            </DialogHeader>
            {modalQuestion || selectedQuestion ? (
              <ScrollArea className="flex-1 p-6 max-h-[70vh] custom-scrollbar">
                <div className="space-y-6">
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                    <h2 className={`text-base font-bold text-white mb-3 leading-tight ${montserrat.className}`}>{modalQuestion?.title || selectedQuestion?.title}</h2>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`bg-white text-slate-950 font-bold text-[9px] uppercase tracking-wide border-none px-2.5 py-0.5 ${montserrat.className}`}>{selectedExercise ? getQuestionMaxScore(selectedExercise, modalQuestion || selectedQuestion!) : (modalQuestion?.points || selectedQuestion?.points)} Points</Badge>
                      <Badge variant="outline" className={`border-slate-800 text-slate-400 font-bold text-[9px] uppercase tracking-wide px-2.5 py-0.5 ${montserrat.className}`}>Time: {modalQuestion?.timeLimit || selectedQuestion?.timeLimit}s</Badge>
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ${montserrat.className}`}>Context & Requirements</h3>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">{modalQuestion?.description || selectedQuestion?.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(modalQuestion?.sampleInput || selectedQuestion?.sampleInput) && (
                      <div className="space-y-2">
                        <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${montserrat.className}`}>Input Pattern</h3>
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800"><pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap">{modalQuestion?.sampleInput || selectedQuestion?.sampleInput}</pre></div>
                      </div>
                    )}
                    {(modalQuestion?.sampleOutput || selectedQuestion?.sampleOutput) && (
                      <div className="space-y-2">
                        <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${montserrat.className}`}>Expected Output</h3>
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800"><pre className="text-[10px] font-mono text-indigo-400 whitespace-pre-wrap">{modalQuestion?.sampleOutput || selectedQuestion?.sampleOutput}</pre></div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            ) : null}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setShowQuestionModal(false)} className={`bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wide px-6 rounded-md h-9 ${montserrat.className}`}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}