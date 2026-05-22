import React, { useEffect, useState, useCallback, useMemo, useRef, ChangeEvent } from 'react';
import {
  X, ChevronRight, Settings2, FileCode,
  ArrowLeft, ArrowRight, Code, FileText,
  Layers, Calendar, Bell, Award,
  Plus, Minus, Loader2, Mail,
  MessageCircle, Clock, Lock, Eye,
  ChevronDown, ChevronUp, Shuffle,
  Check, List, Terminal,
  AlertCircle, Info, Calculator,
  Home, HelpCircle,
  Shield, UserCheck, Users, EyeOff,
  Hash,
  Book,
  FolderOpen,
  Circle,
  ChevronLeft,
  Database,
  Zap,
  Sparkles,
  ArrowUpRight,
  Square,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { exerciseApi } from '@/apiServices/exercise';
import TipTapEditor from './tiptopEditor';

// ─── Design Tokens ────────────────────────────────────────────────────────────
// Aligned to Coursesidebar.tsx / Coursecontent.tsx palette so the modal feels
// like part of the same product. Accent is #E8640C orange, surfaces are
// Slate-tinted whites, type ramp uses the Slate scale (0F172A → 94A3B8).
const D = {
  orange:      '#E8640C',
  orangeLight: 'rgba(232,100,12,0.10)',
  orangeMed:   'rgba(232,100,12,0.14)',
  orangeGlow:  'rgba(232,100,12,0.18)',
  orangeDark:  '#C8520A',
  bg:          '#ffffff',
  surface:     '#f8fafc',
  surface2:    '#f4f5f7',
  border:      '#eef0f4',
  border2:     '#e5e7eb',
  textMain:    '#0F172A',
  textSub:     '#334155',
  textMuted:   '#475569',
  textHint:    '#94A3B8',
  emerald:     '#10b981',
  blue:        '#3b82f6',
  purple:      '#8b5cf6',
  amber:       '#f59e0b',
  red:         '#ef4444',
};

// ─── Font injection (once) ───────────────────────────────────────────────────
// Inter — same family used by Coursesidebar / Coursecontent.
const injectFonts = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    injected = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  };
})();

// Canonical font stack used throughout the modal (matches Coursesidebar).
const FONT = "'Inter','DM Sans','Segoe UI',sans-serif";

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface ExercisePayload {
  configurationType: 'manual';
  tabType: "I_Do" | "We_Do" | "You_Do";
  subcategory: string;
  exerciseType: 'MCQ' | 'Programming' | 'Combined' | 'Other';
  programmingSettings?: { selectedModule: string; selectedLanguages: string[] };
  exerciseInformation: {
    exerciseId: string; exerciseName: string; description: string;
    exerciseLevel: 'beginner' | 'intermediate' | 'expert';
    totalDuration: number; totalMarks: number;
  };
  totalMarksMCQ?: number;
  totalMarksProgramming?: number;
  questionConfiguration: {
    mcqConfig?: {
      questionConfigType: 'general'; generalQuestionCount: number;
      scoreSettings: { scoreType: 'equalDistribution' | 'questionSpecific'; equalDistribution: number; totalMarks: number };
      attemptLimitEnabled: boolean; submissionAttempts: number;
    };
    programmingConfig?: {
      questionConfigType: 'general' | 'levelBased' | 'selectionLevel';
      generalQuestionCount?: number;
      levelBasedCounts?: { easy: number; medium: number; hard: number };
      selectionLevelCounts?: { easy: number; medium: number; hard: number };
      scoreSettings: {
        scoreType: 'equalDistribution' | 'questionSpecific' | 'levelSpecific';
        equalDistribution: number;
        questionSpecific?: { general: number[]; levelBased: { easy: number[]; medium: number[]; hard: number[] } };
        levelBasedMarks?: { easy: number; medium: number; hard: number };
        levelScoringConfiguration?: {
          easy?: { type: 'question_specific' | 'level_specific'; totalMarks?: number; marksPerQuestion?: number; questionCount?: number };
          medium?: { type: 'question_specific' | 'level_specific'; totalMarks?: number; marksPerQuestion?: number; questionCount?: number };
          hard?: { type: 'question_specific' | 'level_specific'; totalMarks?: number; marksPerQuestion?: number; questionCount?: number };
        };
        totalMarks: number;
      };
      questionFlow: 'freeFlow' | 'controlled';
      attemptLimitEnabled: boolean; submissionAttempts: number;
    };
  };
  availabilityPeriod: {
    startDate: string | null;
    endDate: string | null;          // submission deadline
    cutOffDate?: string | null;      // optional late boundary
    cutOffEnabled?: boolean;
    gracePeriodEnabled: boolean;
    gracePeriodAllowed?: boolean;
    gracePeriodDate?: string | null;
    extendedDays?: number;
    remindGradeBy?: string | null;   // ← add
    remindGradeByEnabled?: boolean;  // ← add
  };
  notificationSettings: {
    notifyUsers: boolean; notifyGmail: boolean; notifyWhatsApp: boolean; gradeSheet: boolean;
  };
}

interface HierarchyData {
  courseName: string; moduleName: string; submoduleName: string;
  topicName: string; subtopicName: string; nodeType: string; level: number;
}

interface ExerciseSettingsProps {
  hierarchyData: HierarchyData; nodeId: string; nodeName: string; nodeType: string;
  subcategory: string; onSave: (exerciseData: ExercisePayload) => void; onClose: () => void;
  isEditing?: boolean; tabType?: 'I_Do' | 'We_Do' | 'You_Do'; initialData?: any; exercise_Id?: string;
  configuredLanguages?: { coreProgram?: string[]; frontend?: string[]; database?: string[] };
  /** When true (opened from ProgrammingQuestionForm), the Config Strategy dropdown is locked */
  lockConfigStrategy?: boolean;
}

interface Step {
  id: number; title: string; subtitle: string; completed: boolean; active: boolean;
  icon: React.ReactNode; indentLevel?: number; isChild?: boolean;
}

interface ValidationErrors {
  exerciseType?: string; selectedModule?: string; selectedLanguages?: string;
  exerciseId?: string; exerciseName?: string; description?: string;
  totalDuration?: string; totalMarks?: string; totalMarksMCQ?: string; totalMarksProgramming?: string;
  mcqGeneralQuestionCount?: string; mcqMarksPerQuestion?: string; mcqTotalMarks?: string;
  programmingGeneralQuestionCount?: string; programmingMarksPerQuestion?: string;
  programmingLevelCounts?: string; programmingLevelCounts_Easy?: string;
  programmingLevelCounts_Medium?: string; programmingLevelCounts_Hard?: string;
  programmingTotalMarks?: string; programmingLevelScoring?: Record<string, string>;
  startDate?: string; endDate?: string; gracePeriod?: string;[key: string]: any;
  exerciseLevel?: string;

}


// ─── Helpers ──────────────────────────────────────────────────────────────────
const isApproximatelyEqual = (a: number, b: number, tolerance = 0.01) => Math.abs(a - b) < tolerance;
const formatDecimal = (v: number) => v % 1 === 0 ? v.toString() : v.toFixed(2);

// ─── InfoTooltip ─────────────────────────────────────────────────────────────
const InfoTooltip: React.FC<{ content: string; side?: 'top' | 'bottom' | 'left' | 'right' }> = ({ content, side = 'top' }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && btnRef.current && tipRef.current) {
      const b = btnRef.current.getBoundingClientRect();
      const t = tipRef.current.getBoundingClientRect();
      let left = 0, top = 0;
      if (side === 'top') { left = b.left + b.width / 2 - t.width / 2; top = b.top - t.height - 8; }
      else if (side === 'bottom') { left = b.left + b.width / 2 - t.width / 2; top = b.bottom + 8; }
      else if (side === 'left') { left = b.left - t.width - 8; top = b.top + b.height / 2 - t.height / 2; }
      else if (side === 'right') { left = b.right + 8; top = b.top + b.height / 2 - t.height / 2; }
      if (left + t.width > window.innerWidth - 10) left = window.innerWidth - t.width - 10;
      if (left < 10) left = 10;
      if (top + t.height > window.innerHeight - 10) top = window.innerHeight - t.height - 10;
      if (top < 10) top = 10;
      setPos({ left, top });
    }
  }, [show, side]);

  return (
    <div className="relative inline-block ml-1 align-middle">
      <button ref={btnRef} type="button"
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        className="focus:outline-none transition-colors"
        style={{ color: D.textHint }}
        aria-label="Information">
        <Info size={12} />
      </button>
      {show && (
        <div ref={tipRef}
          className="fixed z-[9999] p-2.5 text-xs rounded-xl shadow-2xl leading-relaxed"
          style={{ left: pos.left, top: pos.top, maxWidth: 'min(280px,calc(100vw - 40px))', width: 'max-content', background: D.textMain, color: '#fff', fontFamily: FONT }}>
          {content}
        </div>
      )}
    </div>
  );
};

// ─── OInput ──────────────────────────────────────────────────────────────────
const OInput: React.FC<{
  type?: 'text' | 'number' | 'textarea'; value: string | number; onChange: (v: string) => void;
  onBlur?: () => void; placeholder?: string; className?: string; disabled?: boolean;
  readOnly?: boolean; id?: string; error?: string; touched?: boolean;
}> = ({ type = 'text', value, onChange, onBlur, placeholder, className = '', disabled, readOnly, id, error, touched }) => {
  const [internal, setInternal] = useState(value.toString());
  const timer = useRef<NodeJS.Timeout>();

  const isFocused = useRef(false);
  useEffect(() => {
    if (!isFocused.current) {       // ← change existing useEffect to this
      setInternal(value.toString());
    }
  }, [value]);
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInternal(e.target.value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(e.target.value), 50);
  };

  const baseClass = [
    'w-full px-3 py-2 text-sm rounded-lg border transition-all duration-150 outline-none',
    'font-sans',
    error && touched
      ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-1 focus:ring-red-100'
      : 'border-[#eef0f4] bg-white focus:border-[#E8640C] focus:ring-1 focus:ring-[rgba(232,100,12,0.10)]',
    disabled ? 'bg-[#f8fafc] text-[#94A3B8] cursor-not-allowed' : 'text-[#0F172A]',
    readOnly ? 'bg-[#f8fafc] cursor-default text-[#94A3B8]' : '',
    className,
  ].filter(Boolean).join(' ');

  // FIXED
  if (type === 'textarea') return (
    <div className="w-full">
      <textarea
        value={internal}
        onChange={handleChange as any}
        onFocus={() => { isFocused.current = true; }}
        onBlur={() => { isFocused.current = false; onChange(internal); onBlur?.(); }}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        id={id}
        rows={2}
        className={baseClass + ' resize-none leading-relaxed'} />
      {error && touched && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}
    </div>
  );
  // FIXED
  return (
    <div className="w-full">
      <input
        type={type}
        value={internal}
        onChange={handleChange as any}
        onFocus={() => { isFocused.current = true; }}
        onBlur={() => { isFocused.current = false; onChange(internal); onBlur?.(); }}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        id={id}
        className={baseClass} />
      {error && touched && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}
    </div>
  );
};

// ─── ONumberInput ─────────────────────────────────────────────────────────────
const ONumberInput: React.FC<{
  value: number; onChange: (v: number) => void; onBlur?: () => void;
  min?: number; max?: number; placeholder?: string; className?: string;
  id?: string; error?: string; touched?: boolean; disabled?: boolean; style?: React.CSSProperties;
  /** When true, calls onChange on every keystroke (not just blur) for real-time updates */
  liveUpdate?: boolean;
}> = ({ value, onChange, onBlur, min = 0, max = 1000, placeholder, className = '', id, error, touched, disabled, style, liveUpdate = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState<string>(value === 0 ? '' : value.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Sync from parent when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value === 0 ? '' : value.toString());
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty or valid number input (including decimal point)
    if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
      setLocalValue(raw);
      // liveUpdate: push value to parent immediately while typing
      if (liveUpdate) {
        if (raw === '') {
          onChange(0);
        } else {
          const parsed = parseFloat(raw);
          if (!isNaN(parsed) && parsed >= min && parsed <= max) {
            onChange(parsed);
          }
        }
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);

    let finalValue: number;
    const parsed = parseFloat(localValue);

    if (localValue === '' || localValue === '.' || isNaN(parsed)) {
      finalValue = 0;
    } else {
      finalValue = Math.min(max, Math.max(min, parsed));
    }

    // Format display value
    const displayValue = finalValue === 0
      ? ''
      : finalValue % 1 === 0
        ? finalValue.toString()
        : finalValue.toFixed(2);

    setLocalValue(displayValue);

    // Only trigger onChange if value actually changed
    if (finalValue !== value) {
      onChange(finalValue);
    }

    onBlur?.();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        id={id}
        disabled={disabled}
        style={style}
        className={[
          'w-full px-3 py-2 text-sm rounded-lg border transition-all duration-150 outline-none font-sans',
          error && touched
            ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-1 focus:ring-red-100'
            : 'border-[#eef0f4] bg-white focus:border-[#E8640C] focus:ring-1 focus:ring-[rgba(232,100,12,0.10)]',
          disabled ? 'bg-[#f8fafc] text-[#94A3B8] cursor-not-allowed' : 'text-[#0F172A]',
          className,
        ].filter(Boolean).join(' ')}
      />
      {error && touched && (
        <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>
      )}
    </div>
  );
};
// ─── OToggle ──────────────────────────────────────────────────────────────────
const OToggle: React.FC<{
  enabled: boolean; onChange: (v: boolean) => void;
  label?: string; description?: string; className?: string; inline?: boolean;
}> = ({ enabled, onChange, label, description, className = '', inline = false }) => (
  <div className={className}>
    <div className={`flex items-center ${inline ? 'gap-2.5' : 'justify-between'}`}>
      {label && <div className="text-sm font-semibold" style={{ color: D.textMain }}>{label}</div>}
      <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)}
        className="relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 focus:outline-none p-[2px]"
        style={{ background: enabled ? D.orange : '#e5e7eb' }}>
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
      {inline && (
        <span className="text-[10px] font-bold" style={{ color: enabled ? D.emerald : D.red }}>
          {enabled ? 'On' : 'Off'}
        </span>
      )}
    </div>
    {description && <div className="text-xs mt-0.5 leading-relaxed" style={{ color: D.textMuted }}>{description}</div>}
  </div>
);

// ─── PortalDropdown (FIXED: removed invalid style2 prop) ─────────────────────
const PortalDropdown: React.FC<{
  isOpen: boolean; onClose: () => void; triggerRef: React.RefObject<HTMLButtonElement>; children: React.ReactNode; minWidth?: number;
}> = ({ isOpen, onClose, triggerRef, children, minWidth }) => {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('scroll', onClose, true);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('scroll', onClose, true); };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return typeof document !== 'undefined'
    ? require('react-dom').createPortal(
      <div ref={dropRef}
        style={{
          position: 'absolute', top: coords.top, left: coords.left,
          width: Math.max(coords.width, minWidth || 0), zIndex: 9999,
          background: D.bg, border: `1px solid ${D.border}`, borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
        }}>
        {children}
      </div>,
      document.body
    )
    : null;
};

// ─── ExpandableSection ────────────────────────────────────────────────────────
const ExpandableSection: React.FC<{
  id: string; title: string; subtitle: string; icon: React.ReactNode;
  isExpanded: boolean; onToggle: (id: string) => void; children: React.ReactNode;
  onCollapse?: () => void; headerExtra?: React.ReactNode; accent?: string;
}> = ({ id, title, subtitle, icon, isExpanded, onToggle, children, onCollapse, headerExtra, accent = D.orange }) => {
  const handleToggle = () => { if (isExpanded && onCollapse) onCollapse(); onToggle(id); };

  return (
    <div className="rounded-lg border overflow-hidden transition-all duration-200"
      style={{ borderColor: isExpanded ? accent + '40' : D.border, background: D.bg }}>
      <button type="button" onClick={handleToggle} aria-expanded={isExpanded}
        className="w-full flex items-center gap-2 px-3 py-2 text-left focus:outline-none transition-colors hover:bg-[#f8fafc]">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isExpanded ? accent + '15' : D.surface, color: isExpanded ? accent : D.textMuted }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold" style={{ color: D.textMain, fontFamily: FONT }}>{title}</div>
          <div className="text-[10px]" style={{ color: D.textMuted }}>{subtitle}</div>
        </div>
        {headerExtra && <span className="flex-shrink-0" onClick={e => e.stopPropagation()}>{headerExtra}</span>}
        <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{ background: isExpanded ? accent + '15' : 'transparent', color: isExpanded ? accent : D.textMuted, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown size={13} />
        </div>
      </button>
      {isExpanded && (
        <div className="border-t px-3 py-2.5 animate-in fade-in slide-in-from-top-1 duration-150"
          style={{ borderColor: accent + '25', background: '#fdfcfc' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ─── TimePicker ───────────────────────────────────────────────────────────────
const TimePicker: React.FC<{
  value: { hour: number; minute: number };
  onChange: (t: { hour: number; minute: number }) => void;
  disabled?: boolean;
  fieldKey?: string;
  currentDate?: { day: number; month: number; year: number };
  compareWithDate?: { day: number; month: number; year: number; hour: number; minute: number };
}> = ({ value, onChange, disabled, fieldKey, currentDate, compareWithDate }) => {
  const [open, setOpen] = useState(false);
  const [tempHour, setTempHour] = useState(value.hour);
  const [tempMinute, setTempMinute] = useState(value.minute);

  // Update temp values when value changes
  useEffect(() => {
    setTempHour(value.hour);
    setTempMinute(value.minute);
  }, [value]);

  const fmt = (h: number, m: number) => {
    const p = h >= 12 ? 'PM' : 'AM';
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${dh.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${p}`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const mins = Array.from({ length: 60 }, (_, i) => i);

  // Check if we're on the same day as the comparison date
  const isSameDay = useCallback((): boolean => {
    if (!compareWithDate || !currentDate) return false;
    return currentDate.day === compareWithDate.day &&
      currentDate.month === compareWithDate.month &&
      currentDate.year === compareWithDate.year;
  }, [currentDate, compareWithDate]);

  // Check if a specific hour should be disabled
  const isHourDisabled = (hour: number): boolean => {
    if (!compareWithDate || !currentDate) return false;

    if (isSameDay()) {
      // On same day, disable hours that are less than or equal to the compare hour
      // Because if hour is equal, we need to check minutes separately
      return hour < compareWithDate.hour;
    }

    return false;
  };

  // Check if a specific minute should be disabled for a given hour
  const isMinuteDisabled = (hour: number, minute: number): boolean => {
    if (!compareWithDate || !currentDate) return false;

    if (isSameDay()) {
      // On same day, if hour equals compare hour, disable minutes <= compare minute
      if (hour === compareWithDate.hour) {
        return minute <= compareWithDate.minute;
      }
      // If hour is disabled, minutes don't matter
      if (hour < compareWithDate.hour) {
        return true;
      }
    }

    return false;
  };

  const handleHourSelect = (hour: number) => {
    if (isHourDisabled(hour)) return;

    setTempHour(hour);

    // If we're on the same day and selected a later hour, reset minute to 0
    if (isSameDay() && hour > compareWithDate!.hour) {
      setTempMinute(0);
      onChange({ hour, minute: 0 });
    }
    // If we selected the same hour, set minute to compare minute + 1
    else if (isSameDay() && hour === compareWithDate!.hour) {
      const newMinute = compareWithDate!.minute + 1;
      setTempMinute(newMinute);
      onChange({ hour, minute: newMinute });
    }
    // Otherwise, keep current minute
    else {
      onChange({ hour, minute: tempMinute });
    }
  };

  const handleMinuteSelect = (minute: number) => {
    if (isMinuteDisabled(tempHour, minute)) return;
    setTempMinute(minute);
    onChange({ hour: tempHour, minute });
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all"
        style={{
          borderColor: open ? D.orange : D.border,
          background: D.bg,
          color: D.textMain,
          fontFamily: FONT
        }}>
        <Clock size={13} style={{ color: D.orange }} />
        {fmt(value.hour, value.minute)}
        <ChevronDown size={11} style={{ color: D.textMuted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && !disabled && (
        <div className="absolute top-full left-0 mt-2 p-3 rounded-xl shadow-2xl border z-50"
          style={{ background: D.bg, borderColor: D.border, width: 240 }}>
          <div className="flex gap-2">
            {/* Hour Column */}
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: D.textMuted }}>Hour</div>
              <div className="h-28 overflow-y-auto rounded-lg border" style={{ borderColor: D.border }}>
                {hours.map(hour => {
                  const active = tempHour === hour;
                  const isDisabled = isHourDisabled(hour);
                  const dh = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                  const p = hour >= 12 ? 'PM' : 'AM';

                  // Show special indicator for the hour that equals compare hour
                  const isCompareHour = isSameDay() && hour === compareWithDate?.hour;

                  return (
                    <button
                      key={hour}
                      onClick={() => handleHourSelect(hour)}
                      disabled={isDisabled}
                      className="w-full text-left px-2 py-1 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: active ? D.orangeLight : 'transparent',
                        color: active ? D.orange : isDisabled ? D.textHint : D.textSub,
                        fontWeight: active ? 700 : 500,
                        fontFamily: FONT,
                        borderLeft: isCompareHour && !active ? `2px solid ${D.orange}` : 'none'
                      }}>
                      {`${dh}:00 ${p}`}
                      {isCompareHour && !active && (
                        <span className="ml-1 text-[8px]" style={{ color: D.orange }}>(after)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute Column */}
            <div className="flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: D.textMuted }}>Minute</div>
              <div className="h-28 overflow-y-auto rounded-lg border" style={{ borderColor: D.border }}>
                {mins.map(minute => {
                  const active = tempMinute === minute;
                  const isDisabled = isMinuteDisabled(tempHour, minute);

                  // Show the disabled range start marker
                  const isFirstEnabledMinute = isSameDay() &&
                    tempHour === compareWithDate?.hour &&
                    minute === compareWithDate?.minute + 1;

                  return (
                    <button
                      key={minute}
                      onClick={() => handleMinuteSelect(minute)}
                      disabled={isDisabled}
                      className="w-full text-left px-2 py-1 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        background: active ? D.orangeLight : 'transparent',
                        color: active ? D.orange : isDisabled ? D.textHint : D.textSub,
                        fontWeight: active ? 700 : 500,
                        fontFamily: FONT,
                        borderTop: isFirstEnabledMinute ? `1px dashed ${D.orange}` : 'none'
                      }}>
                      {String(minute).padStart(2, '0')}
                      {isFirstEnabledMinute && (
                        <span className="ml-1 text-[8px]" style={{ color: D.orange }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Info text showing disabled range */}
          {isSameDay() && (
            <div className="mt-2 pt-2 text-[10px] border-t" style={{ borderColor: D.border, color: D.orange }}>
              ⏰ Available times must be after {String(compareWithDate!.hour).padStart(2, '0')}:{String(compareWithDate!.minute).padStart(2, '0')}
            </div>
          )}

          <div className="mt-2 pt-2 flex justify-between border-t" style={{ borderColor: D.border }}>
            <button
              onClick={() => {
                const n = new Date();
                const newHour = n.getHours();
                const newMinute = n.getMinutes();

                // Check if current time is valid
                if (isSameDay()) {
                  if (newHour > compareWithDate!.hour ||
                    (newHour === compareWithDate!.hour && newMinute > compareWithDate!.minute)) {
                    onChange({ hour: newHour, minute: newMinute });
                    setTempHour(newHour);
                    setTempMinute(newMinute);
                    setOpen(false);
                  }
                } else {
                  onChange({ hour: newHour, minute: newMinute });
                  setTempHour(newHour);
                  setTempMinute(newMinute);
                  setOpen(false);
                }
              }}
              className="text-xs font-bold transition-colors"
              style={{ color: D.orange }}>
              Now
            </button>
            <button onClick={() => setOpen(false)} className="text-xs font-medium" style={{ color: D.textMuted }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode; required?: boolean; info?: string }> = ({ children, required, info }) => (
  <div className="flex items-center gap-1 mb-1">
    <label className="text-xs font-semibold" style={{ color: D.textSub, fontFamily: FONT }}>{children}</label>
    {required && <span className="text-xs font-bold" style={{ color: D.orange }}>*</span>}
    {info && <InfoTooltip content={info} />}
  </div>
);

// ─── ODropdown ────────────────────────────────────────────────────────────────
const ODropdown: React.FC<{
  value: string; options: { label: string; value: string }[]; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; error?: string; touched?: boolean; className?: string;
}> = ({ value, options, onChange, placeholder = 'Select…', disabled, error, touched, className = '' }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const selected = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`}>
      <button ref={btnRef} type="button" onClick={() => !disabled && setOpen(v => !v)} disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-semibold text-left transition-all outline-none"
        style={{
          borderColor: open ? D.orange : error && touched ? D.red : D.border,
          background: disabled ? D.surface : D.bg,
          color: selected ? D.textMain : D.textMuted,
          fontFamily: FONT,
          boxShadow: open ? `0 0 0 2px ${D.orangeLight}` : '',
        }}>
        <span className="truncate">{selected?.label || placeholder}</span>
        {!disabled && <ChevronDown size={14} style={{ color: D.textMuted, flexShrink: 0, transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }} />}
        {disabled && <Lock size={12} style={{ color: D.textMuted, flexShrink: 0 }} />}
      </button>
      {error && touched && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}
      <PortalDropdown isOpen={open} onClose={() => setOpen(false)} triggerRef={btnRef}>
        <div className="py-1">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm font-semibold flex items-center justify-between transition-colors hover:bg-[#f8fafc]"
              style={{ color: value === opt.value ? D.orange : D.textSub, fontFamily: FONT }}>
              {opt.label}
              {value === opt.value && <Check size={13} style={{ color: D.orange }} />}
            </button>
          ))}
        </div>
      </PortalDropdown>
    </div>
  );
};

// ─── SpinField — tiny up/down number spinner ──────────────────────────────────
const SpinField: React.FC<{
  value: number; min: number; max: number; width?: number;
  disabled?: boolean; onChange: (v: number) => void; pad?: number;
}> = ({ value, min, max, width = 38, disabled, onChange, pad = 2 }) => {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value).padStart(pad, '0'));

  useEffect(() => { setRaw(value === 0 ? '' : String(value).padStart(pad, '0')); }, [value, pad]);

  const commit = (v: string) => {
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= min && n <= max) onChange(n);
    else setRaw(value === 0 ? '' : String(value).padStart(pad, '0'));
  };

  return (
    <div className="flex flex-col items-center" style={{ width }}>
      <button type="button" disabled={disabled}
        onClick={() => { const n = (value || min) < max ? (value || min) + 1 : min; onChange(n); }}
        className="w-full flex items-center justify-center h-4 rounded-t border-x border-t transition-colors hover:bg-[#f8fafc] disabled:opacity-40"
        style={{ borderColor: D.border }}>
        <ChevronUp size={9} style={{ color: D.textMuted }} />
      </button>
      <input
        type="text" inputMode="numeric" value={raw} disabled={disabled}
        onChange={e => setRaw(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(raw); }}
        className="w-full text-center border-x text-[11px] font-bold py-0.5 outline-none transition-all disabled:opacity-40"
        style={{ borderColor: D.border, color: D.textMain, background: disabled ? D.surface : '#fff', fontFamily: FONT }}
      />
      <button type="button" disabled={disabled}
        onClick={() => { const n = (value || min) > min ? (value || min) - 1 : max; onChange(n); }}
        className="w-full flex items-center justify-center h-4 rounded-b border-x border-b transition-colors hover:bg-[#f8fafc] disabled:opacity-40"
        style={{ borderColor: D.border }}>
        <ChevronDown size={9} style={{ color: D.textMuted }} />
      </button>
    </div>
  );
};

// ─── MonthDropField — inline month dropdown ───────────────────────────────────
const MonthDropField: React.FC<{ value: number; disabled?: boolean; onChange: (v: number) => void }> = ({ value, disabled, onChange }) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return (
    <select
      value={value || ''}
      disabled={disabled}
      onChange={e => onChange(parseInt(e.target.value, 10))}
      className="border rounded text-[11px] font-bold px-1 py-0 h-[46px] outline-none transition-all disabled:opacity-40 cursor-pointer"
      style={{ borderColor: D.border, color: value ? D.textMain : D.textMuted, background: disabled ? D.surface : '#fff', fontFamily: FONT, width: 80 }}
    >
      <option value="">Month</option>
      {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
    </select>
  );
};

// ─── DateRowPicker ─────────────────────────────────────────────────────────────
const DateRowPicker: React.FC<{
  label: string; fieldKey: string; icon: string; color: string; toggleable: boolean;
  data: any; isEnabled: boolean; activePicker: { field: string | null; type: string | null };
  setActivePicker: (v: { field: string | null; type: string | null }) => void;
  onUpdate: (field: string, type: string, value: any) => void;
  onToggleEnable: () => void;
  hasError?: string; isTouched: boolean;
  generateCalendarDays: (year: number, month: number) => (number | null)[];
  isDateDisabled: (year: number, month: number, day: number, fieldKey: string) => boolean;
  isEmptyDate?: boolean; tooltip?: string;
}> = ({
  label, fieldKey, icon, color, toggleable, data, isEnabled, activePicker,
  setActivePicker, onUpdate, onToggleEnable, hasError, isTouched,
  generateCalendarDays, isDateDisabled, isEmptyDate = false, tooltip
}) => {
    const [calMonth, setCalMonth] = useState(data?.month && !isNaN(data.month) ? Number(data.month) : new Date().getMonth() + 1);
    const [calYear, setCalYear] = useState(data?.year && !isNaN(data.year) ? Number(data.year) : new Date().getFullYear());
    const calBtnRef = useRef<HTMLButtonElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const day = data?.day ?? 0;
    const month = data?.month ?? 0;
    const year = data?.year ?? 0;
    const hour = data?.hour ?? 0;
    const minute = data?.minute ?? 0;

    const isOpen = (type: string) => activePicker?.field === fieldKey && activePicker?.type === type;
    const closePicker = () => setActivePicker({ field: null, type: null });

    // Click-outside for calendar popup
    useEffect(() => {
      if (!isOpen('date')) return;
      const handler = (e: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
          calBtnRef.current && !calBtnRef.current.contains(e.target as Node)) closePicker();
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [isOpen('date')]);

    const [pickerPos, setPickerPos] = useState<'top' | 'bottom'>('bottom');
    useEffect(() => {
      if (isOpen('date') && calBtnRef.current) {
        const r = calBtnRef.current.getBoundingClientRect();
        setPickerPos(window.innerHeight - r.bottom < 320 && r.top > 320 ? 'top' : 'bottom');
      }
    }, [isOpen('date')]);

    return (
      <div className="transition-all duration-200 relative overflow-visible"
        style={{
          background: !isEnabled ? D.surface : '#fff',
          opacity: !isEnabled ? 0.65 : 1,
        }}>
        <div className="flex items-center gap-2 px-3 py-2 flex-wrap">

          {/* Toggle */}
          {toggleable && (
            <button type="button" onClick={onToggleEnable}
              className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
              style={{ background: isEnabled ? D.orange : '#e5e7eb' }}>
              <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${isEnabled ? 'translate-x-[17px]' : 'translate-x-0'}`} />
            </button>
          )}

          {/* Row icon */}
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: color + '12', color }}>
            {icon === '▶' && <ArrowRight size={11} />}
            {icon === '⏹' && <Square size={11} />}
            {icon === '↗' && <ArrowUpRight size={11} />}
          </div>

          {/* Label + tooltip - UPDATED TO BLACK */}
          <div className="w-[130px] flex-shrink-0 flex items-center gap-0.5">
            <div className="text-[11px] font-bold leading-tight"
              style={{
                color: isEnabled ? '#000000' : D.textMuted,
                fontFamily: FONT
              }}>
              {label}
            </div>
            {tooltip && <InfoTooltip content={tooltip} side="right" />}
          </div>

          {/* ── Inline date + time fields ── */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {/* Day spinner */}
            <SpinField value={day} min={1} max={31} width={36} disabled={!isEnabled} pad={2}
              onChange={v => onUpdate(fieldKey, 'day', v)} />

            {/* Month dropdown */}
            <MonthDropField value={month} disabled={!isEnabled}
              onChange={v => onUpdate(fieldKey, 'month', v)} />

            {/* Year spinner */}
            <SpinField value={year} min={2020} max={2099} width={50} disabled={!isEnabled} pad={4}
              onChange={v => onUpdate(fieldKey, 'year', v)} />

            {/* Separator */}
            <div className="w-px h-8 flex-shrink-0 mx-0.5" style={{ background: D.border }} />

            {/* Hour spinner */}
            <SpinField value={hour} min={0} max={23} width={34} disabled={!isEnabled} pad={2}
              onChange={v => onUpdate(fieldKey, 'hour', v)} />
            <span className="text-sm font-bold flex-shrink-0" style={{ color: D.textMuted }}>:</span>
            {/* Minute spinner */}
            <SpinField value={minute} min={0} max={59} width={34} disabled={!isEnabled} pad={2}
              onChange={v => onUpdate(fieldKey, 'minute', v)} />

            {/* Calendar icon button */}
            <button
              ref={calBtnRef}
              type="button"
              disabled={!isEnabled}
              onClick={() => {
                if (!isEnabled) return;
                setCalMonth(month > 0 ? month : new Date().getMonth() + 1);
                setCalYear(year > 0 ? year : new Date().getFullYear());
                setActivePicker(isOpen('date') ? { field: null, type: null } : { field: fieldKey, type: 'date' });
              }}
              className="w-8 h-[46px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{
                border: 'none',
                background: isOpen('date') ? color + '10' : D.surface,
                color: isEnabled ? color : D.textMuted,
              }}>
              <Calendar size={13} />
            </button>
          </div>
        </div>

        {/* Calendar popup */}
        {isOpen('date') && (
          <div ref={pickerRef}
            className="fixed z-[200] p-3 rounded-xl shadow-2xl"
            style={{
              background: D.bg, width: 270,
              top: calBtnRef.current
                ? (pickerPos === 'bottom'
                  ? calBtnRef.current.getBoundingClientRect().bottom + window.scrollY + 6
                  : calBtnRef.current.getBoundingClientRect().top + window.scrollY - 326)
                : 'auto',
              left: calBtnRef.current
                ? Math.min(Math.max(calBtnRef.current.getBoundingClientRect().left + window.scrollX - 220, 10), window.innerWidth - 280)
                : 'auto',
            }}>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[#f4f5f7]" style={{ color: D.textMuted }}>
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs font-bold" style={{ color: '#000000', fontFamily: FONT }}>
                {monthsFull[calMonth - 1]} {calYear}
              </span>
              <button onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[#f4f5f7]" style={{ color: D.textMuted }}>
                <ChevronRight size={13} />
              </button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-[9px] font-bold py-0.5" style={{ color: D.textHint }}>{d}</div>
              ))}
            </div>
            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {generateCalendarDays(calYear, calMonth).map((d, idx) => {
                const dis = d ? isDateDisabled(calYear, calMonth, d, fieldKey) : false;
                const sel = data?.day === d && data?.month === calMonth && data?.year === calYear;
                return (
                  <button key={idx}
                    onClick={() => {
                      if (d && !dis) {
                        onUpdate(fieldKey, 'day', d);
                        onUpdate(fieldKey, 'month', calMonth);
                        onUpdate(fieldKey, 'year', calYear);
                        closePicker();
                      }
                    }}
                    disabled={!d || dis}
                    className="h-7 w-7 mx-auto text-[11px] rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: sel ? color : 'transparent',
                      color: sel ? '#fff' : dis ? D.textHint : '#000000',
                      cursor: !d || dis ? 'default' : 'pointer',
                      fontWeight: sel ? 700 : 500,
                      fontFamily: FONT,
                    }}>
                    {d}
                  </button>
                );
              })}
            </div>
            {/* Footer */}
            <div className="mt-2 pt-2 flex justify-between" style={{ borderTop: 'none' }}>
              <button onClick={closePicker} className="text-xs font-bold" style={{ color: D.textMuted }}>Close</button>
              <button
                onClick={() => {
                  const t = new Date();
                  onUpdate(fieldKey, 'day', t.getDate());
                  onUpdate(fieldKey, 'month', t.getMonth() + 1);
                  onUpdate(fieldKey, 'year', t.getFullYear());
                  onUpdate(fieldKey, 'hour', t.getHours());
                  onUpdate(fieldKey, 'minute', t.getMinutes());
                  closePicker();
                }}
                className="text-xs font-bold" style={{ color }}>
                Today
              </button>
            </div>
          </div>
        )}

        {/* Validation error */}
        {hasError && isTouched && (
          <div className="px-3 pb-2 flex items-center gap-1.5" style={{ color: D.red }}>
            <AlertCircle size={11} /><p className="text-xs">{hasError}</p>
          </div>
        )}
      </div>
    );
  };
// =============================================================================
// GRADE ROW — defined at module level so its reference is stable across renders.
// Placing it inside a useCallback/useMemo would create a new component type on
// every invocation, causing React to unmount + remount ONumberInput and reset
// the user's typed value between keystrokes.
// =============================================================================
const GradeRow = React.memo(({
  icon, color, label, info, fieldKey, value, onChange, onBlur,
  autoValue, error, errorTouched,
}: {
  icon: React.ReactNode; color: string; label: string; info: string;
  fieldKey?: string;
  value?: number | null; onChange?: (v: number) => void; onBlur?: () => void;
  autoValue?: number | string; error?: string; errorTouched?: boolean;
}) => (
  <div className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: D.border }}>
    <div className="flex items-center gap-2.5 flex-1 mr-4">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '12', color }}>{icon}</div>
      <div>
        <div className="flex items-center gap-0.5">
          <span className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: FONT }}>{label}</span>
          {!autoValue && <span className="text-xs font-bold" style={{ color: D.orange }}>*</span>}
          <InfoTooltip content={info} side="right" />
        </div>
        {error && errorTouched && <p className="text-[10.5px] mt-0.5" style={{ color: D.red }}>{error}</p>}
      </div>
    </div>
    <div className="w-32 flex-shrink-0">
      {autoValue !== undefined ? (
        <div className="relative">
          <input disabled value={autoValue} placeholder="Auto"
            className="w-full px-3 py-1.5 text-sm rounded-lg border"
            style={{ borderColor: D.border, background: D.surface, color: D.textMuted }} />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: D.orange }}>Auto</span>
        </div>
      ) : (
        <ONumberInput
          value={value ?? 0}
          onChange={onChange!}
          onBlur={onBlur}
          placeholder="0"
          error={error}
          touched={errorTouched}
        />
      )}
    </div>
  </div>
));

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const ExerciseSettings: React.FC<ExerciseSettingsProps> = ({
  hierarchyData, nodeId, nodeName, nodeType, subcategory, onSave, onClose,
  isEditing = false, tabType = 'We_Do', initialData, exercise_Id, configuredLanguages,
  lockConfigStrategy = false,
}) => {
  // Lock Config Strategy if:
  // 1. Opened from ProgrammingQuestionForm (lockConfigStrategy prop), OR
  // 2. Editing AND 'Question Configuration' step was already saved (config already committed)
  // Computed after savedSteps is declared below — see isConfigStrategyLocked usage.
  injectFonts();
  console.log('[ExerciseSettings] configuredLanguages prop:', configuredLanguages);


  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [savedSteps, setSavedSteps] = useState<Set<string>>(new Set());
  // Config Strategy is locked when opened from ProgrammingQuestionForm OR when editing
  // and the Question Configuration step was already saved (config already committed to DB)
  const isConfigStrategyLocked = lockConfigStrategy || (isEditing && savedSteps.has('Question Configuration'));
  // Tracks steps that have been SAVED to DB with all required fields filled
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLocked, setIsLocked] = useState(false);
  // Tracks the DB _id created during the step-save flow (create mode only)
  const [localExerciseId, setLocalExerciseId] = useState<string | null>(exercise_Id || null);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [activePicker, setActivePicker] = useState<{ field: string | null; type: string | null }>({ field: null, type: null });
  const [mcqScoringOpen, setMcqScoringOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isScoringOpen, setIsScoringOpen] = useState(false);
  // For Combined exercise type: track which tab is active in the unified Question Configuration step
  const [combinedConfigTab, setCombinedConfigTab] = useState<'mcq' | 'programming'>('mcq');
  const [isOpen, setIsOpen] = useState(false);
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const configBtnRef = useRef<HTMLButtonElement>(null);
  // Stores the initialData reference that was last used to seed completedSteps
  // Allows re-initialization when a different exercise is opened for editing
  const completedStepsInitialized = useRef<any>(null);
  const levelScoringBtnRefs = useRef<{ easy: HTMLButtonElement | null; medium: HTMLButtonElement | null; hard: HTMLButtonElement | null }>({ easy: null, medium: null, hard: null });
  const [levelScoringOpen, setLevelScoringOpen] = useState<{ easy: boolean; medium: boolean; hard: boolean }>({ easy: false, medium: false, hard: false });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['configuration']));
  // Add this near other useState declarations (around line 550-600)
  const [isLockedForEdit, setIsLockedForEdit] = useState(isEditing && initialData?.exerciseInformation?.exerciseId !== undefined);
  const [progScoringRevealed, setProgScoringRevealed] = useState<{ easy: boolean; medium: boolean; hard: boolean }>({ easy: false, medium: false, hard: false });
  const handleToggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); if (id === 'scoring') setLevelScoringOpen({ easy: false, medium: false, hard: false }); }
      else n.add(id);
      return n;
    });
  }, []);

  const [formData, setFormData] = useState({
    exerciseType: '' as 'MCQ' | 'Programming' | 'Combined' | 'Other' | '',
    selectedModule: '', selectedLanguages: [] as string[],
    exerciseId: `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    exerciseName: '', description: '',
    exerciseLevel: '' as 'beginner' | 'intermediate' | 'expert',
    isGraded: false,
    totalDuration: 60, totalMarks: 0, totalMarksMCQ: 0, totalMarksProgramming: 0,
    mcqConfig: {
      questionConfigType: 'general' as const, generalQuestionCount: 0,
      scoreSettings: { scoreType: 'equalDistribution' as 'equalDistribution' | 'questionSpecific', equalDistribution: 0, totalMarks: 0 },
      attemptLimitEnabled: false, submissionAttempts: 1,
    },
    programmingConfig: {
      questionConfigType: '' as '' | 'general' | 'levelBased' | 'selectionLevel',
      generalQuestionCount: 0, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
      levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
      scoreSettings: {
        scoreType: 'equalDistribution' as 'equalDistribution' | 'questionSpecific' | 'levelSpecific',
        equalDistribution: 0,
        questionSpecific: { general: [] as number[], levelBased: { easy: [] as number[], medium: [] as number[], hard: [] as number[] } },
        levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
        levelScoringConfiguration: {
          easy: { type: 'level_specific' as 'question_specific' | 'level_specific', marksPerQuestion: 0, totalMarks: undefined as number | undefined, questionCount: 0 },
          medium: { type: 'level_specific' as 'question_specific' | 'level_specific', marksPerQuestion: 0, totalMarks: undefined as number | undefined, questionCount: 0 },
          hard: { type: 'level_specific' as 'question_specific' | 'level_specific', marksPerQuestion: 0, totalMarks: undefined as number | undefined, questionCount: 0 },
        },
        totalMarks: 0,
      },
      questionFlow: 'freeFlow' as 'freeFlow' | 'controlled', attemptLimitEnabled: false, submissionAttempts: 1,
      compilerFileMode: 'multiple' as 'single' | 'multiple',
    },
    othersConfig: {
      questionConfigType: 'general' as 'general' | 'levelBased' | 'selectionLevel',
      scoringType: 'equalDistribution' as 'equalDistribution' | 'questionSpecific' | 'levelBased',
      totalQuestions: 0,
      marksPerQuestion: 0,
      generalQuestionCount: 0,
      selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
      levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
      levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
      scoreSettings: {
        scoreType: 'equalDistribution' as 'equalDistribution' | 'questionSpecific' | 'levelSpecific',
        equalDistribution: 0,
        questionSpecific: { general: [] as number[], levelBased: { easy: [] as number[], medium: [] as number[], hard: [] as number[] } },
        levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
        levelScoringConfiguration: {
          easy: { type: 'level_specific' as 'question_specific' | 'level_specific', marksPerQuestion: 0, totalMarks: undefined as number | undefined, questionCount: 0 },
          medium: { type: 'level_specific' as 'question_specific' | 'level_specific', marksPerQuestion: 0, totalMarks: undefined as number | undefined, questionCount: 0 },
          hard: { type: 'level_specific' as 'question_specific' | 'level_specific', marksPerQuestion: 0, totalMarks: undefined as number | undefined, questionCount: 0 },
        },
        totalMarks: 0,
      },
      questionFlow: 'freeFlow' as 'freeFlow' | 'controlled',
      attemptLimitEnabled: false,
      submissionAttempts: 1,
    },
    schedule: {
      allowSubmissions: true,

      startDate: (() => {
        const t = new Date();
        return {
          day: t.getDate(),
          month: t.getMonth() + 1,
          year: t.getFullYear(),
          hour: t.getHours(),    // current hour
          minute: t.getMinutes() // current minute
        };
      })(),
      endDate: (() => {
        const t = new Date(Date.now() + 86400000);
        return {
          day: t.getDate(),
          month: t.getMonth() + 1,
          year: t.getFullYear(),
          hour: t.getHours(),    // current hour (of tomorrow)
          minute: t.getMinutes() // current minute (of tomorrow)
        };
      })(),

      cutOffDate: { day: 0, month: 0, year: 0, hour: 23, minute: 59 },
      remindGradeByEnabled: false,
      remindGradeBy: { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
      gracePeriodEnabled: false,
      gracePeriodDate: { day: 0, month: 0, year: 0, hour: 23, minute: 59 },
    },
    notifyUsers: true, notifyGmail: false, notifyWhatsApp: false, gradeSheet: true,
    notifications: {
      notifyGradersSubmissions: false,
      notifyGradersSubmissionsChannels: { dashboard: false, gmail: false, whatsapp: false },
      notifyGradersLateSubmissions: false,
      notifyGradersLateSubmissionsChannels: { dashboard: false, gmail: false, whatsapp: false },
      notifyStudent: true,
notifyStudentChannels: { dashboard: true, gmail: false, whatsapp: false },
    },
    grades: {
      mcqGrade: null as number | null,
      mcqGradeToPass: null as number | null,
      programmingGrade: null as number | null,
      programmingGradeToPass: null as number | null,
      combinedGrade: null as number | null,
      combinedGradeToPass: null as number | null,
      separateMarks: false,
      // NEW:
      difficultyPassEnabled: false,
      // Programming-side per-difficulty pass marks (existing fields).
      easyPassMark: null as number | null,
      mediumPassMark: null as number | null,
      hardPassMark: null as number | null,
      // MCQ-side per-difficulty pass marks (Combined exercises store MCQ
      // pass marks SEPARATELY from Programming pass marks).
      mcqEasyPassMark: null as number | null,
      mcqMediumPassMark: null as number | null,
      mcqHardPassMark: null as number | null,
      overallMarkToPassEnabled: false,
      overallMarkToPass: null as number | null,
    },
    additionalOptions: {
      anonymousSubmissions: false,
      hideGraderIdentity: false,
    },
    allQuestionsRequired: false,
  });

  // ── Populate formData when editing ─────────────────────────────────────────
  useEffect(() => {
    if (!isEditing || !initialData) return;
    const ex = initialData as any;
    const info = ex.exerciseInformation ?? {};
    const progSettings = ex.programmingSettings ?? {};
    const qc = ex.questionConfiguration ?? {};
    const mcqCfg = qc.mcqQuestionConfiguration ?? {};
    const progCfg = qc.programmingQuestionConfiguration ?? qc.programmingConfig ?? {};
    const avail = ex.availabilityPeriod ?? {};
    const notif = ex.notificationSettings ?? ex.notificatonandGradeSettings ?? {};

    const parseDate = (str: string | undefined, fb: any) => {
      if (!str) return fb;
      try { const d = new Date(str); if (isNaN(d.getTime())) return fb; return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear(), hour: d.getHours(), minute: d.getMinutes() }; } catch { return fb; }
    };
    const today = new Date(), nw = new Date(), tw = new Date();
    nw.setDate(today.getDate() + 7); tw.setDate(today.getDate() + 14);
    const dS = { day: today.getDate(), month: today.getMonth() + 1, year: today.getFullYear(), hour: 0, minute: 0 };
    const dE = { day: nw.getDate(), month: nw.getMonth() + 1, year: nw.getFullYear(), hour: 23, minute: 59 };
    const dG = { day: tw.getDate(), month: tw.getMonth() + 1, year: tw.getFullYear(), hour: 23, minute: 59 };

    const mcqScoreType: 'equalDistribution' | 'questionSpecific' = (mcqCfg.scoringType === 'equalDistribution' || mcqCfg.scoringType === 'evenMarks') ? 'equalDistribution' : mcqCfg.scoringType === 'questionSpecific' ? 'questionSpecific' : 'equalDistribution';
    const progConfigType = (progCfg.questionConfigType as any) || 'general';
    const normLevel = (lvl: any) => {
      if (!lvl) return { type: 'level_specific' as const, marksPerQuestion: 0, totalMarks: undefined, questionCount: 0 };
      return { type: (lvl.type === 'question_specific' ? 'question_specific' : 'level_specific') as any, marksPerQuestion: lvl.marksPerQuestion ?? 0, totalMarks: lvl.totalMarks as number | undefined, questionCount: lvl.questionCount ?? 0 };
    };
    const levelScoringCfg = progCfg.scoreSettings?.levelScoringConfiguration ?? {};
    const evenMarksVal = progCfg.generalMarksPerQuestion ?? progCfg.scoreSettings?.evenMarks ?? progCfg.scoreSettings?.equalDistribution ?? 0;

    setFormData(prev => ({
      ...prev,
      exerciseType: (ex.exerciseType as any) || '',
      isGraded: ex.isGraded !== false,
      selectedModule: progSettings.selectedModule ?? prev.selectedModule,
      selectedLanguages: Array.isArray(progSettings.selectedLanguages) ? progSettings.selectedLanguages : prev.selectedLanguages,
      exerciseId: info.exerciseId ?? prev.exerciseId,
      exerciseName: info.exerciseName ?? '',
      description: typeof info.description === 'string' ? info.description : (info.description?.text ?? ''),
      exerciseLevel: (info.exerciseLevel as any) ?? 'intermediate',
      totalDuration: info.totalDuration ?? 60,
      totalMarks: info.totalMarks ?? 0,
      totalMarksMCQ: info.totalMarksMCQ ?? 0,
      totalMarksProgramming: info.totalMarksProgramming ?? 0,
      allQuestionsRequired: ex.questionBehavior?.allQuestionsRequired ?? true,
      mcqConfig: { questionConfigType: 'general', generalQuestionCount: mcqCfg.totalMcqQuestions ?? 0, scoreSettings: { scoreType: mcqScoreType, equalDistribution: mcqCfg.marksPerQuestion ?? 0, totalMarks: mcqCfg.mcqTotalMarks ?? 0 }, attemptLimitEnabled: mcqCfg.attemptLimitEnabled ?? false, submissionAttempts: mcqCfg.submissionAttempts ?? 1 },
      programmingConfig: {
        questionConfigType: progConfigType,
        generalQuestionCount: progCfg.generalQuestionCount ?? 0,
        selectionLevelCounts: { easy: progCfg.selectionLevelCounts?.easy ?? 0, medium: progCfg.selectionLevelCounts?.medium ?? 0, hard: progCfg.selectionLevelCounts?.hard ?? 0 },
        levelBasedCounts: { easy: progCfg.levelBasedCounts?.easy ?? 0, medium: progCfg.levelBasedCounts?.medium ?? 0, hard: progCfg.levelBasedCounts?.hard ?? 0 },
        scoreSettings: {
          scoreType: 'equalDistribution', equalDistribution: evenMarksVal,
          questionSpecific: { general: progCfg.scoreSettings?.separateMarks?.general ?? [], levelBased: { easy: progCfg.scoreSettings?.separateMarks?.levelBased?.easy ?? [], medium: progCfg.scoreSettings?.separateMarks?.levelBased?.medium ?? [], hard: progCfg.scoreSettings?.separateMarks?.levelBased?.hard ?? [] } },
          levelBasedMarks: { easy: progCfg.scoreSettings?.levelBasedMarks?.easy ?? 0, medium: progCfg.scoreSettings?.levelBasedMarks?.medium ?? 0, hard: progCfg.scoreSettings?.levelBasedMarks?.hard ?? 0 },
          levelScoringConfiguration: { easy: normLevel(levelScoringCfg.easy), medium: normLevel(levelScoringCfg.medium), hard: normLevel(levelScoringCfg.hard) },
          totalMarks: progCfg.scoreSettings?.totalMarks ?? 0,
        },
        questionFlow: (progCfg.questionFlow as any) ?? 'freeFlow', attemptLimitEnabled: progCfg.attemptLimitEnabled ?? false, submissionAttempts: progCfg.submissionAttempts ?? 1,
        compilerFileMode: (progCfg.compilerFileMode as any) ?? 'multiple',
      },
      othersConfig: {
        questionConfigType: (qc.othersQuestionConfiguration?.questionConfigType as any) ?? 'general',
        generalQuestionCount: qc.othersQuestionConfiguration?.generalQuestionCount ?? 0,
        selectionLevelCounts: { easy: qc.othersQuestionConfiguration?.selectionLevelCounts?.easy ?? 0, medium: qc.othersQuestionConfiguration?.selectionLevelCounts?.medium ?? 0, hard: qc.othersQuestionConfiguration?.selectionLevelCounts?.hard ?? 0 },
        levelBasedCounts: { easy: qc.othersQuestionConfiguration?.levelBasedCounts?.easy ?? 0, medium: qc.othersQuestionConfiguration?.levelBasedCounts?.medium ?? 0, hard: qc.othersQuestionConfiguration?.levelBasedCounts?.hard ?? 0 },
        scoreSettings: {
          scoreType: 'equalDistribution',
          equalDistribution: qc.othersQuestionConfiguration?.generalMarksPerQuestion ?? qc.othersQuestionConfiguration?.scoreSettings?.evenMarks ?? 0,
          questionSpecific: { general: qc.othersQuestionConfiguration?.scoreSettings?.separateMarks?.general ?? [], levelBased: { easy: qc.othersQuestionConfiguration?.scoreSettings?.separateMarks?.levelBased?.easy ?? [], medium: qc.othersQuestionConfiguration?.scoreSettings?.separateMarks?.levelBased?.medium ?? [], hard: qc.othersQuestionConfiguration?.scoreSettings?.separateMarks?.levelBased?.hard ?? [] } },
          levelBasedMarks: { easy: qc.othersQuestionConfiguration?.scoreSettings?.levelBasedMarks?.easy ?? 0, medium: qc.othersQuestionConfiguration?.scoreSettings?.levelBasedMarks?.medium ?? 0, hard: qc.othersQuestionConfiguration?.scoreSettings?.levelBasedMarks?.hard ?? 0 },
          levelScoringConfiguration: { easy: normLevel(qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.easy), medium: normLevel(qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.medium), hard: normLevel(qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.hard) },
          totalMarks: qc.othersQuestionConfiguration?.scoreSettings?.totalMarks ?? 0,
        },
        questionFlow: (qc.othersQuestionConfiguration?.questionFlow as any) ?? 'freeFlow',
        attemptLimitEnabled: qc.othersQuestionConfiguration?.attemptLimitEnabled ?? false,
        submissionAttempts: qc.othersQuestionConfiguration?.submissionAttempts ?? 1,
      },
      schedule: { allowSubmissions: true, startDate: parseDate(avail.startDate, dS), endDate: parseDate(avail.endDate || avail.dueDate, dE), cutOffEnabled: avail.cutOffEnabled ?? avail.cutoffEnabled ?? false, cutOffDate: parseDate(avail.cutOffDate, dE), remindGradeByEnabled: avail.remindGradeByEnabled ?? !!avail.remindGradeBy, remindGradeBy: parseDate(avail.remindGradeBy, dG), gracePeriodEnabled: avail.gracePeriodAllowed ?? false, gracePeriodDate: parseDate(avail.gracePeriodDate, dG) },
      notifyUsers: notif.notifyUsers ?? true, notifyGmail: notif.notifyGmail ?? false, notifyWhatsApp: notif.notifyWhatsApp ?? false, gradeSheet: notif.gradeSheet ?? true,
      notifications: {
        notifyGradersSubmissions: notif.notifyGradersSubmissions ?? false,
        notifyGradersSubmissionsChannels: {
          dashboard: notif.notifyGradersSubmissionsChannels?.dashboard ?? false,
          gmail: notif.notifyGradersSubmissionsChannels?.gmail ?? false,
          whatsapp: notif.notifyGradersSubmissionsChannels?.whatsapp ?? false,
        },
        notifyGradersLateSubmissions: notif.notifyGradersLateSubmissions ?? false,
        notifyGradersLateSubmissionsChannels: {
          dashboard: notif.notifyGradersLateSubmissionsChannels?.dashboard ?? false,
          gmail: notif.notifyGradersLateSubmissionsChannels?.gmail ?? false,
          whatsapp: notif.notifyGradersLateSubmissionsChannels?.whatsapp ?? false,
        },
        notifyStudent: notif.notifyStudent ?? true,
        notifyStudentChannels: {
          dashboard: notif.notifyStudentChannels?.dashboard ?? false,
          gmail: notif.notifyStudentChannels?.gmail ?? false,
          whatsapp: notif.notifyStudentChannels?.whatsapp ?? false,
        },
      },
      grades: { mcqGrade: ex.gradeSettings?.mcqGrade ?? null, mcqGradeToPass: ex.gradeSettings?.mcqGradeToPass ?? null, programmingGrade: ex.gradeSettings?.programmingGrade ?? null, programmingGradeToPass: ex.gradeSettings?.programmingGradeToPass ?? null, combinedGrade: ex.gradeSettings?.combinedGrade ?? null, combinedGradeToPass: ex.gradeSettings?.combinedGradeToPass ?? null, separateMarks: ex.gradeSettings?.separateMarks ?? false, difficultyPassEnabled: ex.gradeSettings?.difficultyPassEnabled ?? false, easyPassMark: ex.gradeSettings?.easyPassMark ?? null, mediumPassMark: ex.gradeSettings?.mediumPassMark ?? null, hardPassMark: ex.gradeSettings?.hardPassMark ?? null, mcqEasyPassMark: ex.gradeSettings?.mcqEasyPassMark ?? null, mcqMediumPassMark: ex.gradeSettings?.mcqMediumPassMark ?? null, mcqHardPassMark: ex.gradeSettings?.mcqHardPassMark ?? null, overallMarkToPassEnabled: ex.gradeSettings?.overallMarkToPassEnabled ?? false, overallMarkToPass: ex.gradeSettings?.overallMarkToPass ?? null },
      additionalOptions: { anonymousSubmissions: ex.additionalOptions?.anonymousSubmissions ?? false, hideGraderIdentity: ex.additionalOptions?.hideGraderIdentity ?? false },
    }));
    setCurrentStep(1);
    setValidationErrors({});
    setTouchedFields(new Set());
    setSavedSteps(new Set<string>(Array.isArray(ex.stepsSaved) ? ex.stepsSaved : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, initialData]);

  // In ExerciseSettings component, replace the schedule initialization part (around line 580-620)

  useEffect(() => {
    if (!isEditing || !initialData) return;
    const ex = initialData as any;
    const info = ex.exerciseInformation ?? {};
    const progSettings = ex.programmingSettings ?? {};
    const qc = ex.questionConfiguration ?? {};
    const mcqCfg = qc.mcqQuestionConfiguration ?? {};
    const progCfg = qc.programmingQuestionConfiguration ?? qc.programmingConfig ?? {};
    const avail = ex.availabilityPeriod ?? {};
    const notif = ex.notificationSettings ?? ex.notificatonandGradeSettings ?? {};

    // FIXED: parseDate returns null for missing dates instead of fallback
    const parseDate = (str: string | undefined): { day: number; month: number; year: number; hour: number; minute: number } | null => {
      if (!str) return null;
      try {
        const d = new Date(str);
        if (isNaN(d.getTime())) return null;
        return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear(), hour: d.getHours(), minute: d.getMinutes() };
      } catch { return null; }
    };

    // Parse dates, but don't use fallbacks
    const startDate = parseDate(avail.startDate);
    const endDate = parseDate(avail.endDate || avail.dueDate);   // new field || old field
    const cutOffDate = parseDate(avail.cutOffDate);
    const graceDate = parseDate(avail.gracePeriodDate);

    setFormData(prev => ({
      ...prev,
      exerciseType: (ex.exerciseType as any) || '',
      isGraded: ex.isGraded !== false,
      selectedModule: progSettings.selectedModule ?? prev.selectedModule,
      selectedLanguages: Array.isArray(progSettings.selectedLanguages) ? progSettings.selectedLanguages : prev.selectedLanguages,
      exerciseId: info.exerciseId ?? prev.exerciseId,
      exerciseName: info.exerciseName ?? '',
      description: typeof info.description === 'string' ? info.description : (info.description?.text ?? ''),
      exerciseLevel: (info.exerciseLevel as any) ?? 'intermediate',
      totalDuration: info.totalDuration ?? 60,
      totalMarks: info.totalMarks ?? 0,
      totalMarksMCQ: info.totalMarksMCQ ?? 0,
      totalMarksProgramming: info.totalMarksProgramming ?? 0,
      allQuestionsRequired: ex.questionBehavior?.allQuestionsRequired ?? true,
      mcqConfig: {
        questionConfigType: 'general',
        generalQuestionCount: mcqCfg.totalMcqQuestions ?? 0,
        scoreSettings: {
          scoreType: (mcqCfg.scoringType === 'equalDistribution' || mcqCfg.scoringType === 'evenMarks') ? 'equalDistribution' :
            mcqCfg.scoringType === 'questionSpecific' ? 'questionSpecific' : 'equalDistribution',
          equalDistribution: mcqCfg.marksPerQuestion ?? 0,
          totalMarks: mcqCfg.mcqTotalMarks ?? 0
        },
        attemptLimitEnabled: mcqCfg.attemptLimitEnabled ?? false,
        submissionAttempts: mcqCfg.submissionAttempts ?? 1
      },
      programmingConfig: {
        questionConfigType: (progCfg.questionConfigType as any) || 'general',
        generalQuestionCount: progCfg.generalQuestionCount ?? 0,
        selectionLevelCounts: { easy: progCfg.selectionLevelCounts?.easy ?? 0, medium: progCfg.selectionLevelCounts?.medium ?? 0, hard: progCfg.selectionLevelCounts?.hard ?? 0 },
        levelBasedCounts: { easy: progCfg.levelBasedCounts?.easy ?? 0, medium: progCfg.levelBasedCounts?.medium ?? 0, hard: progCfg.levelBasedCounts?.hard ?? 0 },
        scoreSettings: {
          scoreType: 'equalDistribution',
          equalDistribution: progCfg.generalMarksPerQuestion ?? progCfg.scoreSettings?.evenMarks ?? 0,
          questionSpecific: {
            general: progCfg.scoreSettings?.separateMarks?.general ?? [],
            levelBased: {
              easy: progCfg.scoreSettings?.separateMarks?.levelBased?.easy ?? [],
              medium: progCfg.scoreSettings?.separateMarks?.levelBased?.medium ?? [],
              hard: progCfg.scoreSettings?.separateMarks?.levelBased?.hard ?? []
            }
          },
          levelBasedMarks: { easy: progCfg.scoreSettings?.levelBasedMarks?.easy ?? 0, medium: progCfg.scoreSettings?.levelBasedMarks?.medium ?? 0, hard: progCfg.scoreSettings?.levelBasedMarks?.hard ?? 0 },
          levelScoringConfiguration: {
            easy: { type: (progCfg.scoreSettings?.levelScoringConfiguration?.easy?.type as any) || 'level_specific', marksPerQuestion: progCfg.scoreSettings?.levelScoringConfiguration?.easy?.marksPerQuestion ?? 0, totalMarks: progCfg.scoreSettings?.levelScoringConfiguration?.easy?.totalMarks, questionCount: progCfg.scoreSettings?.levelScoringConfiguration?.easy?.questionCount ?? 0 },
            medium: { type: (progCfg.scoreSettings?.levelScoringConfiguration?.medium?.type as any) || 'level_specific', marksPerQuestion: progCfg.scoreSettings?.levelScoringConfiguration?.medium?.marksPerQuestion ?? 0, totalMarks: progCfg.scoreSettings?.levelScoringConfiguration?.medium?.totalMarks, questionCount: progCfg.scoreSettings?.levelScoringConfiguration?.medium?.questionCount ?? 0 },
            hard: { type: (progCfg.scoreSettings?.levelScoringConfiguration?.hard?.type as any) || 'level_specific', marksPerQuestion: progCfg.scoreSettings?.levelScoringConfiguration?.hard?.marksPerQuestion ?? 0, totalMarks: progCfg.scoreSettings?.levelScoringConfiguration?.hard?.totalMarks, questionCount: progCfg.scoreSettings?.levelScoringConfiguration?.hard?.questionCount ?? 0 },
          },
          totalMarks: progCfg.scoreSettings?.totalMarks ?? 0,
        },
        questionFlow: (progCfg.questionFlow as any) ?? 'freeFlow',
        attemptLimitEnabled: progCfg.attemptLimitEnabled ?? false,
        submissionAttempts: progCfg.submissionAttempts ?? 1,
        compilerFileMode: (progCfg.compilerFileMode as any) ?? 'multiple',
      },
      othersConfig: {
        questionConfigType: (qc.othersQuestionConfiguration?.questionConfigType as any) ?? 'general',
        generalQuestionCount: qc.othersQuestionConfiguration?.generalQuestionCount ?? 0,
        selectionLevelCounts: { easy: qc.othersQuestionConfiguration?.selectionLevelCounts?.easy ?? 0, medium: qc.othersQuestionConfiguration?.selectionLevelCounts?.medium ?? 0, hard: qc.othersQuestionConfiguration?.selectionLevelCounts?.hard ?? 0 },
        levelBasedCounts: { easy: qc.othersQuestionConfiguration?.levelBasedCounts?.easy ?? 0, medium: qc.othersQuestionConfiguration?.levelBasedCounts?.medium ?? 0, hard: qc.othersQuestionConfiguration?.levelBasedCounts?.hard ?? 0 },
        scoreSettings: {
          scoreType: 'equalDistribution',
          equalDistribution: qc.othersQuestionConfiguration?.generalMarksPerQuestion ?? qc.othersQuestionConfiguration?.scoreSettings?.evenMarks ?? 0,
          questionSpecific: { general: qc.othersQuestionConfiguration?.scoreSettings?.separateMarks?.general ?? [], levelBased: { easy: qc.othersQuestionConfiguration?.scoreSettings?.separateMarks?.levelBased?.easy ?? [], medium: qc.othersQuestionConfiguration?.scoreSettings?.separateMarks?.levelBased?.medium ?? [], hard: qc.othersQuestionConfiguration?.scoreSettings?.separateMarks?.levelBased?.hard ?? [] } },
          levelBasedMarks: { easy: qc.othersQuestionConfiguration?.scoreSettings?.levelBasedMarks?.easy ?? 0, medium: qc.othersQuestionConfiguration?.scoreSettings?.levelBasedMarks?.medium ?? 0, hard: qc.othersQuestionConfiguration?.scoreSettings?.levelBasedMarks?.hard ?? 0 },
          levelScoringConfiguration: {
            easy: { type: (qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.easy?.type as any) || 'level_specific', marksPerQuestion: qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.easy?.marksPerQuestion ?? 0, totalMarks: qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.easy?.totalMarks, questionCount: qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.easy?.questionCount ?? 0 },
            medium: { type: (qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.medium?.type as any) || 'level_specific', marksPerQuestion: qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.medium?.marksPerQuestion ?? 0, totalMarks: qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.medium?.totalMarks, questionCount: qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.medium?.questionCount ?? 0 },
            hard: { type: (qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.hard?.type as any) || 'level_specific', marksPerQuestion: qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.hard?.marksPerQuestion ?? 0, totalMarks: qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.hard?.totalMarks, questionCount: qc.othersQuestionConfiguration?.scoreSettings?.levelScoringConfiguration?.hard?.questionCount ?? 0 },
          },
          totalMarks: qc.othersQuestionConfiguration?.scoreSettings?.totalMarks ?? 0,
        },
        questionFlow: (qc.othersQuestionConfiguration?.questionFlow as any) ?? 'freeFlow',
        attemptLimitEnabled: qc.othersQuestionConfiguration?.attemptLimitEnabled ?? false,
        submissionAttempts: qc.othersQuestionConfiguration?.submissionAttempts ?? 1,
      },
      schedule: {
        allowSubmissions: true,
        startDate: startDate || { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
        endDate: endDate || { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
        cutOffEnabled: avail.cutOffEnabled ?? avail.cutoffEnabled ?? false,
        cutOffDate: cutOffDate || { day: 0, month: 0, year: 0, hour: 23, minute: 59 },
        remindGradeByEnabled: avail.remindGradeByEnabled ?? false,
        remindGradeBy: parseDate(avail.remindGradeBy) || { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
        gracePeriodEnabled: avail.gracePeriodAllowed ?? false,
        gracePeriodDate: graceDate || { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
      },
      notifyUsers: notif.notifyUsers ?? true,
      notifyGmail: notif.notifyGmail ?? false,
      notifyWhatsApp: notif.notifyWhatsApp ?? false,
      gradeSheet: notif.gradeSheet ?? true,
      notifications: {
        notifyGradersSubmissions: notif.notifyGradersSubmissions ?? false,
        notifyGradersSubmissionsChannels: {
          dashboard: notif.notifyGradersSubmissionsChannels?.dashboard ?? false,
          gmail: notif.notifyGradersSubmissionsChannels?.gmail ?? false,
          whatsapp: notif.notifyGradersSubmissionsChannels?.whatsapp ?? false,
        },
        notifyGradersLateSubmissions: notif.notifyGradersLateSubmissions ?? false,
        notifyGradersLateSubmissionsChannels: {
          dashboard: notif.notifyGradersLateSubmissionsChannels?.dashboard ?? false,
          gmail: notif.notifyGradersLateSubmissionsChannels?.gmail ?? false,
          whatsapp: notif.notifyGradersLateSubmissionsChannels?.whatsapp ?? false,
        },
        notifyStudent: notif.notifyStudent ?? true,
      notifyStudentChannels: {
  dashboard: notif.notifyStudentChannels?.dashboard ?? true,
  gmail: notif.notifyStudentChannels?.gmail ?? false,
  whatsapp: notif.notifyStudentChannels?.whatsapp ?? false,
},
      },
      grades: { mcqGrade: ex.gradeSettings?.mcqGrade ?? null, mcqGradeToPass: ex.gradeSettings?.mcqGradeToPass ?? null, programmingGrade: ex.gradeSettings?.programmingGrade ?? null, programmingGradeToPass: ex.gradeSettings?.programmingGradeToPass ?? null, combinedGrade: ex.gradeSettings?.combinedGrade ?? null, combinedGradeToPass: ex.gradeSettings?.combinedGradeToPass ?? null, separateMarks: ex.gradeSettings?.separateMarks ?? false, difficultyPassEnabled: ex.gradeSettings?.difficultyPassEnabled ?? false, easyPassMark: ex.gradeSettings?.easyPassMark ?? null, mediumPassMark: ex.gradeSettings?.mediumPassMark ?? null, hardPassMark: ex.gradeSettings?.hardPassMark ?? null, mcqEasyPassMark: ex.gradeSettings?.mcqEasyPassMark ?? null, mcqMediumPassMark: ex.gradeSettings?.mcqMediumPassMark ?? null, mcqHardPassMark: ex.gradeSettings?.mcqHardPassMark ?? null, overallMarkToPassEnabled: ex.gradeSettings?.overallMarkToPassEnabled ?? false, overallMarkToPass: ex.gradeSettings?.overallMarkToPass ?? null },
      additionalOptions: { anonymousSubmissions: ex.additionalOptions?.anonymousSubmissions ?? false, hideGraderIdentity: ex.additionalOptions?.hideGraderIdentity ?? false },
    }));
    setCurrentStep(1);
    setValidationErrors({});
    setTouchedFields(new Set());
    setSavedSteps(new Set<string>(Array.isArray(ex.stepsSaved) ? ex.stepsSaved : []));
  }, [isEditing, initialData]);

  // Find this useEffect (around line 850-920) that seeds completedSteps
  useEffect(() => {
    if (!isEditing || !initialData || !formData.exerciseType || steps.length === 0) return;
    if (completedStepsInitialized.current === initialData) return;
    completedStepsInitialized.current = initialData;

    const ids = new Set<number>();
    steps.forEach(step => {
      let filled = false;
      switch (step.title) {
        case 'Exercise Details': {
          if (!formData.exerciseType) { filled = false; break; }
          if ((formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') &&
            (!formData.selectedModule || formData.selectedLanguages.length === 0)) { filled = false; break; }
          const base = !!(formData.exerciseName?.trim() && formData.totalDuration > 0);
          filled = formData.isGraded === false ? base
            : formData.exerciseType === 'Combined'
              ? base && formData.totalMarksMCQ > 0 && formData.totalMarksProgramming > 0
              : base && formData.totalMarks > 0;
          break;
        }
        case 'Question Configuration': {
          const cfg = formData.programmingConfig;
          const progFilled = cfg.questionConfigType === 'general'
            ? cfg.generalQuestionCount > 0
            : (() => { const counts = cfg.questionConfigType === 'selectionLevel' ? cfg.selectionLevelCounts : cfg.levelBasedCounts; return counts.easy > 0 || counts.medium > 0 || counts.hard > 0; })();
          if (formData.exerciseType === 'MCQ') { filled = formData.mcqConfig.generalQuestionCount > 0; break; }
          if (formData.exerciseType === 'Programming') { filled = progFilled; break; }
          if (formData.exerciseType === 'Other') {
            const oc = formData.othersConfig;
            if (oc.questionConfigType === 'general') { filled = oc.generalQuestionCount > 0; break; }
            if (oc.questionConfigType === 'levelBased') {
              const counts = oc.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
              filled = counts.easy > 0 && counts.medium > 0 && counts.hard > 0; break;
            }
            if (oc.questionConfigType === 'selectionLevel') {
              const counts = oc.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
              filled = counts.easy > 0 || counts.medium > 0 || counts.hard > 0; break;
            }
            filled = false; break;
          }
          if (formData.exerciseType === 'Combined') { filled = formData.mcqConfig.generalQuestionCount > 0 && progFilled; break; }
          filled = true; break;
        }
        case 'Schedule': {
          const sched = formData.schedule as any;
          filled = !!(sched.startDate?.year > 0 && sched.endDate?.year > 0);
          break;
        }
        case 'Notifications':
        case 'Notification': {
          // Green tick when mark settings are filled (means user completed the full flow)
          if (formData.exerciseType === 'MCQ') filled = (formData.grades.mcqGradeToPass ?? 0) > 0;
          else if (formData.exerciseType === 'Other') filled = (formData.grades.programmingGradeToPass ?? 0) > 0;
          else if (formData.exerciseType === 'Programming') filled = (formData.grades.programmingGrade ?? 0) > 0 && (formData.grades.programmingGradeToPass ?? 0) > 0;
          else if (formData.exerciseType === 'Combined') filled = (formData.grades.combinedGradeToPass ?? 0) > 0;
          else filled = false;
          break;
        }
        case 'Grade Settings':
          if (formData.exerciseType === 'MCQ')
            filled = (formData.grades.mcqGradeToPass ?? 0) > 0;
          else if (formData.exerciseType === 'Other')
            // Mark is auto from totalMarks — only Mark to Pass is user-entered
            filled = (formData.grades.programmingGradeToPass ?? 0) > 0;
          else if (formData.exerciseType === 'Programming')
            filled = (formData.grades.programmingGrade ?? 0) > 0 && (formData.grades.programmingGradeToPass ?? 0) > 0;
          else if (formData.exerciseType === 'Combined')
            filled = (formData.grades.combinedGradeToPass ?? 0) > 0;
          break;
        default:
          filled = true;
      }
      if (filled) ids.add(step.id);
    });

    setCompletedSteps(new Set(ids));

  }, [isEditing, initialData, formData.exerciseType, formData.exerciseName, formData.totalDuration,
    formData.totalMarks, formData.totalMarksMCQ, formData.totalMarksProgramming,
    formData.selectedModule, formData.selectedLanguages, formData.mcqConfig.generalQuestionCount,
    formData.programmingConfig, formData.othersConfig, formData.schedule, formData.grades]);
  // Add this helper near the top of ExerciseSettings (or wherever language selection lives):

  const flatLanguages = useMemo(() => {
    if (!configuredLanguages) return [];
    return [
      ...(configuredLanguages.coreProgram ?? []),
      ...(configuredLanguages.frontend ?? []),
      ...(configuredLanguages.database ?? []),
    ].filter(Boolean);
  }, [configuredLanguages]);

  const hasPreConfiguredLanguages = flatLanguages.length > 0;

  // Auto-select all configured languages when configuredLanguages is provided
  // Replace the existing useEffect that auto-selects configured languages (around line 780-795)
  useEffect(() => {
    if (hasPreConfiguredLanguages && flatLanguages.length > 0) {
      // Determine module category based on where the first language comes from
      let detectedModule = '';
      if (configuredLanguages?.coreProgram?.length) detectedModule = 'Core Programming';
      else if (configuredLanguages?.frontend?.length) detectedModule = 'Frontend';
      else if (configuredLanguages?.database?.length) detectedModule = 'Database';

      setFormData(prev => ({
        ...prev,
        selectedLanguages: flatLanguages,
        selectedModule: detectedModule || prev.selectedModule,
      }));

      // Clear validation errors for these fields
      setValidationErrors(prev => {
        const e = { ...prev };
        delete e.selectedModule;
        delete e.selectedLanguages;
        return e;
      });
    }
  }, [hasPreConfiguredLanguages, flatLanguages.join(',')]);

  const moduleLanguages: Record<string, { name: string; icon: string }[]> = {
    'Core Programming': [
      { name: 'C', icon: '/active-images/c.png' }, { name: 'C++', icon: '/active-images/cpp.png' },
      { name: 'Java', icon: '/active-images/java.png' }, { name: 'Python', icon: '/active-images/python.png' },
      { name: 'C#', icon: '/active-images/csharp.png' },
    ],
    'Frontend': [
      { name: 'HTML', icon: '/active-images/html.png' }, { name: 'CSS', icon: '/active-images/css.png' },
      { name: 'JavaScript', icon: '/active-images/javascript.png' }, { name: 'Bootstrap', icon: '/active-images/bootstrap.png' },
      { name: 'TypeScript', icon: '/active-images/typescript.png' }, { name: 'React', icon: '/active-images/react.png' },
    ],
    'Database': [{ name: 'SQL', icon: '/active-images/sql.png' }, { name: 'MongoDB', icon: '/active-images/mongodb.png' }],
  };

  const getFilteredLanguages = (category: string): { name: string; icon: string }[] => {
    const all = moduleLanguages[category] || [];
    if (!configuredLanguages) return all;
    const categoryKey = category === 'Core Programming' ? 'coreProgram' : category === 'Frontend' ? 'frontend' : 'database';
    const allowed = configuredLanguages[categoryKey as keyof typeof configuredLanguages];
    if (!allowed) return all;
    return all.filter(l => allowed.includes(l.name));
  };

  const mcqScoringOptions = useMemo(() => [
    { value: 'equalDistribution', label: 'Equal Distribution' },
    { value: 'questionSpecific', label: 'Question Specific' },
  ], []);

  const configOptions = useMemo(() => [
    { label: 'General Configuration', value: 'general' },
    { label: 'Level Based Configuration', value: 'levelBased' },
    { label: 'Selection Level Configuration', value: 'selectionLevel' },
  ], []);

  const questionFlowOptions = useMemo(() => [
    { value: 'freeFlow', label: 'Free Flow', description: 'Users can attempt questions in any order', icon: <Shuffle size={14} /> },
    { value: 'controlled', label: 'Controlled Flow', description: 'Users must follow specific sequence', icon: <Lock size={14} /> },
  ], []);

  const levelScoringOptions = useMemo(() => [
    { value: 'level_specific', label: 'Level-specific marks' },
    { value: 'question_specific', label: 'Question-specific marks' },
  ], []);

  // ── Steps ──────────────────────────────────────────────────────────────────
  const getSteps = (): Step[] => {
    const steps: Step[] = [];
    let next = 1;
    const did = next;
    steps.push({ id: did, title: 'Exercise Details', subtitle: 'Type, Info & Time', completed: currentStep > did, active: currentStep === did, icon: <FileText size={12} /> }); next = did + 1;
    // Question Configuration is always present in the sidebar regardless of
    // whether an exercise type has been chosen yet — the subtitle adapts once
    // the user picks a type, and Combined uses tabs internally.
    {
      const qid = next; steps.push({
        id: qid,
        title: 'Question Configuration',
        subtitle: formData.exerciseType === 'MCQ' ? 'MCQ Questions'
          : formData.exerciseType === 'Programming' ? 'Programming Questions'
          : formData.exerciseType === 'Other' ? 'Other Questions'
          : formData.exerciseType === 'Combined' ? 'MCQ + Programming'
          : 'Configure Questions',
        completed: currentStep > qid,
        active: currentStep === qid,
        icon: <List size={12} />,
      });
      next = qid + 1;
    }
    const sid = next; steps.push({ id: sid, title: 'Schedule', subtitle: 'Dates & Times', completed: currentStep > sid, active: currentStep === sid, icon: <Calendar size={12} /> }); next = sid + 1;
    const nid = next; steps.push({ id: nid, title: 'Notifications', subtitle: 'Alerts & Notify', completed: currentStep > nid, active: currentStep === nid, icon: <Bell size={12} /> }); next = nid + 1;
    if (formData.isGraded !== false) {
      const gid = next; steps.push({ id: gid, title: 'Grade Settings', subtitle: 'Marks & Grading', completed: currentStep > gid, active: currentStep === gid, icon: <Award size={12} /> });
    }
    return steps;
  };

  const steps = useMemo(() => getSteps(), [formData.exerciseType, formData.isGraded, currentStep]);

  // ── Auto-calc marks ────────────────────────────────────────────────────────
  useEffect(() => {
    if ((formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') && formData.programmingConfig.questionConfigType === 'general' && formData.programmingConfig.scoreSettings.scoreType === 'equalDistribution') {
      const qc = formData.programmingConfig.generalQuestionCount;
      const total = formData.exerciseType === 'Combined' ? formData.totalMarksProgramming : formData.totalMarks;
      if (qc > 0 && total > 0) setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, scoreSettings: { ...prev.programmingConfig.scoreSettings, equalDistribution: total / qc } } }));
    }
  }, [formData.exerciseType, formData.totalMarks, formData.totalMarksProgramming, formData.programmingConfig.generalQuestionCount, formData.programmingConfig.questionConfigType, formData.programmingConfig.scoreSettings.scoreType]);

  useEffect(() => {
    if ((formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') && formData.mcqConfig.scoreSettings.scoreType === 'equalDistribution') {
      const qc = formData.mcqConfig.generalQuestionCount;
      const total = formData.exerciseType === 'Combined' ? formData.totalMarksMCQ : formData.totalMarks;
      if (qc > 0 && total > 0) setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, scoreSettings: { ...prev.mcqConfig.scoreSettings, equalDistribution: total / qc } } }));
    }
  }, [formData.exerciseType, formData.totalMarks, formData.totalMarksMCQ, formData.mcqConfig.generalQuestionCount, formData.mcqConfig.scoreSettings.scoreType]);

  // RESTORED: Auto-sync mcqConfig totalMarks for question specific mode
  useEffect(() => {
    if (formData.exerciseType === 'MCQ' && formData.mcqConfig.scoreSettings.scoreType === 'questionSpecific' && formData.totalMarks > 0) {
      setFormData(prev => ({
        ...prev,
        mcqConfig: { ...prev.mcqConfig, scoreSettings: { ...prev.mcqConfig.scoreSettings, totalMarks: prev.totalMarks } }
      }));
    }
  }, [formData.exerciseType, formData.totalMarks, formData.mcqConfig.scoreSettings.scoreType]);


  // Replace the existing auto-sync useEffect with this corrected version
  useEffect(() => {
    if ((formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') &&
      formData.programmingConfig.questionConfigType === 'general' &&
      formData.programmingConfig.scoreSettings.scoreType === 'equalDistribution') {

      const qc = formData.programmingConfig.generalQuestionCount;
      const total = formData.exerciseType === 'Combined' ? formData.totalMarksProgramming : formData.totalMarks;

      // Only calculate if both values are valid
      if (qc > 0 && total > 0) {
        const newMarksPerQuestion = total / qc;
        const currentMarks = formData.programmingConfig.scoreSettings.equalDistribution;

        // Check if update is needed (avoid infinite loops)
        const needsUpdate = Math.abs(currentMarks - newMarksPerQuestion) > 0.01;

        if (needsUpdate) {
          setFormData(prev => ({
            ...prev,
            programmingConfig: {
              ...prev.programmingConfig,
              scoreSettings: {
                ...prev.programmingConfig.scoreSettings,
                equalDistribution: newMarksPerQuestion
              }
            }
          }));
        }
      }
    }
  }, [formData.exerciseType, formData.totalMarks, formData.totalMarksProgramming,
  formData.programmingConfig.generalQuestionCount,
  formData.programmingConfig.questionConfigType,
  formData.programmingConfig.scoreSettings.scoreType]);

  useEffect(() => {
    if (formData.exerciseType === 'Other' &&
      formData.othersConfig.questionConfigType === 'general' &&
      formData.othersConfig.scoreSettings.scoreType === 'equalDistribution') {
      const qc = formData.othersConfig.generalQuestionCount;
      const total = formData.totalMarks;
      if (qc > 0 && total > 0) {
        const newMpq = total / qc;
        if (Math.abs(formData.othersConfig.scoreSettings.equalDistribution - newMpq) > 0.01) {
          setFormData(prev => ({ ...prev, othersConfig: { ...prev.othersConfig, scoreSettings: { ...prev.othersConfig.scoreSettings, equalDistribution: newMpq } } }));
        }
      }
    }
  }, [formData.exerciseType, formData.totalMarks, formData.othersConfig.generalQuestionCount, formData.othersConfig.questionConfigType, formData.othersConfig.scoreSettings.scoreType]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const programmingAllocatedMarks = useMemo(() => {
    let m = 0;
    const pc = formData.programmingConfig;
    if (pc.questionConfigType === 'general') { if (pc.scoreSettings.scoreType === 'equalDistribution') m = pc.generalQuestionCount * pc.scoreSettings.equalDistribution; }
    else {
      const counts = pc.questionConfigType === 'selectionLevel' ? pc.selectionLevelCounts : pc.levelBasedCounts;
      const ls = pc.scoreSettings.levelScoringConfiguration;
      (['easy', 'medium', 'hard'] as const).forEach(l => {
        const c = counts[l] || 0; if (!c) return;
        const s = ls[l];
        if (s) { if (s.type === 'level_specific' && s.marksPerQuestion) m += c * s.marksPerQuestion; else if (s.type === 'question_specific' && s.totalMarks) m += s.totalMarks; }
      });
    }
    return m;
  }, [formData.programmingConfig]);

  const mcqAllocatedMarks = useMemo(() => {
    if (formData.mcqConfig.scoreSettings.scoreType === 'equalDistribution') return formData.mcqConfig.generalQuestionCount * formData.mcqConfig.scoreSettings.equalDistribution;
    return formData.mcqConfig.scoreSettings.totalMarks || 0;
  }, [formData.mcqConfig]);

  const programmingLevelMismatch = useMemo((): string | null => {
    if (formData.exerciseType !== 'Programming' && formData.exerciseType !== 'Combined') return null;
    const ct = formData.programmingConfig.questionConfigType;
    if (ct === 'general') return null;
    const total = formData.exerciseType === 'Combined' ? (formData.totalMarksProgramming ?? 0) : (formData.totalMarks ?? 0);
    if (total <= 0) return null;
    const ls = formData.programmingConfig.scoreSettings?.levelScoringConfiguration;
    if (!ls) return null;
    const getSum = (counts: any) => {
      let s = 0;
      (['easy', 'medium', 'hard'] as const).forEach(l => {
        const c = counts?.[l] ?? 0; if (!c) return;
        const sc = ls?.[l]; if (!sc) return;
        s += sc.type === 'level_specific' ? (sc.marksPerQuestion ?? 0) * c : sc.totalMarks ?? 0;
      });
      return s;
    };
    if (ct === 'levelBased') {
      const counts = formData.programmingConfig.levelBasedCounts ?? { easy: 0, medium: 0, hard: 0 };
      if ((counts.easy ?? 0) <= 0 || (counts.medium ?? 0) <= 0 || (counts.hard ?? 0) <= 0) return null;
      const sum = getSum(counts); if (sum <= 0) return null;
      return isApproximatelyEqual(sum, total) ? null : `Level totals sum to ${sum} but total is ${total}.`;
    }
    if (ct === 'selectionLevel') {
      const counts = formData.programmingConfig.selectionLevelCounts ?? { easy: 0, medium: 0, hard: 0 };
      const active = (['easy', 'medium', 'hard'] as const).filter(l => (counts?.[l] ?? 0) > 0);
      if (!active.length) return null;
      const sum = getSum(counts); if (sum <= 0) return null;
      return isApproximatelyEqual(sum, total) ? null : `Selected totals sum to ${sum} but total is ${total}.`;
    }
    return null;
  }, [formData.exerciseType, formData.totalMarks, formData.totalMarksProgramming, formData.programmingConfig]);

  const othersAllocatedMarks = useMemo(() => {
    let m = 0;
    const oc = formData.othersConfig;
    if (oc.questionConfigType === 'general') { if (oc.scoreSettings.scoreType === 'equalDistribution') m = oc.generalQuestionCount * oc.scoreSettings.equalDistribution; }
    else {
      const counts = oc.questionConfigType === 'selectionLevel' ? oc.selectionLevelCounts : oc.levelBasedCounts;
      const ls = oc.scoreSettings.levelScoringConfiguration;
      (['easy', 'medium', 'hard'] as const).forEach(l => {
        const c = counts[l] || 0; if (!c) return;
        const s = ls[l];
        if (s) { if (s.type === 'level_specific' && s.marksPerQuestion) m += c * s.marksPerQuestion; else if (s.type === 'question_specific' && s.totalMarks) m += s.totalMarks; }
      });
    }
    return m;
  }, [formData.othersConfig]);



  // Add this helper near the top of ExerciseSettings (after the existing computed values)
  // Place it after the `othersAllocatedMarks` useMemo

  const levelTotalsFromConfig = useMemo(() => {
    const et = formData.exerciseType;
    if (et !== 'Programming' && et !== 'Other' && et !== 'Combined') return null;

    const cfg = et === 'Other' ? formData.othersConfig : formData.programmingConfig;
    const ct = cfg.questionConfigType;
    if (ct === 'general') return null;

    const counts = ct === 'selectionLevel'
      ? (cfg as any).selectionLevelCounts
      : (cfg as any).levelBasedCounts;

    const ls = cfg.scoreSettings?.levelScoringConfiguration;
    if (!ls) return null;

    const result: { easy: number; medium: number; hard: number } = { easy: 0, medium: 0, hard: 0 };

    (['easy', 'medium', 'hard'] as const).forEach(level => {
      const count = counts?.[level] ?? 0;
      if (!count) return;
      const s = ls[level];
      if (!s) return;
      if (s.type === 'level_specific' && s.marksPerQuestion) result[level] = count * s.marksPerQuestion;
      else if (s.type === 'question_specific' && s.totalMarks) result[level] = s.totalMarks;
    });

    // Only return if at least one level is non-zero
    if (result.easy === 0 && result.medium === 0 && result.hard === 0) return null;
    return result;
  }, [
    formData.exerciseType,
    formData.programmingConfig.questionConfigType,
    formData.programmingConfig.levelBasedCounts,
    formData.programmingConfig.selectionLevelCounts,
    formData.programmingConfig.scoreSettings?.levelScoringConfiguration,
    formData.othersConfig.questionConfigType,
    formData.othersConfig.levelBasedCounts,
    formData.othersConfig.selectionLevelCounts,
    formData.othersConfig.scoreSettings?.levelScoringConfiguration,
  ]);



  const othersLevelMismatch = useMemo((): string | null => {
    if (formData.exerciseType !== 'Other') return null;
    const ct = formData.othersConfig.questionConfigType;
    if (ct === 'general') return null;
    const total = formData.totalMarks ?? 0;
    if (total <= 0) return null;
    const ls = formData.othersConfig.scoreSettings?.levelScoringConfiguration;
    if (!ls) return null;
    const getSum = (counts: any) => {
      let s = 0;
      (['easy', 'medium', 'hard'] as const).forEach(l => {
        const c = counts?.[l] ?? 0; if (!c) return;
        const sc = ls?.[l]; if (!sc) return;
        s += sc.type === 'level_specific' ? (sc.marksPerQuestion ?? 0) * c : sc.totalMarks ?? 0;
      });
      return s;
    };
    if (ct === 'levelBased') {
      const counts = formData.othersConfig.levelBasedCounts ?? { easy: 0, medium: 0, hard: 0 };
      if ((counts.easy ?? 0) <= 0 || (counts.medium ?? 0) <= 0 || (counts.hard ?? 0) <= 0) return null;
      const sum = getSum(counts); if (sum <= 0) return null;
      return isApproximatelyEqual(sum, total) ? null : `Level totals sum to ${sum} but total is ${total}.`;
    }
    if (ct === 'selectionLevel') {
      const counts = formData.othersConfig.selectionLevelCounts ?? { easy: 0, medium: 0, hard: 0 };
      const active = (['easy', 'medium', 'hard'] as const).filter(l => (counts?.[l] ?? 0) > 0);
      if (!active.length) return null;
      const sum = getSum(counts); if (sum <= 0) return null;
      return isApproximatelyEqual(sum, total) ? null : `Selected totals sum to ${sum} but total is ${total}.`;
    }
    return null;
  }, [formData.exerciseType, formData.totalMarks, formData.othersConfig]);

  // RESTORED: levelBasedWarningBadge
  const levelBasedWarningBadge = useMemo((): React.ReactNode | null => {
    const configType = formData.programmingConfig.questionConfigType;
    if (configType !== 'levelBased') return null;
    const c = formData.programmingConfig.levelBasedCounts;
    const filled = [c.easy, c.medium, c.hard].filter(v => v > 0).length;
    if (filled === 0 || filled === 3) return null;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{ background: D.amber + '15', border: `1px solid ${D.amber}30`, color: D.amber }}>
        <AlertCircle size={10} />All 3 levels required
      </span>
    );
  }, [formData.programmingConfig.questionConfigType, formData.programmingConfig.levelBasedCounts]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getEntityType = useCallback((nt: string) => {
    const m: Record<string, any> = { module: 'modules', submodule: 'submodules', topic: 'topics', subtopic: 'subtopics' };
    return m[nt?.toLowerCase()] || 'topics';
  }, []);

  const getBreadcrumbs = useCallback(() => {
    const c = [];
    if (hierarchyData.courseName?.trim()) c.push({ name: hierarchyData.courseName, type: 'course' });
    if (hierarchyData.moduleName?.trim()) c.push({ name: hierarchyData.moduleName, type: 'module' });
    if (hierarchyData.submoduleName?.trim()) c.push({ name: hierarchyData.submoduleName, type: 'submodule' });
    if (hierarchyData.topicName?.trim()) c.push({ name: hierarchyData.topicName, type: 'topic' });
    if (hierarchyData.subtopicName?.trim()) c.push({ name: hierarchyData.subtopicName, type: 'subtopic' });
    return c;
  }, [hierarchyData]);

  const breadcrumbs = useMemo(() => getBreadcrumbs(), [getBreadcrumbs]);

  const getProgrammingTotalQuestions = useCallback(() => {
    if (formData.programmingConfig.questionConfigType === 'general') return formData.programmingConfig.generalQuestionCount;
    if (formData.programmingConfig.questionConfigType === 'levelBased') { const c = formData.programmingConfig.levelBasedCounts; return c.easy + c.medium + c.hard; }
    if (formData.programmingConfig.questionConfigType === 'selectionLevel') { const c = formData.programmingConfig.selectionLevelCounts; return c.easy + c.medium + c.hard; }
    return 0;
  }, [formData.programmingConfig]);

  const getOthersTotalQuestions = useCallback(() => {
    if (formData.othersConfig.questionConfigType === 'general') return formData.othersConfig.generalQuestionCount;
    if (formData.othersConfig.questionConfigType === 'levelBased') { const c = formData.othersConfig.levelBasedCounts; return c.easy + c.medium + c.hard; }
    if (formData.othersConfig.questionConfigType === 'selectionLevel') { const c = formData.othersConfig.selectionLevelCounts; return c.easy + c.medium + c.hard; }
    return 0;
  }, [formData.othersConfig]);

  // RESTORED: calculateAllocatedMarks
  const calculateAllocatedMarks = useCallback((): number => {
    if (formData.exerciseType === 'MCQ') return mcqAllocatedMarks;
    if (formData.exerciseType === 'Programming') return programmingAllocatedMarks;
    if (formData.exerciseType === 'Other') return othersAllocatedMarks;
    if (formData.exerciseType === 'Combined') return mcqAllocatedMarks + programmingAllocatedMarks;
    return 0;
  }, [formData.exerciseType, mcqAllocatedMarks, programmingAllocatedMarks, othersAllocatedMarks]);

  const validateTotalMarks = useCallback(() => {
    if (formData.exerciseType === 'Combined') return (mcqAllocatedMarks + programmingAllocatedMarks) === formData.totalMarks;
    if (formData.exerciseType === 'MCQ') { if (formData.mcqConfig.scoreSettings.scoreType === 'equalDistribution') return isApproximatelyEqual(mcqAllocatedMarks, formData.totalMarks); return true; }
    if (formData.exerciseType === 'Programming') return isApproximatelyEqual(programmingAllocatedMarks, formData.totalMarks);
    if (formData.exerciseType === 'Other') return isApproximatelyEqual(othersAllocatedMarks, formData.totalMarks);
    return false;
  }, [formData.exerciseType, mcqAllocatedMarks, programmingAllocatedMarks, othersAllocatedMarks, formData.totalMarks, formData.mcqConfig.scoreSettings.scoreType]);

  // ── Mark auto-population: sync grade fields from total marks ─────────────
  useEffect(() => {
    const et = formData.exerciseType;
    if (et === 'MCQ') {
      const mcqGrade = formData.totalMarks || null;
      setFormData(prev => ({ ...prev, grades: { ...prev.grades, mcqGrade } }));
    } else if (et === 'Programming') {
      const programmingGrade = programmingAllocatedMarks || null;
      setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGrade } }));
    } else if (et === 'Other') {
      // Mark for Others is auto from totalMarks (same value shown in the disabled Mark field)
      const programmingGrade = formData.totalMarks || null;
      setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGrade } }));
    } else if (et === 'Combined') {
      const mcqGrade = formData.totalMarksMCQ || null;
      const programmingGrade = programmingAllocatedMarks || null;
      const combinedGrade = ((formData.totalMarksMCQ || 0) + (formData.totalMarksProgramming || 0)) || null;
      setFormData(prev => ({ ...prev, grades: { ...prev.grades, mcqGrade, programmingGrade, combinedGrade } }));
    }
  }, [formData.exerciseType, formData.totalMarks, formData.totalMarksMCQ, formData.totalMarksProgramming, programmingAllocatedMarks]);

  // ── Validation functions ───────────────────────────────────────────────────
  const validateExerciseType = useCallback(() => (!formData.exerciseType ? 'Please select an exercise type' : undefined), [formData.exerciseType]);
  const validateModule = useCallback(() => {
    const e: any = {};
    if (!formData.selectedModule) e.module = 'Please select a module';
    if (!formData.selectedLanguages.length) e.languages = 'Please select at least one language';
    return e;
  }, [formData.selectedModule, formData.selectedLanguages]);

  const validateExerciseDetails = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    if (!formData.exerciseName.trim()) e.exerciseName = 'Exercise name is required';
    if (!formData.exerciseLevel) e.exerciseLevel = 'Difficulty level is required';  // ← add this

    if (formData.totalDuration <= 0) e.totalDuration = 'Duration must be greater than 0';

    // Skip marks validation for Non-Graded exercises
    if (formData.isGraded === false) return e;

    // For "Other" type, totalMarks is required but no module/language validation
    if (formData.exerciseType === 'Combined') {
      if (formData.totalMarksMCQ <= 0) e.totalMarksMCQ = 'MCQ total marks must be greater than 0';
      if (formData.totalMarksProgramming <= 0) e.totalMarksProgramming = 'Programming total marks must be greater than 0';
    } else if (formData.exerciseType === 'Other') {
      if (formData.totalMarks <= 0) e.totalMarks = 'Total marks must be greater than 0';
    } else if (formData.totalMarks <= 0) {
      e.totalMarks = 'Total marks must be greater than 0';
    }

    return e;
  }, [formData.exerciseName, formData.exerciseLevel, formData.totalDuration, formData.totalMarks, formData.exerciseType, formData.totalMarksMCQ, formData.totalMarksProgramming, formData.isGraded]);

  const validateMCQConfiguration = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    const isCombined = formData.exerciseType === 'Combined';
    if (formData.isGraded === false) {
      if (formData.mcqConfig.generalQuestionCount <= 0) e.mcqGeneralQuestionCount = 'Number of questions must be greater than 0';
      return e;
    }
    if (formData.mcqConfig.scoreSettings.scoreType === 'equalDistribution') {
      if (formData.mcqConfig.generalQuestionCount <= 0) e.mcqGeneralQuestionCount = 'Number of questions must be greater than 0';
      if (formData.mcqConfig.scoreSettings.equalDistribution <= 0) { e.mcqMarksPerQuestion = 'Marks per question must be greater than 0'; }
      else {
        const alloc = formData.mcqConfig.generalQuestionCount * formData.mcqConfig.scoreSettings.equalDistribution;
        if (isCombined) { if (!isApproximatelyEqual(alloc, formData.totalMarksMCQ)) e.mcqTotalMarks = `MCQ allocated (${alloc.toFixed(2)}) must equal MCQ total (${formData.totalMarksMCQ})`; }
        else { if (!isApproximatelyEqual(alloc, formData.totalMarks)) e.totalMarks = `Total marks (${formData.totalMarks}) must equal MCQ marks (${alloc.toFixed(2)})`; }
      }
    } else {
      if (isCombined && formData.totalMarksMCQ <= 0) e.mcqTotalMarks = 'MCQ total marks must be greater than 0';
      if (!isCombined) {
        if (!formData.mcqConfig.scoreSettings.totalMarks || !isApproximatelyEqual(formData.mcqConfig.scoreSettings.totalMarks, formData.totalMarks))
          e.totalMarks = `Total marks (${formData.totalMarks}) must equal MCQ total marks`;
      }
    }
    return e;
  }, [formData.mcqConfig, formData.exerciseType, formData.totalMarks, formData.totalMarksMCQ, formData.isGraded]);

  const validateProgrammingConfiguration = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    const isCombined = formData.exerciseType === 'Combined';
    const tot = isCombined ? formData.totalMarksProgramming : formData.totalMarks;

    if (!formData.programmingConfig.questionConfigType) {
      e.programmingGeneralQuestionCount = 'Please select a Config Strategy';
      return e;
    }

    if (formData.programmingConfig.questionConfigType === 'general') {
      if (formData.programmingConfig.generalQuestionCount <= 0)
        e.programmingGeneralQuestionCount = 'Number of questions must be greater than 0';
      if (formData.isGraded === false) return e;
    } else {
      if (formData.isGraded === false) {
        const counts = formData.programmingConfig.questionConfigType === 'selectionLevel'
          ? formData.programmingConfig.selectionLevelCounts
          : formData.programmingConfig.levelBasedCounts;
        if (formData.programmingConfig.questionConfigType === 'levelBased') {
          if (counts.easy <= 0) e.programmingLevelCounts_Easy = 'Easy count required';
          if (counts.medium <= 0) e.programmingLevelCounts_Medium = 'Medium count required';
          if (counts.hard <= 0) e.programmingLevelCounts_Hard = 'Hard count required';
        } else if (!(['easy', 'medium', 'hard'] as const).some(l => counts[l] > 0)) {
          e.programmingLevelCounts = 'Select at least one difficulty level';
        }
        return e;
      }
    }

    // Early return if no total marks to validate against
    if (tot <= 0) return e;

    if (formData.programmingConfig.questionConfigType === 'general') {
      // Validate question count
      if (formData.programmingConfig.generalQuestionCount <= 0) {
        e.programmingGeneralQuestionCount = 'Number of questions must be greater than 0';
      }

      if (formData.programmingConfig.scoreSettings.scoreType === 'equalDistribution') {
        const eq = formData.programmingConfig.scoreSettings.equalDistribution;

        // Only validate marks if question count is valid
        if (formData.programmingConfig.generalQuestionCount > 0) {
          if (!eq || eq <= 0) {
            e.programmingMarksPerQuestion = 'Marks per question must be greater than 0';
          } else {
            const alloc = formData.programmingConfig.generalQuestionCount * eq;
            if (!isApproximatelyEqual(alloc, tot) && tot > 0) {
              e.programmingTotalMarks = `Allocated (${alloc.toFixed(2)}) must equal total (${tot})`;
            }
          }
        }
      }
    } else if (formData.programmingConfig.questionConfigType === 'levelBased') {
      const counts = formData.programmingConfig.levelBasedCounts;

      // Validate counts
      if (counts.easy <= 0) e.programmingLevelCounts_Easy = 'Easy count required';
      if (counts.medium <= 0) e.programmingLevelCounts_Medium = 'Medium count required';
      if (counts.hard <= 0) e.programmingLevelCounts_Hard = 'Hard count required';

      // Check if any counts are provided
      if (counts.easy <= 0 && counts.medium <= 0 && counts.hard <= 0) {
        e.programmingLevelCounts = 'At least one question count must be greater than 0';
      }

      // Validate scoring configuration
      const ls = formData.programmingConfig.scoreSettings.levelScoringConfiguration;
      const le: Record<string, string> = {};

      (['easy', 'medium', 'hard'] as const).forEach(level => {
        if (counts[level] <= 0) return;
        const s = ls[level];
        if (!s) {
          le[level] = 'Scoring not configured';
          return;
        }
        if (s.type === 'level_specific' && (!s.marksPerQuestion || s.marksPerQuestion <= 0)) {
          le[level] = 'Marks per question must be > 0';
        } else if (s.type === 'question_specific' && (!s.totalMarks || s.totalMarks <= 0)) {
          le[level] = 'Total marks must be > 0';
        }
      });

      if (Object.keys(le).length) e.programmingLevelScoring = le;

    } else if (formData.programmingConfig.questionConfigType === 'selectionLevel') {
      const counts = formData.programmingConfig.selectionLevelCounts;
      const active = (['easy', 'medium', 'hard'] as const).filter(l => counts[l] > 0);

      if (!active.length) {
        e.programmingLevelCounts = 'Select at least one difficulty level and provide question count';
        return e;
      }

      const ls = formData.programmingConfig.scoreSettings.levelScoringConfiguration;
      const le: Record<string, string> = {};

      active.forEach(level => {
        const s = ls[level];
        if (!s) {
          le[level] = 'Scoring not configured';
          return;
        }
        if (s.type === 'level_specific' && (!s.marksPerQuestion || s.marksPerQuestion <= 0)) {
          le[level] = 'Marks per question must be > 0';
        } else if (s.type === 'question_specific' && (!s.totalMarks || s.totalMarks <= 0)) {
          le[level] = 'Total marks must be > 0';
        }
      });

      if (Object.keys(le).length) e.programmingLevelScoring = le;
    }

    return e;
  }, [formData.programmingConfig, formData.totalMarks, formData.totalMarksProgramming, formData.exerciseType, formData.isGraded]);

  const validateOthersConfiguration = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    const tot = formData.totalMarks;
    if (tot <= 0) return e;

    const oc = formData.othersConfig;

    if (oc.questionConfigType === 'general') {
      if (oc.generalQuestionCount <= 0) {
        e.othersGeneralQuestionCount = 'Number of questions must be greater than 0';
      }
      if (oc.scoreSettings.scoreType === 'equalDistribution') {
        const eq = oc.scoreSettings.equalDistribution;
        if (oc.generalQuestionCount > 0) {
          if (!eq || eq <= 0) {
            e.othersMarksPerQuestion = 'Marks per question must be greater than 0';
          } else {
            const alloc = oc.generalQuestionCount * eq;
            if (!isApproximatelyEqual(alloc, tot) && tot > 0) {
              e.othersTotalMarks = `Allocated (${alloc.toFixed(2)}) must equal total (${tot})`;
            }
          }
        }
      }
    } else if (oc.questionConfigType === 'levelBased') {
      const counts = oc.levelBasedCounts;
      if (counts.easy <= 0) e.othersLevelCounts_Easy = 'Easy count required';
      if (counts.medium <= 0) e.othersLevelCounts_Medium = 'Medium count required';
      if (counts.hard <= 0) e.othersLevelCounts_Hard = 'Hard count required';

      if (counts.easy <= 0 && counts.medium <= 0 && counts.hard <= 0) {
        e.othersLevelCounts = 'At least one question count must be greater than 0';
      }

      const ls = oc.scoreSettings.levelScoringConfiguration;
      const le: Record<string, string> = {};
      (['easy', 'medium', 'hard'] as const).forEach(level => {
        if (counts[level] <= 0) return;
        const s = ls[level];
        if (!s) { le[level] = 'Scoring not configured'; return; }
        if (s.type === 'level_specific' && (!s.marksPerQuestion || s.marksPerQuestion <= 0)) {
          le[level] = 'Marks per question must be > 0';
        } else if (s.type === 'question_specific' && (!s.totalMarks || s.totalMarks <= 0)) {
          le[level] = 'Total marks must be > 0';
        }
      });
      if (Object.keys(le).length) e.othersLevelScoring = le;

    } else if (oc.questionConfigType === 'selectionLevel') {
      const counts = oc.selectionLevelCounts;
      const active = (['easy', 'medium', 'hard'] as const).filter(l => counts[l] > 0);
      if (!active.length) {
        e.othersLevelCounts = 'Select at least one difficulty level and provide question count';
        return e;
      }
      const ls = oc.scoreSettings.levelScoringConfiguration;
      const le: Record<string, string> = {};
      active.forEach(level => {
        const s = ls[level];
        if (!s) { le[level] = 'Scoring not configured'; return; }
        if (s.type === 'level_specific' && (!s.marksPerQuestion || s.marksPerQuestion <= 0)) {
          le[level] = 'Marks per question must be > 0';
        } else if (s.type === 'question_specific' && (!s.totalMarks || s.totalMarks <= 0)) {
          le[level] = 'Total marks must be > 0';
        }
      });
      if (Object.keys(le).length) e.othersLevelScoring = le;
    }

    return e;
  }, [formData.othersConfig, formData.totalMarks]);
  // RESTORED: validateCombinedMode
  const validateCombinedMode = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!isApproximatelyEqual(mcqAllocatedMarks, formData.totalMarksMCQ)) {
      errors.mcqTotalMarks = `MCQ allocated (${mcqAllocatedMarks.toFixed(2)}) must equal MCQ total marks (${formData.totalMarksMCQ})`;
    }
    if (!isApproximatelyEqual(programmingAllocatedMarks, formData.totalMarksProgramming)) {
      errors.programmingTotalMarks = `Programming allocated (${programmingAllocatedMarks.toFixed(2)}) must equal Programming total marks (${formData.totalMarksProgramming})`;
    }
    return errors;
  }, [mcqAllocatedMarks, programmingAllocatedMarks, formData.totalMarksMCQ, formData.totalMarksProgramming]);

  const validateSchedule = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    const sd = formData.schedule.startDate;
    const ed = (formData.schedule as any).endDate;      // submission deadline
    const cod = (formData.schedule as any).cutOffDate;   // optional late boundary
    const gd = formData.schedule.gracePeriodDate;

    const startSelected = sd.day > 0 && sd.month > 0 && sd.year > 0;
    const endSelected = ed && ed.day > 0 && ed.month > 0 && ed.year > 0;
    const cutOffSelected = cod && cod.day > 0 && cod.month > 0 && cod.year > 0;
    const graceSelected = gd.day > 0 && gd.month > 0 && gd.year > 0;

    // Start Date validation
    if (!startSelected) {
      e.startDate = 'Start date & time is required';
    } else if (!isEditing) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDay = new Date(sd.year, sd.month - 1, sd.day);
      startDay.setHours(0, 0, 0, 0);
      if (startDay < today) e.startDate = 'Start date cannot be in the past';
    }

    // End Date (submission deadline) validation — always required
    if (!endSelected) {
      e.endDate = 'End date & time is required';
    } else if (startSelected) {
      const startDT0 = new Date(sd.year, sd.month - 1, sd.day, sd.hour || 0, sd.minute || 0);
      const endDT0 = new Date(ed.year, ed.month - 1, ed.day, ed.hour || 0, ed.minute || 0);
      if (endDT0 <= startDT0) e.endDate = 'End date & time must be after start date & time';
    }

    // Cut-off Date validation — only when toggle is enabled
    if ((formData.schedule as any).cutOffEnabled) {
      if (!cutOffSelected) {
        e.cutOffDate = 'Cut-off date & time is required';
      } else if (endSelected) {
        const endDT = new Date(ed.year, ed.month - 1, ed.day, ed.hour || 0, ed.minute || 0);
        const codDT = new Date(cod.year, cod.month - 1, cod.day, cod.hour ?? 23, cod.minute ?? 59);
        if (codDT <= endDT) {
          e.cutOffDate = 'Cut-off date & time must be after end date & time';
        }
      }
    }

    // Grace Period validation
    if (formData.schedule.gracePeriodEnabled) {
      if (!graceSelected) {
        e.gracePeriod = 'Grace period date & time is required';
      } else if (cutOffSelected && (formData.schedule as any).cutOffEnabled) {
        const codDT = new Date(cod.year, cod.month - 1, cod.day, cod.hour ?? 23, cod.minute ?? 59);
        const graceDT = new Date(gd.year, gd.month - 1, gd.day, gd.hour ?? 23, gd.minute ?? 59);
        if (codDT >= graceDT) {
          e.gracePeriod = 'Grace period must be after cut-off date & time';
        }
      }
    }

    return e;
  }, [formData.schedule, isEditing]);

  const validateGradeSettings = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    if (formData.isGraded === false) return e;
    const et = formData.exerciseType;
    const g = formData.grades;

    // If difficulty pass is enabled, skip the top-level Mark to Pass validation
    const skipTopLevelPass = g.difficultyPassEnabled;

    if (et === 'MCQ') {
      const autoGrade = formData.totalMarks;
      if (!skipTopLevelPass) {
        if (!g.mcqGradeToPass || g.mcqGradeToPass <= 0) e.mcqGradeToPass = 'Mark to Pass is required';
        else if (autoGrade > 0 && g.mcqGradeToPass > autoGrade)
          e.mcqGradeToPass = `Cannot exceed Mark (${autoGrade})`;
      } else if (g.mcqGradeToPass && autoGrade > 0 && g.mcqGradeToPass > autoGrade) {
        e.mcqGradeToPass = `Cannot exceed Mark (${autoGrade})`;
      }
    }

    if (et === 'Programming') {
      if (!skipTopLevelPass) {
        if (!g.programmingGrade || g.programmingGrade <= 0) e.programmingGrade = 'Mark is required';
        if (!g.programmingGradeToPass || g.programmingGradeToPass <= 0) e.programmingGradeToPass = 'Mark to Pass is required';
        else if (g.programmingGrade && g.programmingGradeToPass > g.programmingGrade)
          e.programmingGradeToPass = `Cannot exceed Mark (${g.programmingGrade})`;
      } else {
        if (!g.programmingGrade || g.programmingGrade <= 0) e.programmingGrade = 'Mark is required';
        else if (g.programmingGradeToPass && g.programmingGrade && g.programmingGradeToPass > g.programmingGrade)
          e.programmingGradeToPass = `Cannot exceed Mark (${g.programmingGrade})`;
      }
    }

    if (et === 'Other') {
      const autoGrade = formData.totalMarks || 0;
      if (!skipTopLevelPass) {
        if (!g.programmingGradeToPass || g.programmingGradeToPass <= 0) e.programmingGradeToPass = 'Mark to Pass is required';
        else if (autoGrade > 0 && g.programmingGradeToPass > autoGrade)
          e.programmingGradeToPass = `Cannot exceed Mark (${autoGrade})`;
      } else if (g.programmingGradeToPass && autoGrade > 0 && g.programmingGradeToPass > autoGrade) {
        e.programmingGradeToPass = `Cannot exceed Mark (${autoGrade})`;
      }
    }

    if (et === 'Combined') {
      if (g.separateMarks) {
        const autoMCQ = formData.totalMarksMCQ || 0;
        const autoProg = formData.totalMarksProgramming || 0;
        if (!skipTopLevelPass) {
          if (!g.mcqGradeToPass || g.mcqGradeToPass <= 0) e.mcqGradeToPass = 'MCQ Mark to Pass is required';
          else if (autoMCQ > 0 && g.mcqGradeToPass > autoMCQ)
            e.mcqGradeToPass = `Cannot exceed MCQ Mark (${autoMCQ})`;
          if (!g.programmingGradeToPass || g.programmingGradeToPass <= 0) e.programmingGradeToPass = 'Programming Mark to Pass is required';
          else if (autoProg > 0 && g.programmingGradeToPass > autoProg)
            e.programmingGradeToPass = `Cannot exceed Programming Mark (${autoProg})`;
        } else {
          if (g.mcqGradeToPass && autoMCQ > 0 && g.mcqGradeToPass > autoMCQ)
            e.mcqGradeToPass = `Cannot exceed MCQ Mark (${autoMCQ})`;
          if (g.programmingGradeToPass && autoProg > 0 && g.programmingGradeToPass > autoProg)
            e.programmingGradeToPass = `Cannot exceed Programming Mark (${autoProg})`;
        }
      } else {
        const autoGrade = (formData.totalMarksMCQ || 0) + (formData.totalMarksProgramming || 0);
        if (!skipTopLevelPass) {
          if (!g.combinedGradeToPass || g.combinedGradeToPass <= 0) e.combinedGradeToPass = 'Mark to Pass is required';
          else if (autoGrade > 0 && g.combinedGradeToPass > autoGrade)
            e.combinedGradeToPass = `Cannot exceed Mark (${autoGrade})`;
        } else if (g.combinedGradeToPass && autoGrade > 0 && g.combinedGradeToPass > autoGrade) {
          e.combinedGradeToPass = `Cannot exceed Mark (${autoGrade})`;
        }
      }
    }

    // Difficulty pass marks validation (unchanged)
    if (g.difficultyPassEnabled && levelTotalsFromConfig) {
      (['easy', 'medium', 'hard'] as const).forEach(level => {
        const total = levelTotalsFromConfig[level];
        if (!total) return;
        const passKey = `${level}PassMark` as 'easyPassMark' | 'mediumPassMark' | 'hardPassMark';
        const val = g[passKey];
        if (!val || val <= 0) {
          (e as any)[`${level}PassMark`] = `${level.charAt(0).toUpperCase() + level.slice(1)} pass mark is required`;
        } else if (val > total) {
          (e as any)[`${level}PassMark`] = `Cannot exceed ${level} total (${total})`;
        }
      });
    }

    return e;
  }, [formData.grades, formData.exerciseType, formData.totalMarks, formData.totalMarksMCQ, formData.totalMarksProgramming, levelTotalsFromConfig, formData.isGraded]);
  // ── Step completion tracking ───────────────────────────────────────────────
  const isStepCompleted = useCallback((stepId: number): boolean => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return false;

    switch (step.title) {
      case 'Exercise Details': {
        if (!formData.exerciseType) return false;
        if ((formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') &&
          (!formData.selectedModule || formData.selectedLanguages.length === 0)) return false;
        const base = !!(formData.exerciseName?.trim() && formData.totalDuration > 0);
        if (formData.exerciseType === 'Combined') {
          return base && formData.totalMarksMCQ > 0 && formData.totalMarksProgramming > 0;
        }
        if (formData.exerciseType === 'Other') {
          return base && formData.totalMarks > 0;
        }
        return base && formData.totalMarks > 0;
      }
      // ... rest of cases
    }
  }, [steps, formData, validateProgrammingConfiguration, programmingLevelMismatch,
    validateOthersConfiguration, othersLevelMismatch, validateGradeSettings, completedSteps]);

  const progressPercent = useMemo(() => {
    if (isLocked) return 100;
    if (steps.length === 0) return 0;
    // 🔥 Use savedSteps instead of completedSteps for progress
    const done = steps.filter(s => savedSteps.has(s.title)).length;
    return Math.min(99, Math.round((done / steps.length) * 100));
  }, [steps, savedSteps, isLocked]);
  const isFullyCompleted = isLocked;

  const markTouched = useCallback((f: string) => setTouchedFields(prev => new Set(prev).add(f)), []);
  const markAllTouched = useCallback((fields: string[]) => setTouchedFields(prev => { const n = new Set(prev); fields.forEach(f => n.add(f)); return n; }), []);

  const validateCurrentStep = useCallback((): boolean => {
    const step = steps.find(s => s.id === currentStep);
    if (!step) return true;
    let errors: ValidationErrors = {};
    let fields: string[] = [];

    switch (step.title) {
      case 'Exercise Details': {
        if (!formData.exerciseType) {
          errors.exerciseType = 'Please select an exercise type';
          fields.push('exerciseType');
        }

        // Validate module/languages for Programming and Combined
        if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
          if (!formData.selectedModule) {
            errors.selectedModule = 'Please select a module';
            fields.push('selectedModule');
          }
          if (formData.selectedLanguages.length === 0) {
            errors.selectedLanguages = 'Please select at least one language';
            fields.push('selectedLanguages');
          }
        }

        errors = { ...errors, ...validateExerciseDetails() };
        fields.push('exerciseName', 'exerciseLevel', 'totalDuration', 'totalMarks');
        if (formData.exerciseType === 'Combined') fields.push('totalMarksMCQ', 'totalMarksProgramming');
        break;
      }
      case 'Question Configuration': {
        if (formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') {
          errors = { ...errors, ...validateMCQConfiguration() };
          fields.push('mcqGeneralQuestionCount', 'mcqMarksPerQuestion', 'mcqTotalMarks');
        }
        if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
          errors = { ...errors, ...validateProgrammingConfiguration() };
          if (formData.isGraded !== false && programmingLevelMismatch) errors.programmingTotalMarks = programmingLevelMismatch;
          fields.push('programmingGeneralQuestionCount', 'programmingMarksPerQuestion',
            'programmingLevelCounts', 'programmingLevelCounts_Easy',
            'programmingLevelCounts_Medium', 'programmingLevelCounts_Hard', 'programmingTotalMarks');
        }
        if (formData.exerciseType === 'Other') {
          errors = { ...errors, ...validateOthersConfiguration() };
          if (formData.isGraded !== false && othersLevelMismatch) errors.othersTotalMarks = othersLevelMismatch;
          fields.push('othersGeneralQuestionCount', 'othersMarksPerQuestion',
            'othersLevelCounts', 'othersLevelCounts_Easy',
            'othersLevelCounts_Medium', 'othersLevelCounts_Hard', 'othersTotalMarks');
        }
        break;
      }
      // Schedule, Notification — free, no validation
      default:
        return true;
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    markAllTouched(fields);
    return Object.keys(errors).length === 0;
  }, [currentStep, steps, formData.exerciseType, formData.selectedModule, formData.selectedLanguages, formData.isGraded,
    validateExerciseDetails, validateMCQConfiguration, validateProgrammingConfiguration, validateOthersConfiguration,
    markAllTouched, programmingLevelMismatch, othersLevelMismatch]);

  // ── buildFullPayload — shared by step-save and handleComplete ───────────────
  const buildFullPayload = useCallback(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const sd = formData.schedule.startDate;
    const startDT = (sd.day > 0 && sd.month > 0 && sd.year > 0)
      ? `${sd.year}-${pad(sd.month)}-${pad(sd.day)}T${pad(sd.hour || 0)}:${pad(sd.minute || 0)}`
      : null;
    const ed = (formData.schedule as any).endDate;
    const endDT = (ed && ed.day > 0 && ed.month > 0 && ed.year > 0)
      ? `${ed.year}-${pad(ed.month)}-${pad(ed.day)}T${pad(ed.hour || 0)}:${pad(ed.minute || 0)}`
      : null;
    const cod = (formData.schedule as any).cutOffDate;
    const cutOffDT = (cod && cod.day > 0 && cod.month > 0 && cod.year > 0)
      ? `${cod.year}-${pad(cod.month)}-${pad(cod.day)}T${pad(cod.hour || 23)}:${pad(cod.minute || 59)}`
      : null;
    const gd = formData.schedule.gracePeriodDate;
    const graceDT = (formData.schedule.gracePeriodEnabled && gd.day > 0 && gd.month > 0 && gd.year > 0)
      ? `${gd.year}-${pad(gd.month)}-${pad(gd.day)}T${pad(gd.hour || 23)}:${pad(gd.minute || 59)}`
      : null;
    const rgb = (formData.schedule as any).remindGradeBy;
    const remindDT = (rgb && rgb.day > 0 && rgb.month > 0 && rgb.year > 0 && (formData.schedule as any).remindGradeByEnabled)
      ? `${rgb.year}-${pad(rgb.month)}-${pad(rgb.day)}T${pad(rgb.hour || 0)}:${pad(rgb.minute || 0)}`
      : null;

    let mcqTotalMarks = 0;
    let progTotalMarks = 0;
    if (formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') {
      mcqTotalMarks = formData.mcqConfig.scoreSettings.scoreType === 'equalDistribution'
        ? formData.mcqConfig.generalQuestionCount * (formData.mcqConfig.scoreSettings.equalDistribution || 0)
        : formData.mcqConfig.scoreSettings.totalMarks || 0;
    }
    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      progTotalMarks = programmingAllocatedMarks;
    }

    const payload: any = {
      tabType,
      subcategory,
      exerciseType: formData.exerciseType,
      configurationType: {
        mcqMode: formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined',
        programmingMode: formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined',
        combinedMode: formData.exerciseType === 'Combined',
        otherMode: formData.exerciseType === 'Other',
      },
      isGraded: formData.isGraded !== false,
      stepsSaved: [...savedSteps],
      exerciseInformation: {
        exerciseId: formData.exerciseId || `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        exerciseName: formData.exerciseName,
        description: formData.description || '',
        exerciseLevel: formData.exerciseLevel || 'beginner',
        totalDuration: formData.totalDuration || 60,
        totalMarks: formData.isGraded === false ? null : formData.exerciseType === 'Combined'
          ? (formData.totalMarksMCQ + formData.totalMarksProgramming)
          : formData.totalMarks,
           totalMarksMCQ: formData.exerciseType === 'Combined' ? formData.totalMarksMCQ : 0,
      totalMarksProgramming: formData.exerciseType === 'Combined' ? formData.totalMarksProgramming : 0,
      },
      // ...(formData.exerciseType === 'Combined' && {
      //   totalMarksMCQ: formData.totalMarksMCQ,
      //   totalMarksProgramming: formData.totalMarksProgramming,
      // }),
      availabilityPeriod: {
        startDate: startDT,
        endDate: endDT,
        cutOffEnabled: !!(formData.schedule as any).cutOffEnabled,
        cutOffDate: (formData.schedule as any).cutOffEnabled ? cutOffDT : null,
        remindGradeByEnabled: !!(formData.schedule as any).remindGradeByEnabled,
        remindGradeBy: (formData.schedule as any).remindGradeByEnabled ? remindDT : null,
        gracePeriodEnabled: formData.schedule.gracePeriodEnabled,
        gracePeriodAllowed: formData.schedule.gracePeriodEnabled,
        ...(formData.schedule.gracePeriodEnabled && graceDT && { gracePeriodDate: graceDT }),
        extendedDays: 0,
      },
      notificationSettings: {
        // Global notification settings
        notifyUsers: formData.notifyUsers || false,
        notifyGmail: formData.notifyGmail || false,
        notifyWhatsApp: formData.notifyWhatsApp || false,
        gradeSheet: formData.gradeSheet !== undefined ? formData.gradeSheet : true,

        // Grader submissions with channel settings
        notifyGradersSubmissions: formData.notifications.notifyGradersSubmissions,
        notifyGradersSubmissionsChannels: {
          dashboard: formData.notifications.notifyGradersSubmissionsChannels?.dashboard ?? false,
          gmail: formData.notifications.notifyGradersSubmissionsChannels?.gmail ?? false,
          whatsapp: formData.notifications.notifyGradersSubmissionsChannels?.whatsapp ?? false,
        },

        // Grader late submissions with channel settings
        notifyGradersLateSubmissions: formData.notifications.notifyGradersLateSubmissions,
        notifyGradersLateSubmissionsChannels: {
          dashboard: formData.notifications.notifyGradersLateSubmissionsChannels?.dashboard ?? false,
          gmail: formData.notifications.notifyGradersLateSubmissionsChannels?.gmail ?? false,
          whatsapp: formData.notifications.notifyGradersLateSubmissionsChannels?.whatsapp ?? false,
        },

        // Student notifications with channel settings
        notifyStudent: formData.notifications.notifyStudent,
        notifyStudentChannels: {
          dashboard: formData.notifications.notifyStudentChannels?.dashboard ?? false,
          gmail: formData.notifications.notifyStudentChannels?.gmail ?? false,
          whatsapp: formData.notifications.notifyStudentChannels?.whatsapp ?? false,
        },
      },
      // FIXED: always send all grade fields, never conditionally strip difficulty pass marks
      gradeSettings: {
        mcqGrade: formData.grades.mcqGrade || null,
        mcqGradeToPass: formData.grades.mcqGradeToPass ? Number(formData.grades.mcqGradeToPass) : null,
        programmingGrade: formData.grades.programmingGrade || null,
        programmingGradeToPass: formData.grades.programmingGradeToPass ? Number(formData.grades.programmingGradeToPass) : null,
        combinedGrade: formData.grades.combinedGrade || null,
        combinedGradeToPass: formData.grades.combinedGradeToPass ? Number(formData.grades.combinedGradeToPass) : null,
        separateMarks: formData.grades.separateMarks ?? false,
        difficultyPassEnabled: formData.grades.difficultyPassEnabled ?? false,
        easyPassMark: formData.grades.easyPassMark !== null ? Number(formData.grades.easyPassMark) : null,
        mediumPassMark: formData.grades.mediumPassMark !== null ? Number(formData.grades.mediumPassMark) : null,
        hardPassMark: formData.grades.hardPassMark !== null ? Number(formData.grades.hardPassMark) : null,
        // MCQ per-difficulty pass marks (Combined exercise: MCQ + Programming stored separately).
        mcqEasyPassMark: formData.grades.mcqEasyPassMark !== null ? Number(formData.grades.mcqEasyPassMark) : null,
        mcqMediumPassMark: formData.grades.mcqMediumPassMark !== null ? Number(formData.grades.mcqMediumPassMark) : null,
        mcqHardPassMark: formData.grades.mcqHardPassMark !== null ? Number(formData.grades.mcqHardPassMark) : null,
        overallMarkToPassEnabled: formData.grades.overallMarkToPassEnabled ?? false,
        overallMarkToPass: formData.grades.overallMarkToPassEnabled && formData.grades.overallMarkToPass !== null ? Number(formData.grades.overallMarkToPass) : null,
      },
      additionalOptions: {
        anonymousSubmissions: formData.additionalOptions.anonymousSubmissions,
        hideGraderIdentity: formData.additionalOptions.hideGraderIdentity,
      },
      questionBehavior: {
        allQuestionsRequired: formData.allQuestionsRequired,
      },
      questions: [],
    };

    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      payload.programmingSettings = {
        selectedModule: formData.selectedModule || '',
        selectedLanguages: formData.selectedLanguages || [],
      };
    }

    const buildProgConfig = (pc: typeof formData.programmingConfig, sTotal: number) => {
      let bst = 'evenMarks';
      if (pc.questionConfigType === 'levelBased' || pc.questionConfigType === 'selectionLevel') {
        bst = 'levelBasedMarks';
      } else if (pc.scoreSettings?.scoreType === 'equalDistribution') {
        bst = 'evenMarks';
      } else if (pc.scoreSettings?.scoreType === 'questionSpecific') {
        bst = 'separateMarks';
      } else if (pc.scoreSettings?.scoreType === 'levelSpecific') {
        bst = 'levelBasedMarks';
      }

      // FIX: always derive questionCount from the actual count fields, never trust stale DB value
      const actualCounts =
        pc.questionConfigType === 'levelBased'
          ? pc.levelBasedCounts
          : pc.questionConfigType === 'selectionLevel'
            ? pc.selectionLevelCounts
            : { easy: 0, medium: 0, hard: 0 };

      const rawLsc = pc.scoreSettings?.levelScoringConfiguration;
      const syncedLevelScoringConfig = rawLsc
        ? {
          easy: {
            ...(rawLsc.easy || { type: 'level_specific', marksPerQuestion: 0, totalMarks: undefined }),
            questionCount: actualCounts?.easy || 0,
          },
          medium: {
            ...(rawLsc.medium || { type: 'level_specific', marksPerQuestion: 0, totalMarks: undefined }),
            questionCount: actualCounts?.medium || 0,
          },
          hard: {
            ...(rawLsc.hard || { type: 'level_specific', marksPerQuestion: 0, totalMarks: undefined }),
            questionCount: actualCounts?.hard || 0,
          },
        }
        : undefined;

      const cfg: any = {
        questionConfigType: pc.questionConfigType,
        scoreSettings: {
          scoreType: bst,
          evenMarks:
            pc.scoreSettings?.scoreType === 'equalDistribution'
              ? pc.scoreSettings.equalDistribution
              : 0,
          separateMarks: pc.scoreSettings?.questionSpecific || {
            general: [],
            levelBased: { easy: [], medium: [], hard: [] },
          },
          levelBasedMarks: pc.scoreSettings?.levelBasedMarks || {
            easy: 0,
            medium: 0,
            hard: 0,
          },
          levelScoringConfiguration: syncedLevelScoringConfig,
          totalMarks: sTotal,
        },
        questionFlow: pc.questionFlow || 'freeFlow',
        attemptLimitEnabled: pc.attemptLimitEnabled || false,
        submissionAttempts: pc.submissionAttempts || 1,
        // Compiler file mode is no longer user-selectable — the backend always
        // receives 'multiple' as the default (UI selector was removed).
        compilerFileMode: 'multiple',
        allowCodeExecution: true,
        enableTestCases: true,
        showSampleCases: true,
      };

      if (pc.questionConfigType === 'general') {
        cfg.generalQuestionCount = pc.generalQuestionCount || 0;
        cfg.generalMarksPerQuestion = pc.scoreSettings?.equalDistribution || 0;
      } else if (pc.questionConfigType === 'levelBased') {
        cfg.levelBasedCounts = pc.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
      } else if (pc.questionConfigType === 'selectionLevel') {
        cfg.selectionLevelCounts = pc.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
      }

      return cfg;
    };

    if (formData.exerciseType === 'MCQ') {
      payload.questionConfiguration = {
        mcqConfig: {
          questionConfigType: 'general',
          generalQuestionCount: formData.mcqConfig.generalQuestionCount || 0,
          scoreSettings: {
            scoreType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution',
            equalDistribution: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
            totalMarks: mcqTotalMarks,
          },
          attemptLimitEnabled: formData.mcqConfig.attemptLimitEnabled || false,
          submissionAttempts: formData.mcqConfig.submissionAttempts || 1,
          mcqTotalMarks,
          marksPerQuestion: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
          totalMcqQuestions: formData.mcqConfig.generalQuestionCount || 0,
          scoringType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution',
          shuffleQuestions: true,
        },
      };
    } else if (formData.exerciseType === 'Programming') {
      payload.questionConfiguration = {
        programmingConfig: buildProgConfig(formData.programmingConfig, progTotalMarks),
      };
    } else if (formData.exerciseType === 'Other') {
      payload.questionConfiguration = {
        othersQuestionConfiguration: buildProgConfig(formData.othersConfig as any, formData.totalMarks),
      };
    } else if (formData.exerciseType === 'Combined') {
      payload.questionConfiguration = {
        mcqConfig: {
          questionConfigType: 'general',
          generalQuestionCount: formData.mcqConfig.generalQuestionCount || 0,
          scoreSettings: {
            scoreType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution',
            equalDistribution: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
            totalMarks: formData.totalMarksMCQ,
          },
          attemptLimitEnabled: formData.mcqConfig.attemptLimitEnabled || false,
          submissionAttempts: formData.mcqConfig.submissionAttempts || 1,
          mcqTotalMarks: formData.totalMarksMCQ,
          marksPerQuestion: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
          totalMcqQuestions: formData.mcqConfig.generalQuestionCount || 0,
          scoringType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution',
          shuffleQuestions: true,
        },
        programmingConfig: buildProgConfig(formData.programmingConfig, formData.totalMarksProgramming),
      };
    }

    return payload;
  }, [formData, tabType, subcategory, programmingAllocatedMarks, savedSteps]);

  // ── handleComplete ──────────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    let allErrors: ValidationErrors = {};
    let allFields: string[] = [];

    if (!formData.exerciseType) allErrors.exerciseType = 'Please select an exercise type';
    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      if (!formData.selectedModule) allErrors.selectedModule = 'Please select a module';
      if (formData.selectedLanguages.length === 0) allErrors.selectedLanguages = 'Please select at least one language';
    }
    const detailsErrors = validateExerciseDetails();
    allErrors = { ...allErrors, ...detailsErrors };
    allFields.push('exerciseType', 'selectedModule', 'selectedLanguages', 'exerciseName', 'totalDuration', 'totalMarks');
    if (formData.exerciseType === 'Combined') allFields.push('totalMarksMCQ', 'totalMarksProgramming');

    if (formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') {
      const mcqErrors = validateMCQConfiguration();
      allErrors = { ...allErrors, ...mcqErrors };
      allFields.push('mcqGeneralQuestionCount', 'mcqMarksPerQuestion', 'mcqTotalMarks');
    }

    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      const progErrors = validateProgrammingConfiguration();
      allErrors = { ...allErrors, ...progErrors };
      if (formData.isGraded !== false && programmingLevelMismatch) allErrors.programmingTotalMarks = programmingLevelMismatch;
      allFields.push('programmingGeneralQuestionCount', 'programmingMarksPerQuestion',
        'programmingLevelCounts', 'programmingLevelCounts_Easy',
        'programmingLevelCounts_Medium', 'programmingLevelCounts_Hard', 'programmingTotalMarks');
    }

    if (formData.exerciseType === 'Other') {
      const othErrors = validateOthersConfiguration();
      allErrors = { ...allErrors, ...othErrors };
      if (formData.isGraded !== false && othersLevelMismatch) allErrors.othersTotalMarks = othersLevelMismatch;
      allFields.push('othersGeneralQuestionCount', 'othersMarksPerQuestion',
        'othersLevelCounts', 'othersLevelCounts_Easy',
        'othersLevelCounts_Medium', 'othersLevelCounts_Hard', 'othersTotalMarks');
    }

    const scheduleErrors = validateSchedule();
    allErrors = { ...allErrors, ...scheduleErrors };
    allFields.push('startDate', 'endDate');
    if ((formData.schedule as any).cutOffEnabled) allFields.push('cutOffDate');

    if (formData.isGraded !== false) {
      const gradeErrors = validateGradeSettings();
      allErrors = { ...allErrors, ...gradeErrors };
      allFields.push('programmingGrade', 'programmingGradeToPass', 'mcqGrade', 'mcqGradeToPass', 'combinedGrade', 'combinedGradeToPass');
    }

    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...allErrors }));
      markAllTouched(allFields);

      const incompleteSteps: string[] = [];
      if (allErrors.exerciseType || allErrors.selectedModule || allErrors.selectedLanguages ||
        allErrors.exerciseName || allErrors.totalDuration || allErrors.totalMarks ||
        allErrors.totalMarksMCQ || allErrors.totalMarksProgramming)
        incompleteSteps.push('Exercise Details');
      if (allErrors.mcqGeneralQuestionCount || allErrors.mcqMarksPerQuestion || allErrors.mcqTotalMarks ||
        allErrors.programmingGeneralQuestionCount || allErrors.programmingMarksPerQuestion ||
        allErrors.programmingLevelCounts || allErrors.programmingLevelCounts_Easy ||
        allErrors.programmingLevelCounts_Medium || allErrors.programmingLevelCounts_Hard ||
        allErrors.programmingTotalMarks || allErrors.programmingLevelScoring)
        incompleteSteps.push('Question Configuration');
      if (allErrors.startDate || allErrors.endDate || allErrors.cutOffDate || allErrors.gracePeriod)
        incompleteSteps.push('Schedule');
      if (formData.isGraded !== false && (allErrors.programmingGrade || allErrors.programmingGradeToPass ||
        allErrors.mcqGradeToPass || allErrors.combinedGradeToPass))
        incompleteSteps.push('Grade Settings');

      const firstInvalidStep = steps.find(step => incompleteSteps.includes(step.title));
      if (firstInvalidStep && firstInvalidStep.id !== currentStep) setCurrentStep(firstInvalidStep.id);

      toast.error(
        incompleteSteps.length > 0
          ? `Please complete: ${incompleteSteps.join(' · ')}`
          : 'Please complete all required fields',
        { position: 'top-right', duration: 5000, id: 'validation-error' }
      );
      return;
    }

    setIsLoading(true);

    try {
      if (!tabType || !subcategory) throw new Error('Missing required fields: tabType or subcategory');
      if (!formData.exerciseName) throw new Error('Exercise name is required');

      const basePayload = buildFullPayload();
      // All steps are being saved — override stepsSaved with all step titles
      basePayload.stepsSaved = steps.map(s => s.title);
      const finalId = localExerciseId || (isEditing ? exercise_Id : null);

      // FIXED: declare these BEFORE the if/else so both branches can access them
      const entityPath = getEntityType(nodeType);
      const BASE_URL = 'http://localhost:5533';
      const token = localStorage.getItem('smartcliff_token');

      if (!token) throw new Error('No authentication token found. Please log in again.');

      let response: any;

      if (finalId) {
        // UPDATE existing exercise — send basePayload directly, no re-transformation
        const res = await fetch(
          `${BASE_URL}/exercise/update/${entityPath}/${nodeId}/${finalId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(basePayload),
          }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Server error (${res.status}): ${JSON.stringify(errData)}`);
        }
        response = await res.json();
      } else {
        // CREATE new exercise
        const res = await fetch(
          `${BASE_URL}/exercise/add/${entityPath}/${nodeId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(basePayload),
          }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Server error (${res.status}): ${JSON.stringify(errData)}`);
        }
        response = await res.json();

        // Capture DB _id for subsequent step saves
        const newId = response?.data?.exercise?._id || response?.data?._id || response?._id;
        if (newId) setLocalExerciseId(newId);
      }

      toast.success(
        isEditing ? 'Exercise updated successfully!' : 'Exercise created successfully!',
        {
          position: 'top-right',
          duration: 3000,
          id: 'exercise-save-success',
          style: { minWidth: '250px', fontWeight: 600 },
        }
      );

      setIsLocked(true);
      setCompletedSteps(new Set(steps.map(s => s.id)));
      setSavedSteps(new Set(steps.map(s => s.title)));
      setTimeout(() => {
        setIsLoading(false);
        onClose();           // close ExerciseSettings first
        onSave(basePayload); // then notify parent (update exercise data without unmounting ProgrammingQuestionForm)
      }, 1500);
      setTimeout(() => { toast.dismiss('exercise-save-success'); }, 3200);

    } catch (error: any) {
      console.error('❌ Error in handleComplete:', error);
      const friendlyMsg = isEditing
        ? 'Unable to update exercise. Please review your inputs and try again.'
        : 'Unable to create exercise. Please review your inputs and try again.';
      toast.error(friendlyMsg, { position: 'top-right', duration: 4000, id: 'exercise-error' });
      setIsLoading(false);
    }
  }, [
    validateExerciseDetails,
    validateMCQConfiguration,
    validateProgrammingConfiguration,
    validateOthersConfiguration,
    validateSchedule,
    validateGradeSettings,
    programmingLevelMismatch,
    othersLevelMismatch,
    formData.exerciseName,
    formData.exerciseType,
    formData.selectedModule,
    formData.selectedLanguages,
    formData.schedule,
    tabType,
    subcategory,
    isEditing,
    exercise_Id,
    getEntityType,
    nodeType,
    nodeId,
    onSave,
    onClose,
    markAllTouched,
    steps,
    currentStep,
    buildFullPayload,
    localExerciseId,
    setIsLocked,
    setCompletedSteps,
    setSavedSteps,
  ]);

  const hasStepRequiredFieldsFilled = useCallback((stepId: number): boolean => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return true;
    switch (step.title) {
      case 'Exercise Details': {
        if (!formData.exerciseType) return false;

        // Programming and Combined require module/languages
        if ((formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') &&
          (!formData.selectedModule || formData.selectedLanguages.length === 0)) return false;

        const base = !!(formData.exerciseName?.trim() && formData.totalDuration > 0);
        if (formData.exerciseType === 'Combined')
          return base && formData.totalMarksMCQ > 0 && formData.totalMarksProgramming > 0;
        return base && formData.totalMarks > 0;
      }
      case 'Question Configuration': {
        const cfg = formData.programmingConfig;
        const progFilled = cfg.questionConfigType === 'general'
          ? cfg.generalQuestionCount > 0
          : (() => { const counts = cfg.questionConfigType === 'selectionLevel' ? cfg.selectionLevelCounts : cfg.levelBasedCounts; return counts.easy > 0 || counts.medium > 0 || counts.hard > 0; })();
        if (formData.exerciseType === 'MCQ') return formData.mcqConfig.generalQuestionCount > 0;
        if (formData.exerciseType === 'Programming') return progFilled;
        if (formData.exerciseType === 'Other') {
          const oc = formData.othersConfig;
          if (oc.questionConfigType === 'general') return oc.generalQuestionCount > 0;
          const counts = oc.questionConfigType === 'selectionLevel' ? oc.selectionLevelCounts : oc.levelBasedCounts;
          return counts.easy > 0 || counts.medium > 0 || counts.hard > 0;
        }
        if (formData.exerciseType === 'Combined') return formData.mcqConfig.generalQuestionCount > 0 && progFilled;
        return true;
      }
      case 'Schedule': {
        const sched = formData.schedule as any;
        return !!(sched.startDate?.year > 0 && sched.endDate?.year > 0);
      }
      case 'Notifications':
      case 'Notification':
        return true;
      case 'Grade Settings':
        return Object.keys(validateGradeSettings()).length === 0;
      default:
        return true;
    }
  }, [steps, formData, validateGradeSettings]);

  const handleNext = useCallback(() => {
    const step = steps.find(s => s.id === currentStep);

    // Mark current step as completed when navigating away
    if (hasStepRequiredFieldsFilled(currentStep)) {
      setCompletedSteps(prev => new Set(prev).add(currentStep));
    }

    // Special handling for Notifications step
    if (step?.title === 'Notifications' || step?.title === 'Notification') {
      setSavedSteps(prev => new Set(prev).add(step.title));
    }

    if (currentStep < steps[steps.length - 1]?.id) {
      const ci = steps.findIndex(s => s.id === currentStep);
      if (ci < steps.length - 1) setCurrentStep(steps[ci + 1].id);
    }
  }, [currentStep, steps, setCompletedSteps, setSavedSteps, hasStepRequiredFieldsFilled]);
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      const ci = steps.findIndex(s => s.id === currentStep);
      if (ci > 0) setCurrentStep(steps[ci - 1].id);
    }
  }, [currentStep, steps]);

  // ── Field-only completeness check (no saved-state dependency) ────────────────
  // Returns true if the step's required fields are filled (used for guidance navigation)

  // ── Shared save logic ────────────────────────────────────────────────────────
  const performSave = useCallback(async (afterSave?: () => void) => {
    if (isLocked) return;
    setIsSavingStep(true);
    try {
      if (!formData.exerciseType) {
        const detStep = steps.find(s => s.title === 'Exercise Details');
        if (detStep) setCurrentStep(detStep.id);
        toast('Please select an exercise type first', { position: 'top-right', duration: 3000, icon: 'ℹ️', id: 'need-type' });
        setIsSavingStep(false);
        return;
      }

      const payload = buildFullPayload();
      // Include the step being saved now (setSavedSteps runs after this, so savedSteps is stale here)
      const currentTitle = steps.find(s => s.id === currentStep)?.title;
      if (currentTitle) {
        const merged = new Set(savedSteps);
        merged.add(currentTitle);
        payload.stepsSaved = [...merged];
      }
      const currentId = localExerciseId || (isEditing ? exercise_Id : null);

      if (!currentId && !formData.exerciseName?.trim()) {
        toast('Enter an exercise name to save', { position: 'top-right', duration: 2500, icon: 'ℹ️', id: 'need-name' });
        setIsSavingStep(false);
        return;
      }

      // FIXED: declare before if/else
      const entityPath = getEntityType(nodeType);
      const BASE_URL = 'http://localhost:5533';
      const token = localStorage.getItem('smartcliff_token');

      if (!token) throw new Error('No authentication token found. Please log in again.');

      let response: any;

      if (currentId) {
        const res = await fetch(
          `${BASE_URL}/exercise/update/${entityPath}/${nodeId}/${currentId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Server error (${res.status}): ${JSON.stringify(errData)}`);
        }
        response = await res.json();
      } else {
        const res = await fetch(
          `${BASE_URL}/exercise/add/${entityPath}/${nodeId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Server error (${res.status}): ${JSON.stringify(errData)}`);
        }
        response = await res.json();

        const newId = response?.data?.exercise?._id || response?.data?._id || response?._id;
        if (newId) setLocalExerciseId(newId);
      }

      setSavedSteps(prev => {
        const n = new Set(prev);
        const title = steps.find(s => s.id === currentStep)?.title;
        if (title) n.add(title);
        return n;
      });

      setCompletedSteps(prev => {
        const n = new Set(prev);
        steps.forEach(step => {
          if (isStepCompleted(step.id)) n.add(step.id);
        });
        return n;
      });

      afterSave?.();
    } catch (err: any) {
      const msg = err?.message || 'Failed to save';
      toast.error(`Save failed: ${msg}`, { position: 'top-right', duration: 4000, id: 'step-save-err' });
    } finally {
      setIsSavingStep(false);
    }
  }, [
    isLocked,
    buildFullPayload,
    localExerciseId,
    isEditing,
    exercise_Id,
    formData.exerciseName,
    formData.exerciseType,
    getEntityType,
    nodeType,
    nodeId,
    currentStep,
    steps,
    isStepCompleted,
  ]);
  // ← Added isStepCompleted to deps
  // ── handleSaveAndNext — save current step to DB then advance ────────────────
  const handleSaveAndNext = useCallback(async () => {
    await performSave(() => {
      toast.success('Step saved!', { position: 'top-right', duration: 1800, id: 'step-save-ok' });
      handleNext();
    });
  }, [performSave, handleNext]);

  // ── handleSave — save all steps data so far, stay on current step ───────────
  // ── handleSave — validate inline first, then save ───────────────────────────
  const handleSave = useCallback(async () => {
    const currentTitle = steps.find(s => s.id === currentStep)?.title;

    // For Notifications step - mark as saved immediately
    if (currentTitle === 'Notifications' || currentTitle === 'Notification') {
      await performSave(() => {
        toast.success('Notifications settings saved!', {
          position: 'top-right', duration: 1800, id: 'notifications-save-ok'
        });
      });
      return;
    }

    let errors: ValidationErrors = {};
    let fields: string[] = [];

    if (currentTitle === 'Exercise Details') {
      if (!formData.exerciseType) {
        errors.exerciseType = 'Please select an exercise type';
        fields.push('exerciseType');
      }
      if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
        if (!formData.selectedModule) {
          errors.selectedModule = 'Please select a module';
          fields.push('selectedModule');
        }
        if (formData.selectedLanguages.length === 0) {
          errors.selectedLanguages = 'Please select at least one language';
          fields.push('selectedLanguages');
        }
      }
      const detailsErrors = validateExerciseDetails();
      errors = { ...errors, ...detailsErrors };
      fields.push('exerciseName', 'exerciseLevel', 'totalDuration', 'totalMarks');
      if (formData.exerciseType === 'Combined') fields.push('totalMarksMCQ', 'totalMarksProgramming');
    }

    if (currentTitle === 'Question Configuration') {
      if (formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') {
        const mcqErrors = validateMCQConfiguration();
        errors = { ...errors, ...mcqErrors };
        fields.push('mcqGeneralQuestionCount', 'mcqMarksPerQuestion', 'mcqTotalMarks');
      }
      if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
        const progErrors = validateProgrammingConfiguration();
        errors = { ...errors, ...progErrors };
        if (formData.isGraded !== false && programmingLevelMismatch) errors.programmingTotalMarks = programmingLevelMismatch;
        fields.push('programmingGeneralQuestionCount', 'programmingMarksPerQuestion',
          'programmingLevelCounts', 'programmingLevelCounts_Easy',
          'programmingLevelCounts_Medium', 'programmingLevelCounts_Hard', 'programmingTotalMarks');
      }
      if (formData.exerciseType === 'Other') {
        const othErrors = validateOthersConfiguration();
        errors = { ...errors, ...othErrors };
        if (formData.isGraded !== false && othersLevelMismatch) errors.othersTotalMarks = othersLevelMismatch;
        fields.push('othersGeneralQuestionCount', 'othersMarksPerQuestion',
          'othersLevelCounts', 'othersLevelCounts_Easy',
          'othersLevelCounts_Medium', 'othersLevelCounts_Hard', 'othersTotalMarks');
      }
    }

    if (currentTitle === 'Schedule') {
      const scheduleErrors = validateSchedule();
      errors = { ...errors, ...scheduleErrors };
      fields.push('startDate', 'endDate');
      if ((formData.schedule as any).cutOffEnabled) fields.push('cutOffDate');
    }

    if (currentTitle === 'Grade Settings') {
      const gradeErrors = validateGradeSettings();
      errors = { ...errors, ...gradeErrors };
      fields.push('programmingGrade', 'programmingGradeToPass', 'mcqGrade', 'mcqGradeToPass', 'combinedGrade', 'combinedGradeToPass');
    }

    // If validation fails, show errors and don't save
    if (Object.keys(errors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...errors }));
      markAllTouched(fields);
      return;
    }

    // All valid — proceed to API save
    await performSave(() => {
      toast.success('Saved!', {
        position: 'top-right',
        duration: 1800,
        id: 'step-save-ok'
      });

      // For Combined mode, switch to programming tab after saving MCQ config
      if (currentTitle === 'Question Configuration' &&
        formData.exerciseType === 'Combined' &&
        combinedConfigTab === 'mcq') {
        setCombinedConfigTab('programming');
      }
    });
  }, [performSave, steps, currentStep, formData, combinedConfigTab,
    validateExerciseDetails, validateMCQConfiguration,
    validateProgrammingConfiguration, validateOthersConfiguration,
    validateSchedule, validateGradeSettings,
    programmingLevelMismatch, othersLevelMismatch,
    markAllTouched]);

  // ── Sidebar step click — locked until Step 1 has been saved ────────────────
  const handleStepClick = useCallback((targetStepId: number) => {
    if (targetStepId === currentStep) return;
    // Gate: all non-first steps are locked until Exercise Details has been saved
    const step1Unlocked = savedSteps.has('Exercise Details');
    if (!step1Unlocked && targetStepId !== (steps.find(s => s.title === 'Exercise Details')?.id ?? 1)) return;
    setCurrentStep(targetStepId);
  }, [currentStep, steps, savedSteps]);

  // FIXED: handleSelectExerciseType - restored programming config reset from old version
  const handleSelectExerciseType = useCallback((type: 'MCQ' | 'Programming' | 'Combined' | 'Other') => {
    setFormData(prev => ({
      ...prev,
      exerciseType: type,
      // Reset module and languages for MCQ only
      ...((type === 'MCQ') && {
        selectedModule: '',
        selectedLanguages: []
      }),
      // Initialize programming config with defaults for Other (same as Programming)
      ...((type === 'Other') && {
        programmingConfig: {
          ...prev.programmingConfig,
          questionConfigType: '' as any,
          generalQuestionCount: 0,
          selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
          levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
          scoreSettings: {
            ...prev.programmingConfig.scoreSettings,
            equalDistribution: 0
          }
        }
      }),
      // Initialize programming config with defaults
      ...((type === 'Programming') && {
        programmingConfig: {
          ...prev.programmingConfig,
          questionConfigType: '' as any,
          generalQuestionCount: 0,
          selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
          levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
          scoreSettings: {
            ...prev.programmingConfig.scoreSettings,
            equalDistribution: 0
          }
        }
      }),
      // Initialize combined mode with both sections configured
      ...(type === 'Combined' && {
        programmingConfig: {
          ...prev.programmingConfig,
          questionConfigType: 'general',
          generalQuestionCount: prev.programmingConfig.generalQuestionCount || 0,
          scoreSettings: {
            ...prev.programmingConfig.scoreSettings,
            equalDistribution: prev.totalMarksProgramming > 0 && prev.programmingConfig.generalQuestionCount > 0
              ? prev.totalMarksProgramming / prev.programmingConfig.generalQuestionCount
              : 0
          }
        },
        mcqConfig: {
          ...prev.mcqConfig,
          generalQuestionCount: prev.mcqConfig.generalQuestionCount || 0,
          scoreSettings: {
            ...prev.mcqConfig.scoreSettings,
            equalDistribution: prev.totalMarksMCQ > 0 && prev.mcqConfig.generalQuestionCount > 0
              ? prev.totalMarksMCQ / prev.mcqConfig.generalQuestionCount
              : prev.mcqConfig.scoreSettings.equalDistribution || 0
          }
        }
      }),
    }));

    setValidationErrors(prev => {
      const e = { ...prev };
      delete e.exerciseType;
      delete e.selectedModule;
      delete e.selectedLanguages;
      return e;
    });

    setCurrentStep(1);
  }, []);
  // FIXED: removed isEditing guard on language toggles (matching old behavior)
  const toggleLanguage = useCallback((lang: string) => {
    setFormData(prev => ({ ...prev, selectedLanguages: prev.selectedLanguages.includes(lang) ? prev.selectedLanguages.filter(l => l !== lang) : [...prev.selectedLanguages, lang] }));
    setValidationErrors(prev => { const e = { ...prev }; delete e.selectedLanguages; return e; });
  }, []);

  const toggleAllLanguages = useCallback(() => {
    const cur = getFilteredLanguages(formData.selectedModule)?.map(l => l.name) || [];
    const all = cur.every(l => formData.selectedLanguages.includes(l));
    setFormData(prev => ({ ...prev, selectedLanguages: all ? [] : [...cur] }));
    setValidationErrors(prev => { const e = { ...prev }; delete e.selectedLanguages; return e; });
  }, [formData.selectedModule, formData.selectedLanguages]);

  const updateLevelScoringConfig = useCallback((level: 'easy' | 'medium' | 'hard', updates: Partial<any>) => {
    setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, scoreSettings: { ...prev.programmingConfig.scoreSettings, levelScoringConfiguration: { ...prev.programmingConfig.scoreSettings.levelScoringConfiguration, [level]: { ...prev.programmingConfig.scoreSettings.levelScoringConfiguration[level], ...updates } } } } }));
    setValidationErrors(prev => {
      const ne = { ...prev };
      if (prev.programmingLevelScoring) { const ns = { ...prev.programmingLevelScoring }; delete ns[level]; if (!Object.keys(ns).length) delete ne.programmingLevelScoring; else ne.programmingLevelScoring = ns; }
      delete ne.programmingTotalMarks; return ne;
    });
  }, []);

  const updateOthersLevelScoringConfig = useCallback((level: 'easy' | 'medium' | 'hard', updates: Partial<any>) => {
    setFormData(prev => ({ ...prev, othersConfig: { ...prev.othersConfig, scoreSettings: { ...prev.othersConfig.scoreSettings, levelScoringConfiguration: { ...prev.othersConfig.scoreSettings.levelScoringConfiguration, [level]: { ...prev.othersConfig.scoreSettings.levelScoringConfiguration[level], ...updates } } } } }));
    setValidationErrors(prev => {
      const ne = { ...prev };
      if (prev.othersLevelScoring) { const ns = { ...prev.othersLevelScoring }; delete ns[level]; if (!Object.keys(ns).length) delete ne.othersLevelScoring; else ne.othersLevelScoring = ns; }
      delete ne.othersTotalMarks; return ne;
    });
  }, []);

  const shouldShowScoringSection = useMemo(() => {
    const ct = formData.programmingConfig.questionConfigType;
    if (ct === 'general') return false;
    if (ct === 'levelBased') { const c = formData.programmingConfig.levelBasedCounts; return c.easy > 0 && c.medium > 0 && c.hard > 0; }
    if (ct === 'selectionLevel') { const c = formData.programmingConfig.selectionLevelCounts; return c.easy > 0 || c.medium > 0 || c.hard > 0; }
    return false;
  }, [formData.programmingConfig]);

  const othersShouldShowScoringSection = useMemo(() => {
    const ct = formData.othersConfig.questionConfigType;
    if (ct === 'general') return false;
    if (ct === 'levelBased') { const c = formData.othersConfig.levelBasedCounts; return c.easy > 0 && c.medium > 0 && c.hard > 0; }
    if (ct === 'selectionLevel') { const c = formData.othersConfig.selectionLevelCounts; return c.easy > 0 || c.medium > 0 || c.hard > 0; }
    return false;
  }, [formData.othersConfig]);

  useEffect(() => {
    if (shouldShowScoringSection) {
      setExpandedSections(prev => new Set(prev).add('scoring'));
    }
  }, [shouldShowScoringSection]);

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const generateCalendarDays = useCallback((year: number, month: number) => {
    const dim = new Date(year, month, 0).getDate();
    const fd = new Date(year, month - 1, 1).getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < fd; i++) days.push(null);
    for (let i = 1; i <= dim; i++) days.push(i);
    return days;
  }, []);

  const isDateDisabled = useCallback((year: number, month: number, day: number, fieldKey: string): boolean => {
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    // For start date: cannot be in the past
    if (fieldKey === 'startDate' && !isEditing) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    }

    // For cutOffDate: cannot be before endDate
    if (fieldKey === 'cutOffDate') {
      const endDate = (formData.schedule as any).endDate;
      if (endDate && endDate.day > 0 && endDate.month > 0 && endDate.year > 0) {
        const endDateTime = new Date(endDate.year, endDate.month - 1, endDate.day);
        endDateTime.setHours(0, 0, 0, 0);
        return date < endDateTime;
      }
      const startDate = formData.schedule.startDate;
      if (startDate.day > 0 && startDate.month > 0 && startDate.year > 0) {
        const startDateTime = new Date(startDate.year, startDate.month - 1, startDate.day);
        startDateTime.setHours(0, 0, 0, 0);
        return date < startDateTime;
      }
    }

    // For grace period: cannot be before cutOffDate (or endDate if no cutOff)
    if (fieldKey === 'gracePeriodDate' && formData.schedule.gracePeriodEnabled) {
      const cutOffDate = (formData.schedule as any).cutOffDate;
      const refDate = ((formData.schedule as any).cutOffEnabled && cutOffDate?.day > 0)
        ? cutOffDate
        : (formData.schedule as any).endDate;
      if (refDate && refDate.day > 0 && refDate.month > 0 && refDate.year > 0) {
        const refDT = new Date(refDate.year, refDate.month - 1, refDate.day);
        refDT.setHours(0, 0, 0, 0);
        return date < refDT;
      }
    }

    return false;
  }, [isEditing, formData.schedule.startDate, formData.schedule, formData.schedule.gracePeriodEnabled]);


  // ==========================================================================
  // RENDER: Exercise Type Step
  // ==========================================================================
  const renderExerciseType = useCallback(() => {
    const types = [
      { value: 'MCQ', label: 'MCQ', sub: 'Multiple Choice Questions', icon: <List size={22} />, desc: 'Single or multi-select questions with automated grading', color: D.blue, badge: 'Auto-graded' },
      { value: 'Programming', label: 'Programming', sub: 'Code Challenges', icon: <Terminal size={22} />, desc: 'Real coding problems with test cases and language support', color: D.orange, badge: 'Code editor' },
      { value: 'Combined', label: 'Combined', sub: 'MCQ + Programming', icon: <Layers size={22} />, desc: 'Mix of multiple choice and programming questions', color: D.purple, badge: 'Hybrid' },
      { value: 'Other', label: 'Other', sub: 'Other Exercise Type', icon: <FolderOpen size={22} />, desc: 'Custom exercises with module & language configuration — same provisioning as Programming', color: '#16a34a', badge: 'Manual grading' },
    ];
    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Settings2 size={13} /></div>
          <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: FONT }}>Select Exercise Type</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {types.map(t => {
            const sel = formData.exerciseType === t.value;
            return (
              <button key={t.value} type="button" onClick={() => handleSelectExerciseType(t.value as any)}
                className="group relative text-left rounded-xl p-3.5 border-2 transition-all duration-200 focus:outline-none"
                style={{ borderColor: sel ? t.color : D.border, background: sel ? t.color + '08' : D.bg, boxShadow: sel ? `0 0 0 3px ${t.color}15` : '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                {sel && <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: t.color }}><Check size={10} className="text-white" strokeWidth={3} /></div>}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-all duration-200"
                  style={{ background: sel ? t.color : t.color + '12', color: sel ? '#fff' : t.color }}>
                  {t.icon}
                </div>
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1.5 inline-block" style={{ background: t.color + '15', color: t.color }}>{t.badge}</div>
                <h3 className="text-sm font-bold mb-0.5" style={{ color: sel ? t.color : D.textMain, fontFamily: FONT }}>{t.label}</h3>
                <p className="text-[11px] font-semibold mb-1" style={{ color: sel ? t.color + 'cc' : D.textMuted }}>{t.sub}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: D.textMuted }}>{t.desc}</p>
              </button>
            );
          })}
        </div>
        {validationErrors.exerciseType && touchedFields.has('exerciseType') && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff2f2', border: `1px solid ${D.red}30` }}>
            <AlertCircle size={13} style={{ color: D.red }} />
            <p className="text-xs" style={{ color: D.red }}>{validationErrors.exerciseType}</p>
          </div>
        )}
      </div>
    );
  }, [formData.exerciseType, validationErrors, touchedFields, handleSelectExerciseType]);

  // ==========================================================================
  // RENDER: Module Step
  // ==========================================================================
  // const renderModule = useCallback(() => {
  //   if (formData.exerciseType !== 'Programming' && formData.exerciseType !== 'Combined') return null;

  //   // When module has configured languages, skip category buttons and show languages directly
  //   if (configuredLanguages) {
  //     // Icon lookup: search all hardcoded languages with alias + case-insensitive matching
  //     const allIconEntries = [
  //       ...moduleLanguages['Core Programming'],
  //       ...moduleLanguages['Frontend'],
  //       ...moduleLanguages['Database'],
  //     ];
  //     const langAliases: Record<string, string> = {
  //       'js': 'JavaScript', 'ts': 'TypeScript', 'css': 'CSS', 'html': 'HTML',
  //       'react': 'React', 'bootstrap': 'Bootstrap', 'sql': 'SQL',
  //       'mongodb': 'MongoDB', 'c': 'C', 'c++': 'C++', 'java': 'Java',
  //       'python': 'Python', 'c#': 'C#',
  //     };
  //     const findIcon = (name: string): string => {
  //       const searchName = langAliases[name.toLowerCase()] || name;
  //       return allIconEntries.find(l => l.name.toLowerCase() === searchName.toLowerCase())?.icon || '';
  //     };

  //     const allLangs: { name: string; icon: string; category: string }[] = [];
  //     const entries: [string, string][] = [
  //       ['Core Programming', 'coreProgram'],
  //       ['Frontend', 'frontend'],
  //       ['Database', 'database'],
  //     ];
  //     for (const [category, key] of entries) {
  //       const names: string[] = (configuredLanguages as any)[key] || [];
  //       for (const name of names) {
  //         allLangs.push({ name, icon: findIcon(name), category });
  //       }
  //     }
  //     const allSel = allLangs.length > 0 && allLangs.every(l => formData.selectedLanguages.includes(l.name));
  //     return (
  //       <div className="px-4 py-3">
  //         <div className="mb-3 flex items-center gap-2">
  //           <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Code size={13} /></div>
  //           <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: FONT }}>Select Languages</h3>
  //         </div>
  //         <div className="flex items-center justify-between ">
  //           <SectionLabel required info="Choose the programming languages students can use to solve this exercise">Languages</SectionLabel>
  //           <button
  //             type="button"
  //             onClick={() => {
  //               const names = allSel ? [] : allLangs.map(l => l.name);
  //               const primaryCategory = allLangs[0]?.category || '';
  //               setFormData(prev => ({ ...prev, selectedLanguages: names, selectedModule: names.length ? primaryCategory : prev.selectedModule }));
  //               setValidationErrors(prev => { const e = { ...prev }; delete e.selectedLanguages; return e; });
  //             }}
  //             className="text-xs font-bold transition-colors"
  //             style={{ color: D.orange }}>
  //             {allSel ? 'Deselect All' : 'Select All'}
  //           </button>
  //         </div>
  //         <div className="flex flex-wrap gap-2">
  //           {allLangs.map(lang => {
  //             const sel = formData.selectedLanguages.includes(lang.name);
  //             return (
  //               <button
  //                 key={lang.name}
  //                 type="button"
  //                 onClick={() => {
  //                   setFormData(prev => {
  //                     const newLangs = prev.selectedLanguages.includes(lang.name)
  //                       ? prev.selectedLanguages.filter(l => l !== lang.name)
  //                       : [...prev.selectedLanguages, lang.name];
  //                     return { ...prev, selectedLanguages: newLangs, selectedModule: lang.category };
  //                   });
  //                   setValidationErrors(prev => { const e = { ...prev }; delete e.selectedLanguages; return e; });
  //                 }}
  //                 onBlur={() => markTouched('selectedLanguages')}
  //                 className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all duration-200"
  //                 style={{
  //                   borderColor: sel ? D.orange : D.border,
  //                   background: sel ? D.orangeLight : D.bg,
  //                   color: sel ? D.orange : D.textSub,
  //                   cursor: 'pointer',
  //                 }}>
  //                 <div
  //                   className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
  //                   style={{
  //                     borderColor: sel ? D.orange : D.border,
  //                     background: sel ? D.orange : 'transparent',
  //                   }}>
  //                   {sel && <Check size={9} className="text-white" strokeWidth={3} />}
  //                 </div>
  //                 {lang.icon && (
  //                   <img
  //                     src={lang.icon}
  //                     alt={lang.name}
  //                     className="w-4 h-4 object-contain"
  //                     onError={e => { (e.target as any).style.display = 'none'; }}
  //                   />
  //                 )}
  //                 {lang.name}
  //               </button>
  //             );
  //           })}
  //         </div>
  //         {validationErrors.selectedLanguages && touchedFields.has('selectedLanguages') && (
  //           <p className="mt-1 text-xs flex items-center gap-1" style={{ color: D.red }}>
  //             <AlertCircle size={11} />{validationErrors.selectedLanguages}
  //           </p>
  //         )}
  //       </div>
  //     );
  //   }

  //   // Original: category buttons then languages (when no configuredLanguages)
  //   const modules = ['Core Programming', 'Frontend', 'Database'];
  //   return (
  //     <div className="px-4 py-3">
  //       <div className="mb-3 flex items-center gap-2">
  //         <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Code size={13} /></div>
  //         <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: FONT }}>Module & Languages</h3>
  //       </div>

  //       <div className="mb-3">
  //         <SectionLabel required info="The module category this exercise belongs to (e.g. Core Programming, Frontend, Database)">Programming Module</SectionLabel>
  //         <div className="grid grid-cols-3 gap-2">
  //           {modules.map(mod => {
  //             const sel = formData.selectedModule === mod;
  //             const icons: Record<string, React.ReactNode> = {
  //               'Core Programming': <Terminal size={15} />,
  //               'Frontend': <Code size={15} />,
  //               'Database': <Database size={15} />,
  //             };
  //             const colors: Record<string, string> = {
  //               'Core Programming': D.blue,
  //               'Frontend': D.orange,
  //               'Database': D.emerald,
  //             };
  //             return (
  //               <button
  //                 key={mod}
  //                 type="button"
  //                 onClick={() => {
  //                   setFormData(prev => ({ ...prev, selectedModule: mod, selectedLanguages: [] }));
  //                   setValidationErrors(prev => { const e = { ...prev }; delete e.selectedModule; return e; });
  //                   setIsOpen(false);
  //                 }}
  //                 className="relative p-2.5 rounded-xl border-2 text-left transition-all duration-200 focus:outline-none"
  //                 style={{
  //                   borderColor: sel ? colors[mod] : D.border,
  //                   background: sel ? colors[mod] + '08' : D.bg,
  //                   cursor: 'pointer',
  //                 }}>
  //                 {sel && (
  //                   <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: colors[mod] }}>
  //                     <Check size={9} className="text-white" strokeWidth={3} />
  //                   </div>
  //                 )}
  //                 <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5"
  //                   style={{ background: sel ? colors[mod] : colors[mod] + '15', color: sel ? '#fff' : colors[mod] }}>
  //                   {icons[mod]}
  //                 </div>
  //                 <div className="text-xs font-bold" style={{ color: sel ? colors[mod] : D.textMain, fontFamily: FONT }}>{mod}</div>
  //               </button>
  //             );
  //           })}
  //         </div>
  //         {validationErrors.selectedModule && touchedFields.has('selectedModule') && (
  //           <p className="mt-1 text-xs flex items-center gap-1" style={{ color: D.red }}>
  //             <AlertCircle size={11} />{validationErrors.selectedModule}
  //           </p>
  //         )}
  //       </div>

  //       {formData.selectedModule && (
  //         <div className="animate-in fade-in slide-in-from-top-1 duration-200">
  //           <div className="flex items-center justify-between mb-2">
  //             <SectionLabel required info="Choose the programming languages students can use to solve this exercise">Select Languages</SectionLabel>
  //             <button
  //               type="button"
  //               onClick={toggleAllLanguages}
  //               className="text-xs font-bold transition-colors"
  //               style={{ color: D.orange }}>
  //               {formData.selectedLanguages.length === moduleLanguages[formData.selectedModule]?.length ? 'Deselect All' : 'Select All'}
  //             </button>
  //           </div>
  //           <div className="flex flex-wrap gap-2">
  //             {moduleLanguages[formData.selectedModule]?.map(lang => {
  //               const sel = formData.selectedLanguages.includes(lang.name);
  //               return (
  //                 <button
  //                   key={lang.name}
  //                   type="button"
  //                   onClick={() => toggleLanguage(lang.name)}
  //                   onBlur={() => markTouched('selectedLanguages')}
  //                   className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all duration-200"
  //                   style={{
  //                     borderColor: sel ? D.orange : D.border,
  //                     background: sel ? D.orangeLight : D.bg,
  //                     color: sel ? D.orange : D.textSub,
  //                     cursor: 'pointer',
  //                   }}>
  //                   <div
  //                     className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
  //                     style={{
  //                       borderColor: sel ? D.orange : D.border,
  //                       background: sel ? D.orange : 'transparent',
  //                     }}>
  //                     {sel && <Check size={9} className="text-white" strokeWidth={3} />}
  //                   </div>
  //                   {lang.icon && (
  //                     <img
  //                       src={lang.icon}
  //                       alt={lang.name}
  //                       className="w-4 h-4 object-contain"
  //                       onError={e => { (e.target as any).style.display = 'none'; }}
  //                     />
  //                   )}
  //                   {lang.name}
  //                 </button>
  //               );
  //             })}
  //           </div>
  //           {validationErrors.selectedLanguages && touchedFields.has('selectedLanguages') && (
  //             <p className="mt-1 text-xs flex items-center gap-1" style={{ color: D.red }}>
  //               <AlertCircle size={11} />{validationErrors.selectedLanguages}
  //             </p>
  //           )}
  //         </div>
  //       )}
  //     </div>
  //   );
  // }, [
  //   formData.selectedModule,
  //   formData.selectedLanguages,
  //   formData.exerciseType,
  //   validationErrors,
  //   touchedFields,
  //   toggleLanguage,
  //   toggleAllLanguages,
  //   markTouched,
  //   configuredLanguages,
  // ]);
  // ==========================================================================
  // RENDER: Exercise Details
  // ==========================================================================
  const renderExerciseDetails = useCallback(() => {
    const isCombined = formData.exerciseType === 'Combined';
    const combinedTotal = formData.totalMarksMCQ + formData.totalMarksProgramming;

    const exerciseTypeOptions = [
      { value: 'MCQ', label: 'MCQ — Multiple Choice Questions (auto-graded)' },
      { value: 'Programming', label: 'Programming — Code challenges with test cases' },
      { value: 'Combined', label: 'Combined — MCQ + Programming (hybrid)' },
      { value: 'Other', label: 'Other — Custom exercise with module & language config' },
    ];

    const difficultyOptions = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'expert', label: 'Expert' },
    ];

    // ── helpers ──────────────────────────────────────────────────────────────

    const buildConfiguredLangList = () => {
      if (!configuredLanguages) return [];
      const allIconEntries = [
        ...moduleLanguages['Core Programming'],
        ...moduleLanguages['Frontend'],
        ...moduleLanguages['Database'],
      ];
      const langAliases: Record<string, string> = {
        js: 'JavaScript', ts: 'TypeScript', css: 'CSS', html: 'HTML',
        react: 'React', bootstrap: 'Bootstrap', sql: 'SQL',
        mongodb: 'MongoDB', c: 'C', 'c++': 'C++', java: 'Java',
        python: 'Python', 'c#': 'C#',
      };
      const findIcon = (name: string) => {
        const searchName = langAliases[name.toLowerCase()] || name;
        return allIconEntries.find(l => l.name.toLowerCase() === searchName.toLowerCase())?.icon || '';
      };
      const result: { name: string; icon: string; category: string }[] = [];
      for (const [category, key] of [['Core Programming', 'coreProgram'], ['Frontend', 'frontend'], ['Database', 'database']] as [string, string][]) {
        const names: string[] = (configuredLanguages as any)[key] || [];
        for (const name of names) result.push({ name, icon: findIcon(name), category });
      }
      return result;
    };

    const allLangs = buildConfiguredLangList();

    // labelCell — fixed left column: label text + optional required star + tooltip
    const labelCell = (label: string, required?: boolean, info?: string) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{
          fontSize: 11, fontWeight: 500, color: D.textMain,
          fontFamily: FONT, whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
        {required && (
          <span style={{ fontSize: 11, fontWeight: 600, color: D.orange, flexShrink: 0 }}>*</span>
        )}
        {info && <InfoTooltip content={info} />}
      </div>
    );

    // fieldLabel — small label above a field inside the right column
    const fieldLabel = (label: string, required?: boolean, info?: string) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 5 }}>
        <span style={{
          fontSize: 11, fontWeight: 500, color: D.textMain,
          fontFamily: FONT,
        }}>
          {label}
        </span>
        {required && (
          <span style={{ fontSize: 11, fontWeight: 600, color: D.orange }}>*</span>
        )}
        {info && <InfoTooltip content={info} />}
      </div>
    );

    // shared td styles — every row uses these so alignment is always consistent
    const tdL: React.CSSProperties = {
      width: 148,
      paddingRight: 14,
      paddingBottom: 12,
      verticalAlign: 'top',
      paddingTop: 9,
    };
    const tdR: React.CSSProperties = {
      paddingBottom: 12,
      verticalAlign: 'top',
      paddingTop: 6,
    };

    const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;

    // ── render ───────────────────────────────────────────────────────────────

    return (
      <div className="px-4 py-3">

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: D.orangeLight, color: D.orange }}
            >
              <FileText size={13} />
            </div>
            <h3
              className="text-sm font-bold"
              style={{ color: D.textMain, fontFamily: FONT }}
            >
              Exercise Details
            </h3>
          </div>
          {isLockedForEdit && (
            <span
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold"
              style={{ background: D.amber + '15', color: D.amber, border: `1px solid ${D.amber}30` }}
            >
              <Lock size={10} /> Locked for Edit
            </span>
          )}
        </div>

        {/* Form table — fixed 148px label col, field col takes the rest */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: 148 }} />
            <col />
          </colgroup>
          <tbody>

            {/* ── Exercise ID + Name — spans full width as 1fr/1fr pair ── */}
            <tr>
              <td colSpan={2} style={{ paddingBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    {fieldLabel('Exercise ID', false, 'Auto-generated unique identifier for this exercise')}
                    <OInput value={formData.exerciseId} onChange={() => { }} readOnly />
                  </div>
                  <div>
                    {fieldLabel('Exercise Name', true, 'The name displayed to students in their dashboard')}
                    <OInput
                      value={formData.exerciseName}
                      onChange={v => {
                        setFormData(prev => ({ ...prev, exerciseName: v }));
                        if (v.trim()) setValidationErrors(prev => { const e = { ...prev }; delete e.exerciseName; return e; });
                      }}
                      onBlur={() => markTouched('exerciseName')}
                      placeholder="e.g. Advanced Algorithms"
                      error={validationErrors.exerciseName}
                      touched={touchedFields.has('exerciseName')}
                    />
                  </div>
                </div>
              </td>
            </tr>

            {/* divider */}
            <tr>
              <td colSpan={2} style={{ paddingBottom: 10 }}>
                <div style={{ height: 0.5, background: D.border }} />
              </td>
            </tr>

            {/* ── Exercise Type ── */}
            <tr>
              <td style={tdL}>{labelCell('Exercise Type', true, 'MCQ for multiple-choice, Programming for code challenges, or Combined for both')}</td>
              <td style={tdR}>
                <select
                  value={formData.exerciseType || ''}
                  onChange={e => {
                    const v = e.target.value as any;
                    handleSelectExerciseType(v);
                    if (v) setValidationErrors(prev => { const n = { ...prev }; delete n.exerciseType; return n; });
                  }}
                  onBlur={() => markTouched('exerciseType')}
                  disabled={isLockedForEdit}
                  style={{
                    width: '100%', maxWidth: 340,
                    padding: '7px 28px 7px 10px', borderRadius: 8,
                    border: `0.5px solid ${validationErrors.exerciseType && touchedFields.has('exerciseType') ? D.red : D.border}`,
                    background: isLockedForEdit ? D.surface : D.bg,
                    color: formData.exerciseType ? (isLockedForEdit ? D.textMuted : D.textMain) : D.textMuted,
                    fontSize: 12, fontWeight: 600, fontFamily: FONT,
                    outline: 'none', cursor: isLockedForEdit ? 'not-allowed' : 'pointer',
                    appearance: 'none' as any,
                    backgroundImage: chevronBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
                  }}
                >
                  <option value="" disabled>Select exercise type…</option>
                  {exerciseTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {isLockedForEdit && (
                  <p style={{ marginTop: 4, fontSize: 10, color: D.textMuted }}>
                    Exercise type cannot be changed after creation
                  </p>
                )}
                {validationErrors.exerciseType && touchedFields.has('exerciseType') && (
                  <p style={{ marginTop: 4, fontSize: 10, color: D.red, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <AlertCircle size={10} /> {validationErrors.exerciseType}
                  </p>
                )}
              </td>
            </tr>

            {/* ── Assessment Type ── */}
            <tr>
              <td style={tdL}>{labelCell('Graded Type', true, 'Graded exercises require marks configuration; Non-Graded tracks completion only')}</td>
              <td style={tdR}>
                {(() => {
                  // Lock only after the ENTIRE exercise has been completed
                  // (every step in the current flow has been saved). Saving
                  // just Exercise Details (or any single intermediate step)
                  // must NOT lock the graded type — the user can still flip
                  // between Graded and Non-Graded while the workflow is in
                  // progress.
                  const allStepsSaved = steps.length > 0 && steps.every(s => savedSteps.has(s.title));
                  const gradedLocked = allStepsSaved;
                  return (
                    <>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 2,
                        padding: 3, borderRadius: 8,
                        background: gradedLocked ? D.surface : D.surface,
                        border: `0.5px solid ${D.border}`,
                        opacity: gradedLocked ? 0.7 : 1,
                        cursor: gradedLocked ? 'not-allowed' : 'auto',
                      }}>
                        {(['Graded', 'Non-Graded'] as const).map(opt => {
                          const active = opt === 'Graded' ? formData.isGraded !== false : formData.isGraded === false;
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={gradedLocked}
                              onClick={() => {
                                if (gradedLocked) return;
                                const graded = opt === 'Graded';
                                setFormData(prev => ({
                                  ...prev,
                                  isGraded: graded,
                                  ...(graded ? {} : { totalMarks: 0, totalMarksMCQ: 0, totalMarksProgramming: 0 }),
                                }));
                              }}
                              style={{
                                padding: '5px 14px', borderRadius: 6, border: 'none',
                                fontSize: 11, fontWeight: 500,
                                cursor: gradedLocked ? 'not-allowed' : 'pointer',
                                fontFamily: FONT,
                                transition: 'background 0.15s, color 0.15s',
                                background: active ? D.orange : 'transparent',
                                color: active ? '#fff' : D.textMuted,
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {gradedLocked && (
                        <p style={{ marginTop: 4, fontSize: 10, color: D.textMuted }}>
                          Graded type cannot be changed after the exercise has been fully completed
                        </p>
                      )}
                    </>
                  );
                })()}
              </td>
            </tr>

            {/* ── Skill Set ── */}
            <tr>
              <td style={tdL}>{labelCell('Skill Set', false, 'Skill set configured for this topic')}</td>
              <td style={tdR}>
                {allLangs.length === 0 ? (
                  <span style={{ fontSize: 12, color: D.textMuted }}>No languages configured</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {allLangs.map(lang => (
                      <span
                        key={lang.name}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 6,
                          border: `1px solid ${D.orange}`,
                          background: D.orangeLight, color: D.orange,
                          fontSize: 11, fontWeight: 600,
                        }}
                      >
                        {lang.icon && (
                          <img
                            src={lang.icon} alt={lang.name}
                            style={{ width: 14, height: 14, objectFit: 'contain' }}
                            onError={e => { (e.target as any).style.display = 'none'; }}
                          />
                        )}
                        {lang.name}
                      </span>
                    ))}
                  </div>
                )}
              </td>
            </tr>

            {/* divider */}
            <tr>
              <td colSpan={2} style={{ paddingBottom: 10 }}>
                <div style={{ height: 0.5, background: D.border }} />
              </td>
            </tr>

            {/* ── Description ── */}
            <tr>
              <td style={tdL}>{labelCell('Description', false, 'A brief overview shown to students before they start')}</td>
              <td style={tdR}>
                <TipTapEditor
                  value={formData.description}
                  onChange={v => setFormData(prev => ({ ...prev, description: v }))}
                  placeholder="Enter a brief description..."
                  minHeight="150px"
                  maxHeight="300px"
                  showToolbar
                  editable
                />
              </td>
            </tr>

        {/* ── SINGLE ROW: Difficulty Level + Duration + Total Marks ── */}
<tr>
  <td colSpan={2} style={{ paddingBottom: 12 }}>
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1.5fr',
      gap: 20,
      alignItems: 'flex-start'
    }}>

      {/* Difficulty Level */}
      <div>
        {fieldLabel('Difficulty Level', true, 'Sets the challenge level — affects filtering and student guidance')}
        <select
          value={formData.exerciseLevel || ''}
          onChange={e => {
            setFormData(prev => ({ ...prev, exerciseLevel: e.target.value as any }));
            if (e.target.value) setValidationErrors(prev => { const n = { ...prev }; delete n.exerciseLevel; return n; });
          }}
          style={{
            width: '100%',
            padding: '7px 28px 7px 10px',
            borderRadius: 8,
            border: `0.5px solid ${validationErrors.exerciseLevel && touchedFields.has('exerciseLevel') ? D.red : D.border}`,
            background: D.bg,
            color: formData.exerciseLevel ? D.textMain : D.textMuted,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: FONT,
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none' as any,
            backgroundImage: chevronBg,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
          }}
        >
          <option value="" disabled hidden>Select difficulty…</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="expert">Expert</option>
        </select>
        {validationErrors.exerciseLevel && touchedFields.has('exerciseLevel') && (
          <p style={{ marginTop: 4, fontSize: 10, color: D.red, display: 'flex', alignItems: 'center', gap: 3 }}>
            <AlertCircle size={10} /> {validationErrors.exerciseLevel}
          </p>
        )}
      </div>

      {/* Duration */}
      <div>
        {fieldLabel('Duration', true, 'Total time allowed in minutes')}
        <ONumberInput
          value={formData.totalDuration}
          onChange={v => {
            setFormData(prev => ({ ...prev, totalDuration: v }));
            if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalDuration; return e; });
          }}
          onBlur={() => markTouched('totalDuration')}
          placeholder="60"
          error={validationErrors.totalDuration}
          touched={touchedFields.has('totalDuration')}
          style={{ width: '100%' }}
        />
      </div>

      {/* Total Marks - hidden when Non-Graded */}
      {formData.isGraded !== false && (
        <div>
          {fieldLabel(
            isCombined ? 'Marks (MCQ + Prog.)' : 'Total Marks',
            true,
            isCombined ? 'Allocate marks between MCQ and Programming sections' : 'Maximum marks a student can score',
          )}

          {!isCombined ? (
            <ONumberInput
              value={formData.totalMarks}
              onChange={v => {
                setFormData(prev => ({ ...prev, totalMarks: v }));
                if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalMarks; return e; });
              }}
              onBlur={() => markTouched('totalMarks')}
              placeholder="Enter Total Marks"
              error={validationErrors.totalMarks}
              touched={touchedFields.has('totalMarks')}
              style={{ width: '100%' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <ONumberInput
                  value={formData.totalMarksMCQ}
                  onChange={v => {
                    setFormData(prev => ({ ...prev, totalMarksMCQ: v, totalMarks: v + prev.totalMarksProgramming }));
                    if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalMarksMCQ; return e; });
                  }}
                  onBlur={() => markTouched('totalMarksMCQ')}
                  placeholder="MCQ"
                  error={validationErrors.totalMarksMCQ}
                  touched={touchedFields.has('totalMarksMCQ')}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <ONumberInput
                  value={formData.totalMarksProgramming}
                  onChange={v => {
                    setFormData(prev => ({ ...prev, totalMarksProgramming: v, totalMarks: prev.totalMarksMCQ + v }));
                    if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalMarksProgramming; return e; });
                  }}
                  onBlur={() => markTouched('totalMarksProgramming')}
                  placeholder="Prog."
                  error={validationErrors.totalMarksProgramming}
                  touched={touchedFields.has('totalMarksProgramming')}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '7px 12px', borderRadius: 8,
                background: D.orangeLight, border: `0.5px solid ${D.orange}40`,
                fontSize: 11, fontWeight: 500, color: D.orange,
                whiteSpace: 'nowrap',
              }}>
                {combinedTotal} marks
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </td>
</tr>
          </tbody>
        </table>
      </div>
    );
  }, [
    formData,
    validationErrors,
    touchedFields,
    markTouched,
    handleSelectExerciseType,
    configuredLanguages,
    hasPreConfiguredLanguages,
    isLockedForEdit,
  ]);
  // ==========================================================================
  // RENDER: MCQ Configuration (RESTORED: question specific mode info)
  // ==========================================================================
  const renderMCQConfiguration = useCallback(() => {
    const isMCQScoringLocked = savedSteps.has('Question Configuration');

    const isEqual = formData.mcqConfig.scoreSettings.scoreType === 'equalDistribution';
    const isCombined = formData.exerciseType === 'Combined';
    const totalToUse = isCombined ? formData.totalMarksMCQ : formData.totalMarks;
    const allocated = isEqual ? formData.mcqConfig.generalQuestionCount * formData.mcqConfig.scoreSettings.equalDistribution : 0;
    const isMatch = isEqual ? isApproximatelyEqual(allocated, totalToUse) : true;
    const mcqRemainingMarks = Math.max(0, totalToUse - (isEqual ? allocated : 0));
    return (
      <div className="px-4 py-3">
        {/* MCQ header + marks summary inline */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: D.blue + '20', color: D.blue }}><List size={13} /></div>
            <h3 className="text-xs font-bold" style={{ color: D.textMain, fontFamily: FONT }}>
              {isCombined ? 'MCQ Configuration' : 'Question Configuration for MCQ'}
            </h3>
          </div>
          {formData.isGraded !== false && (
            <div className="flex items-center gap-1.5 flex-shrink-0" style={{ fontFamily: FONT }}>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: D.blue + '12', color: D.blue }}>
                Total Marks : &nbsp;<strong>{totalToUse}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: D.emerald + '12', color: D.emerald }}>
                Used Marks : &nbsp;<strong>{isEqual ? formatDecimal(allocated) : '—'}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: (isEqual && mcqRemainingMarks === 0 ? D.emerald : D.red) + '12', color: isEqual && mcqRemainingMarks === 0 ? D.emerald : D.red }}>
                Remaining Marks : &nbsp;<strong>{isEqual ? formatDecimal(mcqRemainingMarks) : '—'}</strong>
              </span>
            </div>
          )}
        </div>
        <div className="space-y-2.5">
          {/* Scoring Type — hidden when Non-Graded */}
        {/* Scoring Type — hidden when Non-Graded */}
          {formData.isGraded !== false && (() => {
            const isMCQScoringLocked = savedSteps.has('Question Configuration');
            return (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <SectionLabel required info="Equal Distribution splits marks evenly across all questions; Question Specific lets you set marks per question individually">Scoring Type</SectionLabel>
                  {isMCQScoringLocked && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                      Locked
                    </span>
                  )}
                </div>
                <ODropdown
                  value={formData.mcqConfig.scoreSettings.scoreType}
                  options={mcqScoringOptions}
                  disabled={isMCQScoringLocked}
                  onChange={v => {
                    const tot = isCombined ? formData.totalMarksMCQ : formData.totalMarks;
                    setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, scoreSettings: { ...prev.mcqConfig.scoreSettings, scoreType: v as any, equalDistribution: v === 'equalDistribution' && prev.mcqConfig.generalQuestionCount > 0 ? tot / prev.mcqConfig.generalQuestionCount : 0, totalMarks: tot } } }));
                  }}
                />
                <p className="mt-1 text-[11px]" style={{ color: D.textMuted }}>
                  {isEqual ? 'All questions will have equal marks, auto-calculated from total.' : 'Set individual marks per question when creating them.'}
                </p>
              </div>
            );
          })()}

          {/* Total Questions — always visible; Marks Per Question only when graded */}
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <div className={`grid gap-3 mt-3 ${formData.isGraded !== false && isEqual ? 'grid-cols-2' : 'grid-cols-1 max-w-[200px]'}`}>
           <div>
                <SectionLabel className="mb-4" required info="Total number of MCQ question">Total Questions</SectionLabel>
                <ONumberInput value={formData.mcqConfig.generalQuestionCount}
                  liveUpdate
                  onChange={v => {
                    const tot = isCombined ? formData.totalMarksMCQ : formData.totalMarks;
                    setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, generalQuestionCount: v, scoreSettings: { ...prev.mcqConfig.scoreSettings, equalDistribution: v > 0 && tot > 0 ? tot / v : 0 } } }));
                    if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.mcqGeneralQuestionCount; return e; });
                  }}
                  onBlur={() => markTouched('mcqGeneralQuestionCount')} min={0} placeholder="e.g. 10"
                  error={validationErrors.mcqGeneralQuestionCount} touched={touchedFields.has('mcqGeneralQuestionCount')} />
              </div>
              {formData.isGraded !== false && isEqual && (
                <div>
                  <SectionLabel info="Auto-calculated">Marks Per Question</SectionLabel>
                  <div className="relative">
                    <input type="text" value={formatDecimal(formData.mcqConfig.scoreSettings.equalDistribution)} disabled readOnly
                      className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: D.border, background: D.surface, color: D.textMuted, fontFamily: FONT }} />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: D.orange }}>Auto</span>
                  </div>
                  {formData.mcqConfig.generalQuestionCount > 0 && formData.mcqConfig.scoreSettings.equalDistribution > 0 && (
                    <p className="mt-1 text-[11px]" style={{ color: D.textMuted }}>{totalToUse} ÷ {formData.mcqConfig.generalQuestionCount} = <strong style={{ color: D.textSub }}>{formatDecimal(formData.mcqConfig.scoreSettings.equalDistribution)}</strong></p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Question Specific Mode info — graded only */}
          {formData.isGraded !== false && !isEqual && (
            <div className="p-2.5 rounded-lg" style={{ background: D.blue + '08', border: `1px solid ${D.blue}20` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: D.blue }}>Question Specific Mode</p>
              <p className="text-[11px]" style={{ color: D.textMuted }}>
                Assign individual marks per question when creating them. Sum must equal <strong>{totalToUse}</strong>.
                Question count is not tracked in this mode.
              </p>
            </div>
          )}

          {formData.isGraded !== false && validationErrors.totalMarks && touchedFields.has('totalMarks') && !isCombined && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff2f2', border: `1px solid ${D.red}25` }}>
              <AlertCircle size={13} style={{ color: D.red }} /><p className="text-xs" style={{ color: D.red }}>{validationErrors.totalMarks}</p>
            </div>
          )}

          {/* Attempt Limit */}
          <div className="pt-2 border-t" style={{ borderColor: D.border }}>
            <OToggle enabled={formData.mcqConfig.attemptLimitEnabled} onChange={v => setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, attemptLimitEnabled: v, submissionAttempts: v ? prev.mcqConfig.submissionAttempts : 1 } }))} label="Attempt Limit" description="Restrict the number of submission attempts" inline />
            <div className="mt-2">
              <SectionLabel info="Maximum number of times a student can submit their MCQ answers (1–10)">Attempts Allowed</SectionLabel>
              <div className="w-28">
                <ONumberInput
                  value={formData.mcqConfig.attemptLimitEnabled ? formData.mcqConfig.submissionAttempts : 1}
                  onChange={v => setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, submissionAttempts: Math.max(1, Math.min(10, v)) } }))}
                  min={1} max={10}
                  disabled={!formData.mcqConfig.attemptLimitEnabled} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [formData.mcqConfig, formData.totalMarks, formData.totalMarksMCQ, formData.exerciseType, mcqScoringOptions, validationErrors, touchedFields, markTouched]);

  // ==========================================================================
  // RENDER: Others Configuration
  // ==========================================================================
  // ==========================================================================
  // RENDER: Others Configuration (EXACT MATCH to Programming UI)
  // ==========================================================================
  // ==========================================================================
  // RENDER: Others Configuration (FIXED)
  // ==========================================================================
  const renderOthersConfiguration = useCallback(() => {
    const totalToUse = formData.totalMarks;
    const isMatch = isApproximatelyEqual(othersAllocatedMarks, totalToUse);
    const total = formData.exerciseType === 'Combined' ? (formData.totalMarksProgramming ?? 0) : (formData.totalMarks ?? 0);

    const progUsedMarks = programmingAllocatedMarks;
    const progRemainingMarks = Math.max(0, totalToUse - progUsedMarks);

    const renderScoringConfiguration = () => {
      const counts = formData.othersConfig.questionConfigType === 'selectionLevel'
        ? formData.othersConfig.selectionLevelCounts
        : formData.othersConfig.levelBasedCounts;
      const ls = formData.othersConfig.scoreSettings.levelScoringConfiguration;
      const scoringErrors = (validationErrors.othersLevelScoring as Record<string, string>) || {};
      const levelStyles = {
        easy: { label: 'Easy', color: D.emerald, bg: D.emerald + '10', border: D.border2 },
        medium: { label: 'Medium', color: D.amber, bg: D.amber + '10', border: D.border2 },
        hard: { label: 'Hard', color: D.red, bg: D.red + '10', border: D.border2 },
      };
      const activeLevels = (['easy', 'medium', 'hard'] as const).filter(l => counts[l] > 0);

      return (
        <div className="grid grid-cols-3 gap-2">
          {activeLevels.map(level => {
            const count = counts[level];
            const scoring = ls[level];
            const style = levelStyles[level];
            const hasError = touchedFields.has(`scoring_others_${level}`) && !!scoringErrors[level];
            const isQSpec = scoring?.type === 'question_specific';
            const total = isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0) * count;

            return (
              <div key={level} className="p-2.5 rounded-lg border flex flex-col gap-1.5"
                style={{
                  background: hasError ? '#fff2f2' : style.bg,
                  borderColor: hasError ? D.red + '40' : style.border
                }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold" style={{ color: style.color, fontFamily: FONT }}>{style.label}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: style.color + '20', color: style.color }}>{count} Question</span>
                </div>
                <div>
                  <div className="text-[9px] font-semibold mb-1" style={{ color: D.textMuted }}>TYPE</div>
                  <select value={scoring?.type || 'level_specific'} onChange={e => updateOthersLevelScoringConfig(level, { type: e.target.value as any, ...(e.target.value === 'level_specific' ? { marksPerQuestion: 2, totalMarks: undefined } : { totalMarks: 10, marksPerQuestion: undefined }) })}
                    className="w-full px-2 py-1 text-[11px] rounded-md border font-semibold outline-none"
                    style={{ borderColor: D.border2, background: '#fff', color: D.textMain, fontFamily: FONT }}>
                    <option value="level_specific">Level-specific</option>
                    <option value="question_specific">Question-specific</option>
                  </select>
                </div>
                <div>
                  <div className="text-[9px] font-semibold mb-1" style={{ color: D.textMuted }}>{isQSpec ? 'TOTAL MARKS' : 'PER QUESTION'}</div>
                  <ONumberInput value={isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0)}
                    onChange={v => updateOthersLevelScoringConfig(level, isQSpec ? { totalMarks: v } : { marksPerQuestion: v })}
                    className="text-xs" />
                </div>
                <div className="text-[10px] text-center font-semibold pt-1 border-t" style={{ borderColor: D.border2, color: style.color }}>
                  = {total} marks
                </div>
                {hasError && <p className="text-[10px]" style={{ color: D.red }}>{scoringErrors[level]}</p>}
              </div>
            );
          })}
        </div>
      );
    };

    const levelColors = { easy: D.emerald, medium: D.amber, hard: D.red };
    const scoringCounts = formData.othersConfig.questionConfigType === 'selectionLevel'
      ? formData.othersConfig.selectionLevelCounts
      : formData.othersConfig.levelBasedCounts;
    const ls = formData.othersConfig.scoreSettings.levelScoringConfiguration;
    const scoringErrors = (validationErrors.othersLevelScoring as Record<string, string>) || {};
    const activeScoringLevels = (['easy', 'medium', 'hard'] as const).filter(l => scoringCounts[l] > 0);

    return (
      <div className="px-4 py-3">
        {/* Header — sticky */}
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between py-2" style={{ background: '#fff' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.surface2, color: D.textMain }}>
              <FolderOpen size={13} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#000000', fontFamily: FONT }}>Others Configuration</h3>
              <p className="text-[10px]" style={{ color: D.textSub }}>File upload, Notion, and custom tasks</p>
            </div>
          </div>
        </div>

        {othersLevelMismatch && (
          <div className="sticky z-10 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ top: '44px', background: D.red + '10', border: `1px solid ${D.red}40` }}>
            <AlertCircle size={13} style={{ color: D.red }} />
            <p className="text-xs font-semibold flex-1" style={{ color: D.red }}>{othersLevelMismatch}</p>
          </div>
        )}

        <div className="space-y-0">
          {/* Config Strategy + Difficulty Counts — side by side */}
          <div className="py-2.5 border-b" style={{ borderColor: D.border }}>
            {formData.othersConfig.questionConfigType === 'general' ? (
              /* ── GENERAL: 3 columns — Config Strategy | Total Questions | Marks/Q ── */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: '12px', alignItems: 'start' }}>
                {/* Col 1: Config Strategy */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>
                      Config Strategy <span style={{ color: D.orange }}>*</span>
                    </span>
                    <InfoTooltip content="General: fixed question count; Level Based: questions by difficulty (Easy/Medium/Hard); Selection Level: pick up to 2 difficulty levels" side="right" />
                  </div>
                  <ODropdown value={formData.othersConfig.questionConfigType} options={configOptions}
                    onChange={v => {
                      setFormData(prev => ({
                        ...prev,
                        othersConfig: {
                          ...prev.othersConfig,
                          questionConfigType: v as any,
                          ...(v === 'general'
                            ? { generalQuestionCount: 0, levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }
                            : { levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }
                          )
                        }
                      }));
                      setLevelScoringOpen({ easy: false, medium: false, hard: false });
                    }} />
                </div>
                {/* Col 2: Total Questions */}
                <div>
                  <div className="mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>Total Questions <span style={{ color: D.orange }}>*</span></span>
                  </div>
                  <ONumberInput value={formData.othersConfig.generalQuestionCount}
                    onChange={v => {
                      if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.othersGeneralQuestionCount; return e; });
                      setFormData(prev => ({
                        ...prev,
                        othersConfig: {
                          ...prev.othersConfig,
                          generalQuestionCount: v,
                          scoreSettings: {
                            ...prev.othersConfig.scoreSettings,
                            equalDistribution: v > 0 && totalToUse > 0 ? totalToUse / v : 0
                          }
                        }
                      }));
                    }}
                    onBlur={() => markTouched('othersGeneralQuestionCount')} min={0} placeholder="e.g. 5"
                    error={validationErrors.othersGeneralQuestionCount} touched={touchedFields.has('othersGeneralQuestionCount')} />
                </div>
                {/* Col 3: Marks/Q */}
                <div>
                  <div className="mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>Marks/Q</span>
                  </div>
                  <div className="relative">
                    <input type="text" value={formData.othersConfig.scoreSettings.equalDistribution > 0 ? formatDecimal(formData.othersConfig.scoreSettings.equalDistribution) : '0'} disabled readOnly
                      className="w-full px-3 py-2 text-sm rounded-lg border text-center" style={{ borderColor: D.border, background: D.surface, color: D.textMuted, fontFamily: FONT }} />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: D.orange }}>Auto</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ── LEVEL BASED / SELECTION LEVEL ── */
              <div className="space-y-3">
                {/* Config Strategy — standalone row */}
                <div style={{ maxWidth: '45%' }}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>
                      Config Strategy <span style={{ color: D.orange }}>*</span>
                    </span>
                    <InfoTooltip content="General: fixed question count; Level Based: questions by difficulty (Easy/Medium/Hard); Selection Level: pick up to 2 difficulty levels" side="right" />
                  </div>
                  <ODropdown value={formData.othersConfig.questionConfigType} options={configOptions}
                    onChange={v => {
                      setFormData(prev => ({
                        ...prev,
                        othersConfig: {
                          ...prev.othersConfig,
                          questionConfigType: v as any,
                          ...(v === 'general'
                            ? { generalQuestionCount: 0, levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }
                            : { levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }
                          )
                        }
                      }));
                      setLevelScoringOpen({ easy: false, medium: false, hard: false });
                    }} />
                </div>
                {/* Unified Questions + Scoring grid — full width */}
                <div className="flex items-center justify-between mt-5">
                  <div className="flex items-center gap-1.5">
                    <Calculator size={12} style={{ color: D.textMuted }} />
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: D.textMuted, fontFamily: FONT }}>Questions and Scoring Configuration</span>
                  </div>
                  <div className="flex items-center gap-1.5" style={{ fontFamily: FONT }}>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: D.blue + '15', color: D.blue }}>
                      Total Marks : &nbsp;<strong>{totalToUse}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: D.emerald + '15', color: D.emerald }}>
                      Used Marks : &nbsp;<strong>{formatDecimal(progUsedMarks)}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: (progRemainingMarks === 0 ? D.emerald : D.red) + '15', color: progRemainingMarks === 0 ? D.emerald : D.red }}>
                      Left Marks&nbsp;<strong>{formatDecimal(progRemainingMarks)}</strong>
                    </span>
                  </div>
                </div>

                {(() => {
                  const isSelLevel = formData.othersConfig.questionConfigType === 'selectionLevel';
                  const gridCols = '70px 1fr 1fr 1fr';
                  const rowStyle = { display: 'grid', gridTemplateColumns: gridCols, gap: '6px', marginBottom: '4px', alignItems: 'center' } as const;
                  return (
                    <div>
                      {/* Header row */}
                      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '6px', marginBottom: '4px', alignItems: 'end' }}>
                        <div />
                        {(['easy', 'medium', 'hard'] as const).map(level => {
                          if (isSelLevel) {
                            const checked = (formData.othersConfig.selectionLevelCounts?.[level] ?? 0) > 0;
                            return (
                              <div key={level}>
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input type="checkbox" checked={checked} onChange={e => {
                                    const nc = { ...formData.othersConfig.selectionLevelCounts, [level]: e.target.checked ? 1 : 0 };
                                    const active = (['easy', 'medium', 'hard'] as const).filter(l => nc[l] > 0).length;
                                    if (active > 2) setFormData(prev => ({ ...prev, othersConfig: { ...prev.othersConfig, questionConfigType: 'levelBased', levelBasedCounts: { easy: nc.easy > 0 ? nc.easy : 1, medium: nc.medium > 0 ? nc.medium : 1, hard: nc.hard > 0 ? nc.hard : 1 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } } }));
                                    else setFormData(prev => ({ ...prev, othersConfig: { ...prev.othersConfig, selectionLevelCounts: nc } }));
                                  }} className="w-3 h-3 rounded" style={{ accentColor: levelColors[level] }} />
                                  <span className="text-[10px] font-bold capitalize" style={{ color: levelColors[level] }}>{level}</span>
                                </label>
                              </div>
                            );
                          }
                          return <div key={level} className="text-[10px] font-bold capitalize" style={{ color: levelColors[level] }}>{level}</div>;
                        })}
                      </div>
                      {/* Row 1: Questions */}
                      <div style={rowStyle}>
                        <div className="text-[10px] font-semibold" style={{ color: D.textMuted }}>Questions</div>
                        {(['easy', 'medium', 'hard'] as const).map(level => {
                          const checked = isSelLevel ? (formData.othersConfig.selectionLevelCounts?.[level] ?? 0) > 0 : true;
                          const ek = `othersLevelCounts_${level.charAt(0).toUpperCase() + level.slice(1)}`;
                          const val = isSelLevel
                            ? (formData.othersConfig.selectionLevelCounts?.[level] === 0 ? ('' as any) : formData.othersConfig.selectionLevelCounts?.[level])
                            : (formData.othersConfig.levelBasedCounts?.[level] === 0 ? ('' as any) : formData.othersConfig.levelBasedCounts?.[level]);
                          const handleChange = isSelLevel
                            ? (v: number) => setFormData(prev => ({ ...prev, othersConfig: { ...prev.othersConfig, selectionLevelCounts: { ...prev.othersConfig.selectionLevelCounts, [level]: v } } }))
                            : (v: number) => { setFormData(prev => ({ ...prev, othersConfig: { ...prev.othersConfig, levelBasedCounts: { ...prev.othersConfig.levelBasedCounts, [level]: v } } })); if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e[ek]; return e; }); setTouchedFields(prev => { const n = new Set(prev); n.delete('scoring_others_easy'); n.delete('scoring_others_medium'); n.delete('scoring_others_hard'); return n; }); };
                          return (
                            <div key={level}>
                              <ONumberInput value={val} onChange={handleChange}
                                onBlur={isSelLevel ? undefined : () => markTouched('othersLevelCounts')}
                                disabled={isSelLevel && !checked} min={0}
                                placeholder={isSelLevel && !checked ? '—' : 'Count'}
                                error={!isSelLevel ? validationErrors[ek] : undefined}
                                touched={!isSelLevel ? touchedFields.has('othersLevelCounts') : undefined} />
                            </div>
                          );
                        })}
                      </div>
                      {!isSelLevel && validationErrors.othersLevelCounts && touchedFields.has('othersLevelCounts') && (
                        <p className="text-[10px] mb-1" style={{ color: D.red }}>{validationErrors.othersLevelCounts}</p>
                      )}
                      {/* Row 2: Score Type */}
                      <div style={rowStyle}>
                        <div className="text-[10px] font-semibold" style={{ color: D.textMuted }}>Score Type</div>
                        {(['easy', 'medium', 'hard'] as const).map(level => {
                          const count = scoringCounts[level];
                          const scoring = ls[level];
                          const hasError = touchedFields.has(`scoring_others_${level}`) && !!scoringErrors[level];
                          return (
                            <div key={level} style={{ opacity: count === 0 ? 0.4 : 1, pointerEvents: count === 0 ? 'none' : 'auto' }}>
                              <select value={scoring?.type || 'level_specific'}
                                onChange={e => updateOthersLevelScoringConfig(level, { type: e.target.value as any, ...(e.target.value === 'level_specific' ? { marksPerQuestion: 2, totalMarks: undefined } : { totalMarks: 10, marksPerQuestion: undefined }) })}
                                className="w-full px-2 py-1.5 text-xs rounded-lg border outline-none"
                                style={{ borderColor: hasError ? D.red + '60' : D.border, background: '#fff', color: D.textMain, fontFamily: FONT }}>
                                <option value="level_specific">Level-specific</option>
                                <option value="question_specific">Question-specific</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                      {/* Row 3: Marks */}
                      <div style={rowStyle}>
                        <div className="text-[10px] font-semibold" style={{ color: D.textMuted }}>Marks</div>
                        {(['easy', 'medium', 'hard'] as const).map(level => {
                          const count = scoringCounts[level];
                          const scoring = ls[level];
                          const isQSpec = scoring?.type === 'question_specific';
                          const hasError = touchedFields.has(`scoring_others_${level}`) && !!scoringErrors[level];
                          return (
                            <div key={level} style={{ opacity: count === 0 ? 0.4 : 1, pointerEvents: count === 0 ? 'none' : 'auto' }}>
                              <ONumberInput value={isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0)}
                                onChange={v => updateOthersLevelScoringConfig(level, isQSpec ? { totalMarks: v } : { marksPerQuestion: v })} />
                              {hasError && <span className="text-[10px]" style={{ color: D.red }}>{scoringErrors[level]}</span>}
                            </div>
                          );
                        })}
                      </div>
                      {/* Row 4: Total */}
                      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '6px', alignItems: 'center' }}>
                        <div className="text-[10px] font-semibold" style={{ color: D.textMuted }}>Total</div>
                        {(['easy', 'medium', 'hard'] as const).map(level => {
                          const count = scoringCounts[level];
                          if (count === 0) return <div key={level} />;
                          const scoring = ls[level];
                          const isQSpec = scoring?.type === 'question_specific';
                          const total = isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0) * count;
                          return (
                            <div key={level} className="text-center text-xs font-semibold py-1 rounded" style={{ background: levelColors[level] + '10', color: levelColors[level] }}>
                              {total} marks
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Question Flow */}
          <div className={`flex items-center gap-3 py-2.5 border-b${othersLevelMismatch ? ' opacity-40 pointer-events-none' : ''}`} style={{ borderColor: D.border }}>
            <div className="w-36 flex-shrink-0 flex items-center gap-1.5">
              <Shuffle size={12} style={{ color: D.textMuted }} />
              <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>Question Flow</span>
            </div>
            <div className="flex-1 flex gap-2">
              {questionFlowOptions.map(opt => {
                const sel = formData.othersConfig.questionFlow === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => setFormData(prev => ({ ...prev, othersConfig: { ...prev.othersConfig, questionFlow: opt.value as any } }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                    style={{ borderColor: sel ? D.orange : D.border, background: sel ? D.orangeLight : D.bg, color: sel ? D.orange : D.textMain, fontFamily: FONT }}>
                    <span style={{ color: sel ? D.orange : D.textMuted }}>{opt.icon}</span>
                    {opt.label}
                    {sel && <Check size={11} style={{ color: D.orange }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Attempt Limit */}
          <div className="py-2.5">
            <OToggle enabled={formData.othersConfig.attemptLimitEnabled}
              onChange={v => setFormData(prev => ({ ...prev, othersConfig: { ...prev.othersConfig, attemptLimitEnabled: v, submissionAttempts: v ? prev.othersConfig.submissionAttempts : 1 } }))}
              label="Attempt Limit" description="Restrict submission attempts" inline />
            <div className="flex items-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: D.border }}>
              <div className="w-36 flex-shrink-0 flex items-center gap-1.5">
                <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>Attempts Allowed</span>
                <InfoTooltip content="Maximum number of submission attempts allowed per student (1–10)" side="right" />
              </div>
              <div className="w-24">
                <ONumberInput
                  value={formData.othersConfig.attemptLimitEnabled ? formData.othersConfig.submissionAttempts : 1}
                  onChange={v => setFormData(prev => ({ ...prev, othersConfig: { ...prev.othersConfig, submissionAttempts: Math.max(1, Math.min(10, v)) } }))}
                  min={1} max={10}
                  disabled={!formData.othersConfig.attemptLimitEnabled} />
              </div>
            </div>
          </div>

          {validationErrors.othersTotalMarks && touchedFields.has('othersTotalMarks') && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff2f2', border: `1px solid ${D.red}25` }}>
              <AlertCircle size={13} style={{ color: D.red }} /><p className="text-xs" style={{ color: D.red }}>{validationErrors.othersTotalMarks}</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [formData, validationErrors, touchedFields, markTouched, othersAllocatedMarks, othersLevelMismatch, othersShouldShowScoringSection, questionFlowOptions, updateOthersLevelScoringConfig, configOptions]);
  // ==========================================================================
  // RENDER: Programming Configuration
  // ==========================================================================
  const renderProgrammingConfiguration = useCallback(() => {
    const totalQs = getProgrammingTotalQuestions();
    const isCombined = formData.exerciseType === 'Combined';
    const totalToUse = isCombined ? formData.totalMarksProgramming : formData.totalMarks;
    const isMatch = isApproximatelyEqual(programmingAllocatedMarks, totalToUse);

    const levelColors = { easy: D.emerald, medium: D.amber, hard: D.red };
    const scoringCounts = formData.programmingConfig.questionConfigType === 'selectionLevel'
      ? formData.programmingConfig.selectionLevelCounts
      : formData.programmingConfig.levelBasedCounts;
    const ls = formData.programmingConfig.scoreSettings.levelScoringConfiguration;
    const scoringErrors = (validationErrors.programmingLevelScoring as Record<string, string>) || {};

    // Helper to update count and sync marks
    const updateLevelCount = (level: 'easy' | 'medium' | 'hard', newCount: number) => {
      if (formData.programmingConfig.questionConfigType === 'levelBased') {
        // Update levelBasedCounts
        const newCounts = {
          ...formData.programmingConfig.levelBasedCounts,
          [level]: newCount
        };

        // Get current scoring config for this level
        const currentScoring = ls[level] || { type: 'level_specific', marksPerQuestion: 5, questionCount: 0 };

        // Calculate new total marks
        const easyTotal = (newCounts.easy || 0) * (ls.easy?.marksPerQuestion || 0);
        const mediumTotal = (newCounts.medium || 0) * (ls.medium?.marksPerQuestion || 0);
        const hardTotal = (newCounts.hard || 0) * (ls.hard?.marksPerQuestion || 0);
        const newTotalMarks = easyTotal + mediumTotal + hardTotal;

        // Update scoring config with new question count
        const updatedScoring = {
          ...ls,
          [level]: {
            ...currentScoring,
            questionCount: newCount
          }
        };

        setFormData(prev => ({
          ...prev,
          programmingConfig: {
            ...prev.programmingConfig,
            levelBasedCounts: newCounts,
            scoreSettings: {
              ...prev.programmingConfig.scoreSettings,
              levelScoringConfiguration: updatedScoring,
              totalMarks: newTotalMarks
            }
          }
        }));

        // Clear validation errors
        if (newCount > 0) {
          setValidationErrors(prev => {
            const e = { ...prev };
            delete e[`programmingLevelCounts_${level.charAt(0).toUpperCase() + level.slice(1)}`];
            return e;
          });
        }
      }
    };

    // Helper to update marks and recalculate totals
    const updateLevelMarks = (level: 'easy' | 'medium' | 'hard', marksPerQuestion: number) => {
      if (formData.programmingConfig.questionConfigType === 'levelBased') {
        const counts = formData.programmingConfig.levelBasedCounts;
        const currentScoring = ls[level] || { type: 'level_specific', marksPerQuestion: 5, questionCount: counts[level] };

        // Calculate new total marks
        const easyTotal = (counts.easy || 0) * (level === 'easy' ? marksPerQuestion : (ls.easy?.marksPerQuestion || 0));
        const mediumTotal = (counts.medium || 0) * (level === 'medium' ? marksPerQuestion : (ls.medium?.marksPerQuestion || 0));
        const hardTotal = (counts.hard || 0) * (level === 'hard' ? marksPerQuestion : (ls.hard?.marksPerQuestion || 0));
        const newTotalMarks = easyTotal + mediumTotal + hardTotal;

        // Update scoring config
        const updatedScoring = {
          ...ls,
          [level]: {
            ...currentScoring,
            marksPerQuestion: marksPerQuestion,
            type: 'level_specific'
          }
        };

        setFormData(prev => ({
          ...prev,
          programmingConfig: {
            ...prev.programmingConfig,
            scoreSettings: {
              ...prev.programmingConfig.scoreSettings,
              levelScoringConfiguration: updatedScoring,
              levelBasedMarks: {
                ...prev.programmingConfig.scoreSettings.levelBasedMarks,
                [level]: marksPerQuestion
              },
              totalMarks: newTotalMarks
            }
          }
        }));

        // Clear validation errors
        setValidationErrors(prev => {
          const e = { ...prev };
          delete e.programmingTotalMarks;
          if (prev.programmingLevelScoring) {
            const ns = { ...prev.programmingLevelScoring };
            delete ns[level];
            if (Object.keys(ns).length) e.programmingLevelScoring = ns;
            else delete e.programmingLevelScoring;
          }
          return e;
        });
      }
    };

    // Helper for selection level updates
    const updateSelectionLevelCount = (level: 'easy' | 'medium' | 'hard', newCount: number) => {
      const newCounts = {
        ...formData.programmingConfig.selectionLevelCounts,
        [level]: newCount
      };

      // Calculate total marks from active levels
      const easyTotal = (newCounts.easy || 0) * (ls.easy?.marksPerQuestion || 0);
      const mediumTotal = (newCounts.medium || 0) * (ls.medium?.marksPerQuestion || 0);
      const hardTotal = (newCounts.hard || 0) * (ls.hard?.marksPerQuestion || 0);
      const newTotalMarks = easyTotal + mediumTotal + hardTotal;

      // Update scoring config with new question count for this level
      const updatedScoring = {
        ...ls,
        [level]: {
          ...ls[level],
          questionCount: newCount
        }
      };

      setFormData(prev => ({
        ...prev,
        programmingConfig: {
          ...prev.programmingConfig,
          selectionLevelCounts: newCounts,
          scoreSettings: {
            ...prev.programmingConfig.scoreSettings,
            levelScoringConfiguration: updatedScoring,
            totalMarks: newTotalMarks
          }
        }
      }));
    };

    const progUsedMarks = programmingAllocatedMarks;
    const progRemainingMarks = Math.max(0, totalToUse - progUsedMarks);

    return (
      <div className="px-4 py-3">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.surface2, color: D.textMain }}>
            <Terminal size={13} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: '#000000', fontFamily: FONT }}>
            {isCombined ? 'Programming Configuration' : 'Question Configuration for Programming'}
          </h3>
        </div>

        {/* Total Marks read-only field */}
        {/* <div className="mb-3 pb-3 border-b" style={{ borderColor: D.border }}>
        <div className="flex items-center gap-1 mb-1">
          <span className="text-xs font-semibold" style={{ color: D.textSub }}>Total Marks</span>
          <InfoTooltip content="Auto-filled from Step 1 — cannot be changed here" side="right" />
        </div>
        <div className="relative">
          <input type="text" value={totalToUse} disabled readOnly
            className="w-full px-3 py-2 text-sm rounded-lg border cursor-not-allowed"
            style={{ borderColor: D.border, background: '#f4f5f7', color: D.textMuted, fontFamily: FONT, fontWeight: 600 }} />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: D.orange }}>Step 1</span>
        </div>
      </div> */}

        {/* Warning message — graded only */}
      

        <div className="space-y-0">
          {/* Config Strategy + Difficulty Counts — side by side */}
          <div className="py-2.5 border-b" style={{ borderColor: D.border }}>
            {/* Config Strategy label row */}
            {/* <div className="flex items-center gap-1 mb-1.5">
              <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>Config Strategy</span>
              <InfoTooltip content="General: fixed question count; Level Based: questions by difficulty (Easy/Medium/Hard); Selection Level: pick up to 2 difficulty levels" side="right" />
            </div> */}
            {formData.programmingConfig.questionConfigType === 'general' ? (
              <div>
                {/* Label row — all three labels on same line */}
                <div style={{ display: 'grid', gridTemplateColumns: formData.isGraded !== false ? '1fr 1fr 90px' : '1fr 1fr', gap: '12px', marginBottom: '4px', alignItems: 'end' }}>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>
                      Config Strategy <span style={{ color: D.orange }}>*</span>
                    </span>
                    {isConfigStrategyLocked
                      ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', marginLeft: 3 }}>Locked</span>
                      : <InfoTooltip content="General: fixed question count; Level Based: questions by difficulty (Easy/Medium/Hard); Selection Level: pick up to 2 difficulty levels" side="right" />}
                  </div>
                  <div>
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>
                      Total Questions <span style={{ color: D.orange }}>*</span>
                    </span>
                  </div>
                  {formData.isGraded !== false && <div>
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>Marks/Q</span>
                  </div>}
                </div>

                {/* Input row */}
                <div style={{ display: 'grid', gridTemplateColumns: formData.isGraded !== false ? '1fr 1fr 90px' : '1fr 1fr', gap: '12px', alignItems: 'start' }}>
                  <div>
                    <ODropdown
                      value={formData.programmingConfig.questionConfigType}
                      options={configOptions}
                      disabled={isConfigStrategyLocked}
                      onChange={isConfigStrategyLocked ? () => { } : v => {
                        setFormData(prev => ({
                          ...prev,
                          programmingConfig: {
                            ...prev.programmingConfig,
                            questionConfigType: v as any,
                            ...(v === 'general'
                              ? { generalQuestionCount: 0, levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }
                              : { levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }
                            )
                          }
                        }));
                        setLevelScoringOpen({ easy: false, medium: false, hard: false });
                      }}
                    />
                  </div>
                <div>
                    <ONumberInput
                      value={formData.programmingConfig.generalQuestionCount}
                      liveUpdate
                      onChange={v => {
                        if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.programmingGeneralQuestionCount; return e; });
                        setFormData(prev => {
                          const tot = prev.exerciseType === 'Combined' ? prev.totalMarksProgramming : prev.totalMarks;
                          return {
                            ...prev,
                            programmingConfig: {
                              ...prev.programmingConfig,
                              generalQuestionCount: v,
                              scoreSettings: {
                                ...prev.programmingConfig.scoreSettings,
                                equalDistribution: v > 0 && tot > 0 ? tot / v : 0
                              }
                            }
                          };
                        });
                      }}
                      onBlur={() => markTouched('programmingGeneralQuestionCount')}
                      min={0}
                      placeholder="e.g. 5"
                      error={validationErrors.programmingGeneralQuestionCount}
                      touched={touchedFields.has('programmingGeneralQuestionCount')}
                    />
                  </div>
                  {formData.isGraded !== false && <div>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.programmingConfig.scoreSettings.equalDistribution > 0
                          ? formatDecimal(formData.programmingConfig.scoreSettings.equalDistribution)
                          : '0'}
                        disabled
                        readOnly
                        className="w-full px-3 py-2 text-sm rounded-lg border text-center"
                        style={{
                          borderColor: D.border,
                          background: D.surface,
                          color: D.textMuted,
                          fontFamily: FONT
                        }}
                      />
                      <span
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold"
                        style={{ color: D.orange }}>
                        Auto
                      </span>
                    </div>
                  </div>}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div style={{ maxWidth: '45%' }}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>
                      Config Strategy <span style={{ color: D.orange }}>*</span>
                    </span>
                    {isConfigStrategyLocked
                      ? <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', marginLeft: 3 }}>Locked</span>
                      : <InfoTooltip content="General: fixed question count; Level Based: questions by difficulty (Easy/Medium/Hard); Selection Level: pick up to 2 difficulty levels" side="right" />}
                  </div>
                  <ODropdown
                    value={formData.programmingConfig.questionConfigType}
                    options={configOptions}
                    disabled={isConfigStrategyLocked}
                    onChange={isConfigStrategyLocked ? () => { } : v => {
                      setFormData(prev => ({
                        ...prev,
                        programmingConfig: {
                          ...prev.programmingConfig,
                          questionConfigType: v as any,
                          ...(v === 'general'
                            ? { generalQuestionCount: 0, levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }
                            : { levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }
                          )
                        }
                      }));
                      setLevelScoringOpen({ easy: false, medium: false, hard: false });
                    }}
                  />
                </div>

                {formData.programmingConfig.questionConfigType === '' ? (
                  <div className="mt-2 px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{ background: D.amber + '10', border: `1px solid ${D.amber}30`, color: D.amber }}>
                    Please select a Config Strategy above to configure questions and scoring.
                  </div>
                ) : <>
                  <div className="flex items-center justify-between mt-5">
                    <div className="flex items-center gap-1.5">
                      <Calculator size={12} style={{ color: D.textMuted }} />
                      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: D.textMuted, fontFamily: FONT }}>Questions and Scoring Configuration</span>
                    </div>

                      {formData.isGraded !== false && programmingLevelMismatch && (
          <div className=" flex items-center gap-2 px-3 rounded-lg warning-pulse"
            style={{ background: D.red + '10', border: `1px solid ${D.red}40` }}>
            <AlertCircle size={13} style={{ color: D.red, flexShrink: 0 }} />
            <p className="text-xs font-semibold flex-1" style={{ color: D.red }}>{programmingLevelMismatch}</p>
          </div>
        )}
                    {formData.isGraded !== false && (
                      <div className="flex items-center gap-1.5" style={{ fontFamily: FONT }}>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: D.blue + '15', color: D.blue }}>
                          Total Marks : &nbsp;<strong>{totalToUse}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: D.emerald + '15', color: D.emerald }}>
                          Used Marks : &nbsp;<strong>{formatDecimal(progUsedMarks)}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: (progRemainingMarks === 0 ? D.emerald : D.red) + '15', color: progRemainingMarks === 0 ? D.emerald : D.red }}>
                          Remaining Marks : &nbsp;<strong>{formatDecimal(progRemainingMarks)}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const isSelLevel = formData.programmingConfig.questionConfigType === 'selectionLevel';
                    const gridCols = '70px 1fr 1fr 1fr';
                    const rowStyle = { display: 'grid', gridTemplateColumns: gridCols, gap: '6px', marginBottom: '4px', alignItems: 'center' } as const;

                    const counts = isSelLevel
                      ? formData.programmingConfig.selectionLevelCounts
                      : formData.programmingConfig.levelBasedCounts;
                    const allThreeFilled = counts.easy > 0 && counts.medium > 0 && counts.hard > 0;
                    const anyFilled = counts.easy > 0 || counts.medium > 0 || counts.hard > 0;
                    const showScoringRows = isSelLevel ? anyFilled : allThreeFilled;

                    return (
                      <div>
                        {/* Header row */}
                        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '6px', marginBottom: '4px', alignItems: 'end' }}>
                          <div />
                          {(['easy', 'medium', 'hard'] as const).map(level => {
                            if (isSelLevel) {
                              const checked = (formData.programmingConfig.selectionLevelCounts?.[level] ?? 0) > 0;
                              return (
                                <div key={level}>
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={checked} onChange={e => {
                                      const nc = { ...formData.programmingConfig.selectionLevelCounts, [level]: e.target.checked ? 1 : 0 };
                                      const active = (['easy', 'medium', 'hard'] as const).filter(l => nc[l] > 0).length;
                                      if (active > 2) {
                                        setFormData(prev => ({
                                          ...prev,
                                          programmingConfig: {
                                            ...prev.programmingConfig,
                                            questionConfigType: 'levelBased',
                                            levelBasedCounts: { easy: nc.easy > 0 ? nc.easy : 1, medium: nc.medium > 0 ? nc.medium : 1, hard: nc.hard > 0 ? nc.hard : 1 },
                                            selectionLevelCounts: { easy: 0, medium: 0, hard: 0 }
                                          }
                                        }));
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          programmingConfig: {
                                            ...prev.programmingConfig,
                                            selectionLevelCounts: nc
                                          }
                                        }));
                                      }
                                    }} className="w-3 h-3 rounded" style={{ accentColor: levelColors[level] }} />
                                    <span className="text-[10px] font-bold capitalize" style={{ color: levelColors[level] }}>{level}</span>
                                  </label>
                                </div>
                              );
                            }
                            return <div key={level} className="text-[10px] font-bold capitalize" style={{ color: levelColors[level] }}>{level}</div>;
                          })}
                        </div>

                        {/* Row 1: Questions */}
                        <div style={rowStyle}>
                          <div className="text-[10px] font-semibold" style={{ color: D.textMuted }}>Questions</div>
                          {(['easy', 'medium', 'hard'] as const).map(level => {
                            const checked = isSelLevel ? (formData.programmingConfig.selectionLevelCounts?.[level] ?? 0) > 0 : true;
                            const val = isSelLevel
                              ? (formData.programmingConfig.selectionLevelCounts?.[level] === 0 ? ('' as any) : formData.programmingConfig.selectionLevelCounts?.[level])
                              : (formData.programmingConfig.levelBasedCounts?.[level] === 0 ? ('' as any) : formData.programmingConfig.levelBasedCounts?.[level]);

                            const handleChange = (v: number) => {
                              if (isSelLevel) {
                                updateSelectionLevelCount(level, v);
                              } else {
                                updateLevelCount(level, v);
                              }
                            };

                            return (
                              <div key={level}>
                                <ONumberInput
                                  value={val}
                                  onChange={handleChange}
                                  liveUpdate
                                  onBlur={() => {
                                    if (!isSelLevel) markTouched('programmingLevelCounts');
                                  }}
                                  disabled={isSelLevel && !checked}
                                  min={0}
                                  placeholder={isSelLevel && !checked ? '—' : 'Count'}
                                  error={!isSelLevel ? validationErrors[`programmingLevelCounts_${level.charAt(0).toUpperCase() + level.slice(1)}`] : undefined}
                                  touched={!isSelLevel ? touchedFields.has('programmingLevelCounts') : undefined}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {!isSelLevel && validationErrors.programmingLevelCounts && touchedFields.has('programmingLevelCounts') && (
                          <p className="text-[10px] mb-1" style={{ color: D.red }}>{validationErrors.programmingLevelCounts}</p>
                        )}

                        {/* Scoring rows — hidden when Non-Graded */}
                        {formData.isGraded === false ? null : !showScoringRows ? (
                          <div className="mt-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
                            style={{ background: D.amber + '10', border: `1px solid ${D.amber}30`, color: D.amber }}>
                            {isSelLevel
                              ? 'Select at least one difficulty level and enter a count to configure scoring'
                              : 'Fill all three difficulty counts to configure scoring'}
                          </div>
                        ) : (
                          <>
                            {/* Row 2: Score Type */}
                            <div style={rowStyle}>
                              <div className="text-[10px] font-semibold" style={{ color: D.textMuted }}>Score Type</div>
                              {(['easy', 'medium', 'hard'] as const).map(level => {
                                const count = scoringCounts[level];
                                const scoring = ls[level];
                                const hasError = touchedFields.has(`scoring_${level}`) && !!scoringErrors[level];
                                const isDisabled = isSelLevel ? count === 0 : false;
                                return (
                                  <div key={level} style={{ opacity: isDisabled ? 0.4 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}>
                                    <select
                                      value={scoring?.type || 'level_specific'}
                                      onChange={e => updateLevelScoringConfig(level, {
                                        type: e.target.value as any,
                                        ...(e.target.value === 'level_specific'
                                          ? { marksPerQuestion: scoring?.marksPerQuestion || 0, totalMarks: undefined }
                                          : { totalMarks: scoring?.totalMarks || 0, marksPerQuestion: undefined }
                                        )
                                      })}
                                      className="w-full px-2 py-1.5 text-xs rounded-lg border outline-none"
                                      style={{ borderColor: hasError ? D.red + '60' : D.border, background: '#fff', color: D.textMain, fontFamily: FONT }}>
                                      <option value="level_specific">Level-specific</option>
                                      <option value="question_specific">Question-specific</option>
                                    </select>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Row 3: Marks */}
                            <div style={rowStyle}>
                              <div className="text-[10px] font-semibold" style={{ color: D.textMuted }}>Marks</div>
                              {(['easy', 'medium', 'hard'] as const).map(level => {
                                const count = scoringCounts[level];
                                const scoring = ls[level];
                                const isQSpec = scoring?.type === 'question_specific';
                                const hasError = touchedFields.has(`scoring_${level}`) && !!scoringErrors[level];
                                const isDisabled = isSelLevel ? count === 0 : false;

                                return (
                                  <div key={level} style={{ opacity: isDisabled ? 0.4 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}>
                                    {!isSelLevel ? (
                                    // AFTER — add liveUpdate:
<ONumberInput
  value={isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0)}
  liveUpdate
  onChange={v => {
    if (isQSpec) {
      updateLevelScoringConfig(level, { totalMarks: v });
    } else {
      setFormData(prev => ({
        ...prev,
        programmingConfig: {
          ...prev.programmingConfig,
          scoreSettings: {
            ...prev.programmingConfig.scoreSettings,
            levelScoringConfiguration: {
              ...prev.programmingConfig.scoreSettings.levelScoringConfiguration,
              [level]: {
                ...prev.programmingConfig.scoreSettings.levelScoringConfiguration[level],
                marksPerQuestion: v
              }
            }
          }
        }
      }));
    }
  }}
/>
                                    ) : (
                                      <ONumberInput
                                        value={isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0)}
                                        onChange={v => {
                                          if (isQSpec) {
                                            updateLevelScoringConfig(level, { totalMarks: v });
                                          } else {
                                            setFormData(prev => ({
                                              ...prev,
                                              programmingConfig: {
                                                ...prev.programmingConfig,
                                                scoreSettings: {
                                                  ...prev.programmingConfig.scoreSettings,
                                                  levelScoringConfiguration: {
                                                    ...prev.programmingConfig.scoreSettings.levelScoringConfiguration,
                                                    [level]: {
                                                      ...prev.programmingConfig.scoreSettings.levelScoringConfiguration[level],
                                                      marksPerQuestion: v
                                                    }
                                                  }
                                                }
                                              }
                                            }));
                                          }
                                        }}
                                      />
                                    )}
                                    {hasError && <span className="text-[10px]" style={{ color: D.red }}>{scoringErrors[level]}</span>}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Row 4: Total */}
                            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '6px', alignItems: 'center' }}>
                              <div className="text-[10px] font-semibold" style={{ color: D.textMuted }}>Total</div>
                              {(['easy', 'medium', 'hard'] as const).map(level => {
                                const count = scoringCounts[level];
                                if (count === 0) return <div key={level} />;
                                const scoring = ls[level];
                                const isQSpec = scoring?.type === 'question_specific';
                                const total = isQSpec
                                  ? (scoring?.totalMarks || 0)
                                  : (scoring?.marksPerQuestion || 0) * count;
                                return (
                                  <div key={level} className="text-center text-xs font-semibold py-1 rounded"
                                    style={{ background: levelColors[level] + '10', color: levelColors[level] }}>
                                    {total} marks
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </>}
              </div>
            )}
          </div>

          {/* Question Flow */}
          <div className={`flex items-center gap-3 py-2.5 border-b${programmingLevelMismatch ? ' opacity-40 pointer-events-none' : ''}`} style={{ borderColor: D.border }}>
            <div className="w-36 flex-shrink-0 flex items-center gap-1.5">
              <Shuffle size={12} style={{ color: D.textMuted }} />
              <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>Question Flow</span>
            </div>
            <div className="flex-1 flex gap-2">
              {questionFlowOptions.map(opt => {
                const sel = formData.programmingConfig.questionFlow === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, questionFlow: opt.value as any } }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                    style={{ borderColor: sel ? D.orange : D.border, background: sel ? D.orangeLight : D.bg, color: sel ? D.orange : D.textMain, fontFamily: FONT }}>
                    <span style={{ color: sel ? D.orange : D.textMuted }}>{opt.icon}</span>
                    {opt.label}
                    {sel && <Check size={11} style={{ color: D.orange }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compiler File Mode — UI removed; backend always receives 'multiple' as default (see payload). */}

          {/* Attempt Limit */}
          <div className="py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="text-sm font-semibold" style={{ color: D.textMain }}>Attempt Limit</div>
              <button type="button" role="switch" aria-checked={formData.programmingConfig.attemptLimitEnabled}
                onClick={() => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, attemptLimitEnabled: !prev.programmingConfig.attemptLimitEnabled, submissionAttempts: !prev.programmingConfig.attemptLimitEnabled ? (prev.programmingConfig.submissionAttempts > 1 ? prev.programmingConfig.submissionAttempts : 2) : 1 } }))}
                className="relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 focus:outline-none p-[2px]"
                style={{ background: formData.programmingConfig.attemptLimitEnabled ? D.orange : '#e5e7eb' }}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${formData.programmingConfig.attemptLimitEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-[10px] font-bold" style={{ color: formData.programmingConfig.attemptLimitEnabled ? D.emerald : D.red }}>
                {formData.programmingConfig.attemptLimitEnabled ? 'On' : 'Off'}
              </span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: D.textMuted }}>Restrict code submission attempts - default 1 submission</div>
            <div className="flex items-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: D.border }}>
              <div className="w-36 flex-shrink-0 flex items-center gap-1.5">
                <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>Attempts Allowed</span>
                <InfoTooltip content="Maximum number of code submissions allowed per student (1–10)" side="right" />
              </div>
              <div className="w-24">
                <ONumberInput
                  value={formData.programmingConfig.attemptLimitEnabled ? formData.programmingConfig.submissionAttempts : 1}
                  onChange={v => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, submissionAttempts: Math.max(1, Math.min(10, v)) } }))}
                  min={1} max={10}
                  disabled={!formData.programmingConfig.attemptLimitEnabled} />
              </div>
            </div>
          </div>

          {validationErrors.programmingTotalMarks && touchedFields.has('programmingTotalMarks') && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff2f2', border: `1px solid ${D.red}25` }}>
              <AlertCircle size={13} style={{ color: D.red }} /><p className="text-xs" style={{ color: D.red }}>{validationErrors.programmingTotalMarks}</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [
    formData,
    validationErrors,
    touchedFields,
    markTouched,
    programmingAllocatedMarks,
    programmingLevelMismatch,
    getProgrammingTotalQuestions,
    questionFlowOptions,
    updateLevelScoringConfig,
    configOptions,
  ]);
  // ==========================================================================
  // RENDER: Schedule (FIXED: uses extracted DateRowPicker component)
  // ==========================================================================
  // ==========================================================================
  // RENDER: Schedule (SIMPLIFIED - Single Date & Time Input)
  // ==========================================================================
  // ==========================================================================
  // RENDER: Schedule (HORIZONTAL LAYOUT - Perfect Alignment)
  // ==========================================================================
  // ==========================================================================
  // RENDER: Schedule (HORIZONTAL LAYOUT - Label Left, Input Right)
  // ==========================================================================
  const renderScheduleConfiguration = useCallback(() => {
    // ==========================================================================
    // Helper Functions
    // ==========================================================================

    // fieldKey from DATE_ROWS maps directly to schedule keys
    // endDate     → schedule.endDate
    // startDate   → schedule.startDate
    // cutOffDate  → schedule.cutOffDate
    // remindGradeBy → schedule.remindGradeBy
    // gracePeriodDate → schedule.gracePeriodDate
    const updateScheduleField = (field: string, value: Date | null) => {
      const dateObj = value
        ? {
          day: value.getDate(),
          month: value.getMonth() + 1,
          year: value.getFullYear(),
          hour: value.getHours(),
          minute: value.getMinutes(),
        }
        : { day: 0, month: 0, year: 0, hour: 0, minute: 0 };

      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          [field]: dateObj,  // field is already the correct schedule key
        },
      }));
    };

    const getFieldValue = (fieldKey: string): Date | null => {
      const data = (formData.schedule as any)[fieldKey];
      if (!data || data.day === 0 || data.month === 0 || data.year === 0) return null;
      return new Date(data.year, data.month - 1, data.day, data.hour || 0, data.minute || 0);
    };

    const clearFieldValidation = (field: string) => {
      setValidationErrors(prev => {
        const errors = { ...prev };
        if (field === 'startDate') delete errors.startDate;
        if (field === 'endDate') delete errors.endDate;
        if (field === 'cutOffDate') delete errors.cutOffDate;
        if (field === 'gracePeriodDate') delete errors.gracePeriod;
        return errors;
      });
    };

    const handleUpdate = (field: string, value: Date | null) => {
      updateScheduleField(field, value);
      clearFieldValidation(field);
    };

    const getFieldError = (fieldKey: string): string | undefined => {
      if (fieldKey === 'startDate') return validationErrors.startDate;
      if (fieldKey === 'endDate') return validationErrors.endDate;
      if (fieldKey === 'cutOffDate') return (validationErrors as any).cutOffDate;
      if (fieldKey === 'gracePeriodDate') return validationErrors.gracePeriod;
      return undefined;
    };

    const getFieldTouched = (fieldKey: string): boolean => {
      if (fieldKey === 'startDate') return touchedFields.has('startDate');
      if (fieldKey === 'endDate') return touchedFields.has('endDate');
      if (fieldKey === 'cutOffDate') return touchedFields.has('cutOffDate');
      if (fieldKey === 'gracePeriodDate') return touchedFields.has('gracePeriod');
      return false;
    };

    // ==========================================================================
    // Configuration
    // ==========================================================================

    const DATE_ROWS: Array<{
      label: string;
      fieldKey: string;
      toggleable: boolean;
      enabledKey?: string;
      tooltip?: string;
      icon: React.ReactNode;
      color: string;
      required?: boolean;
    }> = [
        {
          label: 'Start Date & Time',
          fieldKey: 'startDate',
          toggleable: false,
          tooltip: 'The date from which students can start submitting this exercise.',
          icon: <Calendar size={14} />,
          color: D.emerald,
          required: true,
        },
        {
          label: 'End Date & Time',
          fieldKey: 'endDate',
          toggleable: false,
          tooltip: 'The actual submission deadline. Submissions after this date are not accepted.',
          icon: <Clock size={14} />,
          color: D.amber,
          required: true,
        },
        {
          label: 'Cut-off Date & Time',
          fieldKey: 'cutOffDate',
          toggleable: true,
          enabledKey: 'cutOffEnabled',
          tooltip: 'Optional hard late boundary. Must be on or after the end date.',
          icon: <Lock size={14} />,
          color: D.red,
        },
        {
          label: 'Remind Me to Mark By',
          fieldKey: 'remindGradeBy',
          toggleable: true,
          enabledKey: 'remindGradeByEnabled',
          tooltip: 'Set a reminder date for yourself to complete grading.',
          icon: <Bell size={14} />,
          color: D.purple,
        },
      ];

    // ==========================================================================
    // Single Date & Time Picker Component
    // ==========================================================================

    const DateTimePicker: React.FC<{
      value: Date | null;
      onChange: (date: Date | null) => void;
      disabled?: boolean;
      minDate?: Date;
      minTime?: { hour: number; minute: number };
      placeholder?: string;
      error?: string;
      touched?: boolean;
      label?: string;
      accentColor?: string;
    }> = ({ value, onChange, disabled, minDate, minTime, placeholder = "Select date & time", error, touched, label, accentColor = D.orange }) => {
      const [isOpen, setIsOpen] = useState(false);
      const [tempDate, setTempDate] = useState<Date | null>(value);
      const pickerRef = useRef<HTMLDivElement>(null);
      const buttonRef = useRef<HTMLButtonElement>(null);

      const [calMonth, setCalMonth] = useState(value ? value.getMonth() : new Date().getMonth());
      const [calYear, setCalYear] = useState(value ? value.getFullYear() : new Date().getFullYear());

      // Manual text inputs for DD / MM / YYYY / HH / MM
      const [dayText, setDayText] = useState(value ? String(value.getDate()).padStart(2, '0') : '');
      const [monthText, setMonthText] = useState(value ? String(value.getMonth() + 1).padStart(2, '0') : '');
      const [yearText, setYearText] = useState(value ? String(value.getFullYear()) : '');
      const [hourText, setHourText] = useState(value ? String(value.getHours()).padStart(2, '0') : '');
      const [minuteText, setMinuteText] = useState(value ? String(value.getMinutes()).padStart(2, '0') : '');

      // Sync text inputs whenever value changes from outside
      useEffect(() => {
        setDayText(value ? String(value.getDate()).padStart(2, '0') : '');
        setMonthText(value ? String(value.getMonth() + 1).padStart(2, '0') : '');
        setYearText(value ? String(value.getFullYear()) : '');
        setHourText(value ? String(value.getHours()).padStart(2, '0') : '');
        setMinuteText(value ? String(value.getMinutes()).padStart(2, '0') : '');
      }, [value]);

      // Commit manual DD/MM/YYYY input — rejects past dates when minDate is set
      const commitManualInput = () => {
        const d = parseInt(dayText, 10);
        const m = parseInt(monthText, 10);
        const y = parseInt(yearText, 10);
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
          const date = new Date(y, m - 1, d, value?.getHours() ?? 0, value?.getMinutes() ?? 0);
          // Reject if date is before minDate (e.g. start date cannot be in the past)
          if (minDate) {
            const minDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
            const testDay = new Date(y, m - 1, d);
            if (testDay < minDay) {
              // Revert text fields to the current valid value
              setDayText(value ? String(value.getDate()).padStart(2, '0') : '');
              setMonthText(value ? String(value.getMonth() + 1).padStart(2, '0') : '');
              setYearText(value ? String(value.getFullYear()) : '');
              return;
            }
          }
          onChange(date);
        }
      };

      // Commit manual HH:MM input
      const commitTimeInput = () => {
        if (!value) return; // no date selected yet, nothing to update
        const h = parseInt(hourText, 10);
        const min = parseInt(minuteText, 10);
        if (!isNaN(h) && h >= 0 && h <= 23 && !isNaN(min) && min >= 0 && min <= 59) {
          const newDate = new Date(value);
          newDate.setHours(h, min, 0, 0);
          onChange(newDate);
        } else {
          // Revert to current value
          setHourText(value ? String(value.getHours()).padStart(2, '0') : '');
          setMinuteText(value ? String(value.getMinutes()).padStart(2, '0') : '');
        }
      };

      // Sync state whenever picker opens; default to now when no value set
      useEffect(() => {
        if (isOpen) {
          const base = value ?? new Date();
          setTempDate(base);
          setCalMonth(base.getMonth());
          setCalYear(base.getFullYear());
        }
      }, [isOpen]);

      const formatDateTime = (date: Date | null): string => {
        if (!date) return placeholder;
        return date.toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
      };

      // Close on outside click
      useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
          if (
            pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
            buttonRef.current && !buttonRef.current.contains(e.target as Node)
          ) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
      }, [isOpen]);

      const isDayDisabled = (day: number): boolean => {
        if (!minDate) return false;
        const checkDate = new Date(calYear, calMonth, day);
        checkDate.setHours(0, 0, 0, 0);
        const minDateOnly = new Date(minDate);
        minDateOnly.setHours(0, 0, 0, 0);
        return checkDate < minDateOnly;
      };

      const isTimeDisabled = (date: Date, hour: number, minute: number): boolean => {
        if (!minDate || !minTime) return false;
        const compareDate = new Date(date);
        compareDate.setHours(hour, minute, 0, 0);
        const minDateTime = new Date(minDate);
        minDateTime.setHours(minTime.hour, minTime.minute, 0, 0);
        return compareDate < minDateTime;
      };

      const generateCalendarDays = (year: number, month: number): (number | null)[] => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const days: (number | null)[] = [];
        for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);
        return days;
      };

      const handleDateSelect = (day: number) => {
        if (isDayDisabled(day)) return;
        const newDate = new Date(calYear, calMonth, day);
        newDate.setHours(tempDate ? tempDate.getHours() : 0, tempDate ? tempDate.getMinutes() : 0);
        setTempDate(newDate);
      };

      const handleTimeChange = (hour: number, minute: number) => {
        if (!tempDate) return;
        const newDate = new Date(tempDate);
        newDate.setHours(hour, minute);
        setTempDate(newDate);
      };

      const handleConfirm = () => {
        onChange(tempDate);
        setIsOpen(false);
      };

      // Smart popup positioning — always opens above the trigger
      const getPopupStyle = (): React.CSSProperties => {
        if (!buttonRef.current) return { width: 370, top: 0, left: 0 };
        const rect = buttonRef.current.getBoundingClientRect();
        const POPUP_WIDTH = 370;
        const POPUP_HEIGHT = pickerRef.current ? pickerRef.current.offsetHeight || 320 : 320;
        const MARGIN = 8;

        const modalContainer = document.querySelector('.es-main');
        const modalRect = modalContainer?.getBoundingClientRect();
        const boundsRect = modalRect ?? { top: MARGIN, bottom: window.innerHeight - MARGIN, left: MARGIN, right: window.innerWidth - MARGIN };

        // Horizontal — clamp within bounds
        let left = rect.left;
        if (left + POPUP_WIDTH > boundsRect.right - MARGIN) left = boundsRect.right - POPUP_WIDTH - MARGIN;
        if (left < boundsRect.left + MARGIN) left = boundsRect.left + MARGIN;

        // Always open above; push down only if it clips the top bound
        let top = rect.top - POPUP_HEIGHT - MARGIN;
        top = Math.max(boundsRect.top + MARGIN, top);

        const maxHeight = boundsRect.bottom - Math.max(boundsRect.top + MARGIN, top) - MARGIN;
        return { width: POPUP_WIDTH, top, left, maxHeight, overflowY: 'auto' };
      };
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const inputStyle = (hasError: boolean): React.CSSProperties => ({
        textAlign: 'center' as const,
        padding: '5px 4px',
        borderRadius: 6,
        border: `1px solid ${hasError ? D.red : D.border}`,
        background: disabled ? D.surface : '#fff',
        color: disabled ? D.textMuted : D.textMain,
        fontSize: 13,
        fontFamily: FONT,
        outline: 'none',
        opacity: disabled ? 0.7 : 1,
      });

      return (
        <div className="relative">
          {/* DD / MM / YYYY manual inputs + calendar icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="text" inputMode="numeric" maxLength={2} placeholder="DD"
              value={dayText} disabled={disabled}
              onChange={e => setDayText(e.target.value.replace(/\D/g, ''))}
              onBlur={commitManualInput}
              style={{ ...inputStyle(!!error && !!touched), width: 34 }}
            />
            <span style={{ color: D.textMuted, fontWeight: 700, fontSize: 13 }}>/</span>
            <input
              type="text" inputMode="numeric" maxLength={2} placeholder="MM"
              value={monthText} disabled={disabled}
              onChange={e => setMonthText(e.target.value.replace(/\D/g, ''))}
              onBlur={commitManualInput}
              style={{ ...inputStyle(!!error && !!touched), width: 34 }}
            />
            <span style={{ color: D.textMuted, fontWeight: 700, fontSize: 13 }}>/</span>
            <input
              type="text" inputMode="numeric" maxLength={4} placeholder="YYYY"
              value={yearText} disabled={disabled}
              onChange={e => setYearText(e.target.value.replace(/\D/g, ''))}
              onBlur={commitManualInput}
              style={{ ...inputStyle(!!error && !!touched), width: 52 }}
            />
            {/* Time inputs HH : MM */}
            <input
              type="text" inputMode="numeric" maxLength={2} placeholder="HH"
              value={hourText} disabled={disabled || !value}
              onChange={e => setHourText(e.target.value.replace(/\D/g, ''))}
              onBlur={commitTimeInput}
              title="Hour (0–23)"
              style={{ ...inputStyle(false), width: 30, marginLeft: 4, opacity: (!value || disabled) ? 0.45 : 1 }}
            />
            <span style={{ color: D.textMuted, fontWeight: 700, fontSize: 13 }}>:</span>
            <input
              type="text" inputMode="numeric" maxLength={2} placeholder="MM"
              value={minuteText} disabled={disabled || !value}
              onChange={e => setMinuteText(e.target.value.replace(/\D/g, ''))}
              onBlur={commitTimeInput}
              title="Minute (0–59)"
              style={{ ...inputStyle(false), width: 30, opacity: (!value || disabled) ? 0.45 : 1 }}
            />
            {/* Calendar icon button */}
            <button
              ref={buttonRef}
              type="button"
              onClick={() => !disabled && setIsOpen(v => !v)}
              disabled={disabled}
              title="Pick date & time"
              style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${isOpen ? accentColor : D.border}`, background: isOpen ? accentColor + '15' : '#fff', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 2, transition: 'all 0.15s' }}
            >
              <Calendar size={14} style={{ color: isOpen ? accentColor : D.textMuted }} />
            </button>
          </div>

          {error && touched && (
            <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>
          )}

          {isOpen && !disabled && (
            <div
              ref={pickerRef}
              className="fixed z-[9999] p-4 rounded-xl shadow-2xl border bg-white"
              style={getPopupStyle()}
            >
              {/* Field label header — tells user which date they're setting */}
              {label && (
                <div className="flex items-center gap-2 mb-3 pb-2.5 border-b" style={{ borderColor: D.border }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: accentColor + '15', color: accentColor }}>
                    <Calendar size={12} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: D.textMain, fontFamily: FONT }}>
                    Setting: <span style={{ color: accentColor }}>{label}</span>
                  </span>
                </div>
              )}
              {/* Calendar + Time side by side */}
              <div className="flex gap-3 items-start">

                {/* Left: Calendar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <button type="button"
                      onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#f4f5f7]">
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-sm font-bold">{months[calMonth]} {calYear}</span>
                    <button type="button"
                      onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#f4f5f7]">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                      <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: D.textMuted }}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {generateCalendarDays(calYear, calMonth).map((day, idx) => {
                      const isDisabled = day ? isDayDisabled(day) : true;
                      const isSelected = tempDate && day === tempDate.getDate() &&
                        calMonth === tempDate.getMonth() && calYear === tempDate.getFullYear();
                      const isToday = !isSelected && day === new Date().getDate() &&
                        calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
                      return (
                        <button key={idx} type="button"
                          onClick={() => day && !isDisabled && handleDateSelect(day)}
                          disabled={!day || isDisabled}
                          className="h-7 w-7 text-xs rounded-md flex items-center justify-center transition-all mx-auto"
                          style={{
                            background: isSelected ? accentColor : 'transparent',
                            color: isSelected ? '#fff' : isDisabled ? '#d1d5db' : '#0F172A',
                            fontWeight: isToday ? 700 : 400,
                            outline: isToday && !isSelected ? `1.5px solid ${accentColor}` : 'none',
                            cursor: !day || isDisabled ? 'default' : 'pointer',
                          }}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Time spinners */}
                <div className="flex-shrink-0 flex flex-col items-center pt-1" style={{ width: 88 }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: D.textMuted }}>Time</div>
                  {/* HH : MM */}
                  <div className="flex items-center gap-1">
                    {/* Hour */}
                    {(() => {
                      const curH = tempDate?.getHours() ?? 0;
                      const stepH = (dir: number) => {
                        const next = (curH + dir + 24) % 24;
                        if (tempDate) handleTimeChange(next, tempDate.getMinutes());
                        else { const d = new Date(); d.setHours(next, 0, 0, 0); setTempDate(d); }
                      };
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <button type="button" onClick={() => stepH(1)}
                            className="w-7 h-6 flex items-center justify-center rounded hover:bg-[#f4f5f7]">
                            <ChevronUp size={14} style={{ color: accentColor }} />
                          </button>
                          <div className="w-10 h-8 flex items-center justify-center rounded-lg text-sm font-bold"
                            style={{ background: accentColor + '15', color: accentColor }}>
                            {curH.toString().padStart(2, '0')}
                          </div>
                          <button type="button" onClick={() => stepH(-1)}
                            className="w-7 h-6 flex items-center justify-center rounded hover:bg-[#f4f5f7]">
                            <ChevronDown size={14} style={{ color: accentColor }} />
                          </button>
                        </div>
                      );
                    })()}
                    <div className="text-base font-bold mb-0.5 self-center" style={{ color: D.textMuted }}>:</div>
                    {/* Minute — steps in 5-min increments */}
                    {(() => {
                      const curM = tempDate?.getMinutes() ?? 0;
                      const stepM = (dir: number) => {
                        // snap to nearest 5, then step by 5
                        const snapped = Math.round(curM / 5) * 5;
                        const next = ((snapped + dir * 5) % 60 + 60) % 60;
                        if (tempDate) handleTimeChange(tempDate.getHours(), next);
                        else { const d = new Date(); d.setHours(0, next, 0, 0); setTempDate(d); }
                      };
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <button type="button" onClick={() => stepM(1)}
                            className="w-7 h-6 flex items-center justify-center rounded hover:bg-[#f4f5f7]">
                            <ChevronUp size={14} style={{ color: accentColor }} />
                          </button>
                          <div className="w-10 h-8 flex items-center justify-center rounded-lg text-sm font-bold"
                            style={{ background: accentColor + '15', color: accentColor }}>
                            {curM.toString().padStart(2, '0')}
                          </div>
                          <button type="button" onClick={() => stepM(-1)}
                            className="w-7 h-6 flex items-center justify-center rounded hover:bg-[#f4f5f7]">
                            <ChevronDown size={14} style={{ color: accentColor }} />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

              </div>

              {/* Selected summary */}
              {tempDate && (
                <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: accentColor + '0d', border: `1px solid ${accentColor}25` }}>
                  <Check size={12} style={{ color: accentColor, flexShrink: 0 }} />
                  <span className="text-xs font-semibold truncate" style={{ color: accentColor, fontFamily: FONT }}>
                    {tempDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              {/* Actions */}
              <div className="flex justify-between mt-3 pt-2 border-t" style={{ borderColor: D.border }}>
                <button
                  onClick={() => {
                    const now = new Date();
                    if (minDate && now < minDate) return;
                    setTempDate(now);
                  }}
                  className="text-xs font-semibold"
                  style={{ color: D.orange }}
                >
                  Now
                </button>
                <button
                  onClick={() => { setTempDate(value ?? null); setIsOpen(false); }}
                  className="text-xs font-semibold"
                  style={{ color: D.textMuted }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
                  style={{ background: accentColor }}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      );
    };
    // ==========================================================================
    // Render Helpers
    // ==========================================================================

    const getMinDateForField = (fieldKey: string): Date => {
      const now = new Date();
      if (fieldKey === 'endDate') {
        const startDate = getFieldValue('startDate');
        if (startDate && startDate > now) return startDate;
        return now;
      }
      if (fieldKey === 'cutOffDate') {
        // cut-off must be after endDate (submission deadline)
        const endDate = getFieldValue('endDate');
        if (endDate && endDate > now) return endDate;
        const startDate = getFieldValue('startDate');
        if (startDate && startDate > now) return startDate;
        return now;
      }
      if (fieldKey === 'gracePeriodDate') {
        const cutOffDate = getFieldValue('cutOffDate');
        if (cutOffDate && cutOffDate > now) return cutOffDate;
        const endDate = getFieldValue('endDate');
        if (endDate && endDate > now) return endDate;
        const startDate = getFieldValue('startDate');
        if (startDate && startDate > now) return startDate;
        return now;
      }
      return now;
    };

    const getMinTimeForField = (fieldKey: string): { hour: number; minute: number } => {
      const minDate = getMinDateForField(fieldKey);
      return { hour: minDate.getHours(), minute: minDate.getMinutes() };
    };

    const getFieldEnabledState = (toggleable: boolean, enabledKey?: string): boolean => {
      if (!toggleable || !enabledKey) return true;
      return !!(formData.schedule as any)[enabledKey];
    };

    const handleToggleEnable = (enabledKey?: string) => {
      if (!enabledKey) return;
      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          [enabledKey]: !(prev.schedule as any)[enabledKey]
        }
      }));
    };

    // ==========================================================================
    // Main Render - Horizontal Layout (Label Left, Input Right)
    // ==========================================================================

    return (
      <div className="px-4 py-3">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}>
            <Calendar size={13} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: '#000000', fontFamily: FONT }}>
            Schedule Exercise
          </h3>
        </div>

        {/* Date rows - Horizontal layout */}
        <div className="space-y-2">
          {DATE_ROWS.map(({ label, fieldKey, toggleable, enabledKey, tooltip, icon, color, required }) => {
            const isEnabled = getFieldEnabledState(toggleable, enabledKey);
            const value = getFieldValue(fieldKey);
            const minDate = getMinDateForField(fieldKey);
            const minTime = getMinTimeForField(fieldKey);
            const error = getFieldError(fieldKey);
            const touched = getFieldTouched(fieldKey);

            return (
              <div
                key={fieldKey}
                className="flex items-center gap-3 py-2 border-b last:border-b-0"
                style={{ borderColor: D.border }}
              >
                {/* Left side - Label area (fixed width) */}
                {/* Left side - Label area (fixed width) */}
                <div className="w-48 flex-shrink-0 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}12`, color }}>
                    {icon}
                  </div>
                  <div className="flex items-center gap-0.5 min-w-0">
                    <span className="text-xs font-semibold" style={{ color: '#000000' }}>
                      {label}
                    </span>
                    {required && <span className="text-xs font-bold flex-shrink-0" style={{ color: D.orange }}>*</span>}
                    {tooltip && <InfoTooltip content={tooltip} side="right" />}
                  </div>
                </div>

                {/* Right side - Input area (flexible width) */}
                {/* Right side - Input area (flexible width) */}
                <div className="flex-1 flex items-center gap-3">
                  {toggleable ? (
                    <button
                      type="button"
                      onClick={() => handleToggleEnable(enabledKey)}
                      className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                      style={{ background: isEnabled ? D.orange : '#e5e7eb' }}
                    >
                      <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${isEnabled ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                    </button>
                  ) : (
                    <div className="w-9 flex-shrink-0" />
                  )}

                  <div className="flex-1">
                    {isEnabled ? (
                      <>
                        <DateTimePicker
                          value={value}
                          onChange={(date) => handleUpdate(fieldKey, date)}
                          disabled={!isEnabled}
                          minDate={minDate}
                          minTime={minTime}
                          placeholder={`Select ${label.toLowerCase()}`}
                          error={error}
                          touched={touched}
                          label={label}
                          accentColor={color}
                        />
                        {/* Cut-off: show days after end date */}
                        {fieldKey === 'cutOffDate' && (() => {
                          const endDateVal = getFieldValue('endDate');
                          const cutOffVal = getFieldValue('cutOffDate');
                          if (!endDateVal || !cutOffVal) return null;
                          const diffMs = cutOffVal.getTime() - endDateVal.getTime();
                          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                          if (diffDays < 0) return null;
                          return (
                            <p style={{ fontSize: 11, color: D.textMuted, marginTop: 3, fontFamily: FONT }}>
                              {diffDays === 0 ? '📅 Same day as end date' : `📅 ${diffDays} day${diffDays !== 1 ? 's' : ''} after end date`}
                            </p>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-[#f8fafc]" style={{ borderColor: D.border }}>
                        <Lock size={12} style={{ color: D.textMuted }} />
                        <span className="text-xs" style={{ color: D.textMuted }}>Disabled</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [formData.schedule, validationErrors, touchedFields, isEditing]);
  // ==========================================================================
  // RENDER: Notification Settings
  // ==========================================================================
const renderNotifications = useCallback(() => {
  // Channel options definition
  const channelOptions = [
    { key: 'dashboard', label: 'Dashboard', icon: <Home size={12} />, color: D.blue },
    { key: 'gmail', label: 'Gmail', icon: <Mail size={12} />, color: D.blue },
    { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={12} />, color: D.blue },
  ];

  // Student-only row for Non-Graded exercises
  const studentOnlyRow = {
    key: 'notifyStudent',
    label: 'Notify Student',
    description: formData.notifications.notifyStudent
      ? 'Students will be notified when the exercise is available.'
      : 'Students will not be notified about this exercise.',
    icon: <Bell size={14} />,
    color: D.orange,
    value: formData.notifications.notifyStudent,
    onChange: (v: boolean) => setFormData(prev => ({ ...prev, notifications: { ...prev.notifications, notifyStudent: v } })),
    channels: {
      dashboard: formData.notifications.notifyStudentChannels?.dashboard ?? false,
      gmail: formData.notifications.notifyStudentChannels?.gmail ?? false,
      whatsapp: formData.notifications.notifyStudentChannels?.whatsapp ?? false,
    },
    onChannelChange: (channelKey: string, value: boolean) => {
      setFormData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          notifyStudentChannels: {
            ...prev.notifications.notifyStudentChannels,
            [channelKey]: value,
          },
        },
      }));
    },
  };

  // Grader rows - only for Graded exercises
  const graderRows = [
    {
      key: 'notifyGradersSubmissions',
      label: 'Notify Graders about Submissions',
      description: formData.notifications.notifyGradersSubmissions
        ? 'Graders will receive alerts when students submit.'
        : 'Graders will not receive alerts when students submit.',
      icon: <UserCheck size={14} />,
      color: D.blue,
      value: formData.notifications.notifyGradersSubmissions,
      onChange: (v: boolean) => setFormData(prev => ({ ...prev, notifications: { ...prev.notifications, notifyGradersSubmissions: v } })),
      channels: {
        dashboard: formData.notifications.notifyGradersSubmissionsChannels?.dashboard ?? false,
        gmail: formData.notifications.notifyGradersSubmissionsChannels?.gmail ?? false,
        whatsapp: formData.notifications.notifyGradersSubmissionsChannels?.whatsapp ?? false,
      },
      onChannelChange: (channelKey: string, value: boolean) => {
        setFormData(prev => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            notifyGradersSubmissionsChannels: {
              ...prev.notifications.notifyGradersSubmissionsChannels,
              [channelKey]: value,
            },
          },
        }));
      },
    },
    {
      key: 'notifyGradersLateSubmissions',
      label: 'Notify Graders about Late Submissions',
      description: formData.notifications.notifyGradersLateSubmissions
        ? 'Graders will receive alerts for late submissions.'
        : 'No alerts for late submissions.',
      icon: <Clock size={14} />,
      color: D.amber,
      value: formData.notifications.notifyGradersLateSubmissions,
      onChange: (v: boolean) => setFormData(prev => ({ ...prev, notifications: { ...prev.notifications, notifyGradersLateSubmissions: v } })),
      channels: {
        dashboard: formData.notifications.notifyGradersLateSubmissionsChannels?.dashboard ?? false,
        gmail: formData.notifications.notifyGradersLateSubmissionsChannels?.gmail ?? false,
        whatsapp: formData.notifications.notifyGradersLateSubmissionsChannels?.whatsapp ?? false,
      },
      onChannelChange: (channelKey: string, value: boolean) => {
        setFormData(prev => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            notifyGradersLateSubmissionsChannels: {
              ...prev.notifications.notifyGradersLateSubmissionsChannels,
              [channelKey]: value,
            },
          },
        }));
      },
    },
  ];

  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: D.orangeLight, color: D.orange }}>
          <Bell size={13} />
        </div>
        <h3 className="text-sm font-bold"
          style={{ color: D.textMain, fontFamily: FONT }}>
          Notifications
        </h3>
      </div>

      {/* For Graded exercises: show all rows */}
      {formData.isGraded !== false && (
        <>
          <p className="text-xs mb-3" style={{ color: D.textMuted }}>
            Configure who gets notified about submissions and grading.
          </p>
          <div className="space-y-2 mb-4">
            {graderRows.map(row => (
              <div key={row.key}>
                {/* Main toggle row */}
                <div className="flex items-start justify-between p-3 rounded-xl border"
                  style={{ borderColor: D.border, background: D.bg }}>
                  <div className="flex items-start gap-2.5 flex-1 mr-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: row.color + '12', color: row.color }}>
                      {row.icon}
                    </div>
                    <div>
                      <div className="text-xs font-semibold leading-tight"
                        style={{ color: D.textMain, fontFamily: FONT }}>
                        {row.label}
                      </div>
                      <div className="text-[10.5px] mt-0.5 leading-relaxed"
                        style={{ color: D.textMuted }}>
                        {row.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] font-bold"
                      style={{ color: row.value ? D.emerald : D.red }}>
                      {row.value ? 'Yes' : 'No'}
                    </span>
                    <button type="button" onClick={() => row.onChange(!row.value)}
                      className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                      style={{ background: row.value ? D.emerald : '#e5e7eb' }}>
                      <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${row.value ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Channel checkboxes — single row below when toggled ON */}
                {row.value && (
                  <div className="mt-1 ml-4 p-3 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-150"
                    style={{ borderColor: D.border, background: D.surface }}>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-[10px] font-medium" style={{ color: D.textMuted }}>
                        Notify via:
                      </span>
                      {channelOptions.map(ch => (
                        <label
                          key={ch.key}
                          className="flex items-center gap-2 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={row.channels[ch.key as keyof typeof row.channels]}
                            onChange={(e) => row.onChannelChange(ch.key, e.target.checked)}
                            className="w-3.5 h-3.5 rounded cursor-pointer"
                            style={{ accentColor: D.blue }}
                          />
                          <span className="flex items-center gap-1.5">
                            <span style={{ color: D.blue }}>
                              {ch.icon}
                            </span>
                            <span className="text-[10.5px] font-medium" style={{ color: D.textMain }}>
                              {ch.label}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Student notification row (for Graded) */}
            <div key={studentOnlyRow.key}>
              <div className="flex items-start justify-between p-3 rounded-xl border"
                style={{ borderColor: D.border, background: D.bg }}>
                <div className="flex items-start gap-2.5 flex-1 mr-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: studentOnlyRow.color + '12', color: studentOnlyRow.color }}>
                    {studentOnlyRow.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight"
                      style={{ color: D.textMain, fontFamily: FONT }}>
                      {studentOnlyRow.label}
                    </div>
                    <div className="text-[10.5px] mt-0.5 leading-relaxed"
                      style={{ color: D.textMuted }}>
                      {studentOnlyRow.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-bold"
                    style={{ color: studentOnlyRow.value ? D.emerald : D.red }}>
                    {studentOnlyRow.value ? 'Yes' : 'No'}
                  </span>
                  <button type="button" onClick={() => studentOnlyRow.onChange(!studentOnlyRow.value)}
                    className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                    style={{ background: studentOnlyRow.value ? D.emerald : '#e5e7eb' }}>
                    <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${studentOnlyRow.value ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {studentOnlyRow.value && (
                <div className="mt-1 ml-4 p-3 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{ borderColor: D.border, background: D.surface }}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[10px] font-medium" style={{ color: D.textMuted }}>
                      Notify via:
                    </span>
                    {channelOptions.map(ch => (
                      <label
                        key={ch.key}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={studentOnlyRow.channels[ch.key as keyof typeof studentOnlyRow.channels]}
                          onChange={(e) => studentOnlyRow.onChannelChange(ch.key, e.target.checked)}
                          className="w-3.5 h-3.5 rounded cursor-pointer"
                          style={{ accentColor: D.blue }}
                        />
                        <span className="flex items-center gap-1.5">
                          <span style={{ color: D.blue }}>
                            {ch.icon}
                          </span>
                          <span className="text-[10.5px] font-medium" style={{ color: D.textMain }}>
                            {ch.label}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* For Non-Graded exercises: show ONLY the Student row */}
      {formData.isGraded === false && (
        <>
          <p className="text-xs mb-3" style={{ color: D.textMuted }}>
            Students will be notified when the exercise becomes available.
          </p>
          <div className="space-y-2">
            <div key={studentOnlyRow.key}>
              <div className="flex items-start justify-between p-3 rounded-xl border"
                style={{ borderColor: D.border, background: D.bg }}>
                <div className="flex items-start gap-2.5 flex-1 mr-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: studentOnlyRow.color + '12', color: studentOnlyRow.color }}>
                    {studentOnlyRow.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight"
                      style={{ color: D.textMain, fontFamily: FONT }}>
                      {studentOnlyRow.label}
                    </div>
                    <div className="text-[10.5px] mt-0.5 leading-relaxed"
                      style={{ color: D.textMuted }}>
                      {studentOnlyRow.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-bold"
                    style={{ color: studentOnlyRow.value ? D.emerald : D.red }}>
                    {studentOnlyRow.value ? 'Yes' : 'No'}
                  </span>
                  <button type="button" onClick={() => studentOnlyRow.onChange(!studentOnlyRow.value)}
                    className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                    style={{ background: studentOnlyRow.value ? D.emerald : '#e5e7eb' }}>
                    <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${studentOnlyRow.value ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {studentOnlyRow.value && (
                <div className="mt-1 ml-4 p-3 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{ borderColor: D.border, background: D.surface }}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[10px] font-medium" style={{ color: D.textMuted }}>
                      Notify via:
                    </span>
                    {channelOptions.map(ch => (
                      <label
                        key={ch.key}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={studentOnlyRow.channels[ch.key as keyof typeof studentOnlyRow.channels]}
                          onChange={(e) => studentOnlyRow.onChannelChange(ch.key, e.target.checked)}
                          className="w-3.5 h-3.5 rounded cursor-pointer"
                          style={{ accentColor: D.blue }}
                        />
                        <span className="flex items-center gap-1.5">
                          <span style={{ color: D.blue }}>
                            {ch.icon}
                          </span>
                          <span className="text-[10.5px] font-medium" style={{ color: D.textMain }}>
                            {ch.label}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}, [formData.notifications, formData.isGraded]);
  // ==========================================================================
  // RENDER: Grade Settings
  // ==========================================================================

  const renderGradeSettings = useCallback(() => {
    const et = formData.exerciseType;
    const sep = formData.grades.separateMarks;
    const g = formData.grades;
    const ve = validationErrors;
    const tf = touchedFields;
    const diffEnabled = g.difficultyPassEnabled;

    const levelColors = { easy: D.emerald, medium: D.amber, hard: D.red };
    const levelLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

    // For Combined exercises, we also surface an MCQ section table because
    // MCQ has its own total (formData.totalMarksMCQ) which is stored separately
    // in g.mcqGradeToPass — independent of the Programming difficulty pass marks.
    const isCombinedDiff = et === 'Combined';
    const showDifficultyPass = (et === 'Programming' || et === 'Other' || et === 'Combined') && !!levelTotalsFromConfig;

    // ── Reusable level-based table for Programming/Other ────────────────────
    const renderLevelTable = (titleLabel: string | null) => {
      if (!levelTotalsFromConfig) return null;
      const activeLevels = (['easy', 'medium', 'hard'] as const).filter(
        l => (levelTotalsFromConfig[l] ?? 0) > 0
      );
      if (activeLevels.length === 0) return null;
      return (
        <div className="rounded-xl overflow-hidden mt-2" style={{ border: `1px solid ${D.purple}25` }}>
          {titleLabel && (
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: D.orangeLight, color: D.orange, borderBottom: `1px solid ${D.purple}20` }}>
              {titleLabel}
            </div>
          )}
          <div
            className="grid px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: D.purple + '08',
              borderBottom: `1px solid ${D.purple}20`,
              gridTemplateColumns: '80px 1fr 1fr',
              color: D.textMuted,
            }}
          >
            <span>Level</span>
            <span className="text-center">Total Marks</span>
            <span className="text-center">Mark to Pass <span style={{ color: D.orange }}>*</span></span>
          </div>

          {activeLevels.map((level, idx) => {
            const levelTotal = levelTotalsFromConfig[level];
            const passMarkKey = `${level}PassMark` as 'easyPassMark' | 'mediumPassMark' | 'hardPassMark';
            const passMarkValue = g[passMarkKey];
            const errorKey = `${level}PassMark`;
            const hasError = tf.has(errorKey) && !!(ve as any)[errorKey];

            return (
              <div
                key={level}
                className="grid items-center px-3 py-2"
                style={{
                  gridTemplateColumns: '80px 1fr 1fr',
                  gap: '8px',
                  borderTop: idx > 0 ? `1px solid ${D.border}` : 'none',
                  background: D.bg,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: levelColors[level] }} />
                  <span className="text-xs font-bold capitalize" style={{ color: levelColors[level], fontFamily: FONT }}>
                    {levelLabels[level]}
                  </span>
                </div>
                <div className="relative flex justify-center">
                  <div
                    className="px-3 py-1.5 rounded-lg border text-sm font-bold text-center w-full"
                    style={{ borderColor: D.border, background: levelColors[level] + '0d', color: levelColors[level], fontFamily: FONT }}
                  >
                    {levelTotal}
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: levelColors[level] + 'aa' }}>
                      Auto
                    </span>
                  </div>
                </div>
                <div>
                  <ONumberInput
                    value={passMarkValue ?? 0}
                    onChange={v => {
                      setFormData(prev => ({ ...prev, grades: { ...prev.grades, [passMarkKey]: v } }));
                      if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete (e as any)[errorKey]; return e; });
                    }}
                    onBlur={() => markTouched(errorKey)}
                    placeholder="0"
                    max={levelTotal}
                    error={(ve as any)[errorKey]}
                    touched={hasError}
                  />
                  {levelTotal > 0 && (passMarkValue ?? 0) > levelTotal && (
                    <p className="mt-0.5 text-[10px]" style={{ color: D.red }}>Cannot exceed {levelTotal}</p>
                  )}
                </div>
              </div>
            );
          })}

          <div
            className="px-3 py-2 text-[10.5px] font-medium"
            style={{ background: D.purple + '06', borderTop: `1px solid ${D.purple}15`, color: D.textMuted }}
          >
            Students must score at or above the level pass mark to pass that difficulty tier.
          </div>
        </div>
      );
    };

    // ── MCQ section table for Combined (no internal levels — one row only) ───
    const renderMcqTable = () => {
      // MCQ section has no per-level total in the config (MCQ uses a single
      // `totalMarksMCQ`). To keep the table visually symmetric with the
      // Programming level table, we split the MCQ total evenly across Easy /
      // Medium / Hard for the displayed Total column (any leftover goes to Easy).
      const mcqTotal = formData.totalMarksMCQ || 0;
      const splitTotals = (() => {
        if (mcqTotal <= 0) return { easy: 0, medium: 0, hard: 0 };
        const base = Math.floor(mcqTotal / 3);
        const remainder = mcqTotal - base * 3;
        return { easy: base + remainder, medium: base, hard: base };
      })();

      // Each row → its own field in formData.grades (separate from the
      // Programming pass-mark fields). This is what makes the two tables
      // "store data separately" in the same Combined exercise.
      const rows = [
        { level: 'easy' as const,   label: 'Easy',   color: D.emerald, total: splitTotals.easy,   stateKey: 'mcqEasyPassMark'   as const },
        { level: 'medium' as const, label: 'Medium', color: D.amber,   total: splitTotals.medium, stateKey: 'mcqMediumPassMark' as const },
        { level: 'hard' as const,   label: 'Hard',   color: D.red,     total: splitTotals.hard,   stateKey: 'mcqHardPassMark'   as const },
      ];

      return (
        <div className="rounded-xl overflow-hidden mt-2" style={{ border: `1px solid ${D.blue}25` }}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: D.blue + '12', color: D.blue, borderBottom: `1px solid ${D.blue}20` }}>
            MCQ Section
          </div>
          <div
            className="grid px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: D.blue + '08',
              borderBottom: `1px solid ${D.blue}20`,
              gridTemplateColumns: '80px 1fr 1fr',
              color: D.textMuted,
            }}
          >
            <span>Level</span>
            <span className="text-center">Total Marks</span>
            <span className="text-center">Mark to Pass <span style={{ color: D.orange }}>*</span></span>
          </div>

          {rows.map((row, idx) => {
            const value = g[row.stateKey];
            return (
              <div
                key={row.level}
                className="grid items-center px-3 py-2"
                style={{
                  gridTemplateColumns: '80px 1fr 1fr',
                  gap: '8px',
                  background: D.bg,
                  borderTop: idx === 0 ? 'none' : `1px solid ${D.blue}10`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                  <span className="text-xs font-bold" style={{ color: row.color, fontFamily: FONT }}>
                    {row.label}
                  </span>
                </div>
                <div className="relative flex justify-center">
                  <div
                    className="px-3 py-1.5 rounded-lg border text-sm font-bold text-center w-full"
                    style={{ borderColor: D.border, background: D.blue + '0d', color: D.blue, fontFamily: FONT }}
                  >
                    {row.total}
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: D.blue + 'aa' }}>
                      Auto
                    </span>
                  </div>
                </div>
                <div>
                  <ONumberInput
                    value={value ?? 0}
                    onChange={v =>
                      setFormData(prev => ({
                        ...prev,
                        grades: { ...prev.grades, [row.stateKey]: v },
                      }))
                    }
                    placeholder="0"
                    max={row.total || undefined}
                  />
                  {row.total > 0 && (value ?? 0) > row.total && (
                    <p className="mt-0.5 text-[10px]" style={{ color: D.red }}>Cannot exceed {row.total}</p>
                  )}
                </div>
              </div>
            );
          })}

          <div
            className="px-3 py-2 text-[10.5px] font-medium"
            style={{ background: D.blue + '06', borderTop: `1px solid ${D.blue}15`, color: D.textMuted }}
          >
            Students must score at or above each difficulty's pass mark to pass the MCQ section.
          </div>
        </div>
      );
    };

    const DifficultyPassSection = () => {
      if (!showDifficultyPass || !levelTotalsFromConfig) return null;
      const activeLevels = (['easy', 'medium', 'hard'] as const).filter(
        l => (levelTotalsFromConfig[l] ?? 0) > 0
      );
      if (activeLevels.length === 0) return null;

      return (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: D.border }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: D.purple + '15', color: D.purple }}>
                <Hash size={11} />
              </div>
              <div>
                <span className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: FONT }}>
                  Mark to Pass by Difficulty
                </span>
                <InfoTooltip
                  content="Set separate passing marks for each difficulty level. When enabled, the overall Mark to Pass field is hidden."
                  side="right"
                />
                <p className="text-[10.5px]" style={{ color: D.textMuted }}>
                  {isCombinedDiff
                    ? 'Configure MCQ and Programming pass marks separately — each section stores its own data.'
                    : 'Configure minimum passing marks per difficulty level'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData(prev => ({
                  ...prev,
                  grades: { ...prev.grades, difficultyPassEnabled: !prev.grades.difficultyPassEnabled },
                }))
              }
              className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
              style={{ background: g.difficultyPassEnabled ? D.purple : '#e5e7eb' }}
            >
              <span
                className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${g.difficultyPassEnabled ? 'translate-x-[17px]' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {g.difficultyPassEnabled && (
            isCombinedDiff ? (
              // Combined → two distinct tables, each storing its data in its
              // own set of fields:
              //   MCQ table   → grades.mcqEasyPassMark / mcqMediumPassMark / mcqHardPassMark
              //   Programming → grades.easyPassMark    / mediumPassMark    / hardPassMark
              <div className="space-y-3">
                {renderMcqTable()}
                {renderLevelTable('Programming Section')}
              </div>
            ) : (
              // Programming / Other → single table
              renderLevelTable(null)
            )
          )}

          {/* Mark to Pass (Optional) — only shown when difficulty pass is enabled */}
          {g.difficultyPassEnabled && <div className="mt-3 pt-3 border-t" style={{ borderColor: D.border }}>
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="overallMarkToPassEnabled"
                checked={g.overallMarkToPassEnabled ?? false}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  grades: { ...prev.grades, overallMarkToPassEnabled: e.target.checked, overallMarkToPass: e.target.checked ? prev.grades.overallMarkToPass : null }
                }))}
                className="mt-0.5 w-3.5 h-3.5 rounded cursor-pointer"
                style={{ accentColor: D.orange }}
              />
              <div className="flex-1">
                <label htmlFor="overallMarkToPassEnabled" className="text-xs font-semibold cursor-pointer" style={{ color: D.textMain, fontFamily: FONT }}>
                  Mark to Pass <span className="font-normal" style={{ color: D.textMuted }}>(Optional)</span>
                </label>
                <p className="text-[10.5px] mt-0.5" style={{ color: D.textMuted }}>
                  When enabled, this single value overrides per-difficulty pass/fail rules.
                </p>
                {(g.overallMarkToPassEnabled) && (
                  <div className="mt-2 w-32 animate-in fade-in slide-in-from-top-1 duration-200">
                    <ONumberInput
                      value={g.overallMarkToPass ?? 0}
                      onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, overallMarkToPass: v || null } }))}
                      placeholder="0"
                      min={0}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>}
        </div>
      );
    };

    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: D.orangeLight, color: D.orange }}>
            <Award size={13} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: FONT }}>
            Grade Settings
          </h3>
        </div>
        <p className="text-xs mb-3" style={{ color: D.textMuted }}>
          Configure grading based on the selected exercise type.
        </p>

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
          <div className="px-3">

            {/* MCQ */}
            {et === 'MCQ' && (<>
              <GradeRow icon={<List size={13} />} color={D.blue} label="Mark"
                info="Auto-calculated from MCQ total marks"
                autoValue={formData.totalMarks || 'Auto'} />
              {/* HIDDEN when difficultyPassEnabled — but MCQ has no level config so always show */}
              <GradeRow icon={<Award size={13} />} color={D.blue} label="Mark to Pass"
                info="Minimum marks to pass — cannot exceed Mark"
                fieldKey="mcqGradeToPass" value={g.mcqGradeToPass}
                onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, mcqGradeToPass: v } }))}
                onBlur={() => markTouched('mcqGradeToPass')}
                error={ve.mcqGradeToPass} errorTouched={tf.has('mcqGradeToPass')} />
            </>)}

            {/* Other */}
            {et === 'Other' && (<>
              <GradeRow icon={<Terminal size={13} />} color={D.orange} label="Mark"
                info="Auto-calculated from total marks"
                autoValue={formData.totalMarks || 'Auto'} />
              {/* Hide Mark to Pass when difficulty pass enabled */}
              {!diffEnabled && (
                <GradeRow icon={<Award size={13} />} color={D.orange} label="Mark to Pass"
                  info="Minimum marks required to pass — cannot exceed Mark"
                  fieldKey="programmingGradeToPass" value={g.programmingGradeToPass}
                  onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))}
                  onBlur={() => markTouched('programmingGradeToPass')}
                  error={ve.programmingGradeToPass} errorTouched={tf.has('programmingGradeToPass')} />
              )}
              {showDifficultyPass && (
                <div className="pb-2"><DifficultyPassSection /></div>
              )}
            </>)}

            {/* Programming */}
            {et === 'Programming' && (<>
              <GradeRow icon={<Terminal size={13} />} color={D.orange} label="Total Marks"
                info="Auto-calculated from Step 1 total marks — read only"
                autoValue={formData.totalMarks || 'Auto'} />
              {/* Hide Mark to Pass when difficulty pass enabled */}
              {!diffEnabled && (
                <GradeRow icon={<Award size={13} />} color={D.orange} label="Mark to Pass"
                  info="Minimum marks required to pass — cannot exceed Mark"
                  fieldKey="programmingGradeToPass" value={g.programmingGradeToPass}
                  onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))}
                  onBlur={() => markTouched('programmingGradeToPass')}
                  error={ve.programmingGradeToPass} errorTouched={tf.has('programmingGradeToPass')} />
              )}
              {showDifficultyPass && (
                <div className="pb-2"><DifficultyPassSection /></div>
              )}
            </>)}

            {/* Combined */}
            {et === 'Combined' && (<>
              <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: D.border }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: D.purple + '12', color: D.purple }}>
                    <Layers size={13} />
                  </div>
                  <div>
                    <span className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: FONT }}>
                      Separate Marks
                    </span>
                    <p className="text-[10.5px]" style={{ color: D.textMuted }}>
                      Mark each section (MCQ &amp; Programming) independently
                    </p>
                  </div>
                </div>
                <button type="button"
                  onClick={() => setFormData(prev => ({ ...prev, grades: { ...prev.grades, separateMarks: !sep } }))}
                  className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                  style={{ background: sep ? D.orange : '#e5e7eb' }}>
                  <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${sep ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                </button>
              </div>

              {!sep ? (<>
                {(() => {
                  const ag = (formData.totalMarksMCQ || 0) + (formData.totalMarksProgramming || 0);
                  return (<>
                    <GradeRow icon={<Layers size={13} />} color={D.emerald} label="Mark"
                      info="Auto-calculated: MCQ total + Programming total"
                      autoValue={ag > 0 ? ag : 'Auto'} />
                    {/* Hide Mark to Pass when difficulty pass enabled */}
                    {!diffEnabled && (
                      <GradeRow icon={<Award size={13} />} color={D.emerald} label="Mark to Pass"
                        info={`Overall passing marks — cannot exceed Mark${ag > 0 ? ` (${ag})` : ''}`}
                        fieldKey="combinedGradeToPass" value={g.combinedGradeToPass}
                        onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, combinedGradeToPass: v } }))}
                        onBlur={() => markTouched('combinedGradeToPass')}
                        error={ve.combinedGradeToPass} errorTouched={tf.has('combinedGradeToPass')} />
                    )}
                  </>);
                })()}
              </>) : (<>
                <div className="pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: D.blue }}>MCQ Section</div>
                <GradeRow icon={<List size={13} />} color={D.blue} label="MCQ Mark"
                  info="Auto-calculated from MCQ Marks in Exercise Details"
                  autoValue={formData.totalMarksMCQ || 'Auto'} />
                {/* Hide MCQ Mark to Pass when difficulty pass enabled */}
                {!diffEnabled && (
                  <GradeRow icon={<Award size={13} />} color={D.blue} label="MCQ Mark to Pass"
                    info="Minimum marks to pass the MCQ section"
                    fieldKey="mcqGradeToPass" value={g.mcqGradeToPass}
                    onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, mcqGradeToPass: v } }))}
                    onBlur={() => markTouched('mcqGradeToPass')}
                    error={ve.mcqGradeToPass} errorTouched={tf.has('mcqGradeToPass')} />
                )}
                <div className="pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: D.orange }}>Programming Section</div>
                <GradeRow icon={<Terminal size={13} />} color={D.orange} label="Programming Mark"
                  info="Auto-calculated from Programming Marks in Exercise Details"
                  autoValue={formData.totalMarksProgramming || 'Auto'} />
                {/* Hide Programming Mark to Pass when difficulty pass enabled */}
                {!diffEnabled && (
                  <GradeRow icon={<Award size={13} />} color={D.orange} label="Programming Mark to Pass"
                    info="Minimum marks to pass the programming section"
                    fieldKey="programmingGradeToPass" value={g.programmingGradeToPass}
                    onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))}
                    onBlur={() => markTouched('programmingGradeToPass')}
                    error={ve.programmingGradeToPass} errorTouched={tf.has('programmingGradeToPass')} />
                )}
                {showDifficultyPass && (
                  <div className="pb-2"><DifficultyPassSection /></div>
                )}
              </>)}

              {/* Difficulty pass for combined non-separate mode */}
              {!sep && showDifficultyPass && (
                <div className="pb-2"><DifficultyPassSection /></div>
              )}
            </>)}

          </div>
        </div>

        {/* Additional Options */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={13} style={{ color: D.purple }} />
            <span className="text-xs font-bold" style={{ color: D.textMain, fontFamily: FONT }}>
              Additional Options
            </span>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
            {[
              {
                key: 'anonymousSubmissions',
                label: 'Anonymous Submissions',
                sub: "Enable for unbiased grading — graders won't see student names",
                icon: <EyeOff size={14} />,
                color: D.purple,
                val: formData.additionalOptions.anonymousSubmissions,
              },
              {
                key: 'hideGraderIdentity',
                label: 'Hide Grader Identity',
                sub: 'Hide evaluator details from students',
                icon: <Shield size={14} />,
                color: D.blue,
                val: formData.additionalOptions.hideGraderIdentity,
              },
            ].map((row, idx) => (
              <div key={row.key}
                className="flex items-center justify-between px-3 py-2.5 transition-all"
                style={{ background: D.bg, borderTop: idx > 0 ? `1px solid ${D.border}` : 'none' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: row.color + '12', color: row.color }}>
                    {row.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: FONT }}>
                      {row.label}
                    </div>
                    <div className="text-[10.5px]" style={{ color: D.textMuted }}>{row.sub}</div>
                  </div>
                </div>
                <button type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    additionalOptions: { ...prev.additionalOptions, [row.key]: !row.val },
                  }))}
                  className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                  style={{ background: row.val ? D.orange : '#e5e7eb' }}>
                  <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${row.val ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [
    formData.exerciseType,
    formData.grades,
    formData.additionalOptions,
    formData.totalMarks,
    formData.totalMarksMCQ,
    formData.totalMarksProgramming,
    validationErrors,
    touchedFields,
    levelTotalsFromConfig,
    markTouched,
  ]);
  // ==========================================================================
  // RENDER: Combined Question Configuration (tabbed MCQ + Programming)
  // ==========================================================================
  const renderCombinedConfiguration = useCallback(() => {
    const mcqTabDone = formData.mcqConfig.generalQuestionCount > 0;
    return (
      <div>
        {/* Tab header */}
        <div className="flex items-center gap-0 px-4 pt-3 pb-0 border-b" style={{ borderColor: D.border }}>
          <button
            type="button"
            onClick={() => setCombinedConfigTab('mcq')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px"
            style={{
              borderBottomColor: combinedConfigTab === 'mcq' ? D.orange : 'transparent',
              color: combinedConfigTab === 'mcq' ? D.orange : D.textMuted,
              background: 'transparent',
            }}
          >
            <List size={11} />
            MCQ Config
            {/* {mcqTabDone && <span className="ml-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: D.emerald, color: '#fff' }}><Check size={7} strokeWidth={3} /></span>} */}
          </button>
          <button
            type="button"
            onClick={() => setCombinedConfigTab('programming')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px"
            style={{
              borderBottomColor: combinedConfigTab === 'programming' ? D.orange : 'transparent',
              color: combinedConfigTab === 'programming' ? D.orange : D.textMuted,
              background: 'transparent',
            }}
          >
            <Terminal size={11} />
            Programming Config
          </button>
        </div>
        {/* Tab content */}
        <div>
          {combinedConfigTab === 'mcq' ? renderMCQConfiguration() : renderProgrammingConfiguration()}
        </div>
      </div>
    );
  }, [combinedConfigTab, formData.mcqConfig.generalQuestionCount, renderMCQConfiguration, renderProgrammingConfiguration]);

  // ==========================================================================
  // RENDER: Current Step
  // ==========================================================================
  const renderCurrentStep = useCallback(() => {
    const step = steps.find(s => s.id === currentStep);
    if (!step) return null;
    switch (step.title) {
      case 'Exercise Details': return renderExerciseDetails();
      case 'Question Configuration': {
        let typeConfig: React.ReactNode = null;
        if (formData.exerciseType === 'MCQ') typeConfig = renderMCQConfiguration();
        else if (formData.exerciseType === 'Programming') typeConfig = renderProgrammingConfiguration();
        else if (formData.exerciseType === 'Combined') typeConfig = renderCombinedConfiguration();
        else if (formData.exerciseType === 'Other') typeConfig = renderOthersConfiguration();
        if (!typeConfig) return null;
        return (
          <>
            {typeConfig}
            <div className="px-4 py-2.5 border-t" style={{ borderColor: D.border }}>
              <div className="flex items-center gap-2.5">
                <div className="">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: FONT }}>All Questions Required</span>
                    <InfoTooltip content="When ON, students must complete every question before they can submit. When OFF, partial submission is allowed." />
                  </div>
                  <span className="text-[11px]" style={{ color: D.textMuted }}>Student must attempt all questions before submitting the test</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" role="switch" aria-checked={formData.allQuestionsRequired}
                    onClick={() => setFormData(prev => ({ ...prev, allQuestionsRequired: !prev.allQuestionsRequired }))}
                    className="relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 focus:outline-none p-[2px]"
                    style={{ background: formData.allQuestionsRequired ? D.orange : '#e5e7eb' }}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${formData.allQuestionsRequired ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[10px] font-bold" style={{ color: formData.allQuestionsRequired ? D.emerald : D.red }}>
                    {formData.allQuestionsRequired ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          </>
        );
      }
      case 'Schedule': return renderScheduleConfiguration();
      case 'Notifications': return renderNotifications();
      case 'Grade Settings': return renderGradeSettings();
      default: return null;
    }
  }, [steps, currentStep, formData.exerciseType, formData.allQuestionsRequired, renderExerciseDetails, renderMCQConfiguration, renderProgrammingConfiguration, renderOthersConfiguration, renderCombinedConfiguration, renderScheduleConfiguration, renderNotifications, renderGradeSettings]);
  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================
  const BreadcrumbArrow = () => <span className="mx-1" style={{ color: D.orange, fontWeight: 700, fontSize: 13 }}>»</span>;
  const isLastStep = currentStep === steps[steps.length - 1]?.id;
  // Finish is only allowed once the LAST step (Notifications for non-graded,
  // Grade Settings for graded) has been explicitly saved via its Save button.
  const lastStepTitle = steps[steps.length - 1]?.title ?? '';
  const isLastStepSaved = !!lastStepTitle && savedSteps.has(lastStepTitle);
  const currentStepTitle = (() => {
    const step = steps.find(s => s.id === currentStep);
    if (step?.title === 'Question Configuration') {
      return formData.exerciseType === 'MCQ'
        ? 'MCQ Configuration'
        : formData.exerciseType === 'Programming'
          ? 'Programming Configuration'
          : formData.exerciseType === 'Other'
            ? 'Others Configuration'
            : 'Question Configuration';
    }
    return step?.title ?? '';
  })();

  const step1Id = steps.find(s => s.title === 'Exercise Details')?.id ?? 1;
  const step1Unlocked = savedSteps.has('Exercise Details');
  const isOnStep1 = currentStep === step1Id;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)', fontFamily: FONT }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .es-main, .es-main * { font-family: 'Inter','DM Sans','Segoe UI', sans-serif !important; }
        /* Thin, subtle scrollbar — matches Coursesidebar .sb-scroll */
        .es-main ::-webkit-scrollbar { width: 4px; height: 4px; }
        .es-main ::-webkit-scrollbar-track { background: transparent; }
        .es-main ::-webkit-scrollbar-thumb { background: #d4d8df; border-radius: 4px; }
        .es-main ::-webkit-scrollbar-thumb:hover { background: #b9becb; }
        @keyframes es-slidein { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: es-slidein 0.18s ease both; }


        .sticky {
  position: sticky;
  top: 0;
  z-index: 20;
}

/* Ensure the warning stays above other content */
.programming-config-warning {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
  margin-bottom: 12px;
}

/* Optional: Add a subtle animation when it appears */
@keyframes warningPulse {
  0% { opacity: 0.9; transform: translateY(-2px); }
  50% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0.9; transform: translateY(-2px); }
}

.warning-pulse {
  animation: warningPulse 2s ease-in-out infinite;
}
      `}</style>

      <div className="es-main bg-white w-full max-w-6xl flex flex-col overflow-hidden"
        style={{ height: '94vh', borderRadius: 16, border: `1px solid ${D.border}`, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>

        {/* ── HEADER ── */}
        <header className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderBottom: `1px solid ${D.border}`, background: D.bg }}>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: isEditing ? D.amber + '20' : D.orange, boxShadow: `0 3px 8px ${D.orangeGlow}` }}>
              {isEditing ? <Settings2 size={13} style={{ color: D.amber }} /> : <Sparkles size={13} className="text-white" />}
            </div>
            <div className="w-px h-5 flex-shrink-0" style={{ background: D.border }} />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-extrabold mb-0.5" style={{ color: D.textMain }}>
                {isEditing ? 'Edit Exercise' : 'Create Exercise'}
              </div>
              <nav className="flex items-center flex-wrap">
                {breadcrumbs.slice(0, 2).map((c, i) => (
                  <React.Fragment key={i}>
                    <span className="text-[11px] font-semibold truncate max-w-[80px]" style={{ color: D.textMuted }}>{c.name}</span>
                    <BreadcrumbArrow />
                  </React.Fragment>
                ))}
                {breadcrumbs.length > 0 && <><span className="text-[11px] font-semibold" style={{ color: D.textSub }}>{breadcrumbs[breadcrumbs.length - 1].name}</span><BreadcrumbArrow /></>}
                <span className="text-[11px] font-semibold" style={{ color: D.textSub }}>{tabType.replace(/_/g, ' ')}</span>
                <BreadcrumbArrow />
                <span className="text-[11px] font-bold" style={{ color: D.orange }}>{subcategory}</span>
              </nav>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* RESTORED: Preview button when editing */}
            {isEditing && (
              <button onClick={() => setShowSummaryModal(true)} className="px-2 py-1 text-xs font-medium rounded transition-colors hover:bg-[#f4f5f7]" style={{ color: D.textSub }}>Preview</button>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 hover:bg-[#f4f5f7]" style={{ color: D.textMuted }}>
              <X size={14} />
            </button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── SIDEBAR ── */}
          {/* ── SIDEBAR ── */}
          <aside className="w-44 flex-shrink-0 flex flex-col py-2.5 px-2 overflow-y-auto" style={{ background: D.surface, borderRight: `1px solid ${D.border}` }}>
            <div className="space-y-0.5">
              {steps.map((step, idx) => {
                const active = step.active;

                // 🔥 Use savedSteps to determine if step has been explicitly saved
                const isStepSaved = savedSteps.has(step.title);

                // Keep stepFullyDone for internal validation (not for UI anymore)
                const stepFullyDone = isStepCompleted(step.id);

                // Determine if this step has unfilled required fields (only after user has touched them)
                const stepHasError = (() => {
                  switch (step.title) {
                    case 'Exercise Details':
                      return !!(validationErrors.exerciseType || validationErrors.selectedModule || validationErrors.selectedLanguages ||
                        validationErrors.exerciseName || validationErrors.totalDuration ||
                        validationErrors.totalMarks || validationErrors.totalMarksMCQ || validationErrors.totalMarksProgramming);
                    case 'Question Configuration':
                      return !!(validationErrors.mcqGeneralQuestionCount || validationErrors.mcqMarksPerQuestion || validationErrors.mcqTotalMarks ||
                        validationErrors.programmingGeneralQuestionCount || validationErrors.programmingMarksPerQuestion ||
                        validationErrors.programmingLevelCounts || validationErrors.programmingLevelCounts_Easy ||
                        validationErrors.programmingLevelCounts_Medium || validationErrors.programmingLevelCounts_Hard ||
                        validationErrors.programmingTotalMarks || validationErrors.programmingLevelScoring);
                    default:
                      return false;
                  }
                })();

                // Show green check ONLY if step has been explicitly saved
                const showDone = !active && isStepSaved;

                // Step 1 gate: non-first steps are locked until Exercise Details is saved
                const isStep1 = step.title === 'Exercise Details';
                const isLocked_step = !isStep1 && !step1Unlocked;

                // Icon: lock if gated, green check if saved, else normal step icon
                const iconNode = isLocked_step
                  ? <Lock size={8} />
                  : showDone
                    ? <Check size={9} strokeWidth={3} />
                    : <span style={{ fontSize: 8 }}>{step.icon}</span>;

                // Dot colour - green only for saved steps
                const dotBg = isLocked_step ? D.surface2 : active ? D.orange : isStepSaved ? D.emerald : D.surface2;
                const dotColor = isLocked_step ? D.textMuted : active || isStepSaved ? '#fff' : D.textMuted;
                const dotShadow = active && !isLocked_step ? `0 2px 6px ${D.orangeGlow}` : 'none';

                // Label colour
                const labelColor = isLocked_step ? D.textMuted : active ? D.orange : isStepSaved ? D.textSub : D.textMuted;

                const sidebarTooltip = isLocked_step
                  ? 'Please complete Exercise Details first'
                  : active ? step.title : `Go to ${step.title}`;

                return (
                  <div key={step.id} className={`relative ${step.indentLevel ? 'ml-3' : ''}`}>
                    {idx > 0 && !step.isChild && (
                      <div className="absolute left-3 -top-0.5 h-1.5 w-px"
                        style={{ background: stepFullyDone ? D.emerald + '40' : D.border }} />
                    )}
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 text-left focus:outline-none"
                      style={{
                        background: active ? D.orangeLight : 'transparent',
                        borderLeft: active ? `2px solid ${D.orange}` : '2px solid transparent',
                        cursor: isLocked_step ? 'not-allowed' : active ? 'default' : 'pointer',
                        opacity: isLocked_step ? 0.55 : 1,
                      }}
                      title={sidebarTooltip}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                        style={{ background: dotBg, color: dotColor, boxShadow: dotShadow }}>
                        {iconNode}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold truncate leading-tight"
                            style={{ color: labelColor, fontFamily: FONT }}>
                            {step.title}
                          </div>
                          {active && !isLocked_step && (
                            <div className="text-[9px] mt-0.5 font-medium" style={{ color: D.orange + 'aa' }}>
                              {step.subtitle}
                            </div>
                          )}
                          {!active && !isLocked_step && stepFullyDone && !isStepSaved && (
                            <div className="text-[9px] mt-0.5 font-medium" style={{ color: D.amber }}>
                              Click Save to complete
                            </div>
                          )}
                          {!active && !isLocked_step && stepHasError && (
                            <div className="text-[9px] mt-0.5 font-medium" style={{ color: D.red }}>
                              Required fields missing
                            </div>
                          )}
                        </div>
                        {stepHasError && !isLocked_step && (
                          <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black"
                            style={{ background: D.red, color: '#fff', lineHeight: 1 }}>
                            !
                          </span>
                        )}
                        {!active && !isLocked_step && !stepHasError && stepFullyDone && !isStepSaved && (
                          <span className="flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: D.amber + '15', color: D.amber }}>
                            Pending
                          </span>
                        )}
                        {!active && !isLocked_step && isStepSaved && (
                          <span className="flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ background: D.emerald + '15', color: D.emerald }}>
                            Saved
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto pt-2 border-t space-y-2" style={{ borderColor: D.border }}>
              {/* Circular progress ring - uses savedSteps for progress */}
              {(() => {
                const total = steps.length;
                // 🔥 Use savedSteps for progress calculation (not completedSteps)
                const done = steps.filter(s => savedSteps.has(s.title)).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const radius = 30;
                const circumference = 2 * Math.PI * radius;
                const strokeDash = circumference - (done / total) * circumference;
                const ringColor = done === total ? D.emerald : D.orange;
                return (
                  <div className="flex flex-col items-center gap-1 py-1">
                    <svg width="74" height="74" viewBox="0 0 74 74">
                      <circle cx="37" cy="37" r={radius} fill="none" stroke={D.surface2} strokeWidth="5" />
                      <circle cx="37" cy="37" r={radius} fill="none" stroke={ringColor} strokeWidth="5"
                        strokeDasharray={circumference} strokeDashoffset={strokeDash}
                        strokeLinecap="round" transform="rotate(-90 37 37)"
                        style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }} />
                      <text x="37" y="33" textAnchor="middle" fontSize="14" fontWeight="800" fill={ringColor} fontFamily="Inter, 'DM Sans', 'Segoe UI', sans-serif">{pct}%</text>
                      <text x="37" y="47" textAnchor="middle" fontSize="9" fontWeight="600" fill={D.textMuted} fontFamily="Inter, 'DM Sans', 'Segoe UI', sans-serif">{done}/{total} saved</text>
                    </svg>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: D.textMuted }}>Progress</span>
                    {done < total && done > 0 && (
                      <span className="text-[8px] text-center" style={{ color: D.amber }}>
                        Click Save on each step
                      </span>
                    )}
                  </div>
                );
              })()}

              {formData.exerciseType && (
                <div className="px-2 py-1.5 rounded-lg" style={{ background: D.orangeLight }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: D.orange + 'aa' }}>Type</div>
                  <div className="text-[11px] font-bold" style={{ color: D.orange }}>{formData.exerciseType}</div>
                </div>
              )}
            </div>
          </aside>
          {/* ── MAIN FORM ── */}
          <main className="flex-1 overflow-y-auto flex flex-col" style={{ background: D.bg }}>
            <div className="flex-1 overflow-y-auto">
              {isLocked && (
                <div className="mx-4 mt-3 mb-0 flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: D.emerald + '12', border: `1px solid ${D.emerald}35` }}>
                  <Lock size={12} style={{ color: D.emerald }} />
                  <span className="text-xs font-semibold" style={{ color: D.emerald }}>
                    This exercise has been submitted and is now read-only.
                  </span>
                </div>
              )}
              <div style={isLocked ? { pointerEvents: 'none', userSelect: 'none', opacity: 0.82 } : {}}>
                {renderCurrentStep()}
              </div>
            </div>
          </main>
        </div>

        {/* ── FOOTER ── */}
        {(() => {
          const busy = isLoading || isSavingStep;

          return (
            <footer className="flex items-center justify-between px-4 py-2 flex-shrink-0"
              style={{ borderTop: `1px solid ${D.border}`, background: D.bg }}>
              {/* Step dots + counter */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {steps.map(s => (
                    <div key={s.id} className="h-1.5 rounded-full transition-all duration-200"
                      style={{ background: isStepCompleted(s.id) ? D.emerald : s.active ? D.orange : D.border, width: s.active ? 14 : 5 }} />
                  ))}
                </div>
                <span className="text-[11px] font-semibold" style={{ color: D.textMuted }}>
                  Step <span style={{ color: D.orange, fontWeight: 700 }}>{steps.findIndex(s => s.id === currentStep) + 1}</span> / {steps.length}
                </span>
                {/* Show saved indicator for current step */}
                {savedSteps.has(steps.find(s => s.id === currentStep)?.title ?? '') && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: D.emerald + '12', color: D.emerald, border: `1px solid ${D.emerald}25` }}>
                    <Check size={8} strokeWidth={3} />Saved
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                {/* Back */}
                {currentStep > 1 && (
                  <button onClick={handleBack} disabled={busy}
                    className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold transition-all border disabled:opacity-50"
                    style={{ borderColor: D.border, color: D.textSub, background: D.bg, minWidth: 90 }}>
                    <ArrowLeft size={12} />Back
                  </button>
                )}

                {/* Save — shown on all non-last steps (unless locked) */}
                {!isLastStep && !isLocked && (
                  <button onClick={handleSave} disabled={busy}
                    className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: isSavingStep ? '#16a34a' : 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 3px 10px rgba(34,197,94,0.35)', minWidth: 90 }}>
                    {isSavingStep ? <><Loader2 size={12} className="animate-spin" />Saving…</> : <><FileText size={12} />Save</>}
                  </button>
                )}

                {/* Next — all non-last steps; disabled on Step 1 until it has been saved */}
                {!isLastStep && (
                  <button onClick={handleNext} disabled={busy || (isOnStep1 && !step1Unlocked)}
                    className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isOnStep1 && !step1Unlocked ? 'Save Exercise Details first to continue' : undefined}
                    style={{ background: `linear-gradient(135deg, ${D.orange}, ${D.orangeDark})`, boxShadow: `0 3px 10px ${D.orangeGlow}`, minWidth: 90 }}>
                    Next <ArrowRight size={12} />
                  </button>
                )}

                {/* Last step (graded): separate Save + Finish buttons */}
                {isLastStep && !isLocked && formData.isGraded !== false && (<>
                  <button onClick={handleSave} disabled={busy}
                    className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: isSavingStep ? '#16a34a' : 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 3px 10px rgba(34,197,94,0.35)', minWidth: 90 }}>
                    {isSavingStep ? <><Loader2 size={12} className="animate-spin" />Saving…</> : <><FileText size={12} />Save</>}
                  </button>
                  <button onClick={handleComplete}
                    disabled={busy || !isLastStepSaved}
                    title={!isLastStepSaved ? 'Save this step first to enable Finish' : undefined}
                    className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${D.orange}, ${D.orangeDark})`, boxShadow: `0 3px 10px ${D.orangeGlow}`, minWidth: 90 }}>
                    {isLoading ? <><Loader2 size={12} className="animate-spin" />Finishing…</> : <><Check size={12} />Finish</>}
                  </button>
                </>)}
                {/* Non-Graded last step: Save + Finish buttons */}
                {isLastStep && !isLocked && formData.isGraded === false && (<>
                  <button onClick={handleSave} disabled={busy}
                    className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: isSavingStep ? '#16a34a' : 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 3px 10px rgba(34,197,94,0.35)', minWidth: 90 }}>
                    {isSavingStep ? <><Loader2 size={12} className="animate-spin" />Saving…</> : <><FileText size={12} />Save</>}
                  </button>
                  <button onClick={handleComplete}
                    disabled={busy || !isLastStepSaved}
                    title={!isLastStepSaved ? 'Save this step first to enable Finish' : undefined}
                    className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${D.emerald}, #059669)`, boxShadow: `0 3px 10px ${D.emerald}40`, minWidth: 90 }}>
                    {isLoading ? <><Loader2 size={12} className="animate-spin" />Saving…</> : <><Check size={12} />Finish</>}
                  </button>
                </>)}
                {/* Locked badge — shown after Save & Finish */}
                {isLocked && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold"
                    style={{ background: D.emerald + '15', color: D.emerald, border: `1px solid ${D.emerald}40` }}>
                    <Check size={12} strokeWidth={3} />Submitted
                  </span>
                )}
              </div>
            </footer>
          );
        })()}
      </div>
    </div>
  );
};

export default ExerciseSettings;