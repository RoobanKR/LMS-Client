import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, RefreshCw,
  ArrowLeft, Eye,
  Search, Filter, Code2,
  MoreVertical, Edit3,
  Loader,
  X, Database, AlertTriangle,
  CheckCircle, Trash2,
  ChevronLeft, ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import AddQuestionForm from './questionforms/AddQuestionForm';
import { questionApi } from '@/apiServices/question';
import { exerciseApi } from '@/apiServices/exercise';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import AddQuestionViaDocument from './AddQuestionViaDocument';

import RichTextDisplay from './RichTextDisplay';
import QuestionBankSelector from './questionforms/mcq/QuestionBankSelector';
import QuestionPreview from './QuestionPreview';
import ProgrammingQuestionForm from './questionforms/ProgrammingQuestionForm';

// ─── Design tokens (Login page parity) ────────────────────────────────────────
const JKT: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface Exercise {
  _id: string;
  exerciseType: 'MCQ' | 'Programming' | 'Combined' | 'Other';
  configurationType: { mcqMode: boolean; programmingMode: boolean; combinedMode: boolean };
  exerciseInformation: {
    exerciseName: string; exerciseId: string; description?: string;
    exerciseLevel: 'beginner' | 'intermediate' | 'expert'; totalDuration: number;
  };
  programmingSettings?: { selectedModule?: string; selectedLanguages?: string[] };
  questionConfiguration?: { mcqQuestionConfiguration?: any; programmingQuestionConfiguration?: any };
  questions: Question[];
  createdAt: string; updatedAt: string;
}

export interface Question {
  _id: string;
  questionType: 'mcq' | 'programming' | 'frontend' | 'database';
  questionTitle?: string; options?: string[]; correctAnswer?: string;
  title?: string; description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number; score?: number;
  sampleInput?: string; sampleOutput?: string;
  constraints?: string[];
  hints?: Array<{ hintText: string; pointsDeduction: number; isPublic: boolean; sequence: number }>;
  testCases?: Array<any>; databaseTestCases?: Array<any>;
  solutions?: { startedCode: string; functionName: string; language: string };
  timeLimit?: number; memoryLimit?: number;
  isActive: boolean; sequence: number;
  createdAt?: string; updatedAt?: string;
  moduleType?: string; isFrontend?: boolean; isDatabase?: boolean; isProgramming?: boolean;
  browserDatabaseConfig?: any; databaseType?: string; metadata?: any; questionNumber?: number;
  mcqQuestionTitle?: string; mcqQuestionDescription?: string; mcqQuestionType?: string;
  mcqQuestionDifficulty?: 'easy' | 'medium' | 'hard';
  mcqQuestionScore?: number; mcqQuestionTimeLimit?: number;
  mcqQuestionOptions?: Array<{
    text: string; isCorrect: boolean; imageUrl: string | null;
    imageAlignment: string; imageSizePercent: number; _id: string;
  }>;
  mcqQuestionCorrectAnswers?: string[];
  mcqQuestionOptionsPerRow?: number; mcqQuestionRequired?: boolean;
}

interface QuestionsProps {
  exercise: Exercise; nodeId: string; nodeName: string;
  subcategory: string; nodeType: string; onBack: () => void;
  tabType: string; hierarchyData?: any; isModal?: boolean;
  onClose?: () => void; quickAddMode?: boolean;
  onEditExercise?: (exercise: Exercise) => void;
  breadcrumbs?: any[];
}

const API_BASE_URL = 'https://lms-server-ym1q.onrender.com';
const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, '');

// ─── Component ─────────────────────────────────────────────────────────────────
const Questions: React.FC<QuestionsProps> = ({
  hierarchyData, exercise, breadcrumbs, nodeId, nodeName,
  subcategory, nodeType, tabType, onBack,
  isModal = false, onClose, quickAddMode = false, onEditExercise,
}) => {

  // ── State ──────────────────────────────────────────────────────────────────
  const [questions, setQuestions]               = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [showAddQuestion, setShowAddQuestion]   = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [qbankFromMCQOpts, setQbankFromMCQOpts] = useState(false);
  const [currentPage, setCurrentPage]           = useState(1);
  const [searchTerm, setSearchTerm]             = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<'all'|'easy'|'medium'|'hard'>('all');
  const [filterType, setFilterType]             = useState<'all'|'mcq'|'programming'|'frontend'|'database'>('all');
  const [includeInactive, setIncludeInactive]   = useState(false);
  const [hoveredRow, setHoveredRow]             = useState<string | null>(null);

  const [editingQuestion, setEditingQuestion]               = useState<Question | null>(null);
  const [showEditQuestionModal, setShowEditQuestionModal]   = useState(false);
  const [showDeleteQuestionModal, setShowDeleteQuestionModal] = useState(false);
  const [questionToDelete, setQuestionToDelete]             = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion]             = useState(false);
  const [showAddOption, setShowAddOption]                   = useState(false);
  const [previewQuestion, setPreviewQuestion]               = useState<Question | null>(null);

  const [showDuplicateConfirmation, setShowDuplicateConfirmation] = useState(false);
  const [duplicateQuestions, setDuplicateQuestions]         = useState<{ original: Question; duplicate: Question }[]>([]);
  const [pendingBankQuestions, setPendingBankQuestions]     = useState<Question[]>([]);
  const [editingDuplicateQuestion, setEditingDuplicateQuestion] = useState<Question | null>(null);
  const [showEditDuplicateModal, setShowEditDuplicateModal] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions]           = useState(false);
  const [currentEditIndex, setCurrentEditIndex]             = useState(0);
  const [editingMode, setEditingMode]                       = useState<'edit'|'add'>('add');
const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [autoItemsPerPage, setAutoItemsPerPage] = useState(10);
  const [showSlotInfo, setShowSlotInfo]         = useState(false);
  // Full exercise data fetched from API — ensures questionConfiguration is always fresh
  const [fullExData, setFullExData]             = useState<any>(null);
const [showProgrammingForm, setShowProgrammingForm] = useState(false);
const [selectedProgrammingQuestion, setSelectedProgrammingQuestion] = useState<any>(null);
  // ── Dynamic rows ──────────────────────────────────────────────────────────


// ── Dynamic rows ──────────────────────────────────────────────────────────
useEffect(() => {
  const calcRows = () => {
    const c = tableContainerRef.current; if (!c) return;
    const firstRow  = c.querySelector('tbody tr') as HTMLElement | null;
    const headerRow = c.querySelector('thead tr') as HTMLElement | null;
    const rh = firstRow  ? firstRow.getBoundingClientRect().height  : 56;
    const hh = headerRow ? headerRow.getBoundingClientRect().height : 42;
    setAutoItemsPerPage(Math.max(1, Math.floor((c.clientHeight - hh) / rh)));
  };
  const t1 = setTimeout(calcRows, 50), t2 = setTimeout(calcRows, 300);
  const ro = new ResizeObserver(calcRows);
  if (tableContainerRef.current) ro.observe(tableContainerRef.current);
  return () => { clearTimeout(t1); clearTimeout(t2); ro.disconnect(); };
}, [loadingQuestions]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { if (!quickAddMode) fetchQuestions(); }, [exercise._id, includeInactive, quickAddMode]);
  useEffect(() => () => { setEditingQuestion(null); setShowEditQuestionModal(false); }, []);
  useEffect(() => {
    setEditingQuestion(null); setShowEditQuestionModal(false);
    setQuestionToDelete(null); setShowDeleteQuestionModal(false);
  }, [exercise._id]);

  // Fetch full exercise data (with questionConfiguration / scoring) on mount and when exercise changes
  useEffect(() => {
    let cancelled = false;
    const fetchFull = async () => {
      try {
        const res = await exerciseApi.getExerciseById(exercise._id);
        const ex = res?.data?.exercise || res?.data || res?.exercise || null;
        if (ex && !cancelled) setFullExData(ex);
      } catch {
        // fall back to the prop — no error shown
      }
    };
    fetchFull();
    return () => { cancelled = true; };
  }, [exercise._id]);

  // ── Helpers ────────────────────────────────────────────────────────────────
 const getTitle = (q: Question) => {
    if (q.questionType === 'mcq') {
      const t = q.mcqQuestionTitle;
      if (Array.isArray(t)) {
        // extract text from content blocks
        return t.filter((cb: any) => cb.type === 'text')
          .map((cb: any) => (cb.value || '').replace(/<[^>]*>/g, '').trim())
          .filter(Boolean).join(' ') || 'Untitled MCQ';
      }
      return (typeof t === 'string' ? t : '') || 'Untitled MCQ';
    }
    return q.title || q.questionTitle || 'Untitled Question';
  };  const getDesc  = (q: Question) => {
    if (q.questionType === 'mcq') return q.mcqQuestionDescription || '';
    if (q.description) {
      if (typeof q.description === 'string') return q.description.replace(/<[^>]*>/g, '').substring(0, 120);
      // Pure array format: [{ type:'text', value:'...' }, ...]
      if (Array.isArray(q.description)) {
        const text = (q.description as any[]).filter(b => b.type === 'text').map(b => b.value || '').join(' ').replace(/<[^>]*>/g, '').trim();
        return text.substring(0, 120) || 'No description provided';
      }
      // Legacy object format: { text: '...', contentBlocks: [...] }
      if (typeof (q.description as any).text === 'string') return (q.description as any).text.replace(/<[^>]*>/g, '').substring(0, 120);
    }
    return 'No description provided';
  };
  const getDiff  = (q: Question) => q.questionType === 'mcq' ? q.mcqQuestionDifficulty || 'medium' : q.difficulty || 'medium';
