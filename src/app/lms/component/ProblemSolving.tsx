import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileCode,
  RefreshCw,
  Loader2,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Calendar,
  Code,
  AlertTriangle,
  X,
  Zap,
  Share2,
  Download as DownloadIcon,
  CheckCircle,
  Edit3,
  BarChart3
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- UI Components ---
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";

// --- Custom Components & Services ---
import ExerciseSettings from './ExerciseSettings';
import Questions from './QuestionsView';
import { exerciseApi } from '@/apiServices/exercise';

// ----------------------------------------------------------------------
// Interfaces
// ----------------------------------------------------------------------

interface HierarchyData {
  courseName: string;
  moduleName: string;
  submoduleName: string;
  topicName: string;
  subtopicName: string;
  nodeType: string;
  level: number;
}

interface Exercise {
  _id: string;
  exerciseInformation: {
    exerciseName: string;
    exerciseId?: string;
    description?: string;
    // Added 'medium' to handle legacy data
    exerciseLevel?: 'beginner' | 'intermediate' | 'advanced' | 'medium';
    totalPoints?: number;
    totalQuestions?: number;
    estimatedTime?: number;
  };
  programmingSettings?: {
    selectedLanguages?: string[];
    selectedModule?: string;
    levelConfiguration?: {
      levelType: 'levelBased' | 'general';
      levelBased?: {
        easy: number;
        medium: number;
        hard: number;
      };
      general?: number;
    };
  };
  evaluationSettings?: {
    practiceMode?: boolean;
    manualEvaluation?: {
      enabled: boolean;
      submissionNeeded: boolean;
    };
    aiEvaluation?: boolean;
    automationEvaluation?: boolean;
    passingScore?: number;
    showResultsImmediately?: boolean;
    allowReview?: boolean;
  };
  availabilityPeriod?: {
    startDate?: string;
    endDate?: string;
    gracePeriodAllowed?: boolean;
    gracePeriodDate?: string;
    extendedDays?: number;
  };
  compilerSettings?: {
    allowCopyPaste: boolean;
    autoSuggestion: boolean;
    autoCloseBrackets: boolean;
    theme?: string;
    fontSize?: number;
    tabSize?: number;
  };
  questionBehavior?: {
    shuffleQuestions: boolean;
    allowNext: boolean;
    allowSkip: boolean;
    attemptLimitEnabled: boolean;
    maxAttempts: number;
    showPoints?: boolean;
    showDifficulty?: boolean;
    allowHintUsage?: boolean;
    allowTestRun?: boolean;
  };
  groupSettings?: {
    groupSettingsEnabled?: boolean;
    showExistingUsers?: boolean;
    selectedGroups?: string[];
    chatEnabled?: boolean;
    collaborationEnabled?: boolean;
  };
  scoreSettings?: {
    scoreType?: string;
    evenMarks?: number;
    totalMarks?: number;
    separateMarks?: {
      levelBased?: {
        easy: number[];
        medium: number[];
        hard: number[];
      };
      general?: number[];
    };
    levelBasedMarks?: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
  // 👇 THIS IS THE NEW PART 👇
  securitySettings?: {
    timerEnabled: boolean;
    timerType?: string;
    timerDuration?: number;
    cameraMicEnabled?: boolean;
    restrictMinimize?: boolean;
    fullScreenMode?: boolean;
    tabSwitchAllowed?: boolean;
    maxTabSwitches?: number;
    disableClipboard?: boolean;
    screenRecordingEnabled?: Boolean;
  };
  // 👆 END NEW PART 👆
  questions?: any[];
  createdAt: string;
  updatedAt?: string;
}
interface ProblemSolvingProps {
  nodeId: string;
  nodeName: string;
  subcategory: string;
  subcategoryLabel: string;
  contentData: any[];
  folderNavigationState: any;
  hierarchyData: HierarchyData;
  onRefresh?: () => Promise<void>;
  activeTab: string; // 'I_Do' | 'We_Do' | 'You_Do'
  nodeType: string;
  courseId: string;
}

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------

const parseMongoDate = (dateValue: any): string => {
  if (!dateValue) return '';
  try {
    if (typeof dateValue === 'object' && dateValue.$date) {
      return new Date(dateValue.$date).toISOString().split('T')[0];
    } else if (typeof dateValue === 'string') {
      return dateValue.split('T')[0];
    } else if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
  } catch (error) {
    console.error('Error parsing date:', error);
  }
  return '';
};

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

const ProblemSolving: React.FC<ProblemSolvingProps> = (props) => {
  const router = useRouter();

  const {
    nodeId,
    nodeName,
    subcategory,
    subcategoryLabel,
    hierarchyData,
    onRefresh,
    activeTab,
    nodeType,
    courseId
  } = props;

  // --- State Management ---

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [exerciseToView, setExerciseToView] = useState<Exercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  // --- Effects ---

  useEffect(() => {
    // FIX: Only fetch if NOT drilling down AND subcategory is present and not empty string
    if (!showQuestions && subcategory && subcategory.trim() !== "") {
      fetchExercises();
    } else {
      // Clear exercises if no subcategory is selected to prevent stale data
      setExercises([]);
      setLoadingExercises(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, subcategory, nodeType, activeTab, showQuestions]);

  // --- API Handling ---

  const getEntityType = (nodeType: string): string => {
    const normalized = nodeType.toLowerCase().trim();
    const mapping: Record<string, string> = {
      'module': 'modules',
      'modules': 'modules',
      'submodule': 'submodules',
      'submodules': 'submodules',
      'topic': 'topics',
      'topics': 'topics',
      'subtopic': 'subtopics',
      'subtopics': 'subtopics'
    };
    return mapping[normalized] || 'topics';
  };

  const fetchExercises = async () => {
    // FIX: Guard clause to prevent API call if subcategory is empty
    if (!subcategory || subcategory.trim() === "") {
      console.warn("Skipping fetch: No subcategory selected");
      return;
    }

    setLoadingExercises(true);
    try {
      const entityType = getEntityType(nodeType);
      const currentCategory = activeTab || "We_Do";

      console.log('🔍 DEBUG: Fetching exercises with:', {
        entityType,
        nodeId,
        currentCategory,
        subcategory,
        activeTab
      });

      const response = await exerciseApi.getExercises(
        entityType as any,
        nodeId,
        currentCategory,
        subcategory
      );

      console.log('✅ API Response:', response.data);

      if (response.data?.exercises) {
        setExercises(response.data.exercises);
        setPagination(prev => ({
          ...prev,
          totalItems: response.data.exercises.length,
          totalPages: Math.ceil(response.data.exercises.length / prev.itemsPerPage)
        }));
      } else {
        setExercises([]);
        setPagination(prev => ({ ...prev, totalItems: 0, totalPages: 1 }));
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
      setExercises([]);
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleSaveSettings = async (settings: any) => {
    try {
      // 1. Close Modal
      setShowSettingsModal(false);
      setEditingExercise(null);
      setIsEditing(false);

      // 2. Refresh List
      await fetchExercises();
      showNotification('Exercise saved successfully', 'success');

    } catch (error: any) {
      console.error('Error refreshing list:', error);
      showNotification('Saved, but failed to refresh list.', 'warning');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!exerciseToDelete) return;

    setDeleting(true);
    try {
      const entityType = getEntityType(nodeType);
      const currentCategory = activeTab || "We_Do";

      await exerciseApi.deleteExercise(
        entityType as any,
        nodeId,
        exerciseToDelete._id,
        currentCategory,
        subcategory
      );

      // Optimistic update
      setExercises(prev => prev.filter(ex => ex._id !== exerciseToDelete._id));

      setShowDeleteModal(false);
      setExerciseToDelete(null);

      // Full refresh
      await fetchExercises();

      if (onRefresh) await onRefresh();
      showNotification('Exercise deleted successfully', 'success');

    } catch (error: any) {
      console.error('Error deleting exercise:', error);
      showNotification(error.message || 'Failed to delete exercise.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // --- Logic Helpers ---

  const calculateTotalQuestions = (exercise: Exercise) => {
    const config = exercise.programmingSettings?.levelConfiguration;
    if (!config) return 0;

    if (config.levelType === 'levelBased' && config.levelBased) {
      return (config.levelBased.easy || 0) +
        (config.levelBased.medium || 0) +
        (config.levelBased.hard || 0);
    } else {
      return config.general || 0;
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const options = { position: "top-right" as const, autoClose: 3000 };
    if (type === 'success') toast.success(message, options);
    else if (type === 'error') toast.error(message, options);
    else if (type === 'warning') toast.warn(message, options);
    else toast.info(message, options);
  };

  // --- Navigation & Actions ---

  const handleAnalytics = (exercise: Exercise) => {
    console.log('Navigating to analytics, setting restore flags');

    // Store State
    localStorage.setItem('lms_returning_from_analytics', 'true');
    localStorage.setItem('lms_sidebar_collapsed', 'true');
    localStorage.setItem('lms_selected_tab', activeTab || 'We_Do');
    localStorage.setItem('lms_selected_subcategory', subcategory);
    localStorage.setItem('lms_selected_node_id', nodeId);
    localStorage.setItem('lms_selected_node_name', nodeName);

    // Build URL
    const query = new URLSearchParams({
      exerciseId: exercise._id,
      nodeId: nodeId,
      nodeType: nodeType,
      sourceTab: activeTab || 'We_Do',
      sourceSubcategory: subcategory,
      courseId: courseId,
      moduleName: hierarchyData.moduleName || "",
      returnUrl: '/lms/pages/coursestructure/uploadcourseresources'
    }).toString();

    router.push(`/lms/pages/coursestructure/reviewSubmission?${query}`);
  };

  const handleAction = (actionType: string, exercise: Exercise) => {
    switch (actionType) {
      case 'edit':
        setEditingExercise(exercise);
        setIsEditing(true);
        setShowSettingsModal(true);
        break;
      case 'view':
        setExerciseToView(exercise);
        setShowViewModal(true);
        break;
      case 'manageQuestions':
        setSelectedExercise(exercise);
        setShowQuestions(true);
        break;
      case 'delete':
        setExerciseToDelete(exercise);
        setShowDeleteModal(true);
        break;
      case 'share':
        showNotification(`Share feature for ${exercise.exerciseInformation.exerciseName} coming soon`, 'info');
        break;
      case 'export':
        showNotification(`Export feature for ${exercise.exerciseInformation.exerciseName} coming soon`, 'info');
        break;
    }
  };

  // --- Filtering & Pagination ---

  const getFilteredExercises = () => {
    let filtered = exercises;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.exerciseInformation?.exerciseName?.toLowerCase().includes(q) ||
        ex.exerciseInformation?.exerciseId?.toLowerCase().includes(q)
      );
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(ex => ex.exerciseInformation?.exerciseLevel === selectedFilter);
    }

    return filtered;
  };

  const getPaginatedExercises = () => {
    const filtered = getFilteredExercises();
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    return filtered.slice(startIndex, startIndex + pagination.itemsPerPage);
  };

  // --- Render Helpers ---

  const renderLevelBadge = (level: string = 'intermediate') => {
    const normalizedLevel = level === 'medium' ? 'intermediate' : level;

    const config = {
      beginner: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
      intermediate: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
      advanced: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Zap },
    };

    const style = config[normalizedLevel as keyof typeof config] || config.intermediate;
    const Icon = style.icon;

    return (
      <Badge variant="outline" className={`${style.color} text-[12px] font-medium px-1.5 py-0.5 flex items-center gap-1 w-fit`}>
        <Icon size={10} />
        {normalizedLevel.charAt(0).toUpperCase() + normalizedLevel.slice(1)}
      </Badge>
    );
  };

  const Windows10ActionMenu = ({ exercise }: { exercise: Exercise }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-gray-100 rounded">
          <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleAction('manageQuestions', exercise)} className="cursor-pointer text-xs">
          <FileCode className="h-3 w-3 mr-2 text-orange-600" /> Manage Questions
        </DropdownMenuItem>
        <Separator className="my-1" />
        <DropdownMenuItem onClick={() => handleAction('edit', exercise)} className="cursor-pointer text-xs">
          <Edit3 className="h-3 w-3 mr-2 text-blue-600" /> Edit Exercise
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('share', exercise)} className="cursor-pointer text-xs">
          <Share2 className="h-3 w-3 mr-2 text-indigo-600" /> Share
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('export', exercise)} className="cursor-pointer text-xs">
          <DownloadIcon className="h-3 w-3 mr-2 text-green-600" /> Export
        </DropdownMenuItem>
        <Separator className="my-1" />
        <DropdownMenuItem onClick={() => handleAction('delete', exercise)} className="cursor-pointer text-xs text-red-600 focus:text-red-600">
          <Trash2 className="h-3 w-3 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ExerciseDetailsModal = ({ exercise, onClose }: { exercise: Exercise, onClose: () => void }) => {
    const totalQ = calculateTotalQuestions(exercise);
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded">
                <Code size={20} />
              </div>
              <div>
                <h2 className="font-bold text-lg">{exercise.exerciseInformation.exerciseName}</h2>
                <div className="flex gap-2 text-xs opacity-90 mt-1">
                  <span>ID: {exercise.exerciseInformation.exerciseId}</span>
                  <span>•</span>
                  <span className="capitalize">{exercise.exerciseInformation.exerciseLevel}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X size={18} />
            </Button>
          </div>

          <div className="p-0 overflow-y-auto flex-1">
            <Tabs defaultValue="overview" className="w-full">
              <div className="px-4 pt-4 sticky top-0 bg-white z-10 border-b">
                <TabsList className="w-full justify-start h-9 p-0 bg-transparent border-b rounded-none">
                  <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-9 px-4">Overview</TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-9 px-4">Settings</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-blue-600">{totalQ}</div>
                      <p className="text-xs text-muted-foreground mt-1">Total Questions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-purple-600">{exercise.programmingSettings?.selectedLanguages?.length || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">Languages</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold text-green-600">{exercise.evaluationSettings?.passingScore || 0}%</div>
                      <p className="text-xs text-muted-foreground mt-1">Passing Score</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Description</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                    {exercise.exerciseInformation.description || "No description provided."}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="p-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500 block mb-1">Languages</span>
                    <div className="flex flex-wrap gap-1">
                      {exercise.programmingSettings?.selectedLanguages?.map(lang => (
                        <Badge key={lang} variant="secondary" className="text-xs">{lang}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 block mb-1">Attempts</span>
                    <span>{exercise.questionBehavior?.maxAttempts || 'Unlimited'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 block mb-1">Evaluation Mode</span>
                    <Badge variant="outline">{exercise.evaluationSettings?.practiceMode ? 'Practice' : 'Assessment'}</Badge>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="p-4 border-t bg-gray-50 shrink-0 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={() => { onClose(); handleAction('edit', exercise); }}>Edit</Button>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------------
  // Conditional Render: Question Manager
  // ----------------------------------------------------------------------

  if (showQuestions && selectedExercise) {
    return (
      <Questions
        exercise={selectedExercise}
        nodeId={nodeId}
        nodeName={nodeName}
        subcategory={subcategory}
        nodeType={nodeType}
        tabType={activeTab} // PASS THE ACTIVE TAB
        onBack={() => {
          setShowQuestions(false);
          setSelectedExercise(null);
          fetchExercises();
        }}
      />
    );
  }

  // ----------------------------------------------------------------------
  // Main Render: Exercise List
  // ----------------------------------------------------------------------

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* --- Header Toolbar --- */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-50 rounded-lg border border-blue-100">
              <FileCode size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0 flex flex-col">
              <h1 className="text-sm font-semibold text-slate-900 leading-none truncate">
                Problem Solving Exercises
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 leading-none truncate">
                <span className="font-medium text-slate-600">{nodeName}</span>
                <span className="text-slate-300">•</span>
                <span>{subcategoryLabel || subcategory}</span>
                <span className="text-slate-300">•</span>
                <span className="text-blue-600 font-medium">{activeTab.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Search exercises..."
                className="h-8 w-48 pl-8 text-xs bg-slate-50 border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Code size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {/* Refresh */}
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchExercises}
              disabled={loadingExercises || !subcategory} // Also disable refresh if no subcategory
              className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <RefreshCw size={14} className={loadingExercises ? 'animate-spin text-blue-600' : ''} />
            </Button>

            {/* Add New */}
            <Button
              onClick={() => {
                setEditingExercise(null);
                setIsEditing(false);
                setShowSettingsModal(true);
              }}
              disabled={isLoading || !subcategory} // Prevent adding if no subcategory
              className="h-8 px-3 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 rounded-lg shadow-sm"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
              <span className="hidden sm:inline">New Exercise</span>
            </Button>
          </div>
        </div>

        {/* --- Table Content --- */}
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
          <Table className="relative w-full border-collapse">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-slate-50/75 backdrop-blur border-b border-slate-200 h-9">
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w-[30%]">Exercise Name</TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w-[15%]">ID</TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w-[10%]">Level</TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w-[15%]">Created</TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w-[15%] text-center">Analytics</TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w-[5%] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingExercises ? (
                // Loading Skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-12 border-b border-slate-50">
                    <TableCell colSpan={6}><div className="h-2 bg-slate-100 rounded w-full animate-pulse"></div></TableCell>
                  </TableRow>
                ))
              ) : getPaginatedExercises().length > 0 ? (
                // Data Rows
                getPaginatedExercises().map((exercise) => (
                  <TableRow key={exercise._id} className="group border-b border-slate-50 hover:bg-blue-50/30 transition-colors h-11">
                    <TableCell className="px-4 py-2">
                      <div className="flex items-start gap-2">
                        <div className="p-1 bg-blue-50 rounded border border-blue-100">
                          <Code size={12} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 text-[13px]">{exercise.exerciseInformation.exerciseName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 text-slate-600">
                        {exercise.exerciseInformation.exerciseId || exercise._id.slice(-6)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {renderLevelBadge(exercise.exerciseInformation.exerciseLevel)}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex items-center gap-1.5 text-[12px] text-slate-600">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(exercise.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-center">
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 px-3 text-[11px] bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleAnalytics(exercise)}
                      >
                        <BarChart3 size={12} className="mr-1.5" /> Review Submission
                      </Button>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-center">
                      <Windows10ActionMenu exercise={exercise} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Empty State
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                        <FileCode size={24} className="text-slate-300" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-900">No exercises found</h3>
                      <p className="text-xs text-slate-500 mt-1 mb-4">
                        {!subcategory
                          ? "Please select a subcategory to view exercises."
                          : `Get started by creating a new exercise for ${activeTab?.replace('_', ' ')}.`}
                      </p>
                      {subcategory && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingExercise(null);
                            setIsEditing(false);
                            setShowSettingsModal(true);
                          }}
                        >
                          <Plus size={14} className="mr-1" /> Create Exercise
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* --- Footer Pagination --- */}
        {getFilteredExercises().length > 0 && (
          <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-between text-xs">
            <div className="text-slate-500">
              Showing <span className="font-semibold text-slate-900">{(pagination.currentPage - 1) * pagination.itemsPerPage + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}</span> of <span className="font-semibold text-slate-900">{pagination.totalItems}</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pagination.currentPage === 1}
                onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage - 1 }))}
              >
                <ChevronLeft size={12} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage + 1 }))}
              >
                <ChevronRight size={12} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------------
          Modals
      ---------------------------------------------------------------------- */}

      {showViewModal && exerciseToView && (
        <ExerciseDetailsModal exercise={exerciseToView} onClose={() => setShowViewModal(false)} />
      )}

      {showDeleteModal && exerciseToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Exercise</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{exerciseToDelete.exerciseInformation.exerciseName}</span>? All associated student submissions and data will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? <Loader2 size={14} className="animate-spin mr-1" /> : <Trash2 size={14} className="mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <ExerciseSettings
          hierarchyData={hierarchyData}
          nodeId={nodeId}
          nodeName={nodeName}
          subcategory={subcategory}
          nodeType={nodeType}
          level={hierarchyData.level}

          // Pass the dynamic tab active state so the modal knows which pedagogy context to use
          tabType={activeTab as 'I_Do' | 'We_Do' | 'You_Do'}

          onSave={handleSaveSettings}
          onClose={() => {
            setShowSettingsModal(false);
            setEditingExercise(null);
            setIsEditing(false);
          }}
          initialData={editingExercise ? {
            exerciseInformation: {
              exerciseId: editingExercise.exerciseInformation?.exerciseId || '',
              exerciseName: editingExercise.exerciseInformation?.exerciseName || '',
              description: editingExercise.exerciseInformation?.description || '',
              exerciseLevel: (editingExercise.exerciseInformation?.exerciseLevel === 'medium'
                ? 'intermediate'
                : editingExercise.exerciseInformation?.exerciseLevel) || 'intermediate'
            },
            programmingSettings: {
              selectedModule: editingExercise.programmingSettings?.selectedModule || 'Core Programming',
              selectedLanguages: editingExercise.programmingSettings?.selectedLanguages || [],
              levelConfiguration: editingExercise.programmingSettings?.levelConfiguration || {
                levelType: 'levelBased',
                levelBased: { easy: 0, medium: 0, hard: 0 },
                general: 0
              }
            },
            compilerSettings: {
              allowCopyPaste: editingExercise.compilerSettings?.allowCopyPaste ?? true,
              autoSuggestion: editingExercise.compilerSettings?.autoSuggestion ?? true,
              autoCloseBrackets: editingExercise.compilerSettings?.autoCloseBrackets ?? true
            },
            availabilityPeriod: {
              startDate: parseMongoDate(editingExercise.availabilityPeriod?.startDate) || new Date().toISOString().split('T')[0],
              endDate: parseMongoDate(editingExercise.availabilityPeriod?.endDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              gracePeriodAllowed: editingExercise.availabilityPeriod?.gracePeriodAllowed ?? false,
              gracePeriodDate: parseMongoDate(editingExercise.availabilityPeriod?.gracePeriodDate) || '',
              extendedDays: 0
            },
            questionBehavior: {
              shuffleQuestions: editingExercise.questionBehavior?.shuffleQuestions ?? false,
              allowNext: editingExercise.questionBehavior?.allowNext ?? true,
              allowSkip: editingExercise.questionBehavior?.allowSkip ?? false,
              attemptLimitEnabled: editingExercise.questionBehavior?.attemptLimitEnabled ?? false,
              maxAttempts: editingExercise.questionBehavior?.maxAttempts || 3
            },
            evaluationSettings: {
              practiceMode: editingExercise.evaluationSettings?.practiceMode ?? true,
              manualEvaluation: editingExercise.evaluationSettings?.manualEvaluation || { enabled: false, submissionNeeded: false },
              aiEvaluation: editingExercise.evaluationSettings?.aiEvaluation ?? false,
              automationEvaluation: editingExercise.evaluationSettings?.automationEvaluation ?? false
            },
            groupSettings: {
              groupSettingsEnabled: editingExercise.groupSettings?.groupSettingsEnabled ?? false,
              showExistingUsers: editingExercise.groupSettings?.showExistingUsers ?? true,
              selectedGroups: editingExercise.groupSettings?.selectedGroups || [],
              chatEnabled: editingExercise.groupSettings?.chatEnabled ?? false
            },
            // 👇 THIS IS THE NEW PART - MAPPING SECURITY SETTINGS 👇
            securitySettings: {
              timerEnabled: editingExercise.securitySettings?.timerEnabled ?? false,
              timerType: editingExercise.securitySettings?.timerType || 'exercise',
              timerDuration: editingExercise.securitySettings?.timerDuration || 60,
              cameraMicEnabled: editingExercise.securitySettings?.cameraMicEnabled ?? false,
              restrictMinimize: editingExercise.securitySettings?.restrictMinimize ?? false,
              fullScreenMode: editingExercise.securitySettings?.fullScreenMode ?? false,
              tabSwitchAllowed: editingExercise.securitySettings?.tabSwitchAllowed ?? true,
              maxTabSwitches: editingExercise.securitySettings?.maxTabSwitches || 3,
              disableClipboard: editingExercise.securitySettings?.disableClipboard ?? false,
              screenRecordingEnabled: editingExercise.securitySettings?.screenRecordingEnabled ?? false,

            }
            // 👆 END NEW PART 👆
          } : undefined}
          isEditing={isEditing}
          exerciseId={editingExercise?._id}
        />
      )}
    </div>
  );
};

export default ProblemSolving;