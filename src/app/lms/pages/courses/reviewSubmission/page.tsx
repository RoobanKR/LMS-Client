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
  MoreVertical,
  Lock,
  Unlock,
  XCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import StaffFrontendReview from './components/StaffFrontendReview';
import StaffCodeReview from './components/StaffCodeReview';
import { NotionPagesViewer, PageData as NotionPageData } from '@/app/lms/component/student/OthersNotionEditor';

// Dynamically Import Monaco Editor
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
const BACKEND_API_URL = "http://localhost:5533";
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";

// --- INTERFACES ---
interface MCQOption {
  _id?: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
}

interface ExerciseQuestion {
  _id: string;
  title?: string;
  description?: string | { text?: string; imageUrl?: string; contentBlocks?: any[] };
  points?: number;
  score?: number;
  timeLimit?: number;
  memoryLimit?: number;
  difficulty?: string;
  sampleInput?: string;
  sampleOutput?: string;
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
  questionType?: 'MCQ' | 'Programming';
  mcqQuestionTitle?: string | any[];
  mcqQuestionDescription?: string;
  mcqQuestionType?: 'multiple_choice' | 'dropdown' | 'short_answer' | 'essay' | 'checkboxes';
  mcqQuestionDifficulty?: string;
  mcqQuestionOptions?: MCQOption[];
  mcqQuestionCorrectAnswers?: string[];
  mcqQuestionTimeLimit?: number;
  mcqQuestionScore?: number;
  // Others question fields
  othersQuestionType?: 'notion' | 'file-upload';
  notionSettings?: {
    allowBold?: boolean;
    allowItalic?: boolean;
    allowUnderline?: boolean;
    allowOrderedList?: boolean;
    allowUnorderedList?: boolean;
    allowHeading?: boolean;
    allowLink?: boolean;
    allowImage?: boolean;
  };
  fileUploadSettings?: {
    allowedTypes?: string[];
    maxFiles?: number;
    maxFileSizeMB?: number;
  };
  othersDescription?: {
    text?: string;
    html?: string;
    images?: Array<string | { url: string; alt?: string; alignment?: string; sizePercent?: number }>;
    attachments?: Array<{ name: string; url: string; mimeType: string }>;
  };
  // content blocks system (new)
  questionContent?: Array<{
    id: string; type: 'text' | 'image';
    value?: string; url?: string;
    alignment?: 'left' | 'center' | 'right'; sizePercent?: number;
  }>;
  // top-level attachments (mirrors othersDescription.attachments)
  attachments?: Array<{ name: string; url: string; mimeType: string }>;
  // legacy image fields (backward compat)
  descriptionImageUrl?: string;
  descriptionImageAlignment?: 'left' | 'center' | 'right';
  descriptionImageSizePercent?: number;
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
    totalMarksMCQ?: number;
    totalMarksProgramming?: number;
    totalMarks?: number;
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
    levelScoringConfiguration?: {
      easy?: { totalMarks: number; marksPerQuestion: number; questionCount: number };
      medium?: { totalMarks: number; marksPerQuestion: number; questionCount: number };
      hard?: { totalMarks: number; marksPerQuestion: number; questionCount: number };
    };
  };
  questions: ExerciseQuestion[];
  exerciseType?: 'MCQ' | 'Programming' | 'Combined' | 'Other';
  nodeType?: string;
  createdAt: string;
  questionConfiguration?: {
    mcqQuestionConfiguration?: {
      totalMcqQuestions: number;
      marksPerQuestion: number;
      mcqTotalMarks: number;
      scoringType: string;
    };
    programmingQuestionConfiguration?: {
      questionConfigType: string;
      generalQuestionCount?: number;
      scoreSettings?: any;
    };
  };
  _category?: string;
  _subcategory?: string;
  _topicId?: string;
  _moduleId?: string;
  _subModuleId?: string;
  _subTopicId?: string;
  isGraded?: boolean;

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
  attemptCount?: number;
  nodeType?: string;
  files?: Array<{
    id: string;
    filename: string;
    content: string;
    language: string;
    path: string;
    folderPath: string;
    isEntryPoint?: boolean;
  }>;
  folders?: Array<{
    id: string;
    name: string;
    path: string;
    parentPath: string;
    depth: number;
  }>;
  othersFiles?: Array<{
    name: string;
    url: string;
    mimeType: string;
  }>;
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
  lateSubmission?: boolean;
  lastTestSubmittedAt?: string;
  userAttempts?: number;
  testSubmissions?: number;
}

interface UserCourse {
  courseId: string;
  answers?: {
    We_Do?: any;
    You_Do?: any;
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
  pedagogy?: any;
  subModules?: Array<{
    _id: string;
    title: string;
    pedagogy?: any;
    topics?: Array<{
      _id: string;
      title: string;
      pedagogy?: any;
      subTopics?: Array<{
        _id: string;
        title: string;
        pedagogy?: any;
      }>;
    }>;
  }>;
  topics?: Array<{
    _id: string;
    title: string;
    pedagogy?: any;
    subTopics?: Array<{
      _id: string;
      title: string;
      pedagogy?: any;
    }>;
  }>;
}

interface CourseData {
  _id: string;
  courseName: string;
  courseCode?: string;
  modules: CourseModule[];
  singleParticipants: Participant[];
}

interface BreadcrumbItem {
  title: string;
  icon: React.ReactNode;
  type: 'course' | 'module' | 'submodule' | 'topic' | 'subtopic' | 'exercise' | 'analytics' | 'grading';
}

interface LogEntry {
  id: string;
  type: 'stdout' | 'stderr' | 'stdin' | 'system';
  content: string;
  timestamp: number;
}

interface FrontendSubmissionData {
  _id: string;
  exerciseId: string;
  questionId: string;
  files: Array<{
    id: string;
    filename: string;
    content: string;
    language: string;
    path: string;
    folderPath: string;
    isEntryPoint?: boolean;
  }>;
  folders: Array<{
    id: string;
    name: string;
    path: string;
    parentPath: string;
    depth: number;
  }>;
  status: string;
  score?: number;
  feedback?: string;
  submittedAt: string;
  attemptCount: number;
  participantName?: string;
  participantEmail?: string;
  lateSubmission?: boolean;
  lastTestSubmittedAt?: string;
}

// --- HELPER FUNCTIONS ---
const extractMCQTitleText = (title: string | any[] | undefined): string => {
  if (!title) return "MCQ Question";
  if (typeof title === 'string') return title;
  if (Array.isArray(title)) {
    const textBlocks = title
      .filter(block => block.type === 'text')
      .map(block => block.value)
      .join(' ');
    return textBlocks || "MCQ Question";
  }
  return "MCQ Question";
};

const getQuestionTitle = (question: ExerciseQuestion): string => {
  if (!question) return "Question";
  if (question.questionType === 'MCQ' || (!question.title && question.mcqQuestionTitle)) {
    return extractMCQTitleText(question.mcqQuestionTitle);
  }
  return question.title || "Programming Question";
};

const getQuestionDescription = (question: ExerciseQuestion): string => {
  if (!question) return "";
  if (question.questionType === 'MCQ' || (!question.title && question.mcqQuestionDescription)) {
    return question.mcqQuestionDescription || "";
  }
  if (question.description) {
    if (typeof question.description === 'string') return question.description;
    if (typeof question.description === 'object' && question.description.text) {
      if (Array.isArray(question.description.text)) {
        return question.description.text
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.value)
          .join(' ');
      }
      return question.description.text;
    }
  }
  return "";
};

const getQuestionMaxScore = (exercise: Exercise, question: ExerciseQuestion): number => {
  if (question.mcqQuestionScore && question.mcqQuestionScore > 0) return question.mcqQuestionScore;
  if (question.score && question.score > 0) return question.score;
  if (question.points && question.points > 0) return question.points;

  if (exercise.scoreSettings) {
    const { scoreType, levelBasedMarks, evenMarks, totalMarks, separateMarks, levelScoringConfiguration } = exercise.scoreSettings;

    if (scoreType === 'separateMarks' && separateMarks) {
      const questionIndex = exercise.questions.findIndex(q => q._id === question._id);
      if (questionIndex !== -1) {
        if (separateMarks.general && separateMarks.general[questionIndex] !== undefined) {
          return separateMarks.general[questionIndex];
        }
        const diff = (question.difficulty || question.mcqQuestionDifficulty || 'easy').toLowerCase();
        if (diff.includes('easy') && separateMarks.levelBased?.easy && separateMarks.levelBased.easy[questionIndex] !== undefined) {
          return separateMarks.levelBased.easy[questionIndex];
        }
        if (diff.includes('medium') && separateMarks.levelBased?.medium && separateMarks.levelBased.medium[questionIndex] !== undefined) {
          return separateMarks.levelBased.medium[questionIndex];
        }
        if (diff.includes('hard') && separateMarks.levelBased?.hard && separateMarks.levelBased.hard[questionIndex] !== undefined) {
          return separateMarks.levelBased.hard[questionIndex];
        }
      }
    }

    if (scoreType === 'levelBasedMarks' && levelBasedMarks) {
      const diff = (question.difficulty || question.mcqQuestionDifficulty || 'easy').toLowerCase();
      if (diff.includes('easy')) return levelBasedMarks.easy || 10;
      if (diff.includes('medium')) return levelBasedMarks.medium || 15;
      if (diff.includes('hard')) return levelBasedMarks.hard || 20;
    }

    if (scoreType === 'levelBasedMarks' && levelScoringConfiguration) {
      const diff = (question.difficulty || question.mcqQuestionDifficulty || 'easy').toLowerCase();
      if (diff.includes('easy') && levelScoringConfiguration.easy) return levelScoringConfiguration.easy.marksPerQuestion || 10;
      if (diff.includes('medium') && levelScoringConfiguration.medium) return levelScoringConfiguration.medium.marksPerQuestion || 15;
      if (diff.includes('hard') && levelScoringConfiguration.hard) return levelScoringConfiguration.hard.marksPerQuestion || 20;
    }

    if (scoreType === 'evenMarks') {
      if (evenMarks !== undefined && evenMarks > 0) return evenMarks;
      if (totalMarks && exercise.questions.length > 0) return parseFloat((totalMarks / exercise.questions.length).toFixed(2));
    }
  }

  if (exercise.questionConfiguration?.mcqQuestionConfiguration) {
    const mcqConfig = exercise.questionConfiguration.mcqQuestionConfiguration;
    if (mcqConfig.scoringType === 'equalDistribution' && mcqConfig.marksPerQuestion) return mcqConfig.marksPerQuestion;
    if (mcqConfig.scoringType === 'questionSpecific' && question.mcqQuestionScore) return question.mcqQuestionScore;
  }

  if (exercise.questionConfiguration?.programmingQuestionConfiguration?.scoreSettings) {
    const progConfig = exercise.questionConfiguration.programmingQuestionConfiguration.scoreSettings;
    if (progConfig.scoreType === 'evenMarks' && progConfig.evenMarks) return progConfig.evenMarks;
    if (progConfig.scoreType === 'levelBasedMarks' && progConfig.levelBasedMarks) {
      const diff = (question.difficulty || 'easy').toLowerCase();
      if (diff.includes('easy')) return progConfig.levelBasedMarks.easy || 10;
      if (diff.includes('medium')) return progConfig.levelBasedMarks.medium || 15;
      if (diff.includes('hard')) return progConfig.levelBasedMarks.hard || 20;
    }
  }

  return 10;
};

const getDynamicExerciseTotal = (exercise: Exercise | null): number => {
  if (!exercise || !exercise.questions || exercise.questions.length === 0) return 0;

  if (exercise.scoreSettings) {
    const { scoreType, totalMarks, evenMarks, levelBasedMarks, levelScoringConfiguration } = exercise.scoreSettings;
    if (totalMarks && totalMarks > 0) return totalMarks;
    if (scoreType === 'evenMarks' && evenMarks) return evenMarks * exercise.questions.length;
    if (scoreType === 'levelBasedMarks') {
      let total = 0;
      exercise.questions.forEach(q => {
        const diff = (q.difficulty || q.mcqQuestionDifficulty || 'easy').toLowerCase();
        if (levelScoringConfiguration) {
          if (diff.includes('easy') && levelScoringConfiguration.easy) total += levelScoringConfiguration.easy.marksPerQuestion || 10;
          else if (diff.includes('medium') && levelScoringConfiguration.medium) total += levelScoringConfiguration.medium.marksPerQuestion || 15;
          else if (diff.includes('hard') && levelScoringConfiguration.hard) total += levelScoringConfiguration.hard.marksPerQuestion || 20;
          else total += 10;
        } else if (levelBasedMarks) {
          if (diff.includes('easy')) total += levelBasedMarks.easy || 10;
          else if (diff.includes('medium')) total += levelBasedMarks.medium || 15;
          else if (diff.includes('hard')) total += levelBasedMarks.hard || 20;
          else total += 10;
        } else total += 10;
      });
      return total;
    }
  }

  if (exercise.questionConfiguration?.mcqQuestionConfiguration) {
    const mcqConfig = exercise.questionConfiguration.mcqQuestionConfiguration;
    if (mcqConfig.mcqTotalMarks && mcqConfig.mcqTotalMarks > 0) return mcqConfig.mcqTotalMarks;
    if (mcqConfig.scoringType === 'equalDistribution' && mcqConfig.marksPerQuestion) return mcqConfig.marksPerQuestion * exercise.questions.length;
  }

  return exercise.questions.reduce((acc, q) => acc + getQuestionMaxScore(exercise, q), 0);
};

const isQuestionMCQ = (q: ExerciseQuestion | null): boolean => {
  if (!q) return false;
  return q.questionType === 'MCQ' || (!q.title && !!q.mcqQuestionTitle);
};

