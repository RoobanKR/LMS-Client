import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, AlertCircle, Loader, X, Copy, ChevronUp, ChevronDown, Sparkles,
  List, CheckSquare, AlignLeft, ChevronDown as ChevronDownIcon,
  Bold, Italic, Underline, Image, HelpCircle,
  ZoomIn, ZoomOut, Settings, ChevronRight,
  FilePlus, Layout, Check, Hash, RefreshCw, Save,
  BookOpen, SlidersHorizontal, Pencil, Type
} from 'lucide-react';

import GenerateMCQAIQuestion, { GeneratedQuestion } from './GenerateMCQAIQuestion';

const GEMINI_API_KEY = "AIzaSyCL0ui5QXP3OEsxf7l4Wv4wjq7L_MA4Hlg";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_API_URL_FALLBACK = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

type QuestionType = 'short-answer' | 'paragraph' | 'multiple-choice' | 'checkboxes' | 'dropdown';

interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
  imageUrl?: string;
  imageAlignment?: 'left' | 'center' | 'right';
  imageSizePercent?: number;
}

interface QuestionBlock {
  id: string;
  type: QuestionType;
  questionText: string;
  questionImageUrl?: string;
  questionImageAlignment?: 'left' | 'center' | 'right';
  questionImageSizePercent?: number;
  optionsPerRow?: 1 | 2 | 3 | 4;
  options: MCQOption[];
  isRequired: boolean;
  hasOtherOption?: boolean;
  hasExplanation?: boolean;
  explanation?: string;
  title?: string;
  description?: string;
  score?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
  memoryLimit?: number;
  isActive?: boolean;
  sequence?: number;
  sampleInput?: string;
  sampleOutput?: string;
  isCollapsed?: boolean;
}

interface MCQQuestionFormProps {
  breadcrumbs: any;
  exerciseData: any;
  tabType: string;
  initialData?: any;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (questionData: any) => void;
  isSaving?: boolean;
  saveProgress?: number;
  saveMessage?: string;
}

interface QuestionTemplateConfig {
  questionType: QuestionType;
  numberOfQuestions: number;
  optionsPerRow: 1 | 2 | 3 | 4;
  numberOfOptions: number;
  hasExplanations: boolean;
  hasImages: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  baseScore: number;
}

