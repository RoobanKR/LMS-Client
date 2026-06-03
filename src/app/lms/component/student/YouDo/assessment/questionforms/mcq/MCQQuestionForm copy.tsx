import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, AlertCircle, Loader, X, Copy, ChevronUp, ChevronDown, Sparkles,
  List, CheckSquare, AlignLeft, ChevronDown as ChevronDownIcon,
  Bold, Italic, Underline, Image, HelpCircle,
  ZoomIn, ZoomOut, Check, Hash, RefreshCw, Save,
  BookOpen, Pencil, Type, ChevronLeft, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Info, Target, Award,
  BarChart3, Clock, Layers, FileText, Settings
} from 'lucide-react';

import GenerateMCQAIQuestion, { GeneratedQuestion } from './GenerateMCQAIQuestion';

const GEMINI_API_KEY = "AIzaSyDXTexkHW8M62kXYXGuNgwV_n1pBwsWANs";
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
  easy:   { label: 'Easy',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', btn: 'bg-emerald-500 text-white', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'Medium', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   btn: 'bg-amber-500 text-white',   pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  hard:   { label: 'Hard',   bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500',     btn: 'bg-red-500 text-white',     pill: 'bg-red-50 text-red-700 border-red-200' },
};

const typeConfig: Record<QuestionType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  'multiple-choice': { label: 'Multiple Choice', icon: <List className="h-3.5 w-3.5" />,          color: 'text-violet-600', bg: 'bg-violet-50' },
  'checkboxes':      { label: 'Checkboxes',       icon: <CheckSquare className="h-3.5 w-3.5" />,   color: 'text-blue-600',   bg: 'bg-blue-50' },
  'dropdown':        { label: 'Dropdown',          icon: <ChevronDownIcon className="h-3.5 w-3.5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  'short-answer':    { label: 'Short Answer',      icon: <AlignLeft className="h-3.5 w-3.5" />,     color: 'text-orange-600', bg: 'bg-orange-50' },
  'paragraph':       { label: 'Paragraph',         icon: <BookOpen className="h-3.5 w-3.5" />,      color: 'text-teal-600',   bg: 'bg-teal-50' },
};

// ─── MARKS HELPERS ──────────────────────────────────────────────────────────
const getMaxMcqMarks = (exerciseData: any): number => {
  const fullData = exerciseData?.fullExerciseData;
  const exerciseType = (fullData?.exerciseType || exerciseData?.exerciseType || '').toLowerCase();
  const info = fullData?.exerciseInformation || fullData?.exerciseInfo || {};
  if (exerciseType.includes('combined')) return Number(info.totalMarksMCQ ?? info.totalMcqMarks ?? 0);
  return Number(info.totalMarks ?? info.totalMcqMarks ?? 0);
};

const getExistingMcqMarks = (exerciseData: any): number => {
  const questions: any[] = exerciseData?.fullExerciseData?.questions || [];
  return questions.filter((q: any) => q.questionType === 'mcq').reduce((sum: number, q: any) => sum + Number(q.mcqQuestionScore ?? q.score ?? 0), 0);
};

const getExistingMcqCount = (exerciseData: any): number => {
  const questions: any[] = exerciseData?.fullExerciseData?.questions || [];
  return questions.filter((q: any) => q.questionType === 'mcq').length;
};

// ─── BREADCRUMB ──────────────────────────────────────────────────────────────
const BreadcrumbArrow: React.FC = () => (
  <span className="text-emerald-500 mx-1.5 text-[13px] font-bold select-none">»</span>
);

const QuestionFormBreadcrumb: React.FC<{
  breadcrumbs: any[]; tabType: string; exerciseName?: string; actionLabel: string; questionLabel: string;
}> = ({ breadcrumbs, tabType, exerciseName, actionLabel, questionLabel }) => (
  <nav className="flex items-center">
    <ol className="flex items-center flex-wrap gap-y-0.5">
      {breadcrumbs.map((crumb: any, idx: number) => (
        <React.Fragment key={idx}>
          <li><span className="text-[12px] font-medium text-slate-500 truncate max-w-[100px]" title={crumb.name}>{crumb.name}</span></li>
          <li><BreadcrumbArrow /></li>
        </React.Fragment>
      ))}
      {tabType && <><li><span className="text-[12px] font-medium text-slate-500 capitalize">{tabType}</span></li><li><BreadcrumbArrow /></li></>}
      {exerciseName && <><li><span className="text-[12px] font-medium text-slate-600 truncate max-w-[120px]" title={exerciseName}>{exerciseName}</span></li><li><BreadcrumbArrow /></li></>}
      <li><span className="text-[12px] font-medium text-slate-600">{actionLabel}</span></li>
      {questionLabel && questionLabel !== actionLabel && (
        <><li><BreadcrumbArrow /></li>
        <li className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-slate-800">{questionLabel}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </li></>
      )}
    </ol>
  </nav>
);

// ─── SMALL MODAL PRIMITIVES ──────────────────────────────────────────────────
const SmallModal: React.FC<{ icon: React.ReactNode; iconBg: string; title: string; children: React.ReactNode }> = ({ icon, iconBg, title, children }) => (
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

// ─── CONFIRMATION DIALOG ─────────────────────────────────────────────────────
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
      <div className={`flex items-center gap-0.5 ${compact ? 'mb-1' : 'mb-2'}`}>
        {[['bold', <Bold className="h-3 w-3" />], ['italic', <Italic className="h-3 w-3" />], ['underline', <Underline className="h-3 w-3" />]].map(([cmd, icon]) => (
          <button key={cmd as string} type="button" onClick={() => execCommand(cmd as string)}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-md transition-colors">
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
          className="focus:outline-none text-sm text-slate-800 leading-relaxed min-h-[36px] border-b-2 border-slate-200 focus:border-blue-400 pb-1.5 transition-colors [&_strong]:font-bold [&_em]:italic [&_u]:underline"
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
            className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${alignment === a ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}>
            {a[0].toUpperCase()}
          </button>
        ))}
      </div>
    </div>
    <div className="flex flex-col justify-center px-3 py-2 gap-1 flex-1">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Size {sizePercent}%</span>
      <div className="flex items-center gap-1.5">
        <ZoomOut className="h-3 w-3 text-slate-300" />
        <input type="range" min={10} max={100} step={5} value={sizePercent} onChange={e => onSizeChange(parseInt(e.target.value))} className="flex-1 h-1.5 accent-blue-600 cursor-pointer" />
        <ZoomIn className="h-3 w-3 text-slate-300" />
      </div>
    </div>
    <div className="flex items-center gap-0.5 px-2 py-2">
      <button onClick={onRemove} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
      <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><X className="h-3.5 w-3.5" /></button>
    </div>
  </div>
);