// Returns true ONLY when this is a real frontend (HTML/CSS/JS) submission.
// Multi-file Core Programming (Python, etc.) ALSO has a `files` array, so we
// must inspect the exercise's selectedModule + the actual file languages.
const isFrontendQuestion = (
  question: ExerciseQuestion,
  submission?: SubmissionQuestion | null,
  exercise?: ExerciseData | null,
): boolean => {
  if (!question) return false;

  const selectedModule = (exercise?.programmingSettings?.selectedModule || '').toLowerCase();
  // Hard exclusion: Core Programming is NEVER frontend, even if it has files[].
  if (selectedModule === 'core programming' || selectedModule === 'database') return false;

  if (submission && submission.files && submission.files.length > 0) {
    // Verify at least one file is a frontend language before classifying as frontend.
    const FRONTEND_LANGS = new Set(['html', 'css', 'javascript', 'typescript']);
    const FRONTEND_EXTS = new Set(['html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx']);
    const hasFrontendFile = submission.files.some((f: any) => {
      const lang = String(f.language || '').toLowerCase();
      if (FRONTEND_LANGS.has(lang)) return true;
      const ext = (f.filename || '').split('.').pop()?.toLowerCase() || '';
      return FRONTEND_EXTS.has(ext);
    });
    if (hasFrontendFile) return true;
    // files[] present but none are frontend → not a frontend submission
    return false;
  }

  // No submission yet — fall back to question metadata heuristics
  if (selectedModule === 'frontend') return true;

  const title = (question.title || '').toLowerCase();
  const description = (getQuestionDescription(question) || '').toLowerCase();
  const frontendKeywords = ['html', 'css', 'javascript', 'frontend', 'web', 'react', 'vue', 'angular', 'ui', 'interface', 'website', 'page'];
  const hasFrontendKeyword = frontendKeywords.some(keyword =>
    title.includes(keyword) || description.includes(keyword)
  );

  if (question.solutions?.language) {
    const lang = question.solutions.language.toLowerCase();
    const frontendLangs = ['html', 'css', 'javascript', 'typescript', 'react', 'vue', 'angular'];
    if (frontendLangs.includes(lang)) return true;
  }

  return hasFrontendKeyword;
};

// True when this is a Core Programming multi-file submission (e.g. Python).
// We treat this as a CODE review (not frontend preview).
const isCoreProgrammingMultiFileQuestion = (
  submission?: SubmissionQuestion | null,
  exercise?: ExerciseData | null,
): boolean => {
  const selectedModule = (exercise?.programmingSettings?.selectedModule || '').toLowerCase();
  if (selectedModule !== 'core programming') return false;
  if (!submission?.files || submission.files.length === 0) return false;
  return true;
};

const isOthersQuestion = (question: ExerciseQuestion | null, submission?: SubmissionQuestion | null): boolean => {
  if (!question) return false;
  // Only "notion" and "file-upload" are real Others types; "text" is a programming question default
  if (question.othersQuestionType === 'notion' || question.othersQuestionType === 'file-upload') return true;
  if (submission?.nodeType === 'others_notion' || submission?.nodeType === 'others_file') return true;
  if (submission?.othersFiles && submission.othersFiles.length > 0) return true;
  return false;
};

const isStudent = (user: User): boolean => {
  const role = user.role?.renameRole?.toLowerCase() || '';
  return role === 'student';
};

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

