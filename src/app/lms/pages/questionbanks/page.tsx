'use client';

import { Loading } from "@/components/loading-ui/loading";
import React, { useState, useEffect } from 'react';
import {
  Plus, Filter, Search, X, ChevronDown, Terminal,
} from 'lucide-react';
import QuestionList from '../../component/questionbank/QuestionList';
import CommonFields from '../../component/questionbank/CommonFields';
import MCQFields from '../../component/questionbank/MCQFields';
import ProgrammingFields from '../../component/questionbank/ProgrammingFields';
import { questionBankService } from '@/apiServices/questionBankService';
import { Question } from '@/apiServices/type/question';
import DashboardLayout from '../../component/layout';
import { StaffLayout } from '../../component/stafflayout/staff-layout';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Default empty state ───────────────────────────────────────────────────────
const DEFAULT_PROGRAMMING_QUESTION = {
  questionType: 'Programming' as const,
  questionCategory: '',
  isActive: true,
  // Common programming fields
  title: '',
  description: '',
  difficulty: 'medium' as const,
  // Core-specific
  constraints: [],
  hints: [],
  testCases: [
    { input: '', expectedOutput: '', isSample: true, isHidden: false, explanation: '' },
  ],
  solutions: { startedCode: '', functionName: '', language: 'javascript' },
  // Frontend-specific
  constraints: [], // Ensure this exists
  // Database-specific
  sampleQuery: '',
  expectedResult: '',
  // Category selector
  category: 'core' as const,
  // Legacy fields (kept for compatibility)
  sampleInput: '',
  sampleOutput: '',
  score: 0,
};

// ─── Payload builder — only sends fields relevant to the chosen category ──────
const buildProgrammingPayload = (question: Partial<Question>) => {
  const category = (question.category as string) || 'core';

  const base = {
    questionCategory: question.questionCategory || '',
    questionType: 'Programming' as const,
    isActive: question.isActive !== undefined ? question.isActive : true,
    title: question.title || '',
    description: question.description || '',
    difficulty: (['easy', 'medium', 'hard'].includes(question.difficulty as string)
      ? question.difficulty
      : 'medium') as 'easy' | 'medium' | 'hard',
    category,
    constraints: question.constraints || [],
    hints: (question.hints || []).map((h: any, idx: number) => ({
      hintText: h.hintText || '',
      isPublic: h.isPublic || false,
      sequence: h.sequence || idx + 1,
    })),
  };

  if (category === 'core') {
    return {
      ...base,
      testCases: (question.testCases || []).map((tc: any) => ({
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || '',
        isSample: tc.isSample || false,
        isHidden: tc.isHidden || false,
        explanation: tc.explanation || '',
      })),
      solutions: question.solutions || { startedCode: '', functionName: '', language: 'javascript' },
    };
  }

  if (category === 'frontend') {
    return {
      ...base,
      constraints: question.constraints || [],
    };
  }

  if (category === 'database') {
    return {
      ...base,
      sampleQuery: question.sampleQuery || '',  // ✅ Make sure this is included
      expectedResult: question.expectedResult || '',  // ✅ Make sure this is included
    };
  }

  return base;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuestionBankPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedQuestionType, setSelectedQuestionType] = useState<'MCQ' | 'Programming'>('MCQ');
  const [categories, setCategories] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    questionType: '', category: '', difficulty: '', isActive: '', search: '',
  });

  const [newQuestion, setNewQuestion] = useState<Partial<Question>>(DEFAULT_PROGRAMMING_QUESTION);

  // ── Lifecycle ──
  useEffect(() => {
    const role = localStorage.getItem('smartcliff_roleValue');
    setUserRole(role);
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      const unique = Array.from(
        new Set(questions.map(q => q.questionCategory).filter(Boolean))
      ).sort() as string[];
      setCategories(unique);
    }
  }, [questions]);

  useEffect(() => { loadQuestions(); }, []);
  useEffect(() => { applyFilters(); }, [filters, questions]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ── Data helpers ──
  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await questionBankService.getAllQuestions();
      setQuestions(response.questions || []);
    } catch {
      showToast('Failed to load questions', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...questions];
    if (filters.questionType) filtered = filtered.filter(q => q.questionType === filters.questionType);
    if (filters.category) filtered = filtered.filter(q => q.questionCategory === filters.category);
    if (filters.difficulty) filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    if (filters.isActive !== '') filtered = filtered.filter(q => q.isActive === (filters.isActive === 'true'));
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(q =>
        (q.questionType === 'MCQ' ? q.questionTitle : q.title)?.toLowerCase().includes(s) ||
        q.description?.toLowerCase().includes(s) ||
        q.questionCategory?.toLowerCase().includes(s)
      );
    }
    setFilteredQuestions(filtered);
  };

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const resetForm = () => setNewQuestion({ ...DEFAULT_PROGRAMMING_QUESTION });

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingQuestion(null);
    resetForm();
  };

