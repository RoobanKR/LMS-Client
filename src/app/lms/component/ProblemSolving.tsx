import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, FileCode, RefreshCw, Loader2, Trash2,
  ChevronLeft, ChevronRight, MoreVertical, Calendar, Code,
  AlertTriangle, X, Zap, CheckCircle, Edit3, BarChart3,
  Laptop, Code2, Search,
  FileText, Database, Eye, PlayCircle, CheckCircle2, Check,
  ArrowLeft, GraduationCap, Award, HelpCircle, Info, XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';  // instead of react-toastify
// import 'react-toastify/dist/ReactToastify.css';
import AddQuestionViaDocument from './AddQuestionViaDocument';

import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@radix-ui/react-select';

import ExerciseSettings from './ExerciseSettings';
import Questions from './QuestionsView';
import AddQuestionForm from './questionforms/AddQuestionForm';
import { exerciseApi, EntityType } from '@/apiServices/exercise';
import QuestionBankSelector from './questionforms/mcq/QuestionBankSelector';
import { Play } from 'next/font/google';

// ─── Design tokens (parity with QuestionsView) ────────────────────────────────
const JKT: React.CSSProperties = {
  fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};


const isProgrammingType = (q: Question) =>
  q.questionType === 'programming' || q.questionType === 'database' || q.questionType === 'others';
// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

interface HierarchyData {
  courseName: string;
  moduleName: string;
  submoduleName: string;
  topicName: string;
  subtopicName: string;
  nodeType: string;
  level: number;
}

interface Question {
  _id: string;
  questionType: 'mcq' | 'programming';
  mcqQuestionScore?: number;
  score?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  [key: string]: any;
}

interface Exercise {
  _id: string;
  isGraded?: boolean;
  exerciseInformation: {
    exerciseId: string;
    exerciseName: string;
    description: string;
    exerciseLevel: 'beginner' | 'intermediate' | 'expert';
    totalDuration: number;
    totalMarks: number;
    totalMarksMCQ?: number;
    totalMarksProgramming?: number;
  };
  exerciseType: 'MCQ' | 'Programming' | 'Combined';
  tabType: 'I_Do' | 'We_Do' | 'You_Do';
  subcategory: string;
  configurationType: any;
  programmingSettings?: {
    selectedModule: string;
    selectedLanguages: string[];
  };
  questionConfiguration?: {
    mcqQuestionConfiguration?: {
      totalMcqQuestions: number;
      marksPerQuestion: number;
      mcqTotalMarks: number;
      scoringType?: string;
    };
    programmingQuestionConfiguration?: {
      questionConfigType: 'levelBased' | 'selectionLevel' | 'general';
      generalQuestionCount?: number;
      generalMarksPerQuestion?: number;
      levelBasedCounts?: { easy?: number; medium?: number; hard?: number };
      selectionLevelCounts?: { easy?: number; medium?: number; hard?: number };
      scoreSettings?: {
        totalMarks?: number;
        scoreType?: string;
        evenMarks?: number;
        levelBasedMarks?: { easy?: number; medium?: number; hard?: number };
        levelScoringConfiguration?: {
          easy?: { questionCount: number; totalMarks: number; marksPerQuestion: number; type?: string };
          medium?: { questionCount: number; totalMarks: number; marksPerQuestion: number; type?: string };
          hard?: { questionCount: number; totalMarks: number; marksPerQuestion: number; type?: string };
        };
      };
      allowCodeExecution?: boolean;
      enableTestCases?: boolean;
    };
  };
  availabilityPeriod?: {
    startDate?: string;
    endDate?: string;
    gracePeriodAllowed?: boolean;
    gracePeriodDate?: string;
    remainedMe?: string;
  };
  notificatonandGradeSettings?: {
    notifyUsers?: boolean;
    notifyGmail?: boolean;
    notifyWhatsApp?: boolean;
    gradeSheet?: boolean;
  };
  createdAt: string;
  updatedAt?: string;
  questions?: Question[];
}

