import React, { useState, useRef, useEffect, useCallback } from 'react';
import ExerciseSettings from '../../ExerciseSettings';

// ─── FONT INJECTION ───────────────────────────────────────────────────────────
const injectFonts = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    injected = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap';
    document.head.appendChild(link);
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --lms-orange: #F27757; --lms-orange-dark: #e0623f;
        --lms-orange-glow: rgba(242,119,87,0.22);
        --lms-orange-light: rgba(242,119,87,0.08);
        --lms-orange-50: #FEF3EF; --lms-orange-100: #FDDDD4;
        --lms-text-main: #1a1a2e; --lms-text-sec: #6b6b7e;
        --lms-text-muted: #8b8b9e; --lms-text-hint: #bcbccc;
        --lms-border: #e4e4ed; --lms-border-hover: #d0d0de;
        --lms-bg-white: #ffffff; --lms-bg-surface: #f7f7fb;
        --lms-bg-surface2: #f0f0f7;
        --lms-success: #16a34a; --lms-success-bg: #f0fdf4; --lms-success-bdr: #bbf7d0;
        --lms-danger: #e53e3e; --lms-danger-bg: #fff5f5; --lms-danger-bdr: #fed7d7;
        --lms-info: #2563eb; --lms-info-bg: #eff6ff; --lms-info-bdr: #bfdbfe;
        --lms-warning: #d97706; --lms-warning-bg: #fffbeb; --lms-warning-bdr: #fde68a;
        --lms-violet: #7c3aed; --lms-violet-bg: #f5f3ff; --lms-violet-bdr: #ddd6fe;
        --lms-teal: #0d9488;
        --lms-radius-sm: 8px; --lms-radius-md: 10px; --lms-radius-lg: 14px;
        --lms-font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        --lms-shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
        --lms-shadow-md: 0 4px 14px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04);
      }
      .lms-font { font-family: var(--lms-font) !important; }
      .lms-underline-select {
        -webkit-appearance: none; -moz-appearance: none; appearance: none;
        background: transparent; border: none;
        border-bottom: 1.5px solid var(--lms-border); border-radius: 0;
        padding: 4px 24px 4px 0; font-size: 13px; font-weight: 600;
        color: var(--lms-text-main); cursor: pointer; outline: none;
        transition: border-color 0.15s; font-family: var(--lms-font);
      }
      .lms-underline-select:focus { border-bottom-color: var(--lms-orange); }
      .lms-select-wrap { position: relative; display: inline-flex; align-items: center; }
      .lms-select-wrap .chevron-icon {
        position: absolute; right: 2px; top: 50%; transform: translateY(-50%);
        pointer-events: none; color: var(--lms-text-hint); width: 13px; height: 13px;
      }
      .lms-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 14px; border-radius: var(--lms-radius-md);
        font-family: var(--lms-font); font-size: 12.5px; font-weight: 600;
        border: 1.5px solid; cursor: pointer; transition: all 0.15s;
        white-space: nowrap;
      }
      .lms-btn-orange { background: var(--lms-orange); color: white; border-color: transparent; box-shadow: 0 2px 8px var(--lms-orange-glow); }
      .lms-btn-orange:hover:not(:disabled) { background: var(--lms-orange-dark); box-shadow: 0 3px 12px rgba(242,119,87,0.35); transform: translateY(-1px); }
      .lms-btn-orange:disabled { opacity: 0.55; cursor: not-allowed; }
      .lms-btn-ghost-orange { background: var(--lms-bg-white); color: #c85a30; border-color: #f2b9a3; }
      .lms-btn-ghost-orange:hover { background: var(--lms-orange-50); }
      .lms-btn-ghost-violet { background: var(--lms-bg-white); color: var(--lms-violet); border-color: var(--lms-violet-bdr); }
      .lms-btn-ghost-violet:hover { background: var(--lms-violet-bg); }
      .lms-btn-slate { background: var(--lms-bg-white); color: var(--lms-text-sec); border-color: var(--lms-border); }
      .lms-btn-slate:hover { background: var(--lms-bg-surface2); }
      .lms-icon-btn {
        width: 32px; height: 32px; border: 1.5px solid; border-radius: var(--lms-radius-sm);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.15s; background: none; flex-shrink: 0;
      }
      .lms-icon-btn-violet { border-color: var(--lms-violet-bdr); background: var(--lms-violet-bg); color: var(--lms-violet); }
      .lms-icon-btn-violet:hover { background: #ede9fe; }
      .lms-icon-btn-slate { border-color: var(--lms-border); background: var(--lms-bg-surface); color: var(--lms-text-muted); }
      .lms-icon-btn-slate:hover { background: var(--lms-bg-surface2); color: var(--lms-text-main); }
      .lms-icon-btn-red { border-color: var(--lms-danger-bdr); background: var(--lms-danger-bg); color: var(--lms-danger); }
      .lms-icon-btn-red:hover { background: #fed7d7; }
      .lms-nav-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 7px 14px; border-radius: var(--lms-radius-md);
        font-family: var(--lms-font); font-size: 12.5px; font-weight: 600;
        border: 1.5px solid var(--lms-border); background: var(--lms-bg-white);
        color: var(--lms-text-sec); cursor: pointer; transition: all 0.15s;
      }
      .lms-nav-btn:hover:not(:disabled) { background: var(--lms-bg-surface); border-color: var(--lms-border-hover); }
      .lms-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .lms-progress-bar { height: 6px; background: var(--lms-bg-surface2); border-radius: 3px; overflow: hidden; margin-top: 8px; }
      .lms-progress-fill { height: 100%; border-radius: 3px; background: var(--lms-orange); transition: width 0.4s; }
      .lms-detail-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; padding: 3px 0; }
      .lms-sidebar-section-title { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--lms-text-main); margin-bottom: 10px; font-family: var(--lms-font); }
      .lms-header-logo-mark { width: 34px; height: 34px; background: var(--lms-orange); border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 3px 10px var(--lms-orange-glow); }
      .lms-breadcrumb-sep { color: var(--lms-orange); margin: 0 3px; font-weight: 700; font-size: 13px; }
      .lms-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 600; border: 1.5px solid; font-family: var(--lms-font); }
      .lms-badge-amber { background: var(--lms-warning-bg); color: var(--lms-warning); border-color: var(--lms-warning-bdr); }
      .lms-badge-green { background: var(--lms-success-bg); color: var(--lms-success); border-color: var(--lms-success-bdr); }
      .lms-badge-orange { background: var(--lms-orange-50); color: #c85a30; border-color: var(--lms-orange-100); }
      .lms-tooltip-wrap { position: relative; }
      .lms-tooltip {
        position: absolute; bottom: calc(100% + 8px); left: 50%;
        transform: translateX(-50%); background: #1a1a2e; color: white;
        font-size: 11px; font-weight: 500; font-family: var(--lms-font);
        padding: 5px 10px; border-radius: 7px; white-space: nowrap;
        pointer-events: none; opacity: 0; transition: opacity 0.15s; z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }
      .lms-tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 4px solid transparent; border-top-color: #1a1a2e; }
      .lms-tooltip-wrap:hover .lms-tooltip { opacity: 1; }
      .lms-tooltip-right { left: auto; right: 0; transform: none; }
      .lms-tooltip-right::after { left: auto; right: 10px; transform: none; }
      .lms-diff-underline-btn {
        display: inline-flex; align-items: center; gap: 6px;
        background: transparent; border: none;
        border-bottom: 1.5px solid var(--lms-border); border-radius: 0;
        padding: 4px 20px 4px 0; font-size: 13px; font-weight: 600;
        font-family: var(--lms-font); color: var(--lms-text-hint);
        cursor: pointer; outline: none; position: relative; transition: border-color 0.15s;
      }
      .lms-diff-underline-btn:hover { border-bottom-color: var(--lms-border-hover); }
      .lms-diff-underline-btn.has-value { color: var(--lms-text-main); }
      .lms-diff-underline-btn .diff-chevron { position: absolute; right: 0; top: 50%; transform: translateY(-50%); color: var(--lms-text-hint); width: 13px; height: 13px; }
      .lms-diff-dropdown {
        position: absolute; top: calc(100% + 6px); right: 0; z-index: 200;
        background: var(--lms-bg-white); border: 1.5px solid var(--lms-border);
        border-radius: var(--lms-radius-md); box-shadow: var(--lms-shadow-md);
        min-width: 160px; overflow: hidden; padding: 4px 0;
      }
      .lms-diff-dropdown-item {
        display: flex; align-items: center; gap: 8px;
        padding: 8px 14px; font-size: 13px; font-weight: 500;
        font-family: var(--lms-font); cursor: pointer; color: var(--lms-text-main);
        transition: background 0.1s;
      }
      .lms-diff-dropdown-item:hover { background: var(--lms-bg-surface); }
      .lms-score-wrap { display: inline-flex; align-items: baseline; gap: 4px; border-bottom: 1.5px solid var(--lms-border); padding: 4px 0; transition: border-color 0.15s; }
      .lms-score-wrap:focus-within { border-bottom-color: var(--lms-orange); }
      .lms-score-wrap.score-err { border-bottom-color: var(--lms-danger); }
      .lms-score-input { width: 44px; background: transparent; border: none; outline: none; font-size: 13px; font-weight: 600; color: var(--lms-text-main); font-family: var(--lms-font); text-align: right; -moz-appearance: textfield; line-height: 1; padding: 0; margin: 0; }
      .lms-score-label { font-size: 13px; color: var(--lms-text-sec); font-family: var(--lms-font); white-space: nowrap; line-height: 1; }
      .lms-fmt-btn { padding: 5px; border: none; background: none; cursor: pointer; color: var(--lms-text-muted); border-radius: 7px; transition: all 0.12s; display: flex; align-items: center; justify-content: center; }
      .lms-fmt-btn:hover { background: var(--lms-bg-surface2); color: var(--lms-text-main); }
      .lms-fmt-btn.active { background: var(--lms-orange-100); color: #c85a30; }
      .lms-toggle-track { position: relative; display: inline-block; width: 30px; height: 17px; flex-shrink: 0; }
      .lms-toggle-track input { opacity: 0; width: 0; height: 0; }
      .lms-toggle-slider { position: absolute; inset: 0; background: var(--lms-border-hover); border-radius: 17px; transition: background 0.2s; cursor: pointer; }
      .lms-toggle-slider::before { content: ''; position: absolute; width: 13px; height: 13px; border-radius: 50%; background: white; left: 2px; top: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
      .lms-toggle-track input:checked + .lms-toggle-slider { background: var(--lms-orange); }
      .lms-toggle-track input:checked + .lms-toggle-slider::before { transform: translateX(13px); }
      .lms-modal-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(26,26,46,0.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 16px; }
      .lms-modal { background: var(--lms-bg-white); border-radius: var(--lms-radius-lg); box-shadow: 0 20px 60px rgba(0,0,0,0.18); max-width: 420px; width: 100%; border: 1.5px solid var(--lms-border); overflow: hidden; }
      .lms-modal-header { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1.5px solid var(--lms-border); }
      .lms-modal-icon { width: 32px; height: 32px; border-radius: var(--lms-radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .lms-modal-body { padding: 16px 18px; }
      input[type="checkbox"] { accent-color: var(--lms-orange); }
      input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: var(--lms-border); border-radius: 4px; }
      @keyframes lms-slide-in-right { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes lms-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  };
})();

import {
  X, AlertCircle, Loader, ChevronLeft, ChevronRight,
  GraduationCap, Settings2, FileText, Hash, Eye, Check,
  Trash2, Copy, RotateCcw, CloudUpload, CheckCircle2,
  Edit2, Info, Bold, Italic, Underline, Table, Image,
  Code, List, Type, Link, Heading1, Upload, File,
  FileImage, Archive, Presentation, Sheet, BookOpen,
  FolderOpen, ToggleLeft, ToggleRight
} from 'lucide-react';

import { exerciseApi } from '@/apiServices/exercise';
import { questionApi } from '@/apiServices/question';

// ─── TYPES ────────────────────────────────────────────────────────────────────
type OthersQuestionType = 'notion' | 'file-upload' | '';

interface NotionSettings {
  allowBold: boolean;
  allowItalic: boolean;
  allowUnderline: boolean;
  allowTable: boolean;
  allowImage: boolean;
  allowCode: boolean;
  allowBulletList: boolean;
  allowNumberedList: boolean;
  allowHeadings: boolean;
  allowLinks: boolean;
}

const SUPPORTED_FILE_TYPES = [
  { key: 'pdf',   label: 'PDF',        ext: '.pdf',         icon: '📄' },
  { key: 'docx',  label: 'Word (DOCX)', ext: '.docx,.doc',  icon: '📝' },
  { key: 'xlsx',  label: 'Excel (XLSX)', ext: '.xlsx,.xls', icon: '📊' },
  { key: 'pptx',  label: 'PowerPoint', ext: '.pptx,.ppt',   icon: '📑' },
  { key: 'image', label: 'Images',     ext: '.jpg,.jpeg,.png,.gif,.webp', icon: '🖼️' },
  { key: 'zip',   label: 'ZIP / RAR',  ext: '.zip,.rar,.7z', icon: '🗜️' },
  { key: 'txt',   label: 'Text',       ext: '.txt',          icon: '📃' },
  { key: 'mp4',   label: 'Video',      ext: '.mp4,.mov,.avi', icon: '🎥' },
];

interface FileUploadSettings {
  allowMultiple: boolean;
  maxFiles: number;
  maxFileSizeMB: number;
  allowedTypes: string[];  // keys from SUPPORTED_FILE_TYPES
}

interface OthersQuestionBlock {
  id: string;
  dbId?: string;
  origin: 'db' | 'new';
  isDirty?: boolean;
  questionType: OthersQuestionType;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | '';
  score?: number;
  isRequired: boolean;
  notionSettings: NotionSettings;
  fileUploadSettings: FileUploadSettings;
}

interface OthersAddQuestionFormProps {
  breadcrumbs: any;
  exerciseData: any;
  tabType: string;
  initialData?: any;
  isEditing?: boolean;
  initialQuestionId?: string;
  onClose: () => void;
  onSave: (questionData: any) => void;
  isSaving?: boolean;
  saveProgress?: number;
  saveMessage?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const generateId = (prefix = 'q') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const defaultNotionSettings = (): NotionSettings => ({
  allowBold: true, allowItalic: true, allowUnderline: true,
  allowTable: false, allowImage: false, allowCode: false,
  allowBulletList: true, allowNumberedList: true,
  allowHeadings: false, allowLinks: false,
});

const defaultFileUploadSettings = (): FileUploadSettings => ({
  allowMultiple: false, maxFiles: 1, maxFileSizeMB: 10,
  allowedTypes: ['pdf', 'docx'],
});

const makeDefaultBlock = (): OthersQuestionBlock => ({
  id: generateId('oq'),
  origin: 'new',
  isDirty: false,
  questionType: 'file-upload',
  title: '',
  description: '',
  difficulty: '',
  score: undefined,
  isRequired: true,
  notionSettings: defaultNotionSettings(),
  fileUploadSettings: defaultFileUploadSettings(),
});

const diffConfig: Record<string, { label: string; dot: string; color: string; border: string }> = {
  '':     { label: 'Difficulty', dot: '#bcbccc', color: 'var(--lms-text-hint)', border: 'var(--lms-border)' },
  easy:   { label: 'Easy',       dot: '#16a34a', color: '#16a34a',              border: '#bbf7d0' },
  medium: { label: 'Medium',     dot: '#d97706', color: '#d97706',              border: '#fde68a' },
  hard:   { label: 'Hard',       dot: '#e53e3e', color: '#e53e3e',              border: '#fed7d7' },
};

// ─── BREADCRUMB ───────────────────────────────────────────────────────────────
const QuestionFormBreadcrumb: React.FC<{
  breadcrumbs: any[]; tabType: string; exerciseName?: string; actionLabel: string;
}> = ({ breadcrumbs, tabType, exerciseName, actionLabel }) => (
  <nav className="flex items-center" style={{ fontFamily: 'var(--lms-font)' }}>
    <ol className="flex items-center flex-wrap gap-y-0.5">
      {breadcrumbs.map((crumb: any, idx: number) => (
        <React.Fragment key={idx}>
          <li><span className="text-[12.5px] font-semibold" style={{ color: 'var(--lms-text-sec)' }}>{crumb.name}</span></li>
          <li><span className="lms-breadcrumb-sep">»</span></li>
        </React.Fragment>
      ))}
      {exerciseName && (
        <><li><span className="text-[12.5px] font-semibold truncate max-w-[120px]" style={{ color: 'var(--lms-text-main)' }}>{exerciseName}</span></li>
          <li><span className="lms-breadcrumb-sep">»</span></li></>
      )}
      <li>
        <span className="text-[12.5px] font-bold" style={{ color: 'var(--lms-text-main)' }}>
          {actionLabel}
        </span>
      </li>
    </ol>
  </nav>
);

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none" style={{ fontFamily: 'var(--lms-font)' }}>
    <label className="lms-toggle-track">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="lms-toggle-slider" />
    </label>
    {label && <span className="text-[12px] font-semibold" style={{ color: 'var(--lms-text-sec)' }}>{label}</span>}
  </label>
);

// ─── RIGHT PANEL ──────────────────────────────────────────────────────────────
const OthersDetailsPanel: React.FC<{
  exerciseData: any;
  blocks: OthersQuestionBlock[];
  savedQuestionIds: Set<string>;
  currentBlock: OthersQuestionBlock | null;
  scoringType: string;
  marksPerQuestion: number;
  totalQuestions: number;
  maxMarks: number;
  isSaving: boolean;
  isEditing: boolean;
  onClose: () => void;
}> = ({ exerciseData, blocks, savedQuestionIds, currentBlock, scoringType, marksPerQuestion, totalQuestions, maxMarks }) => {
  const info = exerciseData?.fullExerciseData?.exerciseInformation;
  const exerciseType = exerciseData?.fullExerciseData?.exerciseType || exerciseData?.exerciseType || '';

  const fmt = (n: number) => Number.isInteger(n) ? `${n}` : n.toFixed(1);

  // ── Saved blocks (already persisted to DB or saved in this session) ──────
  const savedBlocks = blocks.filter(b => savedQuestionIds.has(b.id) || b.origin === 'db');
  const currentIsSaved = currentBlock ? (savedQuestionIds.has(currentBlock.id) || currentBlock.origin === 'db') : false;

  // Only count questions/marks from persisted blocks (exclude unsaved current block)
  const savedCount = currentIsSaved
    ? savedBlocks.length
    : savedBlocks.filter(b => b.id !== currentBlock?.id).length;
  const savedMarks = currentIsSaved
    ? savedBlocks.reduce((s, b) => s + (Number(b.score) || 0), 0)
    : savedBlocks.filter(b => b.id !== currentBlock?.id).reduce((s, b) => s + (Number(b.score) || 0), 0);
  const currentQMarks = currentIsSaved ? 0 : (Number(currentBlock?.score) || 0);
  const totalUsedMarks = savedMarks + currentQMarks;
  const dirtyBlocks = blocks.filter(b => b.isDirty);

  // ── Progress ─────────────────────────────────────────────────────────────
  const overQLimit = scoringType === 'equalDistribution' && totalQuestions > 0 && savedCount > totalQuestions;
  const overMLimit = scoringType === 'questionSpecific' && maxMarks > 0 && totalUsedMarks > maxMarks;
  const progressPct = scoringType === 'equalDistribution' && totalQuestions > 0
    ? Math.min(100, (Math.min(savedCount, totalQuestions) / totalQuestions) * 100)
    : maxMarks > 0 ? Math.min(100, (Math.max(0, savedMarks) / maxMarks) * 100) : 0;
  const progressColor = overQLimit || overMLimit ? 'var(--lms-danger)'
    : progressPct >= 100 ? 'var(--lms-success)' : 'var(--lms-orange)';

  // ── Marks row helper ─────────────────────────────────────────────────────
  const MRow = ({ label, value, denom, color }: { label: string; value: string; denom?: string | null; color?: string }) => (
    <div className="lms-detail-row" style={{ padding: '3.5px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: color || 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>
        {value}{denom && <span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{denom}</span>}
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--lms-orange-50)', overflow: 'hidden' }}>
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin' }}>

        {/* ── EXERCISE DETAILS ── */}
        <div className="px-4 py-3" style={{ borderBottom: '1.5px solid var(--lms-info-bdr)', background: 'var(--lms-info-bg)' }}>
          <div className="lms-sidebar-section-title">
            <FileText className="h-3.5 w-3.5" style={{ color: 'var(--lms-info)' }} />
            Exercise Details
          </div>
          <div className="space-y-0.5">
            {[
              info?.exerciseId   && { label: 'Exercise ID', value: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{info.exerciseId}</span> },
              (info?.exerciseName || exerciseData?.exerciseName) && { label: 'Name', value: <span style={{ wordBreak: 'break-word', fontSize: 12.5 }}>{info?.exerciseName || exerciseData?.exerciseName}</span> },
              exerciseType       && { label: 'Type', value: <span style={{ fontSize: 12.5 }}>{exerciseType}</span> },
              {
                label: 'Scoring',
                value: <span style={{ fontSize: 12.5 }}>{scoringType === 'equalDistribution' ? 'Equal Distribution' : scoringType === 'questionSpecific' ? 'Question Specific' : scoringType}</span>,
              },
              dirtyBlocks.length > 0 && { label: 'Edited Qs', value: <span style={{ fontSize: 12.5, color: 'var(--lms-warning)' }}>{dirtyBlocks.length} will update</span> },
            ].filter(Boolean).map(({ label, value }: any) => (
              <div key={label} className="lms-detail-row" style={{ padding: '4px 0' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)', letterSpacing: '0.01em' }}>{label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MARKS ALLOCATION ── */}
        <div className="px-4 py-3" style={{ borderBottom: '1.5px solid var(--lms-orange-100)', background: 'var(--lms-orange-50)' }}>
          <div className="lms-sidebar-section-title">
            <Hash className="h-3.5 w-3.5" style={{ color: 'var(--lms-orange)' }} />
            Marks Allocation
          </div>

          {scoringType === 'equalDistribution' && totalQuestions > 0 ? (
            <>
              <div className="space-y-0.5">
                <MRow label="Total Questions"    value={`${totalQuestions}`} color="var(--lms-text-main)" />
                <MRow label="Questions Created"  value={`${savedCount}`} denom={`${totalQuestions}`} color={overQLimit ? 'var(--lms-danger)' : '#4f46e5'} />
                <MRow label="Remaining Questions" value={`${Math.max(0, totalQuestions - savedCount)}`} denom={`${totalQuestions}`}
                  color={Math.max(0, totalQuestions - savedCount) === 0 ? 'var(--lms-danger)' : 'var(--lms-success)'} />
              </div>

              {marksPerQuestion > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--lms-border)', margin: '6px 0' }} />
                  <div className="space-y-0.5">
                    <MRow label="Marks Per Question" value={fmt(marksPerQuestion)} color="var(--lms-text-main)" />
                    <MRow label="Total Marks"        value={fmt(totalQuestions * marksPerQuestion)} color="var(--lms-text-main)" />
                    <MRow label="Used Marks"         value={fmt(savedCount * marksPerQuestion)} denom={fmt(totalQuestions * marksPerQuestion)} color="#7c3aed" />
                    <MRow label="Remaining Marks"
                      value={fmt(Math.max(0, (totalQuestions - savedCount) * marksPerQuestion))}
                      denom={fmt(totalQuestions * marksPerQuestion)}
                      color={Math.max(0, (totalQuestions - savedCount) * marksPerQuestion) === 0 ? 'var(--lms-danger)' : 'var(--lms-success)'} />
                  </div>
                </>
              )}

              <div className="lms-progress-bar" style={{ marginTop: 10 }}>
                <div className="lms-progress-fill" style={{ width: `${progressPct}%`, background: progressColor }} />
              </div>

              {overQLimit && (
                <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>
                  ⚠ Exceeds limit by {savedCount - totalQuestions} question{savedCount - totalQuestions > 1 ? 's' : ''}
                </p>
              )}
              {!overQLimit && savedCount >= totalQuestions && totalQuestions > 0 && (
                <p className="text-[11px] font-semibold mt-1 flex items-center gap-1" style={{ color: 'var(--lms-success)', fontFamily: 'var(--lms-font)' }}>
                  <CheckCircle2 className="h-3 w-3" /> All questions added!
                </p>
              )}
              {!overQLimit && savedCount < totalQuestions && (
                <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--lms-orange)', fontFamily: 'var(--lms-font)' }}>
                  {totalQuestions - savedCount} more question{totalQuestions - savedCount !== 1 ? 's' : ''} needed
                </p>
              )}
            </>

          ) : scoringType === 'questionSpecific' && maxMarks > 0 ? (
            <>
              <div className="space-y-0.5">
                <MRow label="Total Marks"        value={`${maxMarks}`} color="var(--lms-text-main)" />
                <MRow label="Total Used Marks"   value={`${savedMarks.toFixed(1)}`} denom={`${maxMarks}`} color="#7c3aed" />
                <MRow label="Total Questions"    value={`${blocks.length}`} color="#4f46e5" />
                <MRow label="This Question Marks" value={overMLimit ? '0.0' : currentQMarks.toFixed(1)}
                  color={!overMLimit && currentQMarks > 0 ? '#4f46e5' : 'var(--lms-text-sec)'} />
                <MRow label="Remaining Marks"
                  value={`${Math.max(0, overMLimit ? maxMarks - savedMarks : maxMarks - totalUsedMarks).toFixed(1)}`}
                  color={Math.max(0, overMLimit ? maxMarks - savedMarks : maxMarks - totalUsedMarks) <= 0 ? 'var(--lms-danger)' : 'var(--lms-success)'} />
              </div>
              <div className="lms-progress-bar" style={{ marginTop: 10 }}>
                <div className="lms-progress-fill" style={{ width: `${progressPct}%`, background: progressColor }} />
              </div>
              {overMLimit && (
                <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>
                  ⚠ Marks exceed total by {(totalUsedMarks - maxMarks).toFixed(1)}
                </p>
              )}
            </>

          ) : (
            // ── No config yet ── show exercise total marks as fallback ──────
            Number(info?.totalMarks) > 0 ? (
              <>
                <MRow label="Total Marks (Exercise)" value={`${info.totalMarks}`} color="var(--lms-text-main)" />
                <MRow label="Questions Added"        value={`${savedBlocks.length}`} color="#4f46e5" />
                <p className="text-[10.5px] mt-2 leading-relaxed" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>
                  Re-save exercise settings to enable full progress tracking.
                </p>
              </>
            ) : (
              <p className="text-[11.5px]" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>No marks configured.</p>
            )
          )}
        </div>

        {/* ── QUESTION LIST ── */}
        {blocks.length > 0 && (
          <div className="px-4 py-3">
            <div className="lms-sidebar-section-title">
              <List className="h-3.5 w-3.5" style={{ color: 'var(--lms-text-sec)' }} />
              Questions ({blocks.length})
            </div>
            <div className="space-y-1.5">
              {blocks.map((b, idx) => {
                const isCurrent = currentBlock?.id === b.id;
                const isSaved = savedQuestionIds.has(b.id) || b.origin === 'db';
                const qScore = scoringType === 'equalDistribution' ? marksPerQuestion : (Number(b.score) || 0);
                return (
                  <div key={b.id}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                    style={{
                      background: isCurrent ? 'rgba(242,119,87,0.06)' : 'var(--lms-bg-white)',
                      border: `1.5px solid ${isCurrent ? 'var(--lms-orange-100)' : 'var(--lms-border)'}`,
                    }}>
                    {/* Index badge */}
                    <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0"
                      style={{ background: isSaved ? (isCurrent ? 'var(--lms-orange)' : 'var(--lms-success)') : 'var(--lms-bg-surface2)', color: (isSaved || isCurrent) ? '#fff' : 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>
                      {idx + 1}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px] font-semibold truncate" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>
                        {b.title.trim() || 'Untitled'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: b.questionType === 'notion' ? 'var(--lms-violet-bg)' : '#eff9f4', color: b.questionType === 'notion' ? 'var(--lms-violet)' : '#16a34a', fontFamily: 'var(--lms-font)' }}>
                          {b.questionType === 'notion' ? 'Notion' : b.questionType === 'file-upload' ? 'File Upload' : '—'}
                        </span>
                        {b.difficulty && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full capitalize"
                            style={{
                              background: b.difficulty === 'easy' ? '#f0fdf4' : b.difficulty === 'medium' ? '#fffbeb' : '#fff5f5',
                              color: b.difficulty === 'easy' ? '#16a34a' : b.difficulty === 'medium' ? '#d97706' : '#e53e3e',
                              fontFamily: 'var(--lms-font)',
                            }}>{b.difficulty}</span>
                        )}
                      </div>
                    </div>
                    {/* Score + status */}
                    <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                      {qScore > 0 && (
                        <span className="text-[10px] font-bold" style={{ color: 'var(--lms-orange)', fontFamily: 'var(--lms-font)' }}>{fmt(qScore)}m</span>
                      )}
                      {isSaved && !b.isDirty && <CheckCircle2 className="h-3 w-3" style={{ color: 'var(--lms-success)' }} />}
                      {b.isDirty && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--lms-warning)' }} />}
                      {!isSaved && !b.isDirty && b.origin === 'new' && (
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--lms-text-hint)' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── NOTION SETTINGS PANEL ────────────────────────────────────────────────────
const NOTION_FEATURES: Array<{ key: keyof NotionSettings; label: string; icon: React.ReactNode; desc: string }> = [
  { key: 'allowBold',          label: 'Bold',           icon: <Bold className="h-3.5 w-3.5" />,          desc: 'Allow bold text formatting' },
  { key: 'allowItalic',        label: 'Italic',         icon: <Italic className="h-3.5 w-3.5" />,        desc: 'Allow italic text formatting' },
  { key: 'allowUnderline',     label: 'Underline',      icon: <Underline className="h-3.5 w-3.5" />,     desc: 'Allow underline text formatting' },
  { key: 'allowHeadings',      label: 'Headings',       icon: <Heading1 className="h-3.5 w-3.5" />,      desc: 'Allow H1, H2, H3 headings' },
  { key: 'allowBulletList',    label: 'Bullet List',    icon: <List className="h-3.5 w-3.5" />,          desc: 'Allow unordered bullet lists' },
  { key: 'allowNumberedList',  label: 'Numbered List',  icon: <Hash className="h-3.5 w-3.5" />,          desc: 'Allow ordered numbered lists' },
  { key: 'allowTable',         label: 'Table',          icon: <Table className="h-3.5 w-3.5" />,         desc: 'Allow table creation and editing' },
  { key: 'allowImage',         label: 'Image',          icon: <Image className="h-3.5 w-3.5" />,         desc: 'Allow image insertion' },
  { key: 'allowCode',          label: 'Code Block',     icon: <Code className="h-3.5 w-3.5" />,          desc: 'Allow code block insertion' },
  { key: 'allowLinks',         label: 'Links',          icon: <Link className="h-3.5 w-3.5" />,          desc: 'Allow hyperlink insertion' },
];

const NotionSettingsPanel: React.FC<{
  settings: NotionSettings;
  onChange: (s: NotionSettings) => void;
}> = ({ settings, onChange }) => {
  const toggle = (key: keyof NotionSettings) =>
    onChange({ ...settings, [key]: !settings[key] });

  const enabledCount = NOTION_FEATURES.filter(f => settings[f.key]).length;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-white)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1.5px solid var(--lms-border)', background: 'var(--lms-violet-bg)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--lms-violet)', color: '#fff' }}>
            <Type className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[13px] font-bold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>Notion Editor Provisions</p>
            <p className="text-[11px]" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>Toggle what students can use in their response</p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: 'var(--lms-violet)', color: '#fff', fontFamily: 'var(--lms-font)' }}>
          {enabledCount} / {NOTION_FEATURES.length}
        </span>
      </div>

      {/* Quick toggles */}
      <div className="px-4 py-2.5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--lms-border)', background: 'var(--lms-bg-surface)' }}>
        <button type="button" onClick={() => onChange(Object.fromEntries(NOTION_FEATURES.map(f => [f.key, true])) as NotionSettings)}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{ background: 'var(--lms-violet-bg)', color: 'var(--lms-violet)', border: '1px solid var(--lms-violet-bdr)', fontFamily: 'var(--lms-font)', cursor: 'pointer' }}>
          Enable All
        </button>
        <button type="button" onClick={() => onChange(Object.fromEntries(NOTION_FEATURES.map(f => [f.key, false])) as NotionSettings)}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all"
          style={{ background: 'var(--lms-danger-bg)', color: 'var(--lms-danger)', border: '1px solid var(--lms-danger-bdr)', fontFamily: 'var(--lms-font)', cursor: 'pointer' }}>
          Disable All
        </button>
      </div>

      {/* Feature grid */}
      <div className="p-4 grid grid-cols-2 gap-2">
        {NOTION_FEATURES.map(f => {
          const active = settings[f.key];
          return (
            <button key={f.key} type="button" onClick={() => toggle(f.key)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
              style={{
                border: `1.5px solid ${active ? 'var(--lms-violet-bdr)' : 'var(--lms-border)'}`,
                background: active ? 'var(--lms-violet-bg)' : 'var(--lms-bg-surface)',
                cursor: 'pointer',
              }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: active ? 'var(--lms-violet)' : 'var(--lms-bg-surface2)', color: active ? '#fff' : 'var(--lms-text-muted)' }}>
                {f.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-bold truncate" style={{ color: active ? 'var(--lms-violet)' : 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)' }}>{f.label}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--lms-text-hint)', fontFamily: 'var(--lms-font)' }}>{f.desc}</p>
              </div>
              <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{ borderColor: active ? 'var(--lms-violet)' : 'var(--lms-border)', background: active ? 'var(--lms-violet)' : 'transparent' }}>
                {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview note */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'var(--lms-info-bg)', border: '1px solid var(--lms-info-bdr)' }}>
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--lms-info)' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--lms-info)', fontFamily: 'var(--lms-font)' }}>
            These provisions control what formatting tools are available to students when writing their answer in the Notion-style editor.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── FILE UPLOAD SETTINGS PANEL ───────────────────────────────────────────────
const FileUploadSettingsPanel: React.FC<{
  settings: FileUploadSettings;
  onChange: (s: FileUploadSettings) => void;
  error?: string;
}> = ({ settings, onChange, error }) => {
  const toggleType = (key: string) => {
    const current = settings.allowedTypes;
    const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
    onChange({ ...settings, allowedTypes: next });
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-white)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1.5px solid var(--lms-border)', background: '#eff9f4' }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#16a34a', color: '#fff' }}>
          <Upload className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[13px] font-bold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>File Upload Settings</p>
          <p className="text-[11px]" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>Configure what students can upload</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Multiple files toggle */}
        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'var(--lms-bg-surface)', border: '1.5px solid var(--lms-border)' }}>
          <div>
            <p className="text-[12.5px] font-bold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>Allow Multiple Files</p>
            <p className="text-[11px]" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>Students can upload more than one file</p>
          </div>
          <Toggle checked={settings.allowMultiple} onChange={v => onChange({ ...settings, allowMultiple: v, maxFiles: v ? settings.maxFiles || 5 : 1 })} />
        </div>

        {/* Max files (only when multiple allowed) */}
        {settings.allowMultiple && (
          <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'var(--lms-bg-surface)', border: '1.5px solid var(--lms-border)' }}>
            <div>
              <p className="text-[12.5px] font-bold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>Max File Count</p>
              <p className="text-[11px]" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>Maximum number of files allowed</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => onChange({ ...settings, maxFiles: Math.max(1, settings.maxFiles - 1) })}
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base transition-all"
                style={{ background: 'var(--lms-bg-surface2)', border: '1.5px solid var(--lms-border)', color: 'var(--lms-text-sec)', cursor: 'pointer' }}>−</button>
              <input type="number" min={1} max={20} value={settings.maxFiles}
                onChange={e => onChange({ ...settings, maxFiles: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
                className="w-12 text-center text-[13px] font-bold rounded-lg py-1"
                style={{ border: '1.5px solid var(--lms-border)', background: '#fff', color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)', outline: 'none' }} />
              <button type="button" onClick={() => onChange({ ...settings, maxFiles: Math.min(20, settings.maxFiles + 1) })}
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base transition-all"
                style={{ background: 'var(--lms-orange)', border: '1.5px solid transparent', color: '#fff', cursor: 'pointer' }}>+</button>
            </div>
          </div>
        )}

        {/* Max file size */}
        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'var(--lms-bg-surface)', border: '1.5px solid var(--lms-border)' }}>
          <div>
            <p className="text-[12.5px] font-bold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>Max File Size</p>
            <p className="text-[11px]" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>Maximum size per file</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => onChange({ ...settings, maxFileSizeMB: Math.max(1, settings.maxFileSizeMB - 1) })}
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base transition-all"
              style={{ background: 'var(--lms-bg-surface2)', border: '1.5px solid var(--lms-border)', color: 'var(--lms-text-sec)', cursor: 'pointer' }}>−</button>
            <input type="number" min={1} max={500} value={settings.maxFileSizeMB}
              onChange={e => onChange({ ...settings, maxFileSizeMB: Math.max(1, Math.min(500, parseInt(e.target.value) || 1)) })}
              className="w-14 text-center text-[13px] font-bold rounded-lg py-1"
              style={{ border: '1.5px solid var(--lms-border)', background: '#fff', color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)', outline: 'none' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)' }}>MB</span>
            <button type="button" onClick={() => onChange({ ...settings, maxFileSizeMB: Math.min(500, settings.maxFileSizeMB + 1) })}
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base transition-all"
              style={{ background: 'var(--lms-orange)', border: '1.5px solid transparent', color: '#fff', cursor: 'pointer' }}>+</button>
          </div>
        </div>

        {/* Supported file types */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[12.5px] font-bold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>Supported File Types</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onChange({ ...settings, allowedTypes: SUPPORTED_FILE_TYPES.map(f => f.key) })}
                className="text-[10.5px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: 'var(--lms-success-bg)', color: 'var(--lms-success)', border: '1px solid var(--lms-success-bdr)', fontFamily: 'var(--lms-font)', cursor: 'pointer' }}>All</button>
              <button type="button" onClick={() => onChange({ ...settings, allowedTypes: [] })}
                className="text-[10.5px] font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: 'var(--lms-danger-bg)', color: 'var(--lms-danger)', border: '1px solid var(--lms-danger-bdr)', fontFamily: 'var(--lms-font)', cursor: 'pointer' }}>None</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORTED_FILE_TYPES.map(ft => {
              const active = settings.allowedTypes.includes(ft.key);
              return (
                <button key={ft.key} type="button" onClick={() => toggleType(ft.key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                  style={{
                    border: `1.5px solid ${active ? '#16a34a' : 'var(--lms-border)'}`,
                    background: active ? '#eff9f4' : 'var(--lms-bg-surface)',
                    cursor: 'pointer',
                  }}>
                  <span className="text-base flex-shrink-0">{ft.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-bold truncate" style={{ color: active ? '#15803d' : 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)' }}>{ft.label}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--lms-text-hint)', fontFamily: 'var(--lms-font)' }}>{ft.ext}</p>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ borderColor: active ? '#16a34a' : 'var(--lms-border)', background: active ? '#16a34a' : 'transparent' }}>
                    {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>
          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'var(--lms-info-bg)', border: '1px solid var(--lms-info-bdr)' }}>
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--lms-info)' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--lms-info)', fontFamily: 'var(--lms-font)' }}>
            Students will see a file upload area restricted to these settings. Selected types determine which files are accepted.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL PRIMITIVES ─────────────────────────────────────────────────────────
const SmallModal: React.FC<{ icon: React.ReactNode; iconBg: string; title: string; children: React.ReactNode }> = ({ icon, iconBg, title, children }) => (
  <div className="lms-modal-backdrop">
    <div className="lms-modal">
      <div className="lms-modal-header">
        <div className={`lms-modal-icon ${iconBg}`}>{icon}</div>
        <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--lms-font)', color: 'var(--lms-text-main)' }}>{title}</h3>
      </div>
      <div className="lms-modal-body">{children}</div>
    </div>
  </div>
);

const DeleteDialog: React.FC<{ isOpen: boolean; title: string; onConfirm: () => void; onCancel: () => void; isDeleting?: boolean }> = ({ isOpen, title, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;
  return (
    <SmallModal icon={<Trash2 className="h-4 w-4 text-red-600" />} iconBg="bg-red-50" title="Delete Question">
      <p className="text-xs font-medium mb-3" style={{ color: 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)' }}>
        Are you sure you want to delete <strong>"{title || 'Untitled question'}"</strong>? This cannot be undone.
      </p>
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={isDeleting} className="flex-1 lms-btn lms-btn-slate justify-center">Cancel</button>
        <button onClick={onConfirm} disabled={isDeleting}
          className="flex-1 lms-btn justify-center"
          style={{ background: 'var(--lms-danger)', color: '#fff', borderColor: 'transparent' }}>
          {isDeleting ? <><Loader className="h-3.5 w-3.5 animate-spin" />Deleting…</> : <><Trash2 className="h-3.5 w-3.5" />Delete</>}
        </button>
      </div>
    </SmallModal>
  );
};

const CloseDialog: React.FC<{ isOpen: boolean; unsavedCount: number; onConfirm: () => void; onCancel: () => void }> = ({ isOpen, unsavedCount, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="lms-modal-backdrop">
      <div className="lms-modal" style={{ maxWidth: 400 }}>
        <div className="lms-modal-header">
          <div className="lms-modal-icon" style={{ background: 'var(--lms-warning-bg)', border: '1.5px solid var(--lms-warning-bdr)' }}>
            <AlertCircle style={{ width: 18, height: 18, color: '#d97706' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--lms-font)', color: 'var(--lms-text-main)' }}>Unsaved Questions</h3>
            <p className="text-[11px] mt-0.5" style={{ fontFamily: 'var(--lms-font)', color: 'var(--lms-text-muted)' }}>
              {unsavedCount} question{unsavedCount !== 1 ? 's' : ''} will be lost if you close now.
            </p>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5 pt-3">
          <button onClick={onCancel} className="flex-1 lms-btn lms-btn-slate justify-center">Keep Editing</button>
          <button onClick={onConfirm} className="flex-1 lms-btn lms-btn-orange justify-center"><X className="h-3.5 w-3.5" />Close & Discard</button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const OthersAddQuestionForm: React.FC<OthersAddQuestionFormProps> = ({
  breadcrumbs,
  exerciseData,
  tabType,
  initialData,
  isEditing = false,
  initialQuestionId,
  onClose,
  onSave,
  isSaving = false,
  saveProgress = 0,
  saveMessage = '',
}) => {
  useEffect(() => { injectFonts(); }, []);

  // ── Derive exercise config ─────────────────────────────────────────────────
  const fullEx = exerciseData?.fullExerciseData;
  const progCfg = fullEx?.questionConfiguration?.programmingQuestionConfiguration || fullEx?.questionConfiguration?.programmingConfig;
  const cfgType = progCfg?.questionConfigType || 'general';
  const info = fullEx?.exerciseInformation || {};
  const exerciseName = info?.exerciseName || exerciseData?.exerciseName || 'Exercise';
  const subcategory = fullEx?.subcategory || exerciseData?.subcategory || '';
  const exerciseDbId = fullEx?._id || exerciseData?.exerciseId || exerciseData?._id || '';

  // Scoring config — normalize stored scoreType ('evenMarks'/'separateMarks') → internal ('equalDistribution'/'questionSpecific')
  const rawScoreType = progCfg?.scoreSettings?.scoreType || 'evenMarks';
  const scoringType: string =
    rawScoreType === 'evenMarks' || rawScoreType === 'equalDistribution' ? 'equalDistribution'
    : rawScoreType === 'separateMarks' || rawScoreType === 'questionSpecific' ? 'questionSpecific'
    : 'equalDistribution';
  const totalQuestions: number = cfgType === 'general'
    ? (progCfg?.generalQuestionCount || 0)
    : (['easy', 'medium', 'hard'] as const).reduce((s, l) =>
        s + (progCfg?.levelBasedCounts?.[l] || progCfg?.selectionLevelCounts?.[l] ||
             progCfg?.scoreSettings?.levelScoringConfiguration?.[l]?.questionCount || 0), 0);
  const marksPerQuestion: number = scoringType === 'equalDistribution'
    ? (progCfg?.generalMarksPerQuestion || progCfg?.scoreSettings?.evenMarks || progCfg?.scoreSettings?.equalDistribution || 0)
    : 0;
  const maxMarks: number = scoringType === 'questionSpecific'
    ? (Number(info?.totalMarks) || Number(fullEx?.exerciseInformation?.totalMarks) || 0)
    : totalQuestions * marksPerQuestion;

  const entityType = (() => {
    const m: Record<string, string> = {
      module: 'modules', modules: 'modules', submodule: 'submodules', submodules: 'submodules',
      topic: 'topics', topics: 'topics', subtopic: 'subtopics', subtopics: 'subtopics',
    };
    return (m[exerciseData?.nodeType?.toLowerCase()?.trim()] || 'topics') as any;
  })();

  // ── State ──────────────────────────────────────────────────────────────────
  const [questionBlocks, setQuestionBlocks] = useState<OthersQuestionBlock[]>([makeDefaultBlock()]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Set<string>>(new Set());
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showExerciseSettings, setShowExerciseSettings] = useState(false);
  const [exerciseSettingsData, setExerciseSettingsData] = useState<any>(null);
  const [loadingExercise, setLoadingExercise] = useState(false);
  const [showDiffMenu, setShowDiffMenu] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, any>>({});

  const mainScrollRef = useRef<HTMLDivElement>(null);

  // ── Seed score on first new block once config is known ─────────────────────
  useEffect(() => {
    if (scoringType === 'equalDistribution' && marksPerQuestion > 0) {
      setQuestionBlocks(bs => bs.map((b, i) =>
        i === 0 && b.origin === 'new' && b.score === undefined ? { ...b, score: marksPerQuestion } : b
      ));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksPerQuestion, scoringType]);

  const currentBlock = questionBlocks[currentIndex] ?? null;

  // ── Computed ───────────────────────────────────────────────────────────────
  const limitReached = (() => {
    const saved = questionBlocks.filter(b => savedQuestionIds.has(b.id) || b.origin === 'db');
    if (scoringType === 'equalDistribution' && totalQuestions > 0) return saved.length >= totalQuestions;
    if (scoringType === 'questionSpecific' && maxMarks > 0) {
      const usedM = saved.reduce((s, b) => s + (Number(b.score) || 0), 0);
      return usedM >= maxMarks;
    }
    return false;
  })();

  const isSaveAndFinish = (() => {
    if (totalQuestions > 0 && scoringType === 'equalDistribution') {
      const savedCount = questionBlocks.filter(b => savedQuestionIds.has(b.id) || b.origin === 'db').length;
      return savedCount >= totalQuestions;
    }
    if (maxMarks > 0 && scoringType === 'questionSpecific') {
      const usedM = questionBlocks.filter(b => savedQuestionIds.has(b.id) || b.origin === 'db').reduce((s, b) => s + (Number(b.score) || 0), 0);
      return usedM >= maxMarks;
    }
    return questionBlocks.some(b => savedQuestionIds.has(b.id) || b.origin === 'db');
  })();

  // ── Block helpers ──────────────────────────────────────────────────────────
  const updateBlock = useCallback((id: string, patch: Partial<OthersQuestionBlock>) => {
    setQuestionBlocks(bs => bs.map(b =>
      b.id === id ? { ...b, ...patch, isDirty: b.origin === 'db' ? true : b.isDirty } : b
    ));
  }, []);

  const goToIndex = useCallback((idx: number) => {
    if (idx < 0 || idx >= questionBlocks.length) return;
    setCurrentIndex(idx);
    setShowDiffMenu(false);
    setTimeout(() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }, [questionBlocks.length]);

  const handlePrev = () => goToIndex(currentIndex - 1);
  const handleNext = () => goToIndex(currentIndex + 1);

  // ── Validate block ─────────────────────────────────────────────────────────
  const validateBlock = useCallback((b: OthersQuestionBlock): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!b.questionType) e.questionType = 'Please select a question type';
    if (!b.title.trim()) e.title = 'Question title is required';
    if (!b.difficulty) e.difficulty = 'Please select a difficulty level';
    if (scoringType === 'questionSpecific' && !(Number(b.score) > 0)) e.score = 'Score is required';
    if (b.questionType === 'file-upload' && b.fileUploadSettings.allowedTypes.length === 0) {
      e.fileTypes = 'Select at least one supported file type';
    }
    return e;
  }, [scoringType]);

  const blockIsValid = useCallback((b: OthersQuestionBlock): boolean => Object.keys(validateBlock(b)).length === 0, [validateBlock]);
  const currentBlockIsValid = currentBlock ? blockIsValid(currentBlock) : false;

  // ── Save question ──────────────────────────────────────────────────────────
  const handleSaveCurrentQuestion = useCallback(async (goNext: boolean, finishAfter = false) => {
    if (!currentBlock) return;
    const errs = validateBlock(currentBlock);
    setValidationAttempted(prev => new Set(prev).add(currentBlock.id));
    setErrors(prev => ({ ...prev, [currentBlock.id]: errs }));
    if (Object.keys(errs).length > 0) return;

    setIsSavingQuestion(true);
    try {
      const payload = {
        questionType: 'others',
        othersQuestionType: currentBlock.questionType,
        title: currentBlock.title.trim(),
        description: currentBlock.description,
        difficulty: currentBlock.difficulty,
        score: currentBlock.score,
        isRequired: currentBlock.isRequired,
        notionSettings: currentBlock.questionType === 'notion' ? currentBlock.notionSettings : undefined,
        fileUploadSettings: currentBlock.questionType === 'file-upload' ? currentBlock.fileUploadSettings : undefined,
        subcategory,
        tabType,
      };

      const exerciseId = exerciseDbId;
      let response: any;
      if (currentBlock.origin === 'db' && currentBlock.dbId) {
        response = await questionApi.updateQuestion(entityType, exerciseData.nodeId, exerciseId, currentBlock.dbId, payload, tabType, subcategory);
      } else {
        response = await questionApi.addQuestion(entityType, exerciseData.nodeId, exerciseId, payload, tabType, subcategory);
        const newDbId = response?.data?.question?._id || response?.data?._id || response?._id;
        if (newDbId) {
          setQuestionBlocks(bs => bs.map(b => b.id === currentBlock.id ? { ...b, dbId: newDbId, origin: 'db' as const, isDirty: false } : b));
        }
      }

      setSavedQuestionIds(prev => new Set(prev).add(currentBlock.id));
      setQuestionBlocks(bs => bs.map(b => b.id === currentBlock.id ? { ...b, isDirty: false } : b));

      if (finishAfter) { onSave(payload); return; }

      if (goNext) {
        if (currentIndex < questionBlocks.length - 1) {
          goToIndex(currentIndex + 1);
        } else if (!limitReached) {
          const newBlock = makeDefaultBlock();
          if (scoringType === 'equalDistribution' && marksPerQuestion > 0) {
            newBlock.score = marksPerQuestion;
          }
          setQuestionBlocks(bs => [...bs, newBlock]);
          setCurrentIndex(questionBlocks.length);
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save';
      setErrors(prev => ({ ...prev, [currentBlock.id]: { ...prev[currentBlock.id], api: `Save failed: ${msg}` } }));
    } finally {
      setIsSavingQuestion(false);
    }
  }, [currentBlock, validateBlock, currentIndex, questionBlocks.length, goToIndex, limitReached,
    scoringType, marksPerQuestion, exerciseDbId, entityType, exerciseData, subcategory, tabType, onSave]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = useCallback(async () => {
    if (deleteTarget === null) return;
    const block = questionBlocks[deleteTarget];
    if (!block) return;
    setIsDeleting(true);
    try {
      if (block.origin === 'db' && block.dbId) {
        await questionApi.deleteQuestion(entityType, exerciseData.nodeId, exerciseDbId, block.dbId, tabType, subcategory);
      }
      const newBlocks = questionBlocks.filter((_, i) => i !== deleteTarget);
      if (newBlocks.length === 0) {
        const fresh = makeDefaultBlock();
        setQuestionBlocks([fresh]);
        setCurrentIndex(0);
      } else {
        setQuestionBlocks(newBlocks);
        setCurrentIndex(Math.min(deleteTarget, newBlocks.length - 1));
      }
      setSavedQuestionIds(prev => { const s = new Set(prev); s.delete(block.id); return s; });
    } catch (err: any) {
      console.error('Delete failed', err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, questionBlocks, entityType, exerciseData, exerciseDbId, tabType, subcategory]);

  // ── Edit exercise ──────────────────────────────────────────────────────────
  const handleEditExercise = useCallback(async () => {
    setLoadingExercise(true);
    try {
      const res = await exerciseApi.getExerciseById(entityType, exerciseData.nodeId, exerciseDbId);
      setExerciseSettingsData(res?.data?.exercise || res?.data || fullEx);
    } catch { setExerciseSettingsData(fullEx); }
    finally { setLoadingExercise(false); setShowExerciseSettings(true); }
  }, [entityType, exerciseData, exerciseDbId, fullEx]);

  // ── Handle close ───────────────────────────────────────────────────────────
  const handleCloseClick = useCallback(() => {
    const unsaved = questionBlocks.filter(b => b.origin === 'new' && (b.title.trim() || b.description.trim())).length;
    const dirty = questionBlocks.filter(b => b.isDirty).length;
    if (unsaved > 0 || dirty > 0) { setShowCloseConfirm(true); return; }
    onClose();
  }, [questionBlocks, onClose]);

  // ── Score change ───────────────────────────────────────────────────────────
  const handleScoreChange = (id: string, val: string) => {
    const n = parseFloat(val);
    updateBlock(id, { score: isNaN(n) || n < 0 ? undefined : n });
    if (!isNaN(n) && n > 0) {
      setErrors(prev => { const e = { ...prev }; if (e[id]) { delete e[id].score; } return e; });
    }
  };

  const blockErr = currentBlock ? (errors[currentBlock.id] || {}) : {};
  const isValidationAttempted = currentBlock ? validationAttempted.has(currentBlock.id) : false;

  // ── Duplicate ──────────────────────────────────────────────────────────────
  const duplicateBlock = () => {
    if (!currentBlock) return;
    const dup: OthersQuestionBlock = { ...JSON.parse(JSON.stringify(currentBlock)), id: generateId('oq'), origin: 'new', isDirty: false, dbId: undefined };
    setQuestionBlocks(bs => { const n = [...bs]; n.splice(currentIndex + 1, 0, dup); return n; });
    setCurrentIndex(currentIndex + 1);
  };

  // ── Clear block ────────────────────────────────────────────────────────────
  const clearBlock = () => {
    if (!currentBlock) return;
    const fresh = makeDefaultBlock();
    updateBlock(currentBlock.id, { questionType: fresh.questionType, title: fresh.title, description: fresh.description, difficulty: fresh.difficulty, score: fresh.score, notionSettings: fresh.notionSettings, fileUploadSettings: fresh.fileUploadSettings });
    setErrors(prev => { const e = { ...prev }; delete e[currentBlock.id]; return e; });
    setValidationAttempted(prev => { const s = new Set(prev); s.delete(currentBlock.id); return s; });
    setSavedQuestionIds(prev => { const s = new Set(prev); s.delete(currentBlock.id); return s; });
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="lms-font fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--lms-bg-white)', fontFamily: 'var(--lms-font)' }}>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ background: 'var(--lms-bg-white)', borderBottom: '1.5px solid var(--lms-border)' }}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="lms-header-logo-mark">
            <FolderOpen className="h-4 w-4 text-white" />
          </div>
          <div className="h-5 w-px flex-shrink-0" style={{ background: 'var(--lms-border)' }} />
          <div className="min-w-0 flex-1">
            <QuestionFormBreadcrumb
              breadcrumbs={breadcrumbs || []} tabType={tabType}
              exerciseName={exerciseName}
              actionLabel={isEditing ? 'Edit Question' : 'Add Question'}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {loadingExercise && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg mr-2"
              style={{ color: 'var(--lms-orange)', background: 'var(--lms-orange-50)', border: '1.5px solid var(--lms-orange-100)', fontFamily: 'var(--lms-font)' }}>
              <Loader className="h-3 w-3 animate-spin" />Loading…
            </span>
          )}
          {questionBlocks.some(b => b.isDirty) && (
            <span className="lms-badge lms-badge-amber mr-2">
              <Edit2 className="h-2.5 w-2.5" />{questionBlocks.filter(b => b.isDirty).length} edited
            </span>
          )}
          <button onClick={handleEditExercise} className="lms-btn lms-btn-ghost-orange mr-2">
            <Settings2 className="h-3.5 w-3.5" />Edit Overview
          </button>
          <button onClick={handleCloseClick}
            className="p-2 rounded-lg transition-colors cursor-pointer bg-red-100 hover:bg-red-200">
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex flex-1 min-h-0" style={{ overflow: 'hidden' }}>

        {/* ── EDITOR ── */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--lms-bg-white)', overflow: 'hidden' }}>
          <div ref={mainScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ scrollbarWidth: 'thin', overscrollBehavior: 'contain', background: 'var(--lms-bg-white)' }}>
            {currentBlock ? (
              <div className="flex flex-col min-h-full">

                {/* ── STICKY TOOLBAR ── */}
                <div className="px-5 pt-3 pb-2 flex-shrink-0 sticky top-0 z-50"
                  style={{ background: 'var(--lms-bg-white)', borderBottom: '1px solid var(--lms-border)' }}>
                  <div className="flex items-center gap-3 flex-wrap">

                    {/* Q# badge */}
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: currentBlock.origin === 'db' ? 'var(--lms-success)' : 'var(--lms-orange)', fontFamily: 'var(--lms-font)' }}>
                      {currentIndex + 1}
                    </div>
                    {currentBlock.origin === 'db' && (
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${currentBlock.isDirty ? 'lms-badge-amber' : 'lms-badge-green'}`}
                        style={{ border: '1px solid' }}>
                        {currentBlock.isDirty ? 'edited' : 'saved'}
                      </span>
                    )}

                    <div className="flex-1" />

                    {/* Question Type — inline radio cards */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--lms-text-hint)', fontFamily: 'var(--lms-font)' }}>Type</span>
                      {/* File Upload option */}
                      {(() => {
                        const isActive = currentBlock.questionType === 'file-upload';
                        return (
                          <button type="button" onClick={() => { updateBlock(currentBlock.id, { questionType: 'file-upload' }); setErrors(prev => { const e = { ...prev }; if (e[currentBlock.id]) delete e[currentBlock.id].questionType; return e; }); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                            style={{ border: `1.5px solid ${isActive ? '#bbf7d0' : 'var(--lms-border)'}`, background: isActive ? '#eff9f4' : 'var(--lms-bg-surface)', color: isActive ? '#16a34a' : 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <div className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all" style={{ borderColor: isActive ? '#16a34a' : 'var(--lms-border)', background: isActive ? '#16a34a' : 'transparent' }}>
                              {isActive && <Check className="h-2 w-2 text-white" strokeWidth={3} />}
                            </div>
                            <Upload className="h-3.5 w-3.5" />
                            <span>File Upload</span>
                          </button>
                        );
                      })()}
                      {/* Notion option */}
                      {(() => {
                        const isActive = currentBlock.questionType === 'notion';
                        return (
                          <button type="button" onClick={() => { updateBlock(currentBlock.id, { questionType: 'notion' }); setErrors(prev => { const e = { ...prev }; if (e[currentBlock.id]) delete e[currentBlock.id].questionType; return e; }); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                            style={{ border: `1.5px solid ${isActive ? 'var(--lms-violet-bdr)' : 'var(--lms-border)'}`, background: isActive ? 'var(--lms-violet-bg)' : 'var(--lms-bg-surface)', color: isActive ? 'var(--lms-violet)' : 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <div className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all" style={{ borderColor: isActive ? 'var(--lms-violet)' : 'var(--lms-border)', background: isActive ? 'var(--lms-violet)' : 'transparent' }}>
                              {isActive && <Check className="h-2 w-2 text-white" strokeWidth={3} />}
                            </div>
                            <Type className="h-3.5 w-3.5" />
                            <span>Notion Type</span>
                          </button>
                        );
                      })()}
                    </div>

                    {/* Difficulty */}
                    <div className="relative flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); setShowDiffMenu(v => !v); }}
                          className={`lms-diff-underline-btn ${currentBlock.difficulty ? 'has-value' : ''}`}
                          style={{
                            color: currentBlock.difficulty ? diffConfig[currentBlock.difficulty].color
                              : blockErr.difficulty && isValidationAttempted ? 'var(--lms-danger)' : 'var(--lms-text-hint)',
                            borderBottomColor: currentBlock.difficulty ? diffConfig[currentBlock.difficulty].border
                              : blockErr.difficulty && isValidationAttempted ? 'var(--lms-danger-bdr)' : undefined,
                            minWidth: 100,
                          }}>
                          {currentBlock.difficulty ? (
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: diffConfig[currentBlock.difficulty].dot, flexShrink: 0 }} />
                          ) : blockErr.difficulty && isValidationAttempted ? (
                            <AlertCircle style={{ width: 12, height: 12, color: 'var(--lms-danger)', flexShrink: 0 }} />
                          ) : null}
                          <span>{currentBlock.difficulty ? diffConfig[currentBlock.difficulty].label : 'Difficulty'}</span>
                          <svg className="diff-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 6l4 4 4-4" /></svg>
                        </button>
                        {showDiffMenu && (
                          <div className="lms-diff-dropdown" onClick={e => e.stopPropagation()}>
                            {(['easy', 'medium', 'hard'] as const).map(level => (
                              <div key={level} onClick={() => {
                                updateBlock(currentBlock.id, { difficulty: level });
                                setShowDiffMenu(false);
                                setErrors(prev => { const e = { ...prev }; if (e[currentBlock.id]) delete e[currentBlock.id].difficulty; return e; });
                              }} className="lms-diff-dropdown-item">
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: diffConfig[level].dot, flexShrink: 0 }} />
                                <span style={{ color: diffConfig[level].color, fontWeight: currentBlock.difficulty === level ? 700 : 500 }}>
                                  {diffConfig[level].label}
                                </span>
                                {currentBlock.difficulty === level && <Check style={{ width: 12, height: 12, color: diffConfig[level].color, marginLeft: 'auto' }} />}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Score */}
                    {scoringType === 'questionSpecific' && (
                      <div className="relative flex-shrink-0 group mt-[3px]">
                        <div className={`lms-score-wrap ${blockErr.score && isValidationAttempted ? 'score-err' : ''}`}>
                          <input type="number" min={0} step={0.5}
                            value={currentBlock.score !== undefined ? currentBlock.score : ''}
                            placeholder="0"
                            onChange={e => handleScoreChange(currentBlock.id, e.target.value)}
                            className={`lms-score-input ${blockErr.score && isValidationAttempted ? 'score-err' : ''}`} />
                          <span className={`lms-score-label ${blockErr.score && isValidationAttempted ? '!text-red-400' : ''}`}>marks</span>
                        </div>
                      </div>
                    )}

                    {/* Equal distribution mark info */}
                    {scoringType === 'equalDistribution' && marksPerQuestion > 0 && (
                      <div className="flex items-baseline gap-1 flex-shrink-0"
                        style={{ borderBottom: '1.5px solid var(--lms-border)', padding: '4px 0' }}>
                        <span className="text-[13px] font-bold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>{marksPerQuestion}</span>
                        <span className="text-[13px]" style={{ color: 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)' }}>marks</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── CONTENT AREA ── */}
                <div className="px-5 pt-4 pb-6 flex flex-col gap-5">

                  {/* Question Title */}
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wider mb-2 block"
                      style={{ color: 'var(--lms-text-hint)', fontFamily: 'var(--lms-font)' }}>
                      Question Title <span style={{ color: 'var(--lms-danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={currentBlock.title}
                      onChange={e => {
                        updateBlock(currentBlock.id, { title: e.target.value });
                        if (e.target.value.trim()) setErrors(prev => { const n = { ...prev }; if (n[currentBlock.id]) delete n[currentBlock.id].title; return n; });
                      }}
                      placeholder="Enter the question or task title…"
                      className="w-full text-[15px] font-medium"
                      style={{
                        background: 'transparent', border: 'none',
                        borderBottom: `1.5px solid ${blockErr.title && isValidationAttempted ? 'var(--lms-danger)' : 'var(--lms-border)'}`,
                        outline: 'none', padding: '4px 0 8px',
                        color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)', fontWeight: 500,
                        caretColor: 'var(--lms-orange)',
                      }} />
                    {blockErr.title && isValidationAttempted && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />{blockErr.title}
                      </div>
                    )}
                  </div>

                  {/* Description / Instructions */}
                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wider mb-2 block"
                      style={{ color: 'var(--lms-text-hint)', fontFamily: 'var(--lms-font)' }}>
                      Description / Instructions
                    </label>
                    <textarea
                      value={currentBlock.description}
                      onChange={e => updateBlock(currentBlock.id, { description: e.target.value })}
                      placeholder="Provide any additional instructions, context, or rubric for this question…"
                      rows={3}
                      className="w-full resize-none"
                      style={{
                        background: 'var(--lms-bg-surface)', border: '1.5px solid var(--lms-border)',
                        borderRadius: 'var(--lms-radius-md)', outline: 'none', padding: '10px 12px',
                        fontSize: 13.5, color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)',
                        fontWeight: 400, lineHeight: 1.65,
                      }} />
                  </div>

                  {/* Question type content */}
                  {!currentBlock.questionType && (
                    <div className="flex flex-col items-center justify-center py-12 rounded-2xl"
                      style={{ border: `2px dashed ${blockErr.questionType && isValidationAttempted ? 'var(--lms-danger)' : 'var(--lms-border)'}`, background: 'var(--lms-bg-surface)' }}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: blockErr.questionType && isValidationAttempted ? 'var(--lms-danger-bg)' : 'var(--lms-bg-surface2)' }}>
                        <FolderOpen className="h-6 w-6" style={{ color: blockErr.questionType && isValidationAttempted ? 'var(--lms-danger)' : 'var(--lms-text-hint)' }} />
                      </div>
                      <p className="text-[13px] font-bold mb-1" style={{ color: blockErr.questionType && isValidationAttempted ? 'var(--lms-danger)' : 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)' }}>
                        Select a question type to continue
                      </p>
                      <p className="text-[12px]" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>
                        Choose <strong>Notion Type</strong> or <strong>File Upload</strong> from the toolbar above
                      </p>
                    </div>
                  )}

                  {currentBlock.questionType === 'notion' && (
                    <NotionSettingsPanel
                      settings={currentBlock.notionSettings}
                      onChange={s => updateBlock(currentBlock.id, { notionSettings: s })}
                    />
                  )}

                  {currentBlock.questionType === 'file-upload' && (
                    <FileUploadSettingsPanel
                      settings={currentBlock.fileUploadSettings}
                      onChange={s => updateBlock(currentBlock.id, { fileUploadSettings: s })}
                      error={blockErr.fileTypes && isValidationAttempted ? blockErr.fileTypes : undefined}
                    />
                  )}

                  {/* Required toggle */}
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: 'var(--lms-bg-surface)', border: '1.5px solid var(--lms-border)' }}>
                    <div>
                      <p className="text-[12.5px] font-bold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>Required Question</p>
                      <p className="text-[11px]" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>Students must answer this before submission</p>
                    </div>
                    <Toggle checked={currentBlock.isRequired} onChange={v => updateBlock(currentBlock.id, { isRequired: v })} />
                  </div>

                  {/* API error */}
                  {blockErr.api && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--lms-danger-bg)', border: '1.5px solid var(--lms-danger-bdr)' }}>
                      <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--lms-danger)' }} />
                      <p className="text-[12px] font-semibold" style={{ color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>{blockErr.api}</p>
                    </div>
                  )}

                  <div className="h-4 flex-shrink-0" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-full" style={{ background: 'var(--lms-bg-white)' }}>
                <p className="text-sm" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>No question selected</p>
              </div>
            )}
          </div>

          {/* ── BOTTOM NAV ── */}
          <div className="flex-shrink-0 py-3"
            style={{ borderTop: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-white)', paddingLeft: 32, paddingRight: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>

              {/* LEFT: spacer */}
              <div />

              {/* CENTER: Prev · counter · Next · Save&Next/Finish */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <button onClick={handlePrev} disabled={currentIndex === 0} className="lms-nav-btn flex-shrink-0">
                  <ChevronLeft className="h-3.5 w-3.5" />Prev
                </button>
                <span className="text-[12px] font-medium flex-shrink-0"
                  style={{ color: 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--lms-orange)', fontWeight: 700 }}>{currentIndex + 1}</span>
                  <span style={{ color: 'var(--lms-text-hint)' }}> / </span>
                  {questionBlocks.length}
                </span>
                <button onClick={() => goToIndex(currentIndex + 1)}
                  disabled={currentIndex >= questionBlocks.length - 1}
                  className="lms-nav-btn flex-shrink-0">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>

                {currentBlock && !isSaveAndFinish && (
                  <button onClick={() => handleSaveCurrentQuestion(true)} disabled={isSavingQuestion}
                    className="lms-btn flex-shrink-0"
                    style={{ background: 'var(--lms-orange)', color: 'white', borderColor: 'transparent', boxShadow: '0 2px 8px var(--lms-orange-glow)', fontFamily: 'var(--lms-font)' }}>
                    {isSavingQuestion ? <><Loader className="h-3.5 w-3.5 animate-spin" />Saving…</> : <><CloudUpload className="h-3.5 w-3.5" />Save &amp; Next</>}
                  </button>
                )}

                {currentBlock && isSaveAndFinish && (
                  <>
                    <button onClick={() => handleSaveCurrentQuestion(false, false)} disabled={isSavingQuestion}
                      className="lms-btn flex-shrink-0"
                      style={{ background: 'var(--lms-orange)', color: 'white', borderColor: 'transparent', boxShadow: '0 2px 8px var(--lms-orange-glow)', fontFamily: 'var(--lms-font)' }}>
                      {isSavingQuestion ? <><Loader className="h-3.5 w-3.5 animate-spin" />Saving…</> : <><CloudUpload className="h-3.5 w-3.5" />Save</>}
                    </button>
                    <button onClick={() => handleSaveCurrentQuestion(false, true)}
                      className="lms-btn flex-shrink-0"
                      style={{ background: 'var(--lms-success)', color: 'white', borderColor: 'transparent', boxShadow: '0 2px 8px rgba(22,163,74,0.25)', fontFamily: 'var(--lms-font)' }}>
                      <Check className="h-3.5 w-3.5" />Finish
                    </button>
                  </>
                )}
              </div>

              {/* RIGHT: Saved/Unsaved · Required · Delete · Duplicate · Clear */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>

                {currentBlock && (() => {
                  const isSaved = savedQuestionIds.has(currentBlock.id) && !currentBlock.isDirty;
                  const isDbClean = currentBlock.origin === 'db' && !currentBlock.isDirty;
                  return (isSaved || isDbClean) ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0"
                      style={{ color: 'var(--lms-success)', fontFamily: 'var(--lms-font)' }}>
                      <CheckCircle2 className="h-3.5 w-3.5" />Saved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold flex-shrink-0"
                      style={{ color: 'var(--lms-warning)', fontFamily: 'var(--lms-font)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lms-warning)', flexShrink: 0 }} />
                      Unsaved
                    </span>
                  );
                })()}

                <div className="w-px h-5 flex-shrink-0" style={{ background: 'var(--lms-border)' }} />

                {currentBlock && (
                  <label className="flex items-center gap-1.5 cursor-pointer select-none flex-shrink-0">
                    <span className="text-[11px] font-medium" style={{ color: 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)' }}>Required</span>
                    <button type="button" onClick={() => updateBlock(currentBlock.id, { isRequired: !currentBlock.isRequired })}
                      className="relative rounded-full transition-colors flex-shrink-0"
                      style={{ width: 28, height: 16, background: currentBlock.isRequired ? 'var(--lms-orange)' : 'var(--lms-border-hover)' }}>
                      <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${currentBlock.isRequired ? 'translate-x-3' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                )}

                <div className="w-px h-5 flex-shrink-0" style={{ background: 'var(--lms-border)' }} />

                {currentBlock && questionBlocks.length > 1 && (
                  <div className="lms-tooltip-wrap flex-shrink-0">
                    <button onClick={() => setDeleteTarget(currentIndex)} className="lms-icon-btn lms-icon-btn-red">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="lms-tooltip lms-tooltip-right" style={{ background: 'var(--lms-danger)' }}>Delete question</div>
                  </div>
                )}

                {currentBlock && (
                  <div className="lms-tooltip-wrap flex-shrink-0">
                    <button onClick={duplicateBlock} disabled={!currentBlockIsValid}
                      className={`lms-icon-btn ${currentBlockIsValid ? 'lms-icon-btn-violet' : 'lms-icon-btn-slate'}`}
                      style={!currentBlockIsValid ? { cursor: 'not-allowed', opacity: 0.45 } : {}}>
                      <Copy className="h-4 w-4" />
                    </button>
                    <div className="lms-tooltip lms-tooltip-right">
                      {currentBlockIsValid ? 'Duplicate question' : 'Complete question first'}
                    </div>
                  </div>
                )}

                {currentBlock && (
                  <div className="lms-tooltip-wrap flex-shrink-0">
                    <button onClick={clearBlock} className="lms-icon-btn lms-icon-btn-slate">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <div className="lms-tooltip lms-tooltip-right">Clear question</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-72 flex-shrink-0 flex flex-col"
          style={{ borderLeft: '1.5px solid var(--lms-border)', overflow: 'hidden', minWidth: 0 }}>
          <div className="flex-1 overflow-hidden min-h-0">
            <OthersDetailsPanel
              exerciseData={exerciseData}
              blocks={questionBlocks}
              savedQuestionIds={savedQuestionIds}
              currentBlock={currentBlock}
              scoringType={scoringType}
              marksPerQuestion={marksPerQuestion}
              totalQuestions={totalQuestions}
              maxMarks={maxMarks}
              isSaving={isSavingQuestion}
              isEditing={isEditing}
              onClose={handleCloseClick}
            />
          </div>
          {/* Close button */}
          <div className="flex-shrink-0 px-3 py-2.5 flex items-center gap-2"
            style={{ borderTop: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-white)' }}>
            <button type="button" onClick={handleCloseClick}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={{ background: 'var(--lms-bg-surface2)', color: 'var(--lms-text-sec)', border: '1.5px solid var(--lms-border)', fontFamily: 'var(--lms-font)' }}>
              <X className="h-3.5 w-3.5" />Close
            </button>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <DeleteDialog
        isOpen={deleteTarget !== null}
        title={deleteTarget !== null ? (questionBlocks[deleteTarget]?.title || 'Untitled') : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />

      <CloseDialog
        isOpen={showCloseConfirm}
        unsavedCount={questionBlocks.filter(b => b.origin === 'new' && (b.title.trim() || b.description.trim())).length + questionBlocks.filter(b => b.isDirty).length}
        onConfirm={() => { setShowCloseConfirm(false); onClose(); }}
        onCancel={() => setShowCloseConfirm(false)}
      />

      {showExerciseSettings && (
        <ExerciseSettings
          hierarchyData={{
            CourseName: breadcrumbs?.[0]?.name || '', moduleName: breadcrumbs?.[1]?.name || '',
            submoduleName: breadcrumbs?.[2]?.name || '', topicName: breadcrumbs?.[3]?.name || '',
            subtopicName: breadcrumbs?.[4]?.name || '', nodeType: exerciseData?.nodeType || 'topic',
            level: breadcrumbs?.length || 0,
          }}
          nodeId={exerciseData?.nodeId || ''} nodeName={exerciseData?.nodeName || exerciseName || ''}
          nodeType={exerciseData?.nodeType || 'topic'} subcategory={subcategory}
          onSave={() => setShowExerciseSettings(false)} onClose={() => setShowExerciseSettings(false)}
          isEditing={true} tabType={tabType as 'I_Do' | 'We_Do' | 'You_Do'}
          initialData={exerciseSettingsData} exercise_Id={exerciseDbId}
        />
      )}

      {showDiffMenu && <div className="fixed inset-0 z-40" onClick={() => setShowDiffMenu(false)} />}
    </div>
  );
};

export default OthersAddQuestionForm;
