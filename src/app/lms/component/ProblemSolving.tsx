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
import { Input } from "@/components/ui/input";

// --- Custom Components & Services ---
import ExerciseSettings from './ExerciseSettings';
import Questions from './QuestionsView';
import { exerciseApi, EntityType } from '@/apiServices/exercise';
import { Separator } from '@radix-ui/react-select';

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

// Simplified Exercise interface matching your API
interface Exercise {
  _id: string;
  exerciseInformation: {
    exerciseId: string;
    exerciseName: string;
    description: string;
    exerciseLevel: 'beginner' | 'intermediate' | 'expert';
    totalDuration: number;
  };
  exerciseType: 'MCQ' | 'Programming' | 'Combined';
  tabType: 'I_Do' | 'We_Do' | 'You_Do';
  subcategory: string;
  configurationType: 'manual';
  programmingSettings?: {
    selectedModule: string;
    selectedLanguages: string[];
  };
  createdAt: string;
  updatedAt?: string;
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
}

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
    if (showQuestions) {
      setShowQuestions(false);
      setSelectedExercise(null);
    }

    setShowSettingsModal(false);
    setShowViewModal(false);
    setShowDeleteModal(false);
    setExerciseToDelete(null);
    setExerciseToView(null);
    setEditingExercise(null);
  }, [nodeId, subcategory, activeTab]);

  useEffect(() => {
    if (!showQuestions && subcategory && subcategory.trim() !== "") {
      fetchExercises();
    } else {
      setExercises([]);
      setLoadingExercises(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, subcategory, nodeType, activeTab, showQuestions]);

  // --- API Handling ---
  const getEntityType = (nodeType: string): EntityType => {
    const normalized = nodeType.toLowerCase().trim();
    const mapping: Record<string, EntityType> = {
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
    if (!subcategory || subcategory.trim() === "") {
      console.warn("Skipping fetch: No subcategory selected");
      return;
    }

    setLoadingExercises(true);
    try {
      const entityType = getEntityType(nodeType);

      console.log('🔍 Fetching exercises with:', {
        entityType,
        nodeId,
        activeTab,
        subcategory
      });

      const response = await exerciseApi.getExercises(
        entityType,
        nodeId,
        activeTab,
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
      toast.error('Failed to fetch exercises');
      setExercises([]);
    } finally {
      setLoadingExercises(false);
    }
  };

  // --- EDIT FUNCTIONALITY ---
  const handleEditExercise = (exercise: Exercise) => {
    console.log('Editing exercise:', exercise);
    setEditingExercise(exercise);
    setIsEditing(true);
    setShowSettingsModal(true);
  };

  // --- DELETE FUNCTIONALITY ---
  const handleDeleteClick = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!exerciseToDelete) return;

    setDeleting(true);
    try {
      const entityType = getEntityType(nodeType);

      await exerciseApi.deleteExercise(
        entityType,
        nodeId,
        exerciseToDelete._id,
        activeTab,
        subcategory
      );

      // Optimistic update
      setExercises(prev => prev.filter(ex => ex._id !== exerciseToDelete._id));

      setShowDeleteModal(false);
      setExerciseToDelete(null);

      toast.success('Exercise deleted successfully', { position: "top-right", autoClose: 3000 });

    } catch (error: any) {
      console.error('Error deleting exercise:', error);
      toast.error(error.message || 'Failed to delete exercise.', { position: "top-right", autoClose: 3000 });
    } finally {
      setDeleting(false);
    }
  };

  // --- SAVE FUNCTIONALITY ---
  const handleSaveSettings = async () => {
    try {
      setShowSettingsModal(false);
      setEditingExercise(null);
      setIsEditing(false);

      await fetchExercises();
      toast.success(isEditing ? 'Exercise updated successfully' : 'Exercise created successfully', {
        position: "top-right",
        autoClose: 3000,
      });

    } catch (error: any) {
      console.error('Error saving exercise:', error);
      toast.error('Failed to save exercise', { position: "top-right", autoClose: 3000 });
    }
  };

  // --- Helper Functions ---
  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const options = { position: "top-right" as const, autoClose: 3000 };
    if (type === 'success') toast.success(message, options);
    else if (type === 'error') toast.error(message, options);
    else if (type === 'warning') toast.warn(message, options);
    else toast.info(message, options);
  };

  const handleAction = (actionType: string, exercise: Exercise) => {
    switch (actionType) {
      case 'edit':
        handleEditExercise(exercise);
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
        handleDeleteClick(exercise);
        break;
      case 'share':
        showNotification(`Share feature for ${exercise.exerciseInformation.exerciseName} coming soon`, 'info');
        break;
      case 'export':
        showNotification(`Export feature for ${exercise.exerciseInformation.exerciseName} coming soon`, 'info');
        break;
    }
  };

  // --- Render Helpers ---
  const renderLevelBadge = (level: string = 'intermediate') => {
    const normalizedLevel = level.toLowerCase() as 'beginner' | 'intermediate' | 'expert';

    const config = {
      beginner: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
      intermediate: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
      expert: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Zap },
    };

    const style = config[normalizedLevel] || config.intermediate;
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
        <DropdownMenuItem
          onClick={() => handleAction('delete', exercise)}
          className="cursor-pointer text-xs text-red-600 focus:text-red-600"
        >
          <Trash2 className="h-3 w-3 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

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
      tabType={activeTab}
      hierarchyData={hierarchyData} // Add this line
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
              disabled={loadingExercises || !subcategory}
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
              disabled={isLoading || !subcategory}
              className="h-8 px-3 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 rounded-lg shadow-sm"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
              <span className="hidden sm:inline">New Exercise</span>
            </Button>
          </div>
        </div>

        {/* --- Table Content --- */}
        <div className="flex-1 min-h-0 overflow-auto">
          <Table className="relative w-full border-collapse">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-slate-50/75 backdrop-blur border-b border-slate-200 h-9">
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w-[25%]">
                  Exercise Name
                </TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w=[12%]">
                  ID
                </TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w=[12%]">
                  Type
                </TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w=[12%]">
                  Level
                </TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w=[12%]">
                  Created
                </TableHead>
                <TableHead className="px-4 py-2 text-[11px] uppercase tracking-wider font-semibold text-slate-500 w=[8%] text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingExercises ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="h-12 border-b border-slate-50">
                    <TableCell colSpan={6}>
                      <div className="h-2 bg-slate-100 rounded w-full animate-pulse"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : getPaginatedExercises().length > 0 ? (
                getPaginatedExercises().map((exercise) => (
                  <TableRow key={exercise._id} className="group border-b border-slate-50 hover:bg-blue-50/30 transition-colors h-11">
                    <TableCell className="px-4 py-2">
                      <div className="flex items-start gap-2">
                        <div className="p-1 bg-blue-50 rounded border border-blue-100 flex-shrink-0">
                          <Code size={12} className="text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 text-[13px] truncate">
                            {exercise.exerciseInformation.exerciseName}
                          </div>
                          {exercise.exerciseInformation.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                              {exercise.exerciseInformation.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-2">
                      <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 text-slate-600">
                        {exercise.exerciseInformation.exerciseId}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-4 py-2">
                      <Badge variant="outline" className={`text-[11px] px-2 ${exercise.exerciseType === 'MCQ'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : exercise.exerciseType === 'Programming'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                        {exercise.exerciseType}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-4 py-2">
                      {renderLevelBadge(exercise.exerciseInformation.exerciseLevel)}
                    </TableCell>

                    <TableCell className="px-4 py-2">
                      <div className="flex items-center gap-1.5 text-[12px] text-slate-600">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(exercise.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-2 text-center">
                      <Windows10ActionMenu exercise={exercise} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
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

      {/* Delete Confirmation Modal */}
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
              Are you sure you want to delete <span className="font-semibold text-gray-900">"{exerciseToDelete.exerciseInformation.exerciseName}"</span>? All associated data will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setExerciseToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
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
          tabType={activeTab}
          onSave={handleSaveSettings}
          onClose={() => {
            setShowSettingsModal(false);
            setEditingExercise(null);
            setIsEditing(false);
          }}
          isEditing={isEditing}
          exercise_Id={editingExercise?._id} // Make sure this is passed
          initialData={editingExercise ? {
            exerciseType: editingExercise.exerciseType,
            exerciseInformation: {
              exerciseId: editingExercise.exerciseInformation.exerciseId,
              exerciseName: editingExercise.exerciseInformation.exerciseName,
              description: editingExercise.exerciseInformation.description,
              exerciseLevel: editingExercise.exerciseInformation.exerciseLevel,
              totalDuration: editingExercise.exerciseInformation.totalDuration
            }
          } : undefined}
        />
      )}
    </div>
  );
};

export default ProblemSolving;