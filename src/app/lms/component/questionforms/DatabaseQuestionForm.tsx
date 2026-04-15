import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Plus, Trash2, Save, Loader2, Check, AlertCircle,
  Eye, Database, Award, GraduationCap, ChevronDown, ChevronUp,
  AlertTriangle, Play, Terminal, Hash, Table, FileText, Zap,
  CheckCircle2, ArrowRight, Flag, BarChart3, Code, Image,
  CloudUpload, Loader, ChevronLeft, ChevronRight, Edit2,
  Layers, ArrowLeftRight, BookOpen, Clock, Target, Sparkles,
} from 'lucide-react';

// ─── FONT INJECTION ────────────────────────────────────────────────────────────
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
        --lms-orange:        #F27757;
        --lms-orange-dark:   #e0623f;
        --lms-orange-glow:   rgba(242,119,87,0.22);
        --lms-orange-light:  rgba(242,119,87,0.08);
        --lms-orange-50:     #FEF3EF;
        --lms-orange-100:    #FDDDD4;
        --lms-text-main:     #1a1a2e;
        --lms-text-sec:      #3a3a52;
        --lms-text-muted:    #55556e;
        --lms-text-hint:     #9a9ab0;
        --lms-border:        #e4e4ed;
        --lms-border-hover:  #d0d0de;
        --lms-bg-white:      #ffffff;
        --lms-bg-surface:    #f7f7fb;
        --lms-bg-surface2:   #f0f0f7;
        --lms-success:       #16a34a;
        --lms-success-bg:    #f0fdf4;
        --lms-success-bdr:   #bbf7d0;
        --lms-danger:        #e53e3e;
        --lms-danger-bg:     #fff5f5;
        --lms-danger-bdr:    #fed7d7;
        --lms-info:          #2563eb;
        --lms-info-bg:       #eff6ff;
        --lms-info-bdr:      #bfdbfe;
        --lms-warning:       #d97706;
        --lms-warning-bg:    #fffbeb;
        --lms-warning-bdr:   #fde68a;
        --lms-violet:        #7c3aed;
        --lms-violet-bg:     #f5f3ff;
        --lms-violet-bdr:    #ddd6fe;
        --lms-teal:          #0d9488;
        --lms-radius-sm:     8px;
        --lms-radius-md:     10px;
        --lms-radius-lg:     14px;
        --lms-font:          'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        --lms-shadow-sm:     0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
        --lms-shadow-md:     0 4px 14px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04);
      }

      .dbq-root { font-family: var(--lms-font) !important; }
      .dbq-root .font-mono { font-family: ui-monospace, monospace; }

      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: var(--lms-border); border-radius: 4px; }

      .lms-breadcrumb-sep { color: var(--lms-orange); margin: 0 3px; font-weight: 700; font-size: 13px; font-family: var(--lms-font); }
      .lms-crumb {
        position: relative; font-family: var(--lms-font);
        font-size: 12.5px; font-weight: 600; cursor: default;
      }
      .lms-crumb[data-tip]:hover::before {
        content: attr(data-tip);
        position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%);
        background: #1a1a2e; color: #ffffff !important;
        font-family: var(--lms-font); font-size: 10px; font-weight: 700;
        white-space: nowrap; padding: 4px 9px; border-radius: 5px;
        pointer-events: none; z-index: 9999;
        letter-spacing: 0.04em; box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      }
      .lms-crumb[data-tip]:hover::after {
        content: '';
        position: absolute; top: calc(100% + 2px); left: 50%; transform: translateX(-50%);
        border: 5px solid transparent; border-bottom-color: #1a1a2e;
        pointer-events: none; z-index: 9999;
      }

      .lms-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 14px; border-radius: var(--lms-radius-md);
        font-family: var(--lms-font); font-size: 12.5px; font-weight: 600;
        border: 1.5px solid; cursor: pointer; transition: all 0.15s;
        white-space: nowrap;
      }
      .lms-btn-orange {
        background: var(--lms-orange); color: white; border-color: transparent;
        box-shadow: 0 2px 8px var(--lms-orange-glow);
      }
      .lms-btn-orange:hover:not(:disabled) {
        background: var(--lms-orange-dark);
        box-shadow: 0 3px 12px rgba(242,119,87,0.35); transform: translateY(-1px);
      }
      .lms-btn-orange:disabled { opacity: 0.55; cursor: not-allowed; }
      .lms-btn-ghost-violet {
        background: var(--lms-bg-white); color: var(--lms-violet);
        border-color: var(--lms-violet-bdr);
      }
      .lms-btn-ghost-violet:hover { background: var(--lms-violet-bg); }
      .lms-btn-slate {
        background: var(--lms-bg-white); color: var(--lms-text-sec);
        border-color: var(--lms-border);
      }
      .lms-btn-slate:hover { background: var(--lms-bg-surface2); }

      .lms-icon-btn {
        width: 32px; height: 32px; border: 1.5px solid; border-radius: var(--lms-radius-sm);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.15s; background: none; flex-shrink: 0;
      }
      .lms-icon-btn-red { border-color: var(--lms-danger-bdr); background: var(--lms-danger-bg); color: var(--lms-danger); }
      .lms-icon-btn-red:hover { background: #fed7d7; }

      .lms-header-logo-mark {
        width: 34px; height: 34px; background: var(--lms-orange);
        border-radius: 9px; display: flex; align-items: center;
        justify-content: center; flex-shrink: 0;
        box-shadow: 0 3px 10px var(--lms-orange-glow);
      }

      .lms-badge {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 10px; border-radius: 20px;
        font-size: 11.5px; font-weight: 600; border: 1.5px solid;
        font-family: var(--lms-font);
      }
      .lms-badge-amber { background: var(--lms-warning-bg); color: var(--lms-warning); border-color: var(--lms-warning-bdr); }
      .lms-badge-violet { background: var(--lms-violet-bg); color: var(--lms-violet); border-color: var(--lms-violet-bdr); }
      .lms-badge-green { background: var(--lms-success-bg); color: var(--lms-success); border-color: var(--lms-success-bdr); }
      .lms-badge-orange { background: var(--lms-orange-50); color: #c85a30; border-color: var(--lms-orange-100); }
      .lms-badge-indigo { background: var(--lms-info-bg); color: var(--lms-info); border-color: var(--lms-info-bdr); }

      .lms-progress-bar { height: 6px; background: var(--lms-bg-surface2); border-radius: 3px; overflow: hidden; margin-top: 8px; }
      .lms-progress-fill { height: 100%; border-radius: 3px; background: var(--lms-orange); transition: width 0.4s; }

      .lms-sidebar-section-title {
        display: flex; align-items: center; gap: 7px;
        font-size: 12px; font-weight: 700; color: var(--lms-text-main);
        margin-bottom: 10px; font-family: var(--lms-font);
      }
      .lms-marks-row {
        display: flex; align-items: center; justify-content: space-between; padding: 3.5px 0;
      }
      .lms-marks-label { font-size: 12px; font-weight: 600; color: var(--lms-text-sec); font-family: var(--lms-font); }
      .lms-marks-value { font-size: 12.5px; font-weight: 700; font-family: var(--lms-font); }
      .lms-detail-row {
        display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; padding: 3px 0;
      }
      .lms-detail-label {
        font-size: 12px; font-weight: 600; color: var(--lms-text-sec);
        text-transform: none; letter-spacing: 0.01em; font-family: var(--lms-font);
      }
      .lms-detail-value {
        font-size: 12px; font-weight: 700; color: var(--lms-text-main); font-family: var(--lms-font);
      }

      .lms-modal-backdrop {
        position: fixed; inset: 0; z-index: 200;
        background: rgba(26,26,46,0.45); backdrop-filter: blur(3px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .lms-modal {
        background: var(--lms-bg-white); border-radius: var(--lms-radius-lg);
        box-shadow: 0 20px 60px rgba(0,0,0,0.18); max-width: 420px; width: 100%;
        border: 1.5px solid var(--lms-border); overflow: hidden;
      }
      .lms-modal-header {
        display: flex; align-items: center; gap: 10px;
        padding: 14px 18px; border-bottom: 1.5px solid var(--lms-border);
      }
      .lms-modal-icon {
        width: 32px; height: 32px; border-radius: var(--lms-radius-sm);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .lms-modal-body { padding: 16px 18px; }

      .lms-section-label {
        font-size: 10.5px; font-weight: 700; color: var(--lms-text-main);
        text-transform: uppercase; letter-spacing: 0.07em;
        font-family: var(--lms-font); margin-bottom: 8px;
      }
      .lms-section-label.lms-label-err { color: var(--lms-danger) !important; }

      .lms-sidebar-scroll { scrollbar-width: thin; scrollbar-color: #8e8ea0 var(--lms-bg-surface2); }
      .lms-sidebar-scroll::-webkit-scrollbar { width: 6px; }
      .lms-sidebar-scroll::-webkit-scrollbar-track { background: var(--lms-bg-surface2); border-radius: 3px; }
      .lms-sidebar-scroll::-webkit-scrollbar-thumb { background: #8e8ea0; border-radius: 3px; }
      .lms-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #6b6b7e; }

      .lms-cancel-btn {
        padding: 8px 16px; border-radius: var(--lms-radius-md);
        border: 1.5px solid var(--lms-border); background: var(--lms-bg-white);
        color: var(--lms-text-sec); font-family: var(--lms-font);
        font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.15s;
      }
      .lms-cancel-btn:hover { background: var(--lms-bg-surface2); }

      .lms-nav-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 7px 14px; border-radius: var(--lms-radius-md);
        font-family: var(--lms-font); font-size: 12.5px; font-weight: 600;
        border: 1.5px solid var(--lms-border); background: var(--lms-bg-white);
        color: var(--lms-text-sec); cursor: pointer; transition: all 0.15s;
      }
      .lms-nav-btn:hover:not(:disabled) { background: var(--lms-bg-surface); border-color: var(--lms-border-hover); }
      .lms-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

      .lms-input {
        width: 100%; padding: 9px 12px; font-size: 13.5px;
        border-radius: var(--lms-radius-md); border: 1.5px solid var(--lms-border);
        background: var(--lms-bg-white); color: var(--lms-text-main);
        font-family: var(--lms-font); outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .lms-input:focus { border-color: var(--lms-orange); box-shadow: 0 0 0 3px var(--lms-orange-light); }
      .lms-input::placeholder { color: var(--lms-text-hint); font-weight: 400; }
      .lms-input:disabled { background: var(--lms-bg-surface); color: var(--lms-text-muted); cursor: not-allowed; }
      .lms-input.err { border-color: var(--lms-danger); background: #fff5f5; }

      .lms-textarea {
        width: 100%; padding: 9px 12px; font-size: 13.5px;
        border-radius: var(--lms-radius-md); border: 1.5px solid var(--lms-border);
        background: var(--lms-bg-white); color: var(--lms-text-main);
        font-family: var(--lms-font); outline: none; resize: none;
        transition: border-color 0.15s, box-shadow 0.15s; line-height: 1.6;
      }
      .lms-textarea:focus { border-color: var(--lms-orange); box-shadow: 0 0 0 3px var(--lms-orange-light); }
      .lms-textarea::placeholder { color: var(--lms-text-hint); font-weight: 400; }
      .lms-textarea:disabled { background: var(--lms-bg-surface); color: var(--lms-text-muted); cursor: not-allowed; }
      .lms-textarea.err { border-color: var(--lms-danger); background: #fff5f5; }
      .lms-textarea.mono { font-family: ui-monospace, monospace; font-size: 12px; }

      .lms-fmt-btn {
        padding: 5px; border: none; background: none; cursor: pointer;
        color: var(--lms-text-muted); border-radius: 7px; transition: all 0.12s;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-family: var(--lms-font);
      }
      .lms-fmt-btn:hover { background: var(--lms-bg-surface2); color: var(--lms-text-main); }
      .lms-fmt-btn.active { background: var(--lms-orange-100); color: #c85a30; }

      [data-placeholder]:empty:before {
        content: attr(data-placeholder);
        color: var(--lms-text-hint, #aaa);
        pointer-events: none;
        font-weight: 400;
      }

      .dbq-run-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 16px; border-radius: var(--lms-radius-md);
        border: none; background: #16a34a; color: white;
        font-family: var(--lms-font); font-size: 12.5px; font-weight: 700;
        cursor: pointer; transition: all 0.15s;
        box-shadow: 0 2px 8px rgba(22,163,74,0.22);
      }
      .dbq-run-btn:hover:not(:disabled) { background: #15803d; transform: translateY(-1px); box-shadow: 0 3px 10px rgba(22,163,74,0.3); }
      .dbq-run-btn:disabled { background: #d4d4e2; box-shadow: none; cursor: not-allowed; }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  };
})();

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DatabaseQuestionFormProps {
  exerciseData: any;
  tabType: string;
  initialData?: any;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (questionData: any) => Promise<any>;
  onDeleteQuestion?: (questionId: string) => Promise<any>;
  isSaving: boolean;
  saveProgress: number;
  saveMessage: string;
  lockedDifficulty?: 'easy' | 'medium' | 'hard';
}

interface HintItem { hintText: string; pointsDeduction: number; isPublic: boolean; }
interface DBQuestion {
  __localId: string;
  _id?: string;
  title: string;
  description: any;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  sampleQuery: string;
  sampleResult: any;
  constraints: string[];
  hints: any[];
  questionType: string;
  isSaved: boolean;
  isDirty?: boolean;
  isPreExisting?: boolean;
}
type ProgContentBlock =
  | { id: string; type: 'text'; value: string }
  | { id: string; type: 'image'; url: string; alignment: 'left' | 'center' | 'right'; sizePercent: number }
  | { id: string; type: 'code'; value: string; language: string; bgColor: string };

const mkProgTextBlock = (id?: string): ProgContentBlock => ({
  id: id || `pb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: 'text', value: ''
});

const blocksToDescription = (blocks: ProgContentBlock[]): any => {
  const textParts = blocks.filter(b => b.type === 'text').map(b => (b as any).value).join('\n').trim();
  const imgBlock = blocks.find(b => b.type === 'image') as any;
  return {
    text: textParts,
    imageUrl: imgBlock?.url || null,
    imageAlignment: imgBlock?.alignment || 'left',
    imageSizePercent: imgBlock?.sizePercent || 100,
    contentBlocks: blocks,
  };
};

const descToBlocks = (description: any): ProgContentBlock[] => {
  if (!description) return [mkProgTextBlock()];
  if (description.contentBlocks && Array.isArray(description.contentBlocks) && description.contentBlocks.length > 0) {
    return description.contentBlocks.map((b: any) => ({
      ...b,
      id: b.id || `pb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      value: b.value || '',
    }));
  }
  if (typeof description === 'string') {
    return [{ id: `pb-${Date.now()}`, type: 'text', value: description }];
  }
  if (description.text) {
    return [{ id: `pb-${Date.now()}`, type: 'text', value: description.text }];
  }
  return [mkProgTextBlock()];
};

const DS: Record<string, { text: string; bg: string; border: string; dot: string; solid: any; pill: any }> = {
  easy: {
    text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a',
    solid: { background: '#16a34a', color: 'white' },
    pill: { background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0' },
  },
  medium: {
    text: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#d97706',
    solid: { background: '#d97706', color: 'white' },
    pill: { background: '#fffbeb', color: '#d97706', border: '1.5px solid #fde68a' },
  },
  hard: {
    text: '#e53e3e', bg: '#fff5f5', border: '#fed7d7', dot: '#e53e3e',
    solid: { background: '#e53e3e', color: 'white' },
    pill: { background: '#fff5f5', color: '#e53e3e', border: '1.5px solid #fed7d7' },
  },
};

const mkLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const dbQuestionToFlow = (q: any): DBQuestion => ({
  __localId: q._id ? `db-${q._id}` : mkLocalId(),
  _id: q._id,
  title: typeof q.title === 'string' ? q.title : '',
  description: q.description || { text: '' },
  difficulty: q.difficulty || 'medium',
  score: q.score || q.points || 0,
  sampleQuery: q.sampleQuery || '',
  sampleResult: q.sampleResult || [{ id: `sr-${Date.now()}`, type: 'text', value: '' }],
  constraints: q.constraints || [],
  hints: q.hints || [],
  questionType: 'database',
  isSaved: true,
  isDirty: false,
  isPreExisting: true,
});

// ─── SQL Result Table ──────────────────────────────────────────────────────────
const SqlResultTable: React.FC<{ rows: Record<string, any>[]; columns: string[] }> = ({ rows, columns }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>
      <thead>
        <tr style={{ background: '#1e3a5f' }}>
          {columns.map(col => (
            <th key={col} style={{ padding: '5px 10px', textAlign: 'left', color: '#93c5fd', fontWeight: 700, borderRight: '1px solid #1e40af', whiteSpace: 'nowrap' }}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? '#0f172a' : '#111827', borderBottom: '1px solid #1e3a5f' }}>
            {columns.map(col => (
              <td key={col} style={{ padding: '4px 10px', color: '#e2e8f0', borderRight: '1px solid #1e3a5f', whiteSpace: 'nowrap' }}>
                {row[col] === null ? <span style={{ color: '#64748b', fontStyle: 'italic' }}>NULL</span> : String(row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Image Upload Modal ────────────────────────────────────────────────────────
const ProgImageUploadModal: React.FC<{
  onUpload: (url: string) => void;
  onClose: () => void;
}> = ({ onUpload, onClose }) => {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [urlError, setUrlError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    setUploading(true); setError('');
    try {
      const token = localStorage.getItem('smartcliff_token');
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('https://lms-server-ym1q.onrender.com/upload/question-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Upload failed');
      onUpload(json.url);
    } catch (e: any) {
      setError(e.message || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  const handleInsertUrl = () => {
    const trimmed = urlValue.trim();
    if (!trimmed) { setUrlError('Please enter an image URL.'); return; }
    if (!/^https?:\/\/.+/i.test(trimmed)) { setUrlError('URL must start with http:// or https://'); return; }
    setUrlError('');
    onUpload(trimmed);
  };

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--lms-font)', fontSize: 13, fontWeight: active ? 700 : 500,
    color: active ? 'var(--lms-orange)' : 'var(--lms-text-sec)',
    borderBottom: active ? '2px solid var(--lms-orange)' : '2px solid transparent',
    paddingBottom: 10, paddingTop: 10, paddingLeft: 4, paddingRight: 4,
    background: 'none', cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(26,26,46,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        style={{ border: '1px solid var(--lms-border)' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <span className="text-sm font-bold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>Insert Image</span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" style={{ color: 'var(--lms-text-muted)' }} />
          </button>
        </div>
        <div className="flex items-center gap-5 px-5 border-b" style={{ borderColor: 'var(--lms-border)' }}>
          <button type="button" style={TAB_STYLE(tab === 'upload')} onClick={() => { setTab('upload'); setError(''); }}>Upload</button>
          <button type="button" style={TAB_STYLE(tab === 'url')} onClick={() => { setTab('url'); setUrlError(''); }}>By URL</button>
        </div>
        <div className="p-5">
          {tab === 'upload' ? (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className="flex flex-col items-center justify-center gap-3 rounded-xl py-9 transition-all"
                style={{ border: `2px dashed ${dragging ? 'var(--lms-orange)' : 'var(--lms-border)'}`, background: dragging ? 'var(--lms-orange-light)' : 'var(--lms-bg-surface)' }}>
                {uploading ? (
                  <>
                    <Loader className="h-8 w-8 animate-spin" style={{ color: 'var(--lms-orange)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)' }}>Uploading…</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-8 w-8" style={{ color: dragging ? 'var(--lms-orange)' : 'var(--lms-text-hint)' }} />
                    <div className="text-center">
                      <p className="text-sm font-semibold" style={{ color: 'var(--lms-text-main)', fontFamily: 'var(--lms-font)' }}>Drag & drop image here</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--lms-text-hint)', fontFamily: 'var(--lms-font)' }}>PNG, JPG, GIF, WEBP supported</p>
                    </div>
                    <div className="flex items-center gap-2 w-full px-4">
                      <div className="flex-1 h-px" style={{ background: 'var(--lms-border)' }} />
                      <span className="text-xs" style={{ color: 'var(--lms-text-hint)', fontFamily: 'var(--lms-font)' }}>or</span>
                      <div className="flex-1 h-px" style={{ background: 'var(--lms-border)' }} />
                    </div>
                    <button type="button" onClick={() => inputRef.current?.click()}
                      className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: 'var(--lms-orange)', color: '#fff', fontFamily: 'var(--lms-font)' }}>
                      Browse Files
                    </button>
                    <input ref={inputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ''; }} />
                  </>
                )}
              </div>
              {error && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{error}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>
                Only use images that you have the license to use.
              </p>
              <div className="flex gap-2">
                <input type="text" value={urlValue}
                  onChange={e => { setUrlValue(e.target.value); if (urlError) setUrlError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleInsertUrl(); }}
                  placeholder="Paste URL of image..."
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none transition-all"
                  style={{ borderColor: urlError ? 'var(--lms-danger)' : 'var(--lms-border)', fontFamily: 'var(--lms-font)', color: 'var(--lms-text-main)' }}
                />
              </div>
              {urlError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{urlError}
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button type="button" onClick={handleInsertUrl}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: urlValue.trim() ? 'var(--lms-orange)' : 'var(--lms-border)', color: urlValue.trim() ? '#fff' : 'var(--lms-text-hint)', fontFamily: 'var(--lms-font)', cursor: urlValue.trim() ? 'pointer' : 'default' }}>
                  Insert Image
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Image Block Component ─────────────────────────────────────────────────────
const ProgImageBlock: React.FC<{
  block: ProgContentBlock & { type: 'image' };
  onUpdate: (patch: Partial<ProgContentBlock>) => void;
  onRemove: () => void;
  disabled?: boolean;
}> = ({ block, onUpdate, onRemove, disabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [liveSize, setLiveSize] = useState(block.sizePercent || 60);
  const startX = useRef(0);
  const startSize = useRef(0);
  const side = useRef<'left' | 'right'>('right');

  useEffect(() => { setLiveSize(block.sizePercent || 60); }, [block.sizePercent]);

  const onMouseDown = (e: React.MouseEvent, s: 'left' | 'right') => {
    if (disabled) return;
    e.preventDefault(); e.stopPropagation();
    startX.current = e.clientX;
    startSize.current = liveSize;
    side.current = s;
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      const parentW = containerRef.current?.parentElement?.clientWidth || 600;
      const dx = ev.clientX - startX.current;
      const delta = (dx / parentW) * 100;
      const newSize = Math.min(100, Math.max(10,
        side.current === 'right' ? startSize.current + delta : startSize.current - delta
      ));
      setLiveSize(Math.round(newSize));
    };
    const onUp = () => {
      onUpdate({ sizePercent: liveSize } as any);
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const justify = block.alignment === 'left' ? 'flex-start' : block.alignment === 'right' ? 'flex-end' : 'center';

  const DiagArrow = ({ rotate }: { rotate: number }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: `rotate(${rotate}deg)`, display: 'block', pointerEvents: 'none' }}>
      <line x1="1" y1="9" x2="9" y2="1" stroke="var(--lms-orange)" strokeWidth="1.8" strokeLinecap="round" />
      <polyline points="5,1 9,1 9,5" fill="none" stroke="var(--lms-orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="5,9 1,9 1,5" fill="none" stroke="var(--lms-orange)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const cornerBase: React.CSSProperties = {
    position: 'absolute', width: 16, height: 16, background: 'white',
    border: '1.5px solid var(--lms-orange)', borderRadius: 3, zIndex: 10,
    userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: (hovered || dragging) && !disabled ? 1 : 0,
    transition: 'opacity 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  };

  return (
    <div style={{ display: 'flex', justifyContent: justify, position: 'relative', margin: '4px 0' }}
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <div style={{ width: `${liveSize}%`, position: 'relative', transition: dragging ? 'none' : 'width 0.1s', minWidth: 60 }}>
        <img src={block.url} alt="" draggable={false}
          style={{ width: '100%', height: 'auto', borderRadius: 8, border: `1.5px solid ${dragging ? 'var(--lms-orange)' : 'var(--lms-border)'}`, display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
        {!disabled && <>
          <div style={{ ...cornerBase, top: -7, left: -7, cursor: 'nwse-resize' }} onMouseDown={e => onMouseDown(e, 'left')}><DiagArrow rotate={0} /></div>
          <div style={{ ...cornerBase, top: -7, right: -7, cursor: 'nesw-resize' }} onMouseDown={e => onMouseDown(e, 'right')}><DiagArrow rotate={90} /></div>
          <div style={{ ...cornerBase, bottom: -7, left: -7, cursor: 'nesw-resize' }} onMouseDown={e => onMouseDown(e, 'left')}><DiagArrow rotate={90} /></div>
          <div style={{ ...cornerBase, bottom: -7, right: -7, cursor: 'nwse-resize' }} onMouseDown={e => onMouseDown(e, 'right')}><DiagArrow rotate={0} /></div>
        </>}
        {dragging && (
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.65)', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, fontFamily: 'var(--lms-font)', pointerEvents: 'none', zIndex: 20 }}>
            {liveSize}%
          </div>
        )}
        {!disabled && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, zIndex: 20, opacity: (hovered || dragging) ? 1 : 0, transition: 'opacity 0.15s' }}>
            {(['left', 'center', 'right'] as const).map(a => (
              <button key={a} type="button" onClick={() => onUpdate({ alignment: a } as any)}
                style={{ width: 22, height: 22, borderRadius: 5, border: '1.5px solid', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--lms-font)', background: block.alignment === a ? 'var(--lms-orange)' : 'white', borderColor: block.alignment === a ? 'var(--lms-orange)' : 'var(--lms-border)', color: block.alignment === a ? 'white' : 'var(--lms-text-muted)' }}>
                {a[0].toUpperCase()}
              </button>
            ))}
            <button type="button" onClick={onRemove}
              style={{ width: 22, height: 22, borderRadius: 5, border: '1.5px solid var(--lms-danger-bdr)', background: 'var(--lms-danger-bg)', color: 'var(--lms-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Code Block Component ──────────────────────────────────────────────────────
const PROG_CODE_THEMES = [
  { label: 'Light', bg: '#f5f5f5' }, { label: 'Dark', bg: '#1e1e1e' },
  { label: 'Dracula', bg: '#282a36' }, { label: 'Monokai', bg: '#272822' },
];

const highlightAutoP = (code: string, bgColor: string): string => {
  const dark = ['#1e1e1e', '#282a36', '#272822', '#2e3440'].includes(bgColor);
  const kwC = dark ? '#569cd6' : '#0000ff';
  const strC = dark ? '#ce9178' : '#a31515';
  const cmtC = '#6a9955';
  const numC = dark ? '#b5cea8' : '#098658';
  const kw = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'DATABASE'];
  return code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(--.*$)/gm, `<span style="color:${cmtC}">$1</span>`)
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, `<span style="color:${strC}">$1</span>`)
    .replace(/\b(\d+\.?\d*)\b/g, `<span style="color:${numC}">$1</span>`)
    .replace(new RegExp(`\\b(${kw.join('|')})\\b`, 'gi'), `<span style="color:${kwC};font-weight:600">$1</span>`);
};

const ProgCodeBlock: React.FC<{
  block: ProgContentBlock & { type: 'code' };
  onUpdate: (patch: Partial<ProgContentBlock>) => void;
  onRemove: () => void;
  disabled?: boolean;
}> = ({ block, onUpdate, onRemove, disabled }) => {
  const [editing, setEditing] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedWidth = (block as any).width;
  const savedHeight = (block as any).height;
  const [liveWidth, setLiveWidth] = useState<number | undefined>(savedWidth);
  const [liveHeight, setLiveHeight] = useState<number | undefined>(savedHeight);
  const bg = block.bgColor || '#f5f5f5';
  const isDark = ['#1e1e1e', '#282a36', '#272822', '#2e3440'].includes(bg);
  const textColor = isDark ? '#d4d4d4' : '#1a1a2e';

  return (
    <div className="relative my-2 group/code" style={{
      borderRadius: 8, border: `1.5px solid ${isDark ? '#3a3a3a' : '#e2e2e2'}`,
      background: bg, overflow: 'visible', display: 'inline-block',
      width: liveWidth ? `${liveWidth}px` : 'fit-content', minWidth: 200,
      position: 'relative',
    }}>
      {!disabled && (
        <button type="button" onClick={onRemove} style={{
          position: 'absolute', top: 7, right: 10, zIndex: 10,
          background: isDark ? '#ffffff' : '#eb0303',
          border: `1px solid ${isDark ? '#444' : '#d0d0d0'}`,
          borderRadius: 6, padding: '3px 6px', fontSize: 10,
          color: isDark ? '#000000' : '#ffffff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', opacity: 0, transition: 'opacity 0.15s',
        }} className="group-hover/code:!opacity-100">
          <X size={10} />
        </button>
      )}
      {editing && !disabled ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <textarea
            ref={textareaRef}
            value={block.value}
            onChange={e => onUpdate({ value: e.target.value } as any)}
            onMouseMove={() => {
              if (textareaRef.current) {
                setLiveWidth(textareaRef.current.offsetWidth);
                setLiveHeight(textareaRef.current.offsetHeight);
              }
            }}
            onBlur={() => {
              if (textareaRef.current) {
                onUpdate({ width: textareaRef.current.offsetWidth, height: textareaRef.current.offsetHeight } as any);
              }
              setEditing(false);
            }}
            placeholder="-- Write your SQL query here..."
            spellCheck={false}
            autoFocus
            style={{
              display: 'block', width: liveWidth ? `${liveWidth}px` : '400px',
              height: liveHeight ? `${liveHeight}px` : '120px', minWidth: 200,
              background: 'transparent', border: 'none', outline: 'none',
              padding: '10px 14px', fontSize: 13, lineHeight: 1.7,
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              color: textColor, resize: 'both', overflow: 'auto',
              boxSizing: 'border-box', whiteSpace: 'pre', minHeight: 42,
            }}
          />
          <div style={{
            position: 'absolute', bottom: 4, right: 4, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: 4,
            background: 'var(--lms-orange)', opacity: 0.85, zIndex: 10,
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M9 1L1 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 5L5 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 9H5V5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </div>
      ) : (
        <pre onClick={() => { if (!disabled) setEditing(true); }} style={{
          margin: 0, padding: '10px 14px', fontSize: 13, lineHeight: 1.7,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace', color: textColor,
          whiteSpace: 'pre', cursor: disabled ? 'default' : 'text', display: 'block',
          width: savedWidth ? `${savedWidth}px` : '100%',
          height: savedHeight ? `${savedHeight}px` : undefined, minWidth: 200,
          background: 'transparent', overflowX: 'auto',
        }} dangerouslySetInnerHTML={{ __html: highlightAutoP(block.value || '', bg) }} />
      )}
      {!disabled && (
        <div className="group-hover/code:!opacity-100" style={{
          opacity: 0, transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderTop: `1px solid ${isDark ? '#3a3a3a' : '#e2e2e2'}`,
          background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa',
        }}>
          {PROG_CODE_THEMES.map(theme => (
            <button key={theme.label} type="button" title={theme.label}
              onClick={() => onUpdate({ bgColor: theme.bg } as any)}
              style={{
                width: 14, height: 14, borderRadius: '50%', background: theme.bg,
                border: bg === theme.bg ? '2px solid var(--lms-orange)' : `2px solid ${isDark ? '#555' : '#d0d0d0'}`,
                cursor: 'pointer', flexShrink: 0, transition: 'transform 0.1s',
              }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
          ))}
          <div style={{ width: 1, height: 12, background: isDark ? '#444' : '#e0e0e0', margin: '0 2px' }} />
          <input type="text" value={block.language || ''} onChange={e => onUpdate({ language: e.target.value } as any)}
            style={{ fontSize: 10, fontFamily: 'monospace', color: isDark ? '#888' : '#999', background: 'transparent', border: 'none', outline: 'none', width: 70 }} />
        </div>
      )}
    </div>
  );
};

// ─── Description Editor ────────────────────────────────────────────────────────
const ProgDescEditor: React.FC<{
  blocks: ProgContentBlock[];
  onChange: (blocks: ProgContentBlock[]) => void;
  disabled?: boolean;
  hasError?: boolean;
}> = ({ blocks, onChange, disabled, hasError }) => {
  const mkId = () => `pb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const [showImgModal, setShowImgModal] = useState(false);
  const [fmtState, setFmtState] = useState({ bold: false, italic: false, underline: false });
  const editRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastSetValues = useRef<Map<string, string>>(new Map());

  const updateBlock = (id: string, patch: Partial<ProgContentBlock>) => {
    onChange(blocks.map(b => b.id === id ? ({ ...b, ...patch } as ProgContentBlock) : b));
  };
  const removeBlock = (id: string) => {
    const next = blocks.filter(b => b.id !== id);
    onChange(next.length > 0 ? next : [{ id: mkId(), type: 'text', value: '' }]);
  };

  useEffect(() => {
    blocks.forEach(b => {
      if (b.type !== 'text') return;
      const el = editRefs.current.get(b.id);
      if (!el) return;
      const html = (b as any).value || '';
      if (lastSetValues.current.get(b.id) === html) return;
      el.innerHTML = html;
      lastSetValues.current.set(b.id, html);
    });
  });

  const trackFmt = () => {
    setFmtState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  };

  const applyFmt = (cmd: string) => {
    document.execCommand(cmd);
    trackFmt();
    const focused = document.activeElement as HTMLDivElement;
    if (focused) {
      const entry = [...editRefs.current.entries()].find(([, el]) => el === focused);
      if (entry) {
        const [id] = entry;
        const html = focused.innerHTML;
        lastSetValues.current.set(id, html);
        updateBlock(id, { value: html } as any);
      }
    }
  };

  const hasImage = blocks.some(b => b.type === 'image');

  return (
    <div>
      {!disabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 0 6px' }}>
          <button type="button" className="lms-fmt-btn" title="Bold"
            onMouseDown={e => { e.preventDefault(); applyFmt('bold'); }}
            style={{ fontWeight: 700, color: fmtState.bold ? 'var(--lms-orange)' : undefined, background: fmtState.bold ? 'rgba(255,107,53,0.08)' : undefined }}>B</button>
          <button type="button" className="lms-fmt-btn" title="Italic"
            onMouseDown={e => { e.preventDefault(); applyFmt('italic'); }}
            style={{ fontStyle: 'italic', color: fmtState.italic ? 'var(--lms-orange)' : undefined, background: fmtState.italic ? 'rgba(255,107,53,0.08)' : undefined }}>I</button>
          <button type="button" className="lms-fmt-btn" title="Underline"
            onMouseDown={e => { e.preventDefault(); applyFmt('underline'); }}
            style={{ textDecoration: 'underline', color: fmtState.underline ? 'var(--lms-orange)' : undefined, background: fmtState.underline ? 'rgba(255,107,53,0.08)' : undefined }}>U</button>
          <div style={{ width: 1, height: 16, background: 'var(--lms-border)', margin: '0 2px' }} />
          <button type="button" className="lms-fmt-btn" title="Insert code block"
            onClick={() => onChange([...blocks, { id: mkId(), type: 'code', value: '', language: 'sql', bgColor: '#1e1e1e' }])}>
            <Code size={13} />
          </button>
          <button type="button" className="lms-fmt-btn" title={hasImage ? 'Remove existing image first' : 'Insert image'}
            disabled={hasImage} style={{ opacity: hasImage ? 0.4 : 1, cursor: hasImage ? 'not-allowed' : 'pointer' }}
            onClick={() => { if (!hasImage) setShowImgModal(true); }}>
            <Image size={13} />
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {blocks.map((b) => {
          if (b.type === 'text') return (
            <div key={b.id}
              ref={el => { if (el) { editRefs.current.set(b.id, el); lastSetValues.current.delete(b.id); } else { editRefs.current.delete(b.id); } }}
              contentEditable={!disabled} suppressContentEditableWarning
              data-placeholder="Describe the database problem clearly. Include table schemas, sample data, and expected query results."
              onInput={e => {
                const html = (e.currentTarget as HTMLDivElement).innerHTML;
                lastSetValues.current.set(b.id, html);
                updateBlock(b.id, { value: html } as any);
              }} onKeyUp={trackFmt} onMouseUp={trackFmt}
              style={{
                fontFamily: 'var(--lms-font)', fontSize: 15, fontWeight: 500, lineHeight: 1.65,
                color: hasError ? 'var(--lms-danger)' : 'var(--lms-text-main)', background: 'transparent',
                border: 'none', borderBottom: `2px solid ${hasError ? 'var(--lms-danger)' : disabled ? 'var(--lms-border)' : 'var(--lms-orange)'}`,
                borderRadius: 0, outline: 'none', width: '100%', padding: '4px 0 6px',
                minHeight: 80, cursor: disabled ? 'not-allowed' : 'text',
                boxSizing: 'border-box', wordBreak: 'break-word',
              }}
            />
          );
          if (b.type === 'image') return (
            <ProgImageBlock key={b.id} block={b as any} onUpdate={patch => updateBlock(b.id, patch)} onRemove={() => removeBlock(b.id)} disabled={disabled} />
          );
          if (b.type === 'code') return (
            <ProgCodeBlock key={b.id} block={b as any} onUpdate={patch => updateBlock(b.id, patch)} onRemove={() => removeBlock(b.id)} disabled={disabled} />
          );
          return null;
        })}
      </div>
      {showImgModal && (
        <ProgImageUploadModal onUpload={url => {
          onChange([...blocks, { id: mkId(), type: 'image', url, alignment: 'center', sizePercent: 70 }]);
          setShowImgModal(false);
        }} onClose={() => setShowImgModal(false)} />
      )}
    </div>
  );
};

// ─── Preview Modal ─────────────────────────────────────────────────────────────
const PreviewModal: React.FC<{
  questions: DBQuestion[];
  currentIndex: number;
  onJump: (idx: number) => void;
  onDelete: (localId: string) => void;
  onClose: () => void;
  onDone: () => void;
  hierarchyData: any;
  tabType: string;
  exerciseName: string;
  currentDiff: 'easy' | 'medium' | 'hard';
  totalSlots: number;
  createdCount: number;
  remainingSlots: number;
  totalSlotsAll: number;
  createdCountAll: number;
  remainingSlotsAll: number;
  totalMarksAll: number;
  usedMarksAll: number;
  displayScore: number;
  isGeneral: boolean;
  cfgType: string;
  exerciseData: any;
  isScoreEditable: (d: 'easy' | 'medium' | 'hard') => boolean;
  getConfiguredDiffs: () => Array<'easy' | 'medium' | 'hard'>;
  getTotalMarksForDiff: (d: 'easy' | 'medium' | 'hard') => number;
  usedMarks: number;
  remainingMarks: number;
  totalMarksForDiff: number;
}> = ({
  questions, currentIndex, onJump, onDelete, onClose, onDone,
  hierarchyData, tabType, exerciseName, currentDiff, totalSlots, createdCount, remainingSlots,
  totalSlotsAll, createdCountAll, remainingSlotsAll, totalMarksAll, usedMarksAll, displayScore,
  isGeneral, cfgType, exerciseData, isScoreEditable, getConfiguredDiffs,
  getTotalMarksForDiff, usedMarks, remainingMarks, totalMarksForDiff,
}) => {
  const [previewIndex, setPreviewIndex] = useState(currentIndex);
  const [deleteTarget, setDeleteTarget] = useState<{ localId: string; title: string } | null>(null);
  const s = DS[currentDiff] || DS.medium;

  const q = questions[previewIndex];
  const fmtMark = (n: number): string => parseFloat(n.toFixed(2)).toString();

  const descBlocksArray = q ? (Array.isArray(q.description) ? q.description : descToBlocks(q.description)) : [];
  const srBlocksArray = q ? (Array.isArray(q.sampleResult) ? q.sampleResult : descToBlocks(q.sampleResult)) : [];
  const ds = q ? (DS[q.difficulty] || DS.medium) : DS.medium;

  const renderBlock = (b: any, bi: number) => {
    if (b.type === 'text' && b.value?.trim())
      return <p key={bi} style={{ fontFamily: 'var(--lms-font)', fontSize: 13, fontWeight: 400, color: 'var(--lms-text-main)', margin: 0, lineHeight: 1.75, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: b.value }} />;
    if (b.type === 'image')
      return (
        <div key={bi} style={{ display: 'flex', justifyContent: b.alignment === 'right' ? 'flex-end' : b.alignment === 'center' ? 'center' : 'flex-start' }}>
          <img src={b.url} alt="" style={{ width: `${b.sizePercent || 70}%`, maxWidth: '100%', borderRadius: 8, border: '1px solid var(--lms-border)' }} />
        </div>
      );
    if (b.type === 'code') {
      const isDk = ['#1e1e1e', '#282a36', '#272822'].includes(b.bgColor);
      return <pre key={bi} style={{ background: b.bgColor || '#f5f5f5', color: isDk ? '#d4d4d4' : '#1a1a2e', fontFamily: 'ui-monospace,monospace', fontSize: 12, padding: '12px 16px', borderRadius: 8, margin: 0, overflowX: 'auto', lineHeight: 1.6 }}>{b.value}</pre>;
    }
    return null;
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,46,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 12 }}>
        <div style={{ width: '96vw', maxWidth: 1400, height: '96vh', display: 'flex', flexDirection: 'column', background: 'var(--lms-bg-white)', borderRadius: 'var(--lms-radius-lg)', border: '1.5px solid var(--lms-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-white)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--lms-violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Eye size={16} style={{ color: 'white' }} />
              </div>
              <div style={{ width: 1, height: 20, background: 'var(--lms-border)', flexShrink: 0 }} />
              <nav style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 0 }}>
                {hierarchyData.courseName && (<><span className="lms-crumb" data-tip="Course" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.courseName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {hierarchyData.moduleName && (<><span className="lms-crumb" data-tip="Module" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.moduleName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {hierarchyData.submoduleName && (<><span className="lms-crumb" data-tip="Sub-module" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.submoduleName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {hierarchyData.topicName && (<><span className="lms-crumb" data-tip="Topic" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.topicName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {hierarchyData.subtopicName && (<><span className="lms-crumb" data-tip="Sub-topic" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.subtopicName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {exerciseName && (<><span className="lms-crumb" data-tip="Exercise" style={{ color: 'var(--lms-text-main)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exerciseName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                <span className="lms-crumb" style={{ color: 'var(--lms-orange)' }}>Preview Database Questions</span>
              </nav>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
              <button onClick={onClose} style={{ padding: 8, borderRadius: 8, border: '1.5px solid var(--lms-danger-bdr)', background: 'var(--lms-danger-bg)', cursor: 'pointer' }}>
                <X size={15} style={{ color: 'var(--lms-danger)' }} />
              </button>
            </div>
          </div>

          {/* Preview banner + question navigator */}
          <div style={{ padding: '6px 20px', background: 'var(--lms-info-bg)', borderBottom: '1.5px solid var(--lms-info-bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={11} style={{ color: 'var(--lms-info)' }} />
              <span style={{ fontFamily: 'var(--lms-font)', fontSize: 10.5, fontWeight: 700, color: 'var(--lms-info)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Preview — Read Only</span>
            </div>

            {/* Question pills navigator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {questions.map((pq, i) => {
                const pds = DS[pq.difficulty] || DS.medium;
                const isActive = i === previewIndex;
                return (
                  <button key={pq.__localId} onClick={() => setPreviewIndex(i)}
                    style={{
                      width: 28, height: 28, borderRadius: 8, fontSize: 11, fontWeight: 800,
                      fontFamily: 'var(--lms-font)', cursor: 'pointer', transition: 'all 0.15s',
                      border: `2px solid ${isActive ? 'var(--lms-orange)' : pds.border}`,
                      background: isActive ? 'var(--lms-orange)' : pds.bg,
                      color: isActive ? 'white' : pds.text,
                      boxShadow: isActive ? '0 2px 8px var(--lms-orange-glow)' : 'none',
                    }}>{i + 1}</button>
                );
              })}
            </div>

            <span style={{ fontFamily: 'var(--lms-font)', fontSize: 11, fontWeight: 600, color: 'var(--lms-info)' }}>
              {questions.filter(q => q.isSaved).length} / {questions.length} saved
            </span>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* Main question view */}
            <div className="lms-sidebar-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {!q ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--lms-text-hint)' }}>
                  <Eye size={40} style={{ marginBottom: 12, opacity: 0.15 }} />
                  <p style={{ fontFamily: 'var(--lms-font)', fontSize: 14, fontWeight: 600 }}>No questions yet</p>
                </div>
              ) : (
                <>
                  {/* Question header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <span style={{
                        width: 36, height: 36, borderRadius: 10, fontSize: 14, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        fontFamily: 'var(--lms-font)', background: 'var(--lms-orange)', color: 'white',
                        boxShadow: '0 2px 8px var(--lms-orange-glow)',
                      }}>{previewIndex + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontFamily: 'var(--lms-font)', fontSize: 18, fontWeight: 700, color: 'var(--lms-text-main)', margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {q.title || 'Untitled Question'}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ ...ds.pill, fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' as const }}>{q.difficulty}</span>
                          <span style={{ fontFamily: 'var(--lms-font)', fontSize: 11.5, color: 'var(--lms-text-muted)' }}>{q.score} mark{q.score !== 1 ? 's' : ''}</span>
                          <span style={{ color: 'var(--lms-border)' }}>·</span>
                          <span style={{ fontFamily: 'var(--lms-font)', fontSize: 11.5, color: 'var(--lms-text-muted)' }}>Database</span>
                          {q.isSaved && !q.isDirty && (
                            <span style={{ fontFamily: 'var(--lms-font)', fontSize: 10.5, color: 'var(--lms-success)', fontWeight: 700 }}>✓ Saved</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Edit / Delete */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { onJump(previewIndex); onClose(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--lms-warning-bg)', color: 'var(--lms-warning)', fontSize: 11.5, fontWeight: 700, border: '1.5px solid var(--lms-warning-bdr)', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--lms-font)' }}>
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={() => setDeleteTarget({ localId: q.__localId, title: q.title })}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--lms-danger-bg)', color: 'var(--lms-danger)', fontSize: 11.5, fontWeight: 700, border: '1.5px solid var(--lms-danger-bdr)', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--lms-font)' }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="lms-section-label">Problem Description</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--lms-bg-surface)', padding: '14px 16px', borderRadius: 10, border: '1.5px solid var(--lms-border)' }}>
                      {descBlocksArray.map(renderBlock)}
                    </div>
                  </div>

                  {/* Sample Query */}
                  {q.sampleQuery && (
                    <div>
                      <p className="lms-section-label">Sample Query</p>
                      <pre style={{ background: '#1e1e1e', color: '#d4d4d4', fontFamily: 'ui-monospace,monospace', fontSize: 12.5, padding: '12px 16px', borderRadius: 10, overflowX: 'auto', margin: 0, lineHeight: 1.7 }}>{q.sampleQuery}</pre>
                    </div>
                  )}

                  {/* Expected Result */}
                  <div>
                    <p className="lms-section-label">Expected Result</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--lms-bg-surface)', padding: '14px 16px', borderRadius: 10, border: '1.5px solid var(--lms-border)' }}>
                      {srBlocksArray.map(renderBlock)}
                    </div>
                  </div>

                  {/* Constraints */}
                  {q.constraints?.filter(c => c?.trim()).length > 0 && (
                    <div>
                      <p className="lms-section-label">Constraints</p>
                      <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {q.constraints.filter(c => c?.trim()).map((c, ci) => (
                          <li key={ci} style={{ fontFamily: 'var(--lms-font)', fontSize: 13, color: 'var(--lms-text-main)', lineHeight: 1.6 }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Hints */}
                  {q.hints?.length > 0 && (
                    <div>
                      <p className="lms-section-label">Hints</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {q.hints.map((h: any, hi: number) => (
                          <div key={hi} style={{ padding: '8px 12px', background: 'var(--lms-warning-bg)', border: '1.5px solid var(--lms-warning-bdr)', borderRadius: 8 }}>
                            <span style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: 'var(--lms-warning)', fontWeight: 700 }}>Hint {hi + 1}: </span>
                            <span style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: 'var(--lms-text-main)' }}>{h.hintText}</span>
                            {h.pointsDeduction > 0 && <span style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-text-muted)', marginLeft: 8 }}>(-{h.pointsDeduction} pts)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ width: 272, flexShrink: 0, borderLeft: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-white)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div className="lms-sidebar-scroll" style={{ flex: 1, overflowY: 'auto' }}>

                {/* Exercise Details */}
                <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-info-bdr)', background: 'var(--lms-info-bg)' }}>
                  <div className="lms-sidebar-section-title"><FileText size={14} style={{ color: 'var(--lms-info)' }} />Exercise Details</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div className="lms-detail-row"><span className="lms-detail-label">Exercise Name</span><span className="lms-detail-value" style={{ color: 'var(--lms-orange)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exerciseName || 'Untitled'}</span></div>
                    <div className="lms-detail-row"><span className="lms-detail-label">Module Type</span><span className="lms-detail-value">Database</span></div>
                    <div className="lms-detail-row"><span className="lms-detail-label">Configuration</span><span className="lms-detail-value">{isGeneral ? 'General' : cfgType === 'levelBased' ? 'Level Based' : 'Selection Level'}</span></div>
                    {!isGeneral && (<div className="lms-detail-row"><span className="lms-detail-label">Current Difficulty</span><span className="lms-detail-value" style={{ color: s.text, textTransform: 'capitalize' }}>{currentDiff}</span></div>)}
                  </div>
                </div>

                {/* Question Quota */}
                <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-orange-100)', background: 'var(--lms-orange-50)' }}>
                  <div className="lms-sidebar-section-title"><Hash size={14} style={{ color: 'var(--lms-orange)' }} />Question Quota · {isGeneral ? '(General)' : `${currentDiff} Level`}</div>
                  <div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Total Questions</span><span className="lms-marks-value">{totalSlots}</span></div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Questions Created</span><span className="lms-marks-value" style={{ color: 'var(--lms-violet)' }}>{createdCount}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalSlots}</span></span></div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Remaining</span><span className="lms-marks-value" style={{ color: remainingSlots === 0 ? 'var(--lms-success)' : 'var(--lms-warning)' }}>{remainingSlots}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalSlots}</span></span></div>
                  </div>
                  {totalSlots > 0 && (<div className="lms-progress-bar"><div className="lms-progress-fill" style={{ width: `${Math.min(100, (createdCount / totalSlots) * 100)}%`, background: remainingSlots === 0 ? 'var(--lms-success)' : 'var(--lms-orange)' }} /></div>)}
                </div>

                {/* Question Overview — multi-diff only */}
                {(!isGeneral && getConfiguredDiffs().length > 1) && (
                  <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-surface)' }}>
                    <div className="lms-sidebar-section-title"><BarChart3 size={14} style={{ color: 'var(--lms-text-sec)' }} />Question Overview</div>
                    <div>
                      <div className="lms-marks-row"><span className="lms-marks-label">Total Questions</span><span className="lms-marks-value">{totalSlotsAll}</span></div>
                      <div className="lms-marks-row"><span className="lms-marks-label">Questions Created</span><span className="lms-marks-value" style={{ color: 'var(--lms-violet)' }}>{createdCountAll}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalSlotsAll}</span></span></div>
                      <div className="lms-marks-row"><span className="lms-marks-label">Remaining</span><span className="lms-marks-value" style={{ color: remainingSlotsAll === 0 ? 'var(--lms-success)' : 'var(--lms-warning)' }}>{remainingSlotsAll}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalSlotsAll}</span></span></div>
                    </div>
                    {totalSlotsAll > 0 && (<div className="lms-progress-bar"><div className="lms-progress-fill" style={{ width: `${Math.min(100, (createdCountAll / totalSlotsAll) * 100)}%`, background: remainingSlotsAll === 0 ? 'var(--lms-success)' : 'var(--lms-orange)' }} /></div>)}
                  </div>
                )}

                {/* Marks Allocation */}
                <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-orange-100)', background: 'var(--lms-orange-50)' }}>
                  <div className="lms-sidebar-section-title"><Award size={14} style={{ color: 'var(--lms-orange)' }} />Marks Allocation · {isGeneral ? '(General)' : `${currentDiff} Level`}</div>
                  <div>
                    {!isGeneral && totalMarksForDiff > 0 && (<div className="lms-marks-row"><span className="lms-marks-label">Level Total</span><span className="lms-marks-value">{totalMarksForDiff}</span></div>)}
                    <div className="lms-marks-row"><span className="lms-marks-label">Marks per Question</span><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="lms-marks-value" style={{ color: 'var(--lms-orange)' }}>{fmtMark(displayScore)}</span>{isScoreEditable(currentDiff) ? <span className="lms-badge lms-badge-violet" style={{ fontSize: '10px', padding: '2px 6px' }}>Custom</span> : <span className="lms-badge" style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--lms-bg-surface)', color: 'var(--lms-text-muted)', borderColor: 'var(--lms-border)' }}>Fixed</span>}</div></div>
                    {!isGeneral && totalMarksForDiff > 0 && (<>
                      <div className="lms-marks-row"><span className="lms-marks-label">Marks Used</span><span className="lms-marks-value" style={{ color: 'var(--lms-warning)' }}>{fmtMark(usedMarks)}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalMarksForDiff}</span></span></div>
                      <div className="lms-marks-row"><span className="lms-marks-label">Remaining</span><span className="lms-marks-value" style={{ color: remainingMarks <= 0 ? 'var(--lms-success)' : 'var(--lms-violet)' }}>{fmtMark(remainingMarks)}</span></div>
                    </>)}
                  </div>
                  {!isGeneral && totalMarksForDiff > 0 && (<div className="lms-progress-bar"><div className="lms-progress-fill" style={{ width: `${Math.min(100, (usedMarks / totalMarksForDiff) * 100)}%`, background: usedMarks >= totalMarksForDiff ? 'var(--lms-success)' : 'var(--lms-orange)' }} /></div>)}
                </div>

                {/* Marks Overview — multi-diff only */}
                {(!isGeneral && getConfiguredDiffs().length > 1) && (
                  <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-surface)' }}>
                    <div className="lms-sidebar-section-title"><Award size={14} style={{ color: 'var(--lms-text-sec)' }} />Marks Allocation Overview</div>
                    <div>
                      <div className="lms-marks-row"><span className="lms-marks-label">Total Marks</span><span className="lms-marks-value">{totalMarksAll}</span></div>
                      <div className="lms-marks-row"><span className="lms-marks-label">Marks Used</span><span className="lms-marks-value" style={{ color: 'var(--lms-warning)' }}>{fmtMark(usedMarksAll)}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalMarksAll}</span></span></div>
                      <div className="lms-marks-row"><span className="lms-marks-label">Remaining</span><span className="lms-marks-value" style={{ color: Math.max(0, totalMarksAll - usedMarksAll) === 0 ? 'var(--lms-success)' : 'var(--lms-violet)' }}>{fmtMark(Math.max(0, totalMarksAll - usedMarksAll))}</span></div>
                      {getConfiguredDiffs().map(d => (<div key={d} className="lms-marks-row"><span className="lms-marks-label" style={{ textTransform: 'capitalize' }}>{d}</span><span className="lms-marks-value" style={{ color: 'var(--lms-text-sec)', fontSize: '12px' }}>{getTotalMarksForDiff(d)}</span></div>))}
                    </div>
                    {totalMarksAll > 0 && (<div className="lms-progress-bar"><div className="lms-progress-fill" style={{ width: `${Math.min(100, (usedMarksAll / totalMarksAll) * 100)}%`, background: usedMarksAll >= totalMarksAll ? 'var(--lms-success)' : 'var(--lms-orange)' }} /></div>)}
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Footer with Prev / Next navigation */}
          <div style={{ padding: '12px 20px', borderTop: '1.5px solid var(--lms-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--lms-bg-white)' }}>

            {/* Left: prev */}
            <button className="lms-nav-btn" disabled={previewIndex <= 0}
              onClick={() => setPreviewIndex(i => Math.max(0, i - 1))}>
              <ChevronLeft size={13} /> Previous
            </button>

            {/* Center: counter + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: 'var(--lms-text-muted)' }}>
                Question <strong style={{ color: 'var(--lms-text-main)' }}>{previewIndex + 1}</strong> of <strong style={{ color: 'var(--lms-text-main)' }}>{questions.length}</strong>
              </span>
              <div style={{ width: 1, height: 16, background: 'var(--lms-border)' }} />
              <button onClick={onClose} className="lms-cancel-btn">Continue Editing</button>
              <button onClick={onDone} className="lms-btn lms-btn-orange"><Check size={13} /> Done</button>
            </div>

            {/* Right: next */}
            <button className="lms-nav-btn" disabled={previewIndex >= questions.length - 1}
              onClick={() => setPreviewIndex(i => Math.min(questions.length - 1, i + 1))}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div className="lms-modal-backdrop">
          <div className="lms-modal">
            <div className="lms-modal-header" style={{ background: 'var(--lms-danger-bg)', borderBottom: '1.5px solid var(--lms-danger-bdr)' }}>
              <div className="lms-modal-icon" style={{ background: 'var(--lms-danger-bg)', border: '1.5px solid var(--lms-danger-bdr)' }}><AlertTriangle size={16} style={{ color: 'var(--lms-danger)' }} /></div>
              <div><h2 style={{ fontFamily: 'var(--lms-font)', fontSize: 14, fontWeight: 700, color: 'var(--lms-text-main)' }}>Delete Question?</h2><p style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-text-muted)', marginTop: 2 }}>This action cannot be undone</p></div>
            </div>
            <div className="lms-modal-body">
              <p style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: 'var(--lms-text-sec)', lineHeight: 1.6, marginBottom: 4 }}>Are you sure you want to delete <strong style={{ color: 'var(--lms-text-main)' }}>"{deleteTarget.title || 'this question'}"</strong>?</p>
              <p style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-danger)', fontWeight: 600 }}>This will permanently remove it.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setDeleteTarget(null)} className="lms-cancel-btn" style={{ flex: 1 }}>Cancel</button>
                <button onClick={() => {
                  onDelete(deleteTarget.localId);
                  setDeleteTarget(null);
                  // Adjust index if we deleted the last item
                  setPreviewIndex(i => Math.min(i, questions.length - 2));
                }} className="lms-btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--lms-danger)', color: 'white', border: 'none', boxShadow: 'none' }}>
                  <Trash2 size={13} /> Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Delete Confirm Dialog ─────────────────────────────────────────────────────
const DeleteConfirmDialog: React.FC<{
  questionTitle: string; onConfirm: () => void; onCancel: () => void;
}> = ({ questionTitle, onConfirm, onCancel }) => (
  <div className="lms-modal-backdrop">
    <div className="lms-modal">
      <div className="lms-modal-header" style={{ background: 'var(--lms-danger-bg)', borderBottom: '1.5px solid var(--lms-danger-bdr)' }}>
        <div className="lms-modal-icon" style={{ background: 'var(--lms-danger-bg)', border: '1.5px solid var(--lms-danger-bdr)' }}><AlertTriangle size={16} style={{ color: 'var(--lms-danger)' }} /></div>
        <div><h2 style={{ fontFamily: 'var(--lms-font)', fontSize: 14, fontWeight: 700, color: 'var(--lms-text-main)' }}>Delete Question?</h2><p style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-text-muted)', marginTop: 2 }}>This action cannot be undone</p></div>
      </div>
      <div className="lms-modal-body">
        <p style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: 'var(--lms-text-sec)', lineHeight: 1.6, marginBottom: 4 }}>Are you sure you want to delete <strong style={{ color: 'var(--lms-text-main)' }}>"{questionTitle || 'this question'}"</strong>?</p>
        <p style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-danger)', fontWeight: 600 }}>This will permanently remove it.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} className="lms-cancel-btn" style={{ flex: 1 }}>Cancel</button>
          <button onClick={onConfirm} className="lms-btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--lms-danger)', color: 'white', border: 'none', boxShadow: 'none' }}><Trash2 size={13} /> Yes, Delete</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Close Confirm Dialog ─────────────────────────────────────────────────────
const CloseConfirmDialog: React.FC<{
  hasUnsavedChanges: boolean; hasSavedQuestions: boolean;
  onConfirm: () => void; onCancel: () => void;
}> = ({ hasUnsavedChanges, hasSavedQuestions, onConfirm, onCancel }) => (
  <div className="lms-modal-backdrop">
    <div className="lms-modal">
      <div className="lms-modal-header" style={{ background: hasUnsavedChanges ? 'var(--lms-warning-bg)' : 'var(--lms-bg-surface)' }}>
        <div className="lms-modal-icon" style={{ background: hasUnsavedChanges ? 'var(--lms-warning-bg)' : 'var(--lms-bg-surface2)', border: `1.5px solid ${hasUnsavedChanges ? 'var(--lms-warning-bdr)' : 'var(--lms-border)'}` }}><X size={16} style={{ color: hasUnsavedChanges ? 'var(--lms-warning)' : 'var(--lms-text-sec)' }} /></div>
        <div><h2 style={{ fontFamily: 'var(--lms-font)', fontSize: 14, fontWeight: 700, color: 'var(--lms-text-main)' }}>{hasUnsavedChanges ? 'Unsaved Changes' : 'Close Form?'}</h2><p style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-text-muted)', marginTop: 2 }}>{hasUnsavedChanges ? 'You have unsaved changes' : 'Are you sure you want to close?'}</p></div>
      </div>
      <div className="lms-modal-body">
        <p style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: 'var(--lms-text-sec)', lineHeight: 1.6 }}>{hasUnsavedChanges ? <><span>The current question has </span><strong style={{ color: 'var(--lms-warning)' }}>unsaved changes</strong><span> that will be lost if you close now.</span>{hasSavedQuestions && <span style={{ display: 'block', marginTop: 8, color: 'var(--lms-text-muted)' }}>Previously saved questions will remain intact.</span>}</> : hasSavedQuestions ? <>Are you sure you want to close? Your saved questions will remain intact.</> : <>Are you sure you want to close this form? No questions have been saved yet.</>}</p>
        {hasUnsavedChanges && (<div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'var(--lms-warning-bg)', border: '1.5px solid var(--lms-warning-bdr)', borderRadius: 'var(--lms-radius-md)' }}><AlertTriangle size={12} style={{ color: 'var(--lms-warning)', marginTop: 2, flexShrink: 0 }} /><p style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-warning)' }}>Tip: Click <strong>Cancel</strong> to go back and save your changes first.</p></div>)}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} className="lms-cancel-btn" style={{ flex: 1 }}>Keep Editing</button>
          <button onClick={onConfirm} className="lms-btn" style={{ flex: 1, justifyContent: 'center', background: hasUnsavedChanges ? 'var(--lms-warning)' : 'var(--lms-text-main)', boxShadow: 'none', borderColor: 'transparent' }}><X size={13} />{hasUnsavedChanges ? 'Discard & Close' : 'Yes, Close'}</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Clear Confirm Dialog ─────────────────────────────────────────────────────
const ClearConfirmDialog: React.FC<{
  onConfirm: () => void; onCancel: () => void;
}> = ({ onConfirm, onCancel }) => (
  <div className="lms-modal-backdrop">
    <div className="lms-modal">
      <div className="lms-modal-header" style={{ background: 'var(--lms-warning-bg)', borderBottom: '1.5px solid var(--lms-warning-bdr)' }}>
        <div className="lms-modal-icon" style={{ background: 'var(--lms-warning-bg)', border: '1.5px solid var(--lms-warning-bdr)' }}><AlertCircle size={16} style={{ color: 'var(--lms-warning)' }} /></div>
        <div><h2 style={{ fontFamily: 'var(--lms-font)', fontSize: 14, fontWeight: 700, color: 'var(--lms-text-main)' }}>Clear All Fields?</h2><p style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-text-muted)', marginTop: 2 }}>This will reset the current question</p></div>
      </div>
      <div className="lms-modal-body">
        <p style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: 'var(--lms-text-sec)', lineHeight: 1.6, marginBottom: 4 }}>Are you sure you want to clear all fields for this question?</p>
        <p style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-warning)', fontWeight: 600 }}>Any unsaved content will be lost.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} className="lms-cancel-btn" style={{ flex: 1 }}>Cancel</button>
          <button onClick={onConfirm} className="lms-btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--lms-warning)', color: 'white', border: 'none', boxShadow: 'none' }}><X size={13} /> Yes, Clear All</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
const DatabaseQuestionForm: React.FC<DatabaseQuestionFormProps> = ({
  exerciseData, tabType, initialData, isEditing = false,
  onClose, onSave, onDeleteQuestion, isSaving, saveProgress, saveMessage,
  lockedDifficulty,
}) => {
  injectFonts();

  // ── State ─────────────────────────────────────────────────────────────────
  const [dbQuestions, setDbQuestions] = useState<DBQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentDiff, setCurrentDiff] = useState<'easy' | 'medium' | 'hard'>(lockedDifficulty || 'medium');

  // Form fields
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(lockedDifficulty || 'medium');
  const [score, setScore] = useState(0);
  const [constraints, setConstraints] = useState<string[]>(['']);
  const [hint, setHint] = useState('');
  const [extraHints, setExtraHints] = useState<HintItem[]>([]);
  const [sampleQuery, setSampleQuery] = useState('');
  const [descBlocks, setDescBlocks] = useState<ProgContentBlock[]>([mkProgTextBlock()]);
  const [sampleResultBlocks, setSampleResultBlocks] = useState<ProgContentBlock[]>([mkProgTextBlock()]);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showMockModal, setShowMockModal] = useState(false);
  const [showExtraHints, setShowExtraHints] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [saveOk, setSaveOk] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!isEditing);

  // SQL panel state
  const [sqlQuery, setSqlQuery] = useState('-- Write your SQL query here\nSELECT * FROM table_name;');
  const [sqlOutput, setSqlOutput] = useState<{
    type: 'idle' | 'running' | 'result' | 'error';
    message?: string;
    rows?: Record<string, any>[];
    columns?: string[];
    time?: number;
  }>({ type: 'idle' });

  // Refs
  const titleRef = useRef<HTMLDivElement>(null);
  const serverIdMap = useRef<Map<string, string>>(new Map());
  const dbQuestionsRef = useRef<DBQuestion[]>([]);
  const currentIndexRef = useRef<number>(0);

  // Editor formatting state
  const [editorState, setEditorState] = useState({
    activeElement: null as HTMLElement | null,
    isBold: false,
    isItalic: false,
    isUnderline: false,
  });

  // ── Exercise config helpers ────────────────────────────────────────────────
  const progCfg = exerciseData?.fullExerciseData?.questionConfiguration?.programmingQuestionConfiguration;
  const cfgType = (progCfg?.questionConfigType as string) || 'general';
  const isGeneral = cfgType === 'general';
  const generalQuestionCount: number = progCfg?.generalQuestionCount || 0;
  const generalTotalMarks: number = exerciseData?.fullExerciseData?.exerciseInformation?.totalMarksProgramming ||
    exerciseData?.fullExerciseData?.exerciseInformation?.totalMarks || 0;
  const generalMPQ: number = progCfg?.generalMarksPerQuestion ||
    progCfg?.scoreSettings?.evenMarks ||
    Math.floor(generalTotalMarks / Math.max(1, generalQuestionCount));

  const getConfiguredDiffs = useCallback((): Array<'easy' | 'medium' | 'hard'> => {
    if (isGeneral) return [];
    if (cfgType === 'levelBased') {
      const lsc = progCfg?.scoreSettings?.levelScoringConfiguration || {};
      return (['easy', 'medium', 'hard'] as const).filter(d => (lsc[d]?.questionCount || progCfg?.levelBasedCounts?.[d] || 0) > 0);
    }
    if (cfgType === 'selectionLevel') {
      const sel = progCfg?.selectionLevelCounts || {};
      return (['easy', 'medium', 'hard'] as const).filter(d => (sel[d] || 0) > 0);
    }
    return [];
  }, [isGeneral, cfgType, progCfg]);

  const getQuotaForDiff = useCallback((d: 'easy' | 'medium' | 'hard'): number => {
    if (cfgType === 'levelBased') return progCfg?.scoreSettings?.levelScoringConfiguration?.[d]?.questionCount || progCfg?.levelBasedCounts?.[d] || 0;
    if (cfgType === 'selectionLevel') return progCfg?.selectionLevelCounts?.[d] || 0;
    return generalQuestionCount;
  }, [cfgType, progCfg, generalQuestionCount]);

const getDbQuestionsForDiff = useCallback((d?: 'easy' | 'medium' | 'hard'): DBQuestion[] => {
  // Use dbQuestions state, not dbQuestionsRef
  const all = dbQuestions;
  if (!d) return all;
  return all.filter(q => q.difficulty === d);
}, [dbQuestions]);

  const getDbIdSet = useCallback((d?: 'easy' | 'medium' | 'hard'): Set<string> => {
    const dbQs = getDbQuestionsForDiff(d);
    return new Set(dbQs.map(q => q._id?.toString()).filter(Boolean));
  }, [getDbQuestionsForDiff]);
const getCreatedCount = useCallback((d?: 'easy' | 'medium' | 'hard'): number =>
  getDbQuestionsForDiff(d).length, [getDbQuestionsForDiff]);


  const getRemainingSlots = useCallback((d?: 'easy' | 'medium' | 'hard'): number => {
    if (isGeneral) {
      return Math.max(0, generalQuestionCount - getDbQuestionsForDiff().length);
    }
    if (!d) return 0;
    const quota = getQuotaForDiff(d);
    const created = getCreatedCount(d);
    return Math.max(0, quota - created);
  }, [isGeneral, generalQuestionCount, getQuotaForDiff, getCreatedCount, getDbQuestionsForDiff]);

  const getTotalMarksForDiff = useCallback((d: 'easy' | 'medium' | 'hard'): number => {
    const lsc = progCfg?.scoreSettings?.levelScoringConfiguration?.[d];
    if (lsc?.type === 'question_specific') return lsc.totalMarks || 0;
    if (lsc?.type === 'level_specific') return (lsc.marksPerQuestion || 0) * (lsc.questionCount || 0);
    return (progCfg?.scoreSettings?.levelBasedMarks?.[d] || 0) * getQuotaForDiff(d);
  }, [progCfg, getQuotaForDiff]);

  const getDbMarksUsedForDiff = useCallback((d: 'easy' | 'medium' | 'hard'): number =>
    getDbQuestionsForDiff(d).reduce((s, q) => s + (q.score || 0), 0), [getDbQuestionsForDiff]);

  const getFixedScore = useCallback((d: 'easy' | 'medium' | 'hard'): number => {
    if (isGeneral) return generalMPQ;
    const lsc = progCfg?.scoreSettings?.levelScoringConfiguration?.[d];
    if (lsc?.type === 'level_specific') return lsc.marksPerQuestion || 0;
    return progCfg?.scoreSettings?.levelBasedMarks?.[d] || 0;
  }, [isGeneral, generalMPQ, progCfg]);

  const isScoreEditable = useCallback((d: 'easy' | 'medium' | 'hard'): boolean =>
    !isGeneral && progCfg?.scoreSettings?.levelScoringConfiguration?.[d]?.type === 'question_specific',
    [isGeneral, progCfg]);

  // ── Totals for all difficulties ────────────────────────────────────────────
  const totalSlotsAll = isGeneral
    ? generalQuestionCount
    : getConfiguredDiffs().reduce((s, d) => s + getQuotaForDiff(d), 0);
  const createdCountAll = getDbQuestionsForDiff().length;
  const remainingSlotsAll = Math.max(0, totalSlotsAll - createdCountAll);
  const usedMarksAll = getConfiguredDiffs().reduce((acc, d) => acc + getDbMarksUsedForDiff(d), 0);
  const totalMarksAll = exerciseData?.fullExerciseData?.exerciseInformation?.totalMarksProgramming ||
    exerciseData?.fullExerciseData?.exerciseInformation?.totalMarks || 0;

  // ── Mock enabled only when ALL required questions are saved ────────────────
  const isMockEnabled = totalSlotsAll <= 0 ? createdCountAll > 0 : createdCountAll >= totalSlotsAll;

  // ── Current difficulty values ──────────────────────────────────────────────
  const totalSlots = isGeneral ? generalQuestionCount : getQuotaForDiff(currentDiff);
  const createdCount = getCreatedCount(currentDiff);
  const remainingSlots = Math.max(0, totalSlots - createdCount);
  const usedMarks = getDbMarksUsedForDiff(currentDiff);
  const totalMarksForDiff = getTotalMarksForDiff(currentDiff);
  const remainingMarks = isGeneral ? 0 : Math.max(0, totalMarksForDiff - usedMarks);
  const displayScore = isGeneral ? generalMPQ : (isScoreEditable(currentDiff) ? score : getFixedScore(currentDiff));

// Replace the buildInitialFlow function with this:
const buildInitialFlow = useCallback((): { questions: DBQuestion[]; startIndex: number } => {
  // Get existing questions from exerciseData
  const existingQuestions = exerciseData?.fullExerciseData?.questions || [];
  
  // Filter for database questions
  const dbQuestionsFromExercise = existingQuestions.filter(
    (q: any) => q.questionType === 'database'
  );
  
  // Convert to flow format
  const convertedQuestions = dbQuestionsFromExercise.map(dbQuestionToFlow);
  
  // If we're in edit mode with initialData, make sure it's included
  if ((isEditing || initialData?._id) && initialData) {
    // Check if initialData is already in the list
    const alreadyExists = convertedQuestions.some(q => q._id === initialData._id);
    if (!alreadyExists) {
      const newQ = dbQuestionToFlow(initialData);
      convertedQuestions.unshift(newQ);
    }
  }
  
  // Find start index for editing
  let startIdx = 0;
  if (isEditing && initialData?._id) {
    startIdx = convertedQuestions.findIndex(q => q._id === initialData._id);
    if (startIdx === -1) startIdx = 0;
  } else if (convertedQuestions.length > 0 && !isEditing) {
    // For non-edit mode, start at the last question (to continue adding)
    startIdx = convertedQuestions.length;
  }
  
  // If no questions exist, create an empty one
  if (convertedQuestions.length === 0 && !isEditing) {
    const emptyQ: DBQuestion = {
      __localId: mkLocalId(),
      title: '',
      description: [mkProgTextBlock()],
      difficulty: lockedDifficulty || 'medium',
      score: isGeneral ? generalMPQ : (isScoreEditable(lockedDifficulty || 'medium') ? 0 : getFixedScore(lockedDifficulty || 'medium')),
      sampleQuery: '',
      sampleResult: [mkProgTextBlock()],
      constraints: [],
      hints: [],
      questionType: 'database',
      isSaved: false,
      isDirty: false,
      isPreExisting: false,
    };
    convertedQuestions.push(emptyQ);
    startIdx = 0;
  }
  
  return { questions: convertedQuestions, startIndex: startIdx };
}, [exerciseData, isEditing, initialData, lockedDifficulty, isGeneral, generalMPQ, isScoreEditable, getFixedScore]);
  const initialFlow = useMemo(() => buildInitialFlow(), [buildInitialFlow]);

  useEffect(() => {
    setDbQuestions(initialFlow.questions);
    dbQuestionsRef.current = initialFlow.questions;
    setCurrentIndex(initialFlow.startIndex);
    currentIndexRef.current = initialFlow.startIndex;
    initialFlow.questions.forEach(q => {
      if (q._id && q.__localId) serverIdMap.current.set(q.__localId, q._id);
    });
  }, [initialFlow]);

  // ── Load question into form ────────────────────────────────────────────────
const loadQuestionIntoForm = useCallback((q: DBQuestion) => {
  setTitle(q.title || '');
  if (titleRef.current && q.title) {
    titleRef.current.innerHTML = q.title;
  }
  setDescBlocks(Array.isArray(q.description) ? q.description : descToBlocks(q.description));
  setSampleQuery(q.sampleQuery || '');
  setSampleResultBlocks(Array.isArray(q.sampleResult) ? q.sampleResult : descToBlocks(q.sampleResult));
  setConstraints(q.constraints?.length ? [...q.constraints] : ['']);
  if (q.hints?.length > 0) {
    const [first, ...rest] = q.hints;
    setHint(first?.hintText || '');
    setExtraHints(rest.map((h: any) => ({ hintText: h.hintText || '', pointsDeduction: h.pointsDeduction || 0, isPublic: h.isPublic !== false })));
    if (rest.length > 0) setShowExtraHints(true);
  } else {
    setHint('');
    setExtraHints([]);
  }
  setScore(q.score || 0);
  setDifficulty(q.difficulty || currentDiff);
  setCurrentDiff(q.difficulty || currentDiff);
  setErrs({});      // Reset errors
  setTouched(new Set());  // Reset touched
  setIsEditMode(!!(q._id));
}, [currentDiff]);

  useEffect(() => {
    if (dbQuestions[currentIndex]) {
      loadQuestionIntoForm(dbQuestions[currentIndex]);
    } else if (!isEditing && dbQuestions.length === 0) {
      setTitle('');
      if (titleRef.current) titleRef.current.innerHTML = '';
      setDescBlocks([mkProgTextBlock()]);
      setSampleQuery('');
      setSampleResultBlocks([mkProgTextBlock()]);
      setConstraints(['']);
      setHint('');
      setExtraHints([]);
      const defaultScore = isGeneral ? generalMPQ : (isScoreEditable(currentDiff) ? 0 : getFixedScore(currentDiff));
      setScore(defaultScore);
    }
  }, [currentIndex, dbQuestions, loadQuestionIntoForm, isEditing, isGeneral, generalMPQ, currentDiff, isScoreEditable, getFixedScore]);
// Keep refs in sync with state
useEffect(() => {
  dbQuestionsRef.current = dbQuestions;
}, [dbQuestions]);

useEffect(() => {
  currentIndexRef.current = currentIndex;
}, [currentIndex]);
  // ── Helper functions ───────────────────────────────────────────────────────
  const getServerId = useCallback((q: DBQuestion | null | undefined): string | undefined => {
    if (!q) return undefined;
    const mapped = serverIdMap.current.get(q.__localId);
    if (mapped) return mapped;
    if (q._id) return q._id;
    if (isEditing && initialData?._id) return initialData._id;
    return undefined;
  }, [isEditing, initialData]);

  const registerSavedId = useCallback((localId: string, serverId: string) => {
    serverIdMap.current.set(localId, serverId);
    setDbQuestions(prev => {
      const next = prev.map(q =>
        q.__localId === localId ? { ...q, _id: serverId, isSaved: true, isDirty: false, isPreExisting: true } : q
      );
      dbQuestionsRef.current = next;
      return next;
    });
  }, []);


  // Add this useEffect after the existing one that loads initialFlow
useEffect(() => {
  // Sync with any new questions from exerciseData (e.g., after saving)
  const existingQuestions = exerciseData?.fullExerciseData?.questions || [];
  const dbQuestionsFromExercise = existingQuestions.filter(
    (q: any) => q.questionType === 'database'
  );
  
  const existingIds = new Set(dbQuestionsFromExercise.map((q: any) => q._id?.toString()));
  const currentIds = new Set(dbQuestionsRef.current.map(q => q._id?.toString()).filter(Boolean));
  
  // Check if there are new questions not in our local state
  const hasNewQuestions = dbQuestionsFromExercise.some(
    (q: any) => !currentIds.has(q._id?.toString())
  );
  
  if (hasNewQuestions && dbQuestionsFromExercise.length > dbQuestionsRef.current.length) {
    // Convert new questions to flow format
    const newFlowQuestions = dbQuestionsFromExercise.map(dbQuestionToFlow);
    const existingFlow = dbQuestionsRef.current;
    
    // Merge: keep local unsaved questions, add new saved ones
    const merged = [...newFlowQuestions];
    for (const localQ of existingFlow) {
      if (!localQ._id || !merged.some(m => m._id === localQ._id)) {
        merged.push(localQ);
      }
    }
    
    // Sort by some order (e.g., by creation date or index)
    setDbQuestions(merged);
    dbQuestionsRef.current = merged;
    
    // Update serverIdMap
    merged.forEach(q => {
      if (q._id && q.__localId && !serverIdMap.current.has(q.__localId)) {
        serverIdMap.current.set(q.__localId, q._id);
      }
    });
  }
}, [exerciseData]);


const snapshotForm = useCallback((): DBQuestion => {
  const existing = dbQuestionsRef.current[currentIndexRef.current];
  const allHints = hint.trim() 
    ? [{ hintText: hint.trim(), pointsDeduction: 0, isPublic: true, sequence: 0 }, ...extraHints.map((h, i) => ({ ...h, sequence: i + 1 }))] 
    : extraHints.map((h, i) => ({ ...h, sequence: i }));
  const finalScore = isGeneral ? generalMPQ : (isScoreEditable(currentDiff) ? score : getFixedScore(currentDiff));
  const serverId = getServerId(existing);
  
  return {
    __localId: existing?.__localId || mkLocalId(),
    _id: serverId,
    title: title.trim() || '',
    description: blocksToDescription(descBlocks),
    difficulty: currentDiff,
    score: finalScore,
    sampleQuery: sampleQuery.trim(),
    sampleResult: sampleResultBlocks,
    constraints: constraints.filter(c => c.trim()),
    hints: allHints,
    questionType: 'database',
    isSaved: !!serverId || existing?.isSaved || false,
    isDirty: !!serverId,
    isPreExisting: !!serverId || existing?.isPreExisting || false,
  };
}, [title, descBlocks, currentDiff, score, sampleQuery, sampleResultBlocks, constraints, hint, extraHints, isGeneral, generalMPQ, isScoreEditable, getFixedScore, getServerId]);
  const validate = useCallback((): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    const descText = descBlocks.filter(b => b.type === 'text').map(b => (b as any).value).join(' ').trim();
    if (!descText && !descBlocks.some(b => b.type === 'image' || b.type === 'code')) e.description = 'Description is required';
    if (!sampleQuery.trim()) e.sampleQuery = 'Sample query is required';
    const srText = sampleResultBlocks.filter(b => b.type === 'text').map(b => (b as any).value).join(' ').trim();
    if (!srText && !sampleResultBlocks.some(b => b.type === 'image')) e.sampleResult = 'Expected result is required';

    if (!isGeneral && isScoreEditable(currentDiff)) {
      const totalAllowed = totalMarksForDiff;
      const existingServerId = getServerId(dbQuestions[currentIndex]);
      const isEditExist = !!(existingServerId || isEditing);
      if (isEditExist && existingServerId) {
        const otherSum = getDbQuestionsForDiff(currentDiff).reduce((s, q) => q._id?.toString() === existingServerId ? s : s + (q.score || 0), 0);
        if (otherSum + score > totalAllowed + 0.01) e.score = `Max for this question: ${Math.max(0, totalAllowed - otherSum).toFixed(2)}`;
      } else {
        const remaining = Math.max(0, totalAllowed - usedMarks);
        if (score > remaining + 0.01) e.score = `Score (${score}) exceeds remaining marks (${remaining.toFixed(2)})`;
      }
      if (!e.score && score <= 0) e.score = 'Score must be greater than 0';
    } else if (!isGeneral && score <= 0 && getFixedScore(currentDiff) <= 0) {
      e.score = 'Score must be greater than 0';
    }
    return e;
  }, [title, descBlocks, sampleQuery, sampleResultBlocks, isGeneral, isScoreEditable, currentDiff, totalMarksForDiff, getServerId, dbQuestions, currentIndex, isEditing, score, getDbQuestionsForDiff, usedMarks, getFixedScore]);

  useEffect(() => {
    if (touched.size > 0) setErrs(validate());
  }, [title, descBlocks, sampleQuery, sampleResultBlocks, score, constraints, touched, validate]);

  const touch = (field: string) => setTouched(prev => new Set(prev).add(field));

  const hasUnsavedFormChanges = useMemo((): boolean => {
    const currentQ = dbQuestions[currentIndex];
    if (!currentQ || (!currentQ._id && !currentQ.isSaved)) return !!(title.trim() || descBlocks.some(b => b.type !== 'text' || (b as any).value?.trim()) || sampleQuery.trim());
    if (isEditMode && currentQ) {
      return title.trim() !== currentQ.title ||
        JSON.stringify(descBlocks) !== JSON.stringify(currentQ.description) ||
        score !== currentQ.score ||
        sampleQuery.trim() !== currentQ.sampleQuery ||
        JSON.stringify(sampleResultBlocks) !== JSON.stringify(currentQ.sampleResult);
    }
    return false;
  }, [dbQuestions, currentIndex, isEditMode, title, descBlocks, score, sampleQuery, sampleResultBlocks]);

  const hasSavedQuestionsInSession = useMemo((): boolean =>
    dbQuestions.some(q => q.isSaved || q._id || serverIdMap.current.has(q.__localId)),
    [dbQuestions]);

  const shouldConfirmClose = useMemo((): boolean => hasUnsavedFormChanges || hasSavedQuestionsInSession, [hasUnsavedFormChanges, hasSavedQuestionsInSession]);

  const handleCloseRequest = useCallback(() => { if (shouldConfirmClose) setShowCloseConfirm(true); else onClose(); }, [shouldConfirmClose, onClose]);
  const handleCloseConfirmed = useCallback(() => { setShowCloseConfirm(false); onClose(); }, [onClose]);

  const handleClearCurrentQuestion = useCallback(() => {
    setTitle('');
    if (titleRef.current) titleRef.current.innerHTML = '';
    setDescBlocks([mkProgTextBlock()]);
    setSampleQuery('');
    setSampleResultBlocks([mkProgTextBlock()]);
    setConstraints(['']);
    setHint('');
    setExtraHints([]);
    const defaultScore = isGeneral ? generalMPQ : (isScoreEditable(currentDiff) ? 0 : getFixedScore(currentDiff));
    setScore(defaultScore);
    setErrs({});
    setTouched(new Set());
    setIsEditMode(false);
    setShowClearConfirm(false);
  }, [isGeneral, generalMPQ, isScoreEditable, currentDiff, getFixedScore]);

  const handleDeleteCurrentQuestion = useCallback(async () => {
    const currentQ = dbQuestions[currentIndex];
    if (!currentQ) return;
    const serverId = serverIdMap.current.get(currentQ.__localId) || currentQ._id;
    const currentIdx = currentIndex;

    if (serverId && onDeleteQuestion) {
      try {
        await onDeleteQuestion(serverId as string);
      } catch (err) {
        console.error('Failed to delete question from DB:', err);
        setShowDeleteConfirm(false);
        return;
      }
    }

    setDbQuestions(prev => {
      const newFlow = prev.filter(q => q.__localId !== currentQ.__localId);
      dbQuestionsRef.current = newFlow;

      let newIndex = currentIdx;
      if (newFlow.length === 0) {
        const emptyQ: DBQuestion = {
          __localId: mkLocalId(),
          title: '',
          description: [mkProgTextBlock()],
          difficulty: currentDiff,
          score: isGeneral ? generalMPQ : (isScoreEditable(currentDiff) ? 0 : getFixedScore(currentDiff)),
          sampleQuery: '',
          sampleResult: [mkProgTextBlock()],
          constraints: [],
          hints: [],
          questionType: 'database',
          isSaved: false,
          isDirty: false,
          isPreExisting: false,
        };
        newFlow.push(emptyQ);
        newIndex = 0;
      } else if (currentIdx >= newFlow.length) {
        newIndex = newFlow.length - 1;
      } else if (currentIdx > 0) {
        newIndex = currentIdx - 1;
      } else {
        newIndex = 0;
      }

      setTimeout(() => {
        setCurrentIndex(newIndex);
        currentIndexRef.current = newIndex;
        if (newFlow[newIndex]) {
          loadQuestionIntoForm(newFlow[newIndex]);
          if (newFlow[newIndex]?.difficulty) {
            setCurrentDiff(newFlow[newIndex].difficulty);
            setDifficulty(newFlow[newIndex].difficulty);
          }
        }
      }, 0);

      return newFlow;
    });

    serverIdMap.current.delete(currentQ.__localId);
    setShowDeleteConfirm(false);
  }, [dbQuestions, currentIndex, onDeleteQuestion, currentDiff, isGeneral, generalMPQ, isScoreEditable, getFixedScore, loadQuestionIntoForm]);

 const executeSave = useCallback(async (localId: string, payload: any, isSaveAndNext: boolean): Promise<string | undefined> => {
  const result = await onSave({ ...payload, __saveAndNext: isSaveAndNext, __isUpdate: !!payload._id, __questionId: payload._id, __editLocalId: localId });
  
  const savedId = result?._id || result?.data?._id || result?.questionId || result?.data?.questionId;
    if (savedId) registerSavedId(localId, savedId);
    const updatedFlow = dbQuestionsRef.current.map(q =>
      q.__localId === localId ? { ...q, ...payload, _id: savedId || q._id, isSaved: true, isDirty: false, isPreExisting: true } : q
    );
    dbQuestionsRef.current = updatedFlow;
    setDbQuestions(updatedFlow);
    return savedId;
  }, [onSave, registerSavedId]);

  // ── handleSave — with guard like programming form ──────────────────────────
  const handleSave = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrs(validationErrors);
      setTouched(new Set(Object.keys(validationErrors)));
      return;
    }
    const snap = snapshotForm();
    const localId = snap.__localId;
    const serverId = getServerId(dbQuestions[currentIndex]);
    // Guard: if already saved and no changes, skip re-save (same as programming form)
    if (serverId && !hasUnsavedFormChanges) { return; }
    try {
await executeSave(localId, { ...snap, __preventClose: true }, false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      setIsEditMode(false);
    } catch (err) {
      console.error('Save error:', err);
    }
  }, [validate, snapshotForm, getServerId, dbQuestions, currentIndex, hasUnsavedFormChanges, executeSave]);
const advanceAfterSave = useCallback((savedId: string | undefined) => {
  const flow = dbQuestionsRef.current;
  const idx = currentIndexRef.current;
  const nextIdx = idx + 1;

  if (nextIdx < flow.length) {
    setCurrentIndex(nextIdx);
    currentIndexRef.current = nextIdx;
    if (flow[nextIdx]?.difficulty) {
      setCurrentDiff(flow[nextIdx].difficulty);
      setDifficulty(flow[nextIdx].difficulty);
    }
    loadQuestionIntoForm(flow[nextIdx]);
    return;
  }

  // In edit mode, just stay on the question - don't close
  if (isEditing) {
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2500);
    return;
  }

  // For general config with no remaining slots - DON'T CLOSE
  if (isGeneral) {
    if (getRemainingSlots() > 0) {
      const newQ: DBQuestion = {
        __localId: mkLocalId(), title: '', description: [mkProgTextBlock()],
        difficulty: currentDiff, score: generalMPQ, sampleQuery: '', sampleResult: [mkProgTextBlock()],
        constraints: [], hints: [], questionType: 'database', isSaved: false, isDirty: false, isPreExisting: false,
      };
      const newFlow = [...flow, newQ];
      dbQuestionsRef.current = newFlow; setDbQuestions(newFlow);
      setCurrentIndex(flow.length); currentIndexRef.current = flow.length;
      setTitle(''); if (titleRef.current) titleRef.current.innerHTML = '';
      setDescBlocks([mkProgTextBlock()]); setSampleQuery(''); setSampleResultBlocks([mkProgTextBlock()]);
      setConstraints(['']); setHint(''); setExtraHints([]); setScore(generalMPQ);
    } else {
      // No remaining slots - show success and STAY OPEN
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      // DO NOT call onClose()
    }
  } else {
    if (getRemainingSlots(currentDiff) > 0) {
      const defaultScore = isScoreEditable(currentDiff) ? 0 : getFixedScore(currentDiff);
      const newQ: DBQuestion = {
        __localId: mkLocalId(), title: '', description: [mkProgTextBlock()],
        difficulty: currentDiff, score: defaultScore, sampleQuery: '', sampleResult: [mkProgTextBlock()],
        constraints: [], hints: [], questionType: 'database', isSaved: false, isDirty: false, isPreExisting: false,
      };
      const newFlow = [...flow, newQ];
      dbQuestionsRef.current = newFlow; setDbQuestions(newFlow);
      setCurrentIndex(flow.length); currentIndexRef.current = flow.length;
      setTitle(''); if (titleRef.current) titleRef.current.innerHTML = '';
      setDescBlocks([mkProgTextBlock()]); setSampleQuery(''); setSampleResultBlocks([mkProgTextBlock()]);
      setConstraints(['']); setHint(''); setExtraHints([]); setScore(defaultScore);
    } else {
      // No remaining slots - show success and STAY OPEN
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      // DO NOT call onClose()
    }
  }
}, [isEditing, isGeneral, getRemainingSlots, generalMPQ, currentDiff, isScoreEditable, getFixedScore, loadQuestionIntoForm]);

const handleSaveAndContinue = useCallback(async () => {
  const validationErrors = validate();
  if (Object.keys(validationErrors).length > 0) {
    setErrs(validationErrors);
    setTouched(new Set(Object.keys(validationErrors)));
    return;
  }
  
  const snap = snapshotForm();
  const localId = snap.__localId;
  const serverId = getServerId(dbQuestions[currentIndex]);
  
  // Check if this is the last question
  const isLast = currentIndex === dbQuestions.length - 1;
  const hasRemainingSlots = isGeneral 
    ? getRemainingSlots() > 0 
    : getRemainingSlots(currentDiff) > 0;
  
  // For the last question, just save and stay (don't try to create new question)
  if (isLast && !hasRemainingSlots) {
    if (serverId && !isEditMode && !hasUnsavedFormChanges) {
      return; // Already saved, nothing to do
    }
    
    try {
      // ✅ Add a special flag to prevent parent from closing
// Replace __stayOpen with __preventClose in handleSaveAndContinue:
const saveResult = await executeSave(localId, { ...snap, __preventClose: true }, true);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      setIsEditMode(false);
      
      // ✅ Update the local question to mark it as saved
      const updatedFlow = dbQuestionsRef.current.map(q =>
        q.__localId === localId ? { ...q, ...snap, _id: serverId || saveResult, isSaved: true, isDirty: false } : q
      );
      dbQuestionsRef.current = updatedFlow;
      setDbQuestions(updatedFlow);
      
      return; // Stay on current question
    } catch (err) {
      console.error('Save error:', err);
    }
    return;
  }
  
  // For non-last questions or when there are remaining slots
  if (serverId && !isEditMode && !hasUnsavedFormChanges) {
    advanceAfterSave(serverId);
    return;
  }
  
  let savedId: string | undefined;
  try {
    savedId = await executeSave(localId, snap, true);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2500);
    setIsEditMode(false);
    advanceAfterSave(savedId);
  } catch (err) {
    console.error('Save error:', err);
  }
}, [validate, snapshotForm, getServerId, dbQuestions, currentIndex, isEditMode, hasUnsavedFormChanges, executeSave, isGeneral, getRemainingSlots, currentDiff, advanceAfterSave]);

const handlePrevious = useCallback(() => {
  const idx = currentIndexRef.current;
  if (idx <= 0) return;
  
  // Save current question state before moving
  const snap = snapshotForm();
  const newFlow = [...dbQuestionsRef.current];
  newFlow[idx] = snap;
  dbQuestionsRef.current = newFlow;
  setDbQuestions(newFlow);
  
  // Move to previous
  const prevIdx = idx - 1;
  currentIndexRef.current = prevIdx;
  setCurrentIndex(prevIdx);
  
  // Update difficulty if needed
  if (newFlow[prevIdx]?.difficulty) {
    setCurrentDiff(newFlow[prevIdx].difficulty);
    setDifficulty(newFlow[prevIdx].difficulty);
  }
  
  // Load the previous question into form
  loadQuestionIntoForm(newFlow[prevIdx]);
}, [snapshotForm, loadQuestionIntoForm]);
const handleNext = useCallback(() => {
  const idx = currentIndexRef.current;
  const flow = dbQuestionsRef.current;
  if (idx >= flow.length - 1) return;
  
  // Save current question state before moving
  const snap = snapshotForm();
  const newFlow = [...flow];
  newFlow[idx] = snap;
  dbQuestionsRef.current = newFlow;
  setDbQuestions(newFlow);
  
  // Move to next
  const nextIdx = idx + 1;
  currentIndexRef.current = nextIdx;
  setCurrentIndex(nextIdx);
  
  // Update difficulty if needed
  if (newFlow[nextIdx]?.difficulty) {
    setCurrentDiff(newFlow[nextIdx].difficulty);
    setDifficulty(newFlow[nextIdx].difficulty);
  }
  
  // Load the next question into form
  loadQuestionIntoForm(newFlow[nextIdx]);
}, [snapshotForm, loadQuestionIntoForm]);

  const handleJumpTo = useCallback((idx: number) => {
    const curIdx = currentIndexRef.current;
    const flow = dbQuestionsRef.current;
    const snap = snapshotForm();
    const newFlow = [...flow];
    newFlow[curIdx] = snap;
    dbQuestionsRef.current = newFlow;
    setDbQuestions(newFlow);
    const targetQ = newFlow[idx];
    if (targetQ?.difficulty) {
      setCurrentDiff(targetQ.difficulty);
      setDifficulty(targetQ.difficulty);
    }
    currentIndexRef.current = idx;
    setCurrentIndex(idx);
    loadQuestionIntoForm(newFlow[idx]);
  }, [snapshotForm, loadQuestionIntoForm]);

  const handleDeleteQuestion = useCallback(async (localId: string) => {
    const targetQ = dbQuestionsRef.current.find(q => q.__localId === localId);
    const serverId = serverIdMap.current.get(localId) || targetQ?._id;
    if (serverId && onDeleteQuestion) {
      try { await onDeleteQuestion(serverId as string); }
      catch (err) { console.error('Failed to delete question from DB:', err); return; }
    }
    setDbQuestions(prev => {
      const next = prev.filter(q => q.__localId !== localId);
      dbQuestionsRef.current = next;
      return next;
    });
    serverIdMap.current.delete(localId);
    const remainingFlow = dbQuestionsRef.current;
    const newIdx = Math.min(currentIndex, remainingFlow.length - 1);
    if (newIdx >= 0 && remainingFlow[newIdx]) {
      setCurrentIndex(newIdx);
      currentIndexRef.current = newIdx;
      loadQuestionIntoForm(remainingFlow[newIdx]);
    }
  }, [onDeleteQuestion, currentIndex, loadQuestionIntoForm]);

  const isLastQuestion = useMemo((): boolean => {
    const currentQ = dbQuestions[currentIndex];
    if (!currentQ) return getRemainingSlots(currentDiff) === 1;
    if (currentIndex < dbQuestions.length - 1) return false;
    const alreadySaved = !!(getServerId(currentQ) || currentQ.isSaved);
    const slots = getRemainingSlots(currentDiff);
    return alreadySaved ? slots === 0 : slots === 1;
  }, [dbQuestions, currentIndex, getRemainingSlots, currentDiff, getServerId]);

  const anyFormFieldHasContent = useMemo((): boolean => {
    const descText = descBlocks.filter(b => b.type === 'text').map(b => (b as any).value).join(' ').trim();
    const srText = sampleResultBlocks.filter(b => b.type === 'text').map(b => (b as any).value).join(' ').trim();
    return !!(title.trim() || descText || sampleQuery.trim() || srText);
  }, [title, descBlocks, sampleQuery, sampleResultBlocks]);

  // Formatting helpers
  const updateFormattingState = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      isBold: document.queryCommandState('bold'),
      isItalic: document.queryCommandState('italic'),
      isUnderline: document.queryCommandState('underline'),
    }));
  }, []);

  const toggleBold = useCallback(() => { document.execCommand('bold', false); updateFormattingState(); }, [updateFormattingState]);
  const toggleItalic = useCallback(() => { document.execCommand('italic', false); updateFormattingState(); }, [updateFormattingState]);
  const toggleUnderline = useCallback(() => { document.execCommand('underline', false); updateFormattingState(); }, [updateFormattingState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.getAttribute('contenteditable') === 'true') {
          switch (e.key) {
            case 'b': e.preventDefault(); toggleBold(); break;
            case 'i': e.preventDefault(); toggleItalic(); break;
            case 'u': e.preventDefault(); toggleUnderline(); break;
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleBold, toggleItalic, toggleUnderline]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.getAttribute('contenteditable') === 'true') {
        updateFormattingState();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateFormattingState]);

  // Run SQL query mock
  const runQuery = async () => {
    const q = sqlQuery.trim();
    if (!q) return;
    setSqlOutput({ type: 'running' });
    await new Promise(r => setTimeout(r, 600));
    const upper = q.toUpperCase();
    if (upper.includes('SELECT')) {
      setSqlOutput({
        type: 'result',
        rows: [{ id: 1, name: 'Alice', dept: 'Engineering' }, { id: 2, name: 'Bob', dept: 'Marketing' }],
        columns: ['id', 'name', 'dept'],
        time: Math.round(Math.random() * 40 + 5),
        message: '2 rows returned',
      });
    } else if (upper.match(/INSERT|UPDATE|DELETE/)) {
      setSqlOutput({ type: 'result', message: `✓ ${Math.floor(Math.random() * 3) + 1} row(s) affected`, time: Math.round(Math.random() * 20 + 3) });
    } else {
      setSqlOutput({ type: 'result', message: '✓ Query executed successfully', time: 2 });
    }
  };

  const hierarchyData = exerciseData?.fullExerciseData?.hierarchyData || {};
  const exerciseName = exerciseData?.exerciseName || exerciseData?.fullExerciseData?.exerciseInformation?.exerciseName || '';
  const exerciseType = exerciseData?.fullExerciseData?.exerciseType || 'programming';
  const diffStyle = DS[currentDiff] || DS.medium;
  const difficultyOptions = getConfiguredDiffs().length > 0 ? getConfiguredDiffs() : ['easy', 'medium', 'hard'];

  return (
    <div className="dbq-root" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: 'rgba(26,26,46,0.55)', backdropFilter: 'blur(2px)', overflow: 'hidden', fontFamily: 'var(--lms-font)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: 'var(--lms-bg-white)', overflow: 'hidden' }}>

        {/* HEADER */}
        <div style={{ background: 'var(--lms-bg-white)', borderBottom: '1.5px solid var(--lms-border)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div className="lms-header-logo-mark"><GraduationCap size={16} style={{ color: 'white' }} /></div>
            <div style={{ width: 1, height: 20, background: 'var(--lms-border)', flexShrink: 0 }} />
            <span className="lms-badge" style={{ background: 'var(--lms-info-bg)', color: 'var(--lms-info)', borderColor: 'var(--lms-info-bdr)', fontSize: 10, padding: '3px 8px', flexShrink: 0 }}>
              <Database size={9} /> Database
            </span>
            <div style={{ minWidth: 0, flex: 1, overflow: 'visible' }}>
              <nav style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 0 }}>
                {hierarchyData.courseName && (<><span className="lms-crumb" data-tip="Course" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.courseName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {hierarchyData.moduleName && (<><span className="lms-crumb" data-tip="Module" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.moduleName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {hierarchyData.submoduleName && (<><span className="lms-crumb" data-tip="Sub-module" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.submoduleName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {hierarchyData.topicName && (<><span className="lms-crumb" data-tip="Topic" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.topicName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {hierarchyData.subtopicName && (<><span className="lms-crumb" data-tip="Sub-topic" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.subtopicName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                {exerciseName && (<><span className="lms-crumb" data-tip="Exercise" style={{ color: 'var(--lms-text-main)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exerciseName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                <span className="lms-crumb" style={{ color: 'var(--lms-orange)' }}>{isEditing ? 'Edit Database Question' : 'Add Database Question'}</span>
              </nav>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0, marginLeft: 12 }}>
            {dbQuestions?.length > 0 && (
              <button onClick={() => setShowPreview(true)} className="lms-btn lms-btn-ghost-violet">
                <Eye size={12} /> Preview
                <span style={{ background: 'var(--lms-violet)', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20 }}>{dbQuestions.length}</span>
              </button>
            )}
            <button onClick={handleCloseRequest} style={{ padding: 8, borderRadius: 8, border: '1.5px solid var(--lms-danger-bdr)', background: 'var(--lms-danger-bg)', cursor: 'pointer', color: 'var(--lms-danger)', transition: 'all 0.15s' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* DIFFICULTY SELECT BAR */}
        {!isGeneral && getConfiguredDiffs().length > 0 && (
          <div style={{ background: 'var(--lms-bg-surface)', borderBottom: '1.5px solid var(--lms-border)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--lms-font)', fontSize: 12, fontWeight: 700, color: 'var(--lms-text-sec)', flexShrink: 0 }}>Switch Difficulty:</span>
            <div style={{ position: 'relative', minWidth: 160 }}>
              <select
                value={currentDiff}
              // In the difficulty select onChange (around line ~2600)
onChange={e => {
  const d = e.target.value as 'easy' | 'medium' | 'hard';
  if (d === currentDiff) return;
  
  // Save current question first
  const snap = snapshotForm();
  const newFlow = [...dbQuestionsRef.current];
  newFlow[currentIndexRef.current] = snap;
  dbQuestionsRef.current = newFlow;
  setDbQuestions(newFlow);
  
  setCurrentDiff(d); 
  setDifficulty(d);
  
  const existingForDiff = dbQuestions.find(q => q.difficulty === d);
  if (existingForDiff) {
    const idx = dbQuestions.findIndex(q => q.difficulty === d);
    setCurrentIndex(idx); 
    currentIndexRef.current = idx;
    loadQuestionIntoForm(existingForDiff);
  } else {
    const defaultScore = isScoreEditable(d) ? 0 : getFixedScore(d);
    const newQ: DBQuestion = {
      __localId: mkLocalId(), title: '', description: [mkProgTextBlock()],
      difficulty: d, score: defaultScore, sampleQuery: '', sampleResult: [mkProgTextBlock()],
      constraints: [], hints: [], questionType: 'database', isSaved: false, isDirty: false, isPreExisting: false,
    };
    const finalFlow = [...newFlow, newQ];
    dbQuestionsRef.current = finalFlow; 
    setDbQuestions(finalFlow);
    const newIdx = finalFlow.length - 1;
    setCurrentIndex(newIdx); 
    currentIndexRef.current = newIdx;
    setTitle(''); 
    if (titleRef.current) titleRef.current.innerHTML = '';
    setDescBlocks([mkProgTextBlock()]); 
    setSampleQuery(''); 
    setSampleResultBlocks([mkProgTextBlock()]);
    setConstraints(['']); 
    setHint(''); 
    setExtraHints([]); 
    setScore(defaultScore);
  }
}}
                style={{
                  fontFamily: 'var(--lms-font)', fontSize: 12, fontWeight: 700,
                  border: `2px solid ${diffStyle.border}`, borderRadius: 'var(--lms-radius-md)',
                  padding: '6px 32px 6px 12px', cursor: 'pointer', outline: 'none',
                  background: diffStyle.bg, color: diffStyle.text, width: '100%', appearance: 'none',
                }}>
                {getConfiguredDiffs().map(d => {
                  const quota = getQuotaForDiff(d);
                  const used = getCreatedCount(d);
                  const rem = getRemainingSlots(d);
                  return <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)} ({used}/{quota}){rem <= 0 && d !== currentDiff ? ' ✓' : ''}</option>;
                })}
              </select>
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: diffStyle.text, fontSize: 12 }}>▼</div>
            </div>
            <span style={{ fontFamily: 'var(--lms-font)', fontSize: 12, fontWeight: 600, color: remainingSlots > 0 ? diffStyle.text : 'var(--lms-success)' }}>
              {remainingSlots > 0 ? `${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} remaining` : '✓ All slots filled'}
            </span>
            {totalSlots > 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 280 }}>
                <div style={{ flex: 1, height: 6, background: 'var(--lms-bg-surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: diffStyle.text, width: `${Math.min(100, (createdCount / totalSlots) * 100)}%`, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontFamily: 'var(--lms-font)', fontSize: 10, color: 'var(--lms-text-muted)', flexShrink: 0 }}>{createdCount}/{totalSlots}</span>
              </div>
            )}
          </div>
        )}

        {/* BODY */}
        <div style={{ display: 'flex', flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>

          {/* MAIN FORM */}
          <div className="lms-sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--lms-bg-white)' }}>

            {/* Sticky Toolbar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--lms-bg-white)', paddingTop: 8, paddingBottom: 8, marginTop: -8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: dbQuestions[currentIndex]?._id ? 'var(--lms-success)' : 'var(--lms-orange)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 12, fontWeight: 800, fontFamily: 'var(--lms-font)', flexShrink: 0,
                  boxShadow: `0 2px 8px ${dbQuestions[currentIndex]?._id ? 'rgba(22,163,74,0.25)' : 'var(--lms-orange-glow)'}`,
                }}>{currentIndex + 1}</div>

                {/* B I U format buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); toggleBold(); updateFormattingState(); }} className="lms-fmt-btn" style={{ padding: '6px 8px', borderRadius: '6px', border: `1.5px solid ${editorState.isBold ? 'var(--lms-orange)' : 'var(--lms-border)'}`, background: editorState.isBold ? 'var(--lms-orange-light)' : 'var(--lms-bg-white)', color: editorState.isBold ? 'var(--lms-orange)' : 'var(--lms-text-sec)', transition: 'all 0.15s' }} title="Bold (Ctrl+B)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
                  </button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); toggleItalic(); updateFormattingState(); }} className="lms-fmt-btn" style={{ padding: '6px 8px', borderRadius: '6px', border: `1.5px solid ${editorState.isItalic ? 'var(--lms-orange)' : 'var(--lms-border)'}`, background: editorState.isItalic ? 'var(--lms-orange-light)' : 'var(--lms-bg-white)', color: editorState.isItalic ? 'var(--lms-orange)' : 'var(--lms-text-sec)', transition: 'all 0.15s' }} title="Italic (Ctrl+I)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
                  </button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); toggleUnderline(); updateFormattingState(); }} className="lms-fmt-btn" style={{ padding: '6px 8px', borderRadius: '6px', border: `1.5px solid ${editorState.isUnderline ? 'var(--lms-orange)' : 'var(--lms-border)'}`, background: editorState.isUnderline ? 'var(--lms-orange-light)' : 'var(--lms-bg-white)', color: editorState.isUnderline ? 'var(--lms-orange)' : 'var(--lms-text-sec)', transition: 'all 0.15s' }} title="Underline (Ctrl+U)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 4v6a6 6 0 0 0 12 0V4" /><line x1="4" y1="20" x2="20" y2="20" /></svg>
                  </button>
                </div>

                {/* Difficulty pills */}
                {!isGeneral && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {difficultyOptions.map(d => (
                      <button key={d} type="button" onClick={() => { setDifficulty(d); setCurrentDiff(d); }}
                        style={{ padding: '4px 10px', borderRadius: 20, border: `1.5px solid ${difficulty === d ? DS[d].border : 'var(--lms-border)'}`, background: difficulty === d ? DS[d].bg : 'var(--lms-bg-white)', color: difficulty === d ? DS[d].text : 'var(--lms-text-muted)', fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--lms-font)', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.12s' }}>{d}</button>
                    ))}
                  </div>
                )}

                <div style={{ flex: 1 }} />

                {/* Score input */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${errs.score && touched.has('score') ? 'var(--lms-danger)' : isScoreEditable(currentDiff) ? 'var(--lms-orange)' : 'var(--lms-border)'}`, background: errs.score && touched.has('score') ? 'var(--lms-danger-bg)' : isScoreEditable(currentDiff) ? 'var(--lms-orange-light)' : 'var(--lms-bg-white)' }}>
                  <Award size={12} style={{ color: errs.score && touched.has('score') ? 'var(--lms-danger)' : 'var(--lms-orange)', flexShrink: 0 }} />
                  <input type="text" inputMode="numeric" readOnly={!isScoreEditable(currentDiff)} value={displayScore > 0 ? String(displayScore) : (score > 0 ? String(score) : '')} placeholder="0"
                    onChange={e => {
                      if (!isScoreEditable(currentDiff)) return;
                      const r = e.target.value;
                      if (/^\d*\.?\d*$/.test(r)) {
                        const n = parseFloat(r);
                        if (!isNaN(n) && n >= 0) setScore(n);
                        if (r === '') setScore(0);
                      }
                    }} onBlur={() => touch('score')}
                    style={{ width: 36, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, fontWeight: 700, color: errs.score && touched.has('score') ? 'var(--lms-danger)' : 'var(--lms-text-main)', fontFamily: 'var(--lms-font)', textAlign: 'center', lineHeight: 1, padding: 0, margin: 0, cursor: isScoreEditable(currentDiff) ? 'text' : 'default' }} />
                  <span style={{ fontSize: 11, color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)', whiteSpace: 'nowrap', fontWeight: 600 }}>mark</span>
                  {(!isScoreEditable(currentDiff) || isGeneral) && (<span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--lms-font)', padding: '1px 6px', borderRadius: 20, background: 'var(--lms-bg-surface2)', color: 'var(--lms-text-muted)', border: '1px solid var(--lms-border)', marginLeft: 2 }}>Fixed</span>)}
                </div>
              </div>
            </div>

            {/* Problem Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label className="lms-section-label" style={{ margin: 0 }}>Problem Title <span style={{ color: errs.title && touched.has('title') ? 'var(--lms-danger)' : 'var(--lms-text-muted)' }}>*</span></label>
                {errs.title && touched.has('title') && (<span style={{ fontSize: 11, color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>— {errs.title}</span>)}
              </div>
              <div ref={titleRef} contentEditable suppressContentEditableWarning data-placeholder="Enter database question title..."
                onInput={e => { const el = e.currentTarget; setTitle(el.innerText || ''); if (errs.title && el.innerText?.trim()) setErrs(p => { const n = { ...p }; delete n.title; return n; }); }}
                onBlur={() => touch('title')}
                style={{ fontFamily: 'var(--lms-font)', fontSize: 16, fontWeight: 600, lineHeight: 1.5, color: errs.title && touched.has('title') ? 'var(--lms-danger)' : 'var(--lms-text-main)', background: 'transparent', border: 'none', borderBottom: `2px solid ${errs.title && touched.has('title') ? 'var(--lms-danger)' : 'var(--lms-orange)'}`, borderRadius: 0, outline: 'none', width: '100%', padding: '4px 0 6px', minHeight: 36, wordBreak: 'break-word' }} />
            </div>

            {/* Problem Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label className="lms-section-label" style={{ margin: 0 }}>Problem Description <span style={{ color: 'var(--lms-danger)' }}>*</span></label>
                {errs.description && touched.has('description') && (<span style={{ fontSize: 11, color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>— {errs.description}</span>)}
              </div>
              <div onBlur={() => touch('description')}>
                <ProgDescEditor blocks={descBlocks} onChange={blocks => { setDescBlocks(blocks); if (errs.description) setErrs(p => { const n = { ...p }; delete n.description; return n; }); }} hasError={!!(errs.description && touched.has('description'))} />
              </div>
            </div>

            {/* Sample Query */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label className="lms-section-label" style={{ margin: 0 }}>Sample Query <span style={{ color: 'var(--lms-danger)' }}>*</span></label>
                {errs.sampleQuery && touched.has('sampleQuery') && (<span style={{ fontSize: 11, color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>— {errs.sampleQuery}</span>)}
              </div>
              <textarea className={`lms-textarea mono${errs.sampleQuery && touched.has('sampleQuery') ? ' err' : ''}`} rows={5} placeholder="-- Example:\nSELECT employee_id, name, department\nFROM employees\nWHERE salary > 50000;" value={sampleQuery} onChange={e => { setSampleQuery(e.target.value); if (errs.sampleQuery && e.target.value.trim()) setErrs(p => { const n = { ...p }; delete n.sampleQuery; return n; }); }} onBlur={() => touch('sampleQuery')} style={{ borderRadius: 10, fontSize: 12.5, lineHeight: 1.7 }} />
            </div>

            {/* Expected Result */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label className="lms-section-label" style={{ margin: 0 }}>Expected Result <span style={{ color: 'var(--lms-danger)' }}>*</span></label>
                {errs.sampleResult && touched.has('sampleResult') && (<span style={{ fontSize: 11, color: 'var(--lms-danger)', fontFamily: 'var(--lms-font)' }}>— {errs.sampleResult}</span>)}
              </div>
              <div onBlur={() => touch('sampleResult')}>
                <ProgDescEditor blocks={sampleResultBlocks} onChange={blocks => { setSampleResultBlocks(blocks); if (errs.sampleResult) setErrs(p => { const n = { ...p }; delete n.sampleResult; return n; }); }} hasError={!!(errs.sampleResult && touched.has('sampleResult'))} />
              </div>
            </div>

            {/* Constraints */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label className={`lms-section-label${errs.constraints && touched.has('constraints') ? ' lms-label-err' : ''}`} style={{ margin: 0 }}>Constraints</label>
                  {errs.constraints && touched.has('constraints') && (<span style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-danger)' }}>— {errs.constraints}</span>)}
                </div>
                <button onClick={() => setConstraints(p => [...p, ''])} className="lms-btn lms-btn-ghost-orange" style={{ padding: '4px 10px', fontSize: 11 }}><Plus size={11} /> Add</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {constraints.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input value={c} onChange={e => { const a = [...constraints]; a[i] = e.target.value; setConstraints(a); if (errs.constraints && a.some(x => x.trim())) setErrs(p => { const n = { ...p }; delete n.constraints; return n; }); }} placeholder="e.g. Table must have at least 3 rows" className={`lms-input${errs.constraints && touched.has('constraints') ? ' err' : ''}`} style={{ flex: 1 }} />
                    {constraints.length > 1 && (<button onClick={() => setConstraints(p => p.filter((_, idx) => idx !== i))} className="lms-icon-btn lms-icon-btn-red"><Trash2 size={13} /></button>)}
                  </div>
                ))}
              </div>
            </div>

            {/* Hint */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="lms-section-label" style={{ margin: 0 }}>Hint <span style={{ fontWeight: 400, color: 'var(--lms-text-hint)', textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>(Optional)</span></label>
              <textarea className="lms-textarea" rows={2} value={hint} onChange={e => setHint(e.target.value)} placeholder="Give students a helpful hint..." />
            </div>

            {/* Extra Hints */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => setShowExtraHints(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--lms-font)' }}>
                  <span className="lms-section-label" style={{ margin: 0 }}>Additional Hints</span>
                  <span style={{ fontSize: 10.5, color: 'var(--lms-text-muted)', fontWeight: 600 }}>({extraHints.length})</span>
                  {showExtraHints ? <ChevronUp size={13} style={{ color: 'var(--lms-text-muted)', marginLeft: 2 }} /> : <ChevronDown size={13} style={{ color: 'var(--lms-text-muted)', marginLeft: 2 }} />}
                </button>
                <button type="button" onClick={() => { setExtraHints(p => [...p, { hintText: '', pointsDeduction: 0, isPublic: true }]); setShowExtraHints(true); }} className="lms-btn lms-btn-ghost-orange" style={{ padding: '4px 10px', fontSize: 11 }}><Plus size={11} /> Add Hint</button>
              </div>
              {showExtraHints && extraHints.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {extraHints.map((h, i) => (
                    <div key={i} style={{ border: '1.5px solid var(--lms-border)', borderRadius: 'var(--lms-radius-md)', padding: 12, background: 'var(--lms-bg-surface)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontFamily: 'var(--lms-font)', fontSize: 11, fontWeight: 700, color: 'var(--lms-text-sec)' }}>Hint {i + 2}</span>
                        <button type="button" onClick={() => setExtraHints(p => p.filter((_, idx) => idx !== i))} style={{ fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                      </div>
                      <textarea className="lms-textarea" rows={2} value={h.hintText} onChange={e => setExtraHints(p => p.map((x, idx) => idx === i ? { ...x, hintText: e.target.value } : x))} placeholder="Hint text..." />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-text-sec)' }}>Deduction: <input type="number" min="0" value={h.pointsDeduction} onChange={e => setExtraHints(p => p.map((x, idx) => idx === i ? { ...x, pointsDeduction: parseInt(e.target.value) || 0 } : x))} style={{ width: 40, padding: '2px 6px', borderRadius: 5, border: '1.5px solid var(--lms-border)', fontSize: 12, fontFamily: 'var(--lms-font)', outline: 'none' }} /> pts</div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--lms-font)', fontSize: 11, color: 'var(--lms-text-sec)', cursor: 'pointer', userSelect: 'none' }}><input type="checkbox" checked={h.isPublic} onChange={e => setExtraHints(p => p.map((x, idx) => idx === i ? { ...x, isPublic: e.target.checked } : x))} style={{ width: 12, height: 12, accentColor: 'var(--lms-orange)' }} /> Public</label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validation errors */}
            {Object.keys(errs).length > 0 && touched.size > 0 && (
              <div style={{ padding: '12px 14px', background: 'var(--lms-danger-bg)', border: '1.5px solid var(--lms-danger-bdr)', borderRadius: 'var(--lms-radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><AlertCircle size={14} style={{ color: 'var(--lms-danger)' }} /><span style={{ fontFamily: 'var(--lms-font)', fontSize: 12, fontWeight: 700, color: 'var(--lms-danger)' }}>Fix before saving:</span></div>
                <ul style={{ marginLeft: 16, listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: 4 }}>{Object.values(errs).map((e, i) => (<li key={i} style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: 'var(--lms-danger)' }}>{e}</li>))}</ul>
              </div>
            )}

            <div style={{ height: 8 }} />
          </div>

          {/* RIGHT SIDEBAR — same order as programming form */}
          <div style={{ width: 272, flexShrink: 0, borderLeft: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-white)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="lms-sidebar-scroll" style={{ flex: 1, overflowY: 'auto' }}>

              {/* 1. Exercise Details */}
              <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-info-bdr)', background: 'var(--lms-info-bg)' }}>
                <div className="lms-sidebar-section-title"><FileText size={14} style={{ color: 'var(--lms-info)' }} />Exercise Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {exerciseData?.fullExerciseData?.exerciseInformation?.exerciseId && (<div className="lms-detail-row"><span className="lms-detail-label">Exercise ID</span><span className="lms-detail-value" style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--lms-violet)', fontSize: '12px' }}>{exerciseData.fullExerciseData.exerciseInformation.exerciseId}</span></div>)}
                  <div className="lms-detail-row"><span className="lms-detail-label">Exercise Name</span><span className="lms-detail-value" style={{ color: 'var(--lms-orange)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>{exerciseName || 'Untitled'}</span></div>
                  <div className="lms-detail-row"><span className="lms-detail-label">Exercise Type</span><span className="lms-detail-value" style={{ fontSize: '12px' }}>{exerciseType}</span></div>
                  <div className="lms-detail-row"><span className="lms-detail-label">Module Type</span><span className="lms-detail-value" style={{ fontSize: '12px' }}>Database</span></div>
                  <div className="lms-detail-row"><span className="lms-detail-label">Configuration</span><span className="lms-detail-value" style={{ fontSize: '12px' }}>{isGeneral ? 'General' : cfgType === 'levelBased' ? 'Level Based' : 'Selection Level'}</span></div>
                  {!isGeneral && (<div className="lms-detail-row"><span className="lms-detail-label">Current Difficulty</span><span className="lms-detail-value" style={{ color: diffStyle.text, textTransform: 'capitalize', fontSize: '12px' }}>{currentDiff}</span></div>)}
                </div>
              </div>

              {/* 2. Question Quota · diff Level (orange-50) — FIRST like programming */}
              <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-orange-100)', background: 'var(--lms-orange-50)' }}>
                <div className="lms-sidebar-section-title"><Hash size={14} style={{ color: 'var(--lms-orange)' }} /><span className="lms-detail-value" style={{ textTransform: 'capitalize', fontSize: '12px' }}>Question Quota · {isGeneral ? '(General)' : `${currentDiff} Level`}</span></div>
                <div>
                  <div className="lms-marks-row"><span className="lms-marks-label">Total Questions</span><span className="lms-marks-value">{totalSlots}</span></div>
                  <div className="lms-marks-row"><span className="lms-marks-label">Questions Created</span><span className="lms-marks-value" style={{ color: 'var(--lms-violet)' }}>{createdCount}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalSlots}</span></span></div>
                  <div className="lms-marks-row"><span className="lms-marks-label">Remaining Questions</span><span className="lms-marks-value" style={{ color: remainingSlots === 0 ? 'var(--lms-success)' : 'var(--lms-warning)' }}>{remainingSlots}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalSlots}</span></span></div>
                </div>
                {totalSlots > 0 && (<div className="lms-progress-bar"><div className="lms-progress-fill" style={{ width: `${Math.min(100, (createdCount / totalSlots) * 100)}%`, background: remainingSlots === 0 ? 'var(--lms-success)' : 'var(--lms-orange)' }} /></div>)}
              </div>

              {/* 3. Question Overview (surface) — only multi-diff, like programming */}
              {(!isGeneral && getConfiguredDiffs().length > 1) && (
                <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-surface)' }}>
                  <div className="lms-sidebar-section-title"><BarChart3 size={14} style={{ color: 'var(--lms-text-sec)' }} />Question Overview</div>
                  <div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Total Questions</span><span className="lms-marks-value">{totalSlotsAll}</span></div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Questions Created</span><span className="lms-marks-value" style={{ color: 'var(--lms-violet)' }}>{createdCountAll}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalSlotsAll}</span></span></div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Remaining Questions</span><span className="lms-marks-value" style={{ color: remainingSlotsAll === 0 ? 'var(--lms-success)' : 'var(--lms-warning)' }}>{remainingSlotsAll}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalSlotsAll}</span></span></div>
                  </div>
                  {totalSlotsAll > 0 && (<div className="lms-progress-bar"><div className="lms-progress-fill" style={{ width: `${Math.min(100, (createdCountAll / totalSlotsAll) * 100)}%`, background: remainingSlotsAll === 0 ? 'var(--lms-success)' : 'var(--lms-orange)' }} /></div>)}
                </div>
              )}

              {/* 4. Marks Allocation · diff Level (orange-50) — like programming */}
              <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-orange-100)', background: 'var(--lms-orange-50)' }}>
                <div className="lms-sidebar-section-title"><Award size={14} style={{ color: 'var(--lms-orange)' }} /><span style={{ textTransform: 'capitalize' }}>Marks Allocation · {isGeneral ? '(General)' : `${currentDiff} Level`}</span></div>
                <div>
                  {!isGeneral && totalMarksForDiff > 0 && (<div className="lms-marks-row"><span className="lms-marks-label">Level Total</span><span className="lms-marks-value" style={{ color: 'var(--lms-text-main)', fontSize: '12px' }}>{totalMarksForDiff}</span></div>)}
                  <div className="lms-marks-row"><span className="lms-marks-label">Marks per Question</span><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="lms-marks-value" style={{ color: 'var(--lms-orange)', fontSize: '12px' }}>{displayScore}</span>{isScoreEditable(currentDiff) ? <span className="lms-badge lms-badge-violet" style={{ fontSize: '10px', padding: '2px 6px' }}>Custom</span> : <span className="lms-badge" style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--lms-bg-surface)', color: 'var(--lms-text-muted)', borderColor: 'var(--lms-border)' }}>Fixed</span>}</div></div>
                  {!isGeneral && totalMarksForDiff > 0 && (<>
                    <div className="lms-marks-row"><span className="lms-marks-label">Marks Used</span><span className="lms-marks-value" style={{ color: 'var(--lms-warning)', fontSize: '12px' }}>{usedMarks.toFixed(2)}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalMarksForDiff}</span></span></div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Remaining</span><span className="lms-marks-value" style={{ color: remainingMarks <= 0 ? 'var(--lms-success)' : 'var(--lms-violet)', fontSize: '12px' }}>{Math.max(0, remainingMarks).toFixed(2)}</span></div>
                  </>)}
                </div>
                {!isGeneral && totalMarksForDiff > 0 && (<div className="lms-progress-bar"><div className="lms-progress-fill" style={{ width: `${Math.min(100, (usedMarks / totalMarksForDiff) * 100)}%`, background: usedMarks >= totalMarksForDiff ? 'var(--lms-success)' : 'var(--lms-orange)' }} /></div>)}
              </div>

              {/* 5. Marks Allocation Overview (surface) — only multi-diff, like programming */}
              {(!isGeneral && getConfiguredDiffs().length > 1) && (
                <div style={{ padding: '14px 16px', borderBottom: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-surface)' }}>
                  <div className="lms-sidebar-section-title"><Award size={14} style={{ color: 'var(--lms-text-sec)' }} />Marks Allocation Overview</div>
                  <div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Total Marks</span><span className="lms-marks-value">{totalMarksAll}</span></div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Marks Used</span><span className="lms-marks-value" style={{ color: 'var(--lms-warning)' }}>{usedMarksAll.toFixed(2)}<span style={{ color: 'var(--lms-text-hint)', fontWeight: 400, fontSize: 11 }}>/{totalMarksAll}</span></span></div>
                    <div className="lms-marks-row"><span className="lms-marks-label">Remaining</span><span className="lms-marks-value" style={{ color: Math.max(0, totalMarksAll - usedMarksAll) === 0 ? 'var(--lms-success)' : 'var(--lms-violet)' }}>{Math.max(0, totalMarksAll - usedMarksAll).toFixed(2)}</span></div>
                    {getConfiguredDiffs().map(d => (<div key={d} className="lms-marks-row"><span className="lms-marks-label" style={{ textTransform: 'capitalize' }}>{d}</span><span className="lms-marks-value" style={{ color: 'var(--lms-text-sec)', fontSize: '12px' }}>{getTotalMarksForDiff(d)}</span></div>))}
                  </div>
                  {totalMarksAll > 0 && (<div className="lms-progress-bar"><div className="lms-progress-fill" style={{ width: `${Math.min(100, (usedMarksAll / totalMarksAll) * 100)}%`, background: usedMarksAll >= totalMarksAll ? 'var(--lms-success)' : 'var(--lms-orange)' }} /></div>)}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* FOOTER — exact same layout as programming form */}
        <div style={{ background: 'var(--lms-bg-white)', borderTop: '1.5px solid var(--lms-border)', padding: '12px 20px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, flexShrink: 0 }}>

          {/* Left: saving indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isSaving && (<><Loader2 size={13} style={{ color: 'var(--lms-orange)' }} className="animate-spin" /><span style={{ fontFamily: 'var(--lms-font)', fontSize: 12, color: 'var(--lms-orange)' }}>{saveMessage || 'Saving…'}</span><div style={{ width: 80, height: 4, background: 'var(--lms-bg-surface2)', borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}><div style={{ height: '100%', background: 'var(--lms-orange)', borderRadius: 2, transition: 'width 0.3s', width: `${saveProgress}%` }} /></div></>)}
            {saveOk && !isSaving && (<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'var(--lms-success-bg)', border: '1.5px solid var(--lms-success-bdr)' }}><Check size={13} style={{ color: 'var(--lms-success)' }} /><span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--lms-success)', fontFamily: 'var(--lms-font)' }}>Saved!</span></div>)}
          </div>

          {/* Center: action buttons — identical to programming form */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Previous */}
            {currentIndex > 0 && (
              <button onClick={handlePrevious} disabled={isSaving} className="lms-nav-btn" style={{ opacity: isSaving ? 0.5 : 1 }}>
                <ChevronLeft size={13} /> Previous
              </button>
            )}

            {/* Next — show when not on last question in flow */}
            {currentIndex < dbQuestions.length - 1 && (
              <button onClick={handleNext} disabled={isSaving} className="lms-nav-btn" style={{ opacity: isSaving ? 0.5 : 1 }}>
                Next <ChevronRight size={13} />
              </button>
            )}

            {/* Save — slate style like programming form */}
            <button onClick={handleSave} disabled={isSaving} className="lms-btn lms-btn-slate" style={{ opacity: isSaving ? 0.5 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>

            {/* Save & Continue / Save & Finish */}
            <button onClick={handleSaveAndContinue} disabled={isSaving} className="lms-btn lms-btn-orange"
              style={{
                opacity: isSaving ? 0.6 : 1, cursor: isSaving ? 'not-allowed' : 'pointer',
                background: isLastQuestion ? 'var(--lms-success)' : 'var(--lms-orange)',
                boxShadow: isLastQuestion ? '0 2px 8px rgba(22,163,74,0.25)' : '0 2px 8px var(--lms-orange-glow)',
              }}>
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : isLastQuestion ? <CheckCircle2 size={13} /> : <Zap size={13} />}
              {isLastQuestion
                ? (getServerId(dbQuestions[currentIndex]) ? 'Update & Finish' : 'Save & Finish')
                : (getServerId(dbQuestions[currentIndex]) ? 'Update & Continue' : 'Save & Continue')}
              {isLastQuestion ? <Flag size={11} /> : <ArrowRight size={11} />}
            </button>

            {/* Delete */}
            {dbQuestions.length > 0 && (
              <button onClick={() => setShowDeleteConfirm(true)} disabled={isSaving} className="lms-btn"
                style={{ background: 'var(--lms-danger-bg)', color: 'var(--lms-danger)', borderColor: 'var(--lms-danger-bdr)', opacity: isSaving ? 0.5 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                <Trash2 size={12} /> Delete
              </button>
            )}

            {/* Clear */}
            {anyFormFieldHasContent && (
              <button onClick={() => setShowClearConfirm(true)} disabled={isSaving} className="lms-btn"
                style={{ background: 'var(--lms-warning-bg)', color: 'var(--lms-warning)', borderColor: 'var(--lms-warning-bdr)', opacity: isSaving ? 0.5 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {/* Right: Mock + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowMockModal(true)} disabled={!isMockEnabled}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 14px', borderRadius: 'var(--lms-radius-md)', fontFamily: 'var(--lms-font)', fontSize: 12, fontWeight: 600, cursor: isMockEnabled ? 'pointer' : 'not-allowed', border: `1.5px solid ${isMockEnabled ? 'var(--lms-violet-bdr)' : 'var(--lms-border)'}`, background: isMockEnabled ? 'var(--lms-violet-bg)' : 'var(--lms-bg-surface)', color: isMockEnabled ? 'var(--lms-violet)' : 'var(--lms-text-hint)', transition: 'all 0.15s', opacity: isMockEnabled ? 1 : 0.55 }}>
              <Eye size={13} /> Mock
            </button>
            <button type="button" onClick={handleCloseRequest}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 14px', borderRadius: 'var(--lms-radius-md)', fontFamily: 'var(--lms-font)', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-white)', color: 'var(--lms-text-sec)', transition: 'all 0.15s' }}>
              <X size={13} /> Close
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showPreview && (
        <PreviewModal
          questions={dbQuestions.filter(q => q.isSaved || q._id || serverIdMap.current.has(q.__localId))}
          currentIndex={currentIndex}
          onJump={handleJumpTo}
          onDelete={handleDeleteQuestion}
          onClose={() => setShowPreview(false)}
          onDone={handleCloseRequest}
          hierarchyData={hierarchyData}
          tabType={tabType}
          exerciseName={exerciseName}
          currentDiff={currentDiff}
          totalSlots={totalSlots}
          createdCount={createdCount}
          remainingSlots={remainingSlots}
          totalSlotsAll={totalSlotsAll}
          createdCountAll={createdCountAll}
          remainingSlotsAll={remainingSlotsAll}
          totalMarksAll={totalMarksAll}
          usedMarksAll={usedMarksAll}
          displayScore={displayScore}
          isGeneral={isGeneral}
          cfgType={cfgType}
          exerciseData={exerciseData}
          isScoreEditable={isScoreEditable}
          getConfiguredDiffs={getConfiguredDiffs}
          getTotalMarksForDiff={getTotalMarksForDiff}
          usedMarks={usedMarks}
          remainingMarks={remainingMarks}
          totalMarksForDiff={totalMarksForDiff}
        />
      )}

      {showMockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,46,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 12 }}>
          <div style={{ width: '96vw', maxWidth: 1400, height: '96vh', display: 'flex', flexDirection: 'column', background: 'var(--lms-bg-white)', borderRadius: 'var(--lms-radius-lg)', border: '1.5px solid var(--lms-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1.5px solid var(--lms-border)', background: 'var(--lms-bg-white)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--lms-violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Eye size={16} style={{ color: 'white' }} /></div>
                <div style={{ width: 1, height: 20, background: 'var(--lms-border)', flexShrink: 0 }} />
                <nav style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 0 }}>
                  {hierarchyData.courseName && (<><span className="lms-crumb" style={{ color: 'var(--lms-text-muted)' }}>{hierarchyData.courseName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                  {exerciseName && (<><span className="lms-crumb" style={{ color: 'var(--lms-text-muted)' }}>{exerciseName}</span><span className="lms-breadcrumb-sep">›</span></>)}
                  <span className="lms-crumb" style={{ color: 'var(--lms-violet)' }}>Mock Preview</span>
                </nav>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
                <button type="button" onClick={() => setShowMockModal(false)} style={{ padding: 8, borderRadius: 8, border: '1.5px solid var(--lms-danger-bdr)', background: 'var(--lms-danger-bg)', cursor: 'pointer' }}><X size={15} style={{ color: 'var(--lms-danger)' }} /></button>
              </div>
            </div>
            <div style={{ padding: '5px 20px', background: 'var(--lms-info-bg)', borderBottom: '1.5px solid var(--lms-info-bdr)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Eye size={11} style={{ color: 'var(--lms-info)' }} />
              <span style={{ fontFamily: 'var(--lms-font)', fontSize: 10.5, fontWeight: 700, color: 'var(--lms-info)', letterSpacing: 0.4, textTransform: 'uppercase' }}>Mock Preview — Read Only</span>
            </div>
            <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="lms-sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(() => {
                  const currentQ = dbQuestions[currentIndex];
                  if (!currentQ) return <p>No question selected</p>;
                  const descBlocksArray = Array.isArray(currentQ.description) ? currentQ.description : descToBlocks(currentQ.description);
                  const srBlocksArray = Array.isArray(currentQ.sampleResult) ? currentQ.sampleResult : descToBlocks(currentQ.sampleResult);
                  const dsStyle = DS[currentQ.difficulty] || DS.medium;
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: dsStyle.bg, border: `1.5px solid ${dsStyle.border}`, color: dsStyle.text, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', fontFamily: 'var(--lms-font)' }}>{currentQ.difficulty}</span>
                        <span style={{ fontSize: 11, color: 'var(--lms-text-muted)', fontFamily: 'var(--lms-font)' }}>{currentQ.score} mark{currentQ.score !== 1 ? 's' : ''}</span>
                      </div>
                      <h2 style={{ fontFamily: 'var(--lms-font)', fontSize: 20, fontWeight: 700, color: 'var(--lms-text-main)', margin: 0, lineHeight: 1.4 }}>{currentQ.title || 'Untitled Question'}</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {descBlocksArray.map((b: any, bi: number) => {
                          if (b.type === 'text' && b.value?.trim()) return <p key={bi} style={{ fontFamily: 'var(--lms-font)', fontSize: 14, color: 'var(--lms-text-sec)', lineHeight: 1.75, margin: 0 }} dangerouslySetInnerHTML={{ __html: b.value }} />;
                          if (b.type === 'image') return (<div key={bi} style={{ display: 'flex', justifyContent: b.alignment === 'right' ? 'flex-end' : b.alignment === 'center' ? 'center' : 'flex-start' }}><img src={b.url} alt="" style={{ width: `${b.sizePercent || 70}%`, borderRadius: 8, border: '1px solid var(--lms-border)' }} /></div>);
                          if (b.type === 'code') { const isDk = ['#1e1e1e', '#282a36', '#272822'].includes(b.bgColor); return <pre key={bi} style={{ background: b.bgColor || '#f5f5f5', color: isDk ? '#d4d4d4' : '#1a1a2e', fontFamily: 'ui-monospace,monospace', fontSize: 12.5, padding: '14px 16px', borderRadius: 10, overflowX: 'auto', margin: 0, lineHeight: 1.6 }}>{b.value}</pre>; }
                          return null;
                        })}
                      </div>
                      {currentQ.sampleQuery && (<div><h4 style={{ fontFamily: 'var(--lms-font)', fontSize: 10.5, fontWeight: 700, color: 'var(--lms-text-main)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 0 }}>Sample Query</h4><pre style={{ background: '#1e1e1e', color: '#d4d4d4', border: '1.5px solid var(--lms-border)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, fontFamily: 'ui-monospace, monospace', overflowX: 'auto', lineHeight: 1.6, margin: 0 }}>{currentQ.sampleQuery}</pre></div>)}
                      {srBlocksArray.some((b: any) => (b.type === 'text' && b.value?.trim()) || b.type === 'image') && (<div><h4 style={{ fontFamily: 'var(--lms-font)', fontSize: 10.5, fontWeight: 700, color: 'var(--lms-text-main)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 0 }}>Expected Result</h4><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{srBlocksArray.map((b: any, bi: number) => { if (b.type === 'text' && b.value?.trim()) return <pre key={bi} style={{ background: '#f0fdf4', border: '1.5px solid var(--lms-success-bdr)', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'ui-monospace, monospace', color: 'var(--lms-text-main)', overflowX: 'auto', lineHeight: 1.6, margin: 0 }}>{b.value}</pre>; if (b.type === 'image') return (<div key={bi} style={{ display: 'flex', justifyContent: b.alignment === 'right' ? 'flex-end' : b.alignment === 'center' ? 'center' : 'flex-start' }}><img src={b.url} alt="" style={{ width: `${b.sizePercent || 70}%`, borderRadius: 8, border: '1px solid var(--lms-success-bdr)' }} /></div>); return null; })}</div></div>)}
                      {currentQ.constraints?.filter((c: string) => c.trim()).length > 0 && (<div><h4 style={{ fontFamily: 'var(--lms-font)', fontSize: 10.5, fontWeight: 700, color: 'var(--lms-text-main)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 0 }}>Constraints</h4><ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>{currentQ.constraints.filter((c: string) => c.trim()).map((c: string, i: number) => (<li key={i} style={{ fontSize: 13, color: 'var(--lms-text-sec)', fontFamily: 'var(--lms-font)', lineHeight: 1.6 }}>{c}</li>))}</ul></div>)}
                    </>
                  );
                })()}
              </div>
              <div style={{ width: '50%', maxWidth: 720, borderLeft: '1.5px solid var(--lms-border)', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1.5px solid #1e293b', background: '#0f172a', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: 8, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Terminal size={14} style={{ color: 'white' }} /></div><span style={{ fontFamily: 'var(--lms-font)', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>SQL Editor</span><span style={{ fontSize: 10.5, fontFamily: 'var(--lms-font)', fontWeight: 600, color: '#64748b', padding: '2px 7px', borderRadius: 20, border: '1px solid #1e293b', background: '#1e293b' }}>Execution Sandbox</span></div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ flex: '0 0 55%', position: 'relative', borderBottom: '1.5px solid #1e293b', overflow: 'hidden' }}>
                    <textarea value={sqlQuery} onChange={e => setSqlQuery(e.target.value)} placeholder="-- Write your SQL query here..." spellCheck={false} style={{ width: '100%', height: '100%', padding: '14px 16px', border: 'none', outline: 'none', resize: 'none', background: '#0d1117', color: '#e2e8f0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', fontSize: 13.5, lineHeight: 1.7, boxSizing: 'border-box', letterSpacing: '0.02em' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1.5px solid #1e293b', background: '#0f172a', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" className="dbq-run-btn" onClick={runQuery} disabled={!sqlQuery.trim() || sqlOutput.type === 'running'}>{sqlOutput.type === 'running' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running…</> : <><Play size={13} /> Run Query</>}</button>
                      <button type="button" onClick={() => setSqlOutput({ type: 'idle' })} style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #1e3a5f', background: 'transparent', color: '#64748b', fontSize: 11.5, fontFamily: 'var(--lms-font)', fontWeight: 600, cursor: 'pointer' }}>Clear</button>
                    </div>
                    {sqlOutput.type === 'result' && sqlOutput.time && (<span style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--lms-font)' }}>⏱ {sqlOutput.time}ms</span>)}
                  </div>
                  <div className="lms-sidebar-scroll" style={{ flex: 1, overflowY: 'auto', background: '#0d1117' }}>
                    {sqlOutput.type === 'idle' && (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, opacity: 0.4 }}><Database size={28} style={{ color: '#475569' }} /><span style={{ fontSize: 12, fontFamily: 'var(--lms-font)', color: '#475569' }}>Run a query to see results</span></div>)}
                    {sqlOutput.type === 'running' && (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}><Loader2 size={18} style={{ color: '#16a34a', animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: 12, fontFamily: 'var(--lms-font)', color: '#64748b' }}>Executing query…</span></div>)}
                    {sqlOutput.type === 'result' && (<div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>{sqlOutput.message && (<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7, background: '#064e3b', border: '1px solid #065f46' }}><Check size={13} style={{ color: '#4ade80', flexShrink: 0 }} /><span style={{ fontSize: 12, fontFamily: 'var(--lms-font)', color: '#4ade80', fontWeight: 600 }}>{sqlOutput.message}</span></div>)}{sqlOutput.rows && sqlOutput.columns && sqlOutput.rows.length > 0 && (<div style={{ border: '1px solid #1e3a5f', borderRadius: 8, overflow: 'hidden' }}><div style={{ padding: '5px 10px', background: '#1e293b', display: 'flex', alignItems: 'center', gap: 5, borderBottom: '1px solid #1e3a5f' }}><Table size={12} style={{ color: '#93c5fd' }} /><span style={{ fontSize: 11, fontFamily: 'var(--lms-font)', color: '#93c5fd', fontWeight: 700 }}>Result Set — {sqlOutput.rows.length} row{sqlOutput.rows.length !== 1 ? 's' : ''}</span></div><SqlResultTable rows={sqlOutput.rows} columns={sqlOutput.columns} /></div>)}</div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <DeleteConfirmDialog questionTitle={title || 'this question'} onConfirm={handleDeleteCurrentQuestion} onCancel={() => setShowDeleteConfirm(false)} />
      )}

      {showClearConfirm && (
        <ClearConfirmDialog onConfirm={handleClearCurrentQuestion} onCancel={() => setShowClearConfirm(false)} />
      )}

      {showCloseConfirm && (
        <CloseConfirmDialog hasUnsavedChanges={hasUnsavedFormChanges} hasSavedQuestions={hasSavedQuestionsInSession} onConfirm={handleCloseConfirmed} onCancel={() => setShowCloseConfirm(false)} />
      )}
    </div>
  );
};

export default DatabaseQuestionForm;