// ─── OPTIONS PER ROW PICKER ──────────────────────────────────────────────────
const OptionsPerRowPicker: React.FC<{ value: 1 | 2 | 3 | 4; onChange: (v: 1 | 2 | 3 | 4) => void }> = ({ value, onChange }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] font-semibold text-slate-400">Layout:</span>
    {([1, 2, 3, 4] as const).map(n => (
      <button key={n} onClick={() => onChange(n)}
        className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${value === n ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}>
        {n}
      </button>
    ))}
    <span className="text-[10px] text-slate-400">per row</span>
  </div>
);

// ─── EXERCISE DETAILS RIGHT PANEL ───────────────────────────────────────────
const ExerciseDetailsPanel: React.FC<{
  exerciseData: any;
  scoringType: string;
  marksPerQuestion: number;
  totalMcqQuestions: number;
  maxMcqMarks: number;
  existingMcqMarks: number;
  existingMcqCount: number;
  currentFormMarks: number;
  currentFormCount: number;
  getRemainingMarks: () => number;
  currentDifficulty?: string;
}> = ({ exerciseData, scoringType, marksPerQuestion, totalMcqQuestions, maxMcqMarks, existingMcqMarks, existingMcqCount, currentFormMarks, currentFormCount, getRemainingMarks, currentDifficulty }) => {
  const info = exerciseData?.fullExerciseData?.exerciseInformation || {};
  const exerciseType = exerciseData?.fullExerciseData?.exerciseType || exerciseData?.exerciseType || '';
  const diff = diffConfig[currentDifficulty as keyof typeof diffConfig || 'medium'] || diffConfig.medium;

  const rows: { label: string; value: React.ReactNode }[] = [];
  if (info.exerciseId) rows.push({ label: 'Exercise ID', value: <span className="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">{info.exerciseId}</span> });
  if (info.exerciseName || exerciseData?.exerciseName) rows.push({ label: 'Name', value: <span className="font-semibold text-slate-800 text-[11px]">{info.exerciseName || exerciseData?.exerciseName}</span> });
  if (exerciseType) rows.push({ label: 'Type', value: <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-full font-semibold border ${exerciseType === 'MCQ' ? 'bg-green-50 text-green-700 border-green-200' : exerciseType === 'Combined' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{exerciseType}</span> });
  if (info.totalDuration > 0) rows.push({ label: 'Duration', value: <span className="text-[11px] text-slate-600 flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" />{info.totalDuration} mins</span> });
  rows.push({ label: 'Scoring', value: <span className="text-[11px] text-indigo-700 font-semibold">{scoringType === 'equalDistribution' ? 'Equal Distribution' : 'Custom Points'}</span> });
  if (scoringType === 'equalDistribution' && marksPerQuestion > 0) rows.push({ label: 'Marks / Q', value: <span className="text-[12px] font-bold text-emerald-700">{marksPerQuestion} pts</span> });
  if (scoringType === 'questionSpecific' && maxMcqMarks > 0) rows.push({ label: 'Max Marks', value: <span className="text-[12px] font-bold text-violet-700">{maxMcqMarks} pts</span> });
  if (totalMcqQuestions > 0) rows.push({ label: 'Total Slots', value: <span className="text-[12px] font-bold text-slate-700">{existingMcqCount + currentFormCount} / {totalMcqQuestions}</span> });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
            <FileText className="h-3 w-3 text-blue-600" />
          </div>
          <span className="text-xs font-bold text-slate-700">Exercise Details</span>
        </div>
      </div>

      {/* Detail rows */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="px-4 py-3 space-y-2.5">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0">{label}</span>
              <span className="text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-slate-100 my-1" />

        {/* Difficulty section */}
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Difficulty</p>
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 ${diff.bg} ${diff.border}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${diff.dot}`} />
            <span className={`text-sm font-bold capitalize ${diff.text}`}>{currentDifficulty || 'Medium'}</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {(['easy', 'medium', 'hard'] as const).map(d => {
              const c = diffConfig[d];
              const active = (currentDifficulty || 'medium') === d;
              return (
                <div key={d} className={`flex-1 h-1.5 rounded-full transition-all ${active ? c.dot : 'bg-slate-100'}`} />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-emerald-500 font-semibold">Easy</span>
            <span className="text-[9px] text-amber-500 font-semibold">Med</span>
            <span className="text-[9px] text-red-500 font-semibold">Hard</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── LEFT SIDEBAR QUESTION PANEL ─────────────────────────────────────────────
const QuestionSidebarPanel: React.FC<{
  questionBlocks: QuestionBlock[];
  currentIndex: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  limitReached: boolean;
  scoringType: string;
  marksPerQuestion: number;
  currentBlockValid: boolean;
}> = ({ questionBlocks, currentIndex, onSelect, onAdd, limitReached, scoringType, marksPerQuestion, currentBlockValid }) => {
  const canAdd = currentBlockValid && !limitReached;
  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-3 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Questions</p>
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{questionBlocks.length}</span>
        </div>
        <button
          onClick={onAdd}
          disabled={!canAdd}
          title={!currentBlockValid ? 'Complete current question first' : limitReached ? 'Question limit reached' : 'Add new question'}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border-2 border-dashed
            ${!canAdd
              ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
              : 'bg-white border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-blue-700'
            }`}
        >
          <Plus className="h-3.5 w-3.5" />
          {limitReached ? 'Limit reached' : 'Add Question'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2" style={{ scrollbarWidth: 'thin' }}>
        {questionBlocks.map((block, idx) => {
          const isActive = idx === currentIndex;
          const hasText = block.questionText.replace(/<[^>]*>/g, '').trim() !== '';
          const diff = diffConfig[block.difficulty || 'medium'];
          const qtype = typeConfig[block.type];
          const score = scoringType === 'equalDistribution' ? marksPerQuestion : (block.score || 0);

          return (
            <button
              key={block.id}
              onClick={() => onSelect(idx)}
              className={`w-full text-left mb-1.5 rounded-xl border transition-all group ${
                isActive
                  ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-100'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
              }`}
            >
              <div className="p-2.5">
                <div className="flex items-start gap-2">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black mt-0.5 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold truncate leading-tight ${isActive ? 'text-white' : 'text-slate-800'}`}>
                      {hasText
                        ? block.questionText.replace(/<[^>]*>/g, '').trim().slice(0, 45) + (block.questionText.replace(/<[^>]*>/g, '').trim().length > 45 ? '…' : '')
                        : <span className={isActive ? 'text-blue-200 font-normal italic' : 'text-slate-300 font-normal italic'}>Untitled question</span>
                      }
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        isActive ? 'bg-white/20 text-white' : `${qtype.bg} ${qtype.color}`
                      }`}>
                        {qtype.label.split(' ')[0]}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        isActive ? 'bg-white/20 text-white' : `${diff.bg} ${diff.text}`
                      }`}>
                        {diff.label}
                      </span>
                      {score > 0 && (
                        <span className={`text-[9px] font-bold ml-auto ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                          {score}pt
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Options mini-preview */}
                {!isActive && hasText && block.options?.some(o => o.text.trim()) && (
                  <div className="mt-1.5 pl-7 space-y-0.5">
                    {block.options.filter(o => o.text.trim()).slice(0, 2).map((opt, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.isCorrect ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                        <span className="text-[9px] text-slate-400 truncate">{opt.text.slice(0, 25)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const MCQQuestionForm: React.FC<MCQQuestionFormProps> = ({
  breadcrumbs, exerciseData, tabType, initialData, isEditing = false,
  onClose, onSave, isSaving = false, saveProgress, saveMessage
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showQuestionTypeMenu, setShowQuestionTypeMenu] = useState(false);
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
  const [activeImageToolbar, setActiveImageToolbar] = useState<{ type: 'question'; blockId: string } | { type: 'option'; blockId: string; optionId: string } | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [blockMarksErrors, setBlockMarksErrors] = useState<{ [blockId: string]: string }>({});
  const [errors, setErrors] = useState<{ blocks?: { [k: string]: any } }>({});
  const [aiGenerationKey, setAiGenerationKey] = useState(0);
  // Tracks which block IDs have been "confirmed" via Next Question
  const [confirmedBlockIds, setConfirmedBlockIds] = useState<Set<string>>(new Set());

  const richTextRefs = useRef<{ [id: string]: React.RefObject<HTMLDivElement> }>({});
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ─── DERIVED CONFIG ──────────────────────────────────────────────────────
  const scoringType: string = exerciseData?.fullExerciseData?.questionConfiguration?.mcqQuestionConfiguration?.scoringType || 'equalDistribution';
  const marksPerQuestion: number = exerciseData?.fullExerciseData?.questionConfiguration?.mcqQuestionConfiguration?.marksPerQuestion || 0;
  const totalMcqQuestions: number = exerciseData?.fullExerciseData?.questionConfiguration?.mcqQuestionConfiguration?.totalMcqQuestions || 0;
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
    isActive: true, sequence, sampleInput: '', sampleOutput: '',
  });

  // ─── MARKS COMPUTATION ───────────────────────────────────────────────────
  const currentFormMarks = useCallback((): number => {
    if (scoringType !== 'questionSpecific') return 0;
    return questionBlocks.reduce((sum, b) => sum + (Number(b.score) || 0), 0);
  }, []);

  const getRemainingMarks = (): number => {
    if (scoringType !== 'questionSpecific' || maxMcqMarks <= 0) return Infinity;
    return maxMcqMarks - existingMcqMarks - questionBlocks.reduce((sum, b) => sum + (Number(b.score) || 0), 0);
  };

  const isLimitReached = (): boolean => {
    if (scoringType === 'equalDistribution') {
      if (totalMcqQuestions <= 0) return false;
      return (existingMcqCount + questionBlocks.length) >= totalMcqQuestions;
    }
    if (maxMcqMarks <= 0) return false;
    const latestExistingMarks = getExistingMcqMarks(exerciseData);
    const currentMarks = questionBlocks.reduce((sum, b) => sum + (Number(b.score) || 0), 0);
    return (maxMcqMarks - latestExistingMarks - currentMarks) < 0.1;
  };

  const validateBlockScore = (blockId: string, newScore: number): string | null => {
    if (scoringType !== 'questionSpecific' || maxMcqMarks <= 0) return null;
    const otherBlocksMarks = questionBlocks.reduce((sum, b) => (b.id !== blockId ? sum + (Number(b.score) || 0) : sum), 0);
    const total = existingMcqMarks + otherBlocksMarks + newScore;
    if (total > maxMcqMarks) {
      const available = maxMcqMarks - existingMcqMarks - otherBlocksMarks;
      return `Max allowed: ${Math.max(0, available).toFixed(1)} pts`;
    }
    return null;
  };

  // ─── INITIAL STATE ───────────────────────────────────────────────────────
  const [questionBlocks, setQuestionBlocks] = useState<QuestionBlock[]>(() => {
    if (isEditing && initialData) {
      const arr = Array.isArray(initialData) ? initialData : [initialData];
      return arr.map((d: any, i: number) => {
        const id = d.id || `block-${i}-${Date.now()}`;
        return {
          ...makeDefaultBlock(id),
          id, type: mapApiTypeToInternal(d.questionType || 'multiple_choice'),
          questionText: d.questionTitle || d.questionText || d.title || '',
          title: (d.questionTitle || d.questionText || d.title || '').replace(/<[^>]*>/g, '').trim(),
          options: d.options?.map((o: any, oi: number) => ({ id: o.id || `opt-${i}-${oi}`, text: o.text || o.content || '', isCorrect: o.isCorrect || false, imageUrl: o.imageUrl || '', imageAlignment: o.imageAlignment || 'center', imageSizePercent: o.imageSizePercent || 60 })) || makeDefaultBlock(id).options,
          score: d.score || 10, difficulty: d.difficulty || 'medium',
          hasExplanation: d.hasExplanation || false, explanation: d.explanation || '',
          isRequired: d.isRequired || false, hasOtherOption: d.hasOtherOption || false,
          questionImageUrl: d.questionImageUrl || '', questionImageAlignment: d.questionImageAlignment || 'center',
          questionImageSizePercent: d.questionImageSizePercent || 60, optionsPerRow: d.optionsPerRow || 1,
        };
      });
    }
    return [makeDefaultBlock(generateId('block'), 0)];
  });

  function mapApiTypeToInternal(t: string): QuestionType {
    return ({ 'multiple_choice': 'multiple-choice', 'checkboxes': 'checkboxes', 'dropdown': 'dropdown', 'short_answer': 'short-answer', 'essay': 'paragraph' } as any)[t] || 'multiple-choice';
  }
  const mapInternalTypeToApi = (t: QuestionType) => ({ 'multiple-choice': 'multiple_choice', 'checkboxes': 'checkboxes', 'dropdown': 'dropdown', 'short-answer': 'short_answer', 'paragraph': 'essay' }[t] || 'multiple_choice');

  // Draft loading
  useEffect(() => {
    if (!isEditing && !initialData && exerciseData?.id && !hasLoadedFromStorage) {
      const key = getStorageKey(exerciseData.id);
      if (key) {
        try {
          const saved = localStorage.getItem(key);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.length > 0) setQuestionBlocks(parsed);
          }
        } catch (e) { console.error('Draft load failed', e); }
      }
      setHasLoadedFromStorage(true);
    }
  }, [isEditing, initialData, exerciseData?.id, hasLoadedFromStorage]);

  // Auto-save draft
  useEffect(() => {
    if (!isEditing && exerciseData?.id && hasLoadedFromStorage) {
      const key = getStorageKey(exerciseData.id);
      if (key) {
        const hasContent = questionBlocks.some(b => b.questionText.replace(/<[^>]*>/g, '').trim() || b.options.some(o => o.text.trim()));
        if (hasContent) localStorage.setItem(key, JSON.stringify(questionBlocks));
      }
    }
  }, [questionBlocks, isEditing, exerciseData?.id, hasLoadedFromStorage]);

  const clearDraft = () => { const key = getStorageKey(exerciseData?.id); if (key) localStorage.removeItem(key); };

  const currentBlock = questionBlocks[currentIndex];

  // Ensure richtext ref exists
  if (currentBlock && !richTextRefs.current[currentBlock.id]) {
    richTextRefs.current[currentBlock.id] = React.createRef<HTMLDivElement>();
  }

  // ─── BLOCK MUTATIONS ─────────────────────────────────────────────────────
  const updateBlock = (id: string, patch: Partial<QuestionBlock>) => setQuestionBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b));
  const updateOption = (bid: string, oid: string, patch: Partial<MCQOption>) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, options: b.options.map(o => o.id === oid ? { ...o, ...patch } : o) } : b));

  const handleQuestionChange = (id: string, v: string) => updateBlock(id, { questionText: v || '', title: v.replace(/<[^>]*>/g, '').trim() || 'Untitled Question' });

  const handleScoreChange = (blockId: string, rawValue: string) => {
    const newScore = parseFloat(rawValue.replace(/[^0-9.]/g, '')) || 0;
    const err = validateBlockScore(blockId, newScore);
    setBlockMarksErrors(prev => ({ ...prev, [blockId]: err || '' }));
    updateBlock(blockId, { score: newScore });
  };

  // Validate a single block, return true if ok
  const validateSingleBlock = (b: QuestionBlock): boolean => {
    const be: any = {};
    if (!b.questionText.replace(/<[^>]*>/g, '').trim()) be.questionText = 'Question text is required';
    if (['multiple-choice', 'checkboxes', 'dropdown'].includes(b.type)) {
      if (b.options.filter(o => o.text.trim()).length < 2) be.options = 'At least 2 options required';
      if (!b.options.some(o => o.isCorrect)) be.correctAnswer = b.type === 'checkboxes' ? 'Mark at least one correct' : 'Mark one correct answer';
    }
    if (scoringType === 'questionSpecific') {
      const scoreErr = validateBlockScore(b.id, Number(b.score) || 0);
      if (scoreErr) be.score = scoreErr;
    }
    if (Object.keys(be).length > 0) {
      setErrors(prev => ({ blocks: { ...prev.blocks, [b.id]: be } }));
      return false;
    }
    // Clear errors for this block
    setErrors(prev => {
      const nb = { ...(prev.blocks || {}) };
      delete nb[b.id];
      return { blocks: nb };
    });
    return true;
  };

  // "Next Question" button on card — validate current, mark confirmed, go to next or add new
  const handleNextQuestion = () => {
    if (!currentBlock) return;
    const valid = validateSingleBlock(currentBlock);
    if (!valid) return;
    // Mark as confirmed
    setConfirmedBlockIds(prev => new Set(prev).add(currentBlock.id));
    if (currentIndex < questionBlocks.length - 1) {
      // Navigate to next existing question
      setCurrentIndex(currentIndex + 1);
      mainScrollRef.current?.scrollTo({ top: 0 });
    } else {
      // On last question: always add a new blank (limit check happens inside)
      const id = generateId('block');
      const newBlock = makeDefaultBlock(id, questionBlocks.length);
      setQuestionBlocks(bs => [...bs, newBlock]);
      setCurrentIndex(questionBlocks.length);
      mainScrollRef.current?.scrollTo({ top: 0 });
    }
  };

  const addQuestionBlock = () => {
    if (isLimitReached()) return;
    const id = generateId('block');
    const newBlock = makeDefaultBlock(id, questionBlocks.length);
    setQuestionBlocks(bs => [...bs, newBlock]);
    setCurrentIndex(questionBlocks.length);
    setTimeout(() => mainScrollRef.current?.scrollTo({ top: 0 }), 50);
  };

  const removeQuestionBlock = (id: string) => {
    if (questionBlocks.length === 1) {
      const e = makeDefaultBlock(generateId('block'), 0);
      setQuestionBlocks([e]);
      setCurrentIndex(0);
    } else {
      const newBlocks = questionBlocks.filter(b => b.id !== id).map((b, i) => ({ ...b, sequence: i }));
      setQuestionBlocks(newBlocks);
      const newIdx = Math.min(currentIndex, newBlocks.length - 1);
      setCurrentIndex(newIdx);
    }
    setBlockMarksErrors(prev => { const ns = { ...prev }; delete ns[id]; return ns; });
  };

  const addOption = (bid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, options: [...b.options, { id: generateId(`opt-${bid}`), text: '', isCorrect: false, imageAlignment: 'center' as const, imageSizePercent: 60 }] } : b));
  const addOtherOption = (bid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, hasOtherOption: true, options: [...b.options, { id: generateId(`other-${bid}`), text: 'Other', isCorrect: false, imageAlignment: 'center' as const, imageSizePercent: 60 }] } : b));
  const removeOtherOption = (bid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, hasOtherOption: false, options: b.options.filter(o => !o.id.includes('other-')) } : b));
  const updateOptionText = (bid: string, oid: string, t: string) => updateOption(bid, oid, { text: t });
  const setCorrectAnswer = (bid: string, oid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, options: b.options.map(o => ({ ...o, isCorrect: o.id === oid })) } : b));
  const toggleCorrectAnswer = (bid: string, oid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid ? { ...b, options: b.options.map(o => o.id === oid ? { ...o, isCorrect: !o.isCorrect } : o) } : b));
  const removeOption = (bid: string, oid: string) => setQuestionBlocks(bs => bs.map(b => b.id === bid && b.options.length > 2 ? { ...b, options: b.options.filter(o => o.id !== oid) } : b));

  const handleQuestionImageUpload = (bid: string, file: File) => {
    const r = new FileReader();
    r.onload = e => {
      updateBlock(bid, { questionImageUrl: e.target?.result as string, questionImageAlignment: 'center', questionImageSizePercent: 60 });
      setActiveImageToolbar({ type: 'question', blockId: bid });
    };
    r.readAsDataURL(file);
  };
  const removeQuestionImage = (id: string) => { updateBlock(id, { questionImageUrl: '' }); setActiveImageToolbar(null); };
  const handleOptionImageUpload = (bid: string, oid: string, file: File) => {
    const r = new FileReader();
    r.onload = e => { updateOption(bid, oid, { imageUrl: e.target?.result as string, imageAlignment: 'center', imageSizePercent: 60 }); setActiveImageToolbar({ type: 'option', blockId: bid, optionId: oid }); };
    r.readAsDataURL(file);
  };
  const removeOptionImage = (bid: string, oid: string) => { updateOption(bid, oid, { imageUrl: '' }); setActiveImageToolbar(null); };

  // ─── CONVERT AI QUESTIONS ────────────────────────────────────────────────
  const convertGeneratedToBlock = (q: GeneratedQuestion, sequence: number): Partial<QuestionBlock> => ({
    type: q.type || 'multiple-choice',
    questionText: q.description ? `<p>${q.description}</p>` : '',
    title: q.title || `Question ${sequence + 1}`,
    options: (q.type !== 'short-answer' && q.type !== 'paragraph' && q.options)
      ? q.options.map((opt, oi) => ({ id: `opt-${Date.now()}-${oi}`, text: opt.text, isCorrect: opt.isCorrect || false, imageAlignment: 'center' as const, imageSizePercent: 60 }))
      : [{ id: `opt-${Date.now()}-1`, text: '', isCorrect: false, imageAlignment: 'center' as const, imageSizePercent: 60 }, { id: `opt-${Date.now()}-2`, text: '', isCorrect: false, imageAlignment: 'center' as const, imageSizePercent: 60 }],
    hasExplanation: !!q.explanation, explanation: q.explanation || '',
    difficulty: q.difficulty || 'medium', score: q.points || 10,
    optionsPerRow: q.optionsPerRow || 1,
  });

  const handleAIGeneratedQuestions = (generatedQuestions: GeneratedQuestion[]) => {
    const currentBlocks = [...questionBlocks];
    const firstEmpty = currentBlocks.length === 1 && !currentBlocks[0].questionText.replace(/<[^>]*>/g, '').trim() && currentBlocks[0].options.every(o => !o.text.trim());
    if (firstEmpty) {
      const firstBlock = { ...currentBlocks[0], ...convertGeneratedToBlock(generatedQuestions[0], 0), id: currentBlocks[0].id };
      const extra = generatedQuestions.slice(1).map((q, i) => { const id = generateId(`ai-${i}`); return { ...makeDefaultBlock(id, i + 1), ...convertGeneratedToBlock(q, i + 1), id }; });
      setQuestionBlocks([firstBlock, ...extra]);
      setCurrentIndex(0);
    } else {
      const blocks = generatedQuestions.map((q, i) => { const id = generateId(`ai-${i}`); return { ...makeDefaultBlock(id, currentBlocks.length + i), ...convertGeneratedToBlock(q, currentBlocks.length + i), id }; });
      setQuestionBlocks(prev => [...prev, ...blocks]);
      setCurrentIndex(questionBlocks.length);
    }
  };

  // ─── VALIDATION & SAVE ───────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: typeof errors = { blocks: {} };
    let valid = true;
    questionBlocks.forEach(b => {
      const be: any = {};
      if (!b.questionText.replace(/<[^>]*>/g, '').trim()) { be.questionText = 'Question text is required'; valid = false; }
      if (['multiple-choice', 'checkboxes', 'dropdown'].includes(b.type)) {
        if (b.options.filter(o => o.text.trim()).length < 2) { be.options = 'At least 2 options required'; valid = false; }
        if (!b.options.some(o => o.isCorrect)) { be.correctAnswer = 'Mark at least one correct answer'; valid = false; }
      }
      if (scoringType === 'questionSpecific') {
        const scoreErr = validateBlockScore(b.id, Number(b.score) || 0);
        if (scoreErr) { be.score = scoreErr; valid = false; }
      }
      if (Object.keys(be).length) newErrors.blocks![b.id] = be;
    });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Jump to first error block
      const firstErrorId = Object.keys(errors.blocks || {})[0];
      if (firstErrorId) {
        const idx = questionBlocks.findIndex(b => b.id === firstErrorId);
        if (idx >= 0) setCurrentIndex(idx);
      }
      return;
    }
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

  // ─── RENDER OPTIONS ──────────────────────────────────────────────────────
  const renderOptions = (block: QuestionBlock) => {
    const cols = block.optionsPerRow || 1;
    const gridCls = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'][cols - 1];
    return (
      <div className={`grid ${gridCls} gap-2`}>
        {block.options.map((opt, idx) => (
          <div key={opt.id} className="group relative">
            <div className={`flex flex-col rounded-xl border-2 transition-all duration-150 overflow-hidden cursor-pointer ${opt.isCorrect ? 'border-emerald-300 bg-emerald-50/40 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              {opt.imageUrl && (
                <div className="px-2 pt-2">
                  <div className="relative" style={{ minHeight: activeImageToolbar?.type === 'option' && activeImageToolbar.blockId === block.id && activeImageToolbar.optionId === opt.id ? '72px' : 'auto' }}>
                    {activeImageToolbar?.type === 'option' && activeImageToolbar.blockId === block.id && activeImageToolbar.optionId === opt.id && (
                      <ImageToolbar alignment={opt.imageAlignment || 'center'} sizePercent={opt.imageSizePercent || 60} onAlignmentChange={a => updateOption(block.id, opt.id, { imageAlignment: a })} onSizeChange={v => updateOption(block.id, opt.id, { imageSizePercent: v })} onRemove={() => removeOptionImage(block.id, opt.id)} onClose={() => setActiveImageToolbar(null)} />
                    )}
                    <div style={{ display: 'flex', justifyContent: opt.imageAlignment === 'left' ? 'flex-start' : opt.imageAlignment === 'right' ? 'flex-end' : 'center' }}>
                      <div style={{ width: `${opt.imageSizePercent || 60}%` }} className="cursor-pointer" onClick={() => setActiveImageToolbar(activeImageToolbar?.type === 'option' && activeImageToolbar.blockId === block.id && activeImageToolbar.optionId === opt.id ? null : { type: 'option', blockId: block.id, optionId: opt.id })}>
                        <img src={opt.imageUrl} alt="" className="w-full h-auto rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <button type="button" onClick={() => { if (block.type === 'multiple-choice' || block.type === 'dropdown') setCorrectAnswer(block.id, opt.id); else toggleCorrectAnswer(block.id, opt.id); }} className="flex-shrink-0">
                  {block.type === 'checkboxes' ? (
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-blue-400'}`}>
                      {opt.isCorrect && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${opt.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-blue-400'}`}>
                      {opt.isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  )}
                </button>
                <span className="text-[11px] font-bold text-slate-400 w-4 flex-shrink-0">{String.fromCharCode(65 + idx)}</span>
                <input type="text" value={opt.text} onChange={e => updateOptionText(block.id, opt.id, e.target.value)}
                  placeholder={opt.id.includes('other-') ? 'Other (editable)' : `Option ${String.fromCharCode(65 + idx)}`}
                  className={`flex-1 text-sm outline-none bg-transparent placeholder:text-slate-300 ${opt.isCorrect ? 'text-emerald-700 font-semibold' : 'text-slate-700'}`} />
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  {!opt.imageUrl && (
                    <label className="cursor-pointer p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Add image">
                      <Image className="h-3 w-3 text-slate-400" />
                      <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleOptionImageUpload(block.id, opt.id, f); e.target.value = ''; }} />
                    </label>
                  )}
                  {(block.options.length > 2 || opt.id.includes('other-')) && (
                    <button onClick={() => opt.id.includes('other-') ? removeOtherOption(block.id) : removeOption(block.id, opt.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
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

  const limitReached = isLimitReached();

  // Derived: is current question valid enough to enable "Add Question"
  const currentBlockIsValid = (() => {
    if (!currentBlock) return false;
    const hasText = currentBlock.questionText.replace(/<[^>]*>/g, '').trim().length > 0;
    if (!hasText) return false;
    if (['multiple-choice', 'checkboxes', 'dropdown'].includes(currentBlock.type)) {
      const filledOptions = currentBlock.options.filter(o => o.text.trim()).length;
      const hasCorrect = currentBlock.options.some(o => o.isCorrect);
      return filledOptions >= 2 && hasCorrect;
    }
    return true;
  })();

  const exerciseName = exerciseData?.exerciseName || exerciseData?.fullExerciseData?.exerciseInformation?.exerciseName || '';
  const actionLabel = isEditing ? 'Edit Questions' : 'Create Questions';
  const questionLabel = `Q ${currentIndex + 1} of ${questionBlocks.length}`;
  const blockErr = currentBlock ? errors.blocks?.[currentBlock.id] : null;
  const blockMarksErr = currentBlock ? (blockMarksErrors[currentBlock.id] || errors.blocks?.[currentBlock.id]?.score || '') : '';
  const diff = diffConfig[currentBlock?.difficulty || 'medium'];
  const qtype = typeConfig[currentBlock?.type || 'multiple-choice'];
  const totalFormMarks = questionBlocks.reduce((s, b) => s + (Number(b.score) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/50 backdrop-blur-[2px]">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Pencil className="h-4 w-4 text-white" />
          </div>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <button
            onClick={() => setLeftSidebarOpen(v => !v)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            title={leftSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {leftSidebarOpen ? <PanelLeftClose className="h-4 w-4 text-slate-500" /> : <PanelLeftOpen className="h-4 w-4 text-slate-500" />}
          </button>
          <div className="min-w-0 flex-1">
            <QuestionFormBreadcrumb breadcrumbs={breadcrumbs || []} tabType={tabType} exerciseName={exerciseName} actionLabel={actionLabel} questionLabel={questionLabel} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {/* Scoring indicator */}
          {scoringType === 'equalDistribution' && marksPerQuestion > 0 && (
            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-semibold hidden sm:inline-flex items-center gap-1">
              <Award className="h-3 w-3" />{marksPerQuestion} pts each
            </span>
          )}
          {scoringType === 'questionSpecific' && maxMcqMarks > 0 && (
            <span className={`text-[11px] px-2 py-1 rounded-lg font-semibold border hidden sm:inline-flex items-center gap-1 ${getRemainingMarks() < 0.1 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
              <Target className="h-3 w-3" />{totalFormMarks.toFixed(1)}/{maxMcqMarks} pts
            </span>
          )}

          <GenerateMCQAIQuestion
            key={aiGenerationKey}
            breadcrumbs={breadcrumbs}
            exerciseData={exerciseData}
            onClose={() => {}}
            onSave={handleAIGeneratedQuestions}
            buttonClassName="bg-violet-600 hover:bg-violet-700"
            buttonText={<span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" />Generate AI</span>}
            maxSelectableCount={totalMcqQuestions > 0 ? Math.max(0, totalMcqQuestions - existingMcqCount - questionBlocks.length) : -1}
          />

          {!isEditing && exerciseData?.id && (
            <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-1 rounded-lg font-semibold border border-blue-100 hidden sm:block">Auto-saved</span>
          )}

          <button onClick={handleCloseClick} className="p-2 hover:bg-slate-100 rounded-lg transition-colors ml-0.5">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── BODY: 3-column layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className={`flex-shrink-0 border-r border-slate-200 bg-white transition-all duration-200 overflow-hidden ${leftSidebarOpen ? 'w-56' : 'w-0'}`}>
          {leftSidebarOpen && (
            <QuestionSidebarPanel
              questionBlocks={questionBlocks}
              currentIndex={currentIndex}
              onSelect={(idx) => { setCurrentIndex(idx); mainScrollRef.current?.scrollTo({ top: 0 }); }}
              onAdd={addQuestionBlock}
              limitReached={limitReached}
              scoringType={scoringType}
              marksPerQuestion={marksPerQuestion}
              currentBlockValid={currentBlockIsValid}
            />
          )}
        </div>

        {/* MAIN CONTENT — one question at a time */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-50">
          {/* Toolbar bar — type, difficulty, delete */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              {blockErr && (
                <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                  <AlertCircle className="h-3 w-3" />Fix errors
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Question type picker */}
              <div className="relative">
                <button
                  onClick={() => setShowQuestionTypeMenu(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${qtype.bg} ${qtype.color} border-transparent hover:border-current/20`}
                >
                  {qtype.icon}<span>{qtype.label}</span><ChevronDown className="h-3 w-3 opacity-60" />
                </button>
                {showQuestionTypeMenu && currentBlock && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50">
                    <p className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Question Type</p>
                    {(Object.entries(typeConfig) as [QuestionType, typeof typeConfig[QuestionType]][]).map(([t, cfg]) => (
                      <button key={t} onClick={() => { updateBlock(currentBlock.id, { type: t, hasOtherOption: t === 'dropdown' ? false : currentBlock.hasOtherOption }); setShowQuestionTypeMenu(false); }}
                        className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-xs ${currentBlock.type === t ? `${cfg.color} font-semibold` : 'text-slate-700'}`}>
                        <span className={currentBlock.type === t ? cfg.color : 'text-slate-400'}>{cfg.icon}</span>
                        {cfg.label}
                        {currentBlock.type === t && <Check className="h-3 w-3 ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Difficulty picker */}
              {currentBlock && (
                <div className="relative">
                  <button
                    onClick={() => setShowDifficultyMenu(v => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${diff.bg} ${diff.text} ${diff.border}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                    <span className="capitalize">{currentBlock.difficulty || 'medium'}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                  {showDifficultyMenu && (
                    <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                      {(['easy', 'medium', 'hard'] as const).map(level => (
                        <button key={level} onClick={() => { updateBlock(currentBlock.id, { difficulty: level }); setShowDifficultyMenu(false); }}
                          className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${currentBlock.difficulty === level ? diffConfig[level].text + ' font-semibold' : 'text-slate-600'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${diffConfig[level].dot}`} />
                          <span className="capitalize">{level}</span>
                          {currentBlock.difficulty === level && <Check className="h-3 w-3 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Delete */}
              <button
                onClick={() => currentBlock && removeQuestionBlock(currentBlock.id)}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                title="Delete question"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Question editor — compact, no scroll needed */}
          <div ref={mainScrollRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {currentBlock ? (
              <div className={`h-full flex flex-col bg-white border-x-0 transition-all ${blockErr ? '' : ''}`}>

                {/* ── QUESTION TEXT ── */}
                <div className={`px-5 pt-4 pb-3 border-b flex-shrink-0 ${blockErr?.questionText ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5">
                      {currentIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <RichTextEditor
                        value={currentBlock.questionText}
                        onChange={v => handleQuestionChange(currentBlock.id, v)}
                        placeholder="Type your question here…"
                        editorRef={richTextRefs.current[currentBlock.id] as React.RefObject<HTMLDivElement>}
                      />
                      {!currentBlock.questionImageUrl && (
                        <label className="inline-flex items-center gap-1 mt-2 text-[10px] text-slate-400 hover:text-blue-500 cursor-pointer transition-colors">
                          <Image className="h-3 w-3" /><span>Add image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleQuestionImageUpload(currentBlock.id, f); e.target.value = ''; }} />
                        </label>
                      )}
                    </div>
                    {/* Score input (questionSpecific) */}
                    {scoringType === 'questionSpecific' && (
                      <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Score</span>
                        <div className={`flex items-center gap-1 border-2 rounded-lg px-2 py-1 transition-colors ${blockMarksErr ? 'bg-red-50 border-red-300' : (currentBlock.score ?? 0) > 0 ? 'bg-blue-50 border-blue-300' : 'bg-amber-50 border-amber-300 border-dashed'}`}>
                          <Hash className={`h-3 w-3 ${blockMarksErr ? 'text-red-400' : (currentBlock.score ?? 0) > 0 ? 'text-blue-500' : 'text-amber-400'}`} />
                          <input type="text" inputMode="decimal" value={currentBlock.score ?? 0}
                            onChange={e => handleScoreChange(currentBlock.id, e.target.value)}
                            className={`w-10 text-sm font-bold bg-transparent outline-none text-center ${blockMarksErr ? 'text-red-700' : (currentBlock.score ?? 0) > 0 ? 'text-blue-700' : 'text-amber-600'}`} />
                          <span className={`text-[10px] font-semibold ${blockMarksErr ? 'text-red-400' : (currentBlock.score ?? 0) > 0 ? 'text-blue-500' : 'text-amber-400'}`}>pts</span>
                        </div>
                        {(currentBlock.score ?? 0) === 0 && !blockMarksErr && (
                          <span className="text-[9px] text-amber-500 font-semibold">Enter score</span>
                        )}
                        {blockMarksErr && (
                          <span className="text-[9px] text-red-500 font-semibold">{blockMarksErr}</span>
                        )}
                      </div>
                    )}
                    {scoringType === 'equalDistribution' && marksPerQuestion > 0 && (
                      <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Score</span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">{marksPerQuestion} pts</span>
                      </div>
                    )}
                  </div>
                  {currentBlock.questionImageUrl && (
                    <div className="mt-2 pl-10 relative">
                      {activeImageToolbar?.type === 'question' && activeImageToolbar.blockId === currentBlock.id && (
                        <ImageToolbar alignment={currentBlock.questionImageAlignment || 'center'} sizePercent={currentBlock.questionImageSizePercent || 60} onAlignmentChange={a => updateBlock(currentBlock.id, { questionImageAlignment: a })} onSizeChange={v => updateBlock(currentBlock.id, { questionImageSizePercent: v })} onRemove={() => removeQuestionImage(currentBlock.id)} onClose={() => setActiveImageToolbar(null)} />
                      )}
                      <div style={{ display: 'flex', justifyContent: currentBlock.questionImageAlignment === 'left' ? 'flex-start' : currentBlock.questionImageAlignment === 'right' ? 'flex-end' : 'center', marginTop: activeImageToolbar?.type === 'question' && activeImageToolbar.blockId === currentBlock.id ? '60px' : '0' }}>
                        <div style={{ width: `${currentBlock.questionImageSizePercent || 60}%` }} className="cursor-pointer" onClick={() => setActiveImageToolbar(activeImageToolbar?.type === 'question' && activeImageToolbar.blockId === currentBlock.id ? null : { type: 'question', blockId: currentBlock.id })}>
                          <img src={currentBlock.questionImageUrl} alt="" className="w-full h-auto rounded-lg border border-slate-200 hover:border-blue-300" />
                        </div>
                      </div>
                    </div>
                  )}
                  {blockErr?.questionText && (
                    <div className="mt-2 pl-10 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />{blockErr.questionText}
                    </div>
                  )}
                </div>

                {/* ── OPTIONS ── */}
                {['multiple-choice', 'checkboxes', 'dropdown'].includes(currentBlock.type) ? (
                  <div className="px-5 py-3 flex-shrink-0 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${typeConfig[currentBlock.type].bg} ${typeConfig[currentBlock.type].color}`}>
                          {currentBlock.type === 'multiple-choice' ? 'Single correct' : currentBlock.type === 'checkboxes' ? 'Multi correct' : 'Dropdown'}
                        </span>
                        {!currentBlock.options.some(o => o.isCorrect) && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                            <AlertCircle className="h-3 w-3" />
                            {currentBlock.type === 'checkboxes' ? 'Mark correct options ●' : 'Choose correct option ●'}
                          </span>
                        )}
                        {currentBlock.options.some(o => o.isCorrect) && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                            <Check className="h-3 w-3" />Correct marked
                          </span>
                        )}
                        <OptionsPerRowPicker value={currentBlock.optionsPerRow || 1} onChange={v => updateBlock(currentBlock.id, { optionsPerRow: v })} />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => addOption(currentBlock.id)} className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                          <Plus className="h-3 w-3" />Option
                        </button>
                        {!currentBlock.hasOtherOption && currentBlock.type !== 'dropdown' && (
                          <button onClick={() => addOtherOption(currentBlock.id)} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">"Other"</button>
                        )}
                      </div>
                    </div>

                    {renderOptions(currentBlock)}

                    {/* Correct answer reminder — always visible below options */}
                    <div className={`mt-2 flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1.5 rounded-lg border transition-all ${
                      currentBlock.options.some(o => o.isCorrect)
                        ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                        : 'text-amber-600 bg-amber-50 border-amber-200 border-dashed'
                    }`}>
                      {currentBlock.options.some(o => o.isCorrect)
                        ? <><Check className="h-3.5 w-3.5" />Correct answer marked</>
                        : <><AlertCircle className="h-3.5 w-3.5" />{currentBlock.type === 'checkboxes' ? 'Click the circle to mark correct answers' : 'Click the circle next to an option to mark the correct answer'}</>
                      }
                    </div>

                    {blockErr?.options && <div className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{blockErr.options}</div>}
                    {blockErr?.correctAnswer && <div className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{blockErr.correctAnswer}</div>}
                  </div>
                ) : currentBlock.type === 'short-answer' ? (
                  <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                      <span className="text-[11px] text-slate-400">Student short answer field</span>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
                    <div className="px-3 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                      <span className="text-[11px] text-slate-400">Student paragraph field</span>
                      <div className="mt-1.5 space-y-1">{[1,2].map(i => <div key={i} className="h-1 bg-slate-200 rounded w-full" />)}</div>
                    </div>
                  </div>
                )}

                {/* ── EXPLANATION + REQUIRED ── */}
                <div className="px-5 py-2.5 border-b border-slate-100 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                      <input type="checkbox" checked={currentBlock.hasExplanation} onChange={() => updateBlock(currentBlock.id, { hasExplanation: !currentBlock.hasExplanation })} className="w-3 h-3 rounded border-slate-300 accent-blue-600" />
                      <span className="text-[11px] text-slate-500 group-hover:text-blue-600 transition-colors font-medium flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />Explanation
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className="text-[11px] text-slate-500 font-medium">Required</span>
                        <button onClick={() => updateBlock(currentBlock.id, { isRequired: !currentBlock.isRequired })}
                          className={`relative rounded-full transition-colors ${currentBlock.isRequired ? 'bg-blue-600' : 'bg-slate-200'}`}
                          style={{ width: 28, height: 16 }}>
                          <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${currentBlock.isRequired ? 'translate-x-3' : 'translate-x-0.5'}`} />
                        </button>
                      </label>
                    </div>
                  </div>
                  {currentBlock.hasExplanation && (
                    <div className="mt-2 pl-5 border-l-2 border-blue-200">
                      <RichTextEditor value={currentBlock.explanation || ''} onChange={v => updateBlock(currentBlock.id, { explanation: v })} placeholder="Explain the correct answer…" compact />
                    </div>
                  )}
                </div>

                {/* ── NAVIGATION FOOTER ── */}
                <div className="flex-1 flex items-end px-5 pb-4 pt-3">
                  <div className="w-full flex items-center justify-between gap-3">
                    <button
                      onClick={() => { if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); mainScrollRef.current?.scrollTo({ top: 0 }); } }}
                      disabled={currentIndex === 0}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />Previous
                    </button>
                    <span className="text-[11px] text-slate-400">
                      Q <span className="text-blue-600 font-bold">{currentIndex + 1}</span> / {questionBlocks.length}
                    </span>
                    <button
                      onClick={handleNextQuestion}
                      disabled={currentIndex === questionBlocks.length - 1 && !currentBlockIsValid}
                      title={currentIndex === questionBlocks.length - 1 && !currentBlockIsValid ? 'Fill question, options & mark correct answer first' : ''}
                      className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-sm
                        ${currentIndex === questionBlocks.length - 1 && !currentBlockIsValid
                          ? 'bg-blue-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      {currentIndex < questionBlocks.length - 1
                        ? <><span>Next</span><ChevronRight className="h-3.5 w-3.5" /></>
                        : <><Plus className="h-3.5 w-3.5" /><span>Add Question</span></>
                      }
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-400 text-sm">No question selected</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR — Exercise Details */}
        <div className="w-60 flex-shrink-0 border-l border-slate-200 bg-white overflow-hidden">
          <ExerciseDetailsPanel
            exerciseData={exerciseData}
            scoringType={scoringType}
            marksPerQuestion={marksPerQuestion}
            totalMcqQuestions={totalMcqQuestions}
            maxMcqMarks={maxMcqMarks}
            existingMcqMarks={existingMcqMarks}
            existingMcqCount={existingMcqCount}
            currentFormMarks={questionBlocks.reduce((s, b) => s + (Number(b.score) || 0), 0)}
            currentFormCount={questionBlocks.length}
            getRemainingMarks={getRemainingMarks}
            currentDifficulty={currentBlock?.difficulty || 'medium'}
          />
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          {questionBlocks.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {questionBlocks.length} question{questionBlocks.length !== 1 ? 's' : ''}
              {scoringType === 'questionSpecific' && maxMcqMarks > 0 && (
                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded font-semibold ${getRemainingMarks() < 0 ? 'bg-red-50 text-red-600' : 'bg-violet-50 text-violet-600'}`}>
                  {totalFormMarks.toFixed(1)} pts this form
                </span>
              )}
            </span>
          )}
          {isSaving && saveProgress !== undefined && (
            <div className="flex items-center gap-2">
              <Loader className="h-3.5 w-3.5 animate-spin text-blue-600" />
              <span className="text-xs text-blue-600">{saveMessage || 'Saving…'}</span>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${saveProgress}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCloseClick} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !questionBlocks.length || Object.values(blockMarksErrors).some(e => !!e)}
            className={`px-5 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 ${isSaving ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {isSaving ? <><Loader className="h-3.5 w-3.5 animate-spin" />Saving…</> : isEditing ? <><Check className="h-3.5 w-3.5" />Update</> : <><Save className="h-3.5 w-3.5" />Save {questionBlocks.length} Question{questionBlocks.length !== 1 ? 's' : ''}</>}
          </button>
        </div>
      </div>

      {/* ── DIALOGS ── */}
      <ConfirmationDialog
        isOpen={showCloseConfirmation}
        onConfirm={() => { setShowCloseConfirmation(false); clearDraft(); onClose(); }}
        onCancel={() => setShowCloseConfirmation(false)}
        message="You have unsaved questions. Your draft is auto-saved locally. Close anyway?"
      />

      {/* Close menus on outside click */}
      {(showQuestionTypeMenu || showDifficultyMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowQuestionTypeMenu(false); setShowDifficultyMenu(false); }} />
      )}
    </div>
  );
};

export default MCQQuestionForm;