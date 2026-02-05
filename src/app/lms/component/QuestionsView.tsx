import React, { useState, useEffect } from 'react';
import {
  Plus, RefreshCw, Edit, Trash2, ChevronLeft, ChevronRight, MoreHorizontal,
  ArrowLeft, Eye, PlayCircle, Settings, Star,
  CheckCircle, XCircle, Search, Filter, Code2, Clock,
  MoreVertical, Edit3, FileText,
  AlertCircle,
  Loader,
  Sparkles
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Interfaces ---
// Updated Exercise interface to match backend structure
interface Exercise {
  _id: string;
  exerciseType: 'MCQ' | 'Programming' | 'Combined';
  configurationType: {
    mcqMode: boolean;
    programmingMode: boolean;
    combinedMode: boolean;
  };
  exerciseInformation: {
    exerciseName: string;
    exerciseId: string;
    description?: string;
    exerciseLevel: 'beginner' | 'intermediate' | 'expert';
    totalDuration: number;
  };
  programmingSettings?: {
    selectedModule?: string;
    selectedLanguages?: string[];
  };
  questionConfiguration: {
    mcqQuestionConfiguration?: {
      totalMcqQuestions: number;
      marksPerQuestion: number;
      mcqTotalMarks: number;
      attemptLimitEnabled: boolean;
      submissionAttempts: number;
      shuffleQuestions: boolean;
    };
    programmingQuestionConfiguration?: {
      questionConfigType: 'general' | 'levelBased' | 'selectionLevel';
      generalQuestionCount?: number;
      levelBasedCounts?: {
        easy: number;
        medium: number;
        hard: number;
      };
      selectionLevelCounts?: {
        easy: number;
        medium: number;
        hard: number;
      };
      scoreSettings: {
        scoreType: 'evenMarks' | 'separateMarks' | 'levelBasedMarks';
        evenMarks: number;
        separateMarks: {
          general: number[];
          levelBased: {
            easy: number[];
            medium: number[];
            hard: number[];
          };
        };
        levelBasedMarks: {
          easy: number;
          medium: number;
          hard: number;
        };
        totalMarks: number;
      };
      attemptLimitEnabled: boolean;
      submissionAttempts: number;
      questionFlow: 'freeFlow' | 'controlled';
      allowCodeExecution: boolean;
      enableTestCases: boolean;
      showSampleCases: boolean;
    };
  };
  availabilityPeriod?: {
    startDate: string;
    endDate: string;
    gracePeriodAllowed: boolean;
    gracePeriodDate?: string;
    extendedDays: number;
    status?: string;
  };
  notificatonandGradeSettings?: {
    notifyUsers: boolean;
    notifyGmail: boolean;
    notifyWhatsApp: boolean;
    gradeSheet: boolean;
  };
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version: number;
}

// UPDATE: Enhanced Question interface to handle both MCQ and Programming types
export interface Question {
  _id: string;
  questionType: 'mcq' | 'programming' | 'frontend' | 'database'; // Add questionType
  // MCQ specific fields
  questionTitle?: string; // For MCQ questions
  options?: string[]; // For MCQ questions
  correctAnswer?: string; // For MCQ questions
  // Programming/Frontend/Database specific fields
  title?: string; // For programming questions (same as questionTitle for display)
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number;
  score?: number; // Alternative field name
  sampleInput?: string;
  sampleOutput?: string;
  constraints?: string[];
  hints?: Array<{
    hintText: string;
    pointsDeduction: number;
    isPublic: boolean;
    sequence: number;
  }>;
  testCases?: Array<any>;
  databaseTestCases?: Array<{
    name: string;
    description: string;
    schemaSetup: string;
    initialData: string;
    expectedQuery: string;
    expectedResult: string;
    isSample: boolean;
    isHidden: boolean;
    points: number;
    sequence: number;
  }>;
  solutions?: {
    startedCode: string;
    functionName: string;
    language: string;
  };
  timeLimit?: number;
  memoryLimit?: number;
  isActive: boolean;
  sequence: number;
  createdAt?: string;
  updatedAt?: string;
  moduleType?: string;
  isFrontend?: boolean;
  isDatabase?: boolean;
  isProgramming?: boolean;
  browserDatabaseConfig?: {
    databaseName: string;
    tables: number;
    storageType: string;
  };
  databaseType?: string;
  metadata?: {
    submittedAt: string;
    submissionId: string;
    tabType: string;
    nodeType: string;
    nodeId: string;
    exerciseId: string;
  };
  questionNumber?: number; // Added for display purposes
}

interface QuestionsProps {

  exercise: Exercise;
  nodeId: string;
  nodeName: string;
  subcategory: string;
  nodeType: string;
  onBack: () => void;
  tabType: string;
}

const API_BASE_URL = 'http://localhost:5533';

const Questions: React.FC<QuestionsProps> = ({ hierarchyData, exercise, nodeId, nodeName, subcategory, nodeType, tabType, onBack }) => {
  // --- State ---
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Edit/Delete States
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
  const [showDeleteQuestionModal, setShowDeleteQuestionModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);

  // --- Effects ---
  useEffect(() => {
    fetchQuestions();
  }, [exercise._id, includeInactive]);

  useEffect(() => {
    return () => {
      setEditingQuestion(null);
      setShowEditQuestionModal(false);
    };
  }, []);

  useEffect(() => {
    setEditingQuestion(null);
    setShowEditQuestionModal(false);
    setQuestionToDelete(null);
    setShowDeleteQuestionModal(false);
  }, [exercise._id]);

  // Get breadcrumbs from hierarchy data
  const getBreadcrumbs = () => {
    const crumbs = [];
    if (hierarchyData.courseName) {
      crumbs.push({
        name: hierarchyData.courseName,
        type: 'course'
      });
    }
    if (hierarchyData.moduleName) {
      crumbs.push({
        name: hierarchyData.moduleName,
        type: 'module'
      });
    }
    if (hierarchyData.submoduleName) {
      crumbs.push({
        name: hierarchyData.submoduleName,
        type: 'submodule'
      });
    }
    if (hierarchyData.topicName) {
      crumbs.push({
        name: hierarchyData.topicName,
        type: 'topic'
      });
    }
    if (hierarchyData.subtopicName) {
      crumbs.push({
        name: hierarchyData.subtopicName,
        type: 'subtopic'
      });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  useEffect(() => {
    console.log(breadcrumbs);
  }, [breadcrumbs]);


  // --- Helper Functions ---
  // Get display title based on question type
  const getQuestionDisplayTitle = (question: Question): string => {
    if (question.questionType === 'mcq' && question.questionTitle) {
      return question.questionTitle;
    }
    return question.title || question.questionTitle || 'Untitled Question';
  };

  // Get display description based on question type
  const getQuestionDisplayDescription = (question: Question): string => {
    if (question.questionType === 'mcq') {
      return 'Multiple Choice Question';
    }
    if (question.description) {
      // Remove HTML tags for clean display
      return question.description.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
    }
    return 'No description provided';
  };

  // Get question type badge
  const getQuestionTypeBadge = (question: Question) => {
    const type = question.questionType || 'programming';
    const config: Record<string, { label: string, color: string, bgColor: string, borderColor: string }> = {
      mcq: {
        label: 'MCQ',
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      },
      programming: {
        label: 'Coding',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      },
      frontend: {
        label: 'Frontend',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      },
      database: {
        label: 'Database',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200'
      }
    };

    const style = config[type] || config.programming;
    return (
      <Badge
        variant="outline"
        className={`text-[10px] font-medium px-1.5 py-0.5 ${style.color} ${style.bgColor} ${style.borderColor}`}
      >
        {style.label}
      </Badge>
    );
  };

  // Get difficulty badge
  const DifficultyBadge = ({ level, questionType }: { level?: string, questionType?: string }) => {
    if (!level || questionType === 'mcq') {
      // For MCQ questions or questions without difficulty, show N/A
      return (
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-bold px-1.5 py-0.5 border border-slate-200 bg-slate-50 text-slate-500"
        >
          N/A
        </Badge>
      );
    }

    const colors: Record<string, { bg: string; text: string; border: string }> = {
      easy: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200'
      },
      medium: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200'
      },
      hard: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200'
      },
    };

    const style = colors[level] || colors.medium;

    return (
      <Badge
        variant="outline"
        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 border ${style.bg} ${style.text} ${style.border}`}
      >
        {level}
      </Badge>
    );
  };

  // Get points/score for display
  const getQuestionPoints = (question: Question): number => {
    return question.points || question.score || 0;
  };

  // Get configuration details for display
  const getQuestionConfiguration = (question: Question) => {
    const type = question.questionType || 'programming';

    if (type === 'mcq') {
      return {
        label: 'Multiple Choice',
        details: `${question.options?.length || 0} options`,
        icon: FileText
      };
    }

    if (type === 'programming' || type === 'frontend' || type === 'database') {
      return {
        label: 'Coding Problem',
        details: `${question.testCases?.length || 0} test cases`,
        icon: Code2
      };
    }

    return {
      label: 'Question',
      details: '',
      icon: FileText
    };
  };

  // --- API Handlers ---
  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const queryParams = new URLSearchParams();
      if (includeInactive) queryParams.append('includeInactive', 'true');

      const getPluralNodeType = (nodeType: string): string => {
        const mapping: Record<string, string> = { 'module': 'modules', 'submodule': 'submodules', 'topic': 'topics', 'subtopic': 'subtopics' };
        return mapping[nodeType.toLowerCase()] || nodeType;
      };

      const pluralNodeType = getPluralNodeType(nodeType);
      const response = await fetch(`${API_BASE_URL}/questions-get/${pluralNodeType}/${nodeId}/${exercise._id}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('smartcliff_token')}`
        }
      });

      if (!response.ok) throw new Error(`Failed to fetch questions: ${response.status}`);

      const result = await response.json();

      // Handle different response structures
      let fetchedQuestions: Question[] = [];

      if (result.data && result.data.questions) {
        // If response has data.questions array
        fetchedQuestions = result.data.questions.map((q: Question, index: number) => ({
          ...q,
          questionNumber: (q.sequence || index + 1)
        }));
      } else if (result.data && Array.isArray(result.data)) {
        // If response.data is directly an array
        fetchedQuestions = result.data.map((q: Question, index: number) => ({
          ...q,
          questionNumber: (q.sequence || index + 1)
        }));
      } else if (result.questions && Array.isArray(result.questions)) {
        // If response has root-level questions array
        fetchedQuestions = result.questions.map((q: Question, index: number) => ({
          ...q,
          questionNumber: (q.sequence || index + 1)
        }));
      } else if (exercise.questions && Array.isArray(exercise.questions)) {
        // Fallback to exercise.questions if API fails
        fetchedQuestions = exercise.questions.map((q: Question, index: number) => ({
          ...q,
          questionNumber: (q.sequence || index + 1)
        }));
      }

      console.log('📦 Fetched questions:', fetchedQuestions.length, fetchedQuestions);

      setQuestions(fetchedQuestions);
      setPagination(prev => ({
        ...prev,
        totalItems: fetchedQuestions.length,
        totalPages: Math.ceil(fetchedQuestions.length / prev.itemsPerPage),
        currentPage: 1
      }));
    } catch (error) {
      console.error('❌ Error fetching questions:', error);

      // Fallback to exercise.questions if available
      if (exercise.questions && Array.isArray(exercise.questions)) {
        const fallbackQuestions = exercise.questions.map((q: Question, index: number) => ({
          ...q,
          questionNumber: (q.sequence || index + 1)
        }));
        setQuestions(fallbackQuestions);
        setPagination(prev => ({
          ...prev,
          totalItems: fallbackQuestions.length,
          totalPages: Math.ceil(fallbackQuestions.length / prev.itemsPerPage),
          currentPage: 1
        }));
      } else {
        setQuestions([]);
      }

      toast.error('Failed to load questions. Please try again.', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAction = async (actionType: string, question: Question) => {
    if (actionType === 'edit') {
      try {
        await fetchQuestions();
        const refreshedQuestion = questions.find(q => q._id === question._id);

        if (refreshedQuestion) {
          setEditingQuestion(refreshedQuestion);
          setShowEditQuestionModal(true);
        } else {
          console.warn('Question not found in refreshed list, using cached version');
          setEditingQuestion(question);
          setShowEditQuestionModal(true);
        }
      } catch (error) {
        console.error('Error refreshing questions:', error);
        setEditingQuestion(question);
        setShowEditQuestionModal(true);
      }
    } else if (actionType === 'delete') {
      setQuestionToDelete(question);
      setShowDeleteQuestionModal(true);
    } else if (actionType === 'preview') {
      toast.info('Preview functionality coming soon', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleDeleteQuestionConfirm = async () => {
    if (!questionToDelete) return;

    setDeletingQuestion(true);

    try {
      const getPluralNodeType = (nodeType: string): string => {
        const mapping: Record<string, string> = {
          'module': 'modules',
          'submodule': 'submodules',
          'topic': 'topics',
          'subtopic': 'subtopics'
        };
        return mapping[nodeType.toLowerCase()] || nodeType;
      };

      const pluralNodeType = getPluralNodeType(nodeType);

      console.log('🗑️ Deleting question with:', {
        entityType: pluralNodeType,
        entityId: nodeId,
        exerciseId: exercise._id,
        questionId: questionToDelete._id,
        tabType,
        subcategory
      });

      await questionApi.deleteQuestion(
        pluralNodeType as 'modules' | 'submodules' | 'topics' | 'subtopics',
        nodeId,
        exercise._id,
        questionToDelete._id,
        tabType,
        subcategory
      );

      toast.success(`Question "${getQuestionDisplayTitle(questionToDelete)}" deleted successfully!`, {
        position: "top-right",
        autoClose: 3000,
      });

      setQuestions(prev => prev.filter(q => q._id !== questionToDelete._id));

      setPagination(prev => ({
        ...prev,
        totalItems: prev.totalItems - 1,
        totalPages: Math.ceil((prev.totalItems - 1) / prev.itemsPerPage),
        currentPage: prev.currentPage > Math.ceil((prev.totalItems - 1) / prev.itemsPerPage)
          ? Math.max(1, prev.currentPage - 1)
          : prev.currentPage
      }));

      setShowDeleteQuestionModal(false);
      setQuestionToDelete(null);

    } catch (error) {
      console.error('❌ Error deleting question:', error);

      toast.error(
        `Failed to delete question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          position: "top-right",
          autoClose: 4000,
        }
      );

      setShowDeleteQuestionModal(false);
      setQuestionToDelete(null);

    } finally {
      setDeletingQuestion(false);
    }
  };

  const handleQuestionSaved = (savedQuestion: any) => {
    console.log('💾 Question saved/updated:', {
      savedQuestionId: savedQuestion._id,
      editingQuestionId: editingQuestion?._id,
      isEditing: !!editingQuestion
    });

    if (editingQuestion && savedQuestion._id) {
      setQuestions(prev => prev.map(q =>
        q._id === editingQuestion._id ? { ...q, ...savedQuestion, _id: savedQuestion._id } : q
      ));

      toast.success('Question updated successfully!', {
        position: "top-right",
        autoClose: 3000,
      });

      setShowEditQuestionModal(false);
      setEditingQuestion(null);
    } else {
      fetchQuestions();

      toast.success('Question created successfully!', {
        position: "top-right",
        autoClose: 3000,
      });

      setShowAddQuestion(false);
    }
  };

  // --- Filtering & Pagination Logic ---
  const getFilteredQuestions = () => {
    return questions.filter(question => {
      const displayTitle = getQuestionDisplayTitle(question);
      const displayDesc = getQuestionDisplayDescription(question);

      const matchesSearch = searchTerm === '' ||
        displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayDesc.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && question.isActive) ||
        (filterStatus === 'draft' && !question.isActive);

      const matchesDifficulty = filterDifficulty === 'all' ||
        (question.difficulty === filterDifficulty) ||
        (filterDifficulty !== 'all' && !question.difficulty && filterDifficulty === 'easy'); // Default for MCQ

      return matchesSearch && matchesStatus && matchesDifficulty;
    });
  };

  const getPaginatedQuestions = () => {
    const filteredQuestions = getFilteredQuestions();
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;

    if (startIndex >= filteredQuestions.length && pagination.currentPage > 1) {
      return filteredQuestions.slice(0, pagination.itemsPerPage);
    }
    return filteredQuestions.slice(startIndex, endIndex);
  };

  const displayedQuestions = getPaginatedQuestions();
  const totalFilteredItems = getFilteredQuestions().length;

  // Get evaluation settings from exercise
  const getEvaluationSettings = () => {
    return {
      practiceMode: exercise.questionConfiguration?.programmingQuestionConfiguration?.allowCodeExecution || false,
      manualEvaluation: { enabled: false }, // Default for now
      aiEvaluation: false,
      automationEvaluation: exercise.questionConfiguration?.programmingQuestionConfiguration?.enableTestCases || false
    };
  };

  // --- Render ---
  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* SECTION 1: UNIFIED HEADER */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-slate-100">
        {/* Left: Title & Context */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={16} />
          </Button>

          <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-50 rounded-lg border border-blue-100">
            <Code2 size={16} className="text-blue-600" />
          </div>

          <div className="min-w-0 flex flex-col">
            <h1 className="text-sm font-semibold text-slate-900 leading-none truncate">
              {exercise.exerciseInformation.exerciseName}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 leading-none truncate">
              <span className="font-medium text-slate-600">Questions Manager</span>
              <span className="text-slate-300">•</span>
              <span>{totalFilteredItems} Items</span>
              <span className="text-slate-300">•</span>
              <span className="capitalize">{exercise.exerciseType}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions Toolbar */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {/* Search Input */}
          <div className="relative group">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
            />
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPagination(p => ({ ...p, currentPage: 1 })); }}
              className="pl-8 pr-3 h-8 w-40 sm:w-56 text-xs bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg transition-all"
            />
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchQuestions}
            disabled={loadingQuestions}
            className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw
              size={14}
              className={loadingQuestions ? 'animate-spin text-blue-600' : ''}
            />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-lg">
                <Filter size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter By Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('active')}>Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('draft')}>Draft</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter By Difficulty</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setFilterDifficulty('all')}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterDifficulty('easy')}>Easy</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterDifficulty('medium')}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterDifficulty('hard')}>Hard</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter By Type</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => { /* Implement type filter */ }}>MCQ</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { /* Implement type filter */ }}>Programming</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => setShowAddQuestion(true)}
            className="h-8 px-3 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 rounded-lg shadow-sm shadow-blue-600/20 transition-all hover:shadow-md hover:shadow-blue-600/20"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Question</span>
          </Button>


        </div>
      </div>

      {/* SECTION 2: SCROLLABLE TABLE AREA */}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent bg-white">
        <table className="relative w-full border-collapse text-sm caption-bottom">
          <TableHeader>
            <TableRow className="border-b border-slate-200 h-9 hover:bg-slate-50">
              <TableHead className="sticky top-0 z-10 bg-slate-50 px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap w-[60px] shadow-[0_1px_0_rgba(226,232,240,1)]">
                Seq
              </TableHead>
              <TableHead className="sticky top-0 z-10 bg-slate-50 px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap w-[40%] shadow-[0_1px_0_rgba(226,232,240,1)]">
                Question Details
              </TableHead>
              <TableHead className="sticky top-0 z-10 bg-slate-50 px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap shadow-[0_1px_0_rgba(226,232,240,1)]">
                Configuration
              </TableHead>
              <TableHead className="sticky top-0 z-10 bg-slate-50 px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap shadow-[0_1px_0_rgba(226,232,240,1)]">
                Status
              </TableHead>
              <TableHead className="sticky top-0 z-10 bg-slate-50 px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 whitespace-nowrap text-center shadow-[0_1px_0_rgba(226,232,240,1)]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingQuestions ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`} className="border-b border-slate-50 h-11">
                  <TableCell className="px-4 py-2"><div className="h-2.5 bg-slate-100 rounded-full w-6 animate-pulse" /></TableCell>
                  <TableCell className="px-4 py-2"><div className="h-2.5 bg-slate-100 rounded-full w-48 animate-pulse mb-1" /><div className="h-2 bg-slate-50 rounded-full w-32 animate-pulse" /></TableCell>
                  <TableCell className="px-4 py-2"><div className="h-2.5 bg-slate-100 rounded-full w-20 animate-pulse" /></TableCell>
                  <TableCell className="px-4 py-2"><div className="h-2.5 bg-slate-100 rounded-full w-16 animate-pulse" /></TableCell>
                  <TableCell className="px-4 py-2"><div className="h-5 w-5 bg-slate-100 rounded animate-pulse mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : displayedQuestions.length > 0 ? (
              displayedQuestions.map((question, index) => {
                const displayTitle = getQuestionDisplayTitle(question);
                const displayDescription = getQuestionDisplayDescription(question);
                const questionTypeBadge = getQuestionTypeBadge(question);
                const config = getQuestionConfiguration(question);
                const points = getQuestionPoints(question);

                return (
                  <TableRow
                    key={question._id}
                    className="group border-b border-slate-50 hover:bg-blue-50/30 transition-colors duration-150 h-16 last:border-0"
                  >
                    <TableCell className="px-4 py-2 text-[13px] text-slate-700 align-top pt-3">
                      <span className="font-mono text-slate-400">#{question.questionNumber || index + 1}</span>
                    </TableCell>
                    <TableCell className="px-4 py-2 align-top pt-3">
                      <div className="flex flex-col gap-1 max-w-[250px] sm:max-w-[350px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          {questionTypeBadge}
                          <span
                            className="text-[13px] font-medium text-slate-900 line-clamp-1 truncate"
                            title={displayTitle}
                          >
                            {displayTitle}
                          </span>
                          <DifficultyBadge level={question.difficulty} questionType={question.questionType} />
                          {points > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1 h-5 text-slate-500 bg-slate-100 flex-shrink-0">
                              {points} pts
                            </Badge>
                          )}
                        </div>

                        <p
                          className="text-[11px] text-slate-500 line-clamp-1 truncate"
                          title={displayDescription}
                        >
                          {displayDescription}
                        </p>

                        {/* Show MCQ options count if available */}
                        {question.questionType === 'mcq' && question.options && question.options.length > 0 && (
                          <p className="text-[10px] text-slate-400">
                            {question.options.length} options • Correct: {question.correctAnswer?.substring(0, 20) || 'Not set'}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-2 align-top pt-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 px-1.5 py-0">
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                          {config.details && <span className="flex items-center gap-1"><config.icon size={10} /> {config.details}</span>}
                          {question.timeLimit && <span className="flex items-center gap-1"><Clock size={10} /> {question.timeLimit}ms</span>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-2 align-top pt-3">
                      <div className="flex items-center gap-1.5">
                        {question.isActive ? <CheckCircle size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-slate-300" />}
                        <span className={`text-[12px] font-medium ${question.isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                          {question.isActive ? 'Active' : 'Draft'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 pl-4">
                        {question.updatedAt ? new Date(question.updatedAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-2 align-top pt-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => handleAction('edit', question)}
                            className="text-xs cursor-pointer"
                          >
                            <Edit3 className="mr-2 h-3 w-3" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAction('preview', question)}
                            className="text-xs cursor-pointer"
                          >
                            <Eye className="mr-2 h-3 w-3" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleAction('delete', question)}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-[400px]">
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="mb-4 p-4 bg-slate-50 rounded-full border border-slate-100 shadow-sm">
                      <Code2 size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">No questions found</h3>
                    <p className="text-[13px] text-slate-500 mb-6 max-w-xs mx-auto">
                      {searchTerm ? 'Try adjusting your search filters.' : 'Get started by adding questions to this exercise.'}
                    </p>
                    <Button
                      onClick={() => setShowAddQuestion(true)}
                      size="sm"
                      className="h-8 px-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs font-medium rounded-lg"
                    >
                      <Plus size={14} /> Add First Question
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>

      {/* SECTION 3: FOOTER PAGINATION */}
      {totalFilteredItems > 0 && (
        <div className="flex-none bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-between z-10">
          <div className="text-[12px] font-medium text-slate-500">
            Showing <span className="text-slate-900 font-semibold">{((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}</span> -{' '}
            <span className="text-slate-900 font-semibold">{Math.min(pagination.currentPage * pagination.itemsPerPage, totalFilteredItems)}</span> of{' '}
            <span className="text-slate-900 font-semibold">{totalFilteredItems}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              disabled={pagination.currentPage === 1}
              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1 px-1">
              {Array.from({ length: Math.min(5, Math.ceil(totalFilteredItems / pagination.itemsPerPage)) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant="ghost"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: pageNum }))}
                    className={`h-7 w-7 p-0 text-[12px] font-medium rounded-md transition-all ${pagination.currentPage === pageNum
                      ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={pagination.currentPage >= Math.ceil(totalFilteredItems / pagination.itemsPerPage)}
              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddQuestion && (
        <AddQuestionForm
          exerciseData={{
            exerciseId: exercise._id,
            exerciseName: exercise.exerciseInformation.exerciseName,
            exerciseLevel: exercise.exerciseInformation.exerciseLevel || 'intermediate',
            selectedLanguages: exercise.programmingSettings?.selectedLanguages || [],
            evaluationSettings: getEvaluationSettings(),
            nodeId,
            nodeName,
            subcategory,
            nodeType,
            fullExerciseData: exercise,
            exerciseType: exercise.exerciseType,
            programmingSettings: exercise.programmingSettings
          }}
          breadcrumbs={breadcrumbs}
          tabType={tabType}
          onClose={() => setShowAddQuestion(false)}
          onSave={handleQuestionSaved}
        />
      )}

      {/* Edit Question Modal */}
      {showEditQuestionModal && editingQuestion && (
        <AddQuestionForm
          exerciseData={{
            exerciseId: exercise._id,
            exerciseName: exercise.exerciseInformation.exerciseName,
            exerciseLevel: exercise.exerciseInformation.exerciseLevel || 'intermediate',
            selectedLanguages: exercise.programmingSettings?.selectedLanguages || [],
            evaluationSettings: getEvaluationSettings(),
            nodeId,
            nodeName,
            subcategory,
            nodeType,
            fullExerciseData: exercise,
            exerciseType: exercise.exerciseType,
            programmingSettings: exercise.programmingSettings
          }}
          tabType={tabType}
          onClose={() => {
            setShowEditQuestionModal(false);
            setEditingQuestion(null);
          }}
          onSave={handleQuestionSaved}
          initialData={editingQuestion}
          isEditing={true}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteQuestionModal && questionToDelete && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center gap-3 p-4 border-b">
              <div className="p-2 bg-red-50 rounded">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete Question</h3>
                <p className="text-sm text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              <p className="text-sm text-slate-700 mb-3">
                Are you sure you want to delete this question?
              </p>

              {/* Question Title - Simple and Clean */}
              <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200">
                <p className="text-sm font-medium text-slate-900 truncate">
                  "{getQuestionDisplayTitle(questionToDelete)}"
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Type: {questionToDelete.questionType?.toUpperCase() || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => {
                  setShowDeleteQuestionModal(false);
                  setQuestionToDelete(null);
                }}
                disabled={deletingQuestion}
                className="flex-1 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded border border-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteQuestionConfirm}
                disabled={deletingQuestion}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {deletingQuestion ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Questions;