'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, CheckCircle, Flag, ArrowLeft,
  AlertCircle, XCircle, ChevronDown, ChevronUp, GraduationCap,
  Check, HelpCircle, Info, Hash, GripVertical, Award, Timer,
  PenTool, Grid3x3,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/* â”€â”€â”€ Design tokens (matches SmartCliff login + LMS theme) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const T = {
  orange:      '#F27757',
  orangeDark:  '#E0623F',
  orangeGlow:  'rgba(242,119,87,0.22)',
  orangeLight: 'rgba(242,119,87,0.08)',
  textMain:    '#1a1a2e',
  textSub:     '#6b6b7e',
  textMuted:   '#8b8b9e',
  textHint:    '#bcbccc',
  border:      '#e4e4ed',
  bg:          '#ffffff',
  pageBg:      '#f7f7f9',
  green:       '#10b981',
  greenLight:  'rgba(16,185,129,0.08)',
  red:         '#ef4444',
  redLight:    'rgba(239,68,68,0.08)',
  amber:       '#f59e0b',
  amberLight:  'rgba(245,158,11,0.08)',
  blue:        '#3b82f6',
  blueLight:   'rgba(59,130,246,0.08)',
  purple:      '#8b5cf6',
  purpleLight: 'rgba(139,92,246,0.08)',
} as const;

/* â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface MCQOption {
  _id: string; text: string; isCorrect: boolean;
  imageUrl: string | null; imageAlignment: string; imageSizePercent: number;
}
interface MatchingPair  { left: string; right: string; _id: string; }
interface OrderingItem  { text: string; order: number; _id: string; }

interface MCQQuestion {
  _id: string; questionType: string; mcqQuestionTitle: string;
  mcqQuestionDescription: string; mcqQuestionType: string;
  mcqQuestionDifficulty: string; mcqQuestionScore: number;
  mcqQuestionTimeLimit: number; isActive: boolean;
  mcqQuestionOptionsPerRow: number; mcqQuestionRequired: boolean;
  mcqQuestionOptions: MCQOption[]; mcqQuestionCorrectAnswers: string[];
  hints: unknown[]; testCases: unknown[]; constraints: unknown[];
  trueFalseAnswer?: boolean | null; numericAnswer?: number | null;
  numericTolerance?: number | null; matchingPairs?: MatchingPair[];
  orderingItems?: OrderingItem[]; shortAnswer?: string;
}

interface ExerciseData {
  _id: string; exerciseType: string; configurationType: unknown;
  exerciseInformation: {
    exerciseId: string; exerciseName: string; description: string;
    exerciseLevel: string; totalDuration: number; totalMarks: number; _id: string;
  };
  questionConfiguration: {
    mcqQuestionConfiguration: {
      totalMcqQuestions: number; marksPerQuestion: number; mcqTotalMarks: number;
      attemptLimitEnabled: boolean; submissionAttempts: number; shuffleQuestions: boolean;
    };
  };
  availabilityPeriod: unknown; notificatonandGradeSettings: unknown;
  questions: MCQQuestion[]; createdAt: string; createdBy: string;
  version: number; updatedAt: string; entity: unknown; location: unknown;
}

interface Answer {
  questionId: string; optionId?: string; optionText?: string;
  textAnswer?: string; isCorrect?: boolean; score?: number; status?: string;
  matchingAnswers?: { left: string; right: string }[];
  orderingAnswers?: { itemId: string; order: number }[];
  numericAnswer?: number; booleanAnswer?: boolean;
}

/* â”€â”€â”€ Config maps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const DIFF_CFG: Record<string, { text: string; bg: string }> = {
  easy:   { text: T.green,  bg: T.greenLight  },
  medium: { text: T.amber,  bg: T.amberLight  },
  hard:   { text: T.red,    bg: T.redLight    },
};
const QTYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  multiple_choice: { label: 'Single Choice', color: T.blue,    bg: T.blueLight   },
  multiple_select: { label: 'Multi Select',  color: T.purple,  bg: T.purpleLight },
  true_false:      { label: 'True / False',  color: T.green,   bg: T.greenLight  },
  dropdown:        { label: 'Dropdown',      color: T.orange,  bg: T.orangeLight },
  short_answer:    { label: 'Short Answer',  color: T.amber,   bg: T.amberLight  },
  essay:           { label: 'Essay',         color: T.textSub, bg: T.pageBg      },
  matching:        { label: 'Matching',      color: T.purple,  bg: T.purpleLight },
  ordering:        { label: 'Ordering',      color: T.blue,    bg: T.blueLight   },
  numeric:         { label: 'Numeric',       color: T.green,   bg: T.greenLight  },
};
const HINT_TEXT: Record<string, string> = {
  multiple_choice: 'Choose one answer.',
  multiple_select: 'Select all that apply.',
  true_false:      'Choose True or False.',
  dropdown:        'Pick from the dropdown.',
  short_answer:    'Type a brief answer.',
  essay:           'Write a detailed answer.',
  numeric:         'Enter your numeric answer.',
  matching:        'Drag left items onto right items to match.',
  ordering:        'Drag items to arrange in the correct order.',
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SMALL UI COMPONENTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€â”€ Modal overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(5px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: 16,
  }}>
    {children}
  </div>
);

/* â”€â”€â”€ Time-up dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TimeUpDialog: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => (
  <Overlay>
    <div style={{ background: T.bg, borderRadius: 20, width: 360, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', animation: 'mcqSlideUp .3s ease' }}>
      <div style={{ background: `linear-gradient(135deg,${T.red},#dc2626)`, padding: '26px 28px 22px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Timer size={24} color="#fff" />
        </div>
        <h3 style={{ fontSize: 19, fontWeight: 800, color: '#fff', margin: 0 }}>Time's Up!</h3>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>Submitting your answers automatically.</p>
      </div>
      <div style={{ padding: '20px 28px 26px', textAlign: 'center' }}>
        <button onClick={onConfirm} style={{ padding: '10px 28px', borderRadius: 10, background: `linear-gradient(135deg,${T.red},#dc2626)`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
          View Results
        </button>
      </div>
    </div>
  </Overlay>
);

/* â”€â”€â”€ Submit confirmation dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface SubmitDialogProps {
  unansweredCount: number; flaggedCount: number;
  unansweredIndices: number[]; flaggedIndices: number[];
  onConfirm: () => void; onCancel: () => void;
  onNavigate: (idx: number) => void;
}
const SubmitDialog: React.FC<SubmitDialogProps> = ({
  unansweredCount, flaggedCount, unansweredIndices, flaggedIndices,
  onConfirm, onCancel, onNavigate,
}) => {
  const [exp, setExp] = useState<string | null>(null);
  return (
    <Overlay>
      <div style={{ background: T.bg, borderRadius: 20, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', animation: 'mcqSlideUp .3s ease' }}>
        <div style={{ background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={19} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>Submit Assessment?</h3>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Review before finalizing</p>
            </div>
          </div>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '42vh', overflowY: 'auto' }}>
          {unansweredCount > 0 && (
            <div style={{ borderRadius: 11, border: `1.5px solid ${T.red}25`, overflow: 'hidden' }}>
              <button onClick={() => setExp(exp === 'u' ? null : 'u')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: T.redLight, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <XCircle size={13} style={{ color: T.red }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.red }}>Unanswered ({unansweredCount})</span>
                </span>
                {exp === 'u' ? <ChevronUp size={12} style={{ color: T.red }} /> : <ChevronDown size={12} style={{ color: T.red }} />}
              </button>
              {exp === 'u' && (
                <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {unansweredIndices.map(i => (
                    <button key={i} onClick={() => { onNavigate(i); onCancel(); }}
                      style={{ width: 30, height: 30, borderRadius: 7, background: T.redLight, color: T.red, border: `1px solid ${T.red}30`, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {flaggedCount > 0 && (
            <div style={{ borderRadius: 11, border: `1.5px solid ${T.amber}25`, overflow: 'hidden' }}>
              <button onClick={() => setExp(exp === 'f' ? null : 'f')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: T.amberLight, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Flag size={13} style={{ color: T.amber }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.amber }}>Flagged ({flaggedCount})</span>
                </span>
                {exp === 'f' ? <ChevronUp size={12} style={{ color: T.amber }} /> : <ChevronDown size={12} style={{ color: T.amber }} />}
              </button>
              {exp === 'f' && (
                <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {flaggedIndices.map(i => (
                    <button key={i} onClick={() => { onNavigate(i); onCancel(); }}
                      style={{ width: 30, height: 30, borderRadius: 7, background: T.amberLight, color: T.amber, border: `1px solid ${T.amber}30`, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {unansweredCount === 0 && flaggedCount === 0 && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <CheckCircle size={28} style={{ color: T.green }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: T.textMain, marginTop: 8 }}>All questions answered!</p>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: '9px', borderRadius: 10, background: T.pageBg, border: `1.5px solid ${T.border}`, color: T.textSub, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Review
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '9px', borderRadius: 10, background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 12px ${T.orangeGlow}` }}>
            Submit Now
          </button>
        </div>
      </div>
    </Overlay>
  );
};

/* â”€â”€â”€ Completion screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const CompletionScreen: React.FC<{ onClose: () => void; timeUp?: boolean }> = ({ onClose, timeUp = false }) => (
  <div style={{ height: '100vh', background: T.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 22, background: timeUp ? `linear-gradient(135deg,${T.red},#dc2626)` : `linear-gradient(135deg,${T.green},#059669)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', boxShadow: timeUp ? '0 10px 28px rgba(239,68,68,0.3)' : '0 10px 28px rgba(16,185,129,0.3)' }}>
        {timeUp ? <Timer size={32} color="#fff" /> : <CheckCircle size={32} color="#fff" />}
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: T.textMain, margin: '0 0 8px' }}>
        {timeUp ? "Time's Up!" : 'Assessment Submitted!'}
      </h2>
      <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 26 }}>
        {timeUp ? 'Your answers were automatically submitted.' : 'You have successfully completed the assessment.'}
      </p>
      <button onClick={onClose}
        style={{ padding: '11px 30px', borderRadius: 11, background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 14px ${T.orangeGlow}` }}>
        Return to Course
      </button>
    </div>
  </div>
);

/* â”€â”€â”€ Loading screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const LoadingScreen: React.FC = () => (
  <div style={{ height: '100vh', background: T.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', border: `3px solid ${T.orangeLight}`, borderTopColor: T.orange, animation: 'mcqSpin 0.7s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ fontSize: 13, color: T.textMuted }}>Loading assessmentâ€¦</p>
    </div>
  </div>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANSWER INPUT COMPONENTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const RadioOption: React.FC<{ option: MCQOption; checked: boolean; onChange: () => void; index: number; disabled: boolean }> = ({ option, checked, onChange, index, disabled }) => {
  const lbl = String.fromCharCode(65 + index);
  return (
    <div onClick={() => !disabled && onChange()}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 15px', borderRadius: 11, border: `1.5px solid ${checked ? T.orange : T.border}`, background: checked ? T.orangeLight : T.bg, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.12s', boxShadow: checked ? `0 0 0 3px ${T.orangeGlow}` : 'none', userSelect: 'none' }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: checked ? T.orange : T.pageBg, border: `1.5px solid ${checked ? T.orange : T.border}`, fontSize: 11, fontWeight: 800, color: checked ? '#fff' : T.textMuted, transition: 'all 0.12s' }}>
        {checked ? <Check size={12} color="#fff" /> : lbl}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, color: checked ? T.textMain : T.textSub, fontWeight: checked ? 600 : 400, lineHeight: 1.55 }}>{option.text}</span>
        {option.imageUrl && option.imageUrl.trim() !== '' && (
          <img src={option.imageUrl} alt={`Option ${lbl}`} style={{ marginTop: 8, maxHeight: 72, borderRadius: 7, display: 'block' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        )}
      </div>
    </div>
  );
};

const CheckboxOption: React.FC<{ option: MCQOption; checked: boolean; onChange: () => void; index: number; disabled: boolean }> = ({ option, checked, onChange, index, disabled }) => {
  const lbl = String.fromCharCode(65 + index);
  return (
    <div onClick={() => !disabled && onChange()}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 15px', borderRadius: 11, border: `1.5px solid ${checked ? T.purple : T.border}`, background: checked ? T.purpleLight : T.bg, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.12s', boxShadow: checked ? '0 0 0 3px rgba(139,92,246,0.12)' : 'none', userSelect: 'none' }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: checked ? T.purple : T.pageBg, border: `1.5px solid ${checked ? T.purple : T.border}`, fontSize: 11, fontWeight: 800, color: checked ? '#fff' : T.textMuted, transition: 'all 0.12s' }}>
        {checked ? <Check size={12} color="#fff" /> : lbl}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, color: checked ? T.textMain : T.textSub, fontWeight: checked ? 600 : 400, lineHeight: 1.55 }}>{option.text}</span>
        {option.imageUrl && option.imageUrl.trim() !== '' && (
          <img src={option.imageUrl} alt={`Option ${lbl}`} style={{ marginTop: 8, maxHeight: 72, borderRadius: 7, display: 'block' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        )}
      </div>
    </div>
  );
};

const TrueFalse: React.FC<{ value: boolean | null; onChange: (v: boolean) => void; disabled: boolean }> = ({ value, onChange, disabled }) => (
  <div style={{ display: 'flex', gap: 12, maxWidth: 380 }}>
    {([true, false] as const).map(v => (
      <button key={String(v)} onClick={() => !disabled && onChange(v)}
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 18px', borderRadius: 11, border: `1.5px solid ${value === v ? (v ? T.green : T.red) : T.border}`, background: value === v ? (v ? T.greenLight : T.redLight) : T.bg, color: value === v ? (v ? T.green : T.red) : T.textSub, fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.12s', fontFamily: 'inherit', boxShadow: value === v ? `0 0 0 3px ${v ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}` : 'none' }}>
        {v ? <CheckCircle size={16} /> : <XCircle size={16} />}
        {v ? 'True' : 'False'}
      </button>
    ))}
  </div>
);

const DropdownInput: React.FC<{ options: MCQOption[]; selectedValue: string | null; onChange: (id: string) => void; disabled: boolean }> = ({ options, selectedValue, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = options.find(o => o._id === selectedValue);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', maxWidth: 460 }}>
      <button onClick={() => !disabled && setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 15px', borderRadius: 11, border: `1.5px solid ${open ? T.orange : T.border}`, background: T.bg, color: sel ? T.textMain : T.textHint, fontSize: 14, fontWeight: sel ? 600 : 400, cursor: disabled ? 'default' : 'pointer', boxShadow: open ? `0 0 0 3px ${T.orangeLight}` : 'none', transition: 'all 0.12s', fontFamily: 'inherit' }}>
        <span>{sel ? sel.text : 'Select an answerâ€¦'}</span>
        <ChevronDown size={14} style={{ color: T.textHint, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 5, background: T.bg, borderRadius: 11, border: `1.5px solid ${T.border}`, boxShadow: '0 10px 28px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
          {options.map((opt, idx) => (
            <button key={opt._id} onClick={() => { onChange(opt._id); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', background: selectedValue === opt._id ? T.orangeLight : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.1s' }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: selectedValue === opt._id ? T.orange : T.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: selectedValue === opt._id ? '#fff' : T.textMuted, flexShrink: 0 }}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ fontSize: 13, color: T.textMain, fontWeight: selectedValue === opt._id ? 600 : 400, flex: 1 }}>{opt.text}</span>
              {selectedValue === opt._id && <Check size={12} style={{ color: T.orange }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ShortAnswerInput: React.FC<{ value: string; onChange: (v: string) => void; disabled: boolean }> = ({ value, onChange, disabled }) => (
  <div style={{ position: 'relative', maxWidth: 540 }}>
    <input type="text" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      placeholder="Type your answer hereâ€¦"
      style={{ width: '100%', padding: '11px 40px 11px 15px', borderRadius: 11, border: `1.5px solid ${T.border}`, background: T.bg, fontSize: 14, color: T.textMain, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'all 0.12s' }}
      onFocus={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.orangeLight}`; }}
      onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
    />
    <PenTool size={13} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: T.textHint, pointerEvents: 'none' }} />
  </div>
);

const EssayInput: React.FC<{ value: string; onChange: (v: string) => void; disabled: boolean }> = ({ value, onChange, disabled }) => (
  <textarea value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
    rows={6} placeholder="Write your detailed answer hereâ€¦"
    style={{ width: '100%', maxWidth: 700, padding: '11px 15px', borderRadius: 11, border: `1.5px solid ${T.border}`, background: T.bg, fontSize: 14, color: T.textMain, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', transition: 'all 0.12s', display: 'block' }}
    onFocus={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.orangeLight}`; }}
    onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
  />
);

const NumericInput: React.FC<{ value: number | null; onChange: (v: number) => void; tolerance?: number | null; disabled: boolean }> = ({ value, onChange, tolerance, disabled }) => {
  const [inp, setInp] = useState(value?.toString() ?? '');
  return (
    <div style={{ maxWidth: 240 }}>
      <div style={{ position: 'relative' }}>
        <input type="number" value={inp} disabled={disabled} step="any" placeholder="Enter a numberâ€¦"
          onChange={e => { setInp(e.target.value); const n = Number(e.target.value); if (e.target.value.trim() !== '' && !isNaN(n)) onChange(n); }}
          style={{ width: '100%', padding: '11px 40px 11px 15px', borderRadius: 11, border: `1.5px solid ${T.border}`, background: T.bg, fontSize: 14, color: T.textMain, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'all 0.12s' }}
          onFocus={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.orangeLight}`; }}
          onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <Hash size={13} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: T.textHint, pointerEvents: 'none' }} />
      </div>
      {tolerance != null && tolerance > 0 && (
        <p style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>Accepted range: Â±{tolerance}</p>
      )}
    </div>
  );
};

const MatchingInput: React.FC<{ pairs: MatchingPair[]; answers: { left: string; right: string }[]; onChange: (ans: { left: string; right: string }[]) => void; disabled: boolean }> = ({ pairs, answers, onChange, disabled }) => {
  const [rights, setRights] = useState<string[]>([]);
  const [matches, setMatches] = useState<Map<string, string>>(new Map());
  const [dragged, setDragged] = useState<string | null>(null);

  useEffect(() => {
    setRights([...pairs.map(p => p.right)].sort(() => Math.random() - 0.5));
    const m = new Map<string, string>();
    answers.forEach(a => m.set(a.left, a.right));
    setMatches(m);
  }, [pairs]); // eslint-disable-line react-hooks/exhaustive-deps

  const getMatchedLeft = (r: string): string | null => {
    let out: string | null = null;
    matches.forEach((v, k) => { if (v === r) out = k; });
    return out;
  };

  const doMatch = (left: string, right: string) => {
    if (disabled) return;
    const m = new Map(matches);
    m.delete(left);
    let prevLeft: string | null = null;
    m.forEach((v, k) => { if (v === right) prevLeft = k; });
    if (prevLeft) m.delete(prevLeft);
    m.set(left, right);
    setMatches(m);
    onChange(Array.from(m.entries()).map(([l, r]) => ({ left: l, right: r })));
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: T.textHint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 9 }}>Items</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pairs.map((p, i) => (
              <div key={i} draggable={!disabled}
                onDragStart={() => setDragged(p.left)}
                onDragEnd={() => setDragged(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${matches.has(p.left) ? T.orange : T.border}`, background: matches.has(p.left) ? T.orangeLight : T.bg, cursor: disabled ? 'default' : 'grab', opacity: dragged === p.left ? 0.4 : 1, transition: 'all 0.12s' }}>
                <GripVertical size={12} style={{ color: T.textHint, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: T.textMain, flex: 1 }}>{p.left}</span>
                {matches.has(p.left) && <Check size={11} style={{ color: T.orange }} />}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: T.textHint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 9 }}>Match To</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {rights.map((r, i) => {
              const ml = getMatchedLeft(r);
              return (
                <div key={i}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (dragged && !disabled) doMatch(dragged, r); }}
                  onClick={() => {
                    if (!disabled) {
                      const unmatched = pairs.find(p => !matches.has(p.left));
                      if (unmatched) doMatch(unmatched.left, r);
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${ml ? T.green : T.border}`, background: ml ? T.greenLight : T.bg, cursor: disabled ? 'default' : 'pointer', transition: 'all 0.12s' }}>
                  <span style={{ fontSize: 13, color: T.textMain }}>{r}</span>
                  {ml && <span style={{ fontSize: 9, fontWeight: 700, color: T.green, background: 'rgba(16,185,129,0.15)', padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap' }}>â† {ml}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {!disabled && (
        <button onClick={() => { setMatches(new Map()); onChange([]); }}
          style={{ marginTop: 10, padding: '5px 13px', borderRadius: 7, background: T.pageBg, border: `1.5px solid ${T.border}`, fontSize: 11, fontWeight: 600, color: T.textMuted, cursor: 'pointer', fontFamily: 'inherit' }}>
          Clear All
        </button>
      )}
    </div>
  );
};

const OrderingInput: React.FC<{ items: OrderingItem[]; answers: { itemId: string; order: number }[]; onChange: (ans: { itemId: string; order: number }[]) => void; disabled: boolean }> = ({ items, answers, onChange, disabled }) => {
  const [ordered, setOrdered] = useState<OrderingItem[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (answers.length > 0) {
      setOrdered([...items].sort((a, b) => {
        const ao = answers.find(x => x.itemId === a._id)?.order ?? 0;
        const bo = answers.find(x => x.itemId === b._id)?.order ?? 0;
        return ao - bo;
      }));
    } else {
      setOrdered([...items].sort((a, b) => a.order - b.order));
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || disabled) return;
    const neo = [...ordered];
    const [item] = neo.splice(dragIdx, 1);
    neo.splice(idx, 0, item);
    setOrdered(neo);
    setDragIdx(idx);
  };

  return (
    <div style={{ maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 7 }}>
      {ordered.map((item, idx) => (
        <div key={item._id} draggable={!disabled}
          onDragStart={() => setDragIdx(idx)}
          onDragOver={e => handleOver(e, idx)}
          onDragEnd={() => {
            if (!disabled) {
              setDragIdx(null);
              onChange(ordered.map((it, i) => ({ itemId: it._id, order: i + 1 })));
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.bg, cursor: disabled ? 'default' : 'grab', opacity: dragIdx === idx ? 0.4 : 1, transition: 'all 0.12s' }}>
          <GripVertical size={14} style={{ color: T.textHint }} />
          <span style={{ flex: 1, fontSize: 13, color: T.textMain }}>{item.text}</span>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: T.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: T.orange }}>
            #{idx + 1}
          </div>
        </div>
      ))}
    </div>
  );
};

/* â”€â”€â”€ Question sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface SidebarProps {
  questions: MCQQuestion[];
  currentIndex: number;
  flaggedQuestions: Set<number>;
  onJump: (idx: number) => void;
  selectedDifficulty: string | null;
  onDifficultyChange: (d: string | null) => void;
  difficultyCounts: { easy: number; medium: number; hard: number; total: number };
  timeLeft: number;
  totalDuration: number;
  isAnswered: (q: MCQQuestion) => boolean;
}

const QuestionSidebar: React.FC<SidebarProps> = ({
  questions, currentIndex, flaggedQuestions, onJump,
  selectedDifficulty, onDifficultyChange, difficultyCounts,
  timeLeft, totalDuration, isAnswered,
}) => {
  const getStatus = (idx: number) => {
    const ans  = isAnswered(questions[idx]);
    const flag = flaggedQuestions.has(idx);
    if (idx === currentIndex) return 'cur';
    if (ans && flag) return 'both';
    if (ans)  return 'ans';
    if (flag) return 'flag';
    return 'none';
  };

  const ss = (s: string): React.CSSProperties => {
    switch (s) {
      case 'cur':  return { background: T.orange, color: '#fff', boxShadow: `0 2px 8px ${T.orangeGlow}` };
      case 'ans':  return { background: T.green,  color: '#fff' };
      case 'flag': return { background: T.red,    color: '#fff' };
      case 'both': return { background: T.amber,  color: '#fff' };
      default:     return { background: T.pageBg, color: T.textMuted };
    }
  };

  const answeredCount = questions.filter(q => isAnswered(q)).length;
  const pct = totalDuration > 0 ? Math.max(0, (timeLeft / (totalDuration * 60)) * 100) : 100;
  const tc  = timeLeft < 60 ? T.red : timeLeft < 300 ? T.amber : T.green;

  const fmtTime = (s: number) => {
    if (s <= 0) return '0m 0s';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${sec}s`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Timer */}
      {totalDuration > 0 && (
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.textHint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Time Left</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: tc, fontFamily: 'monospace', animation: timeLeft < 60 ? 'mcqPulse 1s ease-in-out infinite' : 'none' }}>
              {fmtTime(timeLeft)}
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: T.pageBg, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: tc, borderRadius: 99, transition: 'width 1s linear' }} />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', padding: '10px 14px', gap: 5, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {[
          { v: answeredCount,                    c: T.green,    l: 'Done' },
          { v: questions.length - answeredCount, c: T.textHint, l: 'Left' },
          { v: flaggedQuestions.size,            c: T.amber,    l: 'Flag' },
        ].map(({ v, c, l }) => (
          <div key={l} style={{ flex: 1, textAlign: 'center', padding: '7px 4px', borderRadius: 9, background: T.pageBg }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: T.textHint, fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Difficulty filter */}
      <div style={{ padding: '9px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <select value={selectedDifficulty ?? ''} onChange={e => onDifficultyChange(e.target.value || null)}
          style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.bg, fontSize: 11, color: T.textMain, outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
          <option value="">All ({difficultyCounts.total})</option>
          <option value="easy">Easy ({difficultyCounts.easy})</option>
          <option value="medium">Medium ({difficultyCounts.medium})</option>
          <option value="hard">Hard ({difficultyCounts.hard})</option>
        </select>
      </div>

      {/* Question grid â€” only this scrolls */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: T.textHint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 9 }}>
          Jump to Question
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5 }}>
          {questions.map((_, idx) => (
            <button key={idx} onClick={() => onJump(idx)}
              style={{ aspectRatio: '1', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.12s', fontFamily: 'inherit', ...ss(getStatus(idx)) }}>
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {[
            { c: T.orange, l: 'Current' },
            { c: T.green,  l: 'Answered' },
            { c: T.red,    l: 'Flagged' },
            { c: T.amber,  l: 'Both' },
          ].map(({ c, l }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
              <span style={{ fontSize: 9, color: T.textMuted }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN MCQ COMPONENT
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
interface MCQProps {
  exercise?: ExerciseData;
  courseId?: string; courseName?: string;
  nodeId?: string; nodeName?: string; nodeType?: string;
  onCloseExercise?: () => void;
  category?: string; subcategory?: string;
  studentId?: string; moduleName?: string; topicName?: string;
  hierarchy?: string[];
}
// â”€â”€â”€ Content Block Renderer (student view) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ContentBlockRenderer: React.FC<{ title: unknown }> = ({ title }) => {
  if (Array.isArray(title)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
        {title.map((cb: { id?: string; type: string; value?: string; url?: string; bgColor?: string; language?: string; alignment?: string; sizePercent?: number }, i: number) => {
          if (cb.type === 'text') {
            if (!cb.value) return null;
            return (
              <div key={i}
                style={{ fontSize: 16, fontWeight: 700, color: T.textMain, lineHeight: 1.65 }}
                dangerouslySetInnerHTML={{ __html: cb.value }}
              />
            );
          }
        if (cb.type === 'code') {
  const bg = cb.bgColor || '#f5f5f5';
  const isDark = ['#1e1e1e', '#282a36', '#272822', '#2e3440'].includes(bg);
  const textColor = isDark ? '#d4d4d4' : '#1a1a2e';
  return (
    <div key={i} style={{ display: 'inline-block', maxWidth: '100%', margin: '4px 0' }}>
      <pre
        style={{
          margin: 0,
          padding: '10px 16px',
          fontSize: 13,
          lineHeight: 1.7,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          color: textColor,
          background: bg,
          borderRadius: 8,
          border: `1.5px solid ${isDark ? '#3a3a3a' : '#e2e2e2'}`,
          whiteSpace: 'pre',
          display: 'inline-block',
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {cb.value || ''}
      </pre>
    </div>
  );
}
          if (cb.type === 'image' && cb.url) {
            const justify = cb.alignment === 'left' ? 'flex-start' : cb.alignment === 'right' ? 'flex-end' : 'center';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: justify }}>
                <img src={cb.url} alt=""
                  style={{ width: `${cb.sizePercent || 60}%`, height: 'auto', borderRadius: 6, border: `1.5px solid ${T.border}`, display: 'block' }}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }
  // fallback: plain string
  return (
    <h2 style={{ fontSize: 16, fontWeight: 700, color: T.textMain, margin: '0 0 6px', lineHeight: 1.65 }}
      dangerouslySetInnerHTML={{ __html: cq.mcqQuestionTitle as string }} />
  );
};
const MCQ: React.FC<MCQProps> = ({
  exercise: propExercise,
  courseId = '', courseName = 'Course',
  nodeId = '', nodeName = '', nodeType = '',
  onCloseExercise,
  category = 'Course', subcategory = 'Assessment',
  moduleName = '', topicName = '', hierarchy = [],
}) => {
  const router      = useRouter();
  const searchParams = useSearchParams();

  /* â”€â”€ Core state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [currentIdx,    setCurrentIdx]    = useState(0);
  const [questions,     setQuestions]     = useState<MCQQuestion[]>([]);
  const [filteredQs,    setFilteredQs]    = useState<MCQQuestion[]>([]);
  const [selectedDiff,  setSelectedDiff]  = useState<string | null>(null);

  /* â”€â”€ Per-question answer state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [selRadio,    setSelRadio]    = useState<string | null>(null);
  const [selCheckbox, setSelCheckbox] = useState<Set<string>>(new Set());
  const [selDropdown, setSelDropdown] = useState<string | null>(null);
  const [tfVal,       setTfVal]       = useState<boolean | null>(null);
  const [shortTxt,    setShortTxt]    = useState('');
  const [essayTxt,    setEssayTxt]    = useState('');
  const [numVal,      setNumVal]      = useState<number | null>(null);
  const [matchAns,    setMatchAns]    = useState<{ left: string; right: string }[]>([]);
  const [orderAns,    setOrderAns]    = useState<{ itemId: string; order: number }[]>([]);

  /* â”€â”€ Quiz lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [quizStarted,   setQuizStarted]   = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [showSubmit,    setShowSubmit]    = useState(false);
  const [showTimeUp,    setShowTimeUp]    = useState(false);
  const [loading,       setLoading]       = useState(true);

  /* â”€â”€ Answers & flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [answers,  setAnswers]  = useState<Map<string, Answer>>(new Map());
  const [flagged,  setFlagged]  = useState<Set<number>>(new Set());
  const [exData,   setExData]   = useState<ExerciseData | null>(null);

  /* â”€â”€ Timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [timeLeft,  setTimeLeft]  = useState(0);
  const [totalDur,  setTotalDur]  = useState(0);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef<Map<string, Answer>>(new Map());

  /* â”€â”€ URL params â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const urlCourseId = searchParams.get('courseId');
  const urlExId     = searchParams.get('exerciseId');
  const urlExName   = searchParams.get('exerciseName');
  const urlSub      = searchParams.get('subcategory');
  const urlCat      = searchParams.get('category');

  /* â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const getToken   = () => localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
  const getCourseId = () => urlCourseId || courseId;
  const getCategory = () => urlCat || category;
  const getSub      = () => urlSub || subcategory;

  const fmtClock = (s: number): string => {
    if (s <= 0) return '00:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  /* â”€â”€â”€ Timer logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const startTimer = (dur: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(dur * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setShowTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* â”€â”€â”€ isQuestionAnswered â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const isQAns = (q: MCQQuestion): boolean => {
    switch (q.mcqQuestionType) {
      case 'multiple_select': return Array.from(answers.values()).some(a => a?.questionId === q._id);
      case 'short_answer':
      case 'essay':           return !!(answers.get(q._id)?.textAnswer?.trim());
      case 'true_false':      return answers.get(q._id)?.booleanAnswer !== undefined;
      case 'numeric':         return answers.get(q._id)?.numericAnswer !== undefined;
      case 'matching':        return !!(answers.get(q._id)?.matchingAnswers?.length);
      case 'ordering':        return !!(answers.get(q._id)?.orderingAnswers?.length);
      default:                return answers.has(q._id);
    }
  };

  /* â”€â”€â”€ persist answers to state + localStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const persist = (m: Map<string, Answer>) => {
    setAnswers(m);
    answersRef.current = m;
    if (exData?._id) localStorage.setItem(`mcq_answers_${exData._id}`, JSON.stringify(Object.fromEntries(m)));
  };

  /* â”€â”€â”€ marks per question â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const qm = (q: MCQQuestion) =>
    exData?.questionConfiguration?.mcqQuestionConfiguration?.marksPerQuestion ?? q.mcqQuestionScore ?? 10;

  /* â”€â”€â”€ load saved answers for a question into UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const loadFor = (q: MCQQuestion, map: Map<string, Answer>) => {
    setSelRadio(null); setSelCheckbox(new Set()); setSelDropdown(null);
    setTfVal(null); setShortTxt(''); setEssayTxt(''); setNumVal(null);
    setMatchAns([]); setOrderAns([]);
    const a = map.get(q._id);
    switch (q.mcqQuestionType) {
      case 'multiple_choice':  setSelRadio(a?.optionId ?? null); break;
      case 'multiple_select': {
        const s = new Set<string>();
        map.forEach(v => { if (v?.questionId === q._id && v.optionId) s.add(v.optionId); });
        setSelCheckbox(s); break;
      }
      case 'dropdown':   setSelDropdown(a?.optionId ?? null); break;
      case 'true_false': setTfVal(a?.booleanAnswer ?? null); break;
      case 'short_answer': setShortTxt(a?.textAnswer ?? ''); break;
      case 'essay':      setEssayTxt(a?.textAnswer ?? ''); break;
      case 'numeric':    setNumVal(a?.numericAnswer ?? null); break;
      case 'matching':   setMatchAns(a?.matchingAnswers ?? []); break;
      case 'ordering':   setOrderAns(a?.orderingAnswers ?? []); break;
    }
  };

  /* â”€â”€â”€ initialise exercise data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const initExercise = (ex: ExerciseData, eid: string) => {
    setExData(ex);
    const dur = ex.exerciseInformation?.totalDuration ?? 0;
    setTotalDur(dur);
    if (dur > 0) startTimer(dur);

    let qs = [...ex.questions];
    if (ex.questionConfiguration?.mcqQuestionConfiguration?.shuffleQuestions)
      qs = qs.sort(() => Math.random() - 0.5);
    setQuestions(qs);
    setFilteredQs(qs);

    const savedAns = localStorage.getItem(`mcq_answers_${eid}`);
    if (savedAns) {
      try {
        const parsed = JSON.parse(savedAns) as Record<string, Answer>;
        const m = new Map(Object.entries(parsed));
        answersRef.current = m;
        setAnswers(m);
        if (qs[0]) loadFor(qs[0], m);
      } catch { /* ignore */ }
    }

    const savedFlag = localStorage.getItem(`mcq_flagged_${eid}`);
    if (savedFlag) {
      try { setFlagged(new Set(JSON.parse(savedFlag) as number[])); } catch { /* ignore */ }
    }

    setQuizStarted(true);
  };

  /* â”€â”€â”€ Fetch exercise â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const eid = urlExId || propExercise?._id;
        if (!eid) { toast.error('Exercise ID is required'); setLoading(false); return; }
        const tok = getToken();
        if (!tok) { toast.error('Authentication token not found'); setLoading(false); return; }
        const res = await fetch(`http://localhost:5533/exercise/${eid}`, {
          headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { message?: { key: string }[]; data?: { exercise: ExerciseData } };
        if (data.message?.[0]?.key === 'success' && data.data?.exercise) {
          initExercise(data.data.exercise, eid);
        } else {
          throw new Error('Unexpected response');
        }
      } catch {
        toast.error('Failed to load assessment');
        if (propExercise) initExercise(propExercise, propExercise._id);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlExId, propExercise?._id]);

  /* â”€â”€â”€ Difficulty filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    const f = selectedDiff ? questions.filter(q => q.mcqQuestionDifficulty === selectedDiff) : questions;
    setFilteredQs(f);
    const safeIdx = Math.min(currentIdx, Math.max(0, f.length - 1));
    setCurrentIdx(safeIdx);
    if (f[safeIdx]) loadFor(f[safeIdx], answersRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDiff, questions]);

  /* â”€â”€â”€ Answer handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleRadio = (id: string, q: MCQQuestion) => {
    setSelRadio(id);
    const opt = q.mcqQuestionOptions.find(o => o._id === id);
    if (!opt) return;
    const ic = opt.isCorrect;
    const m = new Map(answers);
    m.set(q._id, { questionId: q._id, optionId: opt._id, optionText: opt.text, isCorrect: ic, score: ic ? qm(q) : 0, status: ic ? 'solved' : 'attempted' });
    persist(m);
  };

  const handleCheckbox = (id: string, q: MCQQuestion) => {
    setSelCheckbox(prev => {
      const s = new Set(prev);
      const m = new Map(answers);
      if (s.has(id)) {
        s.delete(id);
        answers.forEach((v, k) => { if (v.questionId === q._id && v.optionId === id) m.delete(k); });
      } else {
        s.add(id);
        const opt = q.mcqQuestionOptions.find(o => o._id === id);
        if (opt) {
          const ic = opt.isCorrect;
          m.set(`${q._id}_${id}`, { questionId: q._id, optionId: opt._id, optionText: opt.text, isCorrect: ic, score: ic ? qm(q) : 0, status: 'attempted' });
        }
      }
      persist(m);
      return s;
    });
  };

  const handleDropdown = (id: string, q: MCQQuestion) => {
    setSelDropdown(id);
    const opt = q.mcqQuestionOptions.find(o => o._id === id);
    if (!opt) return;
    const ic = opt.isCorrect;
    const m = new Map(answers);
    m.set(q._id, { questionId: q._id, optionId: opt._id, optionText: opt.text, isCorrect: ic, score: ic ? qm(q) : 0, status: ic ? 'solved' : 'attempted' });
    persist(m);
  };

  const handleTF = (v: boolean) => {
    setTfVal(v);
    const q = filteredQs[currentIdx];
    const ic = q.trueFalseAnswer === v;
    const m = new Map(answers);
    m.set(q._id, { questionId: q._id, booleanAnswer: v, isCorrect: ic, score: ic ? qm(q) : 0, status: ic ? 'solved' : 'attempted' });
    persist(m);
  };

  const handleShort = (v: string) => {
    setShortTxt(v);
    const q = filteredQs[currentIdx];
    const m = new Map(answers);
    if (!v.trim()) m.delete(q._id);
    else m.set(q._id, { questionId: q._id, textAnswer: v, isCorrect: false, score: 0, status: 'submitted' });
    persist(m);
  };

  const handleEssay = (v: string) => {
    setEssayTxt(v);
    const q = filteredQs[currentIdx];
    const m = new Map(answers);
    if (!v.trim()) m.delete(q._id);
    else m.set(q._id, { questionId: q._id, textAnswer: v, isCorrect: false, score: 0, status: 'submitted' });
    persist(m);
  };

  const handleNum = (v: number) => {
    setNumVal(v);
    const q = filteredQs[currentIdx];
    const ic = Math.abs(v - (q.numericAnswer ?? 0)) <= (q.numericTolerance ?? 0);
    const m = new Map(answers);
    m.set(q._id, { questionId: q._id, numericAnswer: v, isCorrect: ic, score: ic ? qm(q) : 0, status: ic ? 'solved' : 'attempted' });
    persist(m);
  };

  const handleMatch = (ans: { left: string; right: string }[]) => {
    setMatchAns(ans);
    const q = filteredQs[currentIdx];
    const cp = q.matchingPairs ?? [];
    let ac = ans.length === cp.length;
    if (ac) for (const p of cp) { const mx = ans.find(a => a.left === p.left); if (!mx || mx.right !== p.right) { ac = false; break; } }
    const m = new Map(answers);
    m.set(q._id, { questionId: q._id, matchingAnswers: ans, isCorrect: ac, score: ac ? qm(q) : 0, status: ans.length > 0 ? (ac ? 'solved' : 'attempted') : 'skipped' });
    persist(m);
  };

  const handleOrder = (ans: { itemId: string; order: number }[]) => {
    setOrderAns(ans);
    const q = filteredQs[currentIdx];
    const ci = q.orderingItems ?? [];
    let ac = ans.length === ci.length;
    if (ac) for (let i = 0; i < ans.length; i++) {
      const it = ci.find(x => x._id === ans[i].itemId);
      if (!it || it.order !== ans[i].order) { ac = false; break; }
    }
    const m = new Map(answers);
    m.set(q._id, { questionId: q._id, orderingAnswers: ans, isCorrect: ac, score: ac ? qm(q) : 0, status: ans.length > 0 ? (ac ? 'solved' : 'attempted') : 'skipped' });
    persist(m);
  };

  const toggleFlag = (idx: number) => {
    const actualIdx = questions.findIndex(x => x._id === filteredQs[idx]._id);
    setFlagged(prev => {
      const s = new Set(prev);
      s.has(actualIdx) ? s.delete(actualIdx) : s.add(actualIdx);
      if (exData?._id) localStorage.setItem(`mcq_flagged_${exData._id}`, JSON.stringify([...s]));
      return s;
    });
  };

  /* â”€â”€â”€ API submit helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const doPost = async (fd: FormData) => {
    try {
      await fetch('http://localhost:5533/courses/answers/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
    } catch { /* ignore individual save failures */ }
  };

  const mkBase = (q: MCQQuestion, nt: string, lang: string) => {
    const fd = new FormData();
    fd.append('courseId',    getCourseId());
    fd.append('exerciseId',  exData?._id ?? '');
    fd.append('questionId',  q._id);
    fd.append('category',    getCategory());
    fd.append('subcategory', getSub());
    fd.append('nodeId',      nodeId);
    fd.append('nodeName',    exData?.exerciseInformation?.exerciseName ?? 'MCQ Assessment');
    fd.append('nodeType',    nt);
    fd.append('language',    lang);
    return fd;
  };

  const doSkip = async (q: MCQQuestion, status = 'skipped') => {
    const fd = mkBase(q, q.mcqQuestionType, 'text');
    fd.append('code', ''); fd.append('score', '0'); fd.append('status', status);
    await doPost(fd);
  };

  const saveCurrentAnswer = async () => {
    if (!filteredQs[currentIdx] || !exData) return;
    const q = filteredQs[currentIdx];
    const m = qm(q);

    switch (q.mcqQuestionType) {
      case 'multiple_choice': {
        if (!selRadio) break;
        const opt = q.mcqQuestionOptions.find(o => o._id === selRadio); if (!opt) break;
        const ic = opt.isCorrect;
        const fd = mkBase(q, 'mcq', 'text'); fd.append('code', opt.text); fd.append('score', (ic ? m : 0).toString()); fd.append('status', ic ? 'solved' : 'attempted');
        await doPost(fd); break;
      }
      case 'multiple_select': {
        if (!selCheckbox.size) break;
        for (const id of selCheckbox) {
          const opt = q.mcqQuestionOptions.find(o => o._id === id); if (!opt) continue;
          const ic = opt.isCorrect;
          const fd = mkBase(q, 'mcq', 'text'); fd.append('code', opt.text); fd.append('score', (ic ? m : 0).toString()); fd.append('status', 'attempted');
          await doPost(fd);
        }
        break;
      }
      case 'dropdown': {
        if (!selDropdown) break;
        const opt = q.mcqQuestionOptions.find(o => o._id === selDropdown); if (!opt) break;
        const ic = opt.isCorrect;
        const fd = mkBase(q, 'mcq', 'text'); fd.append('code', opt.text); fd.append('score', (ic ? m : 0).toString()); fd.append('status', ic ? 'solved' : 'attempted');
        await doPost(fd); break;
      }
      case 'true_false': {
        if (tfVal === null) break;
        const ic = q.trueFalseAnswer === tfVal;
        const fd = mkBase(q, 'true_false', 'text'); fd.append('code', String(tfVal)); fd.append('score', (ic ? m : 0).toString()); fd.append('status', ic ? 'solved' : 'attempted');
        await doPost(fd); break;
      }
      case 'short_answer': {
        if (!shortTxt.trim()) break;
        const fd = mkBase(q, 'short_answer', 'text'); fd.append('code', shortTxt); fd.append('score', '0'); fd.append('status', 'submitted');
        await doPost(fd); break;
      }
      case 'essay': {
        if (!essayTxt.trim()) break;
        const fd = mkBase(q, 'essay', 'text'); fd.append('code', essayTxt); fd.append('score', '0'); fd.append('status', 'submitted');
        await doPost(fd); break;
      }
      case 'numeric': {
        if (numVal === null) break;
        const ic = Math.abs(numVal - (q.numericAnswer ?? 0)) <= (q.numericTolerance ?? 0);
        const fd = mkBase(q, 'numeric', 'text'); fd.append('code', String(numVal)); fd.append('score', (ic ? m : 0).toString()); fd.append('status', ic ? 'solved' : 'attempted');
        await doPost(fd); break;
      }
      case 'matching': {
        if (!matchAns.length) break;
        const cp = q.matchingPairs ?? [];
        let ac = matchAns.length === cp.length;
        if (ac) for (const p of cp) { const mx = matchAns.find(a => a.left === p.left); if (!mx || mx.right !== p.right) { ac = false; break; } }
        const fd = mkBase(q, 'matching', 'json'); fd.append('code', JSON.stringify(matchAns)); fd.append('score', (ac ? m : 0).toString()); fd.append('status', ac ? 'solved' : 'attempted');
        await doPost(fd); break;
      }
      case 'ordering': {
        if (!orderAns.length) break;
        const ci = q.orderingItems ?? [];
        let ac = orderAns.length === ci.length;
        if (ac) for (let i = 0; i < orderAns.length; i++) { const it = ci.find(x => x._id === orderAns[i].itemId); if (!it || it.order !== orderAns[i].order) { ac = false; break; } }
        const fd = mkBase(q, 'ordering', 'json'); fd.append('code', JSON.stringify(orderAns)); fd.append('score', (ac ? m : 0).toString()); fd.append('status', ac ? 'solved' : 'attempted');
        await doPost(fd); break;
      }
    }
  };

  /* â”€â”€â”€ Handle time-up (called from timer interval) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleTimeUp = async () => {
    setIsSubmitting(true);
    await saveCurrentAnswer();
    // answers state may be stale in closure â€” use ref
    const currentAnswers = answersRef.current;
    for (const q of questions) {
      const answered = (() => {
        switch (q.mcqQuestionType) {
          case 'multiple_select': return Array.from(currentAnswers.values()).some(a => a?.questionId === q._id);
          case 'short_answer': case 'essay': return !!(currentAnswers.get(q._id)?.textAnswer?.trim());
          case 'true_false': return currentAnswers.get(q._id)?.booleanAnswer !== undefined;
          case 'numeric': return currentAnswers.get(q._id)?.numericAnswer !== undefined;
          case 'matching': return !!(currentAnswers.get(q._id)?.matchingAnswers?.length);
          case 'ordering': return !!(currentAnswers.get(q._id)?.orderingAnswers?.length);
          default: return currentAnswers.has(q._id);
        }
      })();
      if (!answered) await doSkip(q, 'timeout');
    }
    setQuizCompleted(true);
    setIsSubmitting(false);
    if (exData?._id) {
      localStorage.removeItem(`mcq_answers_${exData._id}`);
      localStorage.removeItem(`mcq_flagged_${exData._id}`);
    }
  };

  // Wire showTimeUp â†’ handleTimeUp
  useEffect(() => {
    if (showTimeUp) { handleTimeUp(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTimeUp]);

  /* â”€â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const goPrev = async () => {
    if (currentIdx <= 0) return;
    await saveCurrentAnswer();
    const idx = currentIdx - 1;
    loadFor(filteredQs[idx], answersRef.current);
    setCurrentIdx(idx);
  };

  const goNext = async () => {
    await saveCurrentAnswer();
    if (currentIdx < filteredQs.length - 1) {
      const idx = currentIdx + 1;
      loadFor(filteredQs[idx], answersRef.current);
      setCurrentIdx(idx);
    }
  };

  const goJump = async (idx: number) => {
    if (idx < 0 || idx >= filteredQs.length) return;
    await saveCurrentAnswer();
    loadFor(filteredQs[idx], answersRef.current);
    setCurrentIdx(idx);
    setShowSubmit(false);
  };

  const handleSubmitClick = () => {
    const unCount = questions.filter(q => !isQAns(q)).length;
    if (unCount > 0 || flagged.size > 0) setShowSubmit(true);
    else submitQuiz();
  };

  const submitQuiz = async () => {
    if (quizCompleted || isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmit(false);
    await saveCurrentAnswer();
    for (const q of questions) {
      if (!isQAns(q)) await doSkip(q, 'skipped');
    }
    setQuizCompleted(true);
    setIsSubmitting(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (exData?._id) {
      localStorage.removeItem(`mcq_answers_${exData._id}`);
      localStorage.removeItem(`mcq_flagged_${exData._id}`);
    }
  };

  const handleBack = () => { if (onCloseExercise) onCloseExercise(); else router.back(); };

  /* â”€â”€â”€ Computed values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const difficultyCounts = {
    easy:   questions.filter(q => q.mcqQuestionDifficulty === 'easy').length,
    medium: questions.filter(q => q.mcqQuestionDifficulty === 'medium').length,
    hard:   questions.filter(q => q.mcqQuestionDifficulty === 'hard').length,
    total:  questions.length,
  };
  const answeredCount   = questions.filter(q => isQAns(q)).length;
  const unansweredIdx   = filteredQs.map((q, i) => ({ q, i })).filter(({ q }) => !isQAns(q)).map(({ i }) => i);
  const flaggedIdx      = Array.from(flagged)
    .map(ai => filteredQs.findIndex(fq => fq._id === questions[ai]?._id))
    .filter(i => i !== -1)
    .sort((a, b) => a - b);
  const progressPct     = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const filteredAnswered = filteredQs.filter(q => isQAns(q)).length;

  /* â”€â”€â”€ Guards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (loading)       return <LoadingScreen />;
  if (quizCompleted) return (<><ToastContainer /><CompletionScreen onClose={handleBack} timeUp={timeLeft === 0} /></>);

  if (!quizStarted || filteredQs.length === 0) return (
    <div style={{ height: '100vh', background: T.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: T.bg, borderRadius: 18, padding: '36px 28px', textAlign: 'center', border: `1.5px solid ${T.border}`, maxWidth: 320 }}>
        <AlertCircle size={32} style={{ color: T.amber, marginBottom: 14 }} />
        <h2 style={{ fontSize: 16, fontWeight: 800, color: T.textMain, margin: '0 0 6px' }}>
          {selectedDiff ? `No ${selectedDiff} questions` : 'No Questions Found'}
        </h2>
        <p style={{ fontSize: 13, color: T.textMuted }}>
          {selectedDiff ? 'Try a different difficulty level.' : "This assessment has no questions."}
        </p>
        {selectedDiff && (
          <button onClick={() => setSelectedDiff(null)}
            style={{ marginTop: 16, padding: '9px 22px', borderRadius: 9, background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Show All
          </button>
        )}
      </div>
    </div>
  );

  /* â”€â”€â”€ Derive current question metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const cq       = filteredQs[currentIdx];
  const diff     = DIFF_CFG[cq.mcqQuestionDifficulty] ?? { text: T.orange, bg: T.orangeLight };
  const qt       = QTYPE_CFG[cq.mcqQuestionType] ?? { label: cq.mcqQuestionType, color: T.textMuted, bg: T.pageBg };
  const isFl     = flagged.has(questions.findIndex(q => q._id === cq._id));
  const isAnsNow = isQAns(cq);
  const isLast   = currentIdx === filteredQs.length - 1;
  const allDone  = answeredCount === questions.length;

  const gridCols = cq.mcqQuestionOptionsPerRow === 1 ? '1fr'
    : cq.mcqQuestionOptionsPerRow === 3 ? 'repeat(3,1fr)'
    : cq.mcqQuestionOptionsPerRow === 4 ? 'repeat(4,1fr)'
    : 'repeat(2,1fr)';

  /* â”€â”€â”€ Sidebar flagged set (mapped to filtered index space) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const sidebarFlagged = new Set(
    Array.from(flagged)
      .map(ai => questions[ai]?._id)
      .filter((id): id is string => !!id)
      .map(id => filteredQs.findIndex(q => q._id === id))
      .filter(i => i !== -1)
  );

  /* â”€â”€â”€ Timer display values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const timerIsDanger  = timeLeft < 60;
  const timerIsWarning = timeLeft < 300 && !timerIsDanger;
  const timerColor     = timerIsDanger ? T.red : timerIsWarning ? T.amber : T.green;
  const timerPct       = totalDur > 0 ? Math.max(0, (timeLeft / (totalDur * 60)) * 100) : 100;

  /* â”€â”€â”€ Spinner element â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const Spinner = () => <div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', animation: 'mcqSpin 0.6s linear infinite', flexShrink: 0 }} />;

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     RENDER â€” Fixed viewport: header + [scrollable content | sidebar] + nav
     â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", background: T.pageBg, overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:99px;}
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
        @keyframes mcqSpin{to{transform:rotate(360deg);}}
        @keyframes mcqSlideUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes mcqPulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
        .mcq-nav-back:hover{border-color:${T.orange}!important;color:${T.orange}!important;}
        .mcq-flag-btn:hover{border-color:${T.amber}!important;color:${T.amber}!important;}
        .mcq-prev-btn:hover:not(:disabled){border-color:${T.orange}!important;color:${T.orange}!important;}
        .mcq-next-btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px ${T.orangeGlow}!important;}
      `}</style>

      <ToastContainer position="top-right" />

      {/* Dialogs */}
      {showTimeUp && <TimeUpDialog onConfirm={() => { setShowTimeUp(false); }} />}
      {showSubmit && (
        <SubmitDialog
          unansweredCount={unansweredIdx.length}
          flaggedCount={flaggedIdx.length}
          unansweredIndices={unansweredIdx}
          flaggedIndices={flaggedIdx}
          onConfirm={submitQuiz}
          onCancel={() => setShowSubmit(false)}
          onNavigate={goJump}
        />
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• HEADER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div style={{ flexShrink: 0, background: T.bg, borderBottom: `1px solid ${T.border}`, zIndex: 40 }}>

        {/* Row 1 â€” brand + timer + stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 50, gap: 14 }}>

          {/* Left: back + logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button className="mcq-nav-back" onClick={handleBack}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 9, border: `1.5px solid ${T.border}`, background: T.bg, color: T.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <ArrowLeft size={13} /> Back
            </button>

            <div style={{ width: 1, height: 18, background: T.border, flexShrink: 0 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={14} color="#fff" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.textMain }}>SmartCliff</span>
            </div>

            <div style={{ width: 1, height: 18, background: T.border, flexShrink: 0 }} />

            <span style={{ fontSize: 12, fontWeight: 600, color: T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {exData?.exerciseInformation?.exerciseName || urlExName || 'Assessment'}
            </span>
          </div>

          {/* Right: timer + stat pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Timer */}
            {totalDur > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 12px', borderRadius: 8, background: timerIsDanger ? T.redLight : timerIsWarning ? T.amberLight : T.greenLight, border: `1px solid ${timerColor}28`, animation: timerIsDanger ? 'mcqPulse 1s ease-in-out infinite' : 'none' }}>
                <Timer size={12} style={{ color: timerColor }} />
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: timerColor, letterSpacing: '0.04em' }}>
                  {fmtClock(timeLeft)}
                </span>
                <div style={{ width: 36, height: 3, borderRadius: 99, background: `${timerColor}28`, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, borderRadius: 99, transition: 'width 1s linear' }} />
                </div>
              </div>
            )}

            <div style={{ width: 1, height: 18, background: T.border }} />

            {/* Stat pills */}
            {[
              { v: filteredQs.length,                   c: T.blue,    bg: T.blueLight,   l: 'Total'    },
              { v: answeredCount,                        c: T.green,   bg: T.greenLight,  l: 'Answered' },
              { v: questions.length - answeredCount,     c: T.textMuted, bg: T.pageBg,    l: 'Left'     },
              { v: flagged.size,                         c: T.amber,   bg: T.amberLight,  l: 'Flagged'  },
            ].map(({ v, c, bg, l }) => (
              <div key={l} title={l}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 7, background: bg, border: `1px solid ${c}20` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{v}</span>
                <span style={{ fontSize: 9, color: T.textHint, fontWeight: 600 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 â€” progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 9px' }}>
          <div style={{ flex: 1, height: 3, borderRadius: 99, background: T.pageBg, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg,${T.orange},${T.orangeDark})`, borderRadius: 99, transition: 'width 0.5s ease', boxShadow: progressPct > 0 ? `0 0 6px ${T.orangeGlow}` : 'none' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.orange, minWidth: 30 }}>{progressPct}%</span>
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• BODY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/*
        Layout:
          - flex row: [left column | right sidebar]
          - left column is a flex column: [meta bar | SCROLLABLE content | NAV BAR]
          - The nav bar is always at the bottom â€” it's a flexShrink:0 child after the flex:1 scroll area
          - Nothing in the scroll area has its own overflow â€” content just flows naturally
      */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* â”€â”€ Left: question column â”€â”€ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Question meta bar â€” never scrolls */}
          <div style={{ flexShrink: 0, padding: '11px 20px', borderBottom: `1px solid ${T.border}`, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Q number */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span style={{ fontSize: 10, color: T.textHint, fontWeight: 600 }}>Q</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: T.orange, lineHeight: 1 }}>{currentIdx + 1}</span>
                <span style={{ fontSize: 11, color: T.textHint }}>&thinsp;/ {filteredQs.length}</span>
              </div>

              <div style={{ width: 1, height: 14, background: T.border }} />

              {/* Difficulty badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, background: diff.bg }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: diff.text }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: diff.text, textTransform: 'capitalize' }}>{cq.mcqQuestionDifficulty}</span>
              </div>

              {/* Type badge */}
              <div style={{ padding: '3px 8px', borderRadius: 99, background: qt.bg }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: qt.color }}>{qt.label}</span>
              </div>

              {/* Score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 99, background: T.amberLight }}>
                <Award size={9} style={{ color: T.amber }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: T.amber }}>{cq.mcqQuestionScore} pts</span>
              </div>

              {/* Answered badge */}
              {isAnsNow && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 99, background: T.greenLight }}>
                  <CheckCircle size={9} style={{ color: T.green }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.green }}>Answered</span>
                </div>
              )}
            </div>

            {/* Flag button */}
            <button className={isFl ? '' : 'mcq-flag-btn'} onClick={() => toggleFlag(currentIdx)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${isFl ? T.amber : T.border}`, background: isFl ? T.amberLight : 'transparent', color: isFl ? T.amber : T.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              <Flag size={12} fill={isFl ? T.amber : 'none'} />
              {isFl ? 'Flagged' : 'Flag'}
            </button>
          </div>

          {/* â”€â”€ THE SCROLL ZONE â€” question title + inputs, no nested scroll â”€â”€ */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 12px' }}>

            {/* Question title */}
            <ContentBlockRenderer title={cq.mcqQuestionTitle} />

            {/* Description */}
            {cq.mcqQuestionDescription && (
              <div style={{ display: 'flex', gap: 9, padding: '9px 13px', borderRadius: 9, background: T.blueLight, border: `1px solid ${T.blue}18`, margin: '10px 0 16px' }}>
                <HelpCircle size={13} style={{ color: T.blue, flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: T.textSub, margin: 0, lineHeight: 1.6 }}>{cq.mcqQuestionDescription}</p>
              </div>
            )}

            {/* Hint */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16 }}>
              <Info size={11} style={{ color: T.textHint }} />
              <span style={{ fontSize: 11, color: T.textHint }}>
                {HINT_TEXT[cq.mcqQuestionType] ?? 'Answer the question.'}
                {cq.mcqQuestionRequired && <span style={{ color: T.red, marginLeft: 5, fontWeight: 600 }}>&nbsp;* Required</span>}
              </span>
            </div>

            {/* Answer inputs â€” no inner scroll, content flows naturally */}
            {cq.mcqQuestionType === 'dropdown' && (
              <DropdownInput options={cq.mcqQuestionOptions} selectedValue={selDropdown} onChange={id => handleDropdown(id, cq)} disabled={quizCompleted} />
            )}
            {cq.mcqQuestionType === 'short_answer' && (
              <ShortAnswerInput value={shortTxt} onChange={handleShort} disabled={quizCompleted} />
            )}
            {cq.mcqQuestionType === 'essay' && (
              <EssayInput value={essayTxt} onChange={handleEssay} disabled={quizCompleted} />
            )}
            {cq.mcqQuestionType === 'true_false' && (
              <TrueFalse value={tfVal} onChange={handleTF} disabled={quizCompleted} />
            )}
            {cq.mcqQuestionType === 'numeric' && (
              <NumericInput value={numVal} onChange={handleNum} tolerance={cq.numericTolerance} disabled={quizCompleted} />
            )}
            {cq.mcqQuestionType === 'matching' && cq.matchingPairs && (
              <MatchingInput pairs={cq.matchingPairs} answers={matchAns} onChange={handleMatch} disabled={quizCompleted} />
            )}
            {cq.mcqQuestionType === 'ordering' && cq.orderingItems && (
              <OrderingInput items={cq.orderingItems} answers={orderAns} onChange={handleOrder} disabled={quizCompleted} />
            )}
            {(cq.mcqQuestionType === 'multiple_choice' || cq.mcqQuestionType === 'multiple_select') && (
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 9 }}>
                {cq.mcqQuestionOptions?.map((opt, idx) =>
                  cq.mcqQuestionType === 'multiple_select' ? (
                    <CheckboxOption key={opt._id} option={opt} checked={selCheckbox.has(opt._id)} onChange={() => handleCheckbox(opt._id, cq)} index={idx} disabled={quizCompleted} />
                  ) : (
                    <RadioOption key={opt._id} option={opt} checked={selRadio === opt._id} onChange={() => handleRadio(opt._id, cq)} index={idx} disabled={quizCompleted} />
                  )
                )}
              </div>
            )}

            {/* Bottom padding so last option clears the nav bar */}
            <div style={{ height: 8 }} />
          </div>

          {/* â•â• NAV BAR â€” flexShrink:0, always at the very bottom, never moves â•â• */}
          <div style={{ flexShrink: 0, height: 58, borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 12 }}>

            {/* Prev */}
            <button className="mcq-prev-btn" onClick={goPrev} disabled={currentIdx === 0}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${T.border}`, background: T.bg, color: currentIdx === 0 ? T.textHint : T.textSub, fontSize: 13, fontWeight: 600, cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.12s', fontFamily: 'inherit', opacity: currentIdx === 0 ? 0.4 : 1 }}>
              <ChevronLeft size={14} /> Prev
            </button>

            {/* Progress dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {filteredQs
                .slice(Math.max(0, currentIdx - 3), Math.min(filteredQs.length, currentIdx + 4))
                .map((_, rel) => {
                  const abs = Math.max(0, currentIdx - 3) + rel;
                  const cur = abs === currentIdx;
                  const ans = isQAns(filteredQs[abs]);
                  return (
                    <button key={abs} onClick={() => goJump(abs)}
                      style={{ width: cur ? 20 : 6, height: 6, borderRadius: 99, background: cur ? T.orange : ans ? T.green : T.border, border: 'none', cursor: 'pointer', transition: 'all 0.18s', padding: 0, flexShrink: 0 }} />
                  );
                })}
            </div>

            {/* Next / Submit */}
            {!isLast ? (
              <button className="mcq-next-btn" onClick={goNext}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 12px ${T.orangeGlow}`, transition: 'all 0.12s', fontFamily: 'inherit' }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleSubmitClick} disabled={isSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 9, border: 'none', background: allDone ? `linear-gradient(135deg,${T.green},#059669)` : `linear-gradient(135deg,${T.orange},${T.orangeDark})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: allDone ? '0 4px 12px rgba(16,185,129,0.3)' : `0 4px 12px ${T.orangeGlow}`, fontFamily: 'inherit', transition: 'all 0.12s' }}>
                {isSubmitting ? <><Spinner /> Submittingâ€¦</> : <><CheckCircle size={13} /> Submit</>}
              </button>
            )}
          </div>
        </div>

        {/* â”€â”€ Right: Sidebar â”€â”€ */}
        <div style={{ width: 256, flexShrink: 0, borderLeft: `1px solid ${T.border}`, background: T.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Sidebar title */}
          <div style={{ flexShrink: 0, padding: '12px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: T.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Grid3x3 size={12} style={{ color: T.orange }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.textMain, margin: 0 }}>{questions.length} Questions</p>
              <p style={{ fontSize: 9, color: T.textHint, margin: 0 }}>{filteredAnswered} / {filteredQs.length} answered</p>
            </div>
          </div>

          {/* Sidebar scrollable grid area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <QuestionSidebar
              questions={filteredQs}
              currentIndex={currentIdx}
              flaggedQuestions={sidebarFlagged}
              onJump={goJump}
              selectedDifficulty={selectedDiff}
              onDifficultyChange={setSelectedDiff}
              difficultyCounts={difficultyCounts}
              timeLeft={timeLeft}
              totalDuration={totalDur}
              isAnswered={isQAns}
            />
          </div>

          {/* Submit â€” pinned to sidebar bottom */}
          <div style={{ flexShrink: 0, padding: '11px 14px', borderTop: `1px solid ${T.border}` }}>
            <button onClick={handleSubmitClick} disabled={isSubmitting}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 9, border: 'none', background: allDone ? `linear-gradient(135deg,${T.green},#059669)` : `linear-gradient(135deg,${T.orange},${T.orangeDark})`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: allDone ? '0 4px 12px rgba(16,185,129,0.3)' : `0 4px 12px ${T.orangeGlow}`, fontFamily: 'inherit', transition: 'all 0.12s' }}>
              {isSubmitting
                ? <><Spinner /> Submittingâ€¦</>
                : <><CheckCircle size={12} /> {allDone ? 'Submit Assessment' : 'Submit Now'}</>}
            </button>
            {!allDone && (
              <p style={{ fontSize: 10, color: T.textHint, textAlign: 'center', marginTop: 6 }}>
                {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCQ;
