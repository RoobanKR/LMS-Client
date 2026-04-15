'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Filter,
  Search,
  Download,
  Upload,
  X,
  ChevronDown,
  Moon,
  Sun
} from 'lucide-react';
import QuestionList from '../../component/questionbank/QuestionList';
import CommonFields from '../../component/questionbank/CommonFields';
import MCQFields from '../../component/questionbank/MCQFields';
import ProgrammingFields from '../../component/questionbank/ProgrammingFields';
import { questionBankService } from '@/apiServices/questionBankService';
import { Question } from '@/apiServices/type/question';
import { StudentLayout } from '../../component/student/student-layout';
import DashboardLayout from '../../component/layout';
import { StaffLayout } from '../../component/stafflayout/staff-layout';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuestionBankPage() {
  // State for role-based layout
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Dark mode state

  
  // State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedQuestionType, setSelectedQuestionType] = useState<'MCQ' | 'Programming'>('MCQ');

  // Dynamic categories from existing questions
  const [categories, setCategories] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    questionType: '',
    category: '',
    difficulty: '',
    isActive: '',
    search: '',
  });

  // New question form
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    questionType: 'MCQ',
    questionCategory: '',
    isActive: true,
    questionTitle: '',
    options: [],
    correctAnswer: '',
    title: '',
    description: '',
    difficulty: 'Medium',
    sampleInput: '',
    sampleOutput: '',
    score: 0,
    constraints: [],
    hints: [],
    testCases: [],
    solutions: {
      startedCode: '',
      functionName: '',
      language: 'javascript',
    },
  });

  // Initialize dark mode from localStorage or system preference

  // Apply dark mode class to html element
  

  // Get user role from localStorage on component mount
  useEffect(() => {
    const role = localStorage.getItem('smartcliff_roleValue');
    setUserRole(role);
  }, []);

  // Extract unique categories from questions
  useEffect(() => {
    if (questions.length > 0) {
      const uniqueCategories = Array.from(
        new Set(
          questions
            .map(q => q.questionCategory)
            .filter(category => category && category.trim() !== '')
        )
      ).sort();
      setCategories(uniqueCategories);
    }
  }, [questions]);

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [filters, questions]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await questionBankService.getAllQuestions();
      setQuestions(response.questions || []);
    } catch (error) {
      console.error('Error loading questions:', error);
      showToast('Failed to load questions', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...questions];

    if (filters.questionType) {
      filtered = filtered.filter(q => q.questionType === filters.questionType);
    }
    if (filters.category) {
      filtered = filtered.filter(q => q.questionCategory === filters.category);
    }
    if (filters.difficulty) {
      filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    }
    if (filters.isActive !== '') {
      filtered = filtered.filter(q => q.isActive === (filters.isActive === 'true'));
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        q =>
          (q.questionType === 'MCQ'
            ? q.questionTitle?.toLowerCase().includes(searchLower)
            : q.title?.toLowerCase().includes(searchLower)) ||
          q.description?.toLowerCase().includes(searchLower) ||
          q.questionCategory?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredQuestions(filtered);
  };

  const handleCreateQuestion = async () => {
    try {
      const payload = prepareQuestionPayload(newQuestion);

      if (editingQuestion?._id) {
        await questionBankService.updateQuestion(editingQuestion._id, payload);
        showToast('Question updated successfully', 'success');
      } else {
        await questionBankService.createQuestion(payload);
        showToast('Question created successfully', 'success');
      }

      setShowCreateModal(false);
      setEditingQuestion(null);
      resetForm();
      loadQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      showToast('Failed to save question', 'error');
    }
  };

  const prepareQuestionPayload = (question: Partial<Question>) => {
    const baseFields = {
      questionCategory: question.questionCategory || '',
      questionType: question.questionType as 'MCQ' | 'Programming',
      isActive: question.isActive !== undefined ? question.isActive : true,
    };

    if (question.questionType === 'MCQ') {
      return {
        ...baseFields,
        questionTitle: question.questionTitle || '',
        options: question.options || [],
        correctAnswer: question.correctAnswer || '',
      };
    } else {
      return {
        ...baseFields,
        title: question.title || '',
        description: question.description || '',
        difficulty: question.difficulty || 'Medium',
        sampleInput: question.sampleInput || '',
        sampleOutput: question.sampleOutput || '',
        score: question.score || 0,
        constraints: question.constraints || [],
        hints: question.hints || [],
        testCases: question.testCases || [],
        solutions: question.solutions || {
          startedCode: '',
          functionName: '',
          language: 'javascript',
        },
        timeLimit: question.timeLimit,
        memoryLimit: question.memoryLimit,
      };
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setSelectedQuestionType(question.questionType);

    if (question.questionType === 'MCQ') {
      // Open MCQ modal with edit data
      setShowCreateModal(true);
    } else {
      // For programming questions, use the simple form
      setNewQuestion(question);
      setShowCreateModal(true);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        await questionBankService.deleteQuestion(id);
        showToast('Question deleted successfully', 'success');
        loadQuestions();
      } catch (error) {
        console.error('Error deleting question:', error);
        showToast('Failed to delete question', 'error');
      }
    }
  };

  const handleToggleStatus = async (id: string, status: boolean) => {
    try {
      await questionBankService.toggleQuestionStatus(id, status);
      setQuestions(prevQuestions =>
        prevQuestions.map(q => (q._id === id ? { ...q, isActive: status } : q))
      );
      showToast(`Question ${status ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (error) {
      console.error('Error updating question status:', error);
      showToast('Failed to update question status', 'error');
      loadQuestions();
    }
  };

  const resetForm = () => {
    setNewQuestion({
      questionType: 'MCQ',
      questionCategory: '',
      isActive: true,
      questionTitle: '',
      options: [],
      correctAnswer: '',
      title: '',
      description: '',
      difficulty: 'Medium',
      sampleInput: '',
      sampleOutput: '',
      score: 0,
      constraints: [],
      hints: [],
      testCases: [],
      solutions: {
        startedCode: '',
        functionName: '',
        language: 'javascript',
      },
    });
  };

  const handleFieldChange = (field: string, value: any) => {
    setNewQuestion(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };


const handleMCQSave = async (formData: FormData) => {
  try {
    setIsLoading(true);

    // Check if we're editing an existing question
    const isEditingQuestion = !!editingQuestion;
    
    // For updates, use the specific question ID
    const endpoint = isEditingQuestion && editingQuestion._id
      ? `https://lms-server-ym1q.onrender.com/update/question-bank/${editingQuestion._id}`
      : 'https://lms-server-ym1q.onrender.com/create/question-bank';
    
    const method = isEditingQuestion ? 'PUT' : 'POST';

    console.log(`${method} request to:`, endpoint);
    console.log('Editing question ID:', editingQuestion?._id);

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('smartcliff_token')}`,
      },
      body: formData,
    });

    const result = await response.json();

    console.log('API Response:', result);

    if (result.success) {
      showToast(
        `Successfully ${isEditingQuestion ? 'updated' : 'saved'} question`,
        'success'
      );
      setShowCreateModal(false);
      setEditingQuestion(null);
      await loadQuestions(); // Refresh the list
    } else {
      throw new Error(result.message || 'Failed to save question');
    }
  } catch (error) {
    console.error(`Error ${editingQuestion ? 'updating' : 'saving'} MCQ question:`, error);
    showToast(`Failed to ${editingQuestion ? 'update' : 'save'} MCQ question: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  } finally {
    setIsLoading(false);
  }
};
  // Stats data
  const stats = [
    {
      label: 'Total',
      value: questions.length,
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    {
      label: 'MCQ',
      value: questions.filter(q => q.questionType === 'MCQ').length,
      color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    {
      label: 'Programming',
      value: questions.filter(q => q.questionType === 'Programming').length,
      color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    },
    {
      label: 'Active',
      value: questions.filter(q => q.isActive).length,
      color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
  ];

  // Main content of the page
  const pageContent = (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50"
          >
            <div
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                toast.type === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
              }`}
            >
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Question Bank
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage assessment questions
              </p>
            </div>
             <div className="flex gap-2">
              {/* Dark Mode Toggle */}
            
              <div className="relative">
                <button
                  onClick={() => {
                    const menu = document.getElementById('question-type-menu');
                    if (menu) menu.classList.toggle('hidden');
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Plus size={14} className="mr-1" />
                  Create Question
                  <ChevronDown size={14} className="ml-1" />
                </button>
                <div
                  id="question-type-menu"
                  className="absolute hidden right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg dark:shadow-gray-900/30 z-50 border border-gray-200 dark:border-gray-700"
                >
                  <button
                    onClick={() => {
                      setSelectedQuestionType('MCQ');
                      setEditingQuestion(null);
                      setShowCreateModal(true);
                      document.getElementById('question-type-menu')?.classList.add('hidden');
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    MCQ Question
                  </button>
                  <button
                    onClick={() => {
                      setSelectedQuestionType('Programming');
                      setEditingQuestion(null);
                      resetForm();
                      setNewQuestion(prev => ({ ...prev, questionType: 'Programming' }));
                      setShowCreateModal(true);
                      document.getElementById('question-type-menu')?.classList.add('hidden');
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Programming Question
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-1.5 text-sm rounded transition-colors ${
                  showFilters
                    ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <Filter size={14} className="mr-1" />
                Filters
              </button>
            </div>
          </div>

          {/* Compact Search Bar */}
          <div className="mt-2">
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                size={14}
              />
              <input
                type="text"
                placeholder="Search questions..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Compact Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                        Type
                      </label>
                      <select
                        value={filters.questionType}
                        onChange={e => setFilters({ ...filters, questionType: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">All</option>
                        <option value="MCQ">MCQ</option>
                        <option value="Programming">Programming</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">All</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                        Difficulty
                      </label>
                      <select
                        value={filters.difficulty}
                        onChange={e => setFilters({ ...filters, difficulty: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">All</option>
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                        Status
                      </label>
                      <select
                        value={filters.isActive}
                        onChange={e => setFilters({ ...filters, isActive: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">All</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {filteredQuestions.length} questions
                    </div>
                    <button
                      onClick={() =>
                        setFilters({
                          questionType: '',
                          category: '',
                          difficulty: '',
                          isActive: '',
                          search: '',
                        })
                      }
                      className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-3">
        {/* Compact Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-2 mb-3"
        >
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-800"
            >
              <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{stat.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Questions List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800"
        >
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center">
              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                Questions ({filteredQuestions.length})
              </div>
            </div>
          </div>
          <div className="p-3">
            <QuestionList
              questions={filteredQuestions}
              onEdit={handleEditQuestion}
              onDelete={handleDeleteQuestion}
              onToggleStatus={handleToggleStatus}
              isLoading={isLoading}
            />
          </div>
        </motion.div>
      </main>

{showCreateModal && selectedQuestionType === 'MCQ' && (
  <MCQFields
    initialData={editingQuestion ? [editingQuestion] : null}
    isEditing={!!editingQuestion}
    questionId={editingQuestion?._id}  // This is correct
    onClose={() => {
      setShowCreateModal(false);
      setEditingQuestion(null);
    }}
    onSave={handleMCQSave}  // This will now receive the ID
    isSaving={false}
    saveProgress={0}
    saveMessage=""
    categories={categories}
  />
)}

      {/* Programming Modal - Simple form */}
      <AnimatePresence>
        {showCreateModal && selectedQuestionType === 'Programming' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-800 z-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {editingQuestion ? 'Edit Programming Question' : 'New Programming Question'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Programming Question
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingQuestion(null);
                      resetForm();
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleCreateQuestion();
                  }}
                >
                  {/* Common Fields */}
                  <div className="mb-4">
                    <CommonFields
                      data={{
                        questionCategory: newQuestion.questionCategory || '',
                        isActive: newQuestion.isActive || false,
                      }}
                      onChange={handleFieldChange}
                      categories={categories}
                    />
                  </div>

                  {/* Programming Fields */}
                  <div className="mb-4">
                    <ProgrammingFields
                      data={{
                        title: newQuestion.title || '',
                        description: newQuestion.description || '',
                        difficulty: (['Easy', 'Medium', 'Hard'].includes(
                          newQuestion.difficulty as string
                        )
                          ? newQuestion.difficulty
                          : 'Medium') as 'Easy' | 'Medium' | 'Hard',
                        sampleInput: newQuestion.sampleInput || '',
                        sampleOutput: newQuestion.sampleOutput || '',
                        score: newQuestion.score || 0,
                        constraints: newQuestion.constraints || [],
                        hints: newQuestion.hints || [],
                        testCases: newQuestion.testCases || [],
                        solutions: newQuestion.solutions || {
                          startedCode: '',
                          functionName: '',
                          language: 'javascript',
                        },
                        timeLimit: newQuestion.timeLimit,
                        memoryLimit: newQuestion.memoryLimit,
                      }}
                      onChange={handleFieldChange}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="sticky bottom-0 bg-white dark:bg-gray-900 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          setEditingQuestion(null);
                          resetForm();
                        }}
                        className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        {editingQuestion ? 'Update' : 'Create'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Show loading state while determining role
  if (userRole === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  // Conditionally wrap with appropriate layout based on user role
  // Only admin gets DashboardLayout, all other roles get StaffLayout
  if (userRole === 'admin') {
    return <DashboardLayout>{pageContent}</DashboardLayout>;
  } else {
    // This includes programcoordinator, faculty, student, and any other role
    return <StaffLayout>{pageContent}</StaffLayout>;
  }
}