const handleFieldChange = (field: string, value: any) => {
  console.log(`Field changed: ${field} =`, value); // Add this for debugging
  setNewQuestion(prev => ({
    ...prev,
    [field]: value,
  }));
};

  // ── Create / Update ──
  const handleCreateQuestion = async () => {
    try {
      const payload = buildProgrammingPayload(newQuestion);

      if (editingQuestion?._id) {
        await questionBankService.updateQuestion(editingQuestion._id, payload);
        showToast('Question updated successfully', 'success');
      } else {
        await questionBankService.createQuestion(payload);
        showToast('Question created successfully', 'success');
      }
      closeModal();
      loadQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      showToast('Failed to save question', 'error');
    }
  };

  // ── MCQ save (FormData path) ──
  const handleMCQSave = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const endpoint = editingQuestion?._id
        ? `https://lms-server-ym1q.onrender.com/update/question-bank/${editingQuestion._id}`
        : 'https://lms-server-ym1q.onrender.com/create/question-bank';

      const response = await fetch(endpoint, {
        method: editingQuestion?._id ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('smartcliff_token')}` },
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        showToast(`Question ${editingQuestion ? 'updated' : 'saved'} successfully`, 'success');
        closeModal();
        await loadQuestions();
      } else {
        throw new Error(result.message || 'Failed to save question');
      }
    } catch (error: any) {
      showToast(`Failed to save MCQ: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Edit / Delete / Toggle ──
  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setSelectedQuestionType(question.questionType);
    if (question.questionType === 'Programming') {
      // Ensure testCases has at least one entry when editing core
      const tc = question.testCases?.length
        ? question.testCases
        : [{ input: '', expectedOutput: '', isSample: true, isHidden: false, explanation: '' }];
      setNewQuestion({ ...question, testCases: tc });
    }
    setShowCreateModal(true);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await questionBankService.deleteQuestion(id);
      showToast('Question deleted successfully', 'success');
      loadQuestions();
    } catch {
      showToast('Failed to delete question', 'error');
    }
  };

  const handleToggleStatus = async (id: string, status: boolean) => {
    try {
      await questionBankService.toggleQuestionStatus(id, status);
      setQuestions(prev => prev.map(q => q._id === id ? { ...q, isActive: status } : q));
      showToast(`Question ${status ? 'activated' : 'deactivated'}`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
      loadQuestions();
    }
  };

  // ── Stats ──
  const stats = [
    { label: 'Total', value: questions.length },
    { label: 'MCQ', value: questions.filter(q => q.questionType === 'MCQ').length },
    { label: 'Programming', value: questions.filter(q => q.questionType === 'Programming').length },
    { label: 'Active', value: questions.filter(q => q.isActive).length },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  const pageContent = (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
            }`}>
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Question Bank</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage assessment questions</p>
            </div>
            <div className="flex gap-2">
              {/* Create dropdown */}
              <div className="relative">
                <button
                  onClick={() => document.getElementById('q-type-menu')?.classList.toggle('hidden')}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus size={14} className="mr-1" /> Create Question
                  <ChevronDown size={14} className="ml-1" />
                </button>
                <div id="q-type-menu" className="absolute hidden right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setSelectedQuestionType('MCQ');
                      setEditingQuestion(null);
                      setShowCreateModal(true);
                      document.getElementById('q-type-menu')?.classList.add('hidden');
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full" /> MCQ Question
                  </button>
                  <button
                    onClick={() => {
                      setSelectedQuestionType('Programming');
                      setEditingQuestion(null);
                      resetForm();
                      setShowCreateModal(true);
                      document.getElementById('q-type-menu')?.classList.add('hidden');
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <span className="w-2 h-2 bg-purple-500 rounded-full" /> Programming Question
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-1.5 text-sm rounded transition-colors ${
                  showFilters
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <Filter size={14} className="mr-1" /> Filters
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-2 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text" placeholder="Search questions..."
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Type', key: 'questionType', options: [{ v: '', l: 'All' }, { v: 'MCQ', l: 'MCQ' }, { v: 'Programming', l: 'Programming' }] },
                      { label: 'Difficulty', key: 'difficulty', options: [{ v: '', l: 'All' }, { v: 'easy', l: 'easy' }, { v: 'medium', l: 'medium' }, { v: 'hard', l: 'hard' }] },
                      { label: 'Status', key: 'isActive', options: [{ v: '', l: 'All' }, { v: 'true', l: 'Active' }, { v: 'false', l: 'Inactive' }] },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">{f.label}</label>
                        <select
                          value={(filters as any)[f.key]}
                          onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        >
                          {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Category</label>
                      <select
                        value={filters.category}
                        onChange={e => setFilters({ ...filters, category: e.target.value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">All</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">{filteredQuestions.length} questions</span>
                    <button
                      onClick={() => setFilters({ questionType: '', category: '', difficulty: '', isActive: '', search: '' })}
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

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-3">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{s.value}</div>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              Questions ({filteredQuestions.length})
            </span>
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
        </div>
      </main>

      {/* MCQ Modal */}
      {showCreateModal && selectedQuestionType === 'MCQ' && (
        <MCQFields
          initialData={editingQuestion ? [editingQuestion] : null}
          isEditing={!!editingQuestion}
          questionId={editingQuestion?._id}
          onClose={closeModal}
          onSave={handleMCQSave}
          isSaving={false}
          saveProgress={0}
          saveMessage=""
          categories={categories}
        />
      )}

      {/* Programming Modal */}
      <AnimatePresence>
        {showCreateModal && selectedQuestionType === 'Programming' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm z-50 overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 w-screen h-screen flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-500">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Terminal size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {editingQuestion ? 'Edit Programming Question' : 'Add Programming Question'}
                    </h2>
                    <p className="text-[10px] text-white/70">Core Programming, Frontend & Database questions</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={18} className="text-white" />
                </button>
              </div>

              {/* Modal Body — scrollable */}
              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-950 px-6 py-6">
                <div className="max-w-5xl mx-auto">
                  {/* Common Fields (category label + active toggle) */}
                  <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <CommonFields
                      data={{
                        questionCategory: newQuestion.questionCategory || '',
                        isActive: newQuestion.isActive ?? true,
                      }}
                      onChange={handleFieldChange}
                      categories={categories}
                    />
                  </div>

                  {/* Programming Fields */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <ProgrammingFields
  data={{
    title: newQuestion.title || '',
    description: newQuestion.description || '',
    difficulty: (['easy', 'medium', 'hard'].includes(newQuestion.difficulty as string)
      ? newQuestion.difficulty : 'medium') as 'easy' | 'medium' | 'hard',
    sampleInput: newQuestion.sampleInput || '',
    sampleOutput: newQuestion.sampleOutput || '',
    score: newQuestion.score || 0,
    constraints: newQuestion.constraints || [],
    hints: newQuestion.hints || [],
    testCases: newQuestion.testCases?.length
      ? newQuestion.testCases
      : [{ input: '', expectedOutput: '', isSample: true, isHidden: false, explanation: '' }],
    solutions: newQuestion.solutions || { startedCode: '', functionName: '', language: 'javascript' },
    category: (newQuestion.category as any) || 'core',
    constraints: newQuestion.constraints || [],
    sampleQuery: newQuestion.sampleQuery || '',        // ✅ Add this
    expectedResult: newQuestion.expectedResult || '',  // ✅ Add this
  }}
  onChange={handleFieldChange}
/>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={closeModal}
                    className="px-5 py-2 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={handleCreateQuestion}
                    className="px-6 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:opacity-90 transition-all"
                  >
                    {editingQuestion ? '✓ Update Question' : '✓ Create Question'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (userRole === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loading size="size-8" />
      </div>
    );
  }

  return userRole === 'admin'
    ? <DashboardLayout>{pageContent}</DashboardLayout>
    : <StaffLayout>{pageContent}</StaffLayout>;
}