const getStorageKey = (exerciseId?: string) => exerciseId ? `mcq_question_form_draft_${exerciseId}` : null;

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const diffConfig = {
  easy: { label: 'Easy', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', btn: 'bg-emerald-500 text-white' },
  medium: { label: 'Medium', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', btn: 'bg-amber-500 text-white' },
  hard: { label: 'Hard', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', btn: 'bg-red-500 text-white' },
};

const typeConfig: Record<QuestionType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  'multiple-choice': { label: 'Multiple Choice', icon: <List className="h-3.5 w-3.5" />, color: 'text-violet-600', bg: 'bg-violet-50' },
  'checkboxes': { label: 'Checkboxes', icon: <CheckSquare className="h-3.5 w-3.5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
  'dropdown': { label: 'Dropdown', icon: <ChevronDownIcon className="h-3.5 w-3.5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  'short-answer': { label: 'Short Answer', icon: <AlignLeft className="h-3.5 w-3.5" />, color: 'text-orange-600', bg: 'bg-orange-50' },
  'paragraph': { label: 'Paragraph', icon: <BookOpen className="h-3.5 w-3.5" />, color: 'text-teal-600', bg: 'bg-teal-50' },
};

// ─── MARKS/LIMIT COMPUTATION HELPERS ────────────────────────────────────────
const getMaxMcqMarks = (exerciseData: any): number => {
  const fullData = exerciseData?.fullExerciseData;
  const exerciseType = (fullData?.exerciseType || exerciseData?.exerciseType || '').toLowerCase();
  const info = fullData?.exerciseInformation || fullData?.exerciseInfo || {};
  if (exerciseType.includes('combined')) {
    return Number(info.totalMarksMCQ ?? info.totalMcqMarks ?? 0);
  }
  return Number(info.totalMarks ?? info.totalMcqMarks ?? 0);
};

const getExistingMcqMarks = (exerciseData: any): number => {
  const questions: any[] = exerciseData?.fullExerciseData?.questions || [];
  return questions
    .filter((q: any) => q.questionType === 'mcq')
    .reduce((sum: number, q: any) => sum + Number(q.mcqQuestionScore ?? q.score ?? 0), 0);
};

const getExistingMcqCount = (exerciseData: any): number => {
  const questions: any[] = exerciseData?.fullExerciseData?.questions || [];
  return questions.filter((q: any) => q.questionType === 'mcq').length;
};

// ─── BREADCRUMB COMPONENT (matches ProgrammingQuestionForm style) ────────────
const BreadcrumbArrow: React.FC = () => (
  <span className="text-green-600 mx-1.5 text-[13px] leading-none font-bold select-none align-middle">»</span>
);

interface BreadcrumbItem { label: string; }

const QuestionFormBreadcrumb: React.FC<{
  breadcrumbs: any[];
  tabType: string;
  exerciseName?: string;
  actionLabel: string;
  questionLabel: string;
}> = ({ breadcrumbs, tabType, exerciseName, actionLabel, questionLabel }) => {
  return (
    <nav className="flex items-center" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-y-0.5">
        {breadcrumbs.map((crumb: any, idx: number) => (
          <React.Fragment key={`bc-${idx}`}>
            <li className="flex items-center">
              {crumb.path ? (
                <a href={crumb.path} className="text-[13px] font-medium text-slate-700 hover:text-green-600 cursor-pointer transition-colors truncate max-w-[120px] leading-none" title={crumb.name}>
                  {crumb.name}
                </a>
              ) : (
                <span className="text-[13px] font-medium text-slate-700 truncate max-w-[120px] leading-none cursor-default" title={crumb.name}>
                  {crumb.name}
                </span>
              )}
            </li>
            <li aria-hidden className="flex items-center"><BreadcrumbArrow /></li>
          </React.Fragment>
        ))}
        {tabType && (
          <>
            <li className="flex items-center">
              <span className="text-[13px] font-medium text-slate-700 capitalize leading-none">{tabType}</span>
            </li>
            <li aria-hidden className="flex items-center"><BreadcrumbArrow /></li>
          </>
        )}
        {exerciseName && (
          <>
            <li className="flex items-center">
              <span className="text-[13px] font-medium text-slate-700 truncate max-w-[140px] leading-none" title={exerciseName}>{exerciseName}</span>
            </li>
            <li aria-hidden className="flex items-center"><BreadcrumbArrow /></li>
          </>
        )}
        <li className="flex items-center">
          <span className="text-[13px] font-medium text-slate-700 leading-none">{actionLabel}</span>
        </li>
        {questionLabel && questionLabel !== actionLabel && (
          <>
            <li aria-hidden className="flex items-center"><BreadcrumbArrow /></li>
            <li className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-slate-800 leading-none">{questionLabel}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </li>
          </>
        )}
      </ol>
    </nav>
  );
};

// ─── RIGHT SIDEBAR TOOLBAR ───────────────────────────────────────────────────
const RightSidebarToolbar: React.FC<{
  onAddQuestion: () => void;
  onImportQuestion: () => void;
  onFocusRichText: () => void;
  onAddImage: (file: File) => void;
  hasActiveBlock: boolean;
  limitReached: boolean;
}> = ({ onAddQuestion, onImportQuestion, onFocusRichText, onAddImage, hasActiveBlock, limitReached }) => {
  const sidebarImageInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    {
      id: 'add',
      icon: <Plus className="h-5 w-5" />,
      label: 'Add question',
      onClick: onAddQuestion,
      disabled: limitReached,
      color: limitReached ? 'text-slate-300' : 'text-slate-600 hover:text-violet-600 hover:bg-violet-50',
    },
    {
      id: 'import',
      icon: <FilePlus className="h-5 w-5" />,
      label: 'Import question',
      onClick: onImportQuestion,
      disabled: false,
      color: 'text-slate-600 hover:text-blue-600 hover:bg-blue-50',
    },
    {
      id: 'richtext',
      icon: <Type className="h-5 w-5" />,
      label: 'Focus rich text',
      onClick: onFocusRichText,
      disabled: !hasActiveBlock,
      color: !hasActiveBlock ? 'text-slate-300' : 'text-slate-600 hover:text-teal-600 hover:bg-teal-50',
    },
    {
      id: 'image',
      icon: <Image className="h-5 w-5" />,
      label: 'Add image to question',
      onClick: () => { if (hasActiveBlock) sidebarImageInputRef.current?.click(); },
      disabled: !hasActiveBlock,
      color: !hasActiveBlock ? 'text-slate-300' : 'text-slate-600 hover:text-orange-600 hover:bg-orange-50',
    },
  ];

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 px-1.5">
      {tools.map((tool, i) => (
        <React.Fragment key={tool.id}>
          {i === 2 && <div className="w-full h-px bg-slate-100 my-0.5" />}
          <div className="relative group">
            <button
              onClick={tool.onClick}
              disabled={tool.disabled}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${tool.color} disabled:cursor-not-allowed`}
              title={tool.label}
            >
              {tool.icon}
            </button>
            {/* Tooltip */}
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                {tool.label}
                <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900" />
              </div>
            </div>
          </div>
        </React.Fragment>
      ))}
      <input
        ref={sidebarImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) { onAddImage(f); e.target.value = ''; }
        }}
      />
    </div>
  );
};

// ─── SMALL MODAL ────────────────────────────────────────────────────────────
const SmallModal: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}> = ({ icon, iconBg, title, children }) => (
  <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  </div>
);

const ModalActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 pt-3">{children}</div>
);

const BtnPrimary: React.FC<{ onClick: () => void; disabled?: boolean; className?: string; children: React.ReactNode }> = ({ onClick, disabled, className = '', children }) => (
  <button onClick={onClick} disabled={disabled} className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 ${className}`}>{children}</button>
);

const BtnSecondary: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ onClick, disabled, children }) => (
  <button onClick={onClick} disabled={disabled} className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50">{children}</button>
);

// ─── DIALOGS ─────────────────────────────────────────────────────────────────
const ConfirmationDialog: React.FC<{ isOpen: boolean; onConfirm: () => void; onCancel: () => void; message: string }> = ({ isOpen, onConfirm, onCancel, message }) => {
  if (!isOpen) return null;
  return (
    <SmallModal icon={<AlertCircle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50" title="Confirm Action">
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{message}</p>
      <ModalActions>
        <BtnSecondary onClick={onCancel}>Keep Editing</BtnSecondary>
        <BtnPrimary onClick={onConfirm} className="bg-red-500 hover:bg-red-600">Discard</BtnPrimary>
      </ModalActions>
    </SmallModal>
  );
};

// Unfilled blocks dialog
const UnfilledBlocksDialog: React.FC<{
  isOpen: boolean;
  unfilledCount: number;
  onClose: () => void;
}> = ({ isOpen, unfilledCount, onClose }) => {
  if (!isOpen) return null;
  return (
    <SmallModal icon={<AlertCircle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50" title="Questions Not Filled">
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        You have <strong>{unfilledCount}</strong> question{unfilledCount > 1 ? 's' : ''} with empty question text. Please fill all existing questions before adding a new one.
      </p>
      <ModalActions>
        <BtnPrimary onClick={onClose} className="bg-violet-600 hover:bg-violet-700">OK, got it</BtnPrimary>
      </ModalActions>
    </SmallModal>
  );
};

const RegenerationComparisonDialog: React.FC<{
  isOpen: boolean;
  originalQuestion: QuestionBlock | null;
  regeneratedQuestion: QuestionBlock | null;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
}> = ({ isOpen, originalQuestion, regeneratedQuestion, onAccept, onReject, onRegenerate }) => {
  if (!isOpen || !originalQuestion || !regeneratedQuestion) return null;
  const originalText = originalQuestion.questionText.replace(/<[^>]*>/g, '').trim();
  const regeneratedText = regeneratedQuestion.questionText.replace(/<[^>]*>/g, '').trim();
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center"><Sparkles className="h-4 w-4 text-violet-600" /></div>
          <div><h3 className="text-sm font-bold text-slate-900">Review Regenerated Question</h3><p className="text-[11px] text-slate-400 mt-0.5">Compare and decide which version to keep</p></div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[11px] font-semibold text-slate-500">Original (Duplicate)</span></div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 min-h-[80px]">
              <p className="text-xs text-slate-700 leading-relaxed">{originalText || 'Empty'}</p>
              {originalQuestion.options.length > 0 && <div className="mt-2 space-y-1">{originalQuestion.options.slice(0, 3).map((opt, i) => <p key={i} className="text-[10px] text-slate-500">• {opt.text}</p>)}</div>}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[11px] font-semibold text-slate-500">New Question</span></div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 min-h-[80px]">
              <p className="text-xs text-slate-700 leading-relaxed">{regeneratedText || 'Empty'}</p>
              {regeneratedQuestion.options.length > 0 && <div className="mt-2 space-y-1">{regeneratedQuestion.options.slice(0, 3).map((opt, i) => <p key={i} className="text-[10px] text-slate-500">• {opt.text}</p>)}</div>}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-2">
          <BtnSecondary onClick={onReject}>Cancel</BtnSecondary>
          <BtnPrimary onClick={onRegenerate} className="bg-violet-600 hover:bg-violet-700"><RefreshCw className="h-3 w-3" />Try Again</BtnPrimary>
          <BtnPrimary onClick={onAccept} className="bg-emerald-600 hover:bg-emerald-700"><Check className="h-3 w-3" />Accept New</BtnPrimary>
        </div>
      </div>
    </div>
  );
};

const SingleDuplicateDialog: React.FC<{
  isOpen: boolean; onConfirm: () => void; onRegenerate: () => void; onCancel: () => void;
  currentQuestion: QuestionBlock | null; duplicateQuestion: QuestionBlock | null;
  isRegenerating?: boolean; regenerationError?: string | null;
}> = ({ isOpen, onConfirm, onRegenerate, onCancel, currentQuestion, duplicateQuestion, isRegenerating, regenerationError }) => {
  if (!isOpen || !currentQuestion || !duplicateQuestion) return null;
  if (isRegenerating) return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 p-8 text-center">
        <Loader className="h-8 w-8 text-violet-500 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-800">Regenerating…</p>
        <p className="text-xs text-slate-400 mt-1">Creating a unique version with AI</p>
      </div>
    </div>
  );
  if (regenerationError) return (
    <SmallModal icon={<AlertCircle className="h-4 w-4 text-red-500" />} iconBg="bg-red-50" title="Regeneration Failed">
      <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3"><p className="text-xs text-red-700">{regenerationError}</p></div>
      <ModalActions><BtnSecondary onClick={onCancel}>Cancel</BtnSecondary><BtnPrimary onClick={onRegenerate} className="bg-violet-600 hover:bg-violet-700"><RefreshCw className="h-3 w-3" />Try Again</BtnPrimary></ModalActions>
    </SmallModal>
  );
  const currentText = currentQuestion.questionText.replace(/<[^>]*>/g, '').trim();
  const duplicateText = duplicateQuestion.questionText.replace(/<[^>]*>/g, '').trim();
  return (
    <SmallModal icon={<Copy className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50" title="Duplicate Detected">
      <div className="space-y-2 mb-3">
        <div><p className="text-[10px] font-semibold text-slate-400 mb-1">Current Question</p><div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5"><p className="text-xs text-slate-700 line-clamp-2">{currentText || 'Empty'}</p></div></div>
        <div><p className="text-[10px] font-semibold text-slate-400 mb-1">Similar Existing</p><div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5"><p className="text-xs text-slate-700 line-clamp-2">{duplicateText || 'Empty'}</p></div></div>
      </div>
      <ModalActions>
        <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
        <BtnPrimary onClick={onConfirm} className="bg-amber-500 hover:bg-amber-600">Add Anyway</BtnPrimary>
        <BtnPrimary onClick={onRegenerate} className="bg-violet-600 hover:bg-violet-700"><Sparkles className="h-3 w-3" />Regenerate</BtnPrimary>
      </ModalActions>
    </SmallModal>
  );
};

const DuplicateWarningDialog: React.FC<{
  isOpen: boolean; onConfirm: () => void; onRegenerate: () => void; onCancel: () => void; duplicateCount: number;
}> = ({ isOpen, onConfirm, onRegenerate, onCancel, duplicateCount }) => {
  if (!isOpen) return null;
  return (
    <SmallModal icon={<Copy className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50" title={`${duplicateCount} Duplicate${duplicateCount > 1 ? 's' : ''} Found`}>
      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-3">
        <p className="text-xs text-amber-800 leading-relaxed">{duplicateCount === 1 ? 'This question appears to already exist.' : `${duplicateCount} questions appear to already exist.`} You can regenerate unique questions with AI, add them anyway, or cancel.</p>
      </div>
      <ModalActions>
        <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
        <BtnPrimary onClick={onConfirm} className="bg-amber-500 hover:bg-amber-600">Add Anyway</BtnPrimary>
        <BtnPrimary onClick={onRegenerate} className="bg-violet-600 hover:bg-violet-700"><Sparkles className="h-3 w-3" />Regenerate</BtnPrimary>
      </ModalActions>
    </SmallModal>
  );
};

const SaveDuplicateDialog: React.FC<{
  isOpen: boolean; onRegenerate: () => void; onAddAnyway: () => void; onDeleteDuplicates: () => void;
  duplicateCount: number; duplicateQuestions: QuestionBlock[];
}> = ({ isOpen, onRegenerate, onAddAnyway, onDeleteDuplicates, duplicateCount, duplicateQuestions }) => {
  if (!isOpen) return null;
  return (
    <SmallModal icon={<AlertCircle className="h-4 w-4 text-red-500" />} iconBg="bg-red-50" title={`${duplicateCount} Duplicate${duplicateCount > 1 ? 's' : ''} in Form`}>
      <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
        <p className="text-[10px] font-semibold text-red-700 mb-1.5">Affected questions:</p>
        <ul className="space-y-0.5">{duplicateQuestions.slice(0, 3).map(q => <li key={q.id} className="text-[10px] text-red-600 flex items-start gap-1"><span className="mt-0.5">•</span><span className="line-clamp-1">{q.questionText.replace(/<[^>]*>/g, '')}</span></li>)}{duplicateQuestions.length > 3 && <li className="text-[10px] text-red-500 font-semibold">+{duplicateQuestions.length - 3} more</li>}</ul>
      </div>
      <div className="space-y-2">
        <button onClick={onRegenerate} className="w-full py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"><Sparkles className="h-3 w-3" />Regenerate with AI</button>
        <div className="flex gap-2">
          <button onClick={onDeleteDuplicates} className="flex-1 py-2 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"><Trash2 className="h-3 w-3" />Delete Dupes</button>
          <button onClick={onAddAnyway} className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all">Save Anyway</button>
        </div>
      </div>
    </SmallModal>
  );
};

const DuplicateRegenerationDialog: React.FC<{
  isOpen: boolean; onConfirm: () => void;
  onRegenerateSelected: (ids: string[], topic: string) => void;
  onCancel: () => void; duplicateQuestions: QuestionBlock[]; topic: string;
}> = ({ isOpen, onConfirm, onRegenerateSelected, onCancel, duplicateQuestions, topic }) => {
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { if (isOpen) setSelected(duplicateQuestions.map(q => q.id)); else setSelected([]); }, [isOpen, duplicateQuestions]);
  if (!isOpen) return null;
  const toggleAll = () => setSelected(selected.length === duplicateQuestions.length ? [] : duplicateQuestions.map(q => q.id));
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  return (
    <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center"><Sparkles className="h-4 w-4 text-violet-600" /></div>
            <div><h3 className="text-sm font-bold text-slate-900">Regenerate Duplicates</h3><p className="text-[11px] text-slate-400 mt-0.5">Select questions to replace with AI-generated ones</p></div>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={selected.length === duplicateQuestions.length} onChange={toggleAll} className="w-3.5 h-3.5 rounded border-slate-300 text-violet-600 accent-violet-600" />
              <span className="text-xs font-semibold text-slate-600">Select All ({selected.length}/{duplicateQuestions.length})</span>
            </label>
            <span className="text-[10px] text-slate-400">Topic: <span className="font-semibold text-violet-600">{topic || 'General'}</span></span>
          </div>
          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {duplicateQuestions.map((q, i) => (
              <label key={q.id} className={`flex items-start gap-2.5 p-3 hover:bg-slate-50 cursor-pointer transition-colors ${selected.includes(q.id) ? 'bg-violet-50/40' : ''}`}>
                <input type="checkbox" checked={selected.includes(q.id)} onChange={() => toggle(q.id)} className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-violet-600 accent-violet-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">#{i + 1}</span>
                    {q.difficulty && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${diffConfig[q.difficulty].bg} ${diffConfig[q.difficulty].text}`}>{q.difficulty}</span>}
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-2">{q.questionText.replace(/<[^>]*>/g, '') || 'Empty question'}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-2">
          <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
          <BtnPrimary onClick={onConfirm} className="bg-amber-500 hover:bg-amber-600">Add All Anyway</BtnPrimary>
          <BtnPrimary onClick={() => selected.length > 0 && onRegenerateSelected(selected, topic)} disabled={selected.length === 0} className="bg-violet-600 hover:bg-violet-700">
            <Sparkles className="h-3 w-3" />Regenerate ({selected.length})
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
};

// ─── RICH TEXT EDITOR ────────────────────────────────────────────────────────
const RichTextEditor: React.FC<{
  value: string; onChange: (v: string) => void; placeholder?: string;
  className?: string; compact?: boolean; editorRef?: React.RefObject<HTMLDivElement>;
}> = ({ value, onChange, placeholder, className = '', compact = false, editorRef: externalRef }) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const editorRef = externalRef || internalRef;
  const [isEmpty, setIsEmpty] = useState(!value || value === '<br>' || value === '<p><br></p>');
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) editorRef.current.innerHTML = value || '';
    setIsEmpty(!value || value === '<br>' || value === '<div><br></div>' || value === '<p></p>' || value === '<p><br></p>');
  }, [value]);
  const execCommand = (cmd: string) => {
    document.execCommand(cmd, false);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerHTML;
    onChange(content);
    setIsEmpty(!content || content === '<br>');
  };
  return (
    <div className={`group ${className}`}>
      <div className={`flex items-center gap-0.5 ${compact ? 'mb-1' : 'mb-1.5'}`}>
        {[['bold', <Bold className="h-3 w-3" />], ['italic', <Italic className="h-3 w-3" />], ['underline', <Underline className="h-3 w-3" />]].map(([cmd, icon]) => (
          <button key={cmd as string} type="button" onClick={() => execCommand(cmd as string)}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors">
            {icon as React.ReactNode}
          </button>
        ))}
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className={`focus:outline-none text-sm text-slate-800 leading-relaxed min-h-[${compact ? '28px' : '36px'}] border-b-2 border-slate-200 focus:border-violet-400 pb-1.5 transition-colors [&_strong]:font-bold [&_em]:italic [&_u]:underline`}
        />
        {isEmpty && placeholder && (
          <div className="absolute top-0 left-0 text-slate-300 text-sm pointer-events-none select-none">{placeholder}</div>
        )}
      </div>
    </div>
  );
};

// ─── IMAGE TOOLBAR ───────────────────────────────────────────────────────────
const ImageToolbar: React.FC<{
  alignment: 'left' | 'center' | 'right'; sizePercent: number;
  onAlignmentChange: (a: 'left' | 'center' | 'right') => void;
  onSizeChange: (v: number) => void; onRemove: () => void; onClose: () => void;
}> = ({ alignment, sizePercent, onAlignmentChange, onSizeChange, onRemove, onClose }) => (
  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex items-stretch divide-x divide-slate-100" style={{ minWidth: 260 }}>
    <div className="flex flex-col items-center justify-center px-3 py-2 gap-1">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Align</span>
      <div className="flex gap-0.5">
        {(['left', 'center', 'right'] as const).map(a => (
          <button key={a} onClick={() => onAlignmentChange(a)}
            className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${alignment === a ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-violet-50 hover:text-violet-600'}`}>
            {a[0].toUpperCase()}
          </button>
        ))}
      </div>
    </div>
    <div className="flex flex-col justify-center px-3 py-2 gap-1 flex-1">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Size {sizePercent}%</span>
      <div className="flex items-center gap-1.5">
        <ZoomOut className="h-3 w-3 text-slate-300" />
        <input type="range" min={10} max={100} step={5} value={sizePercent} onChange={(e) => onSizeChange(parseInt(e.target.value))} className="flex-1 h-1.5 accent-violet-600 cursor-pointer" />
        <ZoomIn className="h-3 w-3 text-slate-300" />
      </div>
    </div>
    <div className="flex items-center gap-0.5 px-2 py-2">
      <button onClick={onRemove} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
      <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors" title="Close"><X className="h-3.5 w-3.5" /></button>
    </div>
  </div>
);

// ─── OPTIONS PER ROW PICKER ──────────────────────────────────────────────────
const OptionsPerRowPicker: React.FC<{ value: 1 | 2 | 3 | 4; onChange: (v: 1 | 2 | 3 | 4) => void }> = ({ value, onChange }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] font-semibold text-slate-400">Layout:</span>
    {([1, 2, 3, 4] as const).map(n => (
      <button key={n} onClick={() => onChange(n)}
        className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${value === n ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600'}`}>
        {n}
      </button>
    ))}
    <span className="text-[10px] text-slate-400">per row</span>
  </div>
);

// ─── TEMPLATE CREATOR ────────────────────────────────────────────────────────
const QuestionTemplateCreator: React.FC<{ isOpen: boolean; onClose: () => void; onCreateQuestions: (config: QuestionTemplateConfig) => void }> = ({ isOpen, onClose, onCreateQuestions }) => {
  const [config, setConfig] = useState<QuestionTemplateConfig>({ questionType: 'multiple-choice', numberOfQuestions: 5, optionsPerRow: 2, numberOfOptions: 4, hasExplanations: true, hasImages: false, difficulty: 'medium', baseScore: 10 });
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center"><Layout className="h-4 w-4 text-violet-600" /></div>
            <div><h3 className="text-sm font-bold text-slate-900">Question Template</h3><p className="text-[11px] text-slate-400 mt-0.5">Bulk-create questions with consistent settings</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-5">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Question Type</p>
            <div className="space-y-1">
              {(Object.entries(typeConfig) as [QuestionType, typeof typeConfig[QuestionType]][]).map(([t, cfg]) => (
                <button key={t} onClick={() => setConfig({ ...config, questionType: t })}
                  className={`w-full px-3 py-2 rounded-lg flex items-center gap-2 text-xs transition-all ${config.questionType === t ? `${cfg.bg} border border-violet-200 font-semibold ${cfg.color}` : 'hover:bg-slate-50 text-slate-600 border border-transparent'}`}>
                  <span className={config.questionType === t ? cfg.color : 'text-slate-400'}>{cfg.icon}</span>
                  {cfg.label}
                  {config.questionType === t && <Check className="h-3 w-3 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questions</p><span className="text-sm font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{config.numberOfQuestions}</span></div>
              <input type="range" min={1} max={20} value={config.numberOfQuestions} onChange={(e) => setConfig({ ...config, numberOfQuestions: parseInt(e.target.value) })} className="w-full h-1.5 accent-violet-600" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points Each</p><span className="text-sm font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{config.baseScore}</span></div>
              <input type="range" min={1} max={50} value={config.baseScore} onChange={(e) => setConfig({ ...config, baseScore: parseInt(e.target.value) })} className="w-full h-1.5 accent-violet-600" />
            </div>
            {['multiple-choice', 'checkboxes', 'dropdown'].includes(config.questionType) && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Options</p><span className="text-sm font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{config.numberOfOptions}</span></div>
                  <input type="range" min={2} max={8} value={config.numberOfOptions} onChange={(e) => setConfig({ ...config, numberOfOptions: parseInt(e.target.value) })} className="w-full h-1.5 accent-violet-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Options Per Row</p>
                  <div className="flex gap-1">
                    {([1, 2, 3, 4] as const).map(n => (
                      <button key={n} onClick={() => setConfig({ ...config, optionsPerRow: n })} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${config.optionsPerRow === n ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600'}`}>{n}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Difficulty</p>
              <div className="flex gap-1">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button key={d} onClick={() => setConfig({ ...config, difficulty: d })} className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${config.difficulty === d ? diffConfig[d].btn : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2 pt-1">
              {[['hasExplanations', 'Include explanations'], ['hasImages', 'Image placeholders']].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-600">{label}</span>
                  <button onClick={() => setConfig(c => ({ ...c, [key]: !c[key as keyof QuestionTemplateConfig] }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${(config as any)[key] ? 'bg-violet-600' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${(config as any)[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <BtnSecondary onClick={onClose}>Cancel</BtnSecondary>
          <button onClick={() => { onCreateQuestions(config); onClose(); }} className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all">
            <FilePlus className="h-3.5 w-3.5" />Create {config.numberOfQuestions} Question{config.numberOfQuestions !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── SETTINGS MENU ───────────────────────────────────────────────────────────
const SettingsMenu: React.FC<{ isOpen: boolean; onClose: () => void; onCollapseAll: () => void; onExpandAll: () => void; onOpenTemplateCreator: () => void }> = ({ isOpen, onClose, onCollapseAll, onExpandAll, onOpenTemplateCreator }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute top-full right-0 mt-1.5 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50">
      <div className="px-3 py-1.5 mb-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Options</p>
      </div>
      <button onClick={() => { onOpenTemplateCreator(); onClose(); }} className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-violet-50 transition-colors text-left">
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0"><Layout className="h-3.5 w-3.5 text-violet-600" /></div>
        <div><p className="text-xs font-semibold text-slate-800">Create Template</p><p className="text-[10px] text-slate-400">Bulk generate question shells</p></div>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto" />
      </button>
      <div className="border-t border-slate-100 my-1" />
      <div className="px-3 py-1"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">View</p></div>
      {[
        ['Collapse All', <ChevronRight className="h-3.5 w-3.5 text-slate-400" />, onCollapseAll],
        ['Expand All', <ChevronDown className="h-3.5 w-3.5 text-slate-400" />, onExpandAll],
      ].map(([label, icon, handler]) => (
        <button key={label as string} onClick={() => { (handler as () => void)(); onClose(); }} className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-xs text-slate-700">
          {icon as React.ReactNode}{label as string}
        </button>
      ))}
    </div>
  );
};

// ─── LIMIT BANNER ─────────────────────────────────────────────────────────────
const LimitBanner: React.FC<{ message: string; type?: 'error' | 'warning' | 'info' }> = ({ message, type = 'error' }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };
  return (
    <div className={`flex items-center gap-2 px-4 py-2 border-b text-xs font-semibold ${styles[type]}`}>
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      {message}
    </div>
  );
};

// ─── COPY ICON (inline) ───────────────────────────────────────────────────────
const Copy: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const MCQQuestionForm: React.FC<MCQQuestionFormProps> = ({
  breadcrumbs, exerciseData, tabType, initialData, isEditing = false,
  onClose, onSave, isSaving = false, saveProgress, saveMessage
}) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showQuestionTypeMenu, setShowQuestionTypeMenu] = useState<string | null>(null);
  const [activeImageToolbar, setActiveImageToolbar] = useState<{ type: 'question'; blockId: string } | { type: 'option'; blockId: string; optionId: string } | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showTemplateCreator, setShowTemplateCreator] = useState(false);
  const [collapsedState, setCollapsedState] = useState<{ [key: string]: boolean }>({});
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [showUnfilledDialog, setShowUnfilledDialog] = useState(false);
  const [unfilledCount, setUnfilledCount] = useState(0);

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [showDuplicateRegenerationDialog, setShowDuplicateRegenerationDialog] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [pendingQuestions, setPendingQuestions] = useState<QuestionBlock[]>([]);
  const [duplicateQuestionsList, setDuplicateQuestionsList] = useState<QuestionBlock[]>([]);
  const [isAddAnyway, setIsAddAnyway] = useState(false);
  const [showSingleDuplicateWarning, setShowSingleDuplicateWarning] = useState(false);
  const [pendingSingleQuestion, setPendingSingleQuestion] = useState<QuestionBlock | null>(null);
  const [singleDuplicateQuestion, setSingleDuplicateQuestion] = useState<QuestionBlock | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'add' | 'duplicate' | 'template' | 'ai'>('add');
  const [isRegeneratingDuplicate, setIsRegeneratingDuplicate] = useState(false);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);
  const [regeneratedQuestion, setRegeneratedQuestion] = useState<QuestionBlock | null>(null);
  const [showRegenerationComparison, setShowRegenerationComparison] = useState(false);
  const [showSaveDuplicateWarning, setShowSaveDuplicateWarning] = useState(false);
  const [saveDuplicateQuestions, setSaveDuplicateQuestions] = useState<QuestionBlock[]>([]);
  const [showAIGeneratorForDuplicates, setShowAIGeneratorForDuplicates] = useState(false);
  const [regenerateDuplicateTopic, setRegenerateDuplicateTopic] = useState('');
  const [questionsToReplace, setQuestionsToReplace] = useState<QuestionBlock[]>([]);
  const [aiGenerationKey, setAiGenerationKey] = useState(0);
  const [showDifficultyMenu, setShowDifficultyMenu] = useState<string | null>(null);
  const [blockMarksErrors, setBlockMarksErrors] = useState<{ [blockId: string]: string }>({});

  // ─── SCROLL & REF INFRASTRUCTURE ─────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});
  const activeBlockRichTextRefs = useRef<{ [id: string]: React.RefObject<HTMLDivElement> }>({});

  const scrollToBlock = useCallback((id: string) => {
    setTimeout(() => {
      const el = blockRefs.current[id];
      if (el && scrollContainerRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  }, []);

  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ─── DERIVED CONFIGURATION ───────────────────────────────────────────────
  const scoringType: string =
    exerciseData?.fullExerciseData?.questionConfiguration?.mcqQuestionConfiguration?.scoringType || 'equalDistribution';

  const marksPerQuestion: number =
    exerciseData?.fullExerciseData?.questionConfiguration?.mcqQuestionConfiguration?.marksPerQuestion || 0;

  const totalMcqQuestions: number =
    exerciseData?.fullExerciseData?.questionConfiguration?.mcqQuestionConfiguration?.totalMcqQuestions || 0;

  const maxMcqMarks: number = getMaxMcqMarks(exerciseData);
  const existingMcqMarks: number = getExistingMcqMarks(exerciseData);
  const existingMcqCount: number = getExistingMcqCount(exerciseData);

  const makeDefaultBlock = (id: string, sequence: number = 0): QuestionBlock => ({
    id, type: 'multiple-choice', questionText: '', title: '', description: '',
    questionImageUrl: '', questionImageAlignment: 'center', questionImageSizePercent: 60,
    optionsPerRow: 1,
    options: [
      { id: `${id}-opt-1`, text: '', isCorrect: false, imageAlignment: 'center', imageSizePercent: 60 },
      { id: `${id}-opt-2`, text: '', isCorrect: false, imageAlignment: 'center', imageSizePercent: 60 },
    ],
    isRequired: false, hasOtherOption: false, hasExplanation: false, explanation: '',
    score: scoringType === 'questionSpecific' ? 0 : marksPerQuestion,
    difficulty: 'medium', timeLimit: 2000, memoryLimit: 256,
    isActive: true, sequence, sampleInput: '', sampleOutput: '', isCollapsed: false,
  });

  // ─── LIMIT COMPUTATION ────────────────────────────────────────────────────
  const currentFormMarks = (): number => {
    if (scoringType !== 'questionSpecific') return 0;
    return questionBlocks.reduce((sum, b) => sum + (Number(b.score) || 0), 0);
  };

  const getRemainingMarks = (): number => {
    if (scoringType !== 'questionSpecific' || maxMcqMarks <= 0) return Infinity;
    return maxMcqMarks - existingMcqMarks - currentFormMarks();
  };

  /**
   * For questionSpecific: re-fetches fresh existing marks from exerciseData 
   * and checks whether adding a new block is safe (needs ≥ 0.1 mark remaining after current form marks).
   */
  const isLimitReached = (): boolean => {
    if (scoringType === 'equalDistribution') {
      if (totalMcqQuestions <= 0) return false;
      return (existingMcqCount + questionBlocks.length) >= totalMcqQuestions;
    }
    // questionSpecific: re-derive latest existing marks fresh
    if (maxMcqMarks <= 0) return false;
    const latestExistingMarks = getExistingMcqMarks(exerciseData);
    const currentMarks = questionBlocks.reduce((sum, b) => sum + (Number(b.score) || 0), 0);
    const remaining = maxMcqMarks - latestExistingMarks - currentMarks;
    // Need at least 0.1 remaining so the new block can have a valid score
    return remaining < 0.1;
  };

  const getLimitMessage = (): string | null => {
    if (scoringType === 'equalDistribution') {
      if (totalMcqQuestions <= 0) return null;
      const used = existingMcqCount + questionBlocks.length;
      if (used >= totalMcqQuestions) return `MCQ question limit reached (${used}/${totalMcqQuestions}). Remove a question to add more.`;
      return null;
    }
    if (maxMcqMarks <= 0) return null;
    const remaining = getRemainingMarks();
    if (remaining < 0.1) return `MCQ total marks limit reached (${(existingMcqMarks + currentFormMarks()).toFixed(1)}/${maxMcqMarks}). Remove or reduce scores to add more.`;
    return null;
  };

  const calculateRemainingQuestions = (): number => {
    if (scoringType === 'equalDistribution') {
      if (totalMcqQuestions <= 0) return -1;
      const filledCount = questionBlocks.filter(
        b => b.questionText.replace(/<[^>]*>/g, '').trim() !== ''
      ).length;
      return Math.max(0, totalMcqQuestions - existingMcqCount - filledCount);
    }
    return -1;
  };

  const validateBlockScore = (blockId: string, newScore: number): string | null => {
    if (scoringType !== 'questionSpecific' || maxMcqMarks <= 0) return null;
    const otherBlocksMarks = questionBlocks.reduce(
      (sum, b) => (b.id !== blockId ? sum + (Number(b.score) || 0) : sum),
      0
    );
    const total = existingMcqMarks + otherBlocksMarks + newScore;
    if (total > maxMcqMarks) {
      const available = maxMcqMarks - existingMcqMarks - otherBlocksMarks;
      return `Score exceeds limit. Max allowed: ${Math.max(0, available).toFixed(1)} pts (${(total - maxMcqMarks).toFixed(1)} over limit).`;
    }
    return null;
  };

  const validateAiMarks = (generatedQuestions: GeneratedQuestion[]): string | null => {
    if (scoringType !== 'questionSpecific' || maxMcqMarks <= 0) return null;
    const newMarks = generatedQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
    const available = getRemainingMarks();
    if (newMarks > available) {
      return `Generated questions total ${newMarks} pts but only ${available.toFixed(1)} pts remain (MCQ limit: ${maxMcqMarks} pts).`;
    }
    return null;
  };

  const calculateSimilarity = (s1: string, s2: string): number => {
    if (s1 === s2) return 1.0;
    if (!s1.length || !s2.length) return 0.0;
    const w1 = s1.split(/\s+/), w2 = s2.split(/\s+/);
    const common = w1.filter(w => w2.includes(w) && w.length > 2);
    return common.length / new Set([...w1, ...w2]).size;
  };

  const findDuplicateQuestions = (newQs: QuestionBlock[], existingQs: QuestionBlock[]): QuestionBlock[] => {
    const dupes: QuestionBlock[] = [];
    for (const nq of newQs) {
      const nt = nq.questionText.replace(/<[^>]*>/g, '').trim();
      if (!nt) continue;
      for (const eq of existingQs) {
        const et = eq.questionText.replace(/<[^>]*>/g, '').trim();
        if (et.toLowerCase() === nt.toLowerCase() || calculateSimilarity(et.toLowerCase(), nt.toLowerCase()) > 0.8) { dupes.push(nq); break; }
      }
    }
    return dupes;
  };

  const findInternalDuplicates = (blocks: QuestionBlock[]): QuestionBlock[] => {
    const dupes: QuestionBlock[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < blocks.length; i++) {
      const t = blocks[i].questionText.replace(/<[^>]*>/g, '').trim().toLowerCase();
      if (!t) continue;
      if (seen.has(t)) { dupes.push(blocks[i]); }
      else {
        seen.add(t);
        for (let j = i + 1; j < blocks.length; j++) {
          const ot = blocks[j].questionText.replace(/<[^>]*>/g, '').trim().toLowerCase();
          if (ot && calculateSimilarity(t, ot) > 0.8) dupes.push(blocks[j]);
        }
      }
    }
    return dupes;
  };

  const addQuestionsWithDuplicateCheck = (newQs: QuestionBlock[], action: 'add' | 'duplicate' | 'template' | 'ai') => {
    if (action === 'template') {
      setQuestionBlocks(prev => [...prev, ...newQs]);
      setCollapsedState(prev => { const ns = { ...prev }; newQs.forEach(b => ns[b.id] = false); return ns; });
      return;
    }
    const valid = newQs.filter(q => q.questionText.replace(/<[^>]*>/g, '').trim() !== '');
    if (!valid.length) return;
    const dupes = findDuplicateQuestions(valid, questionBlocks);
    if (dupes.length > 0 && !isAddAnyway) {
      setDuplicateAction(action); setDuplicateCount(dupes.length); setPendingQuestions(valid); setDuplicateQuestionsList(dupes); setShowDuplicateWarning(true);
    } else {
      setQuestionBlocks(prev => [...prev, ...valid]);
      setCollapsedState(prev => { const ns = { ...prev }; valid.forEach(b => ns[b.id] = false); return ns; });
      if (isAddAnyway) setIsAddAnyway(false);
    }
  };

  const handleSingleDuplicateCheck = (nq: QuestionBlock, action: 'add' | 'duplicate' | 'template' | 'ai') => {
    const dupes = findDuplicateQuestions([nq], questionBlocks);
    if (dupes.length > 0 && !isAddAnyway) {
      setDuplicateAction(action); setPendingSingleQuestion(nq); setSingleDuplicateQuestion(dupes[0]); setShowSingleDuplicateWarning(true);
      return false;
    }
    return true;
  };

  const handleRegenerateSelectedDuplicates = (ids: string[], topic: string) => {
    const toRegen = pendingQuestions.filter(q => ids.includes(q.id));
    if (!toRegen.length) return;
    const t = topic || toRegen[0].questionText.replace(/<[^>]*>/g, '').trim() || exerciseData?.topic || 'General';
    setRegenerateDuplicateTopic(t); setQuestionsToReplace(toRegen);
    setShowDuplicateRegenerationDialog(false); setShowDuplicateWarning(false);
    setAiGenerationKey(prev => prev + 1);
    setTimeout(() => setShowAIGeneratorForDuplicates(true), 100);
  };

  const convertGeneratedToBlock = (q: GeneratedQuestion, sequence: number): Partial<QuestionBlock> => ({
    type: q.type || 'multiple-choice',
    questionText: q.description ? `<p>${q.description}</p>` : '',
    title: q.title || `Question ${sequence + 1}`,
    description: q.description || '',
    options: (q.type !== 'short-answer' && q.type !== 'paragraph' && q.options)
      ? q.options.map((opt, oi) => ({ id: `opt-${Date.now()}-${oi}`, text: opt.text, isCorrect: opt.isCorrect || false, imageAlignment: 'center' as const, imageSizePercent: 60 }))
      : [{ id: `opt-${Date.now()}-1`, text: '', isCorrect: false, imageAlignment: 'center' as const, imageSizePercent: 60 }, { id: `opt-${Date.now()}-2`, text: '', isCorrect: false, imageAlignment: 'center' as const, imageSizePercent: 60 }],
    hasExplanation: !!q.explanation, explanation: q.explanation || '',
    difficulty: q.difficulty || 'medium', score: q.points || 10,
    sequence, optionsPerRow: q.optionsPerRow || 2,
  });

  const handleAIGeneratedQuestions = (generatedQuestions: GeneratedQuestion[]) => {
    if (scoringType === 'questionSpecific') {
      const marksError = validateAiMarks(generatedQuestions);
      if (marksError) { alert(marksError); return; }
    }

    if (questionsToReplace.length > 0) {
      const repIds = questionsToReplace.map(q => q.id);
      const newBlocks = generatedQuestions.map((q, i) => { const id = generateId(`regen-${i}`); return { ...makeDefaultBlock(id, questionBlocks.length + i), ...convertGeneratedToBlock(q, questionBlocks.length + i), id }; });
      setQuestionBlocks(prev => [...prev.filter(b => !repIds.includes(b.id)), ...newBlocks]);
      setCollapsedState(prev => { const ns = { ...prev }; newBlocks.forEach(b => { ns[b.id] = false; }); return ns; });
      setShowAIGeneratorForDuplicates(false); setQuestionsToReplace([]); setRegenerateDuplicateTopic(''); setPendingQuestions([]); setIsAddAnyway(false);
      return;
    }
    const currentBlocks = [...questionBlocks];
    const firstEmpty = currentBlocks.length === 1 && !currentBlocks[0].questionText.replace(/<[^>]*>/g, '').trim() && currentBlocks[0].options.every(o => !o.text.trim());
    if (firstEmpty) {
      const firstBlock = { ...currentBlocks[0], ...convertGeneratedToBlock(generatedQuestions[0], 0), id: currentBlocks[0].id };
      const extra = generatedQuestions.slice(1).map((q, i) => { const id = generateId(`ai-${i}`); return { ...makeDefaultBlock(id, i + 1), ...convertGeneratedToBlock(q, i + 1), id }; });
      setQuestionBlocks([firstBlock, ...extra]);
      const ns: { [k: string]: boolean } = { [firstBlock.id]: false };
      extra.forEach(b => { ns[b.id] = false; });
      setCollapsedState(prev => ({ ...prev, ...ns }));
    } else {
      const blocks = generatedQuestions.map((q, i) => { const id = generateId(`ai-${i}`); return { ...makeDefaultBlock(id, currentBlocks.length + i), ...convertGeneratedToBlock(q, currentBlocks.length + i), id }; });
      addQuestionsWithDuplicateCheck(blocks, 'ai');
    }
  };

  const [questionBlocks, setQuestionBlocks] = useState<QuestionBlock[]>(() => {
    if (isEditing && initialData) {
      const arr = Array.isArray(initialData) ? initialData : [initialData];
      return arr.map((d: any, i: number) => {
        const id = d.id || `block-${i}-${Date.now()}`;
        return {
          ...makeDefaultBlock(id),
          id,
          type: mapApiTypeToInternal(d.questionType || 'multiple_choice'),
          questionText: d.questionTitle || d.questionText || d.title || '',
          title: (d.questionTitle || d.questionText || d.title || '').replace(/<[^>]*>/g, '').trim(),
          description: d.description || '',
          options: d.options?.map((o: any, oi: number) => ({ id: o.id || `opt-${i}-${oi}`, text: o.text || o.content || '', isCorrect: o.isCorrect || false, imageUrl: o.imageUrl || '', imageAlignment: o.imageAlignment || 'center', imageSizePercent: o.imageSizePercent || 60 })) || makeDefaultBlock(id).options,
          score: d.score || 10, difficulty: d.difficulty || 'medium',
          timeLimit: d.timeLimit || 2000, memoryLimit: d.memoryLimit || 256,
          isActive: d.isActive !== undefined ? d.isActive : true,
          sequence: d.sequence !== undefined ? d.sequence : i,
          hasExplanation: d.hasExplanation || false, explanation: d.explanation || '',
          isRequired: d.isRequired || false, hasOtherOption: d.hasOtherOption || false,
          questionImageUrl: d.questionImageUrl || '', questionImageAlignment: d.questionImageAlignment || 'center',
          questionImageSizePercent: d.questionImageSizePercent || 60, optionsPerRow: d.optionsPerRow || 1,
        };
      });
    }
    const initial = makeDefaultBlock(generateId('block'), 0);
    return [initial];
  });

  const [errors, setErrors] = useState<{ blocks?: { [k: string]: { questionText?: string; options?: string; correctAnswer?: string; score?: string } } }>({});

  const mapInternalTypeToApi = (t: QuestionType) => ({ 'multiple-choice': 'multiple_choice', 'checkboxes': 'checkboxes', 'dropdown': 'dropdown', 'short-answer': 'short_answer', 'paragraph': 'essay' }[t] || 'multiple_choice');
  function mapApiTypeToInternal(t: string): QuestionType { return ({ 'multiple_choice': 'multiple-choice', 'checkboxes': 'checkboxes', 'dropdown': 'dropdown', 'short_answer': 'short-answer', 'essay': 'paragraph' } as any)[t] || 'multiple-choice'; }

  useEffect(() => {
    if (!isEditing && exerciseData?.id && hasLoadedFromStorage) {
      const key = getStorageKey(exerciseData.id);
      if (key) {
        const hasContent = questionBlocks.some(b => b.questionText.replace(/<[^>]*>/g, '').trim() || b.options.some(o => o.text.trim()));
        if (hasContent) localStorage.setItem(key, JSON.stringify(questionBlocks.map(b => ({ ...b, isCollapsed: collapsedState[b.id] || false }))));
      }
    }
  }, [questionBlocks, collapsedState, isEditing, exerciseData?.id, hasLoadedFromStorage]);

  useEffect(() => {
    if (!isEditing && !initialData && exerciseData?.id && !hasLoadedFromStorage) {
      const key = getStorageKey(exerciseData.id);
      if (key) {
        try {
          const saved = localStorage.getItem(key);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.length > 0) {
              setQuestionBlocks(parsed);
              const s: { [k: string]: boolean } = {};
              parsed.forEach((b: QuestionBlock) => { s[b.id] = b.isCollapsed || false; });
              setCollapsedState(s);
            }
          }
        } catch (e) { console.error('Draft load failed', e); }
      }
      setHasLoadedFromStorage(true);
    }
  }, [isEditing, initialData, exerciseData?.id, hasLoadedFromStorage]);

  const clearDraft = () => { const key = getStorageKey(exerciseData?.id); if (key) localStorage.removeItem(key); };

  const toggleCollapse = (id: string) => setCollapsedState(prev => ({ ...prev, [id]: !prev[id] }));
  const collapseAll = () => { const s: { [k: string]: boolean } = {}; questionBlocks.forEach(b => s[b.id] = true); setCollapsedState(s); };
  const expandAll = () => { const s: { [k: string]: boolean } = {}; questionBlocks.forEach(b => s[b.id] = false); setCollapsedState(s); };

  const updateBlock = (id: string, patch: Partial<QuestionBlock>) => setQuestionBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b));
  const updateOption = (bid: string, oid: string, patch: Partial<MCQOption>) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, options: b.options.map(o => o.id === oid ? { ...o, ...patch } : o) } : b));

  const handleQuestionChange = (id: string, v: string) => updateBlock(id, { questionText: v || '', title: v.replace(/<[^>]*>/g, '').trim() || 'Untitled Question' });
  const handleExplanationChange = (id: string, v: string) => updateBlock(id, { explanation: v });
  const toggleExplanation = (id: string) => updateBlock(id, { hasExplanation: !questionBlocks.find(b => b.id === id)?.hasExplanation });
  const toggleRequired = (id: string) => updateBlock(id, { isRequired: !questionBlocks.find(b => b.id === id)?.isRequired });
  const setOptionsPerRow = (id: string, v: 1 | 2 | 3 | 4) => updateBlock(id, { optionsPerRow: v });

  const handleScoreChange = (blockId: string, rawValue: string) => {
    const newScore = parseFloat(rawValue.replace(/[^0-9.]/g, '')) || 0;
    const err = validateBlockScore(blockId, newScore);
    setBlockMarksErrors(prev => ({ ...prev, [blockId]: err || '' }));
    updateBlock(blockId, { score: newScore });
  };

  const handleQuestionImageUpload = (bid: string, file: File) => {
    const r = new FileReader();
    r.onload = e => {
      updateBlock(bid, { questionImageUrl: e.target?.result as string, questionImageAlignment: 'center', questionImageSizePercent: 60 });
      setActiveImageToolbar({ type: 'question', blockId: bid });
    };
    r.readAsDataURL(file);
  };
  const removeQuestionImage = (id: string) => { updateBlock(id, { questionImageUrl: '' }); setActiveImageToolbar(null); };
  const handleQuestionImageClick = (id: string) => setActiveImageToolbar(activeImageToolbar?.type === 'question' && activeImageToolbar.blockId === id ? null : { type: 'question', blockId: id });
  const handleOptionImageUpload = (bid: string, oid: string, file: File) => { const r = new FileReader(); r.onload = e => { updateOption(bid, oid, { imageUrl: e.target?.result as string, imageAlignment: 'center', imageSizePercent: 60 }); setActiveImageToolbar({ type: 'option', blockId: bid, optionId: oid }); }; r.readAsDataURL(file); };
  const removeOptionImage = (bid: string, oid: string) => { updateOption(bid, oid, { imageUrl: '' }); setActiveImageToolbar(null); };
  const handleOptionImageClick = (bid: string, oid: string) => setActiveImageToolbar(activeImageToolbar?.type === 'option' && activeImageToolbar.blockId === bid && activeImageToolbar.optionId === oid ? null : { type: 'option', blockId: bid, optionId: oid });

  const addOption = (bid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, options: [...b.options, { id: generateId(`opt-${bid}`), text: '', isCorrect: false, imageAlignment: 'center' as const, imageSizePercent: 60 }] } : b));
  const addOtherOption = (bid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, hasOtherOption: true, options: [...b.options, { id: generateId(`other-${bid}`), text: 'Other', isCorrect: false, imageAlignment: 'center' as const, imageSizePercent: 60 }] } : b));
  const removeOtherOption = (bid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, hasOtherOption: false, options: b.options.filter(o => !o.id.includes('other-')) } : b));
  const updateOptionText = (bid: string, oid: string, t: string) => updateOption(bid, oid, { text: t });
  const setCorrectAnswer = (bid: string, oid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, options: b.options.map(o => ({ ...o, isCorrect: o.id === oid })) } : b));
  const toggleCorrectAnswer = (bid: string, oid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, options: b.options.map(o => o.id === oid ? { ...o, isCorrect: !o.isCorrect } : o) } : b));
  const removeOption = (bid: string, oid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid && b.options.length > 2 ? { ...b, options: b.options.filter(o => o.id !== oid) } : b));

  /**
   * Add a new blank question block.
   * 1. Check limit (including questionSpecific with latest fresh marks).
   * 2. Check all existing blocks have non-empty questionText — if not, show dialog.
   * 3. Create block, scroll to it, set as active.
   */
  const addQuestionBlock = () => {
    // Re-check limit freshly for questionSpecific
    if (isLimitReached()) return;

    // Check all blocks are filled
    const unfilledBlocks = questionBlocks.filter(b => !b.questionText.replace(/<[^>]*>/g, '').trim());
    if (unfilledBlocks.length > 0) {
      setUnfilledCount(unfilledBlocks.length);
      setShowUnfilledDialog(true);
      // Scroll to first unfilled
      scrollToBlock(unfilledBlocks[0].id);
      return;
    }

    const id = generateId('block');
    setQuestionBlocks(bs => [...bs, makeDefaultBlock(id, bs.length)]);
    setCollapsedState(prev => ({ ...prev, [id]: false }));
    setActiveBlockId(id);
    scrollToBlock(id);
  };

  const duplicateQuestionBlock = (bid: string) => {
    const src = questionBlocks.find(b => b.id === bid);
    if (!src) return;
    const nid = generateId('block');
    const dup = { ...src, id: nid, sequence: questionBlocks.length, options: src.options.map((o, i) => ({ ...o, id: o.id.includes('other-') ? `${nid}-other` : `${nid}-opt-${i}` })), isCollapsed: false };
    if (handleSingleDuplicateCheck(dup, 'duplicate')) {
      setQuestionBlocks(bs => [...bs, dup]);
      setCollapsedState(prev => ({ ...prev, [nid]: false }));
      setActiveBlockId(nid);
      scrollToBlock(nid);
    }
  };

  const removeQuestionBlock = (id: string) => {
    if (questionBlocks.length === 1) {
      const e = makeDefaultBlock(generateId('block'), 0);
      setQuestionBlocks([e]); setCollapsedState({ [e.id]: false });
      setActiveBlockId(e.id);
    } else {
      setQuestionBlocks(bs => bs.filter(b => b.id !== id).map((b, i) => ({ ...b, sequence: i })));
      setCollapsedState(prev => { const ns = { ...prev }; delete ns[id]; return ns; });
      if (activeBlockId === id) setActiveBlockId(null);
    }
    setBlockMarksErrors(prev => { const ns = { ...prev }; delete ns[id]; return ns; });
  };

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    const idx = questionBlocks.findIndex(b => b.id === id);
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === questionBlocks.length - 1)) return;
    const nb = [...questionBlocks];
    const ni = dir === 'up' ? idx - 1 : idx + 1;
    [nb[idx], nb[ni]] = [nb[ni], nb[idx]];
    nb.forEach((b, i) => b.sequence = i);
    setQuestionBlocks(nb);
  };

  const createQuestionsFromTemplate = (config: QuestionTemplateConfig) => {
    const blocks: QuestionBlock[] = Array.from({ length: config.numberOfQuestions }, (_, i) => {
      const id = generateId(`tpl-${i}`);
      const block: QuestionBlock = { ...makeDefaultBlock(id, questionBlocks.length + i), type: config.questionType, score: config.baseScore, difficulty: config.difficulty, optionsPerRow: config.optionsPerRow, hasExplanation: config.hasExplanations };
      if (['multiple-choice', 'checkboxes', 'dropdown'].includes(config.questionType)) {
        block.options = Array.from({ length: config.numberOfOptions }, (_, j) => ({ id: `${id}-opt-${j + 1}`, text: '', isCorrect: j === 0, imageAlignment: 'center' as const, imageSizePercent: 60 }));
      }
      return block;
    });
    addQuestionsWithDuplicateCheck(blocks, 'template');
  };

  const handleDuplicateWarningConfirm = () => {
    setIsAddAnyway(true); setShowDuplicateWarning(false);
    setQuestionBlocks(prev => [...prev, ...pendingQuestions]);
    setCollapsedState(prev => { const ns = { ...prev }; pendingQuestions.forEach(b => ns[b.id] = false); return ns; });
    setPendingQuestions([]); setDuplicateCount(0); setDuplicateQuestionsList([]);
  };
  const handleDuplicateWarningRegenerate = () => { setShowDuplicateWarning(false); setDuplicateQuestionsList(pendingQuestions); setShowDuplicateRegenerationDialog(true); };
  const handleDuplicateWarningCancel = () => { setShowDuplicateWarning(false); setPendingQuestions([]); setDuplicateCount(0); setDuplicateQuestionsList([]); setIsAddAnyway(false); };
  const handleSingleDuplicateConfirm = () => { setShowSingleDuplicateWarning(false); setPendingSingleQuestion(null); setSingleDuplicateQuestion(null); proceedWithSave(); };
  const handleSingleDuplicateCancel = () => { setShowSingleDuplicateWarning(false); setPendingSingleQuestion(null); setSingleDuplicateQuestion(null); setIsAddAnyway(false); };

  const handleRegenerationAccept = () => {
    if (regeneratedQuestion && pendingSingleQuestion) {
      setQuestionBlocks(prev => prev.map(q => q.id === pendingSingleQuestion.id ? regeneratedQuestion : q));
      setShowRegenerationComparison(false); setShowSingleDuplicateWarning(false);
      setPendingSingleQuestion(null); setSingleDuplicateQuestion(null); setRegeneratedQuestion(null);
      setTimeout(() => proceedWithSave(), 300);
    }
  };
  const handleRegenerationReject = () => { setShowRegenerationComparison(false); setRegeneratedQuestion(null); };
  const handleRegenerationRegenerate = () => { setShowRegenerationComparison(false); setRegeneratedQuestion(null); handleSingleDuplicateRegenerate(); };

  const handleSingleDuplicateRegenerate = async () => {
    if (!pendingSingleQuestion) return;
    setIsRegeneratingDuplicate(true); setRegenerationError(null);
    try {
      const qt = pendingSingleQuestion.questionText.replace(/<[^>]*>/g, '').trim();
      const prompt = `Generate 1 unique multiple-choice MCQ question about: "${qt}"\nReturn ONLY valid JSON array:\n[{"title":"Title","description":"Question text","options":[{"text":"A","isCorrect":false},{"text":"B","isCorrect":true},{"text":"C","isCorrect":false},{"text":"D","isCorrect":false}],"correctAnswer":"B","explanation":"Why B is correct."}]`;
      let res = await fetch(GEMINI_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, topK: 1, topP: 0.95, maxOutputTokens: 4096 } }) });
      if (!res.ok) res = await fetch(GEMINI_API_URL_FALLBACK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }) });
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No response from AI');
      let clean = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
      const si = clean.indexOf('['), ei = clean.lastIndexOf(']');
      if (si !== -1 && ei > si) {
        const parsed = JSON.parse(clean.substring(si, ei + 1));
        if (Array.isArray(parsed) && parsed.length > 0) {
          const g = parsed[0];
          setRegeneratedQuestion({ ...pendingSingleQuestion, questionText: g.description || qt, options: (g.options || []).map((o: any, i: number) => ({ id: generateId('opt'), text: o.text || '', isCorrect: o.isCorrect || false, imageAlignment: 'center' as const, imageSizePercent: 100 })), explanation: g.explanation || '', title: g.title || pendingSingleQuestion.title });
          setShowRegenerationComparison(true);
        }
      }
    } catch (e: any) { setRegenerationError(e.message || 'Unexpected error'); }
    finally { setIsRegeneratingDuplicate(false); }
  };

  const handleSaveDuplicateRegenerate = () => { setQuestionsToReplace(saveDuplicateQuestions); setRegenerateDuplicateTopic(saveDuplicateQuestions.map(q => q.questionText.replace(/<[^>]*>/g, '').trim()).join('; ')); setShowAIGeneratorForDuplicates(true); setShowSaveDuplicateWarning(false); };
  const handleSaveDuplicateAddAnyway = () => { setShowSaveDuplicateWarning(false); setSaveDuplicateQuestions([]); proceedWithSave(); };
  const handleSaveDuplicateDelete = () => {
    const ids = new Set(saveDuplicateQuestions.map(q => q.id));
    setQuestionBlocks(prev => prev.filter(q => !ids.has(q.id)));
    setShowSaveDuplicateWarning(false); setSaveDuplicateQuestions([]);
    setTimeout(() => proceedWithSave(), 100);
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = { blocks: {} };
    let valid = true;

    questionBlocks.forEach(b => {
      const be: any = {};
      if (!b.questionText.replace(/<[^>]*>/g, '').trim()) { be.questionText = 'Question text is required'; valid = false; }
      if (['multiple-choice', 'checkboxes', 'dropdown'].includes(b.type)) {
        if (b.options.filter(o => o.text.trim()).length < 2) { be.options = 'At least 2 options required'; valid = false; }
        if (!b.options.some(o => o.isCorrect)) { be.correctAnswer = b.type === 'checkboxes' ? 'Mark at least one correct' : 'Mark one correct answer'; valid = false; }
      }
      if (scoringType === 'questionSpecific') {
        const scoreErr = validateBlockScore(b.id, Number(b.score) || 0);
        if (scoreErr) { be.score = scoreErr; valid = false; }
      }
      if (Object.keys(be).length) newErrors.blocks![b.id] = be;
    });

    if (scoringType === 'questionSpecific' && maxMcqMarks > 0) {
      const total = existingMcqMarks + currentFormMarks();
      if (total > maxMcqMarks) {
        if (!newErrors.blocks![questionBlocks[0]?.id]) newErrors.blocks![questionBlocks[0]?.id] = {};
        newErrors.blocks![questionBlocks[0]?.id].score = `Total MCQ marks (${total.toFixed(1)}) exceed allowed maximum (${maxMcqMarks}). Please reduce question scores.`;
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  };

  const base64ToFile = (b64: string, name: string): File | null => {
    try {
      const m = b64.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      const bytes = atob(m[2]);
      const buf = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
      return new File([buf], name, { type: m[1] });
    } catch { return null; }
  };

  const formatPayload = () => {
    const images: any[] = [];
    const questions = questionBlocks.map((b, qi) => {
      const html = b.questionText?.trim() || '<p></p>';
      const score = scoringType === 'equalDistribution' ? marksPerQuestion : (b.score ?? 0);
      const correctOptions = b.options.filter(o => o.isCorrect);
      const correctAnswers = b.type === 'checkboxes' ? correctOptions.map(o => o.text.trim()) : correctOptions.length ? [correctOptions[0].text.trim()] : b.options.length ? [b.options[0].text.trim()] : [];
      const opts = b.options.map((o, oi) => {
        let imgPath = null;
        if (o.imageUrl?.startsWith('data:')) {
          const fn = `option_${b.id}_${o.id}_${Date.now()}.jpg`;
          imgPath = `/uploads/${fn}`;
          const f = base64ToFile(o.imageUrl, fn);
          if (f) images.push({ path: imgPath, file: f, type: 'option', questionIndex: qi, optionIndex: oi, blockId: b.id, optionId: o.id });
        } else if (o.imageUrl) imgPath = o.imageUrl;
        return { text: o.text.trim(), isCorrect: o.isCorrect, imageUrl: imgPath, imageAlignment: o.imageAlignment || 'left', imageSizePercent: o.imageSizePercent || 100 };
      });
      let qImgPath = null;
      if (b.questionImageUrl?.startsWith('data:')) {
        const fn = `question_${b.id}_${Date.now()}.jpg`;
        qImgPath = `/uploads/${fn}`;
        const f = base64ToFile(b.questionImageUrl, fn);
        if (f) images.push({ path: qImgPath, file: f, type: 'question', questionIndex: qi, blockId: b.id });
      } else if (b.questionImageUrl) qImgPath = b.questionImageUrl;
      const q: any = {
        mcqQuestionTitle: html, mcqQuestionType: mapInternalTypeToApi(b.type), mcqQuestionDifficulty: b.difficulty || 'medium',
        mcqQuestionScore: score, mcqQuestionTimeLimit: b.timeLimit || 0, isActive: b.isActive !== undefined ? b.isActive : true,
        mcqQuestionOptionsPerRow: b.optionsPerRow || 1, mcqQuestionOptions: opts, mcqQuestionCorrectAnswers: correctAnswers,
        mcqQuestionRequired: b.isRequired === true, hasOtherOption: b.hasOtherOption || false,
        mcqQuestionImageUrl: qImgPath, mcqQuestionImageAlignment: b.questionImageAlignment || 'left', mcqQuestionImageSizePercent: b.questionImageSizePercent || 100,
        questionType: 'mcq', sequence: qi, hasExplanation: b.hasExplanation || false,
      };
      if (b.hasExplanation && b.explanation?.trim()) { q.mcqQuestionDescription = b.explanation.trim(); q.explanation = b.explanation.trim(); }
      return q;
    });
    return { questions, images };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const internal = findInternalDuplicates(questionBlocks);
    if (internal.length > 0) {
      const orig = questionBlocks.find(q => { const dt = internal[0].questionText.replace(/<[^>]*>/g, '').trim().toLowerCase(), qt = q.questionText.replace(/<[^>]*>/g, '').trim().toLowerCase(); return q.id !== internal[0].id && (qt === dt || calculateSimilarity(qt, dt) > 0.8); });
      if (orig) { setPendingSingleQuestion(internal[0]); setSingleDuplicateQuestion(orig); setShowSingleDuplicateWarning(true); return; }
    }
    proceedWithSave();
  };

  const proceedWithSave = () => {
    const { questions, images } = formatPayload();
    if (!questions.length) return;
    const fd = new FormData();
    questions.forEach((q, i) => fd.append(`questionsData[${i}]`, JSON.stringify(q)));
    fd.append('questionsData', JSON.stringify(questions));
    fd.append('tabType', tabType);
    fd.append('subcategory', exerciseData?.subcategory || 'assignments');
    images.forEach(item => fd.append(item.type === 'option' ? `question_${item.questionIndex}_option_${item.optionIndex}_image` : `question_${item.questionIndex}_image`, item.file));
    clearDraft();
    onSave(fd);
  };

  const handleCloseClick = () => {
    const hasContent = questionBlocks.some(b => b.questionText.replace(/<[^>]*>/g, '').trim() || b.options.some(o => o.text.trim()));
    if (!isEditing && hasContent) setShowCloseConfirmation(true);
    else { clearDraft(); onClose(); }
  };
  const handleCancelClick = () => {
    const hasContent = questionBlocks.some(b => b.questionText.replace(/<[^>]*>/g, '').trim() || b.options.some(o => o.text.trim()));
    if (!isEditing && hasContent) setShowCancelConfirmation(true);
    else { clearDraft(); onClose(); }
  };

  // ─── SIDEBAR TOOLBAR HANDLERS ────────────────────────────────────────────
  const handleSidebarFocusRichText = () => {
    if (!activeBlockId) return;
    const ref = activeBlockRichTextRefs.current[activeBlockId];
    if (ref?.current) { ref.current.focus(); }
  };

  const handleSidebarAddImage = (file: File) => {
    if (!activeBlockId) return;
    handleQuestionImageUpload(activeBlockId, file);
  };

  const limitReached = isLimitReached();
  const limitMessage = getLimitMessage();

  // Derived breadcrumb labels
  const exerciseName = exerciseData?.exerciseName || exerciseData?.fullExerciseData?.exerciseInformation?.exerciseName || '';
  const actionLabel = isEditing ? 'Edit Questions' : 'Create Questions';
  const questionLabel = `${questionBlocks.length} Question${questionBlocks.length !== 1 ? 's' : ''}`;

  // ─── RENDER OPTIONS ─────────────────────────────────────────────────────
  const renderOptions = (block: QuestionBlock) => {
    const cols = block.optionsPerRow || 1;
    const gridCls = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'][cols - 1];
    return (
      <div className={`grid ${gridCls} gap-2`}>
        {block.options.map((opt, idx) => (
          <div key={opt.id} className="group relative">
            <div className={`flex flex-col rounded-lg border transition-all duration-150 overflow-hidden ${opt.isCorrect ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              {opt.imageUrl && (
                <div className="px-2 pt-2">
                  <div className="relative" style={{ minHeight: activeImageToolbar?.type === 'option' && activeImageToolbar.blockId === block.id && activeImageToolbar.optionId === opt.id ? '72px' : 'auto' }}>
                    {activeImageToolbar?.type === 'option' && activeImageToolbar.blockId === block.id && activeImageToolbar.optionId === opt.id && (
                      <ImageToolbar alignment={opt.imageAlignment || 'center'} sizePercent={opt.imageSizePercent || 60} onAlignmentChange={a => updateOption(block.id, opt.id, { imageAlignment: a })} onSizeChange={v => updateOption(block.id, opt.id, { imageSizePercent: v })} onRemove={() => removeOptionImage(block.id, opt.id)} onClose={() => setActiveImageToolbar(null)} />
                    )}
                    <div style={{ display: 'flex', justifyContent: opt.imageAlignment === 'left' ? 'flex-start' : opt.imageAlignment === 'right' ? 'flex-end' : 'center' }}>
                      <div style={{ width: `${opt.imageSizePercent || 60}%` }} className="cursor-pointer" onClick={() => handleOptionImageClick(block.id, opt.id)}>
                        <img src={opt.imageUrl} alt="" className={`w-full h-auto rounded-md border-2 transition-all ${activeImageToolbar?.type === 'option' && activeImageToolbar.blockId === block.id && activeImageToolbar.optionId === opt.id ? 'border-violet-400 ring-2 ring-violet-100' : 'border-transparent hover:border-violet-200'}`} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 px-2.5 py-2">
                <button type="button" onClick={() => { if (block.type === 'multiple-choice') setCorrectAnswer(block.id, opt.id); else if (block.type === 'checkboxes') toggleCorrectAnswer(block.id, opt.id); else setCorrectAnswer(block.id, opt.id); }} className="flex-shrink-0">
                  {block.type === 'checkboxes' ? (
                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-violet-400'}`}>
                      {opt.isCorrect && <svg className="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </div>
                  ) : (
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-violet-400'}`}>
                      {opt.isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  )}
                </button>
                <input type="text" value={opt.text} onChange={e => updateOptionText(block.id, opt.id, e.target.value)}
                  placeholder={opt.id.includes('other-') ? 'Other (editable)' : `Click to Edit Option ${String.fromCharCode(65 + idx)}`}
                  className={`flex-1 text-xs outline-none bg-transparent placeholder:text-slate-300 ${opt.isCorrect ? 'text-emerald-700 font-semibold' : 'text-slate-700'}`} />
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  {!opt.imageUrl && (
                    <label className="cursor-pointer p-1 hover:bg-slate-100 rounded-md transition-colors" title="Add image">
                      <Image className="h-3 w-3 text-slate-400" />
                      <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleOptionImageUpload(block.id, opt.id, f); }} />
                    </label>
                  )}
                  {(block.options.length > 2 || opt.id.includes('other-')) && (
                    <button onClick={() => opt.id.includes('other-') ? removeOtherOption(block.id) : removeOption(block.id, opt.id)} className="p-1 hover:bg-red-50 rounded-md transition-colors">
                      <X className="h-3 w-3 text-slate-300 hover:text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderQuestionContent = (block: QuestionBlock) => {
    if (collapsedState[block.id]) return null;
    if (block.type === 'short-answer') return (
      <div className="px-4 py-3">
        <div className="border-b-2 border-dashed border-slate-200 pb-1.5">
          <input type="text" placeholder="Student types a short answer here…" className="w-full text-xs text-slate-300 outline-none bg-transparent placeholder:text-slate-300" disabled />
        </div>
      </div>
    );
    if (block.type === 'paragraph') return (
      <div className="px-4 py-3">
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-3">
          <p className="text-xs text-slate-300">Student types a longer answer here…</p>
          <p className="text-xs text-slate-200 mt-1">—</p><p className="text-xs text-slate-200 mt-0.5">—</p>
        </div>
      </div>
    );
    return (
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <OptionsPerRowPicker value={block.optionsPerRow || 1} onChange={v => setOptionsPerRow(block.id, v)} />
          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${typeConfig[block.type].bg} ${typeConfig[block.type].color}`}>
            {block.type === 'multiple-choice' ? 'One correct' : block.type === 'checkboxes' ? 'Multiple correct' : 'Dropdown select'}
          </span>
        </div>
        {renderOptions(block)}
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[10px] text-slate-300">+</span>
          <button onClick={() => addOption(block.id)} className="text-[11px] text-violet-500 hover:text-violet-700 font-semibold transition-colors">Add option</button>
          {!block.hasOtherOption && block.type !== 'dropdown' && (<><span className="text-[10px] text-slate-300">or</span><button onClick={() => addOtherOption(block.id)} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">add "Other"</button></>)}
        </div>
        {errors.blocks?.[block.id]?.options && <div className="flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg"><AlertCircle className="h-3 w-3" />{errors.blocks[block.id].options}</div>}
        {errors.blocks?.[block.id]?.correctAnswer && <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg"><AlertCircle className="h-3 w-3" />{errors.blocks[block.id].correctAnswer}</div>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/50 backdrop-blur-[2px]">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Pencil className="h-4 w-4 text-white" />
          </div>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <QuestionFormBreadcrumb
              breadcrumbs={breadcrumbs || []}
              tabType={tabType}
              exerciseName={exerciseName}
              actionLabel={actionLabel}
              questionLabel={questionLabel}
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-400">{questionBlocks.length} question{questionBlocks.length !== 1 ? 's' : ''}</span>
              {scoringType === 'equalDistribution' && (
                <>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-semibold">{marksPerQuestion}mark each</span>
                  {totalMcqQuestions > 0 && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">
                      {existingMcqCount + questionBlocks.length}/{totalMcqQuestions} questions
                    </span>
                  )}
                </>
              )}
              {scoringType === 'questionSpecific' && (
                <>
                  <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded font-semibold">Custom points</span>
                  {maxMcqMarks > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${getRemainingMarks() < 0.1 ? 'bg-red-50 text-red-600' : getRemainingMarks() <= maxMcqMarks * 0.2 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {(existingMcqMarks + currentFormMarks()).toFixed(1)}/{maxMcqMarks} marks
                    </span>
                  )}
                </>
              )}
              {!isEditing && exerciseData?.id && <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-semibold">Auto-saved</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-3">
          <div className="relative">
            <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Settings">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            </button>
            <SettingsMenu isOpen={showSettingsMenu} onClose={() => setShowSettingsMenu(false)} onCollapseAll={collapseAll} onExpandAll={expandAll} onOpenTemplateCreator={() => { setShowSettingsMenu(false); setShowTemplateCreator(true); }} />
          </div>

          {!showAIGeneratorForDuplicates ? (
            <GenerateMCQAIQuestion
              key={aiGenerationKey}
              breadcrumbs={breadcrumbs}
              exerciseData={exerciseData}
              onClose={() => setShowGenerateModal(false)}
              onSave={handleAIGeneratedQuestions}
              buttonClassName={limitReached ? 'opacity-50 cursor-not-allowed bg-violet-600' : 'bg-violet-600 hover:bg-violet-700'}
              buttonText={<span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Generate AI</span>}
              maxSelectableCount={calculateRemainingQuestions()}
            />
          ) : (
            <GenerateMCQAIQuestion
              key={`dup-${aiGenerationKey}`}
              breadcrumbs={breadcrumbs}
              exerciseData={exerciseData}
              onClose={() => setShowAIGeneratorForDuplicates(false)}
              onSave={handleAIGeneratedQuestions}
              buttonClassName="bg-amber-500 hover:bg-amber-600 animate-pulse"
              buttonText={<span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Regen {questionsToReplace.length} Dupe{questionsToReplace.length !== 1 ? 's' : ''}</span>}
              isRegeneratingDuplicates={true}
              duplicateTopic={regenerateDuplicateTopic}
              numberOfDuplicates={questionsToReplace.length}
              onRegenerationComplete={qs => { handleAIGeneratedQuestions(qs); setShowAIGeneratorForDuplicates(false); setQuestionsToReplace([]); }}
              maxSelectableCount={calculateRemainingQuestions()}
            />
          )}

          <button onClick={handleCloseClick} className="p-2 hover:bg-slate-100 rounded-lg transition-colors ml-0.5">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── LIMIT BANNER ── */}
      {limitMessage && <LimitBanner message={limitMessage} type="error" />}

      {/* ── MARKS PROGRESS BAR (questionSpecific) ── */}
      {scoringType === 'questionSpecific' && maxMcqMarks > 0 && (
        <div className="px-5 py-2 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">MCQ Marks</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getRemainingMarks() < 0.1 ? 'bg-red-500' : getRemainingMarks() <= maxMcqMarks * 0.2 ? 'bg-amber-400' : 'bg-violet-500'}`}
                style={{ width: `${Math.min(100, ((existingMcqMarks + currentFormMarks()) / maxMcqMarks) * 100)}%` }}
              />
            </div>
            <span className={`text-[10px] font-bold flex-shrink-0 ${getRemainingMarks() < 0.1 ? 'text-red-600' : 'text-slate-500'}`}>
              {(existingMcqMarks + currentFormMarks()).toFixed(1)}/{maxMcqMarks}
            </span>
            {getRemainingMarks() >= 0.1 && (
              <span className="text-[10px] text-slate-400 flex-shrink-0">({getRemainingMarks().toFixed(1)} remaining)</span>
            )}
          </div>
        </div>
      )}

      {/* ── SCROLLABLE BODY ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-slate-50/80 px-4 py-4">
        <div className="space-y-3 max-w-4xl mx-auto">
          {questionBlocks.map((block, idx) => {
            const collapsed = collapsedState[block.id] || false;
            const hasErr = !!errors.blocks?.[block.id];
            const diff = diffConfig[block.difficulty || 'medium'];
            const qtype = typeConfig[block.type];
            const blockMarksErr = blockMarksErrors[block.id] || errors.blocks?.[block.id]?.score || '';
            const isActive = activeBlockId === block.id;

            // Create/get rich text ref for this block
            if (!activeBlockRichTextRefs.current[block.id]) {
              activeBlockRichTextRefs.current[block.id] = React.createRef<HTMLDivElement>();
            }
            const richTextRef = activeBlockRichTextRefs.current[block.id];

            return (
              <div
                key={block.id}
                ref={el => { blockRefs.current[block.id] = el; }}
                onClick={() => setActiveBlockId(block.id)}
                className={`bg-white rounded-xl border transition-all duration-150 shadow-sm cursor-pointer ${
                  hasErr ? 'border-red-300 shadow-red-100' :
                  isActive ? 'border-violet-400 ring-1 ring-violet-200' :
                  'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start gap-2.5 px-4 pt-3.5 pb-2">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white mt-0.5 ${isActive ? 'bg-violet-600' : 'bg-slate-400'}`}>{idx + 1}</div>

                  <button onClick={e => { e.stopPropagation(); toggleCollapse(block.id); }} className="flex-shrink-0 p-1 hover:bg-slate-100 rounded-md transition-colors mt-0.5">
                    {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {collapsed ? (
                      <p className="text-xs text-slate-500 py-0.5 truncate">{block.questionText.replace(/<[^>]*>/g, '').trim() || <span className="text-slate-300 italic">Empty question</span>}</p>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          {!block.questionImageUrl && (
                            <label className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-violet-600 cursor-pointer transition-colors" onClick={e => e.stopPropagation()}>
                              <Image className="h-2.5 w-2.5" /><span>Add image</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleQuestionImageUpload(block.id, f); }} />
                            </label>
                          )}
                        </div>

                        <RichTextEditor
                          value={block.questionText}
                          onChange={v => handleQuestionChange(block.id, v)}
                          placeholder="Type your question here…"
                          editorRef={richTextRef as React.RefObject<HTMLDivElement>}
                        />

                        {block.questionImageUrl && (
                          <div className="mt-2 relative">
                            {activeImageToolbar?.type === 'question' && activeImageToolbar.blockId === block.id && (
                              <ImageToolbar alignment={block.questionImageAlignment || 'center'} sizePercent={block.questionImageSizePercent || 60} onAlignmentChange={a => updateBlock(block.id, { questionImageAlignment: a })} onSizeChange={v => updateBlock(block.id, { questionImageSizePercent: v })} onRemove={() => removeQuestionImage(block.id)} onClose={() => setActiveImageToolbar(null)} />
                            )}
                            <div style={{ display: 'flex', justifyContent: block.questionImageAlignment === 'left' ? 'flex-start' : block.questionImageAlignment === 'right' ? 'flex-end' : 'center', marginTop: activeImageToolbar?.type === 'question' && activeImageToolbar.blockId === block.id ? '60px' : '0' }}>
                              <div style={{ width: `${block.questionImageSizePercent || 60}%` }} className="cursor-pointer" onClick={() => handleQuestionImageClick(block.id)}>
                                <img src={block.questionImageUrl} alt="" className={`w-full h-auto rounded-lg border-2 ${activeImageToolbar?.type === 'question' && activeImageToolbar.blockId === block.id ? 'border-violet-400 ring-2 ring-violet-100' : 'border-transparent hover:border-violet-200'}`} />
                              </div>
                            </div>
                          </div>
                        )}

                        {hasErr && errors.blocks![block.id]?.questionText && <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg"><AlertCircle className="h-3.5 w-3.5" />{errors.blocks![block.id]?.questionText}</div>}

                        {blockMarksErr && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{blockMarksErr}
                          </div>
                        )}

                        <div className="mt-2.5">
                          <label className="flex items-center gap-1.5 cursor-pointer group/exp" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={block.hasExplanation} onChange={() => toggleExplanation(block.id)} className="w-3.5 h-3.5 rounded border-slate-300 accent-violet-600" />
                            <span className="text-[11px] text-slate-400 group-hover/exp:text-violet-600 transition-colors flex items-center gap-1"><HelpCircle className="h-3 w-3" />Add explanation</span>
                          </label>
                          {block.hasExplanation && (
                            <div className="mt-1.5 ml-5 pl-3 border-l-2 border-violet-200">
                              <RichTextEditor value={block.explanation || ''} onChange={v => handleExplanationChange(block.id, v)} placeholder="Explain the correct answer…" compact />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Score and Difficulty */}
                  <div className="flex items-center gap-2 mr-2" onClick={e => e.stopPropagation()}>
                    {scoringType === 'questionSpecific' ? (
                      <div className={`flex items-center gap-1 border rounded-lg px-2 py-1.5 transition-colors ${blockMarksErr ? 'bg-red-50 border-red-300' : 'bg-violet-50 border-violet-200'}`}>
                        <Hash className={`h-3 w-3 ${blockMarksErr ? 'text-red-400' : 'text-violet-500'}`} />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={block.score ?? 0}
                          onChange={e => handleScoreChange(block.id, e.target.value)}
                          className={`w-12 text-xs font-bold bg-transparent border-0 outline-none p-0 text-center ${blockMarksErr ? 'text-red-700' : 'text-violet-700'}`}
                          title="Points for this question"
                        />
                        <span className={`text-[10px] ${blockMarksErr ? 'text-red-400' : 'text-violet-500'}`}>pts</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5">
                        <span className="text-xs font-bold text-emerald-700">{marksPerQuestion}</span>
                        <span className="text-[10px] text-emerald-500 ml-1">pts</span>
                      </div>
                    )}

                    {/* Difficulty Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowDifficultyMenu(showDifficultyMenu === block.id ? null : block.id)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${diff.bg} ${diff.text} border border-transparent hover:border-current/20`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                        <span className="capitalize">{block.difficulty || 'medium'}</span>
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                      {showDifficultyMenu === block.id && (
                        <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                          {(['easy', 'medium', 'hard'] as const).map((level) => (
                            <button key={level} onClick={() => { updateBlock(block.id, { difficulty: level }); setShowDifficultyMenu(null); }}
                              className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${block.difficulty === level ? diffConfig[level].text + ' font-semibold' : 'text-slate-600'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${diffConfig[level].dot}`} />
                              <span className="capitalize">{level}</span>
                              {block.difficulty === level && <Check className="h-3 w-3 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type picker */}
                  <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setShowQuestionTypeMenu(showQuestionTypeMenu === block.id ? null : block.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${qtype.bg} ${qtype.color} border-transparent hover:border-current/20`}
                    >
                      {qtype.icon}<span className="max-w-[80px] truncate">{qtype.label}</span><ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                    {showQuestionTypeMenu === block.id && (
                      <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50">
                        <p className="px-3 py-1 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Question Type</p>
                        {(Object.entries(typeConfig) as [QuestionType, typeof typeConfig[QuestionType]][]).map(([t, cfg]) => (
                          <button key={t} onClick={() => { setQuestionBlocks(bs => bs.map(b => b.id === block.id ? { ...b, type: t, hasOtherOption: t === 'dropdown' ? false : b.hasOtherOption } : b)); setShowQuestionTypeMenu(null); }}
                            className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-xs ${block.type === t ? `${cfg.color} font-semibold` : 'text-slate-700'}`}>
                            <span className={block.type === t ? cfg.color : 'text-slate-400'}>{cfg.icon}</span>
                            {cfg.label}
                            {block.type === t && <Check className="h-3 w-3 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Options area */}
                <div onClick={e => e.stopPropagation()}>
                  {renderQuestionContent(block)}
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => duplicateQuestionBlock(block.id)} title="Duplicate" className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-slate-700">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeQuestionBlock(block.id)} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg transition-all text-slate-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <button onClick={() => moveBlock(block.id, 'up')} disabled={idx === 0} title="Move up" className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-slate-700 disabled:opacity-25 disabled:cursor-not-allowed">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveBlock(block.id, 'down')} disabled={idx === questionBlocks.length - 1} title="Move down" className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-slate-700 disabled:opacity-25 disabled:cursor-not-allowed">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] font-semibold text-slate-500">Required</span>
                    <button onClick={() => toggleRequired(block.id)} className={`relative rounded-full transition-colors ${block.isRequired ? 'bg-violet-600' : 'bg-slate-200'}`} style={{ width: 32, height: 18 }}>
                      <div className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${block.isRequired ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Question Button */}
        <div className="max-w-4xl mx-auto mt-3">
          <button
            onClick={addQuestionBlock}
            disabled={limitReached}
            title={limitReached ? (limitMessage || 'Limit reached') : 'Add another question'}
            className={`w-full border-2 border-dashed py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all shadow-sm
              ${limitReached
                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                : 'bg-slate-50 border-slate-400 hover:border-violet-500 hover:bg-violet-100 text-slate-800 hover:text-violet-800 hover:shadow-md'}`}
          >
            <Plus className="h-5 w-5" />
            {limitReached ? 'Limit reached — cannot add more questions' : 'Add another question'}
          </button>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          {questionBlocks.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {questionBlocks.length} question{questionBlocks.length !== 1 ? 's' : ''} ready
              {scoringType === 'equalDistribution' && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-semibold ml-1">{marksPerQuestion}mark each</span>}
              {scoringType === 'questionSpecific' && maxMcqMarks > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ml-1 ${getRemainingMarks() < 0 ? 'bg-red-50 text-red-600' : 'bg-violet-50 text-violet-600'}`}>
                  {currentFormMarks().toFixed(1)} pts this form
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCancelClick} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-all">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !questionBlocks.length || Object.values(blockMarksErrors).some(e => !!e)}
            className={`px-5 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 ${isSaving ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {isSaving ? <><Loader className="h-3.5 w-3.5 animate-spin" />Saving…</> : isEditing ? <><Check className="h-3.5 w-3.5" />Update</> : <><Save className="h-3.5 w-3.5" />Save Questions</>}
          </button>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR TOOLBAR ── */}
      <RightSidebarToolbar
        onAddQuestion={addQuestionBlock}
        onImportQuestion={() => { /* TODO: implement import */ }}
        onFocusRichText={handleSidebarFocusRichText}
        onAddImage={handleSidebarAddImage}
        hasActiveBlock={!!activeBlockId}
        limitReached={limitReached}
      />

      {/* ── DIALOGS ── */}
      <UnfilledBlocksDialog isOpen={showUnfilledDialog} unfilledCount={unfilledCount} onClose={() => setShowUnfilledDialog(false)} />
      <SaveDuplicateDialog isOpen={showSaveDuplicateWarning} onRegenerate={handleSaveDuplicateRegenerate} onAddAnyway={handleSaveDuplicateAddAnyway} onDeleteDuplicates={handleSaveDuplicateDelete} duplicateCount={saveDuplicateQuestions.length} duplicateQuestions={saveDuplicateQuestions} />
      <DuplicateWarningDialog isOpen={showDuplicateWarning} onConfirm={handleDuplicateWarningConfirm} onRegenerate={handleDuplicateWarningRegenerate} onCancel={handleDuplicateWarningCancel} duplicateCount={duplicateCount} />
      <DuplicateRegenerationDialog isOpen={showDuplicateRegenerationDialog} onConfirm={handleDuplicateWarningConfirm} onRegenerateSelected={handleRegenerateSelectedDuplicates} onCancel={() => { setShowDuplicateRegenerationDialog(false); setDuplicateQuestionsList([]); setPendingQuestions([]); setDuplicateCount(0); }} duplicateQuestions={duplicateQuestionsList} topic={pendingQuestions[0]?.questionText.replace(/<[^>]*>/g, '').trim() || exerciseData?.topic || 'General'} />
      <SingleDuplicateDialog isOpen={showSingleDuplicateWarning} onConfirm={handleSingleDuplicateConfirm} onRegenerate={handleSingleDuplicateRegenerate} onCancel={handleSingleDuplicateCancel} currentQuestion={pendingSingleQuestion} duplicateQuestion={singleDuplicateQuestion} isRegenerating={isRegeneratingDuplicate} regenerationError={regenerationError} />
      <RegenerationComparisonDialog isOpen={showRegenerationComparison} onAccept={handleRegenerationAccept} onReject={handleRegenerationReject} onRegenerate={handleRegenerationRegenerate} originalQuestion={pendingSingleQuestion} regeneratedQuestion={regeneratedQuestion} />
      <ConfirmationDialog isOpen={showCloseConfirmation} onConfirm={() => { setShowCloseConfirmation(false); onClose(); }} onCancel={() => setShowCloseConfirmation(false)} message="You have unsaved questions. Your draft is auto-saved locally. Close anyway?" />
      <ConfirmationDialog isOpen={showCancelConfirmation} onConfirm={() => { setShowCancelConfirmation(false); onClose(); }} onCancel={() => setShowCancelConfirmation(false)} message="You have unsaved questions. Your draft is auto-saved locally. Cancel anyway?" />
      <QuestionTemplateCreator isOpen={showTemplateCreator} onClose={() => setShowTemplateCreator(false)} onCreateQuestions={createQuestionsFromTemplate} />
    </div>
  );
};

export default MCQQuestionForm;