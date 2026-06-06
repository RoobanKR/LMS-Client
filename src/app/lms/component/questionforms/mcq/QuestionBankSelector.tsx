import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Loader, Check, ChevronRight, ChevronLeft, BookOpen, Code, Database, Layout, AlertCircle } from 'lucide-react';
import { questionBankService } from '@/apiServices/questionBankService';
// IMPORTANT: use react-hot-toast (the same toaster mounted in app/layout.tsx).
// react-toastify's ToastContainer is NOT mounted in this app, so toasts from
// "react-toastify" never render — that was the bug that made the quota
// warnings appear silent to teachers picking questions from the bank.
import toast from 'react-hot-toast';
import { Question } from '../../QuestionsView';

// Open-slot quota passed by the parent so the selector can block over-selection.
// 'general' → one total cap (any difficulty); 'difficulty' → per-difficulty caps.
export type SelectionQuota =
  | { mode: 'general'; remainingTotal: number }
  | { mode: 'difficulty'; remainingByDifficulty: { easy: number; medium: number; hard: number } };

interface QuestionBankSelectorProps {
  exerciseData: {
    exerciseId: string;
    exerciseName: string;
    exerciseLevel: string;
    nodeId: string;
    nodeName: string;
    subcategory: string;
    nodeType: string;
    fullExerciseData: any;
    exerciseType: string;
      onEditQuestion?: (question: any) => void;  // ADD THIS

    
  };
  tabType: string;
  onClose: () => void;
  onBack?: () => void;
  onSelect: (selectedQuestions: Question[]) => void;
  existingQuestionIds: string[];
  existingQuestions: Question[];
  // ✅ NEW: Add filterType prop to filter by question type
  filterByType?: 'mcq' | 'programming' | 'frontend' | 'database' | 'all';
  // Selection quota (opt-in) — blocks ticking beyond the exercise's open slots.
  selectionQuota?: SelectionQuota;
  // Optional context passed by some callers (currently informational).
  remainingQuestions?: number;
  marksPerQuestion?: number;
}

const QuestionBankSelector: React.FC<QuestionBankSelectorProps> = ({
  exerciseData,
  tabType,
  onClose,
  onBack,
  onSelect,
  existingQuestionIds,
  existingQuestions = [],
  filterByType = 'all', // ✅ Default to 'all' to show all question types
  selectionQuota,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mcq' | 'programming' | 'frontend' | 'database'>(filterByType);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Update filterType when prop changes
  useEffect(() => {
    if (filterByType !== 'all') {
      setFilterType(filterByType);
    }
  }, [filterByType]);

  useEffect(() => {
    fetchQuestionBank();
  }, []);

  const fetchQuestionBank = async () => {
    setLoading(true);
    try {
      const response = await questionBankService.getAllQuestions({
        isActive: true
      });
      
      if (response && response.success) {
        const questionsData = response.questions || [];
        setQuestions(questionsData);
        
        if (questionsData.length === 0) {
          toast('No questions found in question bank', { icon: 'ℹ️' });
        }
      } else {
        setQuestions([]);
        toast('No questions found in question bank', { icon: 'ℹ️' });
      }
    } catch (error: any) {
      console.error('Error fetching question bank:', error);
      toast.error(error.response?.data?.message || 'Failed to load question bank');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate string similarity
  const calculateStringSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(w => words2.includes(w));
    const totalWords = new Set([...words1, ...words2]);
    
    return commonWords.length / totalWords.size;
  };

  const getQuestionTitle = (question: any): string => {
    // Handle different formats of mcqQuestionTitle
    if (question.mcqQuestionTitle) {
      // Case 1: It's an object with a text property (like in your data)
      if (typeof question.mcqQuestionTitle === 'object' && question.mcqQuestionTitle !== null) {
        if (question.mcqQuestionTitle.text) {
          return question.mcqQuestionTitle.text.replace(/<[^>]*>/g, '').trim();
        }
        // Case 2: It's an array of content blocks
        if (Array.isArray(question.mcqQuestionTitle)) {
          return question.mcqQuestionTitle
            .filter((cb: any) => cb.type === 'text')
            .map((cb: any) => (cb.value || '').replace(/<[^>]*>/g, '').trim())
            .filter(Boolean)
            .join(' ');
        }
      }
      // Case 3: It's a string
      if (typeof question.mcqQuestionTitle === 'string') {
        return question.mcqQuestionTitle.replace(/<[^>]*>/g, '').trim();
      }
    }
    
    // Fallback to other title fields
    const title = question.questionText || question.title || '';
    
    if (typeof title === 'string') {
      return title.replace(/<[^>]*>/g, '').trim();
    }
    
    if (Array.isArray(title)) {
      return title
        .filter((cb: any) => cb.type === 'text')
        .map((cb: any) => (cb.value || '').replace(/<[^>]*>/g, '').trim())
        .filter(Boolean)
        .join(' ');
    }
    
    return 'Untitled Question';
  };

  const getQuestionDescription = (question: any): string => {
    if (question.questionType?.toLowerCase() === 'mcq') {
      const desc = question.mcqQuestionDescription;
      
      // Handle object with text property
      if (desc && typeof desc === 'object' && desc !== null) {
        if (desc.text) {
          return desc.text.replace(/<[^>]*>/g, '').trim();
        }
        if (Array.isArray(desc)) {
          return desc
            .filter((cb: any) => cb.type === 'text')
            .map((cb: any) => (cb.value || '').replace(/<[^>]*>/g, '').trim())
            .filter(Boolean)
            .join(' ');
        }
      }
      
      // Handle string
      if (typeof desc === 'string') {
        return desc.replace(/<[^>]*>/g, '').trim();
      }
      
      return 'Multiple Choice Question';
    }
    
    const description = question.description;
    if (typeof description === 'string') {
      return description.replace(/<[^>]*>/g, '').substring(0, 120);
    }
    
    if (description && typeof description === 'object' && description !== null) {
      if (description.text) {
        return description.text.replace(/<[^>]*>/g, '').substring(0, 120);
      }
      if (Array.isArray(description)) {
        const text = description
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.value || '')
          .join(' ')
          .replace(/<[^>]*>/g, '')
          .trim();
        return text.substring(0, 120) || 'No description provided';
      }
    }
    
    return 'No description provided';
  };

  // Check if a question is duplicate with existing questions
  const isDuplicate = (bankQuestion: Question): boolean => {
    // First check by ID
    if (existingQuestionIds.includes(bankQuestion._id)) {
      return true;
    }
    
    const bankTitle = getQuestionTitle(bankQuestion).toLowerCase().trim();
    
    // Check against each existing question
    return existingQuestions.some(existingQ => {
      const existingTitle = getQuestionTitle(existingQ).toLowerCase().trim();
      
      // Exact title match
      if (existingTitle === bankTitle) {
        return true;
      }
      
      // Similarity check for longer titles
      if (existingTitle.length > 20 && bankTitle.length > 20) {
        const similarity = calculateStringSimilarity(existingTitle, bankTitle);
        return similarity > 0.8;
      }
      
      return false;
    });
  };

  const getFilteredQuestions = () => {
    return questions.filter(q => {
      // ✅ First filter by type if filterByType is specified
      const questionType = q.questionType?.toLowerCase() || '';
      
      // If filterByType is not 'all', only show questions of that type
      if (filterByType !== 'all' && questionType !== filterByType) {
        return false;
      }
      
      // Search filter
      const title = getQuestionTitle(q);
      const description = getQuestionDescription(q);
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        (title && title.toLowerCase().includes(searchLower)) ||
        (description && description.toLowerCase().includes(searchLower));

      // Type filter (for UI filtering within the filtered type)
      const matchesType = filterType === 'all' || questionType === filterType;

      return matchesSearch && matchesType;
    });
  };

  // ── Selection quota helpers ──
  const getQuestionDifficulty = (q: any): 'easy' | 'medium' | 'hard' => {
    const d = (q?.difficulty || q?.mcqQuestionDifficulty || 'medium').toString().toLowerCase();
    return d === 'easy' || d === 'hard' ? d : 'medium';
  };

  const countSelectedByDifficulty = (diff: 'easy' | 'medium' | 'hard') =>
    Array.from(selectedQuestions).reduce((n, id) => {
      const q = questions.find(x => x._id === id);
      return q && getQuestionDifficulty(q) === diff ? n + 1 : n;
    }, 0);

  const handleSelectAll = () => {
    const filtered = getFilteredQuestions();
    if (selectAll) {
      setSelectedQuestions(new Set());
      setSelectAll(false);
      return;
    }

    if (!selectionQuota) {
      setSelectedQuestions(new Set(filtered.map(q => q._id)));
      setSelectAll(true);
      return;
    }

    // Respect the open-slot quota when selecting all.
    const newSelected = new Set<string>();
    if (selectionQuota.mode === 'general') {
      for (const q of filtered) {
        if (newSelected.size >= selectionQuota.remainingTotal) break;
        newSelected.add(q._id);
      }
    } else {
      const used = { easy: 0, medium: 0, hard: 0 };
      for (const q of filtered) {
        const d = getQuestionDifficulty(q);
        if (used[d] < (selectionQuota.remainingByDifficulty[d] ?? 0)) {
          newSelected.add(q._id);
          used[d] += 1;
        }
      }
    }
    setSelectedQuestions(newSelected);
    setSelectAll(false);
    if (newSelected.size < filtered.length) {
      toast('Selected up to the available open slots.', { icon: 'ℹ️' });
    }
  };

  const handleSelectQuestion = (questionId: string) => {
    const isSelected = selectedQuestions.has(questionId);

    // Enforce the exercise's open-slot quota when ticking (deselecting is always allowed).
    // Toasts here are intentionally clear and stay on screen for ~5s so the
    // teacher sees exactly WHY a question was rejected and WHAT to do next.
    if (!isSelected && selectionQuota) {
      const q = questions.find(x => x._id === questionId);
      if (selectionQuota.mode === 'general') {
        if (selectedQuestions.size >= selectionQuota.remainingTotal) {
          const msg = selectionQuota.remainingTotal > 0
            ? `Exercise quota reached — only ${selectionQuota.remainingTotal} slot(s) open in total. Deselect one of the questions you've already ticked before picking another.`
            : 'No open slots left in this exercise. Remove an existing question (or increase the configured count) before adding more from the bank.';
          toast(msg, { icon: '⚠️', duration: 5000, style: { maxWidth: 420 } });
          return;
        }
      } else {
        const diff = getQuestionDifficulty(q);
        const limit = selectionQuota.remainingByDifficulty[diff] ?? 0;
        const label = diff.charAt(0).toUpperCase() + diff.slice(1);
        if (limit === 0) {
          // This difficulty isn't configured at all for this exercise
          const openOther = (['easy', 'medium', 'hard'] as const)
            .filter(d => d !== diff && (selectionQuota.remainingByDifficulty[d] ?? 0) > 0)
            .map(d => `${d.charAt(0).toUpperCase() + d.slice(1)}`)
            .join(' / ');
          toast(
            openOther
              ? `This exercise doesn't accept ${label} questions. Open slots are for: ${openOther}.`
              : `This exercise doesn't accept ${label} questions and no other difficulty slots remain.`,
            { icon: '⚠️', duration: 5000, style: { maxWidth: 460 } },
          );
          return;
        }
        if (countSelectedByDifficulty(diff) >= limit) {
          // This difficulty IS configured but the teacher has already ticked the max
          const openOther = (['easy', 'medium', 'hard'] as const)
            .filter(d => d !== diff)
            .map(d => ({ d, rem: (selectionQuota.remainingByDifficulty[d] ?? 0) - countSelectedByDifficulty(d) }))
            .filter(x => x.rem > 0)
            .map(x => `${x.d.charAt(0).toUpperCase() + x.d.slice(1)} (${x.rem})`)
            .join(', ');
          toast(
            `${label} quota is full — you've already selected ${limit} of ${limit} allowed ${label.toLowerCase()} question${limit === 1 ? '' : 's'} for this exercise.` +
            (openOther
              ? ` You can still pick from: ${openOther}. Or deselect a ${label.toLowerCase()} question to swap.`
              : ` Deselect a ${label.toLowerCase()} question to swap, or change the exercise's per-difficulty quota.`),
            { icon: '⚠️', duration: 6000, style: { maxWidth: 520 } },
          );
          return;
        }
      }
    }

    const newSelected = new Set(selectedQuestions);
    if (isSelected) newSelected.delete(questionId);
    else newSelected.add(questionId);
    setSelectedQuestions(newSelected);
    setSelectAll(false);
  };

  const handleAddSelected = () => {
    const selectedQuestionsList = questions.filter(q => selectedQuestions.has(q._id));
    onSelect(selectedQuestionsList);
  };

  const getQuestionTypeIcon = (type?: string) => {
    const typeLower = type?.toLowerCase() || '';
    switch(typeLower) {
      case 'mcq': return <BookOpen className="h-4 w-4 text-purple-600" />;
      case 'programming': return <Code className="h-4 w-4 text-blue-600" />;
      case 'frontend': return <Layout className="h-4 w-4 text-amber-600" />;
      case 'database': return <Database className="h-4 w-4 text-emerald-600" />;
      default: return <BookOpen className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDifficultyBadge = (difficulty?: string) => {
    const d = (difficulty || '').toLowerCase();
    if (d === 'easy')   return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (d === 'hard')   return 'bg-rose-100 text-rose-700 border-rose-200';
    if (d === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return '';
  };

  const getQuestionTypeBadge = (type?: string) => {
    const typeLower = type?.toLowerCase() || '';
    const styles: Record<string, string> = {
      mcq: 'bg-purple-100 text-purple-800 border-purple-200',
      programming: 'bg-blue-100 text-blue-800 border-blue-200',
      frontend: 'bg-amber-100 text-amber-800 border-amber-200',
      database: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
    return styles[typeLower] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredQuestions = getFilteredQuestions();
  
  // Get header title based on filter type
  const getHeaderTitle = () => {
    if (filterByType === 'programming') return 'Programming Question Bank';
    if (filterByType === 'mcq') return 'MCQ Question Bank';
    if (filterByType === 'frontend') return 'Frontend Question Bank';
    if (filterByType === 'database') return 'Database Question Bank';
    return 'Question Bank';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center" style={{ padding: '10px 0' }}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: '60%', height: '100%' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'rgba(168,85,247,0.08)', color: '#7c3aed', border: '1px solid rgba(168,85,247,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; }}
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </button>
            )}
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">{getHeaderTitle()}</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                Assignment: <span className="text-gray-600 font-medium">{exerciseData.exerciseName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Search and Filter - Show type filter only when filterByType is 'all' */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
              />
            </div>
            
            {/* Only show type filter when filterByType is 'all' */}
            {filterByType === 'all' && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="all">All Types</option>
                  <option value="mcq">MCQ</option>
                  <option value="programming">Programming</option>
                  <option value="frontend">Frontend</option>
                  <option value="database">Database</option>
                </select>
              </div>
            )}
            
            {/* Show active filter badge when specific type is selected */}
            {filterByType !== 'all' && (
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1.5 rounded-full border ${getQuestionTypeBadge(filterByType)}`}>
                  Showing: {filterByType.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No questions found</h3>
              <p className="text-sm text-gray-500">
                {questions.length === 0 
                  ? `Question bank is empty` 
                  : searchTerm || (filterByType === 'all' && filterType !== 'all')
                    ? 'Try adjusting your filters' 
                    : `No ${filterByType !== 'all' ? filterByType : ''} questions found in the bank`}
              </p>
            </div>
          ) : (
            <div className="border border-gray-200">
              {/* Column header row */}
              <div className="flex items-center bg-gray-50 border-b border-gray-200">
                <div className="px-2 flex-shrink-0 w-7" />
                <div className="py-1.5 px-2 border-l border-gray-200 overflow-hidden" style={{ width: '25%' }}>
                  <span className="text-xs font-semibold text-gray-500">Title</span>
                </div>
                <div className="py-1.5 px-2 border-l border-gray-200 overflow-hidden" style={{ width: '50%' }}>
                  <span className="text-xs font-semibold text-gray-500">Description</span>
                </div>
                <div className="py-1.5 px-2 border-l border-gray-200 overflow-hidden" style={{ width: '25%' }}>
                  <span className="text-xs font-semibold text-gray-500">Difficulty</span>
                </div>
              </div>

              {filteredQuestions.map((question, idx) => {
                const title = getQuestionTitle(question);
                const description = getQuestionDescription(question);
                const isDuplicateQuestion = isDuplicate(question);
                const isSelected = selectedQuestions.has(question._id);
                const diff = ((question as any).difficulty || '').toLowerCase();

                return (
                  <div
                    key={question._id}
                    onClick={() => !isDuplicateQuestion && handleSelectQuestion(question._id)}
                    className={`flex items-center border-b border-gray-100 transition-colors ${
                      isDuplicateQuestion
                        ? 'opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-purple-50 cursor-pointer'
                          : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="px-2 flex items-center flex-shrink-0 w-7">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isDuplicateQuestion && handleSelectQuestion(question._id)}
                        disabled={isDuplicateQuestion}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Title — 25% */}
                    <div className="py-1.5 px-2 border-l border-gray-100 overflow-hidden" style={{ width: '25%' }}>
                      <span className="text-sm text-gray-800 truncate block">
                        {title}
                        {isDuplicateQuestion && <span className="ml-1 text-amber-500 text-xs">· exists</span>}
                      </span>
                    </div>

                    {/* Description — 50% */}
                    <div className="py-1.5 px-2 border-l border-gray-100 overflow-hidden" style={{ width: '50%' }}>
                      <span className="text-xs text-gray-500 truncate block">{description || '—'}</span>
                    </div>

                    {/* Difficulty — 25% */}
                    <div className="py-1.5 px-2 border-l border-gray-100 flex items-center gap-1 overflow-hidden" style={{ width: '25%' }}>
                      <span className={`text-xs font-medium capitalize ${
                        diff === 'easy' ? 'text-emerald-600' : diff === 'hard' ? 'text-rose-600' : diff === 'medium' ? 'text-amber-600' : 'text-gray-400'
                      }`}>
                        {diff || '—'}
                      </span>
                      {isSelected && !isDuplicateQuestion && (
                        <Check className="h-3 w-3 text-purple-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedQuestions.size} question{selectedQuestions.size !== 1 ? 's' : ''} selected
            {selectionQuota && (
              <span className="ml-2 text-xs text-gray-500">
                {selectionQuota.mode === 'general'
                  ? `· ${selectedQuestions.size}/${selectionQuota.remainingTotal} open slot${selectionQuota.remainingTotal !== 1 ? 's' : ''}`
                  : `· ${(['easy', 'medium', 'hard'] as const)
                      .filter(d => selectionQuota.remainingByDifficulty[d] > 0)
                      .map(d => `${d.charAt(0).toUpperCase() + d.slice(1)} ${countSelectedByDifficulty(d)}/${selectionQuota.remainingByDifficulty[d]}`)
                      .join(' · ')}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedQuestions.size === 0}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              Add Selected
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankSelector;