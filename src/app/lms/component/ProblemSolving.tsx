import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, FileCode, RefreshCw, Loader2, Trash2,
  ChevronLeft, ChevronRight, MoreVertical, Calendar, Code,
  AlertTriangle, X, Zap, CheckCircle, Edit3, BarChart3,
  Laptop, Code2, Search,
  FileText,
  Database,
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

// ─── Design tokens (parity with QuestionsView) ────────────────────────────────
const JKT: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
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
  if (!ex.exerciseInformation?.exerciseName?.trim()) return false;
  if (!ex.availabilityPeriod?.startDate) return false;
  if (ex.exerciseType === 'Combined') {
    if ((ex.exerciseInformation?.totalMarksMCQ ?? 0) === 0) return false;
    if ((ex.exerciseInformation?.totalMarksProgramming ?? 0) === 0) return false;
  } else {
    if ((ex.exerciseInformation?.totalMarks ?? 0) === 0) return false;
  }
  return true;
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
  setIsLoading(true);

  try {
    const freshExercises = await fetchExercises(); // single, awaited fetch

    if (prevExerciseId) {
      const refreshed = freshExercises.find(e => e._id === prevExerciseId);
      if (refreshed) setSelectedExerciseForAdd(refreshed);
    }
    if (wasEditing && editedExerciseId) {
      const refreshed = freshExercises.find(e => e._id === editedExerciseId);
      if (refreshed) {
        if (selectedExercise?._id === editedExerciseId) setSelectedExercise(refreshed);
        if (selectedExerciseForAdd?._id === editedExerciseId) setSelectedExerciseForAdd(refreshed);
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

  const getFilteredExercises = () => {
    let f = exercises;

    // Filter by exercise type
    if (exerciseTypeFilter) {
      f = f.filter(ex => ex.exerciseType === exerciseTypeFilter);
    }

    // Filter by search query
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
    const nl = level.toLowerCase() as 'beginner' | 'intermediate' | 'expert';
    const cfg = {
      beginner: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#22c55e', label: 'Beginner' },
      intermediate: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', dot: '#f59e0b', label: 'Intermediate' },
      expert: { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3', dot: '#f43f5e', label: 'Expert' },
    };
    const c = cfg[nl] ?? cfg.intermediate;
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ ...JKT, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
        {c.label}
      </span>
    );
  };

  // ── Score progress bars ────────────────────────────────────────────────────
  const ScoreProgress = ({ exercise }: { exercise: Exercise }) => {
    if (!isExerciseComplete(exercise)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full cursor-default"
                style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <AlertTriangle size={9} style={{ color: '#ea580c', flexShrink: 0 }} />
                <span className="text-[10px] font-semibold" style={{ color: '#ea580c', ...JKT }}>In Complete Exercise</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs bg-white text-gray-900 border border-gray-200 shadow-lg" style={JKT}>
              <div className="flex items-center gap-1.5 p-0.5">
                <AlertTriangle size={11} style={{ color: '#ea580c' }} />
                <span>Exercise incomplete — finish all required settings</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (exercise.exerciseType === 'Combined') {
      const mcqTotal = exercise.exerciseInformation?.totalMarksMCQ ?? 0;
      const progTotal = exercise.exerciseInformation?.totalMarksProgramming ?? 0;
      const mcqCur = calculateTotalMCQScore(exercise);
      const progCur = calculateTotalProgrammingScore(exercise);
      const progCfg = exercise.questionConfiguration?.programmingQuestionConfiguration;
      const isGeneral = progCfg?.questionConfigType === 'general';
      const genMax = progCfg?.generalQuestionCount;
      const progCurCnt = (exercise.questions ?? []).filter(q => q.questionType === 'programming').length;

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-1.5 w-full" style={{ cursor: 'default' }}>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-bold w-9" style={{ color: '#3b82f6', ...JKT }}>MCQ</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#f0f0f5' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${mcqTotal ? (mcqCur / mcqTotal) * 100 : 0}%`, background: 'linear-gradient(90deg,#3b82f6,#6366f1)' }} />
                  </div>
                  <span className="w-14 text-right tabular-nums font-semibold" style={{ color: '#6b6b7e', ...JKT }}>{mcqCur}/{mcqTotal}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-bold w-9" style={{ color: '#F27757', ...JKT }}>Prog</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#f0f0f5' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${isGeneral && genMax ? (progCurCnt / genMax) * 100 : progTotal ? (progCur / progTotal) * 100 : 0}%`, background: 'linear-gradient(90deg,#F27757,#e0623f)' }} />
                  </div>
                  <span className="w-14 text-right tabular-nums font-semibold" style={{ color: '#6b6b7e', ...JKT }}>
                    {isGeneral && genMax ? `${progCurCnt}/${genMax}q` : `${progCur}/${progTotal}`}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs bg-white text-gray-900 border border-gray-200 shadow-lg" style={JKT}>
              <div className="space-y-1 p-1">
                <p>MCQ: {mcqCur}/{mcqTotal} marks ({getMCQQuestionCount(exercise)}/{exercise.questionConfiguration?.mcqQuestionConfiguration?.totalMcqQuestions ?? 0} q)</p>
                {isGeneral ? <p>Prog: {progCurCnt}/{genMax} questions, {progCur}/{progTotal} marks <span style={{ color: '#F27757' }}>(General)</span></p>
                  : <p>Prog: {progCur}/{progTotal} marks</p>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    const total = exercise.exerciseInformation?.totalMarks ?? 0;
    const cur = calculateTotalScore(exercise);
    const pct = getScoreUsagePercentage(exercise);
    if (total === 0) return null;

    const progCfg = exercise.questionConfiguration?.programmingQuestionConfiguration;
    const isGeneral = exercise.exerciseType === 'Programming' && progCfg?.questionConfigType === 'general';
    const genMax = progCfg?.generalQuestionCount;
const genCur = (exercise.questions ?? []).filter(isProgrammingType).length;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 w-full" style={{ cursor: 'default' }}>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#f0f0f5' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${isGeneral && genMax ? (genCur / genMax) * 100 : pct}%`,
                    background: pct >= 100 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : isGeneral ? 'linear-gradient(90deg,#a855f7,#9333ea)' : 'linear-gradient(90deg,#F27757,#e0623f)',
                  }} />
              </div>
              <span className="text-[11px] font-bold tabular-nums" style={{ color: pct >= 100 ? '#ef4444' : '#6b6b7e', ...JKT }}>
                {isGeneral && genMax ? `${genCur}/${genMax}q` : `${cur}/${total}`}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs bg-white text-gray-900 border border-gray-200 shadow-lg" style={JKT}>
            <div className="space-y-1 p-1">
              {isGeneral && genMax ? (<>
                <p>Questions: {genCur}/{genMax}</p>
                <p>Marks: {cur}/{total}</p>
                <p style={{ color: '#a855f7' }}>General mode</p>
                {genCur >= genMax && <p style={{ color: '#ef4444' }} className="font-semibold">Question limit reached</p>}
              </>) : (<>
                <p>Total Marks: {total}</p>
                <p>Current: {cur}</p>
                <p>Remaining: {getRemainingMarks(exercise)}</p>
                {pct >= 100 && <p style={{ color: '#ef4444' }} className="font-semibold">Maximum marks achieved</p>}
              </>)}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // ── Type badge ─────────────────────────────────────────────────────────────
  const ExerciseTypeBadge = ({ type }: { type: string }) => {
    const cfg: Record<string, { bg: string; text: string; border: string; dot: string }> = {
      MCQ: { bg: '#f5f3ff', text: '#7c3aed', border: '#e9d5ff', dot: '#a78bfa' },
      Programming: { bg: 'rgba(242,119,87,0.08)', text: '#e0623f', border: 'rgba(242,119,87,0.25)', dot: '#F27757' },
      Combined: { bg: '#fdf4ff', text: '#a21caf', border: '#f0abfc', dot: '#d946ef' },
    };
    const c = cfg[type] ?? cfg.MCQ;
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ ...JKT, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
        {type}
      </span>
    );
  };

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
                    {detail.remainingMarks !== undefined && detail.max > 0 && <span className="text-[10px]" style={{ color: '#bcbccc' }}>({detail.currentMarks}/{detail.maxMarks} pts)</span>}
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
const ActionMenu = ({ exercise }: { exercise: Exercise }) => {
  const exerciseComplete = isExerciseComplete(exercise);
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="ps-action-btn">
          <MoreVertical size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72" style={{ ...JKT, border: '1px solid #e4e4ed', boxShadow: '0 8px 32px rgba(26,26,46,0.14)' }}>

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
           Edit Unfinished Exercise
            {/* <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(242,119,87,0.1)', color: '#e0623f', border: '1px solid rgba(242,119,87,0.2)' }}>
              Finish Setup
            </span> */}
          </DropdownMenuItem>
        )}

        <Separator className="my-1" style={{ height: '1px', background: '#e4e4ed', display: 'block' }} />

        <DropdownMenuItem onClick={() => handleAction('delete', exercise)} className="cursor-pointer text-xs gap-2 text-red-600 focus:text-red-600" style={{ fontFamily: JKT.fontFamily }}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
        scrollbar-color: #c4c4d0 #f0f0f5;
      }
      .ps-table-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .ps-table-scroll::-webkit-scrollbar-track { background: #f0f0f5; border-radius: 99px; }
      .ps-table-scroll::-webkit-scrollbar-thumb { background: #c4c4d0; border-radius: 99px; border: 2px solid #f0f0f5; }
      .ps-table-scroll::-webkit-scrollbar-thumb:hover { background: #F27757; }

      .ps-row { transition: background 0.15s ease, box-shadow 0.15s ease; cursor: default; }
      .ps-row:hover { background: linear-gradient(90deg, rgba(242,119,87,0.07) 0%, rgba(242,119,87,0.03) 100%) !important; box-shadow: inset 3px 0 0 #F27757; }
      .ps-row:hover .ps-row-num { color: #F27757 !important; font-weight: 600; }
      .ps-row:hover .ps-row-id { background: rgba(242,119,87,0.08) !important; color: #e0623f !important; border-color: rgba(242,119,87,0.2) !important; }
      .ps-row:hover .ps-row-name { color: #e0623f !important; }
      .ps-row:hover .ps-row-icon { background: rgba(242,119,87,0.12) !important; border-color: rgba(242,119,87,0.25) !important; }
      .ps-row:hover .ps-row-score { background: rgba(242,119,87,0.12) !important; color: #e0623f !important; }
      .ps-row:hover .ps-action-btn { color: #F27757 !important; background: rgba(242,119,87,0.1) !important; }

      .ps-action-btn { color: #bcbccc; background: transparent; border: none; cursor: pointer; border-radius: 8px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transition: color 0.15s, background 0.15s; }
      .ps-action-btn:hover { color: #F27757 !important; background: rgba(242,119,87,0.12) !important; }
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
      style={{ ...JKT, background: '#ffffff', color: '#1a1a2e' }}>
      <ScrollbarStyles />

      {/* ══ Header ════════════════════════════════════════════════════════ */}
      {/* ══ Header ════════════════════════════════════════════════════════ */}
      <div className="bg-white px-4 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid #e4e4ed' }}>

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Icon */}
          <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg"
            style={{ background: 'rgba(242,119,87,0.1)', border: '1px solid rgba(242,119,87,0.2)' }}>
            <FileCode size={16} style={{ color: '#F27757' }} />
          </div>
          {/* Title */}
          <div className="min-w-0">
            <h1 className="text-[13px] font-bold leading-none truncate" style={{ color: '#1a1a2e' }}>
              Exercises
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {/* Filter Label and Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium" style={{ color: '#8b8b9e', fontFamily: JKT.fontFamily }}>
              Filter:
            </span>
            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
              <button
                onClick={() => setExerciseTypeFilter(null)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${!exerciseTypeFilter
                    ? 'bg-white text-[#F27757] shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                style={{ fontFamily: JKT.fontFamily }}>
                All
              </button>
              <button
                onClick={() => setExerciseTypeFilter('MCQ')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 ${exerciseTypeFilter === 'MCQ'
                    ? 'bg-white text-[#7c3aed] shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                style={{ fontFamily: JKT.fontFamily }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7c3aed' }} />
                MCQ
              </button>
              <button
                onClick={() => setExerciseTypeFilter('Programming')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 ${exerciseTypeFilter === 'Programming'
                    ? 'bg-white text-[#e0623f] shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                style={{ fontFamily: JKT.fontFamily }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F27757' }} />
                Programming
              </button>
              <button
                onClick={() => setExerciseTypeFilter('Combined')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1 ${exerciseTypeFilter === 'Combined'
                    ? 'bg-white text-[#a21caf] shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                style={{ fontFamily: JKT.fontFamily }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d946ef' }} />
                Combined
              </button>
            </div>
          </div>

          <div className="h-5 w-px" style={{ background: '#e4e4ed' }} />

          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#bcbccc' }} />
            <input
              placeholder="Search exercises…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, currentPage: 1 })); }}
              className="pl-7 pr-7 h-7 w-44 text-[12px] rounded-lg outline-none transition-all"
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

          <div className="h-4 w-px" style={{ background: '#e4e4ed' }} />

          {/* Refresh */}
          <button onClick={fetchExercises} disabled={loadingExercises || !subcategory}
            title="Refresh exercises"
            className="h-7 w-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
            style={{ color: '#8b8b9e', cursor: 'pointer', border: 'none', background: 'transparent' }}
            onMouseEnter={e => { if (!loadingExercises) { e.currentTarget.style.color = '#F27757'; e.currentTarget.style.background = 'rgba(242,119,87,0.08)'; } }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent'; }}>
            <RefreshCw size={14} className={loadingExercises ? 'animate-spin' : ''} style={{ color: loadingExercises ? '#F27757' : undefined }} />
          </button>

          {/* New Exercise */}
          <button
            onClick={handleNewExercise}
            disabled={isLoading || !subcategory}
            title="Create new exercise"
            className="h-7 px-3 text-[12px] font-semibold rounded-lg flex items-center gap-1 transition-all select-none disabled:opacity-50"
            style={{ ...JKT, background: '#F27757', color: '#fff', boxShadow: '0 2px 8px rgba(242,119,87,0.3)', cursor: 'pointer', border: 'none' }}
            onMouseEnter={e => { if (!isLoading && subcategory) { e.currentTarget.style.background = '#e0623f'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(242,119,87,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F27757'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(242,119,87,0.3)'; e.currentTarget.style.transform = 'none'; }}>
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
            <span className="hidden sm:inline">New Exercise</span>
          </button>
        </div>
      </div>

      {/* ══ Active search filter bar ══ */}
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

      {/* ══ Table area ════════════════════════════════════════════════════ */}
      {/* ══ Table area with fixed height and scroll ═════════════════════ */}
      <div className="bg-white ps-table-scroll"
        style={{
          position: 'relative',
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 250px)', // Adjust this value based on your layout
          minHeight: '300px'
        }}>
        {loadingExercises ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">

            <div className="relative">
              <div className="w-10 h-10 border-4 rounded-full" style={{ borderColor: '#f5f5f8' }} />
              <div className="absolute inset-0 border-4 rounded-full animate-spin" style={{ borderColor: '#F27757', borderTopColor: 'transparent' }} />
            </div>
            <p className="text-[12px] font-medium" style={{ color: '#8b8b9e', ...JKT }}>Loading exercises…</p>
          </div>
        ) : paginated.length > 0 ? (
          <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
            <thead style={{ background: '#f5f5f5' }}>

              <tr>
                {[
                  { label: '#', cls: 'pl-4 pr-2', style: { width: '3%' } },
                  { label: 'Exercise ID', cls: 'px-3', style: { width: '12%' } },
                  { label: 'Exercise Name', cls: 'px-3', style: { width: '27%' } },
                  { label: 'Type', cls: 'px-3', style: { width: '10%' } },
                  { label: 'Level', cls: 'px-3', style: { width: '10%' } },
                  { label: 'Created', cls: 'px-3', style: { width: '12%' } },
                  { label: 'Score Progress', cls: 'px-3', style: { width: '18%' } },
                  { label: 'Actions', cls: 'px-3 text-center', style: { width: '8%' } },
                ].map(h => (
                  <th key={h.label}
                    className={`py-2.5 text-left select-none ${h.cls}`}
                    style={{ ...JKT, ...h.style, color: '#4a4a4a', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((ex, idx) => {
                const isEven = idx % 2 === 1;
                const rowNum = (pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1;
                return (
                  <tr key={ex._id} className="ps-row"
                    style={{ borderBottom: '1px solid #f0f0f5', background: isEven ? '#fdfcfb' : '#ffffff' }}>

                    {/* # */}
                    <td className="pl-4 pr-2 py-3 align-middle">
                      {rowNum === 1 && pagination.currentPage === 1 ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-bold" style={{ color: '#F27757' }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F27757' }} />
                          {rowNum}
                        </span>
                      ) : (
                        <span className="ps-row-num text-[11px] font-mono" style={{ color: '#bcbccc', transition: 'color 0.15s' }}>
                          {rowNum}
                        </span>
                      )}
                    </td>

                    {/* Exercise ID */}
                    <td className="px-3 py-3 align-middle">
                      <span className="ps-row-id text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md"
                        style={{ background: '#f5f5f8', color: '#6b6b7e', border: '1px solid #e4e4ed', transition: 'all 0.15s' }}>
                        {ex.exerciseInformation.exerciseId}
                      </span>
                    </td>

                    {/* Exercise Name */}
                    <td className="px-3 py-3 align-middle min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="ps-row-icon p-1.5 rounded-lg flex-shrink-0 transition-all"
                          style={{ background: 'rgba(242,119,87,0.06)', border: '1px solid rgba(242,119,87,0.12)' }}>
                          <Laptop size={11} style={{ color: '#F27757' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="ps-row-name font-semibold text-[12px] truncate transition-colors"
                            style={{ color: '#1a1a2e' }}>
                            {ex.exerciseInformation.exerciseName}
                          </div>
                          {ex.questions && (
                            <div className="text-[10px] mt-0.5" style={{ color: '#bcbccc' }}>
                              {ex.questions.length} question{ex.questions.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-3 py-3 align-middle">
                      <ExerciseTypeBadge type={ex.exerciseType} />
                    </td>

                    {/* Level */}
                    <td className="px-3 py-3 align-middle">
                      {renderLevelBadge(ex.exerciseInformation.exerciseLevel)}
                    </td>

                    {/* Created */}
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#8b8b9e' }}>
                        <Calendar size={11} style={{ color: '#bcbccc', flexShrink: 0 }} />
                        <span>{new Date(ex.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </td>

                    {/* Score Progress */}
                    <td className="px-3 py-3 align-middle">
                      <ScoreProgress exercise={ex} />
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 align-middle text-center">
                      <ActionMenu exercise={ex} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
          style={{ borderTop: '1px solid #e4e4ed' }}>
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
            // Keep ProgrammingQuestionForm open — ExerciseSettings overlays on top.
            // selectedExerciseForAdd is preserved so the form refreshes after save.
            if (selectedExerciseForAdd) handleEditExercise(selectedExerciseForAdd);
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
          onClose={async () => { setShowSettingsModal(false); setEditingExercise(null); setIsEditing(false); await fetchExercises(); }}
          isEditing={isEditing} exercise_Id={editingExercise?._id} initialData={editingExercise ?? undefined}
          configuredLanguages={configuredLanguages}
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
                    {renderLevelBadge(exerciseToDelete.exerciseInformation.exerciseLevel)}
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