// --- OTHERS REVIEW PANEL ---
const OthersReviewPanel = ({
  question,
  submission,
  montserrat,
  inter,
}: {
  question: ExerciseQuestion;
  submission: SubmissionQuestion | null;
  montserrat: any;
  inter: any;
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  const othersType = question.othersQuestionType ||
    (submission?.nodeType === 'others_notion' ? 'notion' : submission?.nodeType === 'others_file' ? 'file-upload' : null);

  const hasFiles = submission?.othersFiles && submission.othersFiles.length > 0;
  const hasNotionAnswer = othersType === 'notion' && submission?.codeAnswer;

  // Parse multi-page notion answer if present
  const notionPages: NotionPageData[] | null = (() => {
    if (!submission?.codeAnswer) return null;
    const raw = submission.codeAnswer;
    if (typeof raw !== 'string' || !raw.startsWith('{')) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.type === 'notionPages' && Array.isArray(parsed.pages)) return parsed.pages as NotionPageData[];
    } catch { /* not JSON */ }
    return null;
  })();

  // For text/csv files, fetch content
  const fetchTextContent = async (url: string) => {
    setTextLoading(true);
    try {
      const res = await fetch(url);
      const text = await res.text();
      setTextContent(text);
    } catch {
      setTextContent('Unable to load file content.');
    } finally {
      setTextLoading(false);
    }
  };

  const renderFileViewer = (file: { name: string; url: string; mimeType: string }, idx: number) => {
    const mime = file.mimeType?.toLowerCase() || '';
    const name = file.name?.toLowerCase() || '';

    const isPdf = mime.includes('pdf') || name.endsWith('.pdf');
    const isImage = mime.startsWith('image/');
    const isDocx = mime.includes('wordprocessingml') || name.endsWith('.docx') || name.endsWith('.doc');
    const isXlsx = mime.includes('spreadsheetml') || name.endsWith('.xlsx') || name.endsWith('.xls');
    const isPptx = mime.includes('presentationml') || name.endsWith('.pptx') || name.endsWith('.ppt');
    const isOffice = isDocx || isXlsx || isPptx;
    const isText = mime.includes('text/plain') || name.endsWith('.txt') || name.endsWith('.csv') || mime.includes('text/csv');

    return (
      <div key={idx} className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold text-slate-700 ${montserrat.className}`}>{file.name}</span>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide flex items-center gap-1"
          >
            ↗ Open
          </a>
        </div>
        {isPdf && (
          <iframe
            src={file.url}
            className="w-full rounded-lg border border-slate-200"
            style={{ height: 520 }}
            title={file.name}
          />
        )}
        {isImage && (
          <img
            src={file.url}
            alt={file.name}
            className="max-w-full rounded-lg border border-slate-200 object-contain"
            style={{ maxHeight: 480 }}
          />
        )}
        {isOffice && (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
            className="w-full rounded-lg border border-slate-200"
            style={{ height: 520 }}
            title={file.name}
          />
        )}
        {isText && (
          <div>
            {textContent === null && !textLoading && (
              <button
                onClick={() => fetchTextContent(file.url)}
                className="text-xs text-indigo-600 hover:underline"
              >
                Load file content
              </button>
            )}
            {textLoading && <div className="text-xs text-slate-500">Loading...</div>}
            {textContent !== null && (
              <pre className="bg-slate-900 text-slate-200 text-xs p-4 rounded-lg overflow-auto max-h-80 font-mono">
                {textContent}
              </pre>
            )}
          </div>
        )}
        {!isPdf && !isImage && !isOffice && !isText && (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
              <FileCode className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-500">{file.mimeType || 'Unknown type'}</p>
            </div>
            <a
              href={file.url}
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs font-bold text-white bg-slate-900 hover:bg-indigo-600 px-3 py-1.5 rounded-md transition-colors"
            >
              Download
            </a>
          </div>
        )}
      </div>
    );
  };

  const [showDetailModal, setShowDetailModal] = useState(false);

  // Collect all attachments from both top-level and othersDescription
  const allAttachments = (() => {
    const combined = [
      ...(question.attachments || []),
      ...(question.othersDescription?.attachments || []),
    ];
    return combined.filter((a, i, arr) => arr.findIndex(x => x.url === a.url) === i);
  })();

  // Check whether there's any content to show in the modal
  const hasDescription = !!(
    (question.questionContent && question.questionContent.length > 0) ||
    question.othersDescription?.html ||
    question.othersDescription?.text ||
    (question.othersDescription?.images && question.othersDescription.images.length > 0) ||
    question.descriptionImageUrl
  );
  const hasViewMore = hasDescription || allAttachments.length > 0;

  const getAttachmentIcon = (mime: string) => {
    if (!mime) return '📎';
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('word') || mime.includes('doc')) return '📝';
    if (mime.includes('excel') || mime.includes('sheet')) return '📊';
    if (mime.includes('powerpoint') || mime.includes('presentation')) return '📋';
    if (mime.startsWith('image/')) return '🖼️';
    if (mime.startsWith('video/')) return '🎥';
    return '📎';
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
      {/* Question header — title only + View More button */}
      <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
        <span className={`text-[9px] font-bold text-orange-500 uppercase tracking-widest mb-2 block ${montserrat.className}`}>
          {othersType === 'notion' ? 'Written Response' : othersType === 'file-upload' ? 'File Upload' : 'Others'} • {question.points || question.score || 10} Mark
        </span>
        <div className="flex items-start justify-between gap-3">
          <h2 className={`text-sm font-semibold text-slate-800 leading-relaxed flex-1 ${inter.className}`}>
            {question.title || 'Question'}
          </h2>
          {hasViewMore && (
            <button
              onClick={() => setShowDetailModal(true)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200 hover:border-orange-300 ${montserrat.className}`}
            >
              <Layers className="w-3 h-3" />
              View More
            </button>
          )}
        </div>
        {allAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {allAttachments.map((att, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 border border-orange-200 text-[10px] font-semibold text-orange-700">
                <span>{getAttachmentIcon(att.mimeType)}</span>
                <span className="max-w-[100px] truncate">{att.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Question Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className={`max-w-2xl rounded-2xl border-none shadow-2xl p-0 overflow-hidden bg-white ${inter.className}`}>
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className={`text-[9px] font-bold text-orange-500 uppercase tracking-widest block mb-1 ${montserrat.className}`}>
                  {othersType === 'notion' ? 'Written Response' : othersType === 'file-upload' ? 'File Upload' : 'Others'} • {question.points || question.score || 10} points
                </span>
                <DialogTitle className={`text-sm font-bold text-slate-900 leading-snug ${montserrat.className}`}>
                  {question.title || 'Question'}
                </DialogTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowDetailModal(false)}
                className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 shrink-0">
                <X className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="px-6 py-5 space-y-5">

              {/* Description + Images */}
              {hasDescription && (
                <div>
                  <p className={`text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 ${montserrat.className}`}>
                    Description
                  </p>
                  <div className="space-y-3">
                    {question.questionContent && question.questionContent.length > 0 ? (
                      question.questionContent.map((cb, i) => {
                        if (cb.type === 'text' && cb.value) {
                          return (
                            <div key={cb.id || i}
                              className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: cb.value }}
                            />
                          );
                        }
                        if (cb.type === 'image' && cb.url) {
                          const justify = cb.alignment === 'left' ? 'flex-start' : cb.alignment === 'right' ? 'flex-end' : 'center';
                          return (
                            <div key={cb.id || i} style={{ display: 'flex', justifyContent: justify }}>
                              <img src={cb.url} alt=""
                                style={{ width: `${cb.sizePercent || 60}%`, height: 'auto', borderRadius: 10, border: '1.5px solid #e2e8f0', display: 'block' }}
                              />
                            </div>
                          );
                        }
                        return null;
                      })
                    ) : (
                      <>
                        {question.othersDescription?.html && (
                          <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: question.othersDescription.html }} />
                        )}
                        {question.othersDescription?.text && !question.othersDescription?.html && (
                          <p className="text-sm text-slate-700 leading-relaxed">{question.othersDescription.text}</p>
                        )}
                        {question.othersDescription?.images && question.othersDescription.images.length > 0 && (
                          <div className="flex flex-col gap-3">
                            {question.othersDescription.images.map((entry, i) => {
                              const imgUrl = typeof entry === 'string' ? entry : entry.url;
                              const imgSize = typeof entry === 'object' && typeof entry.sizePercent === 'number' ? entry.sizePercent : 60;
                              const imgAlign = typeof entry === 'object' ? (entry.alignment || 'center') : 'center';
                              const justify = imgAlign === 'left' ? 'flex-start' : imgAlign === 'right' ? 'flex-end' : 'center';
                              return (
                                <div key={i} style={{ display: 'flex', justifyContent: justify }}>
                                  <img src={imgUrl} alt=""
                                    style={{ width: `${imgSize}%`, height: 'auto', borderRadius: 10, border: '1.5px solid #e2e8f0', display: 'block', objectFit: 'contain' }} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {question.descriptionImageUrl && (
                          <div style={{
                            display: 'flex',
                            justifyContent: question.descriptionImageAlignment === 'left' ? 'flex-start'
                              : question.descriptionImageAlignment === 'right' ? 'flex-end' : 'center',
                          }}>
                            <img src={question.descriptionImageUrl} alt=""
                              style={{ width: `${question.descriptionImageSizePercent || 60}%`, height: 'auto', borderRadius: 10, border: '1.5px solid #e2e8f0', display: 'block' }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {allAttachments.length > 0 && (
                <div>
                  <p className={`text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 ${montserrat.className}`}>
                    Attachments
                  </p>
                  <div className="flex flex-col gap-2">
                    {allAttachments.map((att, i) => (
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all group no-underline">
                        <span className="text-xl shrink-0">{getAttachmentIcon(att.mimeType)}</span>
                        <span className="flex-1 text-xs font-semibold text-slate-700 group-hover:text-indigo-700 truncate">{att.name}</span>
                        <span className={`text-[10px] font-bold text-indigo-500 uppercase tracking-wide shrink-0 ${montserrat.className}`}>Open ↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button onClick={() => setShowDetailModal(false)}
              className={`bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wide px-5 rounded-lg h-9 hover:bg-indigo-600 transition-colors ${montserrat.className}`}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Response */}
      <div>
        <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 ${montserrat.className}`}>
          Student Response
        </h3>

        {!submission ? (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Student has not submitted a response for this question.</span>
          </div>
        ) : othersType === 'notion' || hasNotionAnswer ? (
          /* Notion answer — either multi-page or plain HTML */
          notionPages ? (
            /* Multi-page Notion answer — Word-like page cards */
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                  📄 {notionPages.length} Page{notionPages.length !== 1 ? 's' : ''}
                </span>
              </div>
              <NotionPagesViewer pages={notionPages} isDark={false} />
            </div>
          ) : (
            /* Plain HTML notion answer (legacy simple editor) */
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              {submission.codeAnswer ? (
                <div
                  className="text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: submission.codeAnswer }}
                />
              ) : (
                <p className="text-xs text-slate-400 italic">No content written.</p>
              )}
            </div>
          )
        ) : hasFiles ? (
          /* File upload — render each file inline */
          <div>
            {submission.othersFiles!.map((file, idx) => renderFileViewer(file, idx))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">No response data found.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function EnhancedSubmissionReview() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [courseId] = useState(searchParams.get('courseId') || '');
  const exerciseId = searchParams.get('exerciseId');

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
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [assessmentVideoUrl, setAssessmentVideoUrl] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [executionLanguage, setExecutionLanguage] = useState('javascript');
  const inputResolverRef = useRef<((value: string) => void) | null>(null);
  const [pyodideReady, setPyodideReady] = useState(false);
  const pyodideRef = useRef<any>(null);

  const [isFrontendReview, setIsFrontendReview] = useState(false);
  const [isCodeMultiFileReview, setIsCodeMultiFileReview] = useState(false);
  const [frontendSubmissionData, setFrontendSubmissionData] = useState<FrontendSubmissionData | null>(null);
  const [isOthersReview, setIsOthersReview] = useState(false);
const isNonGraded = !!(
  selectedExercise?.isGraded === false ||  // Now this will detect isGraded: false
  getDynamicExerciseTotal(selectedExercise) === 0
);
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

  const getQuestionDisplayDifficulty = (q: ExerciseQuestion): string => {
    const raw = q.difficulty || q.mcqQuestionDifficulty || '';
    return raw.toLowerCase();
  };

  const getQuestionLabel = (q: ExerciseQuestion): string =>
    isQuestionMCQ(q) ? extractMCQTitleText(q.mcqQuestionTitle) : (q.title || 'Question');

  const extractFrontendSubmissionFromAnswers = (participant: Participant, questionId: string): FrontendSubmissionData | null => {
    const answers = getExerciseAnswersForSelectedExercise(participant);

    for (const answer of answers) {
      const submission = answer.questions.find(q => q.questionId === questionId);
      if (submission && submission.files && submission.files.length > 0) {
        return {
          _id: submission._id,
          exerciseId: answer.exerciseId,
          questionId: submission.questionId,
          files: submission.files,
          folders: submission.folders || [],
          status: submission.status,
          score: submission.score,
          feedback: submission.feedback,
          submittedAt: submission.submittedAt,
          attemptCount: answer.userAttempts || submission.attemptCount || 1,
          participantName: `${participant.user.firstName} ${participant.user.lastName}`,
          participantEmail: participant.user.email,
          lateSubmission: !!answer.lateSubmission,
          lastTestSubmittedAt: answer.lastTestSubmittedAt,
        };
      }
    }

    return null;
  };

  // Look up the exercise-level late flag for the currently selected participant+exercise
  // (used by the single-file standard code view, which has no FrontendSubmissionData).
  const getCurrentAnswerMeta = (): { attemptCount: number; submittedAt?: string; lateSubmission: boolean; lastTestSubmittedAt?: string } | null => {
    if (!selectedParticipant || !selectedQuestion) return null;
    const answers = getExerciseAnswersForSelectedExercise(selectedParticipant);
    for (const answer of answers) {
      const submission = answer.questions.find(q => q.questionId === selectedQuestion._id);
      if (submission) {
        return {
          attemptCount: answer.userAttempts || submission.attemptCount || 1,
          submittedAt: submission.submittedAt,
          lateSubmission: !!answer.lateSubmission,
          lastTestSubmittedAt: answer.lastTestSubmittedAt,
        };
      }
    }
    return null;
  };

  // --- COLLECT EXERCISES WITH METADATA (SUPPORTS ALL HIERARCHY COMBINATIONS) ---
  const collectExercisesWithMetadata = (courseData: CourseData): Exercise[] => {
    const allExercises: Exercise[] = [];

    if (!courseData.modules) return allExercises;

    const collect = (
      list: Exercise[] | undefined,
      cat: string,
      sub: string,
      moduleId?: string,
      subModuleId?: string,
      topicId?: string,
      subTopicId?: string
    ) => {
      if (!list || !Array.isArray(list)) return;

      list.forEach((ex: any) => {
        const exerciseWithMeta: Exercise = {
  _id: ex._id || Math.random().toString(),
  exerciseInformation: {
    exerciseId: ex.exerciseInformation?.exerciseId || ex._id || "EX_UNKNOWN",
    exerciseName: ex.exerciseInformation?.exerciseName || "Unnamed Exercise",
    description: ex.exerciseInformation?.description || ex.description || "",
    exerciseLevel: ex.exerciseInformation?.exerciseLevel || 'intermediate',
    totalPoints: ex.exerciseInformation?.totalPoints || ex.totalPoints || 0,
    totalQuestions: ex.questions?.length || 0,
    estimatedTime: ex.exerciseInformation?.estimatedTime || ex.totalDuration || 60,
    totalMarksMCQ: ex.exerciseInformation?.totalMarksMCQ || 0,
    totalMarksProgramming: ex.exerciseInformation?.totalMarksProgramming || 0,
    totalMarks: ex.exerciseInformation?.totalMarks || 0
  },
  programmingSettings: ex.programmingSettings || {
    selectedModule: 'Core Programming',
    selectedLanguages: ['Python'],
    levelConfiguration: {
      levelType: 'general',
      general: 0
    }
  },
  scoreSettings: ex.scoreSettings || ex.questionConfiguration?.programmingQuestionConfiguration?.scoreSettings,
  questionConfiguration: ex.questionConfiguration,
  questions: ex.questions || [],
  nodeType: ex.nodeType || 'exercise',
  createdAt: ex.createdAt || new Date().toISOString(),
  _category: cat,
  _subcategory: sub,
  _moduleId: moduleId,
  _subModuleId: subModuleId,
  _topicId: topicId,
  _subTopicId: subTopicId,
  exerciseType: ex.exerciseType || 'Programming',  // Add this line
  isGraded: ex.isGraded !== undefined ? ex.isGraded : true  // ADD THIS LINE - default to true
};
        allExercises.push(exerciseWithMeta);
      });
    };

    // Recursive function to traverse all hierarchy levels
    const traverseModules = (modules: any[]) => {
      modules.forEach((module: any) => {
        const moduleId = module._id;

        // Check if module has direct We_Do/You_Do at module level
        if (module.pedagogy) {
          const p = module.pedagogy;
          collect(p.We_Do?.assignments, 'We_Do', 'assignments', moduleId, undefined, undefined, undefined);
          collect(p.We_Do?.practical, 'We_Do', 'practical', moduleId, undefined, undefined, undefined);
          collect(p.We_Do?.project_development, 'We_Do', 'project_development', moduleId, undefined, undefined, undefined);
          collect(p.We_Do?.assessments, 'We_Do', 'assessments', moduleId, undefined, undefined, undefined);
          collect(p.We_Do?.assesments, 'We_Do', 'assesments', moduleId, undefined, undefined, undefined);
          collect(p.You_Do?.practical, 'You_Do', 'practical', moduleId, undefined, undefined, undefined);
          collect(p.You_Do?.project_development, 'You_Do', 'project_development', moduleId, undefined, undefined, undefined);
          collect(p.You_Do?.assessments, 'You_Do', 'assessments', moduleId, undefined, undefined, undefined);
          collect(p.You_Do?.assesments, 'You_Do', 'assesments', moduleId, undefined, undefined, undefined);
        }

        // Check if module has direct topics (without submodules)
        if (module.topics && Array.isArray(module.topics)) {
          module.topics.forEach((topic: any) => {
            const topicId = topic._id;
            const p = topic.pedagogy;
            if (p) {
              collect(p.We_Do?.assignments, 'We_Do', 'assignments', moduleId, undefined, topicId, undefined);
              collect(p.We_Do?.practical, 'We_Do', 'practical', moduleId, undefined, topicId, undefined);
              collect(p.We_Do?.project_development, 'We_Do', 'project_development', moduleId, undefined, topicId, undefined);
              collect(p.We_Do?.assessments, 'We_Do', 'assessments', moduleId, undefined, topicId, undefined);
              collect(p.We_Do?.assesments, 'We_Do', 'assesments', moduleId, undefined, topicId, undefined);
              collect(p.You_Do?.practical, 'You_Do', 'practical', moduleId, undefined, topicId, undefined);
              collect(p.You_Do?.project_development, 'You_Do', 'project_development', moduleId, undefined, topicId, undefined);
              collect(p.You_Do?.assessments, 'You_Do', 'assessments', moduleId, undefined, topicId, undefined);
              collect(p.You_Do?.assesments, 'You_Do', 'assesments', moduleId, undefined, topicId, undefined);
            }

            // Check if topic has subTopics
            if (topic.subTopics && Array.isArray(topic.subTopics)) {
              topic.subTopics.forEach((subTopic: any) => {
                const subTopicId = subTopic._id;
                const p = subTopic.pedagogy;
                if (p) {
                  collect(p.We_Do?.assignments, 'We_Do', 'assignments', moduleId, undefined, topicId, subTopicId);
                  collect(p.We_Do?.practical, 'We_Do', 'practical', moduleId, undefined, topicId, subTopicId);
                  collect(p.We_Do?.project_development, 'We_Do', 'project_development', moduleId, undefined, topicId, subTopicId);
                  collect(p.We_Do?.assessments, 'We_Do', 'assessments', moduleId, undefined, topicId, subTopicId);
                  collect(p.We_Do?.assesments, 'We_Do', 'assesments', moduleId, undefined, topicId, subTopicId);
                  collect(p.You_Do?.practical, 'You_Do', 'practical', moduleId, undefined, topicId, subTopicId);
                  collect(p.You_Do?.project_development, 'You_Do', 'project_development', moduleId, undefined, topicId, subTopicId);
                  collect(p.You_Do?.assessments, 'You_Do', 'assessments', moduleId, undefined, topicId, subTopicId);
                  collect(p.You_Do?.assesments, 'You_Do', 'assesments', moduleId, undefined, topicId, subTopicId);
                }
              });
            }
          });
        }

        // Traverse submodules
        if (module.subModules && Array.isArray(module.subModules)) {
          module.subModules.forEach((subModule: any) => {
            const subModuleId = subModule._id;

            // Check if submodule has direct We_Do/You_Do at submodule level
            if (subModule.pedagogy) {
              const p = subModule.pedagogy;
              collect(p.We_Do?.assignments, 'We_Do', 'assignments', moduleId, subModuleId, undefined, undefined);
              collect(p.We_Do?.practical, 'We_Do', 'practical', moduleId, subModuleId, undefined, undefined);
              collect(p.We_Do?.project_development, 'We_Do', 'project_development', moduleId, subModuleId, undefined, undefined);
              collect(p.We_Do?.assessments, 'We_Do', 'assessments', moduleId, subModuleId, undefined, undefined);
              collect(p.We_Do?.assesments, 'We_Do', 'assesments', moduleId, subModuleId, undefined, undefined);
              collect(p.You_Do?.practical, 'You_Do', 'practical', moduleId, subModuleId, undefined, undefined);
              collect(p.You_Do?.project_development, 'You_Do', 'project_development', moduleId, subModuleId, undefined, undefined);
              collect(p.You_Do?.assessments, 'You_Do', 'assessments', moduleId, subModuleId, undefined, undefined);
              collect(p.You_Do?.assesments, 'You_Do', 'assesments', moduleId, subModuleId, undefined, undefined);
            }

            // Check if submodule has direct topics
            if (subModule.topics && Array.isArray(subModule.topics)) {
              subModule.topics.forEach((topic: any) => {
                const topicId = topic._id;
                const p = topic.pedagogy;
                if (p) {
                  collect(p.We_Do?.assignments, 'We_Do', 'assignments', moduleId, subModuleId, topicId, undefined);
                  collect(p.We_Do?.practical, 'We_Do', 'practical', moduleId, subModuleId, topicId, undefined);
                  collect(p.We_Do?.project_development, 'We_Do', 'project_development', moduleId, subModuleId, topicId, undefined);
                  collect(p.We_Do?.assessments, 'We_Do', 'assessments', moduleId, subModuleId, topicId, undefined);
                  collect(p.We_Do?.assesments, 'We_Do', 'assesments', moduleId, subModuleId, topicId, undefined);
                  collect(p.You_Do?.practical, 'You_Do', 'practical', moduleId, subModuleId, topicId, undefined);
                  collect(p.You_Do?.project_development, 'You_Do', 'project_development', moduleId, subModuleId, topicId, undefined);
                  collect(p.You_Do?.assessments, 'You_Do', 'assessments', moduleId, subModuleId, topicId, undefined);
                  collect(p.You_Do?.assesments, 'You_Do', 'assesments', moduleId, subModuleId, topicId, undefined);
                }

                // Check if topic has subTopics
                if (topic.subTopics && Array.isArray(topic.subTopics)) {
                  topic.subTopics.forEach((subTopic: any) => {
                    const subTopicId = subTopic._id;
                    const p = subTopic.pedagogy;
                    if (p) {
                      collect(p.We_Do?.assignments, 'We_Do', 'assignments', moduleId, subModuleId, topicId, subTopicId);
                      collect(p.We_Do?.practical, 'We_Do', 'practical', moduleId, subModuleId, topicId, subTopicId);
                      collect(p.We_Do?.project_development, 'We_Do', 'project_development', moduleId, subModuleId, topicId, subTopicId);
                      collect(p.We_Do?.assessments, 'We_Do', 'assessments', moduleId, subModuleId, topicId, subTopicId);
                      collect(p.We_Do?.assesments, 'We_Do', 'assesments', moduleId, subModuleId, topicId, subTopicId);
                      collect(p.You_Do?.practical, 'You_Do', 'practical', moduleId, subModuleId, topicId, subTopicId);
                      collect(p.You_Do?.project_development, 'You_Do', 'project_development', moduleId, subModuleId, topicId, subTopicId);
                      collect(p.You_Do?.assessments, 'You_Do', 'assessments', moduleId, subModuleId, topicId, subTopicId);
                      collect(p.You_Do?.assesments, 'You_Do', 'assesments', moduleId, subModuleId, topicId, subTopicId);
                    }
                  });
                }
              });
            }
          });
        }
      });
    };

    // Start traversal from modules
    traverseModules(courseData.modules);

    console.log(`Collected ${allExercises.length} exercises with metadata`);
    console.log("Exercises found:", allExercises.map(ex => ({
      id: ex._id,
      exerciseId: ex.exerciseInformation?.exerciseId,
      name: ex.exerciseInformation?.exerciseName,
      category: ex._category,
      subcategory: ex._subcategory,
      moduleId: ex._moduleId,
      subModuleId: ex._subModuleId,
      topicId: ex._topicId,
      subTopicId: ex._subTopicId,
      questions: ex.questions?.length,
      totalMarks: getDynamicExerciseTotal(ex)
    })));

    return allExercises;
  };

  // --- BUILD BREADCRUMB WITH ALL HIERARCHY LEVELS ---
  const buildBreadcrumb = (exercise: Exercise) => {
    if (!courseData || !exercise) return;

    const breadcrumbItems: BreadcrumbItem[] = [
      {
        title: courseData.courseName || 'Course',
        icon: <Home className="h-3.5 w-3.5" />,
        type: 'course'
      }
    ];

    // Find the location in course structure
    if (exercise._moduleId) {
      const module = courseData.modules.find(m => m._id === exercise._moduleId);
      if (module) {
        breadcrumbItems.push(
          { title: module.title, icon: <Layers className="h-3.5 w-3.5" />, type: 'module' }
        );

        // Check for submodule
        if (exercise._subModuleId) {
          const subModule = module.subModules?.find(sm => sm._id === exercise._subModuleId);
          if (subModule) {
            breadcrumbItems.push(
              { title: subModule.title, icon: <Folder className="h-3.5 w-3.5" />, type: 'submodule' }
            );
          }
        }

        // Check for topic
        if (exercise._topicId) {
          let topic = null;

          if (exercise._subModuleId) {
            const subModule = module.subModules?.find(sm => sm._id === exercise._subModuleId);
            if (subModule && subModule.topics) {
              topic = subModule.topics.find(t => t._id === exercise._topicId);
            }
          } else if (module.topics) {
            topic = module.topics.find(t => t._id === exercise._topicId);
          }

          if (topic) {
            breadcrumbItems.push(
              { title: topic.title, icon: <FileCode className="h-3.5 w-3.5" />, type: 'topic' }
            );
          }
        }

        // Check for subtopic
        if (exercise._subTopicId) {
          let subTopic = null;

          // Find subtopic in the hierarchy
          if (exercise._topicId) {
            let topic = null;

            if (exercise._subModuleId) {
              const subModule = module.subModules?.find(sm => sm._id === exercise._subModuleId);
              if (subModule && subModule.topics) {
                topic = subModule.topics.find(t => t._id === exercise._topicId);
              }
            } else if (module.topics) {
              topic = module.topics.find(t => t._id === exercise._topicId);
            }

            if (topic && topic.subTopics) {
              subTopic = topic.subTopics.find(st => st._id === exercise._subTopicId);
            }
          }

          if (subTopic) {
            breadcrumbItems.push(
              { title: subTopic.title, icon: <FileCode className="h-3.5 w-3.5" />, type: 'subtopic' }
            );
          }
        }
      }
    }

    // Add exercise and grading console
    breadcrumbItems.push(
      {
        title: exercise.exerciseInformation.exerciseName,
        icon: <FileCode className="h-3.5 w-3.5" />,
        type: 'exercise'
      },
      {
        title: 'Grading Console',
        icon: <Award className="h-3.5 w-3.5" />,
        type: 'grading'
      }
    );

    setBreadcrumb(breadcrumbItems);
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  useEffect(() => {
    if (exercises.length > 0 && exerciseId) {
      const exercise = exercises.find(ex =>
        ex._id === exerciseId ||
        ex.exerciseInformation?.exerciseId === exerciseId ||
        (ex._id && ex._id.includes(exerciseId)) ||
        (ex.exerciseInformation?.exerciseId && ex.exerciseInformation.exerciseId.includes(exerciseId))
      );

      if (exercise) {
        setSelectedExercise(exercise);
        buildBreadcrumb(exercise);
        calculateGradingStats();
      } else {
        if (exercises.length > 0) {
          setSelectedExercise(exercises[0]);
          buildBreadcrumb(exercises[0]);
          calculateGradingStats();
        }
      }
    }
  }, [exerciseId, exercises]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (saveSuccess) {
      timer = setTimeout(() => { setSaveSuccess(false); }, 2000);
    }
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  // --- DATA FETCHING & LOGIC ---
  const initEngines = async () => {
    try {
      if (!pyodideReady && (window as any).loadPyodide) {
        const pyodide = await (window as any).loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/" });
        pyodideRef.current = pyodide;
        setPyodideReady(true);
      }
    } catch (e) {
      console.error("Pyodide Load Error", e);
    }
    (window as any).getReactInput = () => new Promise((resolve) => {
      setIsWaitingForInput(true);
      inputResolverRef.current = resolve;
    });
  };

  const addLog = (type: LogEntry['type'], content: string) => {
    setTerminalLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      type,
      content,
      timestamp: Date.now()
    }]);
  };

  const clearTerminal = () => setTerminalLogs([]);

  const handleTerminalInput = (value: string) => {
    addLog('stdin', value);
    if (inputResolverRef.current) {
      inputResolverRef.current(value);
      inputResolverRef.current = null;
    }
    setIsWaitingForInput(false);
  };

  const calculateGradingStats = () => {
    if (!selectedExercise) return;

    let studentsWithSubmissions = 0;
    let studentsGraded = 0;
    let totalScoreSum = 0;
    let totalMaxPointsSum = 0;

    participants.forEach(participant => {
      const answers = getExerciseAnswersForSelectedExercise(participant);
      const hasSubmissions = answers.length > 0 && answers.some(a => a.questions && a.questions.length > 0);

      if (hasSubmissions) {
        studentsWithSubmissions++;

        const isGraded = answers.some(a =>
          a.questions.some(q => q.status === 'evaluated')
        );

        if (isGraded) studentsGraded++;

        answers.forEach(a => {
          a.questions.forEach(q => {
            if (q.status === 'evaluated') {
              totalScoreSum += q.score;
              const questionDetails = selectedExercise.questions.find(sq => sq._id === q.questionId);
              totalMaxPointsSum += questionDetails ?
                getQuestionMaxScore(selectedExercise, questionDetails) : 0;
            }
          });
        });
      }
    });

    const averageScore = totalMaxPointsSum > 0 ?
      Math.round((totalScoreSum / totalMaxPointsSum) * 100) : 0;

    setGradingStats({
      graded: studentsGraded,
      total: studentsWithSubmissions,
      pending: studentsWithSubmissions - studentsGraded,
      averageScore
    });
  };

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_API_URL}/getAll/courses-data/${courseId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setCourseData(result.data);
        const allExercises = collectExercisesWithMetadata(result.data);
        setExercises(allExercises);

        let targetExercise: Exercise | undefined;

        if (exerciseId && allExercises.length > 0) {
          targetExercise = allExercises.find(ex => {
            if (ex._id === exerciseId) return true;
            if (ex.exerciseInformation?.exerciseId === exerciseId) return true;
            if (ex._id && ex._id.includes(exerciseId)) return true;
            if (ex.exerciseInformation?.exerciseId && ex.exerciseInformation.exerciseId.includes(exerciseId)) return true;
            if (ex.exerciseInformation?.exerciseName?.toLowerCase() === exerciseId.toLowerCase()) return true;
            return false;
          });
        }

        if (!targetExercise && allExercises.length > 0) {
          targetExercise = allExercises[0];
        }

        if (targetExercise) {
          setSelectedExercise(targetExercise);
          buildBreadcrumb(targetExercise);

          // Filter to only students
          const studentParticipants = (result.data.singleParticipants || [])
            .filter((p: Participant) => isStudent(p.user));

          const sortedParticipants = studentParticipants.sort((a: any, b: any) => {
            const aHas = getExerciseAnswersForExercise(a, targetExercise).length > 0;
            const bHas = getExerciseAnswersForExercise(b, targetExercise).length > 0;
            return aHas && !bHas ? -1 : !aHas && bHas ? 1 : 0;
          });

          setParticipants(sortedParticipants);
          calculateGradingStats();
        } else {
          // Filter to only students
          const studentParticipants = (result.data.singleParticipants || [])
            .filter((p: Participant) => isStudent(p.user));
          setParticipants(studentParticipants);
        }
      } else {
        toast.error(result.message || 'Failed to load course data');
      }
    } catch (err: any) {
      console.error('Failed to load course data:', err);
      toast.error(err.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockExercise = async (participantId: string, targetExerciseId: string) => {
    if (!selectedExercise || !courseId) {
      toast.error("Missing course or exercise data");
      return;
    }

    const targetCategory = selectedExercise._category || 'We_Do';
    const targetSubcategory = selectedExercise._subcategory || 'assignments';

    const token = localStorage.getItem('smartcliff_token') || '';
    const loadingToast = toast.loading("Unlocking exercise...");

    try {
      const payload = {
        targetUserId: participantId,
        courseId: courseId,
        exerciseId: targetExerciseId,
        category: targetCategory,
        subcategory: targetSubcategory,
        status: 'in-progress',
        isLocked: false,
        reason: "Unlocked by Instructor via Grading Console"
      };

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
        fetchCourseData();
      } else {
        throw new Error(result.message || "Failed to unlock");
      }
    } catch (error: any) {
      console.error("Unlock error:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Error unlocking exercise");
    }
  };

  const getExerciseAnswersForExercise = (participant: Participant, exercise: Exercise | undefined): ExerciseAnswer[] => {
    if (!exercise) return [];
    const allAnswers = getExerciseAnswers(participant);
    return allAnswers.filter(answer => {
      if (answer.exerciseId === exercise._id) return true;
      if (answer.exerciseId === exercise.exerciseInformation?.exerciseId) return true;
      if (exercise._id && answer.exerciseId.includes(exercise._id)) return true;
      return false;
    });
  };

  const fetchAssessmentVideo = async (participantId: string, exerciseId: string) => {
    if (!selectedExercise || !courseId) {
      toast.error("Missing course or exercise data");
      return null;
    }

    const targetCategory = selectedExercise._category || 'We_Do';
    const targetSubcategory = selectedExercise._subcategory || 'assignments';

    try {
      setIsLoadingVideo(true);
      const token = localStorage.getItem('smartcliff_token') || '';
      const response = await fetch(
        `${BACKEND_API_URL}/exercise/status?` +
        `targetUserId=${participantId}&` +
        `courseId=${courseId}&` +
        `exerciseId=${exerciseId}&` +
        `category=${targetCategory}&` +
        `subcategory=${targetSubcategory}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        const screenRecording = result.data?.screenRecording;
        if (screenRecording && screenRecording !== 'empty') {
          if (screenRecording.startsWith('http')) {
            setAssessmentVideoUrl(screenRecording);
          } else {
            setAssessmentVideoUrl(`${BACKEND_API_URL}/${screenRecording}`);
          }
        } else {
          setAssessmentVideoUrl(null);
          toast.info("No screen recording available for this assessment");
        }
      } else {
        setAssessmentVideoUrl(null);
        toast.error("Could not load assessment video");
      }
    } catch (error: any) {
      console.error("Error fetching assessment video:", error);
      setAssessmentVideoUrl(null);
      toast.error(error.message || "Failed to load video");
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handleViewAssessmentVideo = async (participantId: string, exerciseId: string) => {
    setAssessmentVideoUrl(null);
    setShowVideoModal(true);
    await fetchAssessmentVideo(participantId, exerciseId);
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

  const getExerciseAnswers = (participant: Participant): ExerciseAnswer[] => {
    if (!participant.user.courses) return [];
    const course = participant.user.courses.find(c => c.courseId === courseId);
    if (!course || !course.answers) return [];

    const extractAll = (catObj: any): ExerciseAnswer[] => {
      if (!catObj) return [];
      const answers: ExerciseAnswer[] = [];
      if (catObj.assignments && Array.isArray(catObj.assignments)) answers.push(...catObj.assignments);
      const otherCategories = ['practical', 'project_development', 'assessments', 'assesments'];
      otherCategories.forEach(cat => {
        if (catObj[cat] && Array.isArray(catObj[cat])) answers.push(...catObj[cat]);
      });
      return answers;
    };

    const weDoAnswers = extractAll(course.answers.We_Do);
    const youDoAnswers = extractAll(course.answers.You_Do);
    return [...weDoAnswers, ...youDoAnswers];
  };

  const getExerciseAnswersForSelectedExercise = (participant: Participant): ExerciseAnswer[] => {
    const all = getExerciseAnswers(participant);
    return selectedExercise ?
      all.filter(a => a.exerciseId === selectedExercise._id) :
      all;
  };

  const getSubmissionForQuestion = (questionId: string): SubmissionQuestion | null => {
    if (!selectedParticipant) return null;
    const answers = getExerciseAnswersForSelectedExercise(selectedParticipant);
    for (const answer of answers) {
      const submission = answer.questions.find(q => q.questionId === questionId);
      if (submission) return submission;
    }
    return null;
  };

  const saveFrontendGrade = async (scoreValue: number, feedbackValue: string): Promise<boolean> => {
    if (!selectedQuestion || !selectedParticipant || !selectedExercise || !frontendSubmissionData) {
      toast.error('Missing required data');
      return false;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const token = localStorage.getItem('smartcliff_token') || '';
      const categoryToSend = selectedExercise._category || 'We_Do';
      const subcategoryToSend = selectedExercise._subcategory || 'assignments';

      const payload = {
        courseId,
        exerciseId: selectedExercise._id,
        exerciseName: selectedExercise.exerciseInformation.exerciseName,
        participantId: selectedParticipant.user._id,
        questionId: selectedQuestion._id,
        questionTitle: getQuestionTitle(selectedQuestion),
        score: scoreValue,
        totalScore: maxScore,
        feedback: feedbackValue,
        status: 'evaluated',
        language: 'html/css/javascript',
        category: categoryToSend,
        subcategory: subcategoryToSend
      };

      const response = await fetch(`${BACKEND_API_URL}/users/update/submission-score`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok && !result.success) {
        throw new Error(result.message || 'Failed to save grade');
      }

      if (selectedAnswer) {
        const updatedParticipants = [...participants];
        const pIdx = updatedParticipants.findIndex(p => p._id === selectedParticipant._id);

        if (pIdx !== -1) {
          const participant = updatedParticipants[pIdx];
          const answers = getExerciseAnswers(participant);
          const ansIdx = answers.findIndex(a => a._id === selectedAnswer._id);

          if (ansIdx !== -1) {
            const answer = answers[ansIdx];
            const qIdx = answer.questions.findIndex(q => q.questionId === selectedQuestion._id);

            if (qIdx !== -1) {
              answer.questions[qIdx] = {
                ...answer.questions[qIdx],
                score: scoreValue,
                feedback: feedbackValue,
                status: 'evaluated'
              };
            }
            setParticipants(updatedParticipants);
          }
        }
      }

      setSaveSuccess(true);
      toast.success('Frontend assessment graded successfully');
      return true;
    } catch (err) {
      console.error('Save frontend grade error:', err);
      toast.error('Failed to save grade');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartGrading = async (participant: Participant) => {
    setSaveSuccess(false);
    setSelectedParticipant(participant);
    setIsFrontendReview(false);
    setIsCodeMultiFileReview(false);
    setFrontendSubmissionData(null);
    setIsOthersReview(false);

    if (!selectedExercise) return;

    const answers = getExerciseAnswersForSelectedExercise(participant);

    let targetQuestion = selectedExercise.questions[0];
    let submissionFound: SubmissionQuestion | null = null;
    let activeAnswerGroup: ExerciseAnswer | null = null;

    if (answers.length > 0) {
      for (const question of selectedExercise.questions) {
        for (const ans of answers) {
          const sub = ans.questions?.find(q =>
            q.questionId === question._id && (q.codeAnswer || q.isCorrect !== undefined || (q.othersFiles && q.othersFiles.length > 0))
          );
          if (sub) {
            targetQuestion = question;
            submissionFound = sub;
            activeAnswerGroup = ans;
            break;
          }
        }
        if (submissionFound) break;
      }

      if (!submissionFound && targetQuestion) {
        for (const ans of answers) {
          const sub = ans.questions?.find(q => q.questionId === targetQuestion._id);
          if (sub) {
            submissionFound = sub;
            activeAnswerGroup = ans;
            break;
          }
        }
      }
    }

    if (targetQuestion) {
      const initMax = getQuestionMaxScore(selectedExercise, targetQuestion);
      const initScore = submissionFound
        ? (isQuestionMCQ(targetQuestion) && submissionFound.status !== 'evaluated'
          ? (submissionFound.isCorrect ? initMax : 0)
          : Math.min(submissionFound.score || 0, initMax))
        : 0;
      setSelectedAnswer(activeAnswerGroup || answers[0] || null);
      setSubmissionQuestion(submissionFound);
      setSelectedQuestion(targetQuestion);
      setScore(initScore);
      setMaxScore(initMax);
      setFeedbackText(submissionFound?.feedback || '');
      setCurrentQuestionIndex(selectedExercise.questions.findIndex(q => q._id === targetQuestion._id));

      if (isOthersQuestion(targetQuestion, submissionFound)) {
        setIsOthersReview(true);
      } else if (isCoreProgrammingMultiFileQuestion(submissionFound, selectedExercise) && submissionFound) {
        const codeData = extractFrontendSubmissionFromAnswers(participant, targetQuestion._id);
        if (codeData) {
          setFrontendSubmissionData(codeData);
          setIsCodeMultiFileReview(true);
        }
      } else if (isFrontendQuestion(targetQuestion, submissionFound, selectedExercise) && submissionFound) {
        const frontendData = extractFrontendSubmissionFromAnswers(participant, targetQuestion._id);
        if (frontendData) {
          setFrontendSubmissionData(frontendData);
          setIsFrontendReview(true);
        }
      }
    }

    setViewMode('grading');
  };

  const handleStudentChange = (id: string) => {
    const p = participants.find(p => p._id === id);
    if (p) handleStartGrading(p);
  };

  const handleNextStudent = () => {
    if (!selectedParticipant) return;
    const idx = participants.findIndex(p => p._id === selectedParticipant._id);
    if (idx < participants.length - 1) {
      handleStartGrading(participants[idx + 1]);
    } else {
      toast.success('End of list');
    }
  };

  const handlePrevStudent = () => {
    if (!selectedParticipant) return;
    const idx = participants.findIndex(p => p._id === selectedParticipant._id);
    if (idx > 0) {
      handleStartGrading(participants[idx - 1]);
    }
  };

  const getCurrentStudentIndex = () =>
    selectedParticipant ? participants.findIndex(p => p._id === selectedParticipant._id) : 0;

  const getTotalStudents = () => participants.length;

  const handleQuestionClick = async (question: ExerciseQuestion, index: number) => {
    setSaveSuccess(false);
    setSelectedQuestion(question);
    setCurrentQuestionIndex(index);
    setIsFrontendReview(false);
    setIsCodeMultiFileReview(false);
    setFrontendSubmissionData(null);
    setIsOthersReview(false);

    if (selectedExercise) {
      const allowedMax = getQuestionMaxScore(selectedExercise, question);
      setMaxScore(allowedMax);

      const submission = getSubmissionForQuestion(question._id);

      if (submission) {
        setSubmissionQuestion(submission);

        if (isQuestionMCQ(question)) {
          const autoScore = submission.isCorrect ? allowedMax : 0;
          setScore(autoScore);
        } else {
          const existingScore = Math.min(submission.score || 0, allowedMax);
          setScore(existingScore);
        }

        setFeedbackText(submission.feedback || '');

        if (isOthersQuestion(question, submission)) {
          setIsOthersReview(true);
        } else if (isCoreProgrammingMultiFileQuestion(submission, selectedExercise) && selectedParticipant) {
          const codeData = extractFrontendSubmissionFromAnswers(selectedParticipant, question._id);
          if (codeData) {
            setFrontendSubmissionData(codeData);
            setIsCodeMultiFileReview(true);
          }
        } else if (isFrontendQuestion(question, submission, selectedExercise) && selectedParticipant) {
          const frontendData = extractFrontendSubmissionFromAnswers(selectedParticipant, question._id);
          if (frontendData) {
            setFrontendSubmissionData(frontendData);
            setIsFrontendReview(true);
          }
        }
      } else {
        setSubmissionQuestion(null);
        setScore(0);
        setFeedbackText('');
        // Check if question itself is Others type even without submission
        if (isOthersQuestion(question, null)) {
          setIsOthersReview(true);
        }
      }
    }
  };

  const getGradeSettings = (exercise: Exercise | null): any => {
    if (!exercise) return null;
    if ((exercise as any).gradeSettings) return (exercise as any).gradeSettings;
    if (exercise.questionConfiguration?.programmingQuestionConfiguration?.gradeSettings) return exercise.questionConfiguration.programmingQuestionConfiguration.gradeSettings;
    if ((exercise as any).settings?.grade) return (exercise as any).settings.grade;
    return null;
  };

  const getStatusDot = (sub: SubmissionQuestion | null) =>
    !sub ? 'bg-slate-300' :
      sub.status === 'evaluated' ? 'bg-emerald-500' :
        (sub.codeAnswer || (sub.othersFiles && sub.othersFiles.length > 0)) ? 'bg-amber-500' :
          'bg-slate-300';

  const saveGrade = async (): Promise<boolean> => {
    if (isQuestionMCQ(selectedQuestion)) {
      if (!selectedQuestion || !selectedParticipant || !selectedExercise) {
        toast.error('Missing required data');
        return false;
      }

      setIsSaving(true);
      setSaveSuccess(false);

      try {
        const token = localStorage.getItem('smartcliff_token') || '';
        const categoryToSend = selectedExercise._category || 'We_Do';
        const subcategoryToSend = selectedExercise._subcategory || 'assignments';

        const payload = {
          courseId,
          exerciseId: selectedExercise._id,
          exerciseName: selectedExercise.exerciseInformation.exerciseName,
          participantId: selectedParticipant.user._id,
          questionId: selectedQuestion._id,
          questionTitle: getQuestionTitle(selectedQuestion),
          score,
          totalScore: maxScore,
          feedback: feedbackText,
          status: 'evaluated',
          language: 'text',
          category: categoryToSend,
          subcategory: subcategoryToSend
        };

        const response = await fetch(`${BACKEND_API_URL}/users/update/submission-score`, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok && !result.success) {
          throw new Error(result.message || 'Failed to save feedback');
        }

        const updatedParticipants = [...participants];
        const pIdx = updatedParticipants.findIndex(p => p._id === selectedParticipant._id);

        if (pIdx !== -1) {
          const participant = updatedParticipants[pIdx];
          const answers = getExerciseAnswers(participant);
          const ansIdx = selectedAnswer ?
            answers.findIndex(a => a._id === selectedAnswer._id) : -1;

          if (ansIdx !== -1) {
            const answer = answers[ansIdx];
            const qIdx = answer.questions.findIndex(q => q.questionId === selectedQuestion._id);

            if (qIdx !== -1) {
              answer.questions[qIdx] = {
                ...answer.questions[qIdx],
                feedback: feedbackText,
                status: 'evaluated'
              };
            }
            setParticipants(updatedParticipants);
          }
        }

        setSaveSuccess(true);
        toast.success('Feedback saved successfully');
        return true;
      } catch (err) {
        console.error('Save feedback error:', err);
        toast.error('Failed to save feedback');
        return false;
      } finally {
        setIsSaving(false);
      }
    }

    if (!selectedQuestion || !selectedParticipant || !selectedExercise) {
      toast.error('Missing required data');
      return false;
    }

    if (score > maxScore) {
      toast.error(`Score cannot exceed ${maxScore}`);
      setScore(maxScore);
      return false;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const token = localStorage.getItem('smartcliff_token') || '';
      let submissionLanguage = 'plaintext';
      const answers = getExerciseAnswers(selectedParticipant);
      const targetAnswerGroup = selectedAnswer ||
        answers.find(a => a.questions.some(q => q.questionId === selectedQuestion._id));

      if (targetAnswerGroup) {
        const qSub = targetAnswerGroup.questions.find(q => q.questionId === selectedQuestion._id);
        if (qSub && qSub.language) submissionLanguage = qSub.language;
      }

      const categoryToSend = selectedExercise._category || 'We_Do';
      const subcategoryToSend = selectedExercise._subcategory || 'assignments';

      const payload = {
        courseId,
        exerciseId: selectedExercise._id,
        exerciseName: selectedExercise.exerciseInformation.exerciseName,
        participantId: selectedParticipant.user._id,
        questionId: selectedQuestion._id,
        questionTitle: getQuestionTitle(selectedQuestion),
        score,
        totalScore: maxScore,
        feedback: feedbackText,
        status: 'evaluated',
        language: submissionLanguage,
        category: categoryToSend,
        subcategory: subcategoryToSend
      };

      const response = await fetch(`${BACKEND_API_URL}/users/update/submission-score`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok && !result.success) {
        throw new Error(result.message || 'Failed to save');
      }

      const updatedParticipants = [...participants];
      const pIdx = updatedParticipants.findIndex(p => p._id === selectedParticipant._id);

      if (pIdx !== -1) {
        const participant = updatedParticipants[pIdx];
        const answers = getExerciseAnswers(participant);
        const ansIdx = selectedAnswer ?
          answers.findIndex(a => a._id === selectedAnswer._id) : -1;

        if (ansIdx !== -1) {
          const answer = answers[ansIdx];
          const qIdx = answer.questions.findIndex(q => q.questionId === selectedQuestion._id);

          if (qIdx !== -1) {
            answer.questions[qIdx] = {
              ...answer.questions[qIdx],
              score,
              feedback: feedbackText,
              isCorrect: (score / maxScore) * 100 >= 60,
              status: 'evaluated'
            };
          } else {
            answer.questions.push({
              _id: Math.random().toString(),
              questionId: selectedQuestion._id,
              codeAnswer: "",
              language: submissionLanguage,
              isCorrect: (score / maxScore) * 100 >= 60,
              score,
              status: 'evaluated',
              attemScore: 0,
              submittedAt: new Date().toISOString(),
              feedback: feedbackText
            });
          }

          setParticipants(updatedParticipants);
        }
      }

      setSaveSuccess(true);
      return true;
    } catch (err) {
      console.error('Save grade error:', err);
      toast.error('Failed to save');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (await saveGrade()) {
      setTimeout(() => {
        if (selectedExercise && currentQuestionIndex < selectedExercise.questions.length - 1) {
          handleQuestionClick(
            selectedExercise.questions[currentQuestionIndex + 1],
            currentQuestionIndex + 1
          );
        } else {
          if (getCurrentStudentIndex() < getTotalStudents() - 1) {
            handleNextStudent();
          } else {
            toast.success('All graded!');
            setViewMode('list');
          }
        }
      }, 800);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('fromAnalytics', 'true');
    router.push(`/lms/pages/courses/uploadcourseresources?${params.toString()}`);
  };

  const initiateRunCode = async () => {
    if (!submissionQuestion?.codeAnswer) {
      toast.error('No code to execute');
      return;
    }

    const lang = submissionQuestion.language || 'javascript';
    setExecutionLanguage(lang);
    setShowTerminal(true);
    clearTerminal();

    if (lang === 'python') {
      if (!pyodideReady) {
        toast.loading("Loading Python...", { duration: 2000 });
        await initEngines();
      }

      setIsExecuting(true);
      addLog('system', 'Initializing Python...');

      try {
        pyodideRef.current.setStdout({ batched: (msg: string) => addLog('stdout', msg) });
        pyodideRef.current.setStderr({ batched: (msg: string) => addLog('stderr', msg) });

        const preamble = `
import js
import asyncio
import builtins

async def _async_input(prompt=""):
    if prompt: print(prompt, end="")
    return await js.getReactInput()

builtins.input = _async_input
`;

        await pyodideRef.current.runPythonAsync(
          preamble + "\n" + submissionQuestion.codeAnswer.replace(/input\s*\(/g, "await input(")
        );

        addLog('system', 'Execution Finished');
      } catch (err: any) {
        addLog('stderr', err.message || String(err));
      } finally {
        setIsExecuting(false);
        setIsWaitingForInput(false);
      }

      return;
    }

    setIsExecuting(true);
    addLog('system', `Preparing ${lang}...`);

    const needsInput = ['java', 'c', 'cpp'].some(l => lang.includes(l)) &&
      (submissionQuestion.codeAnswer.includes('Scanner') ||
        submissionQuestion.codeAnswer.includes('scanf') ||
        submissionQuestion.codeAnswer.includes('cin'));

    let stdin = "";
    if (needsInput) {
      addLog('system', 'Batch Input Required. Enter inputs separated by spaces/newlines.');
      setIsWaitingForInput(true);
      stdin = await new Promise<string>((resolve) => {
        inputResolverRef.current = resolve;
      });
      addLog('system', 'Input received.');
    }

    try {
      const getPistonLang = (l: string) => {
        const langMap: { [key: string]: any } = {
          javascript: { language: "javascript", version: "18.15.0" },
          java: { language: "java", version: "15.0.2" },
          cpp: { language: "cpp", version: "10.2.0" },
          c: { language: "c", version: "10.2.0" },
          python: { language: "python", version: "3.10.0" }
        };
        return langMap[l] || { language: "javascript", version: "18.15.0" };
      };

      const config = getPistonLang(lang);
      const res = await fetch(PISTON_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: config.language,
          version: config.version,
          files: [{ content: submissionQuestion.codeAnswer }],
          stdin
        })
      });

      const data = await res.json();
      if (data.run) {
        if (data.run.stdout) addLog('stdout', data.run.stdout);
        if (data.run.stderr) addLog('stderr', data.run.stderr);
        addLog('system', `Exited (Time: ${data.run.time || 0}ms)`);
      } else {
        addLog('stderr', 'Execution failed.');
      }
    } catch (err: any) {
      addLog('stderr', `Execution failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
      setIsWaitingForInput(false);
    }
  };

  // Filtered participants - only students
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      if (!search) return true;
      const fullName = `${p.user.firstName} ${p.user.lastName}`.toLowerCase();
      const email = p.user.email.toLowerCase();
      const searchLower = search.toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [participants, search]);

  const filteredQuestions = useMemo(() => {
    if (!selectedExercise) return [];
    return difficultyFilter === 'all'
      ? selectedExercise.questions
      : selectedExercise.questions.filter(q =>
        getQuestionDisplayDifficulty(q) === difficultyFilter.toLowerCase()
      );
  }, [selectedExercise, difficultyFilter]);

  // Calculate stats for display
  const enrollmentCount = participants.length;
  const submissionsCount = participants.filter(p => {
    const answers = getExerciseAnswersForSelectedExercise(p);
    return answers.length > 0 && answers.some(a => a.questions && a.questions.length > 0);
  }).length;
  const evaluatedCount = participants.filter(p => {
    const answers = getExerciseAnswersForSelectedExercise(p);
    return answers.some(a => a.questions.some(q => q.status === 'evaluated'));
  }).length;
  const pendingCount = submissionsCount - evaluatedCount;

  // --- RENDER LOADING ---
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  // --- RENDER NO EXERCISE FOUND ---
  if (!selectedExercise) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-500 p-6">
        <AlertCircle className="w-16 h-16 mb-4 text-slate-400" />
        <h3 className={`text-xl font-bold text-slate-700 mb-3 ${montserrat.className}`}>
          Exercise Not Found
        </h3>
        <p className="mb-6 max-w-md text-center text-slate-600">
          The requested exercise could not be found.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={handleBack} className={`${montserrat.className}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back to Course
          </Button>
          {exercises.length > 0 && (
            <Button onClick={() => {
              setSelectedExercise(exercises[0]);
              buildBreadcrumb(exercises[0]);
              calculateGradingStats();
            }} className={`bg-indigo-600 hover:bg-indigo-700 ${montserrat.className}`}>
              Load First Available Exercise
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className={`h-screen flex flex-col bg-white overflow-hidden ${inter.className}`}>
      <Toaster position="top-center" richColors />
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"
        onLoad={initEngines}
        strategy="afterInteractive"
      />

      <InteractiveTerminal
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
        logs={terminalLogs}
        isRunning={isExecuting}
        isWaitingForInput={isWaitingForInput}
        onInputSubmit={handleTerminalInput}
        language={executionLanguage}
        onClear={clearTerminal}
      />

      {/* HEADER */}
      <div className="flex-none z-50 border-b border-slate-200 bg-white px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 flex-1 mr-6 min-w-0">
            {viewMode !== 'grading' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeft className="h-4.5 w-4.5 stroke-[2.5]" />
              </Button>
            )}
            {renderBreadcrumb()}
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCourseData}
              className={`h-9 px-4 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-50 rounded-md shadow-sm transition-all ${montserrat.className}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'list' ? (
          /* STUDENT LIST VIEW */
          <div className="flex flex-col h-full bg-white">
            {/* Stats Cards */}
            <div className="flex-none w-full px-6 py-8 bg-slate-50/50 border-b border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Enrollment", val: enrollmentCount, icon: Users, style: "bg-indigo-50 text-indigo-600", border: "hover:border-indigo-200" },
                  { label: "Submissions", val: submissionsCount, icon: Send, style: "bg-emerald-50 text-emerald-600", border: "hover:border-emerald-200" },
                  { label: "Evaluated", val: evaluatedCount, icon: CheckCircle, style: "bg-blue-50 text-blue-600", border: "hover:border-blue-200" },
                  { label: "Awaiting", val: pendingCount, icon: Clock, style: "bg-slate-100 text-slate-600", border: "hover:border-slate-300" }
                ].map((stat, i) => (
                  <div key={i} className={`group bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 ${stat.border}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <p className={`text-xs font-semibold uppercase tracking-wider text-slate-500 ${montserrat.className}`}>
                          {stat.label}
                        </p>
                        <h3 className={`text-2xl font-bold text-slate-800 ${montserrat.className}`}>
                          {stat.val}
                        </h3>
                      </div>
                      <div className={`p-3 rounded-full flex items-center justify-center ${stat.style}`}>
                        <stat.icon className="w-5 h-5" strokeWidth={2.5} />
                      </div>
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
                    <h1 className={`text-lg font-bold text-slate-900 ${montserrat.className}`}>
                      Repository Review
                    </h1>
                    <Badge
                      variant="outline"
                      className={`bg-indigo-50/50 text-indigo-600 border-indigo-100 font-semibold px-2 py-0 text-[10px] uppercase ${montserrat.className}`}
                    >
                      {selectedExercise.exerciseInformation.exerciseName}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">
                    {filteredParticipants.length} students • {selectedExercise.questions.length} questions • Total Points: {getDynamicExerciseTotal(selectedExercise)}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search students..."
                      className="pl-9 h-9 text-xs w-64 border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STUDENT LIST TABLE */}
            <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className={`w-12 px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center ${montserrat.className}`}>No.</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${montserrat.className}`}>Student Identity</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${montserrat.className}`}>Grading Status</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center ${montserrat.className}`}>Progress</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center ${montserrat.className}`}>Result</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center ${montserrat.className}`}>Pass/Fail</TableHead>
                    <TableHead className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center ${montserrat.className}`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.map((participant, index) => {
                    const getSubmissionForParticipantQuestion = (participant: Participant, questionId: string): SubmissionQuestion | null => {
                      const participantAnswers = getExerciseAnswersForSelectedExercise(participant);
                      for (const answer of participantAnswers) {
                        const submission = answer.questions.find(q => q.questionId === questionId);
                        if (submission) return submission;
                      }
                      return null;
                    };

                    const answers = getExerciseAnswersForSelectedExercise(participant);
                    const hasSubmissions = answers.length > 0;

                    let totalScore = 0;
                    let totalAnsweredQuestions = 0;
                    let allQuestionsAnswered = true;

                    const allQuestions = selectedExercise.questions;

                    allQuestions.forEach(question => {
                      const submission = getSubmissionForParticipantQuestion(participant, question._id);
                      if (submission && (submission.codeAnswer || submission.files?.length)) {
                        totalAnsweredQuestions++;
                        if (isQuestionMCQ(question)) {
                          const questionMax = getQuestionMaxScore(selectedExercise, question);
                          totalScore += submission.isCorrect ? questionMax : 0;
                        } else {
                          totalScore += submission.score || 0;
                        }
                      } else {
                        allQuestionsAnswered = false;
                      }
                    });

                    const max = getDynamicExerciseTotal(selectedExercise);

                    const isPureMCQ = selectedExercise.exerciseType === 'MCQ' ||
                      (selectedExercise.questions.length > 0 &&
                        selectedExercise.questions.every(q => isQuestionMCQ(q)));

                    let isEvaluated = false;
                    if (isPureMCQ) {
                      isEvaluated = allQuestionsAnswered && hasSubmissions;
                    } else {
                      let allProgrammingEvaluated = true;
                      allQuestions.forEach(question => {
                        if (!isQuestionMCQ(question)) {
                          const submission = getSubmissionForParticipantQuestion(participant, question._id);
                          if (submission?.status !== 'evaluated') {
                            allProgrammingEvaluated = false;
                          }
                        } else {
                          const submission = getSubmissionForParticipantQuestion(participant, question._id);
                          if (!submission?.codeAnswer && !submission?.files?.length) {
                            allProgrammingEvaluated = false;
                          }
                        }
                      });
                      isEvaluated = allProgrammingEvaluated && allQuestionsAnswered;
                    }

                    let passFailStatus: 'pass' | 'fail' | 'pending' = 'pending';
                    if (hasSubmissions && allQuestionsAnswered) {
                      const percentage = (totalScore / max) * 100;
                      passFailStatus = percentage >= 50 ? 'pass' : 'fail';
                    }

                    return (
                      <TableRow key={participant._id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors group">
                        <TableCell className="px-4 py-3 text-center">
                          <span className={`text-xs font-semibold text-slate-400 group-hover:text-indigo-500 ${montserrat.className}`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 bg-slate-800 flex items-center justify-center text-white text-[10px] font-bold rounded-md shadow-sm ${montserrat.className}`}>
                              {participant.user.firstName[0]}{participant.user.lastName[0]}
                            </div>
                            <div>
                              <div className={`text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors ${montserrat.className}`}>
                                {participant.user.firstName} {participant.user.lastName}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {participant.user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {hasSubmissions ? (
                            <Badge className={`font-bold text-[9px] uppercase tracking-wider py-0.5 px-2 border-none rounded ${isEvaluated ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"} ${montserrat.className}`}>
                              {isEvaluated ? 'Evaluated' : 'Needs Review'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={`text-[9px] uppercase tracking-wider font-bold text-slate-400 bg-slate-50 border-slate-200 py-0.5 px-2 rounded ${montserrat.className}`}>
                              No Action
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className={`text-xs font-bold text-slate-600 ${montserrat.className}`}>
                            {totalAnsweredQuestions}
                            <span className="text-slate-300 mx-1">/</span>
                            {selectedExercise.questions.length}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <div className={`flex items-center gap-1 mb-1 ${montserrat.className}`}>
                              <span className="text-xs font-bold text-slate-900">{totalScore}</span>
                              <span className="text-xs font-bold text-slate-400">/</span>
                              <span className="text-xs font-bold text-slate-500">{max}</span>
                            </div>
                            <ScoreIndicator score={totalScore} maxScore={max} />
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            {hasSubmissions && allQuestionsAnswered ? (
                              passFailStatus === 'pass' ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-[10px] px-2 py-0.5 rounded-full">
                                  ✓ Pass
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold text-[10px] px-2 py-0.5 rounded-full">
                                  ✗ Fail
                                </Badge>
                              )
                            ) : (
                              <Badge variant="outline" className="text-slate-400 bg-slate-50 border-slate-200 font-bold text-[10px] px-2 py-0.5 rounded-full">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant={hasSubmissions ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleStartGrading(participant)}
                              className={`h-8 px-4 text-[10px] font-bold rounded-md transition-all shadow-sm ${montserrat.className} ${hasSubmissions
                                ? 'bg-slate-900 hover:bg-indigo-600 text-white border-transparent'
                                : 'border-slate-200 text-slate-600 bg-white hover:text-indigo-600'
                                }`}
                            >
                              {hasSubmissions ? 'View Details' : 'Start Grading'}
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleUnlockExercise(participant.user._id, selectedExercise._id)} className="text-xs font-medium cursor-pointer text-slate-600 focus:text-indigo-600 focus:bg-indigo-50">
                                  <Unlock className="mr-2 h-3.5 w-3.5" />
                                  <span>Unlock Exercise</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewAssessmentVideo(participant.user._id, selectedExercise._id)} className="text-xs font-medium cursor-pointer text-slate-600 focus:text-emerald-600 focus:bg-emerald-50">
                                  <Play className="mr-2 h-3.5 w-3.5" />
                                  <span>Assessment Video</span>
                                </DropdownMenuItem>
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
          /* GRADING VIEW */
          <div className="h-full overflow-hidden bg-white flex flex-col">
            <div className="flex-none border-b border-slate-200 bg-white px-2 py-1">
              <div className="flex items-center justify-between w-full bg-white px-6 py-3">
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`h-9 px-4 text-xs font-bold text-slate-600 border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 rounded-full group ${montserrat.className}`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-2 text-slate-400 group-hover:text-rose-500 transition-colors" />
                    Exit Panel
                  </Button>
                </div>
                <div className="flex items-center space-x-6">
                  {selectedParticipant && (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${montserrat.className}`}>
                          Current Student
                        </span>
                      </div>
                      <span className={`text-sm font-bold text-slate-800 leading-none ${montserrat.className}`}>
                        {selectedParticipant.user.firstName} {selectedParticipant.user.lastName}
                      </span>
                    </div>
                  )}
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={handlePrevStudent} disabled={getCurrentStudentIndex() === 0} className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-full">
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Select value={selectedParticipant?._id} onValueChange={handleStudentChange}>
                      <SelectTrigger className={`h-9 border border-slate-200 bg-slate-50 focus:ring-0 px-3 min-w-[200px] text-xs font-bold text-slate-700 justify-between rounded-full hover:border-indigo-300 hover:bg-white transition-all ${montserrat.className}`}>
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                            <User className="h-3 w-3 text-indigo-500" />
                          </div>
                          <span>
                            {selectedParticipant
                              ? `${selectedParticipant.user.firstName} ${selectedParticipant.user.lastName}`
                              : "Select Student"
                            }
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent align="end" className="max-h-[300px]">
                        {participants.map(p => (
                          <SelectItem key={p._id} value={p._id} className={`text-xs font-medium cursor-pointer py-2 ${montserrat.className}`}>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                              <span>{p.user.firstName} {p.user.lastName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={handleNextStudent} disabled={getCurrentStudentIndex() === getTotalStudents() - 1} className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-full">
                      <ChevronRight className="h-5 w-5" />
                    </Button>
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
                        <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${montserrat.className}`}>
                          Assessment Qs
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setQuestionListMinimized(true)} className="h-6 w-6 p-0 hover:bg-slate-50 rounded-md text-slate-400">
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap ${montserrat.className}`}>
                          Select Level
                        </Label>
                        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                          <SelectTrigger className="h-8 text-xs font-semibold border-slate-200 rounded-md bg-slate-50/50 flex-1">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Questions</SelectItem>
                            <SelectItem value="easy">Easy Level</SelectItem>
                            <SelectItem value="medium">Medium Level</SelectItem>
                            <SelectItem value="hard">Hard Level</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-0 py-2 space-y-0 custom-scrollbar">
                      {filteredQuestions.map((question, index) => {
                        const submission = getSubmissionForQuestion(question._id);
                        const isCurrent = selectedQuestion?._id === question._id;
                        const hasSubmission = !!(submission?.codeAnswer || submission?.files?.length || submission?.othersFiles?.length);
                        const allowedMax = selectedExercise ? getQuestionMaxScore(selectedExercise, question) : question.points || 10;

                        const getDiffStyle = (diff: string) => {
                          switch (diff?.toLowerCase()) {
                            case 'hard': return 'text-rose-600 bg-rose-50 border-rose-100';
                            case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
                            default: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
                          }
                        };

                        const qIsMCQ = isQuestionMCQ(question);
                        const qDiff = getQuestionDisplayDifficulty(question);
                        const qLabel = getQuestionLabel(question);
                        const isFrontend = isFrontendQuestion(question, submission);
                        const qIsOthers = isOthersQuestion(question, submission);

                        return (
                          <div key={question._id} onClick={() => handleQuestionClick(question, index)} className={`group flex items-center justify-between gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 last:border-0 transition-colors ${isCurrent ? 'bg-indigo-50' : 'hover:bg-slate-50'} ${!hasSubmission ? 'opacity-90' : ''}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDot(submission)}`} />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold ${montserrat.className} ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>{index + 1}.</span>
                                  <span className={`px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wide ${qIsOthers ? 'bg-orange-100 text-orange-600' : isFrontend ? 'bg-emerald-100 text-emerald-600' : qIsMCQ ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {qIsOthers ? 'Others' : isFrontend ? 'Frontend' : qIsMCQ ? 'MCQ' : 'Code'}
                                  </span>
                                </div>
                                <span className={`text-xs font-medium truncate ${isCurrent ? 'text-indigo-900' : 'text-slate-700'}`}>{qLabel}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {qDiff && <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getDiffStyle(qDiff)}`}>{qDiff}</span>}
                              {!isNonGraded && (
                                <span className={`text-[10px] font-bold ${submission?.score ? 'text-indigo-600' : 'text-slate-400'} ${montserrat.className}`}>
                                  {submission?.score || 0} / {allowedMax}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center pt-4 space-y-3">
                    <Button variant="ghost" size="sm" onClick={() => setQuestionListMinimized(false)} className="h-8 w-8 rounded-full">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {selectedExercise?.questions.map((_, index) => {
                      const submission = getSubmissionForQuestion(selectedExercise.questions[index]._id);
                      const hasSubmission = !!(submission?.codeAnswer || submission?.files?.length || submission?.othersFiles?.length);
                      const isCurrent = selectedQuestion?._id === selectedExercise.questions[index]._id;
                      return (
                        <div key={index} onClick={() => handleQuestionClick(selectedExercise.questions[index], index)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[10px] font-bold transition-all cursor-pointer ${montserrat.className} ${isCurrent ? 'bg-indigo-600 text-white' : !hasSubmission ? 'bg-rose-50 text-rose-300 border border-rose-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                          {index + 1}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CENTRAL AREA */}
              <div className="flex-1 overflow-hidden">
                {isCodeMultiFileReview && frontendSubmissionData && selectedQuestion ? (
                  <StaffCodeReview
                    key={selectedQuestion._id}
                    files={frontendSubmissionData.files}
                    folders={frontendSubmissionData.folders}
                    questionTitle={getQuestionTitle(selectedQuestion)}
                    submittedAt={frontendSubmissionData.submittedAt}
                    attemptCount={frontendSubmissionData.attemptCount}
                    lateSubmission={frontendSubmissionData.lateSubmission}
                    lastTestSubmittedAt={frontendSubmissionData.lastTestSubmittedAt}
                  />
                ) : isFrontendReview && frontendSubmissionData && selectedQuestion ? (
                  <StaffFrontendReview
                    key={selectedQuestion._id}
                    onBack={() => {
                      setIsFrontendReview(false);
                      setFrontendSubmissionData(null);
                    }}
                    submission={{
                      files: frontendSubmissionData.files,
                      folders: frontendSubmissionData.folders,
                      questionId: frontendSubmissionData.questionId,
                      exerciseId: frontendSubmissionData.exerciseId,
                      status: frontendSubmissionData.status,
                      score: frontendSubmissionData.score,
                      feedback: frontendSubmissionData.feedback,
                      submittedAt: frontendSubmissionData.submittedAt,
                      attemptCount: frontendSubmissionData.attemptCount,
                      participantName: frontendSubmissionData.participantName,
                      participantEmail: frontendSubmissionData.participantEmail
                    }}
                    title={getQuestionTitle(selectedQuestion)}
                    initialFiles={frontendSubmissionData.files}
                    initialFolders={frontendSubmissionData.folders}
                    isLoadingSubmission={false}
                    selectedLanguages={selectedExercise?.programmingSettings?.selectedLanguages || ['html', 'css', 'javascript']}
                    questionTitle={getQuestionTitle(selectedQuestion)}
                    questionId={selectedQuestion._id}
                    exerciseId={selectedExercise?._id}
                    exerciseName={selectedExercise?.exerciseInformation?.exerciseName}
                    participantId={selectedParticipant?.user?._id}
                    category={selectedExercise?._category}
                    subcategory={selectedExercise?._subcategory}
                  />
                ) : isOthersReview && selectedQuestion ? (
                  /* OTHERS QUESTION REVIEW */
                  <OthersReviewPanel
                    question={selectedQuestion}
                    submission={submissionQuestion}
                    montserrat={montserrat}
                    inter={inter}
                  />
                ) : isQuestionMCQ(selectedQuestion) ? (
                  /* MCQ QUESTION VIEW */
                  <div className="h-full overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">
                    <div className="bg-slate-950 rounded-xl p-5 border border-slate-800">
                      <span className={`text-[9px] font-bold text-violet-400 uppercase tracking-widest mb-2 block ${montserrat.className}`}>
                        {selectedQuestion?.mcqQuestionType?.replace('_', ' ') || 'Multiple Choice'} • {maxScore} points
                      </span>
                      <h2 className={`text-sm font-semibold text-white leading-relaxed ${inter.className}`}>
                        {getQuestionTitle(selectedQuestion)}
                      </h2>
                      {getQuestionDescription(selectedQuestion) && (
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          {getQuestionDescription(selectedQuestion)}
                        </p>
                      )}
                    </div>

                    {submissionQuestion?.codeAnswer ? (
                      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border ${submissionQuestion.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                        <User className={`h-3.5 w-3.5 shrink-0 ${submissionQuestion.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`} />
                        <span className={`text-xs font-semibold ${submissionQuestion.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                          Student answered:
                        </span>
                        <span className={`text-xs font-bold ${submissionQuestion.isCorrect ? 'text-emerald-900' : 'text-rose-900'}`}>
                          "{submissionQuestion.codeAnswer}"
                        </span>
                        <span className={`ml-auto text-[10px] font-bold uppercase tracking-wide ${submissionQuestion.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {submissionQuestion.isCorrect ? '✓ Correct' : '✗ Wrong'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border bg-slate-50 border-slate-200">
                        <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500">Student has not answered this question</span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {(selectedQuestion?.mcqQuestionOptions || []).map((option, idx) => {
                        const studentAnswer = submissionQuestion?.codeAnswer || '';
                        const isStudentChoice = !!studentAnswer && option.text.trim() === studentAnswer.trim();
                        const isCorrectOpt = option.isCorrect ||
                          (selectedQuestion?.mcqQuestionCorrectAnswers || []).includes(option.text);

                        let containerCls = 'border-slate-200 bg-white';
                        let labelText = '';
                        let labelCls = '';
                        let letterCls = 'border-slate-300 text-slate-500 bg-slate-50';

                        if (isCorrectOpt && isStudentChoice) {
                          containerCls = 'border-emerald-400 bg-emerald-50';
                          labelText = '✓ Correct Answer';
                          labelCls = 'text-emerald-600 font-bold';
                          letterCls = 'border-emerald-400 text-emerald-700 bg-emerald-100';
                        } else if (isCorrectOpt) {
                          containerCls = 'border-emerald-200 bg-emerald-50/40';
                          labelText = 'Correct Answer';
                          labelCls = 'text-emerald-500 font-medium';
                          letterCls = 'border-emerald-300 text-emerald-600 bg-emerald-50';
                        } else if (isStudentChoice) {
                          containerCls = 'border-rose-400 bg-rose-50';
                          labelText = '✗ Student\'s Choice';
                          labelCls = 'text-rose-600 font-bold';
                          letterCls = 'border-rose-400 text-rose-700 bg-rose-100';
                        }

                        return (
                          <div key={idx} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-all ${containerCls}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold shrink-0 ${letterCls}`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="text-sm font-medium text-slate-800 leading-snug">{option.text}</span>
                              {option.imageUrl && <img src={option.imageUrl} alt="" className="h-10 w-auto rounded object-contain ml-2" />}
                            </div>
                            {labelText && (
                              <span className={`text-[10px] uppercase tracking-wide shrink-0 ${labelCls} ${montserrat.className}`}>
                                {labelText}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* STANDARD MONACO EDITOR VIEW */
                  <div className="h-full flex flex-col">
                    {/* Submission meta strip — Attempt · Submitted · LATE */}
                    {(() => {
                      const meta = getCurrentAnswerMeta();
                      if (!meta) return null;
                      return (
                        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b shrink-0" style={{ background: "#f8f9fa", borderColor: "#e5e7eb" }}>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold" style={{ background: "#f3f4f6", color: "#374151" }}>
                            Attempt {meta.attemptCount}
                          </span>
                          {meta.submittedAt && (
                            <span className="px-2 py-0.5 rounded text-[11px]" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                              Submitted {new Date(meta.submittedAt).toLocaleString()}
                            </span>
                          )}
                          {meta.lateSubmission && (
                            <span
                              className="px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 animate-pulse"
                              style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}
                              title={meta.lastTestSubmittedAt ? `Submitted late at ${new Date(meta.lastTestSubmittedAt).toLocaleString()}` : "Late submission"}
                            >
                              ⚠ LATE SUBMISSION
                              {meta.lastTestSubmittedAt && (
                                <span className="font-medium ml-1" style={{ color: "#7f1d1d" }}>
                                  {new Date(meta.lastTestSubmittedAt).toLocaleString()}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${montserrat.className}`}>
                          {submissionQuestion?.language || 'Code'}
                        </span>
                        {submissionQuestion?.language && (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-500 uppercase ${montserrat.className}`}>
                            {submissionQuestion.language}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {submissionQuestion?.codeAnswer && (
                          <Button
                            size="sm"
                            onClick={initiateRunCode}
                            disabled={isExecuting}
                            className={`h-7 px-3 text-[10px] font-bold uppercase tracking-wide bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-all ${montserrat.className}`}
                          >
                            {isExecuting ? (
                              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Running...</>
                            ) : (
                              <><Play className="w-3 h-3 mr-1.5" />Run Code</>
                            )}
                          </Button>
                        )}
                        {showTerminal ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTerminal(false)}
                            className={`h-7 px-3 text-[10px] font-bold text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md ${montserrat.className}`}
                          >
                            <X className="w-3 h-3 mr-1.5" />Console
                          </Button>
                        ) : terminalLogs.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTerminal(true)}
                            className={`h-7 px-3 text-[10px] font-bold text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md ${montserrat.className}`}
                          >
                            <Terminal className="w-3 h-3 mr-1.5" />Console
                          </Button>
                        )}
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-800">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className={`text-[9px] font-bold text-slate-500 uppercase tracking-widest ${montserrat.className}`}>Ready</span>
                          <Separator orientation="vertical" className="h-3 bg-slate-800" />
                          <span className={`text-[9px] font-bold text-indigo-400 uppercase tracking-widest ${montserrat.className}`}>UTF-8</span>
                        </div>
                      </div>
                    </div>

                    {/* Editor or empty state */}
                    {submissionQuestion?.codeAnswer ? (
                      <div className="flex-1 w-full">
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
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4 border border-slate-800">
                          <Code className="h-6 w-6 text-slate-600" />
                        </div>
                        <h4 className={`text-sm font-bold text-slate-400 uppercase tracking-widest mb-1 ${montserrat.className}`}>
                          No Code Found
                        </h4>
                        <p className="text-xs text-slate-600 max-w-xs font-medium leading-relaxed">
                          The student has not submitted any code for this question yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

             {/* GRADING SIDEBAR - Only show when exercise is graded */}
{!isNonGraded && (
  <div className="w-72 flex flex-col bg-white">
    <div className="p-5 h-full flex flex-col gap-6">
      {/* Grading Header */}
      <div>
        <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 ${montserrat.className}`}>
          <Award className="h-3.5 w-3.5 text-amber-500" />
          Grading
        </h3>

        {/* MCQ Question Grading */}
        {isQuestionMCQ(selectedQuestion) && submissionQuestion && (
          <div className={`mb-3 p-4 rounded-lg border ${submissionQuestion.isCorrect ? 'bg-emerald-50 border-emerald-200' : submissionQuestion.codeAnswer ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'} ${montserrat.className}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {submissionQuestion.isCorrect ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                <span className="text-xs font-semibold">
                  {submissionQuestion.isCorrect ? 'Auto-graded: Correct' : submissionQuestion.codeAnswer ? 'Auto-graded: Incorrect' : 'Not answered'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{submissionQuestion.isCorrect ? maxScore : 0}<span className="text-xs text-slate-500 font-normal"> / {maxScore}</span></div>
                <div className="text-[10px] text-slate-500">{((submissionQuestion.isCorrect ? maxScore : 0) / maxScore * 100).toFixed(0)}% of total</div>
              </div>
            </div>
            {submissionQuestion.codeAnswer && (
              <div className="mt-3 pt-2 border-t border-slate-200">
                <div className="text-[10px] text-slate-500 mb-1">Student's Answer:</div>
                <div className="text-xs font-medium text-slate-700 bg-white p-2 rounded border border-slate-200">
                  "{submissionQuestion.codeAnswer}"
                </div>
              </div>
            )}
            <div className="mt-3 text-[10px] text-slate-400 italic flex items-center gap-1">
              <Lock className="h-3 w-3" />
              MCQ scores are auto-calculated based on answer correctness
            </div>
          </div>
        )}

        {/* Programming/Others Question Score Input */}
        {!isQuestionMCQ(selectedQuestion) && !isFrontendReview && !isCodeMultiFileReview && !isOthersReview && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <Label className={`text-xs font-bold text-slate-700 ${montserrat.className}`}>Score Awarded</Label>
                <span className={`text-[10px] font-semibold text-slate-500 ${montserrat.className}`}>Max: {maxScore}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max={maxScore}
                  value={score}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                    setScore(Math.min(maxScore, Math.max(0, val)));
                  }}
                  className={`h-9 bg-white border-slate-300 text-sm font-bold text-slate-900 ${montserrat.className}`}
                />
                <div className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-400">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-[10px] text-slate-500">{((score / maxScore) * 100).toFixed(0)}% of total marks</div>
              </div>
            </div>
          </div>
        )}

        {/* Frontend / Code multi-file Review Score Input */}
        {(isFrontendReview || isCodeMultiFileReview) && frontendSubmissionData && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <Label className={`text-xs font-bold text-slate-700 ${montserrat.className}`}>Score Awarded</Label>
                <span className={`text-[10px] font-semibold text-slate-500 ${montserrat.className}`}>Max: {maxScore}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max={maxScore}
                  value={score}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                    setScore(Math.min(maxScore, Math.max(0, val)));
                  }}
                  className={`h-9 bg-white border-slate-300 text-sm font-bold text-slate-900 ${montserrat.className}`}
                />
                <div className="h-9 w-9 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-400">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-[10px] text-slate-500">{((score / maxScore) * 100).toFixed(0)}% of total marks</div>
              </div>
            </div>
          </div>
        )}

        {/* Others Review Score Input */}
        {isOthersReview && (
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[9px] font-bold text-orange-600 uppercase tracking-widest ${montserrat.className}`}>
                {selectedQuestion?.othersQuestionType === 'notion' ? 'Written Response' : 'File Upload'} • Manual Grading
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <Label className={`text-xs font-bold text-slate-700 ${montserrat.className}`}>Score Awarded</Label>
                <span className={`text-[10px] font-semibold text-slate-500 ${montserrat.className}`}>Max: {maxScore}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max={maxScore}
                  value={score}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                    setScore(Math.min(maxScore, Math.max(0, val)));
                  }}
                  className={`h-9 bg-white border-slate-300 text-sm font-bold text-slate-900 ${montserrat.className}`}
                />
                <div className="h-9 w-9 flex items-center justify-center bg-white border border-orange-200 rounded-md text-orange-400">
                  <Award className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-center">
                <div className="text-[10px] text-slate-500">{maxScore > 0 ? ((score / maxScore) * 100).toFixed(0) : 0}% of total marks</div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2 ${montserrat.className}`}>
            <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
            Feedback
          </h3>
          <Textarea
            placeholder="Enter your observations or corrections here..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="flex-1 bg-slate-50 border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-700 resize-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all custom-scrollbar"
          />
        </div>

        {/* Save Buttons - Only for non-MCQ questions */}
        {!isQuestionMCQ(selectedQuestion) && (
          <div className="pt-4 border-t border-slate-50 relative">
            {saveSuccess && (
              <div className="absolute -top-3 left-0 right-0 flex justify-center animate-in slide-in-from-bottom-2 fade-in duration-300 pointer-events-none">
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-emerald-100">
                  <Check className="h-3 w-3" />
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${montserrat.className}`}>Saved</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={(isFrontendReview || isCodeMultiFileReview) && frontendSubmissionData
                  ? () => saveFrontendGrade(score, feedbackText)
                  : () => saveGrade()
                }
                disabled={isSaving}
                className={`flex-1 h-10 text-[10px] font-bold uppercase tracking-wide border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 ${montserrat.className}`}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={async () => {
                  const success = (isFrontendReview || isCodeMultiFileReview) && frontendSubmissionData
                    ? await saveFrontendGrade(score, feedbackText)
                    : await saveGrade();
                  if (success) {
                    setTimeout(() => {
                      if (selectedExercise && currentQuestionIndex < selectedExercise.questions.length - 1) {
                        handleQuestionClick(
                          selectedExercise.questions[currentQuestionIndex + 1],
                          currentQuestionIndex + 1
                        );
                      } else if (getCurrentStudentIndex() < getTotalStudents() - 1) {
                        handleNextStudent();
                      } else {
                        toast.success('All graded!');
                        setViewMode('list');
                      }
                    }, 800);
                  }
                }}
                disabled={isSaving}
                className={`flex-1 h-10 text-[10px] font-bold uppercase tracking-wide bg-slate-900 hover:bg-indigo-600 text-white rounded-md shadow-sm transition-all ${montserrat.className}`}
              >
                {isSaving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Saving...</> : 'Save & Next'}
              </Button>
            </div>
          </div>
        )}

        {/* MCQ Info Message */}
        {isQuestionMCQ(selectedQuestion) && (
          <div className="pt-4 border-t border-slate-50">
            <div className="bg-slate-100 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-500 font-medium">
                <CheckCircle className="h-3 w-3 inline mr-1 text-emerald-500" />
                MCQ questions are auto-graded
              </div>
              <div className="text-[9px] text-slate-400 mt-1">Score is automatically calculated based on answer correctness</div>
              <div className="text-[9px] text-slate-400 mt-2 pt-1 border-t border-slate-200">
                <MessageSquare className="h-3 w-3 inline mr-1" />
                You can still add feedback above
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
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
            {(modalQuestion || selectedQuestion) ? (() => {
              const q = modalQuestion || selectedQuestion!;
              const qMax = selectedExercise ? getQuestionMaxScore(selectedExercise, q) : (q.points || 0);
              const qIsMCQ = isQuestionMCQ(q);
              return (
                <ScrollArea className="flex-1 p-6 max-h-[70vh] custom-scrollbar">
                  <div className="space-y-5">
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${qIsMCQ ? 'bg-violet-800 text-violet-200' : 'bg-indigo-800 text-indigo-200'}`}>
                          {qIsMCQ ? 'MCQ' : 'Programming'}
                        </span>
                      </div>
                      <h2 className={`text-base font-bold text-white mb-3 leading-tight ${montserrat.className}`}>{getQuestionTitle(q)}</h2>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`bg-white text-slate-950 font-bold text-[9px] uppercase tracking-wide border-none px-2.5 py-0.5 ${montserrat.className}`}>{qMax} Points</Badge>
                        {!qIsMCQ && q.timeLimit != null && (<Badge variant="outline" className={`border-slate-800 text-slate-400 font-bold text-[9px] uppercase tracking-wide px-2.5 py-0.5 ${montserrat.className}`}>Time: {q.timeLimit}s</Badge>)}
                        {qIsMCQ && q.mcqQuestionDifficulty && (<Badge variant="outline" className={`border-slate-800 text-slate-400 font-bold text-[9px] uppercase tracking-wide px-2.5 py-0.5 ${montserrat.className}`}>{q.mcqQuestionDifficulty}</Badge>)}
                      </div>
                    </div>

                    {getQuestionDescription(q) && (
                      <div>
                        <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ${montserrat.className}`}>{qIsMCQ ? 'Question Description' : 'Context & Requirements'}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">{getQuestionDescription(q)}</p>
                      </div>
                    )}

                    {qIsMCQ && q.mcqQuestionOptions && q.mcqQuestionOptions.length > 0 && (
                      <div>
                        <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 ${montserrat.className}`}>Options &amp; Correct Answer</h3>
                        <div className="space-y-2">
                          {q.mcqQuestionOptions.map((opt, idx) => {
                            const isCorrect = opt.isCorrect || (q.mcqQuestionCorrectAnswers || []).includes(opt.text);
                            return (
                              <div key={idx} className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-bold shrink-0 ${isCorrect ? 'border-emerald-400 text-emerald-700 bg-emerald-100' : 'border-slate-300 text-slate-500 bg-slate-50'}`}>
                                  {String.fromCharCode(65 + idx)}
                                </span>
                                <span className={`text-sm flex-1 ${isCorrect ? 'font-semibold text-emerald-800' : 'font-medium text-slate-700'}`}>{opt.text}</span>
                                {isCorrect && (<span className={`text-[10px] font-bold text-emerald-600 uppercase tracking-wide ${montserrat.className}`}>✓ Correct</span>)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!qIsMCQ && (
                      <div className="grid grid-cols-2 gap-4">
                        {q.sampleInput && (
                          <div className="space-y-2">
                            <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${montserrat.className}`}>Input Pattern</h3>
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800"><pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap">{q.sampleInput}</pre></div>
                          </div>
                        )}
                        {q.sampleOutput && (
                          <div className="space-y-2">
                            <h3 className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${montserrat.className}`}>Expected Output</h3>
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800"><pre className="text-[10px] font-mono text-indigo-400 whitespace-pre-wrap">{q.sampleOutput}</pre></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              );
            })() : null}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setShowQuestionModal(false)} className={`bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wide px-6 rounded-md h-9 ${montserrat.className}`}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ASSESSMENT VIDEO MODAL */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className={`max-w-4xl rounded-xl border-none shadow-2xl p-0 overflow-hidden bg-black ${inter.className}`} onCloseAutoFocus={(e) => { e.preventDefault(); }} onOpenAutoFocus={(e) => { e.preventDefault(); }}>
          <div className="flex flex-col h-full">
            <DialogHeader className="p-4 pb-2 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between">
                <DialogTitle className={`text-sm font-bold text-white uppercase tracking-tight ${montserrat.className}`}>Assessment Screen Recording</DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowVideoModal(false); setAssessmentVideoUrl(null); setIsLoadingVideo(false); }} className="rounded-full h-8 w-8 p-0 hover:bg-slate-800"><X className="h-4 w-4 text-white" /></Button>
              </div>
              {selectedParticipant && (<p className="text-xs text-slate-400 mt-1">{selectedParticipant.user.firstName} {selectedParticipant.user.lastName} • {selectedExercise?.exerciseInformation.exerciseName}</p>)}
            </DialogHeader>
            <div className="flex-1 p-0 bg-black">
              {isLoadingVideo ? (
                <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /><span className="ml-3 text-slate-400 text-sm">Loading video...</span></div>
              ) : assessmentVideoUrl ? (
                <div className="relative w-full h-full"><video key={assessmentVideoUrl} controls autoPlay className="w-full h-auto max-h-[70vh]" controlsList="nodownload" onEnded={() => { const video = document.querySelector('video'); if (video) video.currentTime = 0; }}><source src={assessmentVideoUrl} type="video/mp4" />Your browser does not support the video tag.</video></div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-center p-6"><div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800"><FileQuestion className="h-8 w-8 text-slate-600" /></div><h4 className={`text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 ${montserrat.className}`}>No Recording Available</h4><p className="text-sm text-slate-600 max-w-md font-medium leading-relaxed">This student hasn't submitted any screen recording for this assessment yet.</p></div>
              )}
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end"><Button onClick={() => { setShowVideoModal(false); setAssessmentVideoUrl(null); setIsLoadingVideo(false); }} className={`bg-slate-800 text-white font-bold text-xs uppercase tracking-wide px-6 rounded-md h-9 hover:bg-slate-700 ${montserrat.className}`}>Close</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}