const getScore = (q: Question) => Math.round(q.questionType === 'mcq' ? q.mcqQuestionScore || 0 : q.score || q.points || 0);
  const getOptDisplay = (q: Question) => {
    if (q.questionType !== 'mcq' || !q.mcqQuestionOptions) return [];
    return q.mcqQuestionOptions.map(o => { const t = o.text.replace(/<[^>]*>/g, '').trim(); return t.length > 18 ? t.substring(0, 18) + '…' : t; });
  };
  const hasMcqQs = useCallback((qs: Question[]) => qs.some(q => q.questionType === 'mcq'), []);

  // ── Badges ────────────────────────────────────────────────────────────────
  const TYPE_CFG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    mcq:         { label: 'MCQ',      color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-400'  },
    programming: { label: 'Coding',   color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-400'    },
    frontend:    { label: 'Frontend', color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200',  dot: 'bg-amber-400'   },
    database:    { label: 'Database', color: 'text-emerald-700',bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-400' },
  };
  const TypeBadge = ({ type }: { type: string }) => {
    const c = TYPE_CFG[type] || TYPE_CFG.programming;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.color} ${c.bg} ${c.border}`}
        style={{ ...JKT, letterSpacing: '0.01em' }}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
      </span>
    );
  };

  const DIFF_CFG: Record<string, { bg: string; text: string; border: string }> = {
    easy:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    medium: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
    hard:   { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200'    },
  };
  const DiffBadge = ({ level }: { level: string }) => {
    const c = DIFF_CFG[level] || DIFF_CFG.medium;
    return (
      <span className={`inline-flex items-center text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}
        style={JKT}>{level}</span>
    );
  };

  // ── Slot helpers ──────────────────────────────────────────────────────────
  // Always use freshly fetched fullExData when available so quota display stays
  // in sync after exercise settings are changed without a browser reload.
  const effectiveQConfig = fullExData?.questionConfiguration ?? exercise?.questionConfiguration;

  const calcRemaining = () => {
    const mc = effectiveQConfig?.mcqQuestionConfiguration;
    if (!mc || (mc.scoringType || 'equalDistribution') !== 'equalDistribution') return -1;
    return Math.max(0, (mc.totalMcqQuestions || 0) - questions.filter(q => q.questionType === 'mcq').length);
  };
  const calcMarksPerQ = () => effectiveQConfig?.mcqQuestionConfiguration?.marksPerQuestion || 0;

  const isMcqAddDisabled = () => {
    const mc = effectiveQConfig?.mcqQuestionConfiguration;
    if (!mc) return false;
    const st = mc.scoringType || 'equalDistribution';
    const mqQs = questions.filter(q => q.questionType === 'mcq');
    if (st === 'equalDistribution') { const t = mc.totalMcqQuestions || 0; return t > 0 && mqQs.length >= t; }
    if (st === 'questionSpecific')  { const t = mc.mcqTotalMarks || 0; return t > 0 && mqQs.reduce((s, q) => s + (q.mcqQuestionScore || 0), 0) >= t; }
    return false;
  };

  // ── FIXED: isProgGeneralFull now handles selectionLevel ──────────────────
  const isProgGeneralFull = () => {
    const pc = effectiveQConfig?.programmingQuestionConfiguration;
    if (!pc) return false;
    const configType = pc.questionConfigType || 'general';

    if (configType === 'general') {
      const t = pc.generalQuestionCount || 0;
      if (!t) return false;
      return questions.filter(q => q.questionType !== 'mcq' && q.isActive !== false).length >= t;
    }

    if (configType === 'levelBased') {
      const c = pc.levelBasedCounts || {};
      const total = (c.easy || 0) + (c.medium || 0) + (c.hard || 0);
      if (!total) return false;
      return questions.filter(q => q.questionType !== 'mcq' && q.isActive !== false).length >= total;
    }

    if (configType === 'selectionLevel') {
      const c = pc.selectionLevelCounts || {};
      // Only consider difficulties that have a quota > 0
      const activeDiffs = (['easy', 'medium', 'hard'] as const).filter(d => (c[d] || 0) > 0);
      if (!activeDiffs.length) return false;
      // Button is disabled ONLY when ALL active difficulty quotas are individually full
      return activeDiffs.every(d => {
        const quota = c[d] || 0;
        const used = questions.filter(q =>
          q.questionType !== 'mcq' &&
          q.isActive !== false &&
          (q.difficulty || 'medium') === d
        ).length;
        return used >= quota;
      });
    }

    return false;
  };


  const isOthersFull = (): boolean => {
  if (exercise.exerciseType !== 'Other') return false;
  const oc = effectiveQConfig?.othersQuestionConfiguration;
  if (!oc) return false;
  const cfgType = oc.questionConfigType || 'general';
  const othersQs = questions.filter(q => q.questionType === 'others');

  if (cfgType === 'general') {
    const total = oc.generalQuestionCount || 0;
    return total > 0 && othersQs.length >= total;
  }
  // levelBased / selectionLevel
  const counts = oc.levelBasedCounts || oc.selectionLevelCounts || {};
  const total = (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
  return total > 0 && othersQs.length >= total;
};
  // ── NEW: per-difficulty full check for selectionLevel ────────────────────
  const isSelectionLevelDiffFull = (diff: 'easy' | 'medium' | 'hard'): boolean => {
    const pc = effectiveQConfig?.programmingQuestionConfiguration;
    if (!pc || pc.questionConfigType !== 'selectionLevel') return false;
    const quota = (pc.selectionLevelCounts || {})[diff] || 0;
    if (!quota) return false;
    const used = questions.filter(q =>
      q.questionType !== 'mcq' &&
      q.isActive !== false &&
      (q.difficulty || 'medium') === diff
    ).length;
    return used >= quota;
  };

  // ── FIXED: getProgSlotInfo now handles selectionLevel with byDifficulty ──
  const getProgSlotInfo = (): {
    used: number;
    total: number;
    byDifficulty?: Record<string, { used: number; total: number }>;
  } => {
    const pc = effectiveQConfig?.programmingQuestionConfiguration;
    if (!pc) return { used: 0, total: 0 };
    const configType = pc.questionConfigType || 'general';
    const progQs = questions.filter(q => q.questionType !== 'mcq' && q.isActive !== false);
    const used = progQs.length;

    if (configType === 'general') {
      return { used, total: pc.generalQuestionCount || 0 };
    }

    if (configType === 'levelBased') {
      const c = pc.levelBasedCounts || {};
      const total = (c.easy || 0) + (c.medium || 0) + (c.hard || 0);
      const byDifficulty: Record<string, { used: number; total: number }> = {};
      (['easy', 'medium', 'hard'] as const).forEach(d => {
        if ((c[d] || 0) > 0) {
          byDifficulty[d] = {
            used: progQs.filter(q => (q.difficulty || 'medium') === d).length,
            total: c[d],
          };
        }
      });
      return { used, total, byDifficulty };
    }

    if (configType === 'selectionLevel') {
      const c = pc.selectionLevelCounts || {};
      const total = (c.easy || 0) + (c.medium || 0) + (c.hard || 0);
      const byDifficulty: Record<string, { used: number; total: number }> = {};
      (['easy', 'medium', 'hard'] as const).forEach(d => {
        if ((c[d] || 0) > 0) {
          byDifficulty[d] = {
            used: progQs.filter(q => (q.difficulty || 'medium') === d).length,
            total: c[d],
          };
        }
      });
      return { used, total, byDifficulty };
    }

    return { used, total: 0 };
  };

  const strSimilarity = (s1: string, s2: string) => {
    if (!s1 || !s2) return 0; if (s1 === s2) return 1;
    const w1 = s1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const w2 = s2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (!w1.length || !w2.length) return 0;
    return w1.filter(w => w2.includes(w)).length / new Set([...w1, ...w2]).size;
  };

  // ── API ────────────────────────────────────────────────────────────────────
  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const qp = new URLSearchParams(); if (includeInactive) qp.append('includeInactive', 'true');
      const pm: Record<string, string> = { module: 'modules', submodule: 'submodules', topic: 'topics', subtopic: 'subtopics' };
      const pnt = pm[nodeType.toLowerCase()] || nodeType;
      const res = await fetch(`${API_BASE_URL}/questions-get/${pnt}/${nodeId}/${exercise._id}?${qp}`, {
        headers: {
          'Content-Type': 'application/json', Accept: 'application/json',
          Authorization: `Bearer ${localStorage.getItem('smartcliff_token')}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      let fetched: Question[] = [];
      if (result.data?.questions) fetched = result.data.questions;
      else if (Array.isArray(result.data)) fetched = result.data;
      else if (Array.isArray(result.questions)) fetched = result.questions;
      else if (Array.isArray(exercise.questions)) fetched = exercise.questions;
      fetched = [...fetched].reverse().map((q, i) => ({ ...q, questionNumber: fetched.length - i }));
      setQuestions(fetched); setCurrentPage(1);
    } catch {
      setQuestions(Array.isArray(exercise.questions)
        ? [...exercise.questions].reverse().map((q, i) => ({ ...q, questionNumber: exercise.questions.length - i }))
        : []);
      toast.error('Failed to load questions.', { position: 'top-right' });
    } finally { setLoadingQuestions(false); }
  };

  // In Questions.tsx, update the handleAction function:

const handleAction = async (type: string, q: Question) => {
  if (type === 'edit') {
    try {
      await fetchQuestions(); 
      
      // Find the latest version of the question
      const latestQuestion = questions.find(x => x._id === q._id) || q;
      
      // Ensure questionType is explicitly set
      if (!latestQuestion.questionType) {
        // Determine question type from fields if not explicitly set
        if (latestQuestion.mcqQuestionTitle || latestQuestion.mcqQuestionOptions) {
          latestQuestion.questionType = 'mcq';
        } else if (latestQuestion.isFrontend) {
          latestQuestion.questionType = 'frontend';
        } else if (latestQuestion.isDatabase) {
          latestQuestion.questionType = 'database';
        } else {
          latestQuestion.questionType = 'programming';
        }
      }
      
      setEditingQuestion(latestQuestion);
      setShowEditQuestionModal(true);
    } catch {
      setEditingQuestion(q);
      setShowEditQuestionModal(true);
    }
  } else if (type === 'delete') { 
    setQuestionToDelete(q); 
    setShowDeleteQuestionModal(true); 
  } else if (type === 'preview') { 
    setPreviewQuestion(q); 
  }
};

  const handleDeleteConfirm = async () => {
    if (!questionToDelete) return;
    setDeletingQuestion(true);
    try {
      const pm: Record<string, string> = { module: 'modules', submodule: 'submodules', topic: 'topics', subtopic: 'subtopics' };
      await questionApi.deleteQuestion(pm[nodeType.toLowerCase()] as any, nodeId, exercise._id, questionToDelete._id, tabType, subcategory);
      setQuestions(prev => prev.filter(q => q._id !== questionToDelete._id));
      setShowDeleteQuestionModal(false);
      setQuestionToDelete(null);
      await fetchQuestions();
      toast.success('Question deleted successfully', { id: 'delete-success' });
    } catch (err) {
      toast.error('Delete failed', { id: 'delete-error' });
      setShowDeleteQuestionModal(false);
      setQuestionToDelete(null);
    } finally {
      setDeletingQuestion(false);
    }
  };

  // Refresh full exercise data (e.g. after edit-exercise settings are changed from inside the form)
  const refreshFullExData = useCallback(async () => {
    try {
      const res = await exerciseApi.getExerciseById(exercise._id);
      const ex = res?.data?.exercise || res?.data || res?.exercise || null;
      if (ex) setFullExData(ex);
    } catch { /* ignore */ }
  }, [exercise._id]);

  const handleQuestionSaved = async (saved: any) => {
    const isSaveAndNext = saved?.__saveAndNext === true;
    const isUpdate = saved?.__isUpdate === true;
    if (editingQuestion && saved._id && !isSaveAndNext) {
      setQuestions(prev => prev.map(q => q._id === editingQuestion._id ? { ...q, ...saved } : q));
      toast.success('Question updated!', { id: 'question-save' });
      setShowEditQuestionModal(false); setEditingQuestion(null); await fetchQuestions();
    } else if (editingDuplicateQuestion) {
      const upd = [...duplicateQuestions];
      if (upd[currentEditIndex]) upd[currentEditIndex] = { ...upd[currentEditIndex], duplicate: { ...upd[currentEditIndex].duplicate, ...saved } };
      setDuplicateQuestions(upd);
      toast.success('Duplicate updated!');
      setShowEditDuplicateModal(false); setEditingDuplicateQuestion(null);
      if (currentEditIndex < duplicateQuestions.length - 1) {
        if (window.confirm(`Edit next duplicate (${currentEditIndex + 2} of ${duplicateQuestions.length})?`)) {
          const ni = currentEditIndex + 1; setCurrentEditIndex(ni); setEditingDuplicateQuestion(duplicateQuestions[ni].duplicate); setShowEditDuplicateModal(true);
        } else { setShowDuplicateConfirmation(true); setCurrentEditIndex(0); }
      } else { toast.success('All duplicates edited!'); setShowDuplicateConfirmation(true); setCurrentEditIndex(0); }
    } else {
      await fetchQuestions();
      toast.success(
        isSaveAndNext ? (isUpdate ? 'Updated — continue!' : 'Saved — continue!') : (isUpdate ? 'Question updated!' : 'Question created!')
      );
      if (!isSaveAndNext) { setShowAddQuestion(false); setShowQuestionBank(false); if (quickAddMode) setTimeout(() => onClose?.(), 1500); }
    }
  };

  const addSingle = async (q: Question): Promise<boolean> => {
    try {
      const pm: Record<string, any> = { module: 'modules', submodule: 'submodules', topic: 'topics', subtopic: 'subtopics' };
      const pnt = pm[nodeType.toLowerCase()] || 'topics', qt = q.questionType?.toLowerCase() || '';
      const data = qt === 'mcq' ? {
        questionType: 'mcq',mcqQuestionTitle: Array.isArray(q.mcqQuestionTitle)
          ? q.mcqQuestionTitle
          : (q.mcqQuestionTitle || q.questionTitle || ''),        mcqQuestionDescription: q.mcqQuestionDescription || q.description || '', mcqQuestionType: q.mcqQuestionType || 'multiple_choice',
        mcqQuestionDifficulty: q.mcqQuestionDifficulty || q.difficulty || 'medium', mcqQuestionScore: q.mcqQuestionScore || q.score || 10,
        mcqQuestionTimeLimit: q.mcqQuestionTimeLimit || q.timeLimit || 2000, isActive: true,
        mcqQuestionOptionsPerRow: q.mcqQuestionOptionsPerRow || 1, mcqQuestionOptions: q.mcqQuestionOptions || [],
        mcqQuestionCorrectAnswers: q.mcqQuestionCorrectAnswers || [], mcqQuestionRequired: q.mcqQuestionRequired || false,
        sequence: questions.length + 1,
      } : {
        questionType: 'programming', title: q.title || q.questionTitle || '', description: q.description || '',
        difficulty: q.difficulty || 'medium', score: q.score || q.points || 10, timeLimit: q.timeLimit || 2000,
        memoryLimit: q.memoryLimit || 256, isActive: true, testCases: q.testCases || [],
        sampleInput: q.sampleInput || '', sampleOutput: q.sampleOutput || '',
        solutions: q.solutions || { startedCode: '', functionName: 'main', language: 'python' },
        constraints: q.constraints || [], hints: q.hints || [], sequence: questions.length + 1,
      };
      await questionApi.addQuestion(pnt, nodeId, exercise._id, data, tabType, subcategory); return true;
    } catch { return false; }
  };

  const addBatch = async (qs: Question[]) => {
    let sc = 0, ec = 0;
    for (const q of qs) { const ok = await addSingle(q); if (ok) sc++; else ec++; await new Promise(r => setTimeout(r, 200)); }
    return { successCount: sc, errorCount: ec };
  };

 const handleBankSelect = async (selected: Question[]) => {
  if (!selected.length) return;
  
  // Filter programming questions
  const programmingQuestions = selected.filter(q => 
    q.questionType?.toLowerCase() === 'programming'
  );
  
  if (programmingQuestions.length === 0) {
    toast.warning('No programming questions selected', 
      'Please select programming questions from the bank.');
    return;
  }
  
  // If there's only one programming question selected, open the form directly
  if (programmingQuestions.length === 1) {
    setSelectedProgrammingQuestion(programmingQuestions[0]);
    setShowProgrammingForm(true);
    setShowQuestionBank(false);
    return;
  }
  
  // For multiple questions, show confirmation or process in bulk
  const confirmAdd = window.confirm(
    `Add ${programmingQuestions.length} programming question(s) to this exercise?`
  );
  
  if (confirmAdd) {
    setIsAddingQuestions(true);
    const tid = toast.loading(`Adding ${programmingQuestions.length} question(s)…`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const q of programmingQuestions) {
      try {
        // Convert the bank question to the format expected by the API
        const questionData = {
          questionType: 'programming',
          title: q.title || q.mcqQuestionTitle || 'Untitled',
          description: q.description || '',
          difficulty: q.difficulty || q.mcqQuestionDifficulty || 'medium',
          score: q.score || q.mcqQuestionScore || 10,
          timeLimit: q.timeLimit || 2000,
          memoryLimit: q.memoryLimit || 256,
          testCases: q.testCases || [],
          constraints: q.constraints || [],
          hints: q.hints || [],
          isActive: true,
        };
        
        await questionApi.addQuestion(
          nodeType.toLowerCase(),
          nodeId,
          exercise._id,
          questionData,
          tabType,
          subcategory
        );
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }
    
    toast.dismiss(tid);
    toast.success(`${successCount} question(s) added!`);
    if (errorCount > 0) toast.error(`${errorCount} failed.`);
    
    setShowQuestionBank(false);
    await fetchQuestions();
    setIsAddingQuestions(false);
  }
};

  const handleDupConfirm = async (action: 'addAll' | 'skip' | 'edit') => {
    setShowDuplicateConfirmation(false);
    if (action === 'addAll') {
      const all = [...pendingBankQuestions, ...duplicateQuestions.map(d => d.duplicate)];
      if (!all.length) { toast.info('No questions to add.'); return; }
      setIsAddingQuestions(true); const tid = toast.loading(`Adding ${all.length} question(s)…`);
      const r = await addBatch(all); toast.dismiss(tid); setIsAddingQuestions(false);
      if (r.successCount > 0) toast.success(`${r.successCount} added!`);
      setShowQuestionBank(false); await fetchQuestions(); setDuplicateQuestions([]); setPendingBankQuestions([]);
    } else if (action === 'skip') {
      if (pendingBankQuestions.length > 0) {
        setIsAddingQuestions(true); const tid = toast.loading(`Adding ${pendingBankQuestions.length} unique…`);
        const r = await addBatch(pendingBankQuestions); toast.dismiss(tid); setIsAddingQuestions(false);
        if (r.successCount > 0) toast.success(`${r.successCount} added!`);
        if (duplicateQuestions.length > 0) toast.info(`${duplicateQuestions.length} duplicate(s) skipped.`);
      } else toast.info('No new questions to add.');
      setShowQuestionBank(false); await fetchQuestions(); setDuplicateQuestions([]); setPendingBankQuestions([]);
    } else if (action === 'edit' && duplicateQuestions.length > 0) {
      setEditingMode('edit'); setCurrentEditIndex(0);
      setEditingDuplicateQuestion(duplicateQuestions[0].duplicate); setShowEditDuplicateModal(true);
    }
  };

  const handleEditDupComplete = () => {
    setShowEditDuplicateModal(false); setEditingDuplicateQuestion(null);
    if (duplicateQuestions.length > 0 && currentEditIndex < duplicateQuestions.length - 1) {
      if (window.confirm(`${duplicateQuestions.length - currentEditIndex - 1} more. Continue?`)) {
        const ni = currentEditIndex + 1; setCurrentEditIndex(ni); setEditingDuplicateQuestion(duplicateQuestions[ni].duplicate); setShowEditDuplicateModal(true);
      } else setShowDuplicateConfirmation(true);
    } else setShowDuplicateConfirmation(true);
  };

  const getEvalSettings = () => ({
    practiceMode: effectiveQConfig?.programmingQuestionConfiguration?.allowCodeExecution || false,
    manualEvaluation: { enabled: false }, aiEvaluation: false,
    automationEvaluation: effectiveQConfig?.programmingQuestionConfiguration?.enableTestCases || false,
  });

  // ── Filtering & Pagination ─────────────────────────────────────────────────
  const filteredQs = questions.filter(q => {
    const t = getTitle(q).toLowerCase(), d = getDesc(q).toLowerCase(), diff = getDiff(q);
    return (!searchTerm || t.includes(searchTerm.toLowerCase()) || d.includes(searchTerm.toLowerCase()))
      && (filterDifficulty === 'all' || diff === filterDifficulty)
      && (filterType === 'all' || q.questionType === filterType);
  });

  const itemsPerPage = autoItemsPerPage;
  const totalPages   = Math.max(1, Math.ceil(filteredQs.length / itemsPerPage));
  const safePage     = Math.min(currentPage, totalPages);
  const startIdx     = (safePage - 1) * itemsPerPage;
  const pagedQs      = filteredQs.slice(startIdx, startIdx + itemsPerPage);
  const showMcqCol   = hasMcqQs(filteredQs);

  // ── Exercise type ─────────────────────────────────────────────────────────
  const isCombined = exercise.exerciseType?.toLowerCase() === 'combined' || exercise.configurationType?.combinedMode === true;
  const isPureMCQ  = !isCombined && (exercise.exerciseType?.toLowerCase() === 'mcq' || (exercise.configurationType?.mcqMode === true && !exercise.configurationType?.programmingMode));
const isPureProg = !isCombined && (
  exercise.exerciseType?.toLowerCase() === 'programming' ||
  (exercise.configurationType?.programmingMode === true && !exercise.configurationType?.mcqMode)
);

const isPureOthers = !isCombined && exercise.exerciseType?.toLowerCase() === 'other';
  const isExerciseGraded = fullExData?.isGraded !== false;
  const progGenFull = isProgGeneralFull();
  const mcqDisabled = isMcqAddDisabled();
  const progSlot    = getProgSlotInfo();
  const progFull    = progSlot.total > 0 && progSlot.used >= progSlot.total;

const addBtnDisabled = isAddingQuestions || (() => {
  if (isCombined)    return mcqDisabled && progFull;
  if (isPureMCQ)     return mcqDisabled;
  if (isPureProg)    return progGenFull;
  if (isPureOthers)  return isOthersFull();
  return false;
})();
  const getMcqBannerText = (): string | null => {
    if (!mcqDisabled) return null;
    const mc = effectiveQConfig?.mcqQuestionConfiguration; if (!mc) return null;
    const st = mc.scoringType || 'equalDistribution';
    if (st === 'equalDistribution') { const t = mc.totalMcqQuestions || 0, u = questions.filter(q => q.questionType === 'mcq').length; return `All ${t} MCQ slots filled (${u}/${t}). Delete a question to add a new one.`; }
    if (st === 'questionSpecific')  { const t = mc.mcqTotalMarks || 0, u = questions.filter(q => q.questionType === 'mcq').reduce((s, q) => s + (q.mcqQuestionScore || 0), 0); return `All ${t} marks allocated (${u}/${t} used). Delete or reduce marks to add more.`; }
    return null;
  };

  // Combined banner pills
  const mcqCfg         = effectiveQConfig?.mcqQuestionConfiguration;
  const mcqScoringType = mcqCfg?.scoringType || 'equalDistribution';
  const mcqQsForBanner = questions.filter(q => q.questionType === 'mcq');
  const mcqTotal       = mcqScoringType === 'questionSpecific' ? mcqCfg?.mcqTotalMarks || 0 : mcqCfg?.totalMcqQuestions || 0;
  const mcqUsed        = mcqScoringType === 'questionSpecific' ? mcqQsForBanner.reduce((s, q) => s + (q.mcqQuestionScore || 0), 0) : mcqQsForBanner.length;
  const mcqUnit        = mcqScoringType === 'questionSpecific' ? 'marks' : 'questions';

  const getPageNums = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const p: (number | '...')[] = [];
    if (safePage <= 4) p.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (safePage >= totalPages - 3) p.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else p.push(1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages);
    return p;
  };

  // ─── Overlay backdrop helper ───────────────────────────────────────────────
  const Backdrop = ({ zIndex = 100 }: { zIndex?: number }) => (
    <div className="fixed inset-0" style={{ zIndex, background: 'rgba(26,26,46,0.45)', backdropFilter: 'blur(4px)' }} />
  );

  // ─── Add Question Option Modal (Updated for both MCQ and Programming) ─────────
  const AddQuestionOptions = () => (
    <>
      <Backdrop zIndex={100} />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          style={{ ...JKT, border: '1px solid #e4e4ed', pointerEvents: 'auto', boxShadow: '0 20px 60px rgba(26,26,46,0.18), 0 4px 16px rgba(242,119,87,0.08)' }}>

          {/* Header */}
          <div className="p-5 pb-4" style={{ borderBottom: '1px solid #e4e4ed' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                {breadcrumbs?.length > 0 && (
                  <div className="flex items-center flex-wrap gap-0.5 mb-2">
                    {breadcrumbs.map((c: any, i: number) => (
                      <span key={i} className="flex items-center gap-0.5">
                        {i > 0 && <span style={{ color: '#F27757' }} className="mx-1 text-sm">›</span>}
                        <span className="text-[11px] font-medium" style={{ color: c.type === 'subcategory' ? '#F27757' : '#6b6b7e' }}>{c.name}</span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(242,119,87,0.1)' }}>
                    <Plus size={13} style={{ color: '#F27757' }} />
                  </div>
                  <h2 className="text-[15px] font-bold" style={{ color: '#1a1a2e' }}>Add Question</h2>
                </div>
                <p className="text-[11px]" style={{ color: '#8b8b9e' }}>
                  {isPureMCQ ? 'Add MCQ to this exercise' : isPureProg ? 'Add Programming question to this exercise' : 'Choose how to add questions'}
                </p>
              </div>
              <button onClick={() => setShowAddOption(false)}
                style={{ cursor: 'pointer', color: '#bcbccc', padding: '4px', borderRadius: '8px', lineHeight: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#6b6b7e'; e.currentTarget.style.background = '#f5f5f8'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#bcbccc'; e.currentTarget.style.background = 'transparent'; }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Choices */}
          <div className="p-4 space-y-2.5">
            {/* Create New From Scratch */}
            <button onClick={() => { setShowAddOption(false); setShowAddQuestion(true); }}
              className="group w-full text-left rounded-xl p-4 transition-all"
              style={{ border: '1.5px solid #e4e4ed', cursor: 'pointer', background: '#fff' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#F27757'; e.currentTarget.style.background = 'rgba(242,119,87,0.03)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(242,119,87,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e4e4ed'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all" style={{ background: 'rgba(242,119,87,0.1)' }}>
                  <Plus size={18} style={{ color: '#F27757' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold" style={{ color: '#1a1a2e' }}>Create Question From Scratch</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#8b8b9e' }}>
                    {isPureProg ? 'Build a programming question from scratch' : 'Build from scratch with custom content'}
                  </div>
                </div>
                <ChevronRight size={15} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all" style={{ color: '#F27757' }} />
              </div>
            </button>

            {/* Question Bank - Show for both MCQ and Programming */}
            {(isPureMCQ || isPureProg || exercise.exerciseType !== 'mcq') && (
              <button onClick={() => { setQbankFromMCQOpts(true); setShowAddOption(false); setShowQuestionBank(true); }}
                className="group w-full text-left rounded-xl p-4 transition-all"
                style={{ border: '1.5px solid #e4e4ed', cursor: 'pointer', background: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#a855f7'; e.currentTarget.style.background = 'rgba(168,85,247,0.03)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(168,85,247,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e4e4ed'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.08)' }}>
                    <Database size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: '#1a1a2e' }}>Create Question From Question Bank</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#8b8b9e' }}>
                      {isPureProg ? 'Import programming questions from repository' : 'Import from existing question repository'}
                    </div>
                  </div>
                  <ChevronRight size={15} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all text-purple-400" />
                </div>
              </button>
            )}

            {/* Add via Document - Only for MCQ for now (can be extended to programming later) */}
            {isPureMCQ && (
              <button onClick={() => { setShowAddOption(false); setShowDocumentUpload(true); }}
                className="group w-full text-left rounded-xl p-4 transition-all"
                style={{ border: '1.5px solid #e4e4ed', cursor: 'pointer', background: '#fff' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891b2'; e.currentTarget.style.background = 'rgba(8,145,178,0.03)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(8,145,178,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e4e4ed'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(8,145,178,0.08)' }}>
                    <FileText size={18} style={{ color: '#0891b2' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: '#1a1a2e' }}>Create Question From Document</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#8b8b9e' }}>Bulk import from JSON · CSV · TXT</div>
                  </div>
                  <ChevronRight size={15} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all" style={{ color: '#0891b2' }} />
                </div>
              </button>
            )}
          </div>

          <div className="px-4 pb-4">
            <button onClick={() => setShowAddOption(false)}
              className="w-full py-2.5 rounded-xl text-[12px] font-medium transition-all"
              style={{ ...JKT, border: '1px solid #e4e4ed', color: '#6b6b7e', background: '#fafafa', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f8')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fafafa')}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ─── Duplicate Confirmation Dialog ────────────────────────────────────────
  const DuplicateConfirmationDialog = () => {
    if (!showDuplicateConfirmation) return null;
    return (
      <>
        <Backdrop zIndex={150} />
        <div className="fixed inset-0 z-[151] flex items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            style={{ ...JKT, border: '1px solid #e4e4ed', pointerEvents: 'auto', boxShadow: '0 20px 60px rgba(26,26,46,0.18)' }}>
            <div className="p-5 border-b border-amber-100 bg-amber-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-xl"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <h3 className="text-[13px] font-bold" style={{ color: '#1a1a2e' }}>Duplicate Questions Detected</h3>
                  <p className="text-[11px] mt-0.5" style={{ color: '#6b6b7e' }}>{duplicateQuestions.length} question(s) already exist</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {duplicateQuestions.length > 0 && (
                <div className="max-h-40 overflow-y-auto mb-4 rounded-xl divide-y" style={{ border: '1px solid #e4e4ed' }}>
                  {duplicateQuestions.map((item, i) => (
                    <div key={i} className="px-3 py-2.5">
                      <p className="text-[12px] font-semibold" style={{ color: '#1a1a2e' }}>#{i + 1} — {getTitle(item.duplicate)}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: '#bcbccc' }}>Matches: "{getTitle(item.original)}"</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl p-4 space-y-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <p className="text-[12px] font-semibold text-amber-800">What would you like to do?</p>
                {[
                  { val: 'addAll', label: 'Add All Anyway',  desc: `Add all ${duplicateQuestions.length + pendingBankQuestions.length} including duplicates` },
                  { val: 'skip',  label: 'Skip Duplicates',  desc: `Add only ${pendingBankQuestions.length} unique questions` },
                  { val: 'edit',  label: 'Edit Duplicates',  desc: 'Edit each duplicate before adding' },
                ].map(o => (
                  <label key={o.val} className="flex items-start gap-3" style={{ cursor: 'pointer' }}>
                    <input type="radio" name="dupAction" value={o.val} defaultChecked={o.val === 'skip'}
                      className="mt-1" style={{ accentColor: '#F27757', cursor: 'pointer' }} />
                    <div>
                      <span className="text-[12px] font-semibold text-amber-900">{o.label}</span>
                      <p className="text-[10px] text-amber-700">{o.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button disabled={isAddingQuestions}
                className="px-4 py-1.5 text-[12px] rounded-xl transition-all disabled:opacity-50"
                style={{ ...JKT, border: '1.5px solid #e4e4ed', color: '#6b6b7e', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { setShowDuplicateConfirmation(false); setDuplicateQuestions([]); setPendingBankQuestions([]); }}>
                Cancel
              </button>
              <button disabled={isAddingQuestions}
                className="px-4 py-1.5 text-[12px] font-semibold rounded-xl text-white flex items-center gap-1.5 disabled:opacity-70 transition-all"
                style={{ ...JKT, background: '#d97706', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#b45309')}
                onMouseLeave={e => (e.currentTarget.style.background = '#d97706')}
                onClick={() => { const el = document.querySelector('input[name="dupAction"]:checked') as HTMLInputElement; handleDupConfirm((el?.value || 'skip') as any); }}>
                {isAddingQuestions ? <><Loader className="h-3 w-3 animate-spin" />Processing…</> : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
  <div className="h-full flex flex-col overflow-hidden" style={{ ...JKT, background: '#ffffff', color: '#1a1a2e' }}>
  {/* Header - fixed height */}
<div className="flex-none flex items-center justify-between px-4 py-2.5 bg-white" style={{ borderBottom: '1px solid #e4e4ed' }}>
  <div className="flex items-center gap-2.5 min-w-0 flex-1">
    {/* Back */}
    <button onClick={onBack}
      className="h-7 w-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
      style={{ color: '#8b8b9e', cursor: 'pointer' }}
      title="Go back"
      onMouseEnter={e => { e.currentTarget.style.color = '#1a1a2e'; e.currentTarget.style.background = '#f5f5f8'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent'; }}>
      <ArrowLeft size={15} />
    </button>

    {/* Title + ID — single row */}
    <div className="flex items-center gap-3 min-w-0 flex-wrap">
      <span className="text-[11px] font-medium flex-shrink-0" style={{ color: '#8b8b9e', ...JKT }}>
        Id: <span style={{ color: '#1a1a2e', fontWeight: 600 }}>{exercise.exerciseInformation.exerciseId || exercise._id}</span>
      </span>
      <span style={{ color: '#d4d4de', flexShrink: 0 }}>·</span>
      <span className="text-[11px] font-medium flex-shrink-0" style={{ color: '#8b8b9e', ...JKT }}>
        Exercise name: <span style={{ color: '#1a1a2e', fontWeight: 600 }}>{exercise.exerciseInformation.exerciseName}</span>
      </span>
      <span style={{ color: '#d4d4de', flexShrink: 0 }}>·</span>
      <span className="text-[11px] font-medium flex-shrink-0" style={{ color: '#8b8b9e', ...JKT }}>
        Exercise type: <span style={{ color: '#1a1a2e', fontWeight: 600 }}>
          {isCombined ? 'Combined' : isPureMCQ ? 'MCQ' : isPureProg ? 'Programming' : isPureOthers ? 'Other' : (exercise.exerciseType || '')}
        </span>
      </span>
    </div>
  </div>

  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
    {/* Search */}
    <div className="relative">
      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#bcbccc' }} />
      <input placeholder="Search questions…" value={searchTerm}
        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        className="pl-7 pr-7 h-7 w-40 sm:w-52 text-[12px] rounded-lg outline-none transition-all"
        style={{ ...JKT, background: '#fafafa', border: '1.5px solid #e4e4ed', color: '#1a1a2e', cursor: 'text' }}
        onFocus={e => { e.currentTarget.style.borderColor = '#F27757'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(242,119,87,0.1)'; e.currentTarget.style.background = '#fff'; }}
        onBlur={e => { e.currentTarget.style.borderColor = '#e4e4ed'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#fafafa'; }} />
      {searchTerm && (
        <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
          style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#bcbccc', cursor: 'pointer', lineHeight: 0, border: 'none', background: 'none', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F27757')}
          onMouseLeave={e => (e.currentTarget.style.color = '#bcbccc')}
          title="Clear search">
          <X size={11} />
        </button>
      )}
    </div>

    <div className="h-4 w-px" style={{ background: '#e4e4ed' }} />

    {/* Refresh */}
    <button onClick={fetchQuestions} disabled={loadingQuestions || isAddingQuestions}
      title="Refresh questions"
      className="h-7 w-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
      style={{ color: '#8b8b9e', cursor: 'pointer' }}
      onMouseEnter={e => { if (!loadingQuestions) { e.currentTarget.style.color = '#F27757'; e.currentTarget.style.background = 'rgba(242,119,87,0.08)'; } }}
      onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent'; }}>
      <RefreshCw size={13} className={loadingQuestions ? 'animate-spin' : ''} style={{ color: loadingQuestions ? '#F27757' : undefined }} />
    </button>

    {/* Filter */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button title="Filter questions"
          className="h-7 w-7 rounded-lg flex items-center justify-center transition-all"
          style={{
            color: (filterDifficulty !== 'all' || filterType !== 'all') ? '#F27757' : '#8b8b9e',
            background: (filterDifficulty !== 'all' || filterType !== 'all') ? 'rgba(242,119,87,0.08)' : 'transparent',
            border: (filterDifficulty !== 'all' || filterType !== 'all') ? '1px solid rgba(242,119,87,0.2)' : '1px solid transparent',
            cursor: 'pointer',
          }}>
          <Filter size={13} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" style={{ ...JKT, border: '1px solid #e4e4ed', boxShadow: '0 8px 24px rgba(26,26,46,0.12)' }}>
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide" style={{ color: '#8b8b9e' }}>Difficulty</DropdownMenuLabel>
        {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
          <DropdownMenuItem key={d} className="text-xs" style={{ color: filterDifficulty === d ? '#F27757' : '#1a1a2e', fontWeight: filterDifficulty === d ? '600' : '400', cursor: 'pointer' }}
            onClick={() => { setFilterDifficulty(d); setCurrentPage(1); }}>
            {d === 'all' ? 'All Difficulties' : d.charAt(0).toUpperCase() + d.slice(1)}
            {filterDifficulty === d && <CheckCircle size={10} className="ml-auto" style={{ color: '#F27757' }} />}
          </DropdownMenuItem>
        ))}
        {isCombined && (
          <>
            <DropdownMenuSeparator style={{ background: '#e4e4ed' }} />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide" style={{ color: '#8b8b9e' }}>Type</DropdownMenuLabel>
            {(['all', 'mcq', 'programming', 'frontend', 'database'] as const).map(t => (
              <DropdownMenuItem key={t} className="text-xs" style={{ color: filterType === t ? '#F27757' : '#1a1a2e', fontWeight: filterType === t ? '600' : '400', cursor: 'pointer' }}
                onClick={() => { setFilterType(t); setCurrentPage(1); }}>
                {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
                {filterType === t && <CheckCircle size={10} className="ml-auto" style={{ color: '#F27757' }} />}
              </DropdownMenuItem>
            ))}
          </>
        )}
        {(filterDifficulty !== 'all' || filterType !== 'all') && (
          <>
            <DropdownMenuSeparator style={{ background: '#e4e4ed' }} />
            <DropdownMenuItem className="text-xs text-rose-500" style={{ cursor: 'pointer' }}
              onClick={() => { setFilterDifficulty('all'); setFilterType('all'); setCurrentPage(1); }}>
              <X size={11} className="mr-1.5" /> Clear Filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* ── Add Question button + Slot tooltip ── */}
    <div className="relative flex-shrink-0"
      onMouseEnter={() => { if (!isAddingQuestions) setShowSlotInfo(true); }}
      onMouseLeave={() => setShowSlotInfo(false)}>

      <button
        onClick={() => {
          if (addBtnDisabled) return;
          // For Combined exercise, always show the form directly
          if (isCombined) {
            setShowAddQuestion(true);
          } else {
            // For pure MCQ or pure Programming, show the options modal first
            setShowAddOption(true);
          }
        }}
        title={addBtnDisabled ? 'All slots are filled' : 'Add a new question'}
        className="h-7 px-3 text-[12px] font-semibold rounded-lg flex items-center gap-1 transition-all select-none"
        style={
          isAddingQuestions
            ? { ...JKT, background: '#f5f5f8', color: '#bcbccc', border: '1px solid #e4e4ed', cursor: 'not-allowed' }
            : addBtnDisabled
              ? { ...JKT, background: '#fffbeb', color: '#d97706', border: '1.5px solid #fde68a', cursor: 'not-allowed' }
              : { ...JKT, background: '#F27757', color: '#fff', boxShadow: '0 2px 8px rgba(242,119,87,0.3)', cursor: 'pointer' }
        }
        onMouseEnter={e => {
          if (!addBtnDisabled && !isAddingQuestions) {
            e.currentTarget.style.background = '#e0623f';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(242,119,87,0.4)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={e => {
          if (!addBtnDisabled && !isAddingQuestions) {
            e.currentTarget.style.background = '#F27757';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(242,119,87,0.3)';
            e.currentTarget.style.transform = 'none';
          }
        }}>
        {isAddingQuestions ? (
          <><Loader size={12} className="animate-spin" /><span className="hidden sm:inline">Adding…</span></>
        ) : addBtnDisabled ? (
          <><AlertTriangle size={13} /><span className="hidden sm:inline">Slot Full</span></>
        ) : (
          <><Plus size={13} strokeWidth={2.5} /><span className="hidden sm:inline">Add Question</span></>
        )}
      </button>

      {/* ── Slot tooltip (shown on hover always) ── */}
      {showSlotInfo && !isAddingQuestions && (
        <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-2xl overflow-hidden"
          style={{ ...JKT, border: addBtnDisabled ? '1px solid #fde68a' : '1px solid #e4e4ed', width: '240px', boxShadow: '0 12px 40px rgba(26,26,46,0.16)' }}>

          <div className="px-3 py-2 flex items-center gap-2"
            style={{ background: addBtnDisabled ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : 'linear-gradient(135deg,#f7f7fb,#f0f0f7)', borderBottom: addBtnDisabled ? '1px solid #fde68a' : '1px solid #e4e4ed' }}>
            {addBtnDisabled
              ? <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
              : <Plus size={13} style={{ color: '#F27757', flexShrink: 0 }} />}
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: addBtnDisabled ? '#92400e' : '#1a1a2e' }}>
              {addBtnDisabled ? 'Slots Full' : 'Question Quota'}
            </p>
          </div>

          <div className="p-3 space-y-3">
            {(isCombined || isPureMCQ) && (() => {
              const mc = effectiveQConfig?.mcqQuestionConfiguration;
              const st = mc?.scoringType || 'equalDistribution';
              const mqQs = questions.filter(q => q.questionType === 'mcq');
              const used = st === 'questionSpecific' ? mqQs.reduce((s, q) => s + (q.mcqQuestionScore || 0), 0) : mqQs.length;
              const total = st === 'questionSpecific' ? mc?.mcqTotalMarks || 0 : mc?.totalMcqQuestions || 0;
              const unit = st === 'questionSpecific' ? 'marks' : 'questions';
              const percentage = total > 0 ? (used / total) * 100 : 0;
              const isFull = total > 0 && used >= total;
              const scoringBadge = {
                label: st === 'questionSpecific' ? 'Question Specific' : 'Equal Distribution',
                color: st === 'questionSpecific' ? '#8b5cf6' : '#3b82f6',
                bg: st === 'questionSpecific' ? '#ede9fe' : '#eff6ff',
                border: st === 'questionSpecific' ? '#ddd6fe' : '#dbeafe',
              };
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold" style={{ color: '#1a1a2e' }}>MCQ</span>
                    <span className="text-[11px] font-medium" style={{ color: isFull ? '#ef4444' : '#6b6b7e' }}>{used}/{total} {unit}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: '#f0f0f5' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: isFull ? '#ef4444' : '#F27757' }} />
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: scoringBadge.bg, color: scoringBadge.color, border: `1px solid ${scoringBadge.border}`, fontWeight: 500 }}>
                    {scoringBadge.label}
                  </span>
                </div>
              );
            })()}

            {(isCombined || isPureProg) && (() => {
              const { used, total, byDifficulty } = getProgSlotInfo();
              const pc = effectiveQConfig?.programmingQuestionConfiguration;
              const configType = pc?.questionConfigType || 'general';
              const isFull = total > 0 && used >= total;
              const configBadge = configType === 'levelBased'
                ? { label: 'Level Based', color: '#8b5cf6', bg: '#ede9fe', border: '#ddd6fe' }
                : configType === 'selectionLevel'
                ? { label: 'Selection Level', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' }
                : { label: 'General', color: '#3b82f6', bg: '#eff6ff', border: '#dbeafe' };
              const diffColor: Record<string, { text: string; bar: string }> = {
                easy:   { text: '#16a34a', bar: '#4ade80' },
                medium: { text: '#d97706', bar: '#fbbf24' },
                hard:   { text: '#7c3aed', bar: '#a78bfa' },
              };
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold" style={{ color: '#1a1a2e' }}>Programming</span>
                    {total > 0
                      ? <span className="text-[11px] font-medium" style={{ color: isFull ? '#ef4444' : '#6b6b7e' }}>{used}/{total} questions</span>
                      : <span className="text-[11px]" style={{ color: '#8b8b9e' }}>{used} questions</span>}
                  </div>
                  {byDifficulty && Object.keys(byDifficulty).length > 0 ? (
                    <div className="space-y-1.5 mb-2">
                      {Object.entries(byDifficulty).map(([d, slot]) => {
                        const pct = slot.total > 0 ? (slot.used / slot.total) * 100 : 0;
                        const full = slot.total > 0 && slot.used >= slot.total;
                        return (
                          <div key={d}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] capitalize font-medium" style={{ color: (diffColor[d] ?? diffColor.medium).text }}>{d}</span>
                              <span className="text-[10px]" style={{ color: full ? '#ef4444' : '#6b6b7e' }}>{slot.used}/{slot.total}</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f0f0f5' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: full ? '#ef4444' : (diffColor[d] ?? diffColor.medium).bar }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : total > 0 ? (
                    <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: '#f0f0f5' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${total > 0 ? (used / total) * 100 : 0}%`, background: isFull ? '#ef4444' : '#3b82f6' }} />
                    </div>
                  ) : null}
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: configBadge.bg, color: configBadge.color, border: `1px solid ${configBadge.border}`, fontWeight: 500 }}>
                    {configBadge.label}
                  </span>
                </div>
              );
            })()}

  {isPureOthers  && (() => {
    const oc = effectiveQConfig?.othersQuestionConfiguration;
    const cfgType = oc?.questionConfigType || 'general';
    const othersQs = questions.filter(q => q.questionType === 'others');
    const used = othersQs.length;
    const total = cfgType === 'general'
      ? (oc?.generalQuestionCount || 0)
      : ((oc?.levelBasedCounts?.easy || 0) + (oc?.levelBasedCounts?.medium || 0) + (oc?.levelBasedCounts?.hard || 0))
        || ((oc?.selectionLevelCounts?.easy || 0) + (oc?.selectionLevelCounts?.medium || 0) + (oc?.selectionLevelCounts?.hard || 0));
    const isFull = total > 0 && used >= total;

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold" style={{ color: '#1a1a2e' }}>Others</span>
          {total > 0
            ? <span className="text-[11px] font-medium" style={{ color: isFull ? '#ef4444' : '#6b6b7e' }}>{used}/{total} questions</span>
            : <span className="text-[11px]" style={{ color: '#8b8b9e' }}>{used} questions</span>}
        </div>
        {total > 0 && (
          <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: '#f0f0f5' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (used / total) * 100)}%`, background: isFull ? '#ef4444' : '#16a34a' }} />
          </div>
        )}
      </div>
    );
  })()}

            <p className="text-[10px] pt-1 font-medium" style={{ color: addBtnDisabled ? '#d97706' : '#F27757', borderTop: '1px solid #f0f0f5' }}>
              {addBtnDisabled ? '⚠ Delete a question to free up a slot' : '→ Click to add question'}
            </p>
          </div>
        </div>
      )}
    </div>
    {/* ── /Add Question ── */}
  </div>
</div>
      {/* ══ Active filters bar ══ */}
      {(filterDifficulty !== 'all' || filterType !== 'all' || searchTerm) && (
        <div className="flex-none flex items-center gap-2 px-4 py-1.5"
          style={{ background: 'rgba(242,119,87,0.05)', borderBottom: '1px solid rgba(242,119,87,0.15)' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#F27757' }}>Filters:</span>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all"
              style={{ background: 'rgba(242,119,87,0.1)', color: '#F27757', border: '1px solid rgba(242,119,87,0.2)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(242,119,87,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(242,119,87,0.1)')}>
              "{searchTerm}" <X size={9} />
            </button>
          )}
          {filterDifficulty !== 'all' && (
            <button onClick={() => setFilterDifficulty('all')}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full capitalize transition-all"
              style={{ background: 'rgba(242,119,87,0.1)', color: '#F27757', border: '1px solid rgba(242,119,87,0.2)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(242,119,87,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(242,119,87,0.1)')}>
              {filterDifficulty} <X size={9} />
            </button>
          )}
          {filterType !== 'all' && (
            <button onClick={() => setFilterType('all')}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full capitalize transition-all"
              style={{ background: 'rgba(242,119,87,0.1)', color: '#F27757', border: '1px solid rgba(242,119,87,0.2)', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(242,119,87,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(242,119,87,0.1)')}>
              {filterType} <X size={9} />
            </button>
          )}
          <span className="text-[10px] ml-auto" style={{ color: '#F27757' }}>
            {filteredQs.length} result{filteredQs.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ══ Table area ══════════════════════════════════════════════════════ */}
<div ref={tableContainerRef} className="flex-1 min-h-0 bg-white overflow-auto">
        {loadingQuestions ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-4 rounded-full" style={{ borderColor: '#f5f5f8' }} />
              <div className="absolute inset-0 border-4 rounded-full animate-spin" style={{ borderColor: '#F27757', borderTopColor: 'transparent' }} />
            </div>
            <p className="text-[12px] font-medium" style={{ color: '#8b8b9e' }}>Loading questions…</p>
          </div>
        ) : pagedQs.length > 0 ? (
          <table className="w-full border-collapse text-sm table-fixed">
            {/* ── thead ── */}
            <thead>
              <tr style={{ background: '#fafbfc', borderBottom: '1px solid #eef0f4' }}>
                {[
                  { label: '#',          cls: 'w-10 pl-4 pr-2' },
                  { label: 'Question',   cls: 'w-[28%] px-3' },
                  ...(showMcqCol ? [{ label: 'Options', cls: 'w-[22%] px-3' }] : []),
                  ...((isCombined || isPureOthers) ? [{ label: 'Type', cls: 'w-20 px-3' }] : []),
                  { label: 'Difficulty', cls: 'w-20 px-3' },
                  ...(isExerciseGraded ? [{ label: 'Marks', cls: 'w-16 px-3 text-center' }] : []),
                  { label: 'Actions',    cls: 'w-14 px-3 text-center' },
                ].map(h => (
                  <th key={h.label}
                    className={`py-2.5 text-left select-none ${h.cls}`}
                    style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#64748B', ...JKT }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── tbody ── */}
            <tbody>
              {pagedQs.map((q, idx) => {
                const title     = getTitle(q);
                const desc      = getDesc(q);
                const diff      = getDiff(q);
                const score     = getScore(q);
                const isMcq     = q.questionType === 'mcq';
                const opts      = getOptDisplay(q);
                const rowNum    = startIdx + idx + 1;
                const isHovered = hoveredRow === q._id;
                const isEven    = idx % 2 === 1;

                return (
                  <tr key={q._id}
                    style={{
                      borderBottom: '1px solid #f0f0f5',
                      background: isHovered
                        ? 'linear-gradient(90deg, rgba(242,119,87,0.06) 0%, rgba(242,119,87,0.03) 100%)'
                        : '#ffffff',
                      transition: 'background 0.15s ease, box-shadow 0.15s ease',
                      boxShadow: isHovered ? 'inset 3px 0 0 #F27757' : 'none',
                      cursor: 'default',
                    }}
                    onMouseEnter={() => setHoveredRow(q._id)}
                    onMouseLeave={() => setHoveredRow(null)}>

                    {/* # */}
                    <td className="pl-4 pr-2 py-2.5 align-middle">
                      {rowNum === 1 && currentPage === 1 ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-mono font-bold" style={{ color: '#F27757' }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#F27757' }} />
                          {rowNum}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono" style={{ color: isHovered ? '#F27757' : '#bcbccc', transition: 'color 0.15s', fontWeight: isHovered ? '600' : '400' }}>
                          {rowNum}
                        </span>
                      )}
                    </td>

                    {/* Title + desc */}
                    <td className="px-3 py-2.5 align-middle min-w-0" style={{ cursor: 'default' }}>
                      <div className="flex flex-col justify-center">
                        <span className="text-[12px] font-semibold truncate block" title={stripHtml(title)}
                          style={{ color: isHovered ? '#e0623f' : '#1a1a2e', transition: 'color 0.15s' }}>
                          <span>{typeof title === 'string' ? title.replace(/<[^>]*>/g, '') : title}</span>
                        </span>
                        <span className="text-[10px] truncate block mt-0.5" style={{ color: '#8b8b9e' }}>
                          {stripHtml(desc)}
                        </span>
                      </div>
                    </td>

                    {/* MCQ options */}
                    {showMcqCol && (
                      <td className="px-3 py-2.5 align-middle">
                        {isMcq && opts.length > 0 ? (
                          <div className="flex items-center gap-1 overflow-hidden">
                            {opts.slice(0, 2).map((opt, i) => (
                              <span key={i}
                                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded shrink-0 max-w-[90px]"
                                style={q.mcqQuestionOptions?.[i]?.isCorrect
                                  ? { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }
                                  : { background: '#fafafa', border: '1px solid #e4e4ed', color: '#6b6b7e' }}>
                                <span className="font-mono font-bold w-3">{String.fromCharCode(65 + i)}.</span>
                                <span className="truncate">{opt}</span>
                              </span>
                            ))}
                            {opts.length > 2 && <span className="text-[9px] shrink-0" style={{ color: '#bcbccc' }}>+{opts.length - 2}</span>}
                          </div>
                        ) : isMcq ? (
                          <span className="text-[10px] italic" style={{ color: '#bcbccc' }}>No options</span>
                        ) : (
                          <span className="text-[10px]" style={{ color: '#e4e4ed' }}>—</span>
                        )}
                      </td>
                    )}

                    {(isCombined || isPureOthers) && (
                      <td className="px-3 py-2.5 align-middle"><TypeBadge type={q.questionType} /></td>
                    )}
                    <td className="px-3 py-2.5 align-middle"><DiffBadge level={diff} /></td>

                    {isExerciseGraded && (
                      <td className="px-3 py-2.5 align-middle text-center">
                        <span className="block text-center text-[11px] font-medium" style={{ color: score > 0 ? '#1a1a2e' : '#e4e4ed', ...JKT }}>
                          {score > 0 ? Math.round(score) : '—'}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-3 py-2.5 align-middle text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button title="More actions"
                            className="h-6 w-6 rounded-lg flex items-center justify-center transition-all"
                            style={{ color: isHovered ? '#F27757' : '#bcbccc', background: isHovered ? 'rgba(242,119,87,0.1)' : 'transparent', cursor: 'pointer', border: 'none' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#F27757'; e.currentTarget.style.background = 'rgba(242,119,87,0.12)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = isHovered ? '#F27757' : '#bcbccc'; e.currentTarget.style.background = isHovered ? 'rgba(242,119,87,0.1)' : 'transparent'; }}>
                            <MoreVertical size={13} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40"
                          style={{ ...JKT, border: '1px solid #e4e4ed', boxShadow: '0 8px 24px rgba(26,26,46,0.12)' }}>
                          <DropdownMenuItem className="text-xs gap-2" style={{ color: '#1a1a2e', cursor: 'pointer' }}
                            onClick={() => handleAction('edit', q)}>
                            <Edit3 className="h-3.5 w-3.5" style={{ color: '#F27757' }} /> Edit Question
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs gap-2" style={{ color: '#1a1a2e', cursor: 'pointer' }}
                            onClick={() => handleAction('preview', q)}>
                            <Eye className="h-3.5 w-3.5" style={{ color: '#8b8b9e' }} /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator style={{ background: '#e4e4ed' }} />
                          <DropdownMenuItem className="text-xs gap-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleAction('delete', q)}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* ── Empty state ── */
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="mb-4 p-5 rounded-2xl" style={{ background: 'rgba(242,119,87,0.06)', border: '1.5px dashed rgba(242,119,87,0.25)' }}>
              <Code2 size={32} style={{ color: 'rgba(242,119,87,0.4)' }} />
            </div>
            <h3 className="text-[14px] font-bold mb-1" style={{ color: '#1a1a2e' }}>
              {searchTerm || filterDifficulty !== 'all' || filterType !== 'all' ? 'No matching questions' : 'No questions yet'}
            </h3>
            <p className="text-[12px] mb-5 max-w-xs leading-relaxed" style={{ color: '#8b8b9e' }}>
              {searchTerm || filterDifficulty !== 'all' || filterType !== 'all'
                ? 'Try adjusting your search or clearing filters.'
                : 'Get started by adding your first question to this exercise.'}
            </p>
            {!addBtnDisabled && !searchTerm && filterDifficulty === 'all' && filterType === 'all' && (
              <button
                onClick={() => {
                  if (isCombined || !isPureMCQ) setShowAddQuestion(true);
                  else setShowAddOption(true);
                }}
                className="h-8 px-5 gap-1.5 text-white text-[12px] font-semibold rounded-xl flex items-center transition-all"
                style={{ ...JKT, background: '#F27757', boxShadow: '0 2px 8px rgba(242,119,87,0.3)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e0623f'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(242,119,87,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F27757'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(242,119,87,0.3)'; }}>
                <Plus size={14} /> Add First Question
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══ Pagination ══════════════════════════════════════════════════════ */}
      {filteredQs.length > 0 && (
        <div className="flex-none bg-white px-4 py-2 flex items-center justify-between" style={{ borderTop: '1px solid #e4e4ed' }}>
          <div className="text-[11px]" style={{ color: '#8b8b9e', ...JKT }}>
            Showing{' '}
            <span className="font-semibold" style={{ color: '#1a1a2e' }}>{startIdx + 1}</span>
            {' '}–{' '}
            <span className="font-semibold" style={{ color: '#1a1a2e' }}>{Math.min(startIdx + itemsPerPage, filteredQs.length)}</span>
            {' '}of{' '}
            <span className="font-semibold" style={{ color: '#1a1a2e' }}>{filteredQs.length}</span>
            {' '}questions
            {questions.length !== filteredQs.length && <span style={{ color: '#bcbccc' }}> (filtered from {questions.length})</span>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                title="Previous page"
                className="h-6 w-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                style={{ color: '#8b8b9e', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
                onMouseEnter={e => { if (safePage !== 1) { e.currentTarget.style.color = '#F27757'; e.currentTarget.style.background = 'rgba(242,119,87,0.08)'; } }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent'; }}>
                <ChevronLeft size={13} />
              </button>
              <div className="flex gap-0.5">
                {getPageNums().map((p, i) =>
                  p === '...' ? (
                    <span key={`e-${i}`} className="px-1 text-[11px] self-center" style={{ color: '#bcbccc' }}>…</span>
                  ) : (
                    <button key={p} onClick={() => setCurrentPage(p as number)}
                      title={`Page ${p}`}
                      className="h-6 w-6 rounded-md text-[11px] font-semibold transition-all"
                      style={safePage === p
                        ? { ...JKT, background: '#F27757', color: '#fff', boxShadow: '0 2px 6px rgba(242,119,87,0.35)', cursor: 'default' }
                        : { ...JKT, color: '#6b6b7e', cursor: 'pointer' }}
                      onMouseEnter={e => { if (safePage !== p) { e.currentTarget.style.background = 'rgba(242,119,87,0.08)'; e.currentTarget.style.color = '#F27757'; } }}
                      onMouseLeave={e => { if (safePage !== p) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b6b7e'; } }}>
                      {p}
                    </button>
                  )
                )}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                title="Next page"
                className="h-6 w-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                style={{ color: '#8b8b9e', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
                onMouseEnter={e => { if (safePage !== totalPages) { e.currentTarget.style.color = '#F27757'; e.currentTarget.style.background = 'rgba(242,119,87,0.08)'; } }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent'; }}>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ Modals ══ */}
      {showAddOption && <AddQuestionOptions />}

    {showQuestionBank && (
  <QuestionBankSelector
    exerciseData={{
      exerciseId: exercise._id,
      exerciseName: exercise.exerciseInformation.exerciseName,
      exerciseLevel: exercise.exerciseInformation.exerciseLevel || 'intermediate',
      nodeId, nodeName, subcategory, nodeType,
      fullExerciseData: exercise,
      exerciseType: exercise.exerciseType,
    }}
    tabType={tabType}
    onClose={() => { setShowQuestionBank(false); setQbankFromMCQOpts(false); }}
    onBack={qbankFromMCQOpts ? () => { setShowQuestionBank(false); setQbankFromMCQOpts(false); setShowAddOption(true); } : undefined}
    onSelect={handleBankSelect}
    existingQuestionIds={questions.map(q => q._id)}
    existingQuestions={questions}
    remainingQuestions={calcRemaining()}
    marksPerQuestion={calcMarksPerQ()}
    filterByType={isPureProg ? 'programming' : isPureMCQ ? 'mcq' : 'all'}
  />
)}

      {showAddQuestion && (
        <AddQuestionForm
          key={`add-${exercise._id}`}
          exerciseData={{
            exerciseId: exercise._id, _id: exercise._id, exerciseName: exercise.exerciseInformation.exerciseName,
            exerciseLevel: exercise.exerciseInformation.exerciseLevel || 'intermediate',
            selectedLanguages: exercise.programmingSettings?.selectedLanguages || [], evaluationSettings: getEvalSettings(),
            nodeId, nodeName, subcategory, nodeType,
            fullExerciseData: { ...exercise, ...(fullExData || {}), questions, hierarchyData },
            exerciseType: exercise.exerciseType, programmingSettings: exercise.programmingSettings, subcategoryLabel: subcategory,
          }}
          breadcrumbs={breadcrumbs} tabType={tabType}
          onClose={async () => { await Promise.all([fetchQuestions(), refreshFullExData()]); setShowAddQuestion(false); }}
          onSave={handleQuestionSaved} onOpenQuestionBank={() => { setShowAddQuestion(false); setShowQuestionBank(true); }}
          onOpenDocumentUpload={() => { setShowAddQuestion(false); setShowDocumentUpload(true); }}
          onMCQBankSelect={async (qs) => { setShowAddQuestion(false); await handleBankSelect(qs); }}
          showTypeSelector={isCombined} remainingQuestions={calcRemaining()} marksPerQuestion={calcMarksPerQ()}
          onEditExercise={async () => { await refreshFullExData(); setShowAddQuestion(false); if (onEditExercise) onEditExercise(exercise); }}
          shouldRefreshOnMount={true} />
      )}

{showEditQuestionModal && editingQuestion && (
  <AddQuestionForm
    key={`edit-${editingQuestion._id}`}
    exerciseData={{
      exerciseId: exercise._id,
      exerciseName: exercise.exerciseInformation.exerciseName,
      exerciseLevel: exercise.exerciseInformation.exerciseLevel || 'intermediate',
      selectedLanguages: exercise.programmingSettings?.selectedLanguages || [],
      evaluationSettings: getEvalSettings(),
      nodeId, nodeName, subcategory, nodeType,
      fullExerciseData: { ...exercise, ...(fullExData || {}), questions, hierarchyData },
      exerciseType: exercise.exerciseType,
      programmingSettings: exercise.programmingSettings,
      subcategoryLabel: subcategory,
    }}
    tabType={tabType}
    initialData={editingQuestion}
    isEditing={true}
    initialQuestionId={editingQuestion._id}
    onClose={async () => {
      await fetchQuestions();
      setShowEditQuestionModal(false);
      setEditingQuestion(null);
    }}
    onSave={handleQuestionSaved}
    onOpenQuestionBank={() => {
      setShowEditQuestionModal(false);
      setShowQuestionBank(true);
    }}
    onEditExercise={() => {
      setShowEditQuestionModal(false);
      setShowAddQuestion(false);
      if (onEditExercise) onEditExercise(exercise);
    }}
  />
)}
      {showEditDuplicateModal && editingDuplicateQuestion && (
        <AddQuestionForm
          exerciseData={{
            exerciseId: exercise._id, exerciseName: exercise.exerciseInformation.exerciseName,
            exerciseLevel: exercise.exerciseInformation.exerciseLevel || 'intermediate',
            selectedLanguages: exercise.programmingSettings?.selectedLanguages || [], evaluationSettings: getEvalSettings(),
            nodeId, nodeName, subcategory, nodeType,
            fullExerciseData: { ...exercise, ...(fullExData || {}), hierarchyData },
            exerciseType: exercise.exerciseType, programmingSettings: exercise.programmingSettings,
          }}
          breadcrumbs={breadcrumbs} tabType={tabType}
          onClose={handleEditDupComplete} onSave={handleQuestionSaved}
          initialData={editingDuplicateQuestion} isEditing={true}
          onOpenQuestionBank={() => { setShowEditDuplicateModal(false); setShowQuestionBank(true); }} />
      )}


{showDocumentUpload && (
  <AddQuestionViaDocument
    exerciseData={{
      exerciseId:      exercise._id,
      exerciseName:    exercise.exerciseInformation.exerciseName,
      exerciseLevel:   exercise.exerciseInformation.exerciseLevel || 'intermediate',
      nodeId,
      nodeName,
      nodeType,
      subcategory,
      fullExerciseData: exercise,
    }}
    tabType={tabType}
    breadcrumbs={breadcrumbs}
    onClose={() => setShowDocumentUpload(false)}
    onInserted={async (count) => {
      await fetchQuestions();
      toast.success(`${count} question${count !== 1 ? 's' : ''} added via document`);
    }}
  />
)}



      <DuplicateConfirmationDialog />

      {previewQuestion && (
        <QuestionPreview question={previewQuestion} allQuestions={filteredQs}
          onClose={() => setPreviewQuestion(null)} onNavigate={q => setPreviewQuestion(q)} />
      )}

      {/* ── Delete Modal ── */}
      {showDeleteQuestionModal && questionToDelete && (
        <>
          <Backdrop zIndex={60} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4" style={{ pointerEvents: 'none' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              style={{ ...JKT, border: '1px solid #e4e4ed', pointerEvents: 'auto', boxShadow: '0 20px 60px rgba(26,26,46,0.18)' }}>
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid #fee2e2', background: 'linear-gradient(135deg,#fff5f5,#fff)' }}>
                <div className="p-2 bg-red-100 rounded-xl"><Trash2 className="h-4 w-4 text-red-600" /></div>
                <div>
                  <h3 className="text-[13px] font-bold" style={{ color: '#1a1a2e' }}>Delete Question</h3>
                  <p className="text-[11px]" style={{ color: '#8b8b9e' }}>This action cannot be undone</p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[12px] mb-3" style={{ color: '#6b6b7e' }}>Are you sure you want to permanently delete this question?</p>
                <div className="p-3 rounded-xl" style={{ background: '#fafafa', border: '1px solid #e4e4ed' }}>
                  <p className="text-[12px] font-semibold truncate" style={{ color: '#1a1a2e' }}>"{getTitle(questionToDelete)}"</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <TypeBadge type={questionToDelete.questionType} />
                    <DiffBadge level={getDiff(questionToDelete)} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button onClick={() => { setShowDeleteQuestionModal(false); setQuestionToDelete(null); }}
                  disabled={deletingQuestion}
                  className="flex-1 py-2 text-[12px] rounded-xl transition-all disabled:opacity-50"
                  style={{ ...JKT, border: '1.5px solid #e4e4ed', color: '#6b6b7e', background: '#fff', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d0d0de'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e4e4ed'; }}>
                  Cancel
                </button>
                <button onClick={handleDeleteConfirm} disabled={deletingQuestion}
                  className="flex-1 py-2 text-[12px] font-semibold text-white rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-70 transition-all"
                  style={{ ...JKT, background: '#ef4444', cursor: deletingQuestion ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (!deletingQuestion) e.currentTarget.style.background = '#dc2626'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; }}>
                  {deletingQuestion ? <><Loader className="h-3 w-3 animate-spin" />Deleting…</> : <><Trash2 className="h-3 w-3" />Delete Question</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {showProgrammingForm && selectedProgrammingQuestion && (
  <ProgrammingQuestionForm
    exerciseData={{
      exerciseId: exercise._id,
      exerciseName: exercise.exerciseInformation.exerciseName,
      exerciseLevel: exercise.exerciseInformation.exerciseLevel || 'intermediate',
      nodeId,
      nodeName,
      subcategory,
      nodeType,
      fullExerciseData: exercise,
      exerciseType: exercise.exerciseType,
      programmingSettings: exercise.programmingSettings,
    }}
    tabType={tabType}
    initialData={selectedProgrammingQuestion}
    isEditing={false}
    onClose={() => {
      setShowProgrammingForm(false);
      setSelectedProgrammingQuestion(null);
    }}
    onSave={async (savedData) => {
      await fetchQuestions();
      setShowProgrammingForm(false);
      setSelectedProgrammingQuestion(null);
      toast.success('Programming question added successfully!');
      return savedData;
    }}
    isSaving={false}
    saveProgress={0}
    saveMessage=""
    onEditExercise={onEditExercise}
    sectionData={null}
  />
)}
    </div>
  );
};

export default Questions;