// QuestionsTest.tsx - Fixed version with Assessment.tsx-matching Add Question flow

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, Plus, MoreVertical, Edit2, Trash2,
  List, X, AlertTriangle, Code, CheckCircle,
  Layers, ChevronLeft, ChevronRight, FlaskConical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AddQuestionForm from '@/app/lms/component/student/YouDo/assessment/questionforms/AddQuestionForm';
import { exerciseApi } from '@/apiServices/exercise';
import { questionApi } from '@/apiServices/question';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  blue: "#6366f1",
  blueDark: "#4f46e5",
  blueLight: "rgba(99,102,241,0.08)",
  blueMid: "rgba(99,102,241,0.15)",
  blueGlow: "rgba(99,102,241,0.22)",
  textMain: "#1a1a2e",
  textSub: "#6b6b7e",
  textMuted: "#8b8b9e",
  textHint: "#bcbccc",
  border: "#ece9f1",
  bg: "#ffffff",
  pageBg: "#faf9fc",
  warm: "#f5f3ff",
  red: "#ef4444",
  redLight: "rgba(239,68,68,0.1)",
  emerald: "#10b981",
  amber: "#f59e0b",
};

interface Question {
  _id: string;
  questionType: 'mcq' | 'programming' | 'frontend' | 'database';
  questionTitle?: string | any[];
  title?: string;
  description?: string | any[];
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number;
  score?: number;
  mcqQuestionScore?: number;
  mcqQuestionTitle?: string | any[];
  mcqQuestionDescription?: string | any[];
  sectionId?: string;
  sectionName?: string;
  isActive: boolean;
  sequence: number;
}

interface QuestionsTestProps {
  assessment: any;
  onBack: () => void;
  nodeId: string;
  nodeName: string;
  subcategory: string;
  nodeType: string;
  tabType: string;
  hierarchyData: any;
}

// Helper: Extract plain text from content blocks (rich text format)
const extractPlainText = (content: string | any[] | undefined): string => {
  if (!content) return '';
  if (typeof content === 'string') return content.replace(/<[^>]*>/g, '').trim();
  if (Array.isArray(content)) {
    return content
      .filter((block: any) => block.type === 'text' && block.value)
      .map((block: any) => (typeof block.value === 'string' ? block.value : '').replace(/<[^>]*>/g, '').trim())
      .join(' ')
      .trim();
  }
  return '';
};

// ─── Section Picker Modal (ported from Assessment.tsx) ────────────────────────
const SectionPickerModal: React.FC<{
  exercise: any;
  onClose: () => void;
  onPick: (sectionCfg: any, sectionMeta: any) => void;
}> = ({ exercise, onClose, onPick }) => {
  const sectionConfigs = exercise?.sectionConfigs || {};
  const allQuestions: any[] = exercise?.questions || [];

  const countBySectionId: Record<string, { mcq: number; programming: number }> = {};
  allQuestions.forEach((q: any) => {
    if (q.sectionId) {
      if (!countBySectionId[q.sectionId]) countBySectionId[q.sectionId] = { mcq: 0, programming: 0 };
      if (q.questionType === 'mcq') countBySectionId[q.sectionId].mcq++;
      if (q.questionType === 'programming') countBySectionId[q.sectionId].programming++;
    }
  });

  const sections: any[] = Object.keys(sectionConfigs)
    .map((key) => {
      const cfg = sectionConfigs[key] || {};
      const sectionId = cfg.id || key;
      const exerciseType: string = cfg.exerciseType || 'MCQ';
      const counts = countBySectionId[sectionId] || { mcq: 0, programming: 0 };

      const mcqLimit = cfg.mcqConfig?.generalQuestionCount || 0;
      const mcqCount = counts.mcq;
      const mcqFull = mcqLimit > 0 && mcqCount >= mcqLimit;

      const pc = cfg.programmingConfig || {};
      let progLimit = 0;
      if (pc.questionConfigType === 'general') {
        progLimit = pc.generalQuestionCount || 0;
      } else {
        const lb = pc.levelBasedCounts || {};
        progLimit = (lb.easy || 0) + (lb.medium || 0) + (lb.hard || 0);
      }
      const progCount = counts.programming;
      const progFull = progLimit > 0 && progCount >= progLimit;

      let isFull = false;
      if (exerciseType === 'MCQ') isFull = mcqFull;
      if (exerciseType === 'Programming') isFull = progFull;
      if (exerciseType === 'Combined') isFull = mcqFull && progFull;

      return {
        id: sectionId, name: cfg.name || key, order: cfg.sectionNumber ?? 0,
        totalMarks: cfg.totalMarks ?? 0, description: cfg.description || '',
        exerciseType, mcqLimit, mcqCount, mcqFull, progLimit, progCount, progFull, isFull,
        _cfg: cfg,
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const typeMeta: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    MCQ: { label: "MCQ", color: "#6366f1", bg: "rgba(99,102,241,0.10)", icon: <List size={11} /> },
    Programming: { label: "Programming", color: "#059669", bg: "rgba(5,150,105,0.10)", icon: <Code size={11} /> },
    Combined: { label: "Combined", color: "#8b5cf6", bg: "rgba(139,92,246,0.10)", icon: <Layers size={11} /> },
    Other: { label: "Other", color: "#f59e0b", bg: "rgba(245,158,11,0.10)", icon: <FlaskConical size={11} /> },
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
        style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: T.border, background: T.blueLight }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.bg }}>
              <Layers size={15} style={{ color: T.blue }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: T.textMain }}>Select Section</h3>
              <p className="text-[10.5px]" style={{ color: T.textMuted }}>
                {exercise?.exerciseInformation?.exerciseName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white">
            <X size={15} style={{ color: T.textMuted }} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto" style={{ background: T.pageBg }}>
          {sections.length === 0 ? (
            <div className="text-center py-10 text-xs" style={{ color: T.textMuted }}>No sections found.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {sections.map((sec: any, idx: number) => {
                const tm = typeMeta[sec.exerciseType] || typeMeta.MCQ;
                return (
                  <button
                    key={sec.id || idx}
                    onClick={() => !sec.isFull && onPick(sec._cfg, sec)}
                    disabled={sec.isFull}
                    className="text-left p-3 rounded-xl flex items-center gap-3 transition-all"
                    style={{
                      background: sec.isFull ? '#f9f9fb' : T.bg,
                      border: `1px solid ${sec.isFull ? '#e0e0e0' : T.border}`,
                      cursor: sec.isFull ? 'not-allowed' : 'pointer',
                      opacity: sec.isFull ? 0.65 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!sec.isFull) {
                        (e.currentTarget as HTMLElement).style.borderColor = T.blue;
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${T.blueGlow}`;
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = sec.isFull ? '#e0e0e0' : T.border;
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-extrabold"
                      style={{ background: sec.isFull ? '#efefef' : T.blueLight, color: sec.isFull ? T.textMuted : T.blue }}>
                      {sec.order || idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12.5px] font-bold truncate" style={{ color: sec.isFull ? T.textMuted : T.textMain }}>
                          {sec.name}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex-shrink-0"
                          style={{ background: tm.bg, color: tm.color }}>
                          {tm.icon}{tm.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sec.mcqLimit > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                            style={{ background: sec.mcqFull ? '#fee2e2' : 'rgba(99,102,241,0.08)', color: sec.mcqFull ? T.red : '#6366f1' }}>
                            <List size={8} />MCQ {sec.mcqCount}/{sec.mcqLimit}{sec.mcqFull && ' ✓'}
                          </span>
                        )}
                        {sec.progLimit > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                            style={{ background: sec.progFull ? '#fee2e2' : 'rgba(5,150,105,0.08)', color: sec.progFull ? T.red : '#059669' }}>
                            <Code size={8} />Prog {sec.progCount}/{sec.progLimit}{sec.progFull && ' ✓'}
                          </span>
                        )}
                        <span className="text-[9px]" style={{ color: T.textMuted }}>{sec.totalMarks} marks</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {sec.isFull ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black"
                          style={{ background: '#fee2e2', color: T.red }}>Full</span>
                      ) : (
                        <ChevronRight size={14} style={{ color: T.textHint }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Type Picker Modal (ported from Assessment.tsx) ───────────────────────────
const TypePickerModal: React.FC<{
  section: any;
  onClose: () => void;
  onBack: () => void;
  onPick: (type: 'MCQ' | 'Programming') => void;
}> = ({ section, onClose, onBack, onPick }) => {
  const mcqFull = section?.mcqFull || false;
  const progFull = section?.progFull || false;
  const mcqCount = section?.mcqCount || 0;
  const mcqLimit = section?.mcqLimit || 0;
  const progCount = section?.progCount || 0;
  const progLimit = section?.progLimit || 0;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: T.border, background: 'rgba(139,92,246,0.10)' }}>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 rounded-lg hover:bg-white" title="Back">
              <ChevronLeft size={14} style={{ color: T.textMuted }} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.bg }}>
              <Layers size={15} style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: T.textMain }}>Question Type</h3>
              <p className="text-[10.5px]" style={{ color: T.textMuted }}>Section: {section?.name} (Combined)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white">
            <X size={15} style={{ color: T.textMuted }} />
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3" style={{ background: T.pageBg }}>
          {/* MCQ */}
          <button
            onClick={() => !mcqFull && onPick('MCQ')}
            disabled={mcqFull}
            className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all relative"
            style={{
              background: mcqFull ? '#f9f9fb' : T.bg,
              border: `1px solid ${mcqFull ? '#e0e0e0' : T.border}`,
              cursor: mcqFull ? 'not-allowed' : 'pointer',
              opacity: mcqFull ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!mcqFull) { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.22)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = mcqFull ? '#e0e0e0' : T.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            {mcqFull && (
              <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: '#fee2e2', color: T.red }}>Full</span>
            )}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: mcqFull ? '#efefef' : 'rgba(99,102,241,0.10)' }}>
              <List size={22} style={{ color: mcqFull ? T.textMuted : '#6366f1' }} />
            </div>
            <div className="text-[12px] font-bold" style={{ color: mcqFull ? T.textMuted : T.textMain }}>MCQ Question</div>
            <div className="text-[10px] font-semibold" style={{ color: mcqFull ? T.red : T.textMuted }}>
              {mcqLimit > 0 ? `${mcqCount} / ${mcqLimit} added` : `${mcqCount} added`}
            </div>
            {mcqLimit > 0 && (
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#e4e4ed' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (mcqCount / mcqLimit) * 100)}%`, background: mcqFull ? T.red : '#6366f1' }} />
              </div>
            )}
          </button>

          {/* Programming */}
          <button
            onClick={() => !progFull && onPick('Programming')}
            disabled={progFull}
            className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all relative"
            style={{
              background: progFull ? '#f9f9fb' : T.bg,
              border: `1px solid ${progFull ? '#e0e0e0' : T.border}`,
              cursor: progFull ? 'not-allowed' : 'pointer',
              opacity: progFull ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!progFull) { (e.currentTarget as HTMLElement).style.borderColor = '#059669'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(5,150,105,0.22)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = progFull ? '#e0e0e0' : T.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            {progFull && (
              <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: '#fee2e2', color: T.red }}>Full</span>
            )}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: progFull ? '#efefef' : 'rgba(5,150,105,0.10)' }}>
              <Code size={22} style={{ color: progFull ? T.textMuted : '#059669' }} />
            </div>
            <div className="text-[12px] font-bold" style={{ color: progFull ? T.textMuted : T.textMain }}>Programming</div>
            <div className="text-[10px] font-semibold" style={{ color: progFull ? T.red : T.textMuted }}>
              {progLimit > 0 ? `${progCount} / ${progLimit} added` : `${progCount} added`}
            </div>
            {progLimit > 0 && (
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#e4e4ed' }}>
                <div className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (progCount / progLimit) * 100)}%`, background: progFull ? T.red : '#059669' }} />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Portal Dropdown ──────────────────────────────────────────────────────────
const PortalDropMenu: React.FC<{
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ anchorEl, onClose, children }) => {
  const [style, setStyle] = React.useState<React.CSSProperties>({ visibility: 'hidden', position: 'fixed' });

  React.useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = 120;
    let left = rect.right - menuWidth;
    if (left < 4) left = 4;
    setStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left,
      width: menuWidth,
      zIndex: 9999,
      background: T.bg,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      visibility: 'visible',
    });
  }, [anchorEl]);

  React.useEffect(() => {
    const handleClose = () => onClose();
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, [onClose]);

  if (!anchorEl || typeof window === 'undefined') return null;
  return ReactDOM.createPortal(
    <div style={style} onMouseDown={e => e.stopPropagation()}>
      {children}
    </div>,
    document.body
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const QuestionsTest: React.FC<QuestionsTestProps> = ({
  assessment,
  onBack,
  nodeId,
  nodeName,
  subcategory,
  nodeType,
  tabType,
  hierarchyData,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<'mcq' | 'programming' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [openDrop, setOpenDrop] = useState<{ id: string; el: HTMLElement } | null>(null);

  // ── Add-Question flow state (mirrors Assessment.tsx) ──────────────────────
  const [addQ, setAddQ] = useState<{
    step: 'section' | 'type' | 'form' | null;
    exercise?: any;
    section?: any;
    questionType?: 'MCQ' | 'Programming';
  }>({ step: null });

  // Get section configs from assessment
  const sectionConfigs = assessment?.sectionConfigs || {};
  const isSectionBased = assessment?.isSectionBased || Object.keys(sectionConfigs).length > 0;

  const sections = Object.keys(sectionConfigs).map(key => ({
    id: sectionConfigs[key].id || key,
    name: sectionConfigs[key].name || key,
    order: sectionConfigs[key].sectionNumber || 0,
    exerciseType: sectionConfigs[key].exerciseType,
  })).sort((a, b) => a.order - b.order);

  // Set first section as default
  useEffect(() => {
    if (sections.length > 0 && !selectedSection) {
      setSelectedSection(sections[0].id);
    }
  }, [sections.length]);

  // When section changes, set default sub-type for Combined sections
  useEffect(() => {
    if (selectedSection) {
      const cfg = sectionConfigs[selectedSection];
      if (cfg?.exerciseType === 'Combined') {
        setSelectedSubType('mcq');
      } else {
        setSelectedSubType(null);
      }
    }
  }, [selectedSection]);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await exerciseApi.getExerciseById(assessment._id);
      const fullExercise = response?.data?.exercise || response?.exercise || response?.data;
      if (fullExercise?.questions) {
        setQuestions(fullExercise.questions);
        // Keep addQ.exercise in sync so quota counts refresh
        setAddQ(prev => prev.step ? { ...prev, exercise: fullExercise } : prev);
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      toast.error('Failed to load questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [assessment._id]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // ── Open Add Question flow ────────────────────────────────────────────────
  // No API call needed — assessment is the full exercise object already (fetched
  // by the parent before mounting this component), and `questions` state is kept
  // fresh by fetchQuestions(). Merging them gives an instant modal open.
  const handleOpenAddQuestion = () => {
    const exerciseWithQuestions = { ...assessment, questions };
    if (
      exerciseWithQuestions.isSectionBased ||
      Object.keys(exerciseWithQuestions.sectionConfigs || {}).length > 0
    ) {
      setAddQ({ step: 'section', exercise: exerciseWithQuestions });
    } else {
      setAddQ({ step: 'form', exercise: exerciseWithQuestions });
    }
  };

  const closeAddQ = () => { setAddQ({ step: null }); setEditingQuestion(null); };

  // ── Build exerciseData for AddQuestionForm (mirrors Assessment.tsx buildAddQExerciseData) ──
  const buildAddQExerciseData = () => {
    const ex = addQ.exercise || assessment;
    if (!ex) return null;

    let effectiveExerciseType: string = ex.exerciseType;
    if (addQ.section) {
      if (addQ.section.exerciseType === 'Combined' && addQ.questionType) {
        effectiveExerciseType = addQ.questionType;
      } else {
        effectiveExerciseType = addQ.section.exerciseType;
      }
    }

    const currentSectionId = addQ.section?.id || null;
    const currentSectionName = addQ.section?.name || null;

    const allQuestions: any[] = ex.questions || [];
    const sectionQuestions = currentSectionId
      ? allQuestions.filter((q: any) => {
          if (q.sectionId && q.sectionId === currentSectionId) return true;
          if (!q.sectionId && q.sectionName && q.sectionName === currentSectionName) return true;
          return false;
        })
      : allQuestions;

    let fullExerciseData: any = {
      ...ex,
      exerciseType: effectiveExerciseType,
      hierarchyData,
      questions: sectionQuestions,
      currentSectionId,
      currentSectionName,
    };

    if (addQ.section) {
      const sec = addQ.section;
      const mcqCfg = sec.mcqConfig || {};
      const progCfg = sec.programmingConfig || {};

      // mcqSectionMarks = TOTAL marks for the MCQ part of this section
      // Note: mcqCfg.scoreSettings.equalDistribution = marks PER QUESTION (not total),
      //       so we must NOT use it as a stand-in for the total section marks.
      const mcqSectionMarks =
        sec.mcqSectionMarks ??
        (sec.exerciseType === 'MCQ' ? sec.totalMarks : 0) ?? 0;
      const progSectionMarks =
        sec.programmingSectionMarks ?? (sec.exerciseType === 'Programming' ? sec.totalMarks : 0) ?? 0;

      const mcqGenCount = mcqCfg.generalQuestionCount || 0;
      const mcqScoringType = mcqCfg?.scoreSettings?.scoreType || 'equalDistribution';
      // equalDistribution in sectionConfig.mcqConfig = marks per question directly
      const mcqMarksPerQ: number =
        mcqCfg?.scoreSettings?.equalDistribution ||
        (mcqGenCount > 0 ? Math.floor(mcqSectionMarks / mcqGenCount) : 0);

      const mcqQuestionConfiguration = {
        scoringType: mcqScoringType,
        marksPerQuestion: mcqMarksPerQ,
        totalMcqQuestions: mcqGenCount,
        attemptLimitEnabled: mcqCfg.attemptLimitEnabled,
        submissionAttempts: mcqCfg.submissionAttempts,
      };

      // ── Programming config — only relevant when section exerciseType is Programming or Combined ──
      const pc = progCfg;
      const cfgType = pc.questionConfigType || 'general';

      const lvlCounts    = pc.levelBasedCounts    || { easy: 0, medium: 0, hard: 0 };
      const selCounts    = pc.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
      const lvlScoring   = pc.levelScoring || {};

      // level-based: read marksPerQuestion directly from levelScoring (already per-question)
      const levelScoringConfiguration: any = {};
      const levelBasedMarks: any = {};
      (['easy', 'medium', 'hard'] as const).forEach((d) => {
        const s     = lvlScoring[d] || {};
        const count = (cfgType === 'selectionLevel' ? selCounts[d] : lvlCounts[d]) || 0;
        const mpq   = s.marksPerQuestion || 0;
        levelScoringConfiguration[d] = {
          type: s.type || 'level_specific',
          marksPerQuestion: mpq,
          questionCount: count,
          totalMarks: mpq * count,
        };
        levelBasedMarks[d] = mpq;
      });

      // general: scoreSettings.equalDistribution = marks PER QUESTION (same pattern as MCQ)
      const progGenCount: number = pc.generalQuestionCount || 0;
      const generalMarksPerQuestion: number =
        pc.scoreSettings?.equalDistribution ||
        (progGenCount > 0 ? Math.floor(progSectionMarks / progGenCount) : 0);

      const programmingQuestionConfiguration = {
        questionConfigType: cfgType,
        generalQuestionCount: progGenCount,
        generalMarksPerQuestion,
        levelBasedCounts: lvlCounts,
        selectionLevelCounts: selCounts,
        questionFlow: pc.questionFlow || 'freeFlow',
        attemptLimitEnabled: pc.attemptLimitEnabled,
        submissionAttempts: pc.submissionAttempts,
        scoreSettings: {
          ...(pc.scoreSettings || {}),
          levelScoringConfiguration,
          levelBasedMarks,
          evenMarks: generalMarksPerQuestion,  // same value, used as fallback in form
        },
      };

      const effTotalMarks =
        effectiveExerciseType === 'MCQ' ? mcqSectionMarks :
        effectiveExerciseType === 'Programming' ? progSectionMarks :
        sec.totalMarks || 0;

      fullExerciseData = {
        ...fullExerciseData,
        questionConfiguration: {
          ...(ex.questionConfiguration || {}),
          mcqQuestionConfiguration,
          programmingQuestionConfiguration,
        },
        exerciseInformation: {
          ...(ex.exerciseInformation || {}),
          totalMarks: effTotalMarks,
          totalMarksMCQ: mcqSectionMarks,
          totalMarksProgramming: progSectionMarks,
        },
        totalMarksMCQ: mcqSectionMarks,
        totalMarksProgramming: progSectionMarks,
      };
    }

    return {
      exerciseId: ex._id,
      _id: ex._id,
      exerciseName: ex.exerciseInformation?.exerciseName,
      exerciseLevel: ex.exerciseInformation?.exerciseLevel || 'intermediate',
      selectedLanguages: ex.exerciseInformation?.selectedLanguages || [],
      nodeId, nodeName, subcategory, nodeType,
      fullExerciseData,
      exerciseType: effectiveExerciseType,
      programmingSettings: ex.programmingSettings,
      subcategoryLabel: subcategory,
      currentSectionId,
      currentSectionName,
    };
  };

  // ── View-table helpers ────────────────────────────────────────────────────
  const currentSectionConfig = selectedSection ? sectionConfigs[selectedSection] : null;
  const isCurrentSectionCombined = currentSectionConfig?.exerciseType === 'Combined';

  const filteredQuestions = questions.filter(q => {
    if (!selectedSection) return true;
    const matchesSection = q.sectionId === selectedSection || q.sectionName === selectedSection;
    if (!matchesSection) return false;
    if (isCurrentSectionCombined && selectedSubType) return q.questionType === selectedSubType;
    return true;
  });

  const sortedQuestions = [...filteredQuestions].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  const mcqCount = questions.filter(q =>
    (q.sectionId === selectedSection || q.sectionName === selectedSection) && q.questionType === 'mcq'
  ).length;
  const programmingCount = questions.filter(q =>
    (q.sectionId === selectedSection || q.sectionName === selectedSection) && q.questionType === 'programming'
  ).length;

  const getQuestionTitle = (q: Question): string => {
    if (q.questionType === 'mcq') {
      if (q.mcqQuestionTitle) return extractPlainText(q.mcqQuestionTitle);
      if (q.questionTitle) return extractPlainText(q.questionTitle);
    }
    return extractPlainText(q.title) || extractPlainText(q.questionTitle) || 'Untitled Question';
  };

  const getQuestionDesc = (q: Question): string => {
    if (q.questionType === 'mcq') return extractPlainText(q.mcqQuestionDescription) || 'MCQ Question';
    return extractPlainText(q.description) || 'No description';
  };

  const getDifficulty = (q: Question): string => q.difficulty || 'medium';

  const getScore = (q: Question): number => {
    if (q.questionType === 'mcq') return q.mcqQuestionScore || q.score || q.points || 0;
    return q.score || q.points || 0;
  };

  // Badges
  const TYPE_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    mcq: { label: 'MCQ', color: '#7c3aed', bg: '#f5f3ff', dot: '#a78bfa' },
    programming: { label: 'Coding', color: '#e0623f', bg: 'rgba(242,119,87,0.08)', dot: '#F27757' },
    frontend: { label: 'Frontend', color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
    database: { label: 'Database', color: '#16a34a', bg: '#f0fdf4', dot: '#22c55e' },
  };

  const TypeBadge = ({ type }: { type: string }) => {
    const c = TYPE_CFG[type] || TYPE_CFG.programming;
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}20` }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
        {c.label}
      </span>
    );
  };

  const DIFF_CFG: Record<string, { bg: string; color: string }> = {
    easy: { bg: '#f0fdf4', color: '#16a34a' },
    medium: { bg: '#fffbeb', color: '#d97706' },
    hard: { bg: '#fff1f2', color: '#e11d48' },
  };

  const DiffBadge = ({ level }: { level: string }) => {
    const c = DIFF_CFG[level] || DIFF_CFG.medium;
    return (
      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
        {level}
      </span>
    );
  };

  // Edit — go straight to form with existing question data
  const handleEdit = (q: Question) => {
    setEditingQuestion(q);
    // For edit: skip section picker, go straight to form using current view-tab context
    const currentSection = sections.find(s => s.id === (q.sectionId || selectedSection));
    let questionType: 'MCQ' | 'Programming' | undefined;
    if (q.questionType === 'mcq') questionType = 'MCQ';
    else if (q.questionType === 'programming') questionType = 'Programming';

    setAddQ({
      step: 'form',
      exercise: assessment,
      section: currentSection
        ? { ...currentSection, ...(sectionConfigs[currentSection.id] || {}) }
        : undefined,
      questionType,
    });
  };

  // Delete
  const handleDelete = (q: Question) => { setQuestionToDelete(q); setShowDeleteModal(true); };

  const confirmDelete = async () => {
    if (!questionToDelete) return;
    setDeleting(true);
    try {
      const entityTypeMap: Record<string, any> = {
        module: 'modules', submodule: 'submodules', topic: 'topics', subtopic: 'subtopics',
      };
      await questionApi.deleteQuestion(
        entityTypeMap[nodeType] || 'topics',
        nodeId, assessment._id, questionToDelete._id, tabType, subcategory
      );
      await fetchQuestions();
      toast.success('Question deleted');
      setShowDeleteModal(false);
      setQuestionToDelete(null);
    } catch (err) {
      toast.error('Failed to delete question');
    } finally {
      setDeleting(false);
    }
  };

  // Delete Modal
  const DeleteConfirmModal = () => (
    <div className="fixed inset-0 flex items-center justify-center z-[1000]" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: T.border }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.redLight }}>
              <AlertTriangle size={16} style={{ color: T.red }} />
            </div>
            <h3 className="text-base font-bold" style={{ color: T.textMain }}>Delete Question</h3>
          </div>
          <button onClick={() => setShowDeleteModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} style={{ color: T.textMuted }} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm" style={{ color: T.textSub }}>
            Are you sure you want to delete{' '}
            <span className="font-semibold" style={{ color: T.textMain }}>
              "{questionToDelete ? getQuestionTitle(questionToDelete) : ''}"
            </span>?
          </p>
          <p className="text-xs mt-2" style={{ color: T.textMuted }}>This action cannot be undone.</p>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t" style={{ borderColor: T.border, background: T.pageBg }}>
          <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: T.textSub, background: T.bg, border: `1px solid ${T.border}` }}>
            Cancel
          </button>
          <button onClick={confirmDelete} disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
            style={{ background: T.red }}>
            {deleting
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting...</>
              : <><Trash2 size={14} />Delete</>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ background: T.pageBg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: T.textSub }}
            onMouseEnter={e => { e.currentTarget.style.background = T.pageBg; e.currentTarget.style.color = T.textMain; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSub; }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-sm font-bold" style={{ color: T.textMain }}>Manage Questions</h2>
            <p className="text-[10px]" style={{ color: T.textMuted }}>{assessment?.exerciseInformation?.exerciseName}</p>
          </div>
        </div>
        <button
          onClick={handleOpenAddQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all"
          style={{ background: T.blue, boxShadow: `0 2px 8px ${T.blue}40` }}
          onMouseEnter={e => { e.currentTarget.style.background = T.blueDark; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.blue; e.currentTarget.style.transform = 'none'; }}>
          <Plus size={12} /> Add Question
        </button>
      </div>

      {/* Section Tabs */}
      {sections.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-3 border-b" style={{ borderColor: T.border, background: T.bg }}>
          <div className="flex gap-1 overflow-x-auto">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className="px-4 py-2 text-[11px] font-semibold rounded-t-lg transition-all whitespace-nowrap"
                style={{
                  color: selectedSection === section.id ? T.blue : T.textMuted,
                  borderBottom: selectedSection === section.id ? `2px solid ${T.blue}` : '2px solid transparent',
                  background: selectedSection === section.id ? T.blueLight : 'transparent',
                }}>
                {section.name}
                {section.exerciseType === 'Combined' && (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded" style={{ background: T.blueLight, color: T.blue }}>
                    Combined
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tabs for Combined sections */}
      {isCurrentSectionCombined && selectedSection && (
        <div className="flex-shrink-0 px-4 pt-2 pb-2" style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedSubType('mcq')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{
                background: selectedSubType === 'mcq' ? T.blueLight : 'transparent',
                color: selectedSubType === 'mcq' ? T.blue : T.textMuted,
                border: `1px solid ${selectedSubType === 'mcq' ? T.blue + '40' : 'transparent'}`,
              }}>
              <CheckCircle size={11} />MCQ
              <span className="text-[9px] ml-0.5" style={{ color: T.textHint }}>({mcqCount})</span>
            </button>
            <button
              onClick={() => setSelectedSubType('programming')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{
                background: selectedSubType === 'programming' ? T.blueLight : 'transparent',
                color: selectedSubType === 'programming' ? T.blue : T.textMuted,
                border: `1px solid ${selectedSubType === 'programming' ? T.blue + '40' : 'transparent'}`,
              }}>
              <Code size={11} />Programming
              <span className="text-[9px] ml-0.5" style={{ color: T.textHint }}>({programmingCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Question Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: T.blue, borderTopColor: 'transparent' }} />
          </div>
        ) : sortedQuestions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: T.blueLight }}>
              <List size={20} style={{ color: T.blue }} />
            </div>
            <p className="text-sm font-medium" style={{ color: T.textSub }}>
              {isCurrentSectionCombined && selectedSubType
                ? `No ${selectedSubType === 'mcq' ? 'MCQ' : 'Programming'} questions in this section`
                : 'No questions in this section'}
            </p>
            <p className="text-[11px] mt-1" style={{ color: T.textMuted }}>Click "Add Question" to create one</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}`, background: T.bg }}>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5" style={{ background: T.pageBg, borderBottom: `1px solid ${T.border}` }}>
              {['#', 'Question', '', '', '', 'Type', '', 'Difficulty', '', 'Marks', 'Actions'].map((h, i) => (
                i === 0 ? <div key={i} className="col-span-1 text-[9px] font-black uppercase tracking-wide" style={{ color: T.textMuted }}>{h}</div> :
                i === 1 ? <div key={i} className="col-span-5 text-[9px] font-black uppercase tracking-wide" style={{ color: T.textMuted }}>{h}</div> :
                i === 5 ? <div key={i} className="col-span-2 text-[9px] font-black uppercase tracking-wide" style={{ color: T.textMuted }}>{h}</div> :
                i === 7 ? <div key={i} className="col-span-2 text-[9px] font-black uppercase tracking-wide" style={{ color: T.textMuted }}>{h}</div> :
                i === 9 ? <div key={i} className="col-span-1 text-[9px] font-black uppercase tracking-wide text-center" style={{ color: T.textMuted }}>{h}</div> :
                i === 10 ? <div key={i} className="col-span-1 text-[9px] font-black uppercase tracking-wide text-center" style={{ color: T.textMuted }}>{h}</div> :
                null
              ))}
            </div>
            {/* Cleaner header */}
            <div className="hidden" />

            {/* Rows */}
            {sortedQuestions.map((q, idx) => {
              const isHovered = hoveredRow === q._id;
              const diff = getDifficulty(q);

              return (
                <div
                  key={q._id}
                  className="grid grid-cols-12 gap-3 px-4 py-3 transition-all"
                  style={{
                    borderBottom: idx === sortedQuestions.length - 1 ? 'none' : `1px solid ${T.border}`,
                    background: isHovered ? T.warm : T.bg,
                    borderLeft: isHovered ? `2px solid ${T.blue}` : '2px solid transparent',
                  }}
                  onMouseEnter={() => setHoveredRow(q._id)}
                  onMouseLeave={() => setHoveredRow(null)}>
                  <div className="col-span-1 flex items-center">
                    <span className="text-[11px] font-mono" style={{ color: isHovered ? T.blue : T.textHint }}>{idx + 1}</span>
                  </div>
                  <div className="col-span-5 flex flex-col justify-center min-w-0">
                    <div className="text-[12px] font-semibold truncate" style={{ color: T.textMain }}>{getQuestionTitle(q)}</div>
                    <div className="text-[10px] truncate mt-0.5" style={{ color: T.textMuted }}>{getQuestionDesc(q)}</div>
                  </div>
                  <div className="col-span-2 flex items-center"><TypeBadge type={q.questionType} /></div>
                  <div className="col-span-2 flex items-center"><DiffBadge level={diff} /></div>
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-[11px] font-bold" style={{ color: T.textMain }}>{getScore(q)}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const el = e.currentTarget as HTMLElement;
                        setOpenDrop(prev =>
                          prev?.id === q._id ? null : { id: q._id, el }
                        );
                      }}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: isHovered ? T.blue : T.textHint }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.pageBg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <MoreVertical size={13} />
                    </button>
                    {openDrop?.id === q._id && (
                      <PortalDropMenu anchorEl={openDrop.el} onClose={() => setOpenDrop(null)}>
                        <button
                          onClick={() => { handleEdit(q); setOpenDrop(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-[11px] hover:bg-gray-50 rounded-t-lg"
                          style={{ color: T.textSub }}>
                          <Edit2 size={11} /> Edit
                        </button>
                        <button
                          onClick={() => { handleDelete(q); setOpenDrop(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-[11px] hover:bg-gray-50 rounded-b-lg"
                          style={{ color: T.red }}>
                          <Trash2 size={11} /> Delete
                        </button>
                      </PortalDropMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section Picker ── */}
      {addQ.step === 'section' && addQ.exercise && (
        <SectionPickerModal
          exercise={addQ.exercise}
          onClose={closeAddQ}
          onPick={(sectionCfg, sectionMeta) => {
            const merged = { ...sectionCfg, ...sectionMeta };
            if ((sectionCfg.exerciseType || '').toLowerCase() === 'combined') {
              setAddQ(prev => ({ ...prev, step: 'type', section: merged }));
            } else {
              setAddQ(prev => ({ ...prev, step: 'form', section: merged }));
            }
          }}
        />
      )}

      {/* ── Type Picker (Combined sections) ── */}
      {addQ.step === 'type' && addQ.section && (
        <TypePickerModal
          section={addQ.section}
          onClose={closeAddQ}
          onBack={() => setAddQ(prev => ({ ...prev, step: 'section', section: undefined, questionType: undefined }))}
          onPick={(type) => setAddQ(prev => ({ ...prev, step: 'form', questionType: type }))}
        />
      )}

      {/* ── Add / Edit Question Form ── */}
      {addQ.step === 'form' && (() => {
        const exData = buildAddQExerciseData();
        if (!exData) return null;
        return (
          <AddQuestionForm
            key={`addq-${exData.exerciseId}-${addQ.section?.id || 'no-section'}-${addQ.questionType || ''}-${editingQuestion?._id || 'new'}`}
            exerciseData={exData}
            tabType={tabType}
            sectionData={addQ.section}
            initialData={editingQuestion || undefined}
            isEditing={!!editingQuestion}
            onClose={async () => { closeAddQ(); await fetchQuestions(); }}
            onSave={async () => { await fetchQuestions(); }}
            showTypeSelector={(exData.exerciseType || '').toLowerCase() === 'combined'}
            shouldRefreshOnMount={true}
          />
        );
      })()}

      {/* Delete Modal */}
      {showDeleteModal && <DeleteConfirmModal />}
    </div>
  );
};

export default QuestionsTest;