import React, { useState, useEffect } from 'react';
import {
  Plus, RefreshCw, Edit, Trash2, ChevronLeft, ChevronRight, MoreHorizontal,
  ArrowLeft, Eye, PlayCircle, Settings, Star,
  CheckCircle, XCircle, Search, Filter, Code2, Clock,
  MoreVertical, Edit3
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
import AddQuestionForm from './AddQuestionForm';

// --- Interfaces ---
interface Exercise {
  _id: string;
  exerciseInformation: {
    exerciseName: string;
    exerciseId?: string;
    description?: string;
    exerciseLevel?: string;
  };
  programmingSettings?: {
    selectedLanguages?: string[];
  };
  evaluationSettings?: {
    practiceMode?: boolean;
    manualEvaluation?: { enabled: boolean };
    aiEvaluation?: boolean;
    automationEvaluation?: boolean;
  };
  availabilityPeriod?: { status: string };
  createdAt: string;
  compilerSettings?: any;
  questionBehavior?: any;
  groupSettings?: any;
}

interface QuestionsProps {
  exercise: Exercise;
  nodeId: string;
  nodeName: string;
  subcategory: string;
  nodeType: string;
  onBack: () => void;
  tabType: string; // ADD THIS: dynamic tab type

}

interface Question {
  _id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  sampleInput?: string;
  sampleOutput?: string;
  constraints?: string[];
  hints?: Array<any>;
  testCases?: Array<any>;
  solutions?: { startedCode: string; functionName: string; language: string };
  timeLimit?: number;
  memoryLimit?: number;
  isActive: boolean;
  sequence: number;
  createdAt: string;
  updatedAt: string;
  questionNumber?: number;
  questionType?: string;
  attempts?: number;
}

const API_BASE_URL = 'https://lms-server-ym1q.onrender.com';

const Questions: React.FC<QuestionsProps> = ({ exercise, nodeId, nodeName, subcategory, nodeType, tabType, onBack }) => {
  // --- State ---
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);

  // --- Effects ---
  useEffect(() => {
    fetchQuestions();
  }, [exercise._id, includeInactive]);

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
      console.log(API_BASE_URL);
      const pluralNodeType = getPluralNodeType(nodeType);
      const response = await fetch(`${API_BASE_URL}/questions-get/${pluralNodeType}/${nodeId}/${exercise._id}?${queryParams}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`Failed to fetch questions: ${response.status}`);

      const result = await response.json();
      if (result.data && result.data.questions) {
        const fetchedQuestions = result.data.questions.map((q: Question) => ({ ...q, questionNumber: (q.sequence || 0) + 1 }));
        setQuestions(fetchedQuestions);
        setPagination(prev => ({
          ...prev,
          totalItems: fetchedQuestions.length,
          totalPages: Math.ceil(fetchedQuestions.length / prev.itemsPerPage),
          currentPage: 1
        }));
      } else setQuestions([]);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAction = async (actionType: string, question: Question) => {
    if (actionType === 'delete') {
      if (confirm('Are you sure you want to delete this question?')) {
        alert('Deleted');
      }
    }
  };

  // --- Filtering & Pagination Logic ---
  const getFilteredQuestions = () => {
    return questions.filter(question => {
      const matchesSearch = searchTerm === '' ||
        question.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (question.description && question.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' && question.isActive) || (filterStatus === 'draft' && !question.isActive);
      const matchesDifficulty = filterDifficulty === 'all' || question.difficulty === filterDifficulty;
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

  // --- Helpers ---
  const DifficultyBadge = ({ level }: { level: string }) => {
    const colors: Record<string, string> = {
      easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      medium: 'bg-amber-50 text-amber-700 border-amber-200',
      hard: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return (
      <Badge variant="outline" className={`text-[10px] uppercase font-bold px-1.5 py-0.5 border ${colors[level] || colors.medium}`}>
        {level}
      </Badge>
    );
  };

  // --- Render ---
  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* SECTION 1: UNIFIED HEADER 
        Fixed at the top, does not scroll.
      */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-">

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

      {/* SECTION 2: SCROLLABLE TABLE AREA 
        This div takes remaining height. The table inside scrolls.
      */}
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
              displayedQuestions.map((question, index) => (
                <TableRow
                  key={question._id}
                  className="group border-b border-slate-50 hover:bg-blue-50/30 transition-colors duration-150 h-16 last:border-0"
                >
                  <TableCell className="px-4 py-2 text-[13px] text-slate-700 align-top pt-3">
                    <span className="font-mono text-slate-400">#{question.questionNumber}</span>
                  </TableCell>
                  <TableCell className="px-4 py-2 align-top pt-3">
                    {/* ADDED: max-w-[250px] sm:max-w-[350px]
      This forces the container to stop growing, making line-clamp work properly 
      without creating a scrollbar.
  */}
                    <div className="flex flex-col gap-1 max-w-[250px] sm:max-w-[350px]">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[13px] font-medium text-slate-900 line-clamp-1 truncate"
                          title={question.title}
                        >
                          {question.title || 'Untitled'}
                        </span>
                        <DifficultyBadge level={question.difficulty} />
                        <Badge variant="secondary" className="text-[10px] px-1 h-5 text-slate-500 bg-slate-100 flex-shrink-0">
                          {question.points} pts
                        </Badge>
                      </div>

                      <p
                        className="text-[11px] text-slate-500 line-clamp-1 truncate"
                        title={question.description} // Optional: shows full text on hover
                      >
                        {question.description || 'No description provided'}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-2 align-top pt-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                        {question.solutions?.startedCode ? (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0">Coding</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 px-1.5 py-0">Descriptive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        {question.timeLimit && <span className="flex items-center gap-1"><Clock size={10} /> {question.timeLimit}ms</span>}
                        {question.testCases && <span className="flex items-center gap-1"><Code2 size={10} /> {question.testCases.length} Tests</span>}
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
                      {new Date(question.updatedAt).toLocaleDateString()}
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
                        <DropdownMenuItem onClick={() => handleAction('edit', question)} className="text-xs">
                          <Edit3 className="mr-2 h-3 w-3" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('preview', question)} className="text-xs">
                          <Eye className="mr-2 h-3 w-3" /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAction('delete', question)} className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="mr-2 h-3 w-3" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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
        </table>      </div>

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
            exerciseLevel: exercise.exerciseInformation.exerciseLevel || 'medium',
            selectedLanguages: exercise.programmingSettings?.selectedLanguages || [],
            evaluationSettings: exercise.evaluationSettings,
            nodeId,
            nodeName,
            subcategory,
            nodeType,
            fullExerciseData: exercise
          }}
          tabType={tabType} // PASS THE TABTYPE HERE
          onClose={() => setShowAddQuestion(false)}
          onSave={(questionData: any) => {
            setShowAddQuestion(false);
            fetchQuestions();
          }}
        />
      )}
    </div>
  );
};

export default Questions;