interface ProblemSolvingProps {
  nodeId: string;
  nodeName: string;
  subcategory: string;
  subcategoryLabel: string;
  hierarchyData: HierarchyData;
  onRefresh?: () => Promise<void>;
  activeTab: 'I_Do' | 'We_Do' | 'You_Do';
  nodeType: string;
  courseId: string;
  configuredLanguages?: { coreProgram?: string[]; frontend?: string[]; database?: string[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helper functions (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const calculateTotalMCQScore = (ex: Exercise): number =>
  (ex.questions ?? []).filter(q => q.questionType === 'mcq')
    .reduce((s, q) => s + (q.mcqQuestionScore ?? 0), 0);

const calculateTotalProgrammingScore = (ex: Exercise): number =>
  (ex.questions ?? []).filter(isProgrammingType)
    .reduce((s, q) => s + (q.score ?? 0), 0);


const getMCQQuestionCount = (ex: Exercise): number =>
  (ex.questions ?? []).filter(q => q.questionType === 'mcq').length;

const getProgrammingCountByDiff = (ex: Exercise, diff: 'easy' | 'medium' | 'hard'): number =>
  (ex.questions ?? []).filter(q => isProgrammingType(q) && q.difficulty === diff).length;
const getProgrammingScoreByDiff = (ex: Exercise, diff: 'easy' | 'medium' | 'hard'): number =>
  (ex.questions ?? [])
    .filter(q => isProgrammingType(q) && q.difficulty === diff)
    .reduce((s, q) => s + (q.score ?? 0), 0);

const calculateTotalScore = (ex: Exercise): number =>
  (ex.questions ?? []).reduce((s, q) =>
    s + (q.questionType === 'mcq' ? (q.mcqQuestionScore ?? 0) : isProgrammingType(q) ? (q.score ?? 0) : 0), 0);

const getRemainingMarks = (ex: Exercise): number =>
  Math.max(0, (ex.exerciseInformation?.totalMarks ?? 0) - calculateTotalScore(ex));

const getScoreUsagePercentage = (ex: Exercise): number => {
  const total = ex.exerciseInformation?.totalMarks ?? 0;
  if (total === 0) return 0;
  return Math.min(100, (calculateTotalScore(ex) / total) * 100);
};

const canAddMCQInCombined = (ex: Exercise): { canAdd: boolean; reason?: string } => {
  const cfg = ex.questionConfiguration?.mcqQuestionConfiguration;
  if (!cfg) return { canAdd: false, reason: 'MCQ configuration not found' };
  const count = getMCQQuestionCount(ex);
  const score = calculateTotalMCQScore(ex);
  if (count >= cfg.totalMcqQuestions)
    return { canAdd: false, reason: `MCQ limit reached (${count}/${cfg.totalMcqQuestions})` };
  if (score >= cfg.mcqTotalMarks)
    return { canAdd: false, reason: `MCQ marks limit reached (${score}/${cfg.mcqTotalMarks})` };
  return { canAdd: true };
};

const canAddProgrammingInCombined = (
  ex: Exercise,
  diff: 'easy' | 'medium' | 'hard'
): { canAdd: boolean; reason?: string; remainingCount?: number; remainingMarks?: number } => {
  const progCfg = ex.questionConfiguration?.programmingQuestionConfiguration;
  if (!progCfg) return { canAdd: false, reason: 'Programming configuration not found' };
  const configType = progCfg.questionConfigType;
  if (configType === 'general') {
    const maxQ = progCfg.generalQuestionCount ?? Infinity;
    const maxM = progCfg.scoreSettings?.totalMarks ?? 0;
    const curCnt = (ex.questions ?? []).filter(isProgrammingType).length;
    const curScr = calculateTotalProgrammingScore(ex);
    if (curCnt >= maxQ) return { canAdd: false, reason: `Programming limit reached (${curCnt}/${maxQ})`, remainingCount: 0 };
    if (maxM > 0 && curScr >= maxM) return { canAdd: false, reason: `Programming marks limit reached (${curScr}/${maxM})`, remainingMarks: 0 };
    return {
      canAdd: true,
      remainingCount: maxQ === Infinity ? undefined : (maxQ as number) - curCnt,
      remainingMarks: maxM > 0 ? maxM - curScr : undefined,
    };
  }
  if (configType === 'levelBased') {
    const lc = progCfg.scoreSettings?.levelScoringConfiguration?.[diff];
    if (!lc) return { canAdd: false, reason: `${diff} level not configured` };
    const cnt = getProgrammingCountByDiff(ex, diff);
    const scr = getProgrammingScoreByDiff(ex, diff);
    const isQspec = (lc as any).type === 'question_specific';
    if (cnt >= lc.questionCount) return { canAdd: false, reason: `${diff} count limit (${cnt}/${lc.questionCount})`, remainingCount: 0, remainingMarks: lc.totalMarks - scr };
    if (!isQspec && scr >= lc.totalMarks) return { canAdd: false, reason: `${diff} marks limit (${scr}/${lc.totalMarks})`, remainingCount: lc.questionCount - cnt, remainingMarks: 0 };
    return { canAdd: true, remainingCount: lc.questionCount - cnt, remainingMarks: isQspec ? undefined : lc.totalMarks - scr };
  }
  if (configType === 'selectionLevel') {
    const sel = progCfg.selectionLevelCounts ?? {};
    if (!sel[diff] || sel[diff] === 0) return { canAdd: false, reason: `${diff} level not enabled` };
    const cnt = getProgrammingCountByDiff(ex, diff);
    const max = sel[diff]!;
    if (cnt >= max) return { canAdd: false, reason: `${diff} count limit (${cnt}/${max})`, remainingCount: 0 };
    return { canAdd: true, remainingCount: max - cnt };
  }
  return { canAdd: false, reason: 'Unknown config type' };
};

const canAddAnyQuestionInCombined = (ex: Exercise): {
  canAddMCQ: boolean; canAddProgramming: boolean;
  mcqReason?: string; programmingReason?: string; hasAnyAvailable: boolean;
} => {
  const mcqChk = canAddMCQInCombined(ex);
  const progCfg = ex.questionConfiguration?.programmingQuestionConfiguration;
  let canAddProg = false, progReason = '';
  if (!progCfg) {
    progReason = 'Programming configuration not found';
  } else {
    const ct = progCfg.questionConfigType;
    if (ct === 'general') {
      const maxQ = progCfg.generalQuestionCount ?? Infinity;
      const curCnt = (ex.questions ?? []).filter(isProgrammingType).length;

      if (curCnt >= maxQ) { progReason = `Programming limit (${curCnt}/${maxQ})`; canAddProg = false; }
      else { canAddProg = true; progReason = `${maxQ - curCnt} questions remaining`; }
    } else if (ct === 'levelBased') {
      const lc = progCfg.scoreSettings?.levelScoringConfiguration;
      const diffs: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      const reasons: string[] = [];
      diffs.forEach(d => {
        if ((lc as any)?.[d]) { const r = canAddProgrammingInCombined(ex, d); if (r.canAdd) canAddProg = true; else reasons.push(`${d}: ${r.reason}`); }
      });
      progReason = reasons.join('; ');
    } else if (ct === 'selectionLevel') {
      const sel = progCfg.selectionLevelCounts ?? {};
      const diffs: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      const reasons: string[] = [];
      diffs.forEach(d => {
        if ((sel[d] ?? 0) > 0) { const r = canAddProgrammingInCombined(ex, d); if (r.canAdd) canAddProg = true; else reasons.push(`${d}: ${r.reason}`); }
      });
      progReason = reasons.join('; ');
    }
  }
  return { canAddMCQ: mcqChk.canAdd, canAddProgramming: canAddProg, mcqReason: mcqChk.reason, programmingReason: progReason, hasAnyAvailable: mcqChk.canAdd || canAddProg };
};

const hasReachedMaxMarks = (ex: Exercise): boolean => {
  if (ex.exerciseType === 'Combined') {
    const { canAddMCQ, canAddProgramming } = canAddAnyQuestionInCombined(ex);
    return !canAddMCQ && !canAddProgramming;
  }
  if (ex.exerciseType === 'Programming' || ex.exerciseType === 'Other') {
    const progCfg = ex.questionConfiguration?.programmingQuestionConfiguration;
    if (progCfg?.questionConfigType === 'general' && progCfg.generalQuestionCount != null) {
      const curCnt = (ex.questions ?? []).filter(isProgrammingType).length;
      return curCnt >= progCfg.generalQuestionCount;
    }
    if (progCfg?.questionConfigType === 'levelBased' || progCfg?.questionConfigType === 'selectionLevel') {
      const diffs: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      return diffs.every(d => !canAddProgrammingInCombined(ex, d).canAdd);
    }
  }
  return calculateTotalScore(ex) >= (ex.exerciseInformation?.totalMarks ?? 0);
};

// Returns true only when all required exercise settings fields are filled
const isExerciseComplete = (ex: Exercise): boolean => {
  if (!ex.exerciseType) return false;
  if (!ex.exerciseInformation?.exerciseName?.trim()) return false;
  if (!ex.availabilityPeriod?.startDate) return false;

  if (ex.isGraded !== false) {
    if (ex.exerciseType === 'Combined') {
      if ((ex.exerciseInformation?.totalMarksMCQ ?? 0) <= 0) return false;
      if ((ex.exerciseInformation?.totalMarksProgramming ?? 0) <= 0) return false;
    } else {
      if ((ex.exerciseInformation?.totalMarks ?? 0) <= 0) return false;
    }
  }

  const saved: string[] = Array.isArray((ex as any).stepsSaved)
    ? (ex as any).stepsSaved
    : [];

  const requiredSteps = [
    'Exercise Details',
    'Question Configuration',
    'Schedule',
    'Notifications',
  ];

  // Accept both "Mark Settings" and "Grade Settings"
  if (ex.isGraded !== false) requiredSteps.push('Grade Settings');

  return requiredSteps.every(step => saved.includes(step));
};
interface LevelDetail {
  available: boolean; current: number; max: number;
  currentMarks: number; maxMarks: number;
  remainingCount: number; remainingMarks?: number; reason: string;
}

interface ProgrammingStatusFull {
  available: boolean;
  configType: 'general' | 'levelBased' | 'selectionLevel' | 'unknown';
  generalCurrent?: number; generalMax?: number;
  generalCurrentMarks?: number; generalMaxMarks?: number;
  generalRemainingCount?: number; generalRemainingMarks?: number;
  marksPerQuestion?: number;
  levels: Record<string, LevelDetail>;
  reason: string;
}

const buildProgrammingStatus = (exercise: Exercise): ProgrammingStatusFull => {
  const progCfg = exercise.questionConfiguration?.programmingQuestionConfiguration;
  const empty: ProgrammingStatusFull = { available: false, configType: 'unknown', levels: {}, reason: 'Programming configuration not found' };
  if (!progCfg) return empty;
  const ct = progCfg.questionConfigType;
  const allProgQuestions = (exercise.questions ?? []).filter(isProgrammingType);
  if (ct === 'general') {
    const maxQ = progCfg.generalQuestionCount ?? 0;
    const maxM = progCfg.scoreSettings?.totalMarks ?? 0;
    const marksPerQ = progCfg.generalMarksPerQuestion ?? progCfg.scoreSettings?.evenMarks ?? 0;
    const curCnt = allProgQuestions.length;
    const curScr = calculateTotalProgrammingScore(exercise);
    const available = maxQ > 0 ? curCnt < maxQ : true;
    return {
      available, configType: 'general',
      generalCurrent: curCnt, generalMax: maxQ > 0 ? maxQ : undefined,
      generalCurrentMarks: curScr, generalMaxMarks: maxM > 0 ? maxM : undefined,
      generalRemainingCount: maxQ > 0 ? Math.max(0, maxQ - curCnt) : undefined,
      generalRemainingMarks: maxM > 0 ? Math.max(0, maxM - curScr) : undefined,
      marksPerQuestion: marksPerQ > 0 ? marksPerQ : undefined,
      levels: {},
      reason: available ? '' : (maxQ > 0 && curCnt >= maxQ ? `Question limit reached (${curCnt}/${maxQ})` : `Marks limit reached (${curScr}/${maxM})`),
    };
  }
  if (ct === 'levelBased') {
    const lscfg = progCfg.scoreSettings?.levelScoringConfiguration ?? {};
    const diffs: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
    let anyAvail = false;
    const levels: Record<string, LevelDetail> = {};
    diffs.forEach(d => {
      const lc = (lscfg as any)[d];
      if (!lc || lc.questionCount === 0) return;
      const cnt = getProgrammingCountByDiff(exercise, d);
      const scr = getProgrammingScoreByDiff(exercise, d);
      const isQspec = lc.type === 'question_specific';
      const countAvail = cnt < lc.questionCount, marksAvail = isQspec || scr < lc.totalMarks;
      const avail = countAvail && marksAvail;
      if (avail) anyAvail = true;
      levels[d] = { available: avail, current: cnt, max: lc.questionCount, currentMarks: scr, maxMarks: lc.totalMarks, remainingCount: Math.max(0, lc.questionCount - cnt), remainingMarks: isQspec ? undefined : Math.max(0, lc.totalMarks - scr), reason: !countAvail ? `Count full (${cnt}/${lc.questionCount})` : !marksAvail ? `Marks full (${scr}/${lc.totalMarks})` : '' };
    });
    return { available: anyAvail, configType: 'levelBased', levels, reason: anyAvail ? '' : 'All difficulty slots filled' };
  }
  if (ct === 'selectionLevel') {
    const sel = progCfg.selectionLevelCounts ?? {};
    const diffs: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
    let anyAvail = false;
    const levels: Record<string, LevelDetail> = {};
    diffs.forEach(d => {
      const max = (sel as any)[d] ?? 0;
      if (max === 0) return;
      const cnt = getProgrammingCountByDiff(exercise, d);
      const scr = getProgrammingScoreByDiff(exercise, d);
      const avail = cnt < max;
      if (avail) anyAvail = true;
      levels[d] = { available: avail, current: cnt, max, currentMarks: scr, maxMarks: 0, remainingCount: Math.max(0, max - cnt), reason: avail ? '' : `Count full (${cnt}/${max})` };
    });
    return { available: anyAvail, configType: 'selectionLevel', levels, reason: anyAvail ? '' : 'All difficulty slots filled' };
  }
  return empty;
};



// Add this new component before ProblemSolving component or in a separate file

// ─────────────────────────────────────────────────────────────────────────────
// ExerciseMockPreviewModal - Full exercise mock preview with all questions
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ExerciseMockPreviewModal - Matches ProgrammingMockModal layout exactly
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ExerciseMockPreviewModal - Full exercise mock preview with all questions
// ─────────────────────────────────────────────────────────────────────────────

interface ExerciseMockPreviewModalProps {
  exercise: Exercise;
  onClose: () => void;
  configuredLanguages?: { coreProgram?: string[]; frontend?: string[]; database?: string[] };
}

interface ConsoleLine {
  id: string;
  type: 'output' | 'error' | 'system' | 'input';
  text: string;
}

// ── MCQ design tokens (mirrors mcq.tsx) ──────────────────────────────────
const MCQ_T = {
  orange:'#F27757', orangeDark:'#E0623F', orangeGlow:'rgba(242,119,87,0.22)',
  orangeLight:'rgba(242,119,87,0.08)',
  textMain:'#1a1a2e', textSub:'#6b6b7e', textMuted:'#9b9bae', textHint:'#bcbccc',
  border:'#eaeaef', borderLight:'#f4f4f7', bg:'#ffffff', pageBg:'#f9f9fb',
  green:'#22c55e', greenLight:'rgba(34,197,94,0.09)', greenDark:'#16a34a',
  red:'#ef4444', redLight:'rgba(239,68,68,0.09)',
  amber:'#f59e0b', amberLight:'rgba(245,158,11,0.09)',
  blue:'#3b82f6', blueLight:'rgba(59,130,246,0.09)',
} as const;
const MCQ_FONT = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif";
const MCQ_DIFF: Record<string,{text:string;bg:string;dot:string}> = {
  easy:{text:MCQ_T.greenDark,bg:MCQ_T.greenLight,dot:MCQ_T.green},
  medium:{text:'#b45309',bg:MCQ_T.amberLight,dot:MCQ_T.amber},
  hard:{text:'#dc2626',bg:MCQ_T.redLight,dot:MCQ_T.red},
};

const ExerciseMockPreviewModal: React.FC<ExerciseMockPreviewModalProps> = ({
  exercise,
  onClose,
  configuredLanguages,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('python');
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [consoleInput, setConsoleInput] = useState('');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  // MCQ mock state
  const [selectedOptions, setSelectedOptions] = useState<Map<number,string>>(new Map());
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());

  const pyodideRef = useRef<any>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const inputResolverRef = useRef<((v: string) => void) | null>(null);
  const mockScrollRef = useRef<HTMLDivElement>(null);

  // Get all questions from exercise
  const allQuestions = exercise.questions || [];
  const currentQ = allQuestions[currentIndex];

  // Get available languages from props or default
  const availableLanguages = configuredLanguages?.coreProgram || ['python', 'javascript', 'java', 'cpp'];

  // Get all programming questions (for language selector consistency)
  const programmingQuestions = allQuestions.filter(q =>
    q.questionType === 'programming' || q.questionType === 'database'
  );

  // For non-programming questions (MCQ), we show different right panel content
  const isCurrentProgramming = currentQ?.questionType === 'programming' || currentQ?.questionType === 'database';
  const isCurrentMCQ = currentQ?.questionType === 'mcq';

  // Pyodide setup for Python execution
  useEffect(() => {
    if (lang === 'python' && !pyodideReady && !pyodideRef.current) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
      script.onload = async () => {
        try {
          const pyodide = await (window as any).loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/' });
          pyodideRef.current = pyodide;
          setPyodideReady(true);
        } catch (e) { console.warn('Pyodide load error:', e); }
      };
      document.head.appendChild(script);
    }
  }, [lang]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLines]);

  useEffect(() => {
    if (waitingForInput) consoleInputRef.current?.focus();
  }, [waitingForInput]);

  // Reset console when switching questions
  useEffect(() => {
    setCode('');
    setConsoleLines([]);
    setWaitingForInput(false);
    setIsRunning(false);
    inputResolverRef.current = null;
    setConsoleInput('');
  }, [currentIndex]);

  const mkLineId = () => `cl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const appendLine = (type: ConsoleLine['type'], text: string) => {
    setConsoleLines(prev => [...prev, { id: mkLineId(), type, text }]);
  };

  const streamText = async (text: string, type: 'output' | 'error' = 'output') => {
    if (!text) return;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== '' || i < lines.length - 1) {
        appendLine(type, lines[i]);
        await new Promise(r => setTimeout(r, 35));
      }
    }
  };

  const submitInput = () => {
    if (!waitingForInput || !inputResolverRef.current) return;
    const val = consoleInput;
    appendLine('input', val);
    setConsoleInput('');
    setWaitingForInput(false);
    const resolve = inputResolverRef.current;
    inputResolverRef.current = null;
    resolve(val);
  };

  const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";

  const getPistonLang = (lang: string): { language: string; version: string } => {
    const map: Record<string, { language: string; version: string }> = {
      javascript: { language: 'javascript', version: '18.15.0' },
      python: { language: 'python', version: '3.10.0' },
      java: { language: 'java', version: '15.0.2' },
      cpp: { language: 'cpp', version: '10.2.0' },
      c: { language: 'c', version: '10.2.0' },
      csharp: { language: 'csharp', version: '6.12.0' },
      typescript: { language: 'typescript', version: '5.0.3' },
    };
    return map[lang.toLowerCase()] || { language: 'javascript', version: '18.15.0' };
  };

  const executeCode = async () => {
    if (!code.trim()) { appendLine('system', '⚠ Please write some code first.'); return; }
    setConsoleLines([{ id: mkLineId(), type: 'system', text: `▶ Running ${lang}…` }]);
    setIsRunning(true);
    setWaitingForInput(false);
    inputResolverRef.current = null;

    try {
      if (lang === 'python') {
        if (!pyodideReady || !pyodideRef.current) {
          appendLine('system', '⌛ Python runtime loading… Please wait and try again.');
          setIsRunning(false);
          return;
        }
        pyodideRef.current.setStdin({
          readline: () => new Promise<string>(resolve => {
            setWaitingForInput(true);
            inputResolverRef.current = (val: string) => resolve(val + '\n');
          })
        });
        const outLines: string[] = [];
        const errLines: string[] = [];
        pyodideRef.current.setStdout({ batched: (s: string) => { outLines.push(s); } });
        pyodideRef.current.setStderr({ batched: (s: string) => { errLines.push(s); } });
        try {
          const runPromise = pyodideRef.current.runPythonAsync(code);
          const flushInterval = setInterval(() => {
            if (outLines.length > 0) {
              const pending = outLines.splice(0);
              pending.forEach(s => {
                s.split('\n').forEach((line, i, arr) => {
                  if (line !== '' || i < arr.length - 1) {
                    setConsoleLines(prev => [...prev, { id: mkLineId(), type: 'output', text: line }]);
                  }
                });
              });
            }
          }, 50);
          await runPromise;
          clearInterval(flushInterval);
          const remaining = outLines.splice(0);
          for (const s of remaining) await streamText(s, 'output');
          for (const s of errLines) await streamText(s, 'error');
          appendLine('system', '✓ Process finished (exit 0)');
        } catch (e: any) {
          const remaining = outLines.splice(0);
          for (const s of remaining) await streamText(s, 'output');
          await streamText(e.message || String(e), 'error');
          appendLine('system', '✗ Process exited with error');
        }
      } else {
        const pistonLang = getPistonLang(lang);
        const resp = await fetch(PISTON_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: pistonLang.language, version: pistonLang.version,
            files: [{ name: 'main', content: code }],
            stdin: consoleInput, args: [],
            compile_timeout: 10000, run_timeout: 8000,
            compile_memory_limit: -1, run_memory_limit: -1,
          }),
        });
        const data = await resp.json();
        if (data.run) {
          const out = (data.run.output || '').trim();
          const err = (data.run.stderr || '').trim();
          if (out) await streamText(out, 'output');
          if (err) await streamText(err, 'error');
          if (!out && !err) appendLine('system', '(no output)');
          appendLine('system', `✓ Process finished (exit ${data.run.code ?? 0})`);
        } else {
          appendLine('error', 'Execution failed — unexpected API response');
        }
      }
    } catch (e: any) {
      appendLine('error', `Network error: ${e.message}`);
    } finally {
      setIsRunning(false);
      setWaitingForInput(false);
      inputResolverRef.current = null;
    }
  };

  // Get difficulty style
  const DS: Record<string, any> = {
    easy: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#16a34a' },
    medium: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', dot: '#d97706' },
    hard: { bg: '#fff5f5', border: '#fed7d7', text: '#e53e3e', dot: '#e53e3e' },
  };

  // Helper to extract plain text from HTML content
  const extractPlainText = (html: string): string => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Helper to get question title from various formats
  const getQuestionTitle = (q: any): string => {
    if (q.mcqQuestionTitle) {
      if (Array.isArray(q.mcqQuestionTitle)) {
        const textBlocks = q.mcqQuestionTitle.filter((cb: any) => cb.type === 'text' && cb.value);
        return textBlocks.map((cb: any) => extractPlainText(cb.value)).join(' ');
      }
      if (typeof q.mcqQuestionTitle === 'string') {
        return extractPlainText(q.mcqQuestionTitle);
      }
    }
    if (q.questionTitle) return extractPlainText(q.questionTitle);
    if (q.title) return q.title;
    return 'Question';
  };

  // Helper to get question description
  const getQuestionDescription = (q: any): string => {
    if (q.mcqQuestionDescription) {
      if (typeof q.mcqQuestionDescription === 'string') return q.mcqQuestionDescription;
      if (q.mcqQuestionDescription.text) return q.mcqQuestionDescription.text;
    }
    if (q.description) {
      if (typeof q.description === 'string') return q.description;
      if (q.description.text) return q.description.text;
    }
    return '';
  };

  // Helper to get options from MCQ question
  const getMCQOptions = (q: any): any[] => {
    let options = q.mcqQuestionOptions || [];
    if (options.length === 0 && q.options) {
      options = q.options;
    }
    return options.map((opt: any, idx: number) => ({
      label: opt.text || opt.label || `Option ${idx + 1}`,
      value: opt.value || opt.text || `opt_${idx}`,
      isCorrect: opt.isCorrect || false,
    }));
  };

  const isMCQExercise = exercise.exerciseType?.toLowerCase() === 'mcq' ||
    (allQuestions.length > 0 && allQuestions.every((q: any) => q.questionType === 'mcq'));

  const handleMockSelect = (optionId: string) => {
    if (revealedSet.has(currentIndex)) return;
    setSelectedOptions(prev => new Map(prev).set(currentIndex, optionId));
    setRevealedSet(prev => new Set(prev).add(currentIndex));
    if (mockScrollRef.current) mockScrollRef.current.scrollTop = 0;
  };

  // Reset scroll on question change
  useEffect(() => {
    if (mockScrollRef.current) mockScrollRef.current.scrollTop = 0;
  }, [currentIndex]);

  // ── MCQ mock render (mirrors mcq.tsx layout) ──────────────────────────
  if (isMCQExercise && currentQ) {
    const T = MCQ_T;
    const diff = MCQ_DIFF[currentQ.mcqQuestionDifficulty || 'medium'] ?? MCQ_DIFF.medium;
    const isRevealed = revealedSet.has(currentIndex);
    const selectedOptId = selectedOptions.get(currentIndex);
    const options: any[] = currentQ.mcqQuestionOptions || [];
    const answeredCount = revealedSet.size;
    const correctCount = Array.from(revealedSet).filter(idx => {
      const q = allQuestions[idx];
      const selId = selectedOptions.get(idx);
      return (q?.mcqQuestionOptions || []).find((o: any) => o._id === selId)?.isCorrect === true;
    }).length;
    const isLastQ = currentIndex >= allQuestions.length - 1;
    const progressPct = Math.round((answeredCount / Math.max(1, allQuestions.length)) * 100);
    const selectedOpt = options.find((o: any) => o._id === selectedOptId);

    const renderTitle = (title: any) => {
      if (Array.isArray(title)) return (
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:4}}>
          {title.map((cb: any, i: number) => {
            if (cb.type === 'text' && cb.value) return <div key={i} style={{fontSize:16,fontWeight:700,color:T.textMain,lineHeight:1.65}} dangerouslySetInnerHTML={{__html:cb.value}} />;
            if (cb.type === 'code' && cb.value) return <pre key={i} style={{margin:0,padding:'10px 16px',fontSize:13,lineHeight:1.7,fontFamily:'Menlo,Monaco,monospace',color:'#d4d4d4',background:'#1e1e1e',borderRadius:8,display:'inline-block',maxWidth:'100%',overflowX:'auto',whiteSpace:'pre'}}>{cb.value}</pre>;
            if (cb.type === 'image' && cb.url) return <img key={i} src={cb.url} alt="" style={{width:`${cb.sizePercent||60}%`,height:'auto',borderRadius:8,border:`1px solid ${T.border}`}} />;
            return null;
          })}
        </div>
      );
      return <div style={{fontSize:16,fontWeight:700,color:T.textMain,lineHeight:1.65,marginBottom:4}} dangerouslySetInnerHTML={{__html:typeof title==='string'?title:''}} />;
    };

    const getGridStatus = (idx: number) => {
      if (!revealedSet.has(idx)) return 'unanswered';
      const q = allQuestions[idx];
      const selId = selectedOptions.get(idx);
      return (q?.mcqQuestionOptions||[]).find((o: any) => o._id === selId)?.isCorrect === true ? 'correct' : 'wrong';
    };

    return (
      <div style={{position:'fixed',inset:0,background:T.pageBg,fontFamily:MCQ_FONT,color:T.textMain,display:'flex',flexDirection:'column',overflow:'hidden',zIndex:300}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
          *{box-sizing:border-box;}
          @keyframes mockFadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
          .mock-fade{animation:mockFadeIn 0.2s ease;}
          .mock-s::-webkit-scrollbar{width:7px;}
          .mock-s::-webkit-scrollbar-track{background:#e4e4ed;border-radius:99px;}
          .mock-s::-webkit-scrollbar-thumb{background:#9b9bae;border-radius:99px;}
          .mock-btn-prev:hover:not(:disabled){border-color:${T.orange}!important;color:${T.orange}!important;}
          .mock-btn-next:hover{background:${T.orangeDark}!important;}
        `}</style>

        {/* TOP BAR */}
        <div style={{flexShrink:0,height:56,background:T.bg,borderBottom:`1px solid ${T.border}`,display:'flex',flexDirection:'column',zIndex:50}}>
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:0,minWidth:0,flex:1}}>
              <button onClick={onClose} className="mock-btn-prev" style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:8,border:`1.5px solid ${T.border}`,background:'transparent',color:T.textSub,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:MCQ_FONT,transition:'all 0.13s',flexShrink:0,marginRight:14}}>
                <ArrowLeft size={13}/> Back
              </button>
              <div style={{display:'flex',alignItems:'center',gap:7,flexShrink:0,marginRight:14}}>
                <div style={{width:28,height:28,borderRadius:8,background:`linear-gradient(135deg,${T.orange},${T.orangeDark})`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 3px 10px ${T.orangeGlow}`}}>
                  <GraduationCap size={13} color="#fff"/>
                </div>
                <span style={{fontSize:13,fontWeight:800,color:T.textMain,letterSpacing:'-0.02em'}}>SmartCliff</span>
              </div>
              <div style={{width:1,height:18,background:T.border,marginRight:14,flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:500,color:T.textMuted,flexShrink:0}}>Mock Preview</span>
              <ChevronRight size={12} style={{color:T.border,margin:'0 5px',flexShrink:0}}/>
              <span style={{fontSize:12,fontWeight:700,color:T.orange,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:200}}>{exercise.exerciseInformation?.exerciseName}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
              {[
                {v:allQuestions.length, label:'Total',   col:T.textSub},
                {v:answeredCount,       label:'Done',    col:T.green},
                {v:correctCount,        label:'Correct', col:T.orange},
                {v:answeredCount-correctCount, label:'Wrong', col:T.red},
              ].map(({v,label,col})=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:3}}>
                  <span style={{fontSize:14,fontWeight:800,color:col}}>{v}</span>
                  <span style={{fontSize:10,color:T.textHint,fontWeight:600}}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{height:2,background:T.borderLight}}>
            <div style={{height:'100%',width:`${progressPct}%`,background:`linear-gradient(90deg,${T.orange},${T.orangeDark})`,transition:'width 0.5s ease'}}/>
          </div>
        </div>

        {/* BODY */}
        <div style={{flex:1,minHeight:0,overflow:'hidden',display:'flex'}}>
          {/* Left: Question */}
          <div style={{flex:1,minWidth:0,minHeight:0,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            {/* Q-meta row */}
            <div style={{flexShrink:0,height:52,background:T.bg,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 28px',gap:10,zIndex:20}}>
              <div style={{display:'flex',alignItems:'baseline',gap:2}}>
                <span style={{fontSize:10,color:T.textHint,fontWeight:700,letterSpacing:'0.05em'}}>Q</span>
                <span style={{fontSize:26,fontWeight:900,color:T.orange,lineHeight:1,letterSpacing:'-0.03em',margin:'0 2px'}}>{currentIndex+1}</span>
                <span style={{fontSize:12,color:T.textHint}}>/{allQuestions.length}</span>
              </div>
              <div style={{width:1,height:18,background:T.border}}/>
              <div style={{display:'flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:99,background:diff.bg}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:diff.dot}}/>
                <span style={{fontSize:10,fontWeight:700,color:diff.text,textTransform:'capitalize' as const}}>{currentQ.mcqQuestionDifficulty||'medium'}</span>
              </div>
              {exercise.isGraded !== false && (exercise.questionConfiguration?.mcqQuestionConfiguration?.marksPerQuestion || currentQ.mcqQuestionScore) ? (
                <div style={{display:'flex',alignItems:'center',gap:3,padding:'3px 9px',borderRadius:99,background:T.amberLight}}>
                  <Award size={10} style={{color:T.amber}}/>
                  <span style={{fontSize:10,fontWeight:700,color:T.amber}}>{exercise.questionConfiguration?.mcqQuestionConfiguration?.marksPerQuestion || currentQ.mcqQuestionScore} marks</span>
                </div>
              ) : null}
              {isRevealed && (
                <div style={{display:'flex',alignItems:'center',gap:3,padding:'3px 9px',borderRadius:99,background:selectedOpt?.isCorrect===true?T.greenLight:T.redLight}}>
                  {selectedOpt?.isCorrect===true
                    ? <><CheckCircle2 size={10} style={{color:T.greenDark}}/><span style={{fontSize:10,fontWeight:700,color:T.greenDark}}>Correct</span></>
                    : <><XCircle size={10} style={{color:T.red}}/><span style={{fontSize:10,fontWeight:700,color:T.red}}>Wrong</span></>
                  }
                </div>
              )}
            </div>

            {/* Scrollable question content */}
            <div ref={mockScrollRef} className="mock-fade mock-s" key={currentIndex} style={{flex:1,minHeight:0,overflowY:'auto',padding:'24px 28px'}}>
              <div style={{marginBottom:8}}>{renderTitle(currentQ.mcqQuestionTitle)}</div>
              {currentQ.mcqQuestionDescription && (
                <div style={{display:'flex',gap:10,padding:'10px 14px',borderRadius:10,background:T.blueLight,border:`1px solid ${T.blue}20`,marginBottom:14}}>
                  <Info size={13} style={{color:T.blue,flexShrink:0,marginTop:2}}/>
                  <p style={{fontSize:13,color:T.textSub,margin:0,lineHeight:1.6}}>{currentQ.mcqQuestionDescription}</p>
                </div>
              )}
              {!isRevealed && (
                <p style={{fontSize:11,color:T.textHint,marginBottom:16,display:'flex',alignItems:'center',gap:5}}>
                  <HelpCircle size={11} style={{color:T.textHint}}/>
                  Click an option — you'll instantly see if it's correct.
                </p>
              )}
              {/* Options */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(1,1fr)',gap:10}}>
                {options.map((opt: any, idx: number) => {
                  const lbl = String.fromCharCode(65+idx);
                  const isSelected = opt._id === selectedOptId;
                  const isCorrect = opt.isCorrect === true;
                  let border = T.border, bg = T.bg, dotBorder = T.border, dotBg = 'transparent';
                  let dotInner: string|null = null, textCol = T.textSub, lblBg = T.pageBg, lblCol = T.textMuted;
                  if (!isRevealed && isSelected) {
                    border=T.orange; bg=T.orangeLight; dotBorder=T.orange; dotBg=T.orange; dotInner='#fff'; textCol=T.textMain; lblBg=T.orange; lblCol='#fff';
                  } else if (isRevealed && isCorrect) {
                    border=T.green; bg=T.greenLight; dotBorder=T.green; dotBg=T.green; dotInner='#fff'; textCol=T.textMain; lblBg=T.green; lblCol='#fff';
                  } else if (isRevealed && isSelected && !isCorrect) {
                    border=T.red; bg=T.redLight; dotBorder=T.red; dotBg=T.red; dotInner='#fff'; textCol=T.textMain; lblBg=T.red; lblCol='#fff';
                  }
                  return (
                    <div key={opt._id||idx} onClick={()=>!isRevealed&&handleMockSelect(opt._id)}
                      style={{display:'flex',alignItems:'flex-start',gap:12,padding:'13px 16px',borderRadius:12,cursor:isRevealed?'default':'pointer',border:`1.5px solid ${border}`,background:bg,transition:'all 0.15s',userSelect:'none' as const,position:'relative' as const}}>
                      <div style={{flexShrink:0,width:20,height:20,borderRadius:'50%',marginTop:1,border:`2px solid ${dotBorder}`,background:dotBg,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s'}}>
                        {dotInner&&<div style={{width:7,height:7,borderRadius:'50%',background:dotInner}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{flexShrink:0,width:20,height:20,borderRadius:6,background:lblBg,color:lblCol,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,transition:'all 0.15s'}}>{lbl}</span>
                          <span style={{fontSize:14,color:textCol,fontWeight:(isSelected||isCorrect)?600:400}}>{opt.text}</span>
                        </div>
                      </div>
                      {isRevealed && isCorrect && <CheckCircle2 size={15} style={{color:T.greenDark,position:'absolute',right:14,top:'50%',transform:'translateY(-50%)'}}/>}
                      {isRevealed && isSelected && !isCorrect && <XCircle size={15} style={{color:T.red,position:'absolute',right:14,top:'50%',transform:'translateY(-50%)'}}/>}
                    </div>
                  );
                })}
              </div>
              <div style={{height:20}}/>
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{flexShrink:0,width:270,minHeight:0,borderLeft:`1px solid ${T.border}`,background:T.bg,overflowY:'auto',padding:'16px 14px 20px 14px'}} className="mock-s">
            <p style={{fontSize:10,fontWeight:700,color:T.textMuted,marginBottom:10,textTransform:'uppercase' as const,letterSpacing:'0.05em',fontFamily:MCQ_FONT}}>{allQuestions.length} Questions</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5,marginBottom:12}}>
              {allQuestions.map((_: any, i: number) => {
                const status = getGridStatus(i);
                const isCurr = i === currentIndex;
                let bg=T.pageBg, col=T.textSub, bdr=T.border;
                if(isCurr){bg=T.blue;col='#fff';bdr=T.blue;}
                else if(status==='correct'){bg=T.greenLight;col=T.greenDark;bdr=T.green+'80';}
                else if(status==='wrong'){bg=T.redLight;col=T.red;bdr=T.red+'80';}
                return (
                  <button key={i} onClick={()=>setCurrentIndex(i)}
                    style={{aspectRatio:'1',borderRadius:8,border:`1.5px solid ${bdr}`,background:bg,color:col,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:MCQ_FONT,transition:'all 0.12s'}}>
                    {i+1}
                  </button>
                );
              })}
            </div>
            <div style={{height:1,background:T.borderLight,marginBottom:10}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px 12px'}}>
              {[{dot:T.blue,lbl:'Current'},{dot:T.greenDark,lbl:'Correct'},{dot:T.red,lbl:'Wrong'},{dot:T.textHint,lbl:'Unanswered'}].map(({dot,lbl})=>(
                <div key={lbl} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:dot,flexShrink:0}}/>
                  <span style={{fontSize:11,color:T.textSub,fontFamily:MCQ_FONT}}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM NAV */}
        <div style={{flexShrink:0,height:64,background:T.bg,borderTop:`1px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 28px',gap:16,zIndex:50}}>
          <button onClick={()=>currentIndex>0&&setCurrentIndex(p=>p-1)} disabled={currentIndex===0} className="mock-btn-prev"
            style={{display:'flex',alignItems:'center',gap:7,padding:'10px 20px',borderRadius:10,border:`1.5px solid ${T.border}`,background:'transparent',color:currentIndex===0?T.textHint:T.textSub,fontSize:13,fontWeight:600,cursor:currentIndex===0?'not-allowed':'pointer',fontFamily:MCQ_FONT,transition:'all 0.13s',flexShrink:0}}>
            <ChevronLeft size={15}/> Previous
          </button>
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,overflow:'hidden'}}>
            {allQuestions.slice(Math.max(0,currentIndex-4),Math.min(allQuestions.length,currentIndex+5)).map((_: any,relIdx: number)=>{
              const absIdx=Math.max(0,currentIndex-4)+relIdx;
              const isCurr=absIdx===currentIndex;
              const isDone=revealedSet.has(absIdx);
              return <button key={absIdx} onClick={()=>setCurrentIndex(absIdx)} style={{width:isCurr?22:7,height:7,borderRadius:99,background:isCurr?T.orange:isDone?T.green:T.border,border:'none',cursor:'pointer',transition:'all 0.2s',padding:0,flexShrink:0}}/>;
            })}
          </div>
          {!isLastQ
            ? <button onClick={()=>setCurrentIndex(p=>p+1)} className="mock-btn-next"
                style={{display:'flex',alignItems:'center',gap:7,padding:'10px 22px',borderRadius:10,border:'none',background:T.orange,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:MCQ_FONT,transition:'all 0.13s',boxShadow:`0 3px 14px ${T.orangeGlow}`,flexShrink:0}}>
                Next <ChevronRight size={15}/>
              </button>
            : <button onClick={onClose}
                style={{display:'flex',alignItems:'center',gap:7,padding:'10px 22px',borderRadius:10,border:'none',background:T.green,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:MCQ_FONT,boxShadow:'0 3px 14px rgba(34,197,94,0.25)',flexShrink:0}}>
                <CheckCircle2 size={14}/> Done
              </button>
          }
        </div>
      </div>
    );
  }
  // ── End MCQ mock ─────────────────────────────────────────────────────────

  // Render left panel content
  const renderLeftPanel = () => {
    if (!currentQ) return null;

    const diffStyle = DS[currentQ.difficulty || 'medium'] || DS.medium;
    const sampleTcs = currentQ.testCases?.filter((tc: any) => tc.isSample && (tc.input?.trim() || tc.expectedOutput?.trim())) || [];
    const hasConstraints = currentQ.constraints?.filter((c: string) => c.trim()).length > 0;

    // For MCQ, show options
    if (isCurrentMCQ) {
      const options = getMCQOptions(currentQ);
      const isMultipleSelect = currentQ.mcqQuestionType === 'multiple_select';
      const questionTitle = getQuestionTitle(currentQ);
      const questionDescription = getQuestionDescription(currentQ);
      const questionScore = currentQ.mcqQuestionScore || currentQ.score || 0;

      return (
        <div className="lms-sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* Title row */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--lms-font)', fontSize: 11, fontWeight: 600, color: '#999' }}>
                  {currentIndex + 1} / {allQuestions.length}
                </span>
                {currentQ.difficulty && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize',
                    backgroundColor: diffStyle.bg, color: diffStyle.text, border: `1px solid ${diffStyle.border}`
                  }}>
                    {currentQ.difficulty}
                  </span>
                )}
                <span style={{ fontSize: 10, color: '#999', fontFamily: 'var(--lms-font)' }}>
                  {questionScore} pts
                </span>
              </div>
              <h2 style={{ fontFamily: 'var(--lms-font)', fontSize: 20, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.3, margin: 0 }}>
                {questionTitle}
              </h2>
            </div>

            <div style={{ height: 1, background: '#e5e5e5' }} />

            {/* Description */}
            {questionDescription && (
              <div>
                <p style={{ fontFamily: 'var(--lms-font)', fontSize: 13.5, lineHeight: 1.8, color: '#4a4a4a', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {questionDescription}
                </p>
              </div>
            )}

            {/* Options */}
            {options.length > 0 && (
              <div>
                <p style={{ fontFamily: 'var(--lms-font)', fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>
                  Select your answer{isMultipleSelect ? '(s)' : ''}:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {options.map((opt: any, optIdx: number) => (
                    <label
                      key={optIdx}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 14px', borderRadius: 8,
                        border: `1.5px solid var(--lms-border)`,
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: '#fff',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#F27757';
                        e.currentTarget.style.backgroundColor = 'rgba(242,119,87,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--lms-border)';
                        e.currentTarget.style.backgroundColor = '#fff';
                      }}
                    >
                      <input
                        type={isMultipleSelect ? 'checkbox' : 'radio'}
                        name={`mcq-${currentIndex}`}
                        value={opt.value}
                        style={{ marginTop: 2, accentColor: '#F27757' }}
                      />
                      <span style={{ fontFamily: 'var(--lms-font)', fontSize: 13, color: '#1a1a2e', lineHeight: 1.5 }}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Programming question left panel
    const questionTitle = currentQ.title || 'Programming Question';
    const questionDescription = getQuestionDescription(currentQ);

    return (
      <div className="lms-sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Title row */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--lms-font)', fontSize: 11, fontWeight: 600, color: '#999' }}>
                {currentIndex + 1} / {allQuestions.length}
              </span>
              {currentQ.difficulty && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize',
                  backgroundColor: diffStyle.bg, color: diffStyle.text, border: `1px solid ${diffStyle.border}`
                }}>
                  {currentQ.difficulty}
                </span>
              )}
              <span style={{ fontSize: 10, color: '#999', fontFamily: 'var(--lms-font)' }}>
                {currentQ.score || 0} pts
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--lms-font)', fontSize: 20, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.3, margin: 0 }}>
              {questionTitle}
            </h2>
          </div>

          <div style={{ height: 1, background: '#e5e5e5' }} />

          {/* Description */}
          {questionDescription && (
            <div>
              <p style={{ fontFamily: 'var(--lms-font)', fontSize: 13.5, lineHeight: 1.8, color: '#4a4a4a', margin: 0, whiteSpace: 'pre-wrap' }}>
                {questionDescription}
              </p>
            </div>
          )}

          {/* Examples/Sample Test Cases */}
          {sampleTcs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sampleTcs.map((tc: any, ti: number) => (
                <div key={ti}>
                  <p style={{ fontFamily: 'var(--lms-font)', fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 10 }}>
                    Example {ti + 1}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tc.input?.trim() && (
                      <div style={{ background: '#f8f8f8', borderRadius: 8, padding: '10px 14px', border: '1px solid #e5e5e5' }}>
                        <p style={{ fontFamily: 'var(--lms-font)', fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Input</p>
                        <pre style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12.5, color: '#1a1a2e', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{tc.input}</pre>
                      </div>
                    )}
                    {tc.expectedOutput?.trim() && (
                      <div style={{ background: '#f8f8f8', borderRadius: 8, padding: '10px 14px', border: '1px solid #e5e5e5' }}>
                        <p style={{ fontFamily: 'var(--lms-font)', fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Output</p>
                        <pre style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12.5, color: '#1a1a2e', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{tc.expectedOutput}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Constraints */}
          {hasConstraints && (
            <div>
              <p style={{ fontFamily: 'var(--lms-font)', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Constraints
              </p>
              <ul style={{ paddingLeft: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none' }}>
                {currentQ.constraints.filter((c: string) => c.trim()).map((c: string, ci: number) => (
                  <li key={ci} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: '#F27757', fontSize: 12, marginTop: 1, flexShrink: 0 }}>•</span>
                    <code style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12.5, color: '#3a3a52', lineHeight: 1.6 }}>{c}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render right panel (editor + console) - only for programming questions
  const renderRightPanel = () => {
    if (isCurrentMCQ) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fefefe', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <CheckCircle2 size={48} style={{ color: '#22c55e', marginBottom: 16 }} />
            <p style={{ fontFamily: 'var(--lms-font)', fontSize: 14, color: '#1a1a2e', fontWeight: 600 }}>MCQ Question</p>
            <p style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: '#8b8b9e', marginTop: 8 }}>
              Select your answer from the options on the left
            </p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fefefe' }}>
        {/* Toolbar */}
        <div style={{
          flexShrink: 0,
          padding: '0 16px',
          height: 44,
          borderBottom: '1px solid #e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: '#ffffff'
        }}>
          <span style={{
            fontFamily: 'ui-monospace,monospace',
            fontSize: 11,
            color: '#999',
            background: '#f5f5f5',
            padding: '3px 10px',
            borderRadius: 5,
          }}>
            {`solution.${lang === 'python' ? 'py' : lang === 'javascript' ? 'js' : lang === 'java' ? 'java' : lang === 'cpp' ? 'cpp' : 'txt'}`}
          </span>

          {lang === 'python' && !pyodideReady && (
            <span style={{ fontFamily: 'var(--lms-font)', fontSize: 10, color: '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Loader2 size={10} className="animate-spin" />
              <span>Loading runtime…</span>
            </span>
          )}
          {lang === 'python' && pyodideReady && (
            <span style={{ fontFamily: 'var(--lms-font)', fontSize: 10, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
              <span>Ready</span>
            </span>
          )}

          <button
            onClick={executeCode}
            disabled={isRunning}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 16px',
              borderRadius: 6,
              border: 'none',
              background: isRunning ? '#e5e5e5' : '#F27757',
              color: isRunning ? '#999' : 'white',
              fontFamily: 'var(--lms-font)',
              fontSize: 12,
              fontWeight: 700,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              boxShadow: isRunning ? 'none' : '0 2px 6px rgba(242,119,87,0.3)',
            }}
            onMouseEnter={(e) => {
              if (!isRunning) {
                e.currentTarget.style.background = '#e0623f';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRunning) {
                e.currentTarget.style.background = '#F27757';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {isRunning ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Run Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code editor */}
        <textarea
          ref={codeRef}
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder={`// Write your ${lang} solution here…`}
          style={{
            flex: 1, background: '#1e1e1e', border: 'none', outline: 'none',
            color: '#d4d4d4', fontFamily: 'ui-monospace, "Courier New", monospace',
            fontSize: 13.5, lineHeight: 1.7, padding: '16px 18px',
            resize: 'none', boxSizing: 'border-box', tabSize: 2,
            borderBottom: '1px solid #e5e5e5',
          }}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const start = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const val = e.currentTarget.value;
              setCode(val.substring(0, start) + '  ' + val.substring(end));
              setTimeout(() => { if (codeRef.current) { codeRef.current.selectionStart = codeRef.current.selectionEnd = start + 2; } }, 0);
            }
          }}
        />

        {/* Console */}
        <div style={{ flexShrink: 0, height: 220, display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
          <div style={{
            flexShrink: 0, padding: '0 14px', height: 34, borderBottom: '1px solid #e5e5e5',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isRunning ? '#16a34a' : waitingForInput ? '#d97706' : '#ccc',
              transition: 'background 0.2s'
            }} />
            <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10.5, fontWeight: 600, color: '#999' }}>
              {waitingForInput ? 'stdin' : isRunning ? 'running' : 'console'}
            </span>
            {consoleLines.length > 0 && (
              <button onClick={() => setConsoleLines([])}
                style={{
                  marginLeft: 'auto', fontFamily: 'var(--lms-font)', fontSize: 10,
                  color: '#999', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 6px', borderRadius: 4, transition: 'color 0.15s'
                }}>
                clear
              </button>
            )}
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', padding: '8px 14px',
            fontFamily: 'ui-monospace, monospace', fontSize: 12,
            lineHeight: 1.7, scrollbarWidth: 'thin'
          }}>
            {consoleLines.length === 0 && !isRunning && (
              <span style={{ color: '#ccc', fontStyle: 'italic', fontSize: 11 }}>
                Run your code to see output here…
              </span>
            )}
            {consoleLines.map(line => (
              <div key={line.id} style={{
                color: line.type === 'error' ? '#dc2626' : line.type === 'input' ? '#3b82f6' : line.type === 'system' ? '#999' : '#1a1a2e',
                display: 'flex', alignItems: 'flex-start', gap: 6,
              }}>
                <span style={{ flexShrink: 0, opacity: 0.6, fontSize: 10, marginTop: 2 }}>
                  {line.type === 'input' ? '›' : line.type === 'error' ? '✗' : line.type === 'system' ? '#' : '$'}
                </span>
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line.text || '\u00A0'}</span>
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>

          {/* Input area for Python */}
          {lang === 'python' ? (
            <div style={{
              flexShrink: 0, borderTop: `1px solid ${waitingForInput ? '#3b82f6' : '#e5e5e5'}`,
              background: waitingForInput ? '#eff6ff' : '#fafafa',
              padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
            }}>
              <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12, fontWeight: 700, color: waitingForInput ? '#3b82f6' : '#ccc', flexShrink: 0 }}>›</span>
              <input
                ref={consoleInputRef}
                value={consoleInput}
                onChange={e => setConsoleInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitInput(); }}
                placeholder={waitingForInput ? 'Type input and press Enter…' : 'Waiting for input()…'}
                disabled={!waitingForInput}
                style={{
                  flex: 1, fontFamily: 'ui-monospace,monospace', fontSize: 12,
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#1a1a2e', opacity: waitingForInput ? 1 : 0.3
                }}
              />
              {waitingForInput && (
                <button onClick={submitInput}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 5, border: '1px solid #3b82f6',
                    background: '#3b82f6', color: 'white', fontFamily: 'var(--lms-font)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer'
                  }}>
                  Enter ↵
                </button>
              )}
            </div>
          ) : (
            <div style={{ flexShrink: 0, borderTop: '1px solid #e5e5e5', background: '#fafafa', padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--lms-font)', fontSize: 9, fontWeight: 700, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stdin</span>
              <textarea
                value={consoleInput}
                onChange={e => setConsoleInput(e.target.value)}
                placeholder={'Provide input here before running…'}
                rows={2}
                disabled={isRunning}
                style={{
                  width: '100%', fontFamily: 'ui-monospace,monospace', fontSize: 11.5,
                  background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: 5,
                  outline: 'none', color: '#1a1a2e', padding: '5px 8px',
                  resize: 'none', boxSizing: 'border-box', opacity: isRunning ? 0.4 : 1
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column',
      background: '#f5f5f5', overflow: 'hidden', fontFamily: 'var(--lms-font)'
    }}>
      {/* ── TOP NAV ── */}
      <div style={{
        flexShrink: 0, height: 44, borderBottom: '1px solid #e5e5e5', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#ffffff'
      }}>
        {/* Left: logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, background: '#F27757',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Code size={13} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#333', fontFamily: 'var(--lms-font)', letterSpacing: 0.2 }}>
            Exercise Mock Preview — {exercise.exerciseInformation?.exerciseName}
          </span>
        </div>

        {/* Center: question pills with difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', maxWidth: '50%', overflowX: 'auto' }}>
          {allQuestions.map((q, i) => {
            const ds = DS[q.difficulty || 'medium'] || DS.medium;
            const isActive = i === currentIndex;
            const isProg = q.questionType === 'programming' || q.questionType === 'database';
            return (
              <button key={i} onClick={() => setCurrentIndex(i)}
                style={{
                  height: 26, minWidth: 26, padding: '0 8px', borderRadius: 6,
                  border: `1.5px solid ${isActive ? ds.border : '#e5e5e5'}`,
                  background: isActive ? ds.bg : '#f8f8f8',
                  color: isActive ? ds.text : '#666',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--lms-font)', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                {i + 1}
                {!isProg && <span style={{ fontSize: 9 }}>📝</span>}
                {q.difficulty && <span style={{ fontSize: 9, opacity: 0.8, textTransform: 'capitalize' }}>{q.difficulty[0]}</span>}
              </button>
            );
          })}
        </div>

        {/* Right: lang select + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCurrentProgramming && (
            <select value={lang} onChange={e => setLang(e.target.value)}
              style={{
                fontFamily: 'var(--lms-font)', fontSize: 11, fontWeight: 600,
                border: '1px solid #e5e5e5', borderRadius: 6, padding: '4px 8px',
                background: '#ffffff', color: '#333', cursor: 'pointer', outline: 'none'
              }}>
              {availableLanguages.map(l => <option key={l} value={l.toLowerCase()}>{l}</option>)}
            </select>
          )}
          <button onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6, border: '1px solid #e5e5e5',
              background: '#f8f8f8', color: '#666', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
            }}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── BODY: Left (42%) + Right (58%) ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Problem description (42%) */}
        <div style={{ width: '42%', flexShrink: 0, borderRight: '1px solid #e5e5e5', background: '#ffffff' }}>
          {renderLeftPanel()}
        </div>

        {/* Right Panel - Editor + Console (58%) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {renderRightPanel()}
        </div>
      </div>

      {/* ── FOOTER: Prev / Next ── */}
      <div style={{
        flexShrink: 0, borderTop: '1px solid #e5e5e5', padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff'
      }}>
        <button onClick={() => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); }} disabled={currentIndex === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px',
            borderRadius: 6, border: '1px solid #e5e5e5', background: '#f8f8f8',
            color: currentIndex === 0 ? '#ccc' : '#666', fontSize: 11, fontWeight: 600,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--lms-font)', transition: 'all 0.15s'
          }}>
          <ChevronLeft size={12} /> Prev
        </button>
        <span style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: '#999' }}>
          <span style={{ color: '#F27757', fontWeight: 700 }}>{currentIndex + 1}</span>
          <span style={{ margin: '0 4px' }}>/</span>
          {allQuestions.length}
        </span>
        {currentIndex < allQuestions.length - 1 ? (
          <button onClick={() => setCurrentIndex(currentIndex + 1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px',
              borderRadius: 6, border: '1px solid #e5e5e5', background: '#f8f8f8',
              color: '#666', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--lms-font)', transition: 'all 0.15s'
            }}>
            Next <ChevronRight size={12} />
          </button>
        ) : (
          <button onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 14px',
              borderRadius: 6, border: 'none', background: '#F27757',
              color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--lms-font)'
            }}>
            <Check size={12} /> Done
          </button>
        )}
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const ProblemSolving: React.FC<ProblemSolvingProps> = (props) => {
  const router = useRouter();
  const { nodeId, nodeName, subcategory, subcategoryLabel, hierarchyData, activeTab, nodeType, courseId, configuredLanguages } = props;

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showAddQuestionOptions, setShowAddQuestionOptions] = useState(false);
  const [qbankFromMCQOpts, setQbankFromMCQOpts] = useState(false);

  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);

  const [selectedExerciseForAdd, setSelectedExerciseForAdd] = useState<Exercise | null>(null);
  const [fullExerciseForAdd, setFullExerciseForAdd] = useState<any>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  /** true when ExerciseSettings is opened from ProgrammingQuestionForm — locks Config Strategy */
  const [lockConfigStrategy, setLockConfigStrategy] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [submissionStatusMap, setSubmissionStatusMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  // Add this state with your other useState declarations
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10,
  });


  useEffect(() => {
    if (configuredLanguages) {
      console.log('✅ Programming Languages loaded in ProblemSolving:', {
        coreProgram: configuredLanguages.coreProgram,
        frontend: configuredLanguages.frontend,
        database: configuredLanguages.database
      });
    } else {
      console.log('⚠️ ProblemSolving: No configuredLanguages received');
    }
  }, [configuredLanguages]);  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (showQuestions) { setShowQuestions(false); setSelectedExercise(null); }
    setShowSettingsModal(false); setShowDeleteModal(false);
    setExerciseToDelete(null); setEditingExercise(null);
    setShowAddQuestionModal(false); setSelectedExerciseForAdd(null);
    setSubmissionStatusMap({});
  }, [nodeId, subcategory, activeTab]);

  useEffect(() => {
    if (!showQuestions && subcategory?.trim()) fetchExercises();
    else { setExercises([]); setLoadingExercises(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, subcategory, nodeType, activeTab, showQuestions]);



  useEffect(() => {
    const q = searchQuery.toLowerCase();
    const filtered = exercises.filter(ex => {
      const matchesType = !exerciseTypeFilter || ex.exerciseType === exerciseTypeFilter;
      const matchesSearch =
        !searchQuery ||
        ex.exerciseInformation?.exerciseName?.toLowerCase().includes(q) ||
        ex.exerciseInformation?.exerciseId?.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pagination.itemsPerPage) || 1;
    setPagination(prev => ({
      ...prev,
      totalItems,
      totalPages,
      currentPage: Math.min(prev.currentPage, totalPages),
    }));
  }, [searchQuery, exerciseTypeFilter, exercises]);

  // In ProblemSolving component (add near the top of the component)
  useEffect(() => {
    if (configuredLanguages) {
      console.log('ProblemSolving - Programming Languages:', {
        coreProgram: configuredLanguages.coreProgram,
        frontend: configuredLanguages.frontend,
        database: configuredLanguages.database
      });
    }
  }, [configuredLanguages]);


  useEffect(() => {
    if (configuredLanguages) {
      console.log('ProblemSolving - Programming Languages:', {
        coreProgram: configuredLanguages.coreProgram,
        frontend: configuredLanguages.frontend,
        database: configuredLanguages.database
      });
    } else {
      console.log('ProblemSolving - No configuredLanguages received');
    }
  }, [configuredLanguages]);

  // ── Utilities ──────────────────────────────────────────────────────────────
  const getEntityType = (nt: string): EntityType => {
    const map: Record<string, EntityType> = {
      module: 'modules', modules: 'modules',
      submodule: 'submodules', submodules: 'submodules',
      topic: 'topics', topics: 'topics',
      subtopic: 'subtopics', subtopics: 'subtopics',
    };
    return map[nt.toLowerCase().trim()] || 'topics';
  };

  const getBreadcrumbs = () => {
    const crumbs: { name: string; type: string }[] = [];
    if (hierarchyData?.courseName) crumbs.push({ name: hierarchyData.courseName, type: 'course' });
    if (hierarchyData?.moduleName) crumbs.push({ name: hierarchyData.moduleName, type: 'module' });
    if (hierarchyData?.submoduleName) crumbs.push({ name: hierarchyData.submoduleName, type: 'submodule' });
    if (hierarchyData?.topicName) crumbs.push({ name: hierarchyData.topicName, type: 'topic' });
    if (hierarchyData?.subtopicName) crumbs.push({ name: hierarchyData.subtopicName, type: 'subtopic' });
    if (activeTab) crumbs.push({ name: activeTab.replace('_', ' '), type: 'tab' });
    if (subcategory) crumbs.push({ name: subcategoryLabel || subcategory, type: 'subcategory' });
    return crumbs;
  };

  const getEvaluationSettings = (ex: Exercise) => ({
    practiceMode: ex.questionConfiguration?.programmingQuestionConfiguration?.allowCodeExecution ?? false,
    manualEvaluation: { enabled: false }, aiEvaluation: false,
    automationEvaluation: ex.questionConfiguration?.programmingQuestionConfiguration?.enableTestCases ?? false,
  });

  const fetchExercises = async (): Promise<Exercise[]> => {
    if (!subcategory?.trim()) {
      setExercises([]);
      setLoadingExercises(false);
      return [];
    }
    setLoadingExercises(true);
    try {
      const resp = await exerciseApi.getExercises(getEntityType(nodeType), nodeId, activeTab, subcategory);
      const list: Exercise[] = (resp.data?.exercises ?? []).map((ex: Exercise) => ({
        ...ex,
        // Guarantee every question has a questionType so score helpers never skip them
        questions: (ex.questions ?? []).map(q => ({
          ...q,
          questionType: q.questionType ?? 'mcq', // fallback — adjust default if needed
        })),
      }));

      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setExercises(sorted);

      // Compute pagination AFTER applying current filters (match getFilteredExercises logic)
      const q = searchQuery.toLowerCase();
      const filtered = sorted.filter(ex => {
        const matchesType = !exerciseTypeFilter || ex.exerciseType === exerciseTypeFilter;
        const matchesSearch =
          !searchQuery ||
          ex.exerciseInformation?.exerciseName?.toLowerCase().includes(q) ||
          ex.exerciseInformation?.exerciseId?.toLowerCase().includes(q);
        return matchesType && matchesSearch;
      });

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / pagination.itemsPerPage) || 1;
      setPagination(prev => ({
        ...prev,
        totalItems,
        totalPages,
        currentPage: Math.min(prev.currentPage, totalPages),
      }));

      fetchSubmissionStatuses(sorted);
      return sorted;
    } catch (error) {
      console.error('Error fetching exercises:', error);
      toast.error('Failed to fetch exercises');
      setExercises([]);
      return [];
    } finally {
      setLoadingExercises(false);
    }
  };

  const fetchSubmissionStatuses = async (exerciseList: Exercise[]) => {
    if (!exerciseList.length || !courseId || !activeTab || !subcategory) return;
    try {
      const token = localStorage.getItem('smartcliff_token');
      if (!token) return;
      const ids = exerciseList.map(e => e._id).join(',');
      const params = new URLSearchParams({ courseId, tabType: activeTab, subcategory, exerciseIds: ids });
      const resp = await fetch(
        `https://lms-server-ym1q.onrender.com/analytics/exercise-submission-status?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok) return;
      const json = await resp.json();
      if (json.success && json.data) setSubmissionStatusMap(json.data);
    } catch { /* silent — button just stays disabled */ }
  };

  const refreshExercisesAndUpdateSelected = async (): Promise<Exercise | null> => {
    if (!subcategory?.trim()) return null;
    try {
      const resp = await exerciseApi.getExercises(getEntityType(nodeType), nodeId, activeTab, subcategory);
      const list: Exercise[] = resp.data?.exercises ?? [];
      setExercises(list);
      setPagination(p => ({ ...p, totalItems: list.length, totalPages: Math.ceil(list.length / p.itemsPerPage) }));
      const targetId = selectedExerciseForAdd?._id;
      if (targetId) {
        const fresh = list.find(e => e._id === targetId);
        if (fresh) { setSelectedExerciseForAdd(fresh); return fresh; }
      }
      return null;
    } catch { return null; }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddQuestion = async (ex: Exercise) => {
    // Fetch full exercise data (with questionConfiguration / scoring) before opening the form
    let freshEx: any = ex;
    try {
      const res = await exerciseApi.getExerciseById(ex._id);
      const fetched = res?.data?.exercise || res?.data || res?.exercise;
      if (fetched) freshEx = { ...ex, ...fetched };
    } catch { /* fall back to the list exercise */ }

    if (freshEx.exerciseType === 'Combined') {
      const { canAddMCQ, canAddProgramming } = canAddAnyQuestionInCombined(freshEx);
      if (!canAddMCQ && !canAddProgramming) { toast.warning('Cannot add more questions. All limits reached.'); return; }
      setSelectedExerciseForAdd(freshEx); setFullExerciseForAdd(freshEx); setShowAddQuestionModal(true);
    } else if (freshEx.exerciseType === 'MCQ') {
      if (hasReachedMaxMarks(freshEx)) { toast.warning(`Cannot add more questions. Total marks (${freshEx.exerciseInformation.totalMarks}) already achieved.`); return; }
      setSelectedExerciseForAdd(freshEx); setFullExerciseForAdd(freshEx); setShowAddQuestionOptions(true);
    } else {
      if (hasReachedMaxMarks(freshEx)) {
        const progCfg = freshEx.questionConfiguration?.programmingQuestionConfiguration;
        const isGeneral = progCfg?.questionConfigType === 'general';
        const typeLabel = freshEx.exerciseType === 'Other' ? 'Other' : 'Programming';
        toast.warning(isGeneral
          ? `Cannot add more questions. ${typeLabel} question limit (${progCfg?.generalQuestionCount}) reached.`
          : 'Cannot add more questions. All difficulty slots are filled.');
        return;
      }
      setSelectedExerciseForAdd(freshEx); setFullExerciseForAdd(freshEx); setShowAddQuestionModal(true);
    }
  };

  const handleQuestionBankSelect = async (selectedQuestions: Question[]) => {
    if (!selectedQuestions.length || !selectedExerciseForAdd) return;
    setIsAddingQuestions(true);
    const tid = toast.loading(`Adding ${selectedQuestions.length} question(s)...`);
    try {
      let ok = 0, fail = 0;
      for (const q of selectedQuestions) {
        try {
          const data = q.questionType === 'mcq' ? {
            questionType: 'mcq', mcqQuestionTitle: q.mcqQuestionTitle || q.questionTitle,
            mcqQuestionDescription: q.mcqQuestionDescription || q.description, mcqQuestionType: q.mcqQuestionType || 'multiple_choice',
            mcqQuestionDifficulty: q.mcqQuestionDifficulty || q.difficulty, mcqQuestionScore: q.mcqQuestionScore || q.score || 10,
            mcqQuestionOptions: q.mcqQuestionOptions, mcqQuestionCorrectAnswers: q.mcqQuestionCorrectAnswers,
            mcqQuestionOptionsPerRow: q.mcqQuestionOptionsPerRow || 1, mcqQuestionRequired: q.mcqQuestionRequired || false, isActive: true,
          } : {
            questionType: 'programming', title: q.title || q.questionTitle, description: q.description,
            difficulty: q.difficulty || 'medium', score: q.score || q.points || 10, testCases: q.testCases || [],
            solutions: q.solutions, isActive: true,
          };
          await exerciseApi.addQuestion(getEntityType(nodeType), nodeId, selectedExerciseForAdd._id, data, activeTab, subcategory);
          ok++;
        } catch { fail++; }
      }
      toast.dismiss(tid);
      if (ok) toast.success(`${ok} question(s) added!`);
      if (fail) toast.warning(`${fail} question(s) failed.`);
      if (ok) await fetchExercises();
    } catch { toast.dismiss(tid); toast.error('Failed to add questions from bank'); }
    finally { setIsAddingQuestions(false); setShowQuestionBank(false); setSelectedExerciseForAdd(null); }
  };

  const handleNewExercise = () => {
    if (!subcategory) { toast.error('Please select a subcategory first'); return; }
    setEditingExercise(null); setIsEditing(false); setShowSettingsModal(true);
  };

  const handleEditExercise = (ex: Exercise) => { setEditingExercise(ex); setIsEditing(true); setShowSettingsModal(true); };
  const handleDeleteConfirm = async () => {
    if (!exerciseToDelete) return;
    setDeleting(true);
    try {
      await exerciseApi.deleteExercise(
        getEntityType(nodeType),
        nodeId,
        exerciseToDelete._id,
        activeTab,
        subcategory
      );

      // Update exercises list
      const updatedExercises = exercises.filter(e => e._id !== exerciseToDelete._id);
      setExercises(updatedExercises);

      // Get filtered exercises based on search query
      const filteredExercises = updatedExercises.filter(ex => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return ex.exerciseInformation?.exerciseName?.toLowerCase().includes(q) ||
          ex.exerciseInformation?.exerciseId?.toLowerCase().includes(q);
      });

      // Calculate new pagination values
      const newTotalItems = filteredExercises.length;
      const newTotalPages = Math.ceil(newTotalItems / pagination.itemsPerPage);

      // If current page is greater than new total pages, move to the last available page
      let newCurrentPage = pagination.currentPage;
      if (newCurrentPage > newTotalPages) {
        newCurrentPage = Math.max(1, newTotalPages);
      }

      // Update pagination state
      setPagination(prev => ({
        ...prev,
        totalItems: newTotalItems,
        totalPages: newTotalPages,
        currentPage: newCurrentPage
      }));

      setShowDeleteModal(false);
      setExerciseToDelete(null);
      toast.success('Exercise deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete exercise.');
    } finally {
      setDeleting(false);
    }
  };
  const handleAnalytics = (ex: Exercise) => {
    localStorage.setItem('lms_returning_from_analytics', 'true');
    localStorage.setItem('lms_sidebar_collapsed', 'true');
    localStorage.setItem('lms_selected_tab', activeTab || 'We_Do');
    localStorage.setItem('lms_selected_subcategory', subcategory);
    localStorage.setItem('lms_selected_node_id', nodeId);
    localStorage.setItem('lms_selected_node_name', nodeName);
    const q = new URLSearchParams({
      exerciseId: ex._id, nodeId, nodeType,
      sourceTab: activeTab || 'We_Do', sourceSubcategory: subcategory, courseId,
      moduleName: hierarchyData.moduleName || '',
      returnUrl: '/lms/pages/coursestructure/uploadcourseresources',
    }).toString();
    router.push(`/lms/pages/courses/reviewSubmission?${q}`);
  };

  const handleSaveSettings = async () => {
    const prevExerciseId = selectedExerciseForAdd?._id;
    const wasEditing = isEditing;
    const editedExerciseId = editingExercise?._id;

    setShowSettingsModal(false);
    setEditingExercise(null);
    setIsEditing(false);
    setLockConfigStrategy(false);
    setIsLoading(true);

    try {
      const freshExercises = await fetchExercises(); // single, awaited fetch

      if (prevExerciseId) {
        const refreshed = freshExercises.find(e => e._id === prevExerciseId);
        if (refreshed) {
          setSelectedExerciseForAdd(refreshed);
          // Also update fullExerciseForAdd so its questionConfiguration doesn't stale-override
          setFullExerciseForAdd(refreshed);
        }
      }
      if (wasEditing && editedExerciseId) {
        const refreshed = freshExercises.find(e => e._id === editedExerciseId);
        if (refreshed) {
          if (selectedExercise?._id === editedExerciseId) setSelectedExercise(refreshed);
          if (selectedExerciseForAdd?._id === editedExerciseId) {
            setSelectedExerciseForAdd(refreshed);
            setFullExerciseForAdd(refreshed);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing after save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionSaved = async (savedData?: any) => {
    const isSaveAndNext = savedData?.__saveAndNext === true;
    const isUpdate = savedData?.__isUpdate === true;
    if (isSaveAndNext) {
      const freshExercise = await refreshExercisesAndUpdateSelected();
      if (freshExercise) setSelectedExerciseForAdd(freshExercise);
      toast.success(isUpdate ? 'Question updated — continue!' : 'Question saved — continue!', { autoClose: 1500 });
    } else {
      toast.success(isUpdate ? 'Question updated successfully' : 'Question saved successfully');
      setShowAddQuestionModal(false); setSelectedExerciseForAdd(null);
      await fetchExercises();
    }
  };

  const handleAction = (type: string, ex: Exercise) => {
    switch (type) {
      case 'edit': handleEditExercise(ex); break;
      case 'manageQuestions': setSelectedExercise(ex); setShowQuestions(true); break;
      case 'addQuestion': handleAddQuestion(ex); break;
      case 'delete': setExerciseToDelete(ex); setShowDeleteModal(true); break;
      case 'review': handleAnalytics(ex); break;
      default: toast.info('Feature coming soon');
    }
  };

  const getExerciseStatus = (ex: Exercise): string => {
    if (!isExerciseComplete(ex)) return 'Incomplete';
    const questions = ex.questions ?? [];
    const qc = ex.questionConfiguration;
    const mcqCfg: any = (qc as any)?.mcqQuestionConfiguration ?? null;
    const progCfg: any = (qc as any)?.programmingQuestionConfiguration ?? null;
    const mcqQuestions = questions.filter(q => q.questionType === 'mcq');
    const progQuestions = questions.filter(q =>
      q.questionType === 'programming' || q.questionType === 'database' || q.questionType === 'others'
    );
    let maxQ = 0, curQ = 0;
    if (ex.exerciseType === 'MCQ') {
      maxQ = mcqCfg?.totalMcqQuestions ?? 0;
      curQ = mcqQuestions.length;
    } else if (ex.exerciseType === 'Programming') {
      const ct = progCfg?.questionConfigType;
      const counts = progCfg?.levelBasedCounts ?? progCfg?.selectionLevelCounts ?? {};
      maxQ = ct === 'general' ? (progCfg?.generalQuestionCount ?? 0)
        : (((counts as any).easy ?? 0) + ((counts as any).medium ?? 0) + ((counts as any).hard ?? 0));
      curQ = progQuestions.length;
    } else if (ex.exerciseType === 'Combined') {
      const ct = progCfg?.questionConfigType;
      const counts = progCfg?.levelBasedCounts ?? progCfg?.selectionLevelCounts ?? {};
      const progMax = ct === 'general' ? (progCfg?.generalQuestionCount ?? 0)
        : (((counts as any).easy ?? 0) + ((counts as any).medium ?? 0) + ((counts as any).hard ?? 0));
      maxQ = (mcqCfg?.totalMcqQuestions ?? 0) + progMax;
      curQ = mcqQuestions.length + progQuestions.length;
    }
    if (maxQ > 0 && curQ < maxQ) return 'Incomplete';
    return 'Completed';
  };

  const getFilteredExercises = () => {
    let f = exercises;
    if (exerciseTypeFilter) {
      f = f.filter(ex => ex.exerciseType === exerciseTypeFilter);
    }
    if (statusFilter) {
      f = f.filter(ex => getExerciseStatus(ex) === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(ex =>
        ex.exerciseInformation?.exerciseName?.toLowerCase().includes(q) ||
        ex.exerciseInformation?.exerciseId?.toLowerCase().includes(q)
      );
    }
    return f;
  };
  const getPaginatedExercises = () => {
    const f = getFilteredExercises();
    const s = (pagination.currentPage - 1) * pagination.itemsPerPage;
    return f.slice(s, s + pagination.itemsPerPage);
  };

  // ── UI sub-components ──────────────────────────────────────────────────────

  const renderLevelBadge = (level = 'intermediate') => {
    const label = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    return (
      <span style={{
        fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
        textTransform: 'uppercase' as const, letterSpacing: '0.05em',
        background: 'transparent', color: '#64748b',
        border: '1px solid #eef0f4', whiteSpace: 'nowrap' as const,
        fontFamily: JKT.fontFamily,
      }}>
        {label}
      </span>
    );
  };


  // ── Status bars ────────────────────────────────────────────────────
  // AFTER (entire component replacement)
 const ScoreProgress = ({ exercise }: { exercise: Exercise }) => {
  // Check if exercise settings are complete
  const exerciseSettingsComplete = isExerciseComplete(exercise);

  const questions = exercise.questions ?? [];
  const qc = exercise.questionConfiguration;
  const mcqCfg: any = (qc as any)?.mcqQuestionConfiguration ?? null;
  const progCfg: any = (qc as any)?.programmingQuestionConfiguration ?? null;
  const mcqQuestions = questions.filter(q => q.questionType === 'mcq');
  const progQuestions = questions.filter(q =>
    q.questionType === 'programming' || q.questionType === 'database' || q.questionType === 'others'
  );

  let questionsComplete = true;
  let curQ = 0, maxQ = 0;

  if (exercise.exerciseType === 'MCQ') {
    maxQ = mcqCfg?.totalMcqQuestions ?? 0;
    curQ = mcqQuestions.length;
    if (maxQ > 0 && curQ < maxQ) questionsComplete = false;
  } else if (exercise.exerciseType === 'Programming') {
    const ct = progCfg?.questionConfigType;
    const counts = progCfg?.levelBasedCounts ?? progCfg?.selectionLevelCounts ?? {};
    maxQ = ct === 'general'
      ? (progCfg?.generalQuestionCount ?? 0)
      : (((counts as any).easy ?? 0) + ((counts as any).medium ?? 0) + ((counts as any).hard ?? 0));
    curQ = progQuestions.length;
    if (maxQ > 0 && curQ < maxQ) questionsComplete = false;
  } else if (exercise.exerciseType === 'Combined') {
    const ct = progCfg?.questionConfigType;
    const counts = progCfg?.levelBasedCounts ?? progCfg?.selectionLevelCounts ?? {};
    const progMax = ct === 'general'
      ? (progCfg?.generalQuestionCount ?? 0)
      : (((counts as any).easy ?? 0) + ((counts as any).medium ?? 0) + ((counts as any).hard ?? 0));
    maxQ = (mcqCfg?.totalMcqQuestions ?? 0) + progMax;
    curQ = mcqQuestions.length + progQuestions.length;
    if (maxQ > 0 && curQ < maxQ) questionsComplete = false;
  }

  // Determine final status
  const isComplete = exerciseSettingsComplete && questionsComplete;

  // Color configurations
  const completeStyle = {
    bg: 'rgba(34, 197, 94, 0.08)',
    text: '#16a34a',
    border: 'rgba(34, 197, 94, 0.2)',
    dot: '#22c55e',
    label: 'Complete',
    icon: CheckCircle,
  };

  const incompleteStyle = {
    bg: 'rgba(242, 119, 87, 0.08)',
    text: '#e0623f',
    border: 'rgba(242, 119, 87, 0.2)',
    dot: '#F27757',
    label: 'Incomplete',
    icon: AlertTriangle,
  };

  const style = isComplete ? completeStyle : incompleteStyle;
  const StatusIcon = style.icon;

  // Build tooltip message
  let tooltipMessage = '';
  if (!exerciseSettingsComplete) {
    tooltipMessage = 'Exercise settings are incomplete';
  } else if (!questionsComplete) {
    tooltipMessage = `${curQ} of ${maxQ} questions added`;
  } else {
    tooltipMessage = 'Exercise is fully configured';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: JKT.fontFamily,
              background: style.bg,
              color: style.text,
              border: `1px solid ${style.border}`,
              cursor: 'default',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            <StatusIcon size={12} strokeWidth={2.5} style={{ color: style.dot, flexShrink: 0 }} />
            <span>{style.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="text-xs bg-white text-gray-900 border border-gray-200 shadow-lg"
          style={{ fontFamily: JKT.fontFamily }}
        >
          <div className="p-1.5">
            <p className="text-[11px] font-semibold mb-1.5" style={{ color: '#1a1a2e' }}>
              {tooltipMessage}
            </p>
            {!exerciseSettingsComplete ? (
              <p className="text-[10px]" style={{ color: '#8b8b9e' }}>
                Complete all settings first
              </p>
            ) : !questionsComplete && maxQ > 0 ? (
              <div>
                <div className="h-1.5 rounded-full overflow-hidden w-36" style={{ background: '#f0f0f5' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, (curQ / maxQ) * 100)}%`,
                    background: isComplete ? '#22c55e' : '#F27757',
                  }} />
                </div>
                <p className="text-[10px] mt-1" style={{ color: '#8b8b9e' }}>
                  {Math.round((curQ / maxQ) * 100)}% complete
                </p>
              </div>
            ) : (
              <p className="text-[10px]" style={{ color: '#16a34a' }}>
                All requirements met ✓
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
  // ── Type badge ─────────────────────────────────────────────────────────────
  // AFTER
  const ExerciseTypeBadge = ({ type }: { type: string }) => (
    <span style={{
      fontSize: 12, fontWeight: 500, color: '#64748b',
      fontFamily: JKT.fontFamily,
    }}>
      {type}
    </span>
  );

  // ── Programming Tooltip Content ─────────────────────────────────────────────
  const ProgrammingTooltipDetail = ({ exercise, status }: { exercise: Exercise; status: ProgrammingStatusFull }) => {
    const diffColors: Record<string, { dot: string; text: string; bar: string; badge: string }> = {
      easy: { dot: '#22c55e', text: '#16a34a', bar: '#4ade80', badge: '#f0fdf4' },
      medium: { dot: '#f59e0b', text: '#d97706', bar: '#fbbf24', badge: '#fffbeb' },
      hard: { dot: '#f43f5e', text: '#e11d48', bar: '#fb7185', badge: '#fff1f2' },
    };

    if (status.configType === 'general') {
      const cur = status.generalCurrent ?? 0, max = status.generalMax;
      const curMarks = status.generalCurrentMarks ?? 0, maxMarks = status.generalMaxMarks;
      const remaining = status.generalRemainingCount, remainingMarks = status.generalRemainingMarks;
      const marksPerQ = status.marksPerQuestion;
      const pct = max ? Math.min(100, (cur / max) * 100) : 0;
      const isFull = max !== undefined && cur >= max;
      return (
        <div className="space-y-2" style={JKT}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: status.available ? '#22c55e' : '#bcbccc' }} />
              <span className="font-semibold text-[12px]" style={{ color: '#1a1a2e' }}>Programming</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>General</span>
            </div>
            {isFull && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}>Full</span>}
          </div>
          {max !== undefined && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: '#8b8b9e' }}>Questions</span>
                <span className="font-bold tabular-nums" style={{ color: isFull ? '#e11d48' : '#1a1a2e' }}>{cur}/{max}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f0f0f5' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isFull ? '#ef4444' : 'linear-gradient(90deg,#F27757,#e0623f)' }} />
              </div>
              {remaining !== undefined && remaining > 0 && <p className="text-[10px] font-medium" style={{ color: '#16a34a' }}>✓ {remaining} question{remaining !== 1 ? 's' : ''} remaining</p>}
            </div>
          )}
          {maxMarks !== undefined && maxMarks > 0 && (
            <div className="flex items-center justify-between text-[11px] pt-1" style={{ borderTop: '1px solid #f0f0f5' }}>
              <span style={{ color: '#8b8b9e' }}>Marks used</span>
              <span className="font-semibold" style={{ color: '#1a1a2e' }}>{curMarks}/{maxMarks}</span>
            </div>
          )}
          {remainingMarks !== undefined && remainingMarks > 0 && <p className="text-[10px]" style={{ color: '#8b8b9e' }}>{remainingMarks} marks remaining</p>}
          {marksPerQ !== undefined && marksPerQ > 0 && <p className="text-[10px]" style={{ color: '#3b82f6' }}>{marksPerQ} marks per question</p>}
        </div>
      );
    }

    const levelEntries = Object.entries(status.levels);
    if (levelEntries.length === 0) {
      return (
        <div className="flex items-center gap-1.5" style={JKT}>
          <div className="w-2 h-2 rounded-full" style={{ background: status.available ? '#22c55e' : '#bcbccc' }} />
          <span className="font-semibold text-[12px]" style={{ color: '#1a1a2e' }}>Programming</span>
          {!status.available && <span className="text-[10px]" style={{ color: '#e11d48' }}>{status.reason}</span>}
        </div>
      );
    }

    const modeLabel = status.configType === 'levelBased' ? 'Level Based' : 'Selection Level';
    return (
      <div className="space-y-2" style={JKT}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: status.available ? '#22c55e' : '#bcbccc' }} />
            <span className="font-semibold text-[12px]" style={{ color: '#1a1a2e' }}>Programming</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(242,119,87,0.08)', color: '#e0623f', border: '1px solid rgba(242,119,87,0.2)' }}>{modeLabel}</span>
          </div>
          {!status.available && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}>Full</span>}
        </div>
        <div className="space-y-1.5">
          {levelEntries.map(([diff, detail]) => {
            const c = diffColors[diff] ?? diffColors.medium;
            const pct = detail.max > 0 ? Math.min(100, (detail.current / detail.max) * 100) : 0;
            const isFull = !detail.available;
            return (
              <div key={diff} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
                    <span className="text-[11px] font-medium capitalize" style={{ color: isFull ? '#8b8b9e' : c.text }}>{diff}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: isFull ? '#ef4444' : '#1a1a2e' }}>{detail.current}/{detail.max}</span>
                    {detail.remainingMarks !== undefined && detail.max > 0 && <span className="text-[10px]" style={{ color: '#bcbccc' }}>({detail.currentMarks}/{detail.maxMarks} marks)</span>}
                    {isFull && <span className="text-[9px] px-1 py-0.5 rounded font-semibold" style={{ background: c.badge, color: c.text, border: `1px solid ${c.bar}30` }}>Full</span>}
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f0f0f5' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isFull ? '#d1d5db' : c.bar }} />
                </div>
                {!isFull && detail.remainingCount > 0 && (
                  <p className="text-[10px]" style={{ color: c.text }}>
                    {detail.remainingCount} slot{detail.remainingCount !== 1 ? 's' : ''} left
                    {detail.remainingMarks !== undefined && ` · ${detail.remainingMarks} marks left`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Action Menu ─────────────────────────────────────────────────────────────
  // Inside ProblemSolving component, update the ActionMenu to add Mock Preview:

  const ActionMenu = ({ exercise }: { exercise: Exercise }) => {
    const exerciseComplete = isExerciseComplete(exercise);
    const [showMockPreview, setShowMockPreview] = useState(false);

    const isCombinedEx = exercise.exerciseType === 'Combined';
    const progCfg = exercise.questionConfiguration?.programmingQuestionConfiguration;
    const isGeneralMode = progCfg?.questionConfigType === 'general';
    const progStatus = buildProgrammingStatus(exercise);
    let isAddDisabled = false, addDisabledReason = '';
    let mcqStatus = { available: false, reason: '' };

    if (isCombinedEx) {
      const mc = canAddMCQInCombined(exercise);
      mcqStatus = { available: mc.canAdd, reason: mc.reason ?? '' };
      isAddDisabled = !mcqStatus.available && !progStatus.available;
      if (isAddDisabled) addDisabledReason = 'All question type limits reached';
    } else {
      isAddDisabled = hasReachedMaxMarks(exercise);
      if (isAddDisabled) addDisabledReason = isGeneralMode ? `Programming question limit (${progCfg?.generalQuestionCount}) reached` : 'All question slots are filled';
    }

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ps-action-btn">
              <MoreVertical size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72" style={{ ...JKT, border: '1px solid #e4e4ed', boxShadow: '0 8px 32px rgba(26,26,46,0.14)' }}>

            {/* NEW: Mock Preview - Only show when exercise is complete */}
            {exerciseComplete && exercise.questions && exercise.questions.length > 0 && (
              <>
                <DropdownMenuItem
                  onClick={() => setShowMockPreview(true)}
                  className="cursor-pointer text-xs gap-2"
                  style={{ color: '#1a1a2e', fontFamily: JKT.fontFamily }}>
                  <Eye className="h-3.5 w-3.5" style={{ color: '#a855f7' }} />
                  Mock Preview
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>
                    {exercise.questions.length} Qs
                  </span>
                </DropdownMenuItem>
                <Separator className="my-1" style={{ height: '1px', background: '#e4e4ed', display: 'block' }} />
              </>
            )}

            {/* Review Submissions - Only show when exercise is complete */}
            {exerciseComplete && (
              <>
                <DropdownMenuItem
                  onClick={() => handleAction('review', exercise)}
                  className="cursor-pointer text-xs gap-2"
                  disabled={!submissionStatusMap[exercise._id]}
                  style={{ color: '#1a1a2e', fontFamily: JKT.fontFamily }}>
                  <BarChart3 className="h-3.5 w-3.5" style={{ color: submissionStatusMap[exercise._id] ? '#3b82f6' : '#bcbccc' }} />
                  Review Submissions
                </DropdownMenuItem>
                <Separator className="my-1" style={{ height: '1px', background: '#e4e4ed', display: 'block' }} />
              </>
            )}

            {/* Manage Exercise - Only show when exercise is complete */}
            {exerciseComplete && (
              <>
                <DropdownMenuItem
                  onClick={() => handleAction('manageQuestions', exercise)}
                  className="cursor-pointer text-xs gap-2"
                  style={{ color: '#1a1a2e', fontFamily: JKT.fontFamily }}>
                  <FileCode className="h-3.5 w-3.5" style={{ color: '#F27757' }} />
                  Manage Exercise
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(242,119,87,0.1)', color: '#e0623f', border: '1px solid rgba(242,119,87,0.2)' }}>
                    {exercise.questions?.length ?? 0}
                  </span>
                </DropdownMenuItem>
                <Separator className="my-1" style={{ height: '1px', background: '#e4e4ed', display: 'block' }} />
              </>
            )}

            {/* Continue Incomplete Exercise OR Edit Exercise based on completion status */}
            {exerciseComplete ? (
              <DropdownMenuItem
                onClick={() => handleAction('edit', exercise)}
                className="cursor-pointer text-xs gap-2"
                style={{ color: '#1a1a2e', fontFamily: JKT.fontFamily }}>
                <Edit3 className="h-3.5 w-3.5" style={{ color: '#3b82f6' }} />
                Edit Exercise
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => handleAction('edit', exercise)}
                className="cursor-pointer text-xs gap-2"
                style={{ color: '#F27757', fontFamily: JKT.fontFamily }}>
                <Edit3 className="h-3.5 w-3.5" style={{ color: '#F27757' }} />
                Edit Exercise
              </DropdownMenuItem>
            )}

            <Separator className="my-1" style={{ height: '1px', background: '#e4e4ed', display: 'block' }} />

            <DropdownMenuItem onClick={() => handleAction('delete', exercise)} className="cursor-pointer text-xs gap-2 text-red-600 focus:text-red-600" style={{ fontFamily: JKT.fontFamily }}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mock Preview Modal */}
        {showMockPreview && (
          <ExerciseMockPreviewModal
            exercise={exercise}
            configuredLanguages={configuredLanguages}
            onClose={() => setShowMockPreview(false)}
          />
        )}



      </>
    );
  };

  // ── AddQuestionOptions modal (MCQ only) ─────────────────────────────────────
  /**
   * Drop-in replacement for the AddQuestionOptions component inside ProblemSolving.tsx.
   *
   * Changes vs original:
   *   • Adds a third option: "Add Questions via Document"
   *   • Uses the onOpenDocumentUpload callback to trigger the new modal
   *   • Import additions needed in ProblemSolving.tsx:
   *       import { FileText, Database } from 'lucide-react';  // add to existing import
   *       import AddQuestionViaDocument from './AddQuestionViaDocument';
   */

  // ── AddQuestionOptions ─────────────────────────────────────────────────────────
  // Replace the existing component definition in ProblemSolving.tsx with this one.

  const AddQuestionOptions = ({ exercise, onClose: closeOpts }: { exercise: Exercise; onClose: () => void }) => {

    const crumbs = getBreadcrumbs();

    const options = [
      {
        label: "Create New Question",
        sub: "Build an MCQ question from scratch",
        accent: "#F27757",
        bg: "rgba(242,119,87,0.1)",
        Icon: Plus,
        onClick: () => {
          setSelectedExerciseForAdd(exercise);
          setShowAddQuestionModal(true);
          closeOpts();
        },
      },
      {
        label: "Choose from Question Bank",
        sub: "Select existing MCQ questions",
        accent: "#a855f7",
        bg: "rgba(168,85,247,0.08)",
        Icon: Database,
        onClick: () => {
          setSelectedExerciseForAdd(exercise);
          setQbankFromMCQOpts(true);
          setShowQuestionBank(true);
          closeOpts();
        },
      },
      {
        label: "Add Questions via Document",
        sub: "Bulk import from JSON · CSV · TXT",
        accent: "#0891b2",
        bg: "rgba(8,145,178,0.08)",
        Icon: FileText,
        onClick: () => {
          setSelectedExerciseForAdd(exercise);
          setShowDocumentUpload(true);   // ← this instead
          closeOpts();
        },
      },
    ];

    return (
      <>
        <div
          className="fixed inset-0"
          style={{ zIndex: 100, background: "rgba(26,26,46,0.45)", backdropFilter: "blur(4px)" }}
        />
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 101, pointerEvents: "none" }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            style={{
              ...JKT,
              border: "1px solid #e4e4ed",
              pointerEvents: "auto",
              boxShadow: "0 20px 60px rgba(26,26,46,0.18), 0 4px 16px rgba(242,119,87,0.08)",
            }}
          >
            {/* Header */}
            <div className="p-5 pb-4" style={{ borderBottom: "1px solid #e4e4ed" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  {crumbs.length > 0 && (
                    <div className="flex items-center flex-wrap gap-0.5 mb-2">
                      {crumbs.map((c, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                          {i > 0 && (
                            <span style={{ color: "#F27757" }} className="mx-1 text-sm">
                              ›
                            </span>
                          )}
                          <span
                            className="text-[11px] font-medium"
                            style={{ color: c.type === "subcategory" ? "#F27757" : "#6b6b7e" }}
                          >
                            {c.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-0.5">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(242,119,87,0.1)" }}
                    >
                      <Plus size={13} style={{ color: "#F27757" }} />
                    </div>
                    <h2 className="text-[15px] font-bold" style={{ color: "#1a1a2e" }}>
                      Add Question
                    </h2>
                  </div>
                  <p className="text-[11px]" style={{ color: "#8b8b9e" }}>
                    Choose how to add MCQ questions
                  </p>
                </div>
                <button
                  onClick={closeOpts}
                  style={{
                    cursor: "pointer",
                    color: "#bcbccc",
                    padding: "4px",
                    borderRadius: "8px",
                    lineHeight: 0,
                    border: "none",
                    background: "transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#6b6b7e";
                    e.currentTarget.style.background = "#f5f5f8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#bcbccc";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Option buttons */}
            <div className="p-4 space-y-2.5">
              {options.map(({ label, sub, accent, bg, Icon, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="group w-full text-left rounded-xl p-4 transition-all"
                  style={{ border: "1.5px solid #e4e4ed", cursor: "pointer", background: "#fff" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = accent;
                    e.currentTarget.style.background = `${accent}08`;
                    e.currentTarget.style.boxShadow = `0 2px 12px ${accent}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e4e4ed";
                    e.currentTarget.style.background = "#fff";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: bg }}
                    >
                      <Icon size={18} style={{ color: accent }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold" style={{ color: "#1a1a2e" }}>
                        {label}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: "#8b8b9e" }}>
                        {sub}
                      </div>
                    </div>
                    <ChevronRight
                      size={15}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: accent }}
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Cancel */}
            <div className="px-4 pb-4">
              <button
                onClick={closeOpts}
                className="w-full py-2.5 rounded-xl text-[12px] font-medium transition-all"
                style={{
                  ...JKT,
                  border: "1px solid #e4e4ed",
                  color: "#6b6b7e",
                  background: "#fafafa",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f8")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fafafa")}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };
  // ── Scrollbar style injection ──────────────────────────────────────────────
  const ScrollbarStyles = () => (
    <style>{`
      .ps-table-scroll {
        scrollbar-width: thin;
        scrollbar-color: #ece9f1 transparent;
      }
      .ps-table-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
      .ps-table-scroll::-webkit-scrollbar-track { background: transparent; }
      .ps-table-scroll::-webkit-scrollbar-thumb { background: #ece9f1; border-radius: 99px; }
      .ps-table-scroll::-webkit-scrollbar-thumb:hover { background: #F27757; }
      .ps-action-btn { color: #bcbccc; background: transparent; border: none; cursor: pointer; border-radius: 8px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; transition: color 0.15s, background 0.15s; }
      .ps-action-btn:hover { color: #F27757 !important; background: rgba(242,119,87,0.1) !important; }
    `}</style>
  );

  // ── Questions view ─────────────────────────────────────────────────────────
  if (showQuestions && selectedExercise) {
    return (
      <Questions
        exercise={selectedExercise} nodeId={nodeId} nodeName={nodeName}
        subcategory={subcategory} nodeType={nodeType} tabType={activeTab}
        hierarchyData={hierarchyData} breadcrumbs={getBreadcrumbs()}
        onBack={() => { setShowQuestions(false); setSelectedExercise(null); fetchExercises(); }}
        onEditExercise={(exercise) => {
          setShowQuestions(false); setEditingExercise(exercise);
          setIsEditing(true); setShowSettingsModal(true); setSelectedExercise(null);
        }}
      />
    );
  }

  const filtered = getFilteredExercises();
  const paginated = getPaginatedExercises();

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col"
      style={{ ...JKT, background: '#ffffff', color: '#1a1a2e', height: '100%', minHeight: 0 }}>
      <ScrollbarStyles />

      {/* ══ Header ════════════════════════════════════════════════════════ */}
      {/* ══ Header ════════════════════════════════════════════════════════ */}
   <div className="bg-white" style={{ borderBottom: '1px solid #e4e4ed' }}>
  {/* Single Row: search + type filter + status filter + refresh + new assignment */}
  <div className="px-4 py-2 flex items-center gap-2 mt-1">
    {/* Search */}
    <div className="relative flex-1 min-w-0">
      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#bcbccc' }} />
      <input
        placeholder="Search Assignments"
        value={searchQuery}
        onChange={e => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, currentPage: 1 })); }}
        className="pl-7 pr-7 h-7 w-full text-[12px] rounded-lg outline-none transition-all"
        style={{ ...JKT, background: '#fafafa', border: '1.5px solid #e4e4ed', color: '#1a1a2e' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#F27757'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242,119,87,0.1)'; e.currentTarget.style.background = '#fff'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#e4e4ed'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#fafafa'; }}
      />
      {searchQuery && (
        <button onClick={() => setSearchQuery('')}
          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#bcbccc', cursor: 'pointer', lineHeight: 0, border: 'none', background: 'none', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F27757')}
          onMouseLeave={e => (e.currentTarget.style.color = '#bcbccc')}>
          <X size={11} />
        </button>
      )}
    </div>

    {/* Type filter select */}
    <select
      value={exerciseTypeFilter ?? ''}
      onChange={e => setExerciseTypeFilter(e.target.value || null)}
      className="h-7 text-[11px] rounded-lg outline-none transition-all flex-shrink-0"
      style={{ ...JKT, background: '#fafafa', border: '1.5px solid #e4e4ed', color: '#6b6b7e', padding: '0 8px', cursor: 'pointer', minWidth: '120px' }}
      onFocus={e => { e.currentTarget.style.borderColor = '#F27757'; }}
      onBlur={e => { e.currentTarget.style.borderColor = '#e4e4ed'; }}>
      <option value="">All Types</option>
      <option value="MCQ">MCQ</option>
      <option value="Programming">Programming</option>
      <option value="Combined">Combined</option>
    </select>

    {/* Status filter select */}
    <select
      value={statusFilter ?? ''}
      onChange={e => setStatusFilter(e.target.value || null)}
      className="h-7 text-[11px] rounded-lg outline-none transition-all flex-shrink-0"
      style={{ ...JKT, background: '#fafafa', border: '1.5px solid #e4e4ed', color: '#6b6b7e', padding: '0 8px', cursor: 'pointer', minWidth: '110px' }}
      onFocus={e => { e.currentTarget.style.borderColor = '#F27757'; }}
      onBlur={e => { e.currentTarget.style.borderColor = '#e4e4ed'; }}>
      <option value="">All Status</option>
      <option value="Completed">Completed</option>
      <option value="Incomplete">Incomplete</option>
    </select>

    {/* Divider */}
    <div className="h-5 w-px flex-shrink-0" style={{ background: '#e4e4ed' }} />

    {/* Refresh button */}
    <button onClick={fetchExercises} disabled={loadingExercises || !subcategory}
      title="Refresh exercises"
      className="h-7 w-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0"
      style={{ color: '#8b8b9e', cursor: 'pointer', border: 'none', background: 'transparent' }}
      onMouseEnter={e => { if (!loadingExercises) { e.currentTarget.style.color = '#F27757'; e.currentTarget.style.background = 'rgba(242,119,87,0.08)'; } }}
      onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent'; }}>
      <RefreshCw size={14} className={loadingExercises ? 'animate-spin' : ''} style={{ color: loadingExercises ? '#F27757' : undefined }} />
    </button>

    {/* New Assignment button */}
    <button onClick={handleNewExercise} disabled={isLoading || !subcategory}
      title="Create new assignment"
      className="h-7 px-3 text-[12px] font-semibold rounded-lg flex items-center gap-1 transition-all select-none disabled:opacity-50 flex-shrink-0"
      style={{ ...JKT, background: '#F27757', color: '#fff', boxShadow: '0 2px 8px rgba(242,119,87,0.3)', cursor: 'pointer', border: 'none' }}
      onMouseEnter={e => { if (!isLoading && subcategory) { e.currentTarget.style.background = '#e0623f'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(242,119,87,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.background = '#F27757'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(242,119,87,0.3)'; e.currentTarget.style.transform = 'none'; }}>
      {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
      <span className="hidden sm:inline">New Assignment</span>
    </button>
  </div>

  {/* Active search filter bar */}
  {searchQuery && (
    <div className="flex-none flex items-center gap-2 px-4 py-1.5"
      style={{ background: 'rgba(242,119,87,0.05)', borderBottom: '1px solid rgba(242,119,87,0.15)' }}>
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#F27757' }}>Filtering:</span>
      <button onClick={() => setSearchQuery('')}
        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all"
        style={{ background: 'rgba(242,119,87,0.1)', color: '#F27757', border: '1px solid rgba(242,119,87,0.2)', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(242,119,87,0.18)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(242,119,87,0.1)')}>
        "{searchQuery}" <X size={9} />
      </button>
      <span className="text-[10px] ml-auto" style={{ color: '#F27757' }}>
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
      </span>
    </div>
  )}
</div>

      {/* ══ Table area ════════════════════════════════════════════════════ */}
      {/* ══ Table area with fixed height and scroll ═════════════════════ */}
      {/* ══ Table area ════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', flex: '1 1 0', minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
        {loadingExercises ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="relative">
              <div className="w-10 h-10 border-4 rounded-full" style={{ borderColor: '#f5f5f8' }} />
              <div className="absolute inset-0 border-4 rounded-full animate-spin" style={{ borderColor: '#F27757', borderTopColor: 'transparent' }} />
            </div>
            <p className="text-[12px] font-medium" style={{ color: '#8b8b9e', ...JKT }}>Loading exercises…</p>
          </div>
        ) : paginated.length > 0 ? (
          <>
            {/* ── Fixed header ── */}
            <div style={{ flexShrink: 0, borderBottom: '1px solid #eef0f4', background: '#fafbfc' }}>
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    {[
                      { label: '#', style: { width: '4%', paddingLeft: 16, paddingRight: 8 } },
                      {
                        label: 'Assignment ID', style: {
                          width: '13%', paddingLeft: 20, paddingRight: 20
                        }
                      },
                      {
                        label: 'Assignment Name', style: {
                          width: '30%', paddingLeft: 20, paddingRight: 20
                        }
                      },
                      {
                        label: 'Type', style: {
                          width: '10%', paddingLeft: 20, paddingRight: 20
                        }
                      },
                      {
                        label: 'Created', style: {
                          width: '14%', paddingLeft: 20, paddingRight: 20
                        }
                      },
                      {
                        label: 'Status', style: {
                          width: '18%', paddingLeft: 20, paddingRight: 20
                        }
                      },
                      {
                        label: 'Actions', style: {
                          width: '8%', paddingLeft: 20, paddingRight: 20
                          , textAlign: 'center' as const
                        }
                      },
                    ].map(h => (
                      <th key={h.label}
                        style={{
                          ...h.style,
                          paddingTop: 12,
                          paddingBottom: 12,
                          textAlign: 'left' as const,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          color: '#64748b',
                          fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {/* ── Scrollable tbody ── */}
            <div className="ps-table-scroll" style={{ flex: '1 1 0', overflowY: 'auto', overflowX: 'hidden' }}>
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '4%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <tbody>
                  {paginated.map((ex, idx) => {
                    const rowNum = (pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1;
                    return (
                      <tr key={ex._id}
                        style={{ borderBottom: '1px solid #eef0f4', background: '#ffffff', height: 40 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#ffffff'; }}>

                        {/* # */}
                        <td style={{ paddingTop: 0, paddingBottom: 0, paddingLeft: 20, paddingRight: 20, verticalAlign: 'middle' }}>
                          <span className="text-[11px] font-mono" style={{ color: '#bcbccc' }}>
                            {rowNum}
                          </span>
                        </td>

                        {/* Exercise ID */}
                        <td style={{ paddingTop: 0, paddingBottom: 0, paddingLeft: 20, paddingRight: 20, verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: '#64748b' }}>
                            {ex.exerciseInformation.exerciseId}
                          </span>
                        </td>

                        {/* Exercise Name */}
                        <td style={{
                          paddingTop: 0, paddingBottom: 0, paddingLeft: 20, paddingRight: 20
                          , verticalAlign: 'middle', minWidth: 0
                        }}>
                          <span className="truncate" style={{ fontSize: 12.5, fontWeight: 400, color: '#0F172A', letterSpacing: '-0.005em', lineHeight: 1.3, fontFamily: JKT.fontFamily, display: 'block' }}>
                            {ex.exerciseInformation.exerciseName}
                          </span>
                        </td>

                        {/* Type */}
                        <td style={{
                          paddingTop: 0, paddingBottom: 0, paddingLeft: 20, paddingRight: 20
                          , verticalAlign: 'middle'
                        }}>
                          <ExerciseTypeBadge type={ex.exerciseType} />
                        </td>

                        {/* Created */}
                        <td style={{
                          paddingTop: 0, paddingBottom: 0, paddingLeft: 20, paddingRight: 20
                          , verticalAlign: 'middle'
                        }}>
                          <div className="flex items-center gap-1.5" style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', fontFamily: JKT.fontFamily }}>
                            <Calendar size={11} style={{ color: '#bcbccc', flexShrink: 0 }} />
                            <span>{new Date(ex.createdAt).toLocaleDateString('en-GB')}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{
                          paddingTop: 0, paddingBottom: 0, paddingLeft: 20, paddingRight: 20
                          , verticalAlign: 'middle'
                        }}>
                          <ScoreProgress exercise={ex} />
                        </td>

                        {/* Actions */}
                        <td style={{
                          paddingTop: 0, paddingBottom: 0, paddingLeft: 20, paddingRight: 20
                          , verticalAlign: 'middle', textAlign: 'center'
                        }}>
                          <ActionMenu exercise={ex} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center text-center py-16 p-8">
            <div className="mb-4 p-5 rounded-2xl"
              style={{ background: 'rgba(242,119,87,0.06)', border: '1.5px dashed rgba(242,119,87,0.25)' }}>
              <FileCode size={32} style={{ color: 'rgba(242,119,87,0.4)' }} />
            </div>
            <h3 className="text-[14px] font-bold mb-1" style={{ color: '#1a1a2e', ...JKT }}>
              {searchQuery ? 'No matching exercises' : 'No exercises yet'}
            </h3>
            <p className="text-[12px] mb-5 max-w-xs leading-relaxed" style={{ color: '#8b8b9e', ...JKT }}>
              {searchQuery ? 'Try adjusting your search query.'
                : !subcategory ? 'Please select a subcategory.'
                  : `Create your first exercise for ${activeTab?.replace('_', ' ')}.`}
            </p>
            {subcategory && !searchQuery && (
              <button onClick={handleNewExercise}
                className="h-8 px-5 gap-1.5 text-white text-[12px] font-semibold rounded-xl flex items-center transition-all"
                style={{ ...JKT, background: '#F27757', boxShadow: '0 2px 8px rgba(242,119,87,0.3)', cursor: 'pointer', border: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e0623f'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(242,119,87,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F27757'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(242,119,87,0.3)'; }}>
                <Plus size={14} /> Create Exercise
              </button>
            )}
          </div>
        )}
      </div>
      {/* ══ Pagination ════════════════════════════════════════════════════ */}
      {filtered.length > 0 && (
        <div className="flex-none bg-white px-4 py-2 flex items-center justify-between"
          style={{ borderTop: '1px solid #e4e4ed', flexShrink: 0 }}>
          <div className="text-[11px]" style={{ color: '#8b8b9e', ...JKT }}>
            Showing{' '}
            <span className="font-semibold" style={{ color: '#1a1a2e' }}>
              {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
            </span>{' '}–{' '}
            <span className="font-semibold" style={{ color: '#1a1a2e' }}>
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
            </span>{' '}of{' '}
            <span className="font-semibold" style={{ color: '#1a1a2e' }}>{pagination.totalItems}</span>
            {exercises.length !== filtered.length && <span style={{ color: '#bcbccc' }}> (filtered from {exercises.length})</span>}
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagination(p => ({ ...p, currentPage: Math.max(1, p.currentPage - 1) }))}
                disabled={pagination.currentPage === 1}
                title="Previous page"
                className="h-6 w-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                style={{ color: '#8b8b9e', cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer', border: 'none', background: 'transparent' }}
                onMouseEnter={e => { if (pagination.currentPage !== 1) { e.currentTarget.style.color = '#F27757'; e.currentTarget.style.background = 'rgba(242,119,87,0.08)'; } }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent'; }}>
                <ChevronLeft size={13} />
              </button>
              <div className="flex gap-0.5">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPagination(prev => ({ ...prev, currentPage: p }))}
                    title={`Page ${p}`}
                    className="h-6 w-6 rounded-md text-[11px] font-semibold transition-all"
                    style={pagination.currentPage === p
                      ? { ...JKT, background: '#F27757', color: '#fff', boxShadow: '0 2px 6px rgba(242,119,87,0.35)', cursor: 'default', border: 'none' }
                      : { ...JKT, color: '#6b6b7e', cursor: 'pointer', border: 'none', background: 'transparent' }}
                    onMouseEnter={e => { if (pagination.currentPage !== p) { e.currentTarget.style.background = 'rgba(242,119,87,0.08)'; e.currentTarget.style.color = '#F27757'; } }}
                    onMouseLeave={e => { if (pagination.currentPage !== p) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b6b7e'; } }}>
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPagination(p => ({ ...p, currentPage: Math.min(p.totalPages, p.currentPage + 1) }))}
                disabled={pagination.currentPage >= pagination.totalPages}
                title="Next page"
                className="h-6 w-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                style={{ color: '#8b8b9e', cursor: pagination.currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer', border: 'none', background: 'transparent' }}
                onMouseEnter={e => { if (pagination.currentPage < pagination.totalPages) { e.currentTarget.style.color = '#F27757'; e.currentTarget.style.background = 'rgba(242,119,87,0.08)'; } }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent'; }}>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════ */}

      {showAddQuestionOptions && selectedExerciseForAdd && (
        <AddQuestionOptions exercise={selectedExerciseForAdd} onClose={() => setShowAddQuestionOptions(false)} />
      )}

      {showQuestionBank && selectedExerciseForAdd && (
        <div className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 80, background: 'rgba(26,26,46,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto"
            style={{ border: '1px solid #e4e4ed' }}>
            <QuestionBankSelector
              exerciseData={{
                exerciseId: selectedExerciseForAdd._id,
                exerciseName: selectedExerciseForAdd.exerciseInformation.exerciseName,
                exerciseLevel: selectedExerciseForAdd.exerciseInformation.exerciseLevel || 'intermediate',
                nodeId, nodeName, subcategory, nodeType,
                fullExerciseData: { ...selectedExerciseForAdd, hierarchyData },
                exerciseType: selectedExerciseForAdd.exerciseType,
              }}
              tabType={activeTab}
              onClose={() => { setShowQuestionBank(false); setQbankFromMCQOpts(false); setSelectedExerciseForAdd(null); }}
              onBack={qbankFromMCQOpts ? () => { setShowQuestionBank(false); setQbankFromMCQOpts(false); setShowAddQuestionOptions(true); } : undefined}
              onSelect={handleQuestionBankSelect}
              existingQuestionIds={selectedExerciseForAdd.questions?.map(q => q._id) || []}
              existingQuestions={selectedExerciseForAdd.questions || []}
            />
          </div>
        </div>
      )}

      {showAddQuestionModal && selectedExerciseForAdd && (
        <AddQuestionForm
          exerciseData={{
            exerciseId: selectedExerciseForAdd._id,
            exerciseName: selectedExerciseForAdd.exerciseInformation.exerciseName,
            exerciseLevel: selectedExerciseForAdd.exerciseInformation.exerciseLevel || 'intermediate',
            selectedLanguages: selectedExerciseForAdd.programmingSettings?.selectedLanguages || [],
            evaluationSettings: getEvaluationSettings(selectedExerciseForAdd),
            nodeId, nodeName, subcategory, nodeType,
            exerciseType: selectedExerciseForAdd.exerciseType,
            fullExerciseData: {
              ...selectedExerciseForAdd,
              ...(fullExerciseForAdd || {}),
              exerciseType: selectedExerciseForAdd.exerciseType,
              hierarchyData,
            },
            programmingSettings: selectedExerciseForAdd.programmingSettings,
          }}
          breadcrumbs={getBreadcrumbs()}
          tabType={activeTab}
          onClose={async () => { setShowAddQuestionModal(false); setSelectedExerciseForAdd(null); setFullExerciseForAdd(null); await fetchExercises(); }}
          onSave={handleQuestionSaved}
          onOpenQuestionBank={() => { setShowAddQuestionModal(false); setShowQuestionBank(true); }}
          onOpenDocumentUpload={() => { setShowAddQuestionModal(false); setShowDocumentUpload(true); }}
          onMCQBankSelect={async (qs) => { setShowAddQuestionModal(false); await handleQuestionBankSelect(qs); }}
          showTypeSelector={selectedExerciseForAdd.exerciseType === 'Combined'}
          onEditExercise={() => {
            // Open ExerciseSettings on top of ProgrammingQuestionForm with Config Strategy locked
            if (selectedExerciseForAdd) {
              setLockConfigStrategy(true);
              handleEditExercise(selectedExerciseForAdd);
            }
          }}
        />
      )}

      {showDocumentUpload && selectedExerciseForAdd && (
        <AddQuestionViaDocument
          exerciseData={{
            exerciseId: selectedExerciseForAdd._id,
            exerciseName: selectedExerciseForAdd.exerciseInformation.exerciseName,
            exerciseLevel: selectedExerciseForAdd.exerciseInformation.exerciseLevel || "intermediate",
            nodeId: nodeId,
            nodeName: nodeName,
            nodeType: nodeType,
            subcategory: subcategory,
            fullExerciseData: selectedExerciseForAdd,
          }}
          tabType={activeTab}
          breadcrumbs={getBreadcrumbs()}
          onClose={() => {
            setShowDocumentUpload(false);
            setSelectedExerciseForAdd(null);
          }}
          onInserted={async (count) => {
            await fetchExercises();
            toast.success(`${count} question${count !== 1 ? "s" : ""} added via document`);
          }}
        />
      )}


      {showSettingsModal && (
        <ExerciseSettings
          hierarchyData={hierarchyData} nodeId={nodeId} nodeName={nodeName}
          subcategory={subcategory} nodeType={nodeType} level={hierarchyData.level}
          tabType={activeTab} onSave={handleSaveSettings}
          onClose={async () => { setShowSettingsModal(false); setEditingExercise(null); setIsEditing(false); setLockConfigStrategy(false); await fetchExercises(); }}
          isEditing={isEditing} exercise_Id={editingExercise?._id} initialData={editingExercise ?? undefined}
          configuredLanguages={configuredLanguages}
          lockConfigStrategy={lockConfigStrategy}
        />
      )}

      {/* Delete Modal */}
      {/* Delete Modal */}
      {showDeleteModal && exerciseToDelete && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 60, background: 'rgba(26,26,46,0.5)', backdropFilter: 'blur(4px)' }} />
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 61, pointerEvents: 'none' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              style={{ ...JKT, border: '1px solid #e4e4ed', pointerEvents: 'auto', boxShadow: '0 20px 60px rgba(26,26,46,0.18)' }}>

              {/* Header with red gradient */}
              <div className="flex items-center gap-3 p-4"
                style={{ borderBottom: '1px solid #fee2e2', background: 'linear-gradient(135deg,#fff5f5,#fff)' }}>
                <div className="p-2 bg-red-100 rounded-xl">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold" style={{ color: '#1a1a2e' }}>Delete Exercise</h3>
                  <p className="text-[11px]" style={{ color: '#8b8b9e' }}>This action cannot be undone</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <p className="text-[12px] mb-3" style={{ color: '#6b6b7e' }}>
                  Are you sure you want to permanently delete this exercise?
                </p>
                <div className="p-3 rounded-xl" style={{ background: '#fafafa', border: '1px solid #e4e4ed' }}>
                  <p className="text-[12px] font-semibold truncate" style={{ color: '#1a1a2e' }}>
                    "{exerciseToDelete.exerciseInformation.exerciseName}"
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ExerciseTypeBadge type={exerciseToDelete.exerciseType} />
                  </div>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setExerciseToDelete(null);
                  }}
                  disabled={deleting}
                  className="flex-1 py-2 text-[12px] rounded-xl transition-all disabled:opacity-50"
                  style={{
                    ...JKT,
                    border: '1.5px solid #e4e4ed',
                    color: '#6b6b7e',
                    background: '#fff',
                    cursor: deleting ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={e => {
                    if (!deleting) {
                      e.currentTarget.style.background = '#fafafa';
                      e.currentTarget.style.borderColor = '#d0d0de';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#e4e4ed';
                  }}>
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 py-2 text-[12px] font-semibold text-white rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-70 transition-all"
                  style={{
                    ...JKT,
                    background: '#ef4444',
                    cursor: deleting ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={e => {
                    if (!deleting) e.currentTarget.style.background = '#dc2626';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#ef4444';
                  }}>
                  {deleting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3" />
                      Delete Exercise
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProblemSolving;