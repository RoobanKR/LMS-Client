import React, { useState, useEffect } from 'react';
import { X, Search, Filter, Loader, Check, ChevronRight, ChevronLeft, BookOpen, Code, Database, Layout, AlertCircle } from 'lucide-react';
import { questionBankService } from '@/apiServices/questionBankService';
import { toast } from 'react-toastify';
import { Question } from '../../QuestionsView';

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
}

const QuestionBankSelector: React.FC<QuestionBankSelectorProps> = ({
  exerciseData,
  tabType,
  onClose,
  onBack,
  onSelect,
  existingQuestionIds,
  existingQuestions = [],
  filterByType = 'all' // ✅ Default to 'all' to show all question types
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
          toast.info('No questions found in question bank');
        }
      } else {
        setQuestions([]);
        toast.info('No questions found in question bank');
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

  const handleSelectAll = () => {
    const filtered = getFilteredQuestions();
    if (selectAll) {
      setSelectedQuestions(new Set());
    } else {
      const newSelected = new Set<string>();
      filtered.forEach(q => newSelected.add(q._id));
      setSelectedQuestions(newSelected);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectQuestion = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
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
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: 'rgba(168,85,247,0.08)', color: '#7c3aed', border: '1px solid rgba(168,85,247,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; }}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getHeaderTitle()}</h2>
              <p className="text-gray-600 text-sm mt-1">
                Select {filterByType !== 'all' ? filterByType : ''} questions to add to "{exerciseData.exerciseName}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
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
        <div className="flex-1 overflow-y-auto p-6">
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
            <div className="space-y-2">
              {/* Select All Row */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Select All ({filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''})
                  </span>
                </label>
              </div>

              {filteredQuestions.map((question) => {
                const title = getQuestionTitle(question);
                const description = getQuestionDescription(question);
                const isDuplicateQuestion = isDuplicate(question);
                const isSelected = selectedQuestions.has(question._id);
                const questionType = question.questionType?.toLowerCase() || '';

                return (
                  <div
                    key={question._id}
                    className={`flex items-start gap-3 p-3 border rounded-lg transition-all ${
                      isDuplicateQuestion 
                        ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' 
                        : isSelected 
                          ? 'border-purple-400 bg-purple-50 cursor-pointer' 
                          : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 cursor-pointer'
                    }`}
                    onClick={() => !isDuplicateQuestion && handleSelectQuestion(question._id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => !isDuplicateQuestion && handleSelectQuestion(question._id)}
                      disabled={isDuplicateQuestion}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getQuestionTypeBadge(question.questionType)}`}>
                          {question.questionType?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        
                        {/* Duplicate indicator */}
                        {isDuplicateQuestion && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Already exists
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {title}
                        {isDuplicateQuestion && <span className="ml-2 text-amber-600 text-xs">(Duplicate)</span>}
                      </p>
                      
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {description}
                      </p>
                    </div>

                    {isSelected && !isDuplicateQuestion && (
                      <Check className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    )}
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