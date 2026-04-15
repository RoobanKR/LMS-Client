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
const D = {
  orange: '#F27757',
  orangeLight: 'rgba(242,119,87,0.08)',
  orangeMed: 'rgba(242,119,87,0.15)',
  orangeGlow: 'rgba(242,119,87,0.25)',
  orangeDark: '#E0623F',
  bg: '#ffffff',
  surface: '#fafafa',
  surface2: '#f4f4f6',
  border: '#ecedf1',
  border2: '#e2e3e8',
  textMain: '#1a1a2e',
  textSub: '#6b6b7e',
  textMuted: '#9b9bae',
  textHint: '#bcbccc',
  emerald: '#10b981',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  amber: '#f59e0b',
  red: '#ef4444',
};

// ─── Font injection (once) ───────────────────────────────────────────────────
const injectFonts = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    injected = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
  };
})();

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface ExercisePayload {
  configurationType: 'manual';
  tabType: "I_Do" | "We_Do" | "You_Do";
  subcategory: string;
  exerciseType: 'MCQ' | 'Programming' | 'Combined';
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
          style={{ left: pos.left, top: pos.top, maxWidth: 'min(280px,calc(100vw - 40px))', width: 'max-content', background: D.textMain, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
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
    'font-[Plus_Jakarta_Sans,sans-serif]',
    error && touched
      ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-1 focus:ring-red-100'
      : 'border-[#ecedf1] bg-white focus:border-[#F27757] focus:ring-1 focus:ring-[rgba(242,119,87,0.12)]',
    disabled ? 'bg-[#fafafa] text-[#9b9bae] cursor-not-allowed' : 'text-[#1a1a2e]',
    readOnly ? 'bg-[#fafafa] cursor-default text-[#9b9bae]' : '',
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
}> = ({ value, onChange, onBlur, min = 0, max = 1000, placeholder, className = '', id, error, touched, disabled, style }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocused = useRef(false);
  const [localValue, setLocalValue] = useState<string>(value === 0 ? '' : value.toString());

  // Only sync from parent when NOT focused
  useEffect(() => {
    if (!isFocused.current) {
      setLocalValue(value === 0 ? '' : value.toString());
    }
  }, [value]);

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
      setLocalValue(raw);
      if (raw === '') {
        onChange(0);
      } else {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
      }
    }
  };

  const handleBlur = () => {
    isFocused.current = false;

    let final: number;
    const parsed = parseFloat(localValue);

    if (localValue === '' || localValue === '.' || isNaN(parsed)) {
      final = 0;
    } else {
      final = Math.min(max, Math.max(min, parsed));
    }

    const display = final === 0
      ? ''
      : final % 1 === 0
        ? final.toString()
        : final.toFixed(2);

    setLocalValue(display);
    onChange(final);  // ← only fires on blur, never during typing
    onBlur?.();
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
        placeholder={placeholder}
        id={id}
        disabled={disabled}
        style={style}
        className={[
          'w-full px-3 py-2 text-sm rounded-lg border transition-all duration-150 outline-none font-[Plus_Jakarta_Sans,sans-serif]',
          error && touched
            ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-1 focus:ring-red-100'
            : 'border-[#ecedf1] bg-white focus:border-[#F27757] focus:ring-1 focus:ring-[rgba(242,119,87,0.12)]',
          disabled ? 'bg-[#fafafa] text-[#9b9bae] cursor-not-allowed' : 'text-[#1a1a2e]',
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
  label?: string; description?: string; className?: string;
}> = ({ enabled, onChange, label, description, className = '' }) => (
  <div className={`flex items-start justify-between ${className}`}>
    {(label || description) && (
      <div className="flex-1 pr-3">
        {label && <div className="text-sm font-semibold" style={{ color: D.textMain }}>{label}</div>}
        {description && <div className="text-xs mt-0.5 leading-relaxed" style={{ color: D.textMuted }}>{description}</div>}
      </div>
    )}
    <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)}
      className="relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 focus:outline-none p-[2px]"
      style={{ background: enabled ? D.orange : '#e2e3e8' }}>
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
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
        className="w-full flex items-center gap-2 px-3 py-2 text-left focus:outline-none transition-colors hover:bg-[#fafafa]">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isExpanded ? accent + '15' : D.surface, color: isExpanded ? accent : D.textMuted }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{title}</div>
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
          fontFamily: 'Plus Jakarta Sans, sans-serif'
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
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
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
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
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
    <label className="text-xs font-semibold" style={{ color: D.textSub, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{children}</label>
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
          fontFamily: 'Plus Jakarta Sans, sans-serif',
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
              className="w-full text-left px-3 py-2 text-sm font-semibold flex items-center justify-between transition-colors hover:bg-[#fafafa]"
              style={{ color: value === opt.value ? D.orange : D.textSub, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
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
        className="w-full flex items-center justify-center h-4 rounded-t border-x border-t transition-colors hover:bg-gray-50 disabled:opacity-40"
        style={{ borderColor: D.border }}>
        <ChevronUp size={9} style={{ color: D.textMuted }} />
      </button>
      <input
        type="text" inputMode="numeric" value={raw} disabled={disabled}
        onChange={e => setRaw(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(raw); }}
        className="w-full text-center border-x text-[11px] font-bold py-0.5 outline-none transition-all disabled:opacity-40"
        style={{ borderColor: D.border, color: D.textMain, background: disabled ? D.surface : '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
      />
      <button type="button" disabled={disabled}
        onClick={() => { const n = (value || min) > min ? (value || min) - 1 : max; onChange(n); }}
        className="w-full flex items-center justify-center h-4 rounded-b border-x border-b transition-colors hover:bg-gray-50 disabled:opacity-40"
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
      style={{ borderColor: D.border, color: value ? D.textMain : D.textMuted, background: disabled ? D.surface : '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', width: 80 }}
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
              style={{ background: isEnabled ? D.orange : '#e2e3e8' }}>
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
                fontFamily: 'Plus Jakarta Sans, sans-serif'
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
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-100" style={{ color: D.textMuted }}>
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs font-bold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {monthsFull[calMonth - 1]} {calYear}
              </span>
              <button onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-100" style={{ color: D.textMuted }}>
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
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
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
// MAIN COMPONENT
// =============================================================================
const ExerciseSettings: React.FC<ExerciseSettingsProps> = ({
  hierarchyData, nodeId, nodeName, nodeType, subcategory, onSave, onClose,
  isEditing = false, tabType = 'We_Do', initialData, exercise_Id, configuredLanguages
}) => {
  injectFonts();
  console.log('[ExerciseSettings] configuredLanguages prop:', configuredLanguages);


  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [savedSteps, setSavedSteps] = useState<Set<number>>(new Set());
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

  const handleToggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); if (id === 'scoring') setLevelScoringOpen({ easy: false, medium: false, hard: false }); }
      else n.add(id);
      return n;
    });
  }, []);

  const [formData, setFormData] = useState({
    exerciseType: '' as 'MCQ' | 'Programming' | 'Combined' | '',
    selectedModule: '', selectedLanguages: [] as string[],
    exerciseId: `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    exerciseName: '', description: '',
    exerciseLevel: 'intermediate' as 'beginner' | 'intermediate' | 'expert',
    totalDuration: 60, totalMarks: 0, totalMarksMCQ: 0, totalMarksProgramming: 0,
    mcqConfig: {
      questionConfigType: 'general' as const, generalQuestionCount: 0,
      scoreSettings: { scoreType: 'equalDistribution' as 'equalDistribution' | 'questionSpecific', equalDistribution: 0, totalMarks: 0 },
      attemptLimitEnabled: false, submissionAttempts: 1,
    },
    programmingConfig: {
      questionConfigType: 'general' as 'general' | 'levelBased' | 'selectionLevel',
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
    },
    schedule: {
      allowSubmissions: true,
      startDate: { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
      endDate: { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
      cutOffEnabled: false,
      cutOffDate: { day: 0, month: 0, year: 0, hour: 23, minute: 59 },
      remindGradeByEnabled: false,
      remindGradeBy: { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
      gracePeriodEnabled: false,
      gracePeriodDate: { day: 0, month: 0, year: 0, hour: 23, minute: 59 },
    },
    notifyUsers: true, notifyGmail: false, notifyWhatsApp: false, gradeSheet: true,
    notifications: {
      notifyGradersSubmissions: false,
      notifyGradersLateSubmissions: false,
      notifyStudent: true,
    },
    grades: {
      mcqGrade: null as number | null,
      mcqGradeToPass: null as number | null,
      programmingGrade: null as number | null,
      programmingGradeToPass: null as number | null,
      combinedGrade: null as number | null,
      combinedGradeToPass: null as number | null,
      separateMarks: false,
    },
    additionalOptions: {
      anonymousSubmissions: false,
      hideGraderIdentity: false,
    },
  });

  // ── Populate formData when editing ─────────────────────────────────────────
  useEffect(() => {
    if (!isEditing || !initialData) return;
    const ex = initialData as any;
    const info = ex.exerciseInformation ?? {};
    const progSettings = ex.programmingSettings ?? {};
    const qc = ex.questionConfiguration ?? {};
    const mcqCfg = qc.mcqQuestionConfiguration ?? {};
    const progCfg = qc.programmingQuestionConfiguration ?? {};
    const avail = ex.availabilityPeriod ?? {};
    const notif = ex.notificatonandGradeSettings ?? ex.notificationSettings ?? {};

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
      },
      schedule: { allowSubmissions: true, startDate: parseDate(avail.startDate, dS), endDate: parseDate(avail.endDate || avail.dueDate, dE), cutOffEnabled: avail.cutOffEnabled ?? avail.cutoffEnabled ?? false, cutOffDate: parseDate(avail.cutOffDate, dE), remindGradeByEnabled: avail.remindGradeByEnabled ?? !!avail.remindGradeBy, remindGradeBy: parseDate(avail.remindGradeBy, dG), gracePeriodEnabled: avail.gracePeriodAllowed ?? false, gracePeriodDate: parseDate(avail.gracePeriodDate, dG) },
      notifyUsers: notif.notifyUsers ?? true, notifyGmail: notif.notifyGmail ?? false, notifyWhatsApp: notif.notifyWhatsApp ?? false, gradeSheet: notif.gradeSheet ?? true,
      notifications: { notifyGradersSubmissions: notif.notifyGradersSubmissions ?? false, notifyGradersLateSubmissions: notif.notifyGradersLateSubmissions ?? false, notifyStudent: notif.notifyStudent ?? true },
      grades: { mcqGrade: ex.gradeSettings?.mcqGrade ?? null, mcqGradeToPass: ex.gradeSettings?.mcqGradeToPass ?? null, programmingGrade: ex.gradeSettings?.programmingGrade ?? null, programmingGradeToPass: ex.gradeSettings?.programmingGradeToPass ?? null, combinedGrade: ex.gradeSettings?.combinedGrade ?? null, combinedGradeToPass: ex.gradeSettings?.combinedGradeToPass ?? null, separateMarks: ex.gradeSettings?.separateMarks ?? false },
      additionalOptions: { anonymousSubmissions: ex.additionalOptions?.anonymousSubmissions ?? false, hideGraderIdentity: ex.additionalOptions?.hideGraderIdentity ?? false },
    }));
    setCurrentStep(1);
    setValidationErrors({});
    setTouchedFields(new Set());
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
    const progCfg = qc.programmingQuestionConfiguration ?? {};
    const avail = ex.availabilityPeriod ?? {};
    const notif = ex.notificatonandGradeSettings ?? ex.notificationSettings ?? {};

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
      notifications: { notifyGradersSubmissions: notif.notifyGradersSubmissions ?? false, notifyGradersLateSubmissions: notif.notifyGradersLateSubmissions ?? false, notifyStudent: notif.notifyStudent ?? true },
      grades: { mcqGrade: ex.gradeSettings?.mcqGrade ?? null, mcqGradeToPass: ex.gradeSettings?.mcqGradeToPass ?? null, programmingGrade: ex.gradeSettings?.programmingGrade ?? null, programmingGradeToPass: ex.gradeSettings?.programmingGradeToPass ?? null, combinedGrade: ex.gradeSettings?.combinedGrade ?? null, combinedGradeToPass: ex.gradeSettings?.combinedGradeToPass ?? null, separateMarks: ex.gradeSettings?.separateMarks ?? false },
      additionalOptions: { anonymousSubmissions: ex.additionalOptions?.anonymousSubmissions ?? false, hideGraderIdentity: ex.additionalOptions?.hideGraderIdentity ?? false },
    }));
    setCurrentStep(1);
    setValidationErrors({});
    setTouchedFields(new Set());
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
        filled = formData.exerciseType === 'Combined'
          ? base && formData.totalMarksMCQ > 0 && formData.totalMarksProgramming > 0
          : base && formData.totalMarks > 0;
        break;
      }
      case 'Question Configuration': {
        const cfg = formData.programmingConfig;
        const mcqOk = formData.mcqConfig.generalQuestionCount > 0;
        const progOk = cfg.questionConfigType === 'general'
          ? cfg.generalQuestionCount > 0
          : cfg.levelBasedCounts.easy > 0 || cfg.levelBasedCounts.medium > 0 || cfg.levelBasedCounts.hard > 0
          || cfg.selectionLevelCounts.easy > 0 || cfg.selectionLevelCounts.medium > 0 || cfg.selectionLevelCounts.hard > 0;
        if (formData.exerciseType === 'MCQ') filled = mcqOk;
        else if (formData.exerciseType === 'Programming') filled = progOk;
        else if (formData.exerciseType === 'Combined') filled = mcqOk && progOk;
        break;
      }
      case 'Schedule': {
        const sched = formData.schedule as any;
        filled = !!(sched.startDate?.year > 0 && sched.endDate?.year > 0);
        break;
      }
      case 'Notifications':
      case 'Notification':
        // IMPORTANT: DO NOT auto-mark as completed on load
        // Only mark as completed when user explicitly navigates through it
        filled = false;
        break;
      case 'Grade Settings':
        if (formData.exerciseType === 'MCQ')
          filled = (formData.grades.mcqGradeToPass ?? 0) > 0;
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
  setSavedSteps(new Set(ids));
  
}, [isEditing, initialData, formData.exerciseType, formData.exerciseName, formData.totalDuration, 
    formData.totalMarks, formData.totalMarksMCQ, formData.totalMarksProgramming, 
    formData.selectedModule, formData.selectedLanguages, formData.mcqConfig.generalQuestionCount,
    formData.programmingConfig, formData.schedule, formData.grades]);
  // Add this helper near the top of ExerciseSettings (or wherever language selection lives):

const flatLanguages = useMemo(() => {
  if (!configuredLanguages) return [];
  return [
    ...(configuredLanguages.coreProgram ?? []),
    ...(configuredLanguages.frontend    ?? []),
    ...(configuredLanguages.database    ?? []),
  ].filter(Boolean);
}, [configuredLanguages]);

const hasPreConfiguredLanguages = flatLanguages.length > 0;

  // Auto-select all configured languages when configuredLanguages is provided
  useEffect(() => {
    if (hasPreConfiguredLanguages && flatLanguages.length > 0) {
      setFormData(prev => ({
        ...prev,
        selectedLanguages: flatLanguages,
        selectedModule: configuredLanguages?.coreProgram?.length
          ? 'Core Programming'
          : configuredLanguages?.frontend?.length
          ? 'Frontend'
          : 'Database',
      }));
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
    // All exercise types get ONE "Question Configuration" step (Combined uses tabs internally)
    if (formData.exerciseType === 'MCQ' || formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      const qid = next; steps.push({ id: qid, title: 'Question Configuration', subtitle: 'Configure Questions', completed: currentStep > qid, active: currentStep === qid, icon: <List size={12} /> }); next = qid + 1;
    }
    const sid = next; steps.push({ id: sid, title: 'Schedule', subtitle: 'Dates & Times', completed: currentStep > sid, active: currentStep === sid, icon: <Calendar size={12} /> }); next = sid + 1;
    const nid = next; steps.push({ id: nid, title: 'Notifications', subtitle: 'Alerts & Notify', completed: currentStep > nid, active: currentStep === nid, icon: <Bell size={12} /> }); next = nid + 1;
    const gid = next; steps.push({ id: gid, title: 'Grade Settings', subtitle: 'Marks & Grading', completed: currentStep > gid, active: currentStep === gid, icon: <Award size={12} /> });
    return steps;
  };

  const steps = useMemo(() => getSteps(), [formData.exerciseType, currentStep]);

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

  // RESTORED: calculateAllocatedMarks
  const calculateAllocatedMarks = useCallback((): number => {
    if (formData.exerciseType === 'MCQ') return mcqAllocatedMarks;
    if (formData.exerciseType === 'Programming') return programmingAllocatedMarks;
    if (formData.exerciseType === 'Combined') return mcqAllocatedMarks + programmingAllocatedMarks;
    return 0;
  }, [formData.exerciseType, mcqAllocatedMarks, programmingAllocatedMarks]);

  const validateTotalMarks = useCallback(() => {
    if (formData.exerciseType === 'Combined') return (mcqAllocatedMarks + programmingAllocatedMarks) === formData.totalMarks;
    if (formData.exerciseType === 'MCQ') { if (formData.mcqConfig.scoreSettings.scoreType === 'equalDistribution') return isApproximatelyEqual(mcqAllocatedMarks, formData.totalMarks); return true; }
    if (formData.exerciseType === 'Programming') return isApproximatelyEqual(programmingAllocatedMarks, formData.totalMarks);
    return false;
  }, [formData.exerciseType, mcqAllocatedMarks, programmingAllocatedMarks, formData.totalMarks, formData.mcqConfig.scoreSettings.scoreType]);

  // ── Grade auto-population: sync grade fields from total marks ─────────────
  useEffect(() => {
    const et = formData.exerciseType;
    if (et === 'MCQ') {
      const mcqGrade = formData.totalMarks || null;
      setFormData(prev => ({ ...prev, grades: { ...prev.grades, mcqGrade } }));
    } else if (et === 'Programming') {
      const programmingGrade = programmingAllocatedMarks || null;
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
    if (formData.totalDuration <= 0) e.totalDuration = 'Duration must be greater than 0';
    if (formData.totalMarks <= 0) e.totalMarks = 'Total marks must be greater than 0';
    if (formData.exerciseType === 'Combined') {
      if (formData.totalMarksMCQ <= 0) e.totalMarksMCQ = 'MCQ total marks must be greater than 0';
      if (formData.totalMarksProgramming <= 0) e.totalMarksProgramming = 'Programming total marks must be greater than 0';
    }
    return e;
  }, [formData.exerciseName, formData.totalDuration, formData.totalMarks, formData.exerciseType, formData.totalMarksMCQ, formData.totalMarksProgramming]);

  const validateMCQConfiguration = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    const isCombined = formData.exerciseType === 'Combined';
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
  }, [formData.mcqConfig, formData.exerciseType, formData.totalMarks, formData.totalMarksMCQ]);

  const validateProgrammingConfiguration = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    const isCombined = formData.exerciseType === 'Combined';
    const tot = isCombined ? formData.totalMarksProgramming : formData.totalMarks;

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
  }, [formData.programmingConfig, formData.totalMarks, formData.totalMarksProgramming, formData.exerciseType]);

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
    const et = formData.exerciseType;
    const g = formData.grades;
    if (et === 'MCQ') {
      const autoGrade = formData.totalMarks;
      if (!g.mcqGradeToPass || g.mcqGradeToPass <= 0) e.mcqGradeToPass = 'Grade to Pass is required';
      else if (autoGrade > 0 && g.mcqGradeToPass > autoGrade)
        e.mcqGradeToPass = `Cannot exceed Grade (${autoGrade})`;
    }
    if (et === 'Programming') {
      if (!g.programmingGrade || g.programmingGrade <= 0) e.programmingGrade = 'Grade is required';
      if (!g.programmingGradeToPass || g.programmingGradeToPass <= 0) e.programmingGradeToPass = 'Grade to Pass is required';
      else if (g.programmingGrade && g.programmingGradeToPass > g.programmingGrade)
        e.programmingGradeToPass = `Cannot exceed Grade (${g.programmingGrade})`;
    }
    if (et === 'Combined') {
      if (g.separateMarks) {
        // MCQ Grade is auto (from totalMarksMCQ); only Grade to Pass is user-entered
        const autoMCQ = formData.totalMarksMCQ || 0;
        if (!g.mcqGradeToPass || g.mcqGradeToPass <= 0) e.mcqGradeToPass = 'MCQ Grade to Pass is required';
        else if (autoMCQ > 0 && g.mcqGradeToPass > autoMCQ)
          e.mcqGradeToPass = `Cannot exceed MCQ Grade (${autoMCQ})`;
        // Programming Grade is auto (from totalMarksProgramming); only Grade to Pass is user-entered
        const autoProg = formData.totalMarksProgramming || 0;
        if (!g.programmingGradeToPass || g.programmingGradeToPass <= 0) e.programmingGradeToPass = 'Programming Grade to Pass is required';
        else if (autoProg > 0 && g.programmingGradeToPass > autoProg)
          e.programmingGradeToPass = `Cannot exceed Programming Grade (${autoProg})`;
      } else {
        const autoGrade = (formData.totalMarksMCQ || 0) + (formData.totalMarksProgramming || 0);
        if (!g.combinedGradeToPass || g.combinedGradeToPass <= 0) e.combinedGradeToPass = 'Grade to Pass is required';
        else if (autoGrade > 0 && g.combinedGradeToPass > autoGrade)
          e.combinedGradeToPass = `Cannot exceed Grade (${autoGrade})`;
      }
    }
    return e;
  }, [formData.grades, formData.exerciseType, formData.totalMarks, formData.totalMarksMCQ, formData.totalMarksProgramming]);

  // ── Step completion tracking ───────────────────────────────────────────────
  const isStepCompleted = useCallback((stepId: number): boolean => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return false;
    switch (step.title) {
      case 'Exercise Details': {
        if (!formData.exerciseType) return false;
        if ((formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') &&
          (!formData.selectedModule || formData.selectedLanguages.length === 0)) return false;
        if (!formData.exerciseName?.trim()) return false;
        if (formData.totalDuration <= 0) return false;
        if (formData.exerciseType === 'Combined') {
          if (formData.totalMarksMCQ <= 0 || formData.totalMarksProgramming <= 0) return false;
        } else if (formData.totalMarks <= 0) return false;
        return completedSteps.has(stepId);
      }
      case 'Question Configuration': {
        if (!completedSteps.has(stepId)) return false;
        if (formData.exerciseType === 'MCQ') return formData.mcqConfig.generalQuestionCount > 0;
        if (formData.exerciseType === 'Programming') {
          const e = validateProgrammingConfiguration();
          return Object.keys(e).length === 0 && !programmingLevelMismatch;
        }
        if (formData.exerciseType === 'Combined') {
          const mcqOk = formData.mcqConfig.generalQuestionCount > 0;
          const e = validateProgrammingConfiguration();
          const progOk = Object.keys(e).length === 0 && !programmingLevelMismatch;
          return mcqOk && progOk;
        }
        return false;
      }
      case 'Schedule': {
        const sd = formData.schedule.startDate;
        if (!(sd.day > 0 && sd.month > 0 && sd.year > 0)) return false;
        // End date (submission deadline) is always required
        const ed = (formData.schedule as any).endDate;
        if (!(ed && ed.day > 0 && ed.month > 0 && ed.year > 0)) return false;
        // Cut-off date only required when its toggle is on
        if ((formData.schedule as any).cutOffEnabled) {
          const cd = (formData.schedule as any).cutOffDate;
          if (!(cd && cd.day > 0 && cd.month > 0 && cd.year > 0)) return false;
        }
        return completedSteps.has(stepId);  // must also be saved
      }
      case 'Notification':
      case 'Notifications':
        return completedSteps.has(stepId);
      case 'Grade Settings':
        return Object.keys(validateGradeSettings()).length === 0 && completedSteps.has(stepId);
      default:
        return false;
    }
  }, [steps, formData, validateMCQConfiguration, validateProgrammingConfiguration, programmingLevelMismatch, validateGradeSettings, completedSteps]);

  const progressPercent = useMemo(() => {
    if (isLocked) return 100;
    if (steps.length === 0) return 0;
    const done = steps.filter(s => completedSteps.has(s.id)).length;
    // Cap at 99 until Save & Finish locks the exercise
    return Math.min(99, Math.round((done / steps.length) * 100));
  }, [steps, completedSteps, isLocked]);

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
        if (!formData.exerciseType) { errors.exerciseType = 'Please select an exercise type'; fields.push('exerciseType'); }
        if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
          if (!formData.selectedModule) { errors.selectedModule = 'Please select a module'; fields.push('selectedModule'); }
          if (formData.selectedLanguages.length === 0) { errors.selectedLanguages = 'Please select at least one language'; fields.push('selectedLanguages'); }
        }
        errors = { ...errors, ...validateExerciseDetails() };
        fields.push('exerciseName', 'totalDuration', 'totalMarks');
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
          if (programmingLevelMismatch) errors.programmingTotalMarks = programmingLevelMismatch;
          fields.push('programmingGeneralQuestionCount', 'programmingMarksPerQuestion',
            'programmingLevelCounts', 'programmingLevelCounts_Easy',
            'programmingLevelCounts_Medium', 'programmingLevelCounts_Hard', 'programmingTotalMarks');
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
  }, [currentStep, steps, formData.exerciseType, formData.selectedModule, formData.selectedLanguages,
    validateExerciseDetails, validateMCQConfiguration, validateProgrammingConfiguration, markAllTouched,
    formData.exerciseType, programmingLevelMismatch]);

  // ── buildFullPayload — shared by step-save and handleComplete ───────────────
  const buildFullPayload = useCallback(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const sd = formData.schedule.startDate;
    const startDT = (sd.day > 0 && sd.month > 0 && sd.year > 0)
      ? `${sd.year}-${pad(sd.month)}-${pad(sd.day)}T${pad(sd.hour || 0)}:${pad(sd.minute || 0)}`
      : null;
    // endDate = submission deadline
    const ed = (formData.schedule as any).endDate;
    const endDT = (ed && ed.day > 0 && ed.month > 0 && ed.year > 0)
      ? `${ed.year}-${pad(ed.month)}-${pad(ed.day)}T${pad(ed.hour || 0)}:${pad(ed.minute || 0)}`
      : null;
    // cutOffDate = optional late boundary
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
      },
      exerciseInformation: {
        exerciseId: formData.exerciseId || `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        exerciseName: formData.exerciseName,
        description: formData.description || '',
        exerciseLevel: formData.exerciseLevel || 'beginner',
        totalDuration: formData.totalDuration || 60,
        totalMarks: formData.exerciseType === 'Combined'
          ? (formData.totalMarksMCQ + formData.totalMarksProgramming)
          : formData.totalMarks,
      },
      ...(formData.exerciseType === 'Combined' && {
        totalMarksMCQ: formData.totalMarksMCQ,
        totalMarksProgramming: formData.totalMarksProgramming,
      }),
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
        notifyUsers: formData.notifyUsers || false,
        notifyGmail: formData.notifyGmail || false,
        notifyWhatsApp: formData.notifyWhatsApp || false,
        gradeSheet: formData.gradeSheet !== undefined ? formData.gradeSheet : true,
        notifyGradersSubmissions: formData.notifications.notifyGradersSubmissions,
        notifyGradersLateSubmissions: formData.notifications.notifyGradersLateSubmissions,
        notifyStudent: formData.notifications.notifyStudent,
      },
      // FIXED - convert 0 to null so backend doesn't treat as "not set"
      gradeSettings: {
        mcqGrade: formData.grades.mcqGrade || null,
        mcqGradeToPass: formData.grades.mcqGradeToPass
          ? formData.grades.mcqGradeToPass
          : null,
        programmingGrade: formData.grades.programmingGrade || null,
        programmingGradeToPass: formData.grades.programmingGradeToPass
          ? formData.grades.programmingGradeToPass
          : null,
        combinedGrade: formData.grades.combinedGrade || null,
        combinedGradeToPass: formData.grades.combinedGradeToPass
          ? formData.grades.combinedGradeToPass
          : null,
        separateMarks: formData.grades.separateMarks,
      },
      additionalOptions: {
        anonymousSubmissions: formData.additionalOptions.anonymousSubmissions,
        hideGraderIdentity: formData.additionalOptions.hideGraderIdentity,
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
      if (pc.questionConfigType === 'levelBased' || pc.questionConfigType === 'selectionLevel') bst = 'levelBasedMarks';
      else if (pc.scoreSettings?.scoreType === 'equalDistribution') bst = 'evenMarks';
      else if (pc.scoreSettings?.scoreType === 'questionSpecific') bst = 'separateMarks';
      else if (pc.scoreSettings?.scoreType === 'levelSpecific') bst = 'levelBasedMarks';

      const cfg: any = {
        questionConfigType: pc.questionConfigType,
        scoreSettings: {
          scoreType: bst,
          evenMarks: pc.scoreSettings?.scoreType === 'equalDistribution' ? pc.scoreSettings.equalDistribution : 0,
          separateMarks: pc.scoreSettings?.questionSpecific || { general: [], levelBased: { easy: [], medium: [], hard: [] } },
          levelBasedMarks: pc.scoreSettings?.levelBasedMarks || { easy: 0, medium: 0, hard: 0 },
          levelScoringConfiguration: pc.scoreSettings?.levelScoringConfiguration,
          totalMarks: sTotal,
        },
        questionFlow: pc.questionFlow || 'freeFlow',
        attemptLimitEnabled: pc.attemptLimitEnabled || false,
        submissionAttempts: pc.submissionAttempts || 1,
        allowCodeExecution: true, enableTestCases: true, showSampleCases: true,
      };
      if (pc.questionConfigType === 'general') { cfg.generalQuestionCount = pc.generalQuestionCount || 0; cfg.generalMarksPerQuestion = pc.scoreSettings?.equalDistribution || 0; }
      else if (pc.questionConfigType === 'levelBased') cfg.levelBasedCounts = pc.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
      else if (pc.questionConfigType === 'selectionLevel') cfg.selectionLevelCounts = pc.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
      return cfg;
    };

    if (formData.exerciseType === 'MCQ') {
      payload.questionConfiguration = {
        mcqConfig: {
          questionConfigType: 'general',
          generalQuestionCount: formData.mcqConfig.generalQuestionCount || 0,
          scoreSettings: { scoreType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution', equalDistribution: formData.mcqConfig.scoreSettings?.equalDistribution || 0, totalMarks: mcqTotalMarks },
          attemptLimitEnabled: formData.mcqConfig.attemptLimitEnabled || false,
          submissionAttempts: formData.mcqConfig.submissionAttempts || 1,
          mcqTotalMarks, marksPerQuestion: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
          totalMcqQuestions: formData.mcqConfig.generalQuestionCount || 0,
          scoringType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution', shuffleQuestions: true,
        },
      };
    } else if (formData.exerciseType === 'Programming') {
      payload.questionConfiguration = { programmingConfig: buildProgConfig(formData.programmingConfig, progTotalMarks) };
    } else if (formData.exerciseType === 'Combined') {
      payload.questionConfiguration = {
        mcqConfig: {
          questionConfigType: 'general', generalQuestionCount: formData.mcqConfig.generalQuestionCount || 0,
          scoreSettings: { scoreType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution', equalDistribution: formData.mcqConfig.scoreSettings?.equalDistribution || 0, totalMarks: formData.totalMarksMCQ },
          attemptLimitEnabled: formData.mcqConfig.attemptLimitEnabled || false, submissionAttempts: formData.mcqConfig.submissionAttempts || 1,
          mcqTotalMarks: formData.totalMarksMCQ, marksPerQuestion: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
          totalMcqQuestions: formData.mcqConfig.generalQuestionCount || 0,
          scoringType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution', shuffleQuestions: true,
        },
        programmingConfig: buildProgConfig(formData.programmingConfig, formData.totalMarksProgramming),
      };
    }

    return payload;
  }, [formData, tabType, subcategory, programmingAllocatedMarks]);

  // ── handleComplete ──────────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    let allErrors: ValidationErrors = {};
    let allFields: string[] = [];

    // 1. Exercise Details (includes type, module, languages, name, duration, marks)
    if (!formData.exerciseType) allErrors.exerciseType = 'Please select an exercise type';
    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      if (!formData.selectedModule) allErrors.selectedModule = 'Please select a module';
      if (formData.selectedLanguages.length === 0) allErrors.selectedLanguages = 'Please select at least one language';
    }
    const detailsErrors = validateExerciseDetails();
    allErrors = { ...allErrors, ...detailsErrors };
    allFields.push('exerciseType', 'selectedModule', 'selectedLanguages', 'exerciseName', 'totalDuration', 'totalMarks');
    if (formData.exerciseType === 'Combined') allFields.push('totalMarksMCQ', 'totalMarksProgramming');

    // 4. MCQ Configuration — required for MCQ / Combined
    if (formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') {
      const mcqErrors = validateMCQConfiguration();
      allErrors = { ...allErrors, ...mcqErrors };
      allFields.push('mcqGeneralQuestionCount', 'mcqMarksPerQuestion', 'mcqTotalMarks');
    }

    // 5. Programming Configuration — required for Programming / Combined
    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      const progErrors = validateProgrammingConfiguration();
      allErrors = { ...allErrors, ...progErrors };
      if (programmingLevelMismatch) allErrors.programmingTotalMarks = programmingLevelMismatch;
      allFields.push('programmingGeneralQuestionCount', 'programmingMarksPerQuestion',
        'programmingLevelCounts', 'programmingLevelCounts_Easy',
        'programmingLevelCounts_Medium', 'programmingLevelCounts_Hard', 'programmingTotalMarks');
    }

    // 6. Schedule — always required
    const scheduleErrors = validateSchedule();
    allErrors = { ...allErrors, ...scheduleErrors };
    allFields.push('startDate', 'endDate');
    if ((formData.schedule as any).cutOffEnabled) allFields.push('cutOffDate');

    // 7. Grade Settings — required for all exercise types
    const gradeErrors = validateGradeSettings();
    allErrors = { ...allErrors, ...gradeErrors };
    allFields.push('programmingGrade', 'programmingGradeToPass', 'mcqGrade', 'mcqGradeToPass', 'combinedGrade', 'combinedGradeToPass');

    // Check for errors
    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...allErrors }));
      markAllTouched(allFields);

      // Collect which required steps have errors (in order)
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
      if (allErrors.programmingGrade || allErrors.programmingGradeToPass ||
        allErrors.mcqGradeToPass || allErrors.combinedGradeToPass)
        incompleteSteps.push('Grade Settings');

      // Navigate to first invalid step
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

    // All validations passed, proceed with final submission
    setIsLoading(true);

    try {
      if (!tabType || !subcategory) throw new Error('Missing required fields: tabType or subcategory');
      if (!formData.exerciseName) throw new Error('Exercise name is required');

      const basePayload = buildFullPayload();

      // Use whichever ID we have: from step-saves, editing prop, or create new
      const finalId = localExerciseId || (isEditing ? exercise_Id : null);
      let response;
      if (finalId) {
        response = await exerciseApi.updateExercise(getEntityType(nodeType), nodeId, finalId, basePayload);
      } else {
        response = await exerciseApi.addExercise(getEntityType(nodeType), nodeId, basePayload);
      }

      // Show success toast
      toast.success(
        isEditing ? 'Exercise updated successfully!' : 'Exercise created successfully!',
        {
          position: 'top-right',
          duration: 3000,
          id: 'exercise-save-success',
          style: {
            minWidth: '250px',
            fontWeight: 600,
          }
        }
      );

      // Lock exercise and mark all steps complete
      setIsLocked(true);
      setCompletedSteps(new Set(steps.map(s => s.id)));
      setSavedSteps(new Set(steps.map(s => s.id)));

      // Call onSave with the payload
      onSave(basePayload);

      // Close modal after a short delay
      setTimeout(() => {
        setIsLoading(false);
        onClose();
      }, 1500);

      // Explicitly dismiss toast after its duration — prevents it getting stuck
      // when the Toaster inside this component unmounts before auto-dismiss fires
      setTimeout(() => {
        toast.dismiss('exercise-save-success');
      }, 3200);

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
    programmingLevelMismatch,
    formData.exerciseName,
    formData.exerciseType,
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
  const handleNext = useCallback(() => {
    const step = steps.find(s => s.id === currentStep);
    // Mark Notifications as completed when user explicitly navigates past it
    if (step?.title === 'Notifications' || step?.title === 'Notification') {
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      setSavedSteps(prev => new Set(prev).add(currentStep));
    }
    if (currentStep < steps[steps.length - 1]?.id) {
      const ci = steps.findIndex(s => s.id === currentStep);
      if (ci < steps.length - 1) setCurrentStep(steps[ci + 1].id);
    }
  }, [currentStep, steps, setCompletedSteps, setSavedSteps]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      const ci = steps.findIndex(s => s.id === currentStep);
      if (ci > 0) setCurrentStep(steps[ci - 1].id);
    }
  }, [currentStep, steps]);

  // ── Field-only completeness check (no saved-state dependency) ────────────────
  // Returns true if the step's required fields are filled (used for guidance navigation)
  const hasStepRequiredFieldsFilled = useCallback((stepId: number): boolean => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return true;
    switch (step.title) {
      case 'Exercise Details': {
        if (!formData.exerciseType) return false;
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

  // ── Shared save logic ────────────────────────────────────────────────────────
  const performSave = useCallback(async (afterSave?: () => void) => {
    if (isLocked) return;
    setIsSavingStep(true);
    try {
      // Pre-flight: exercise type must be selected before any API call
      if (!formData.exerciseType) {
        const detStep = steps.find(s => s.title === 'Exercise Details');
        if (detStep) setCurrentStep(detStep.id);
        toast('Please select an exercise type first', { position: 'top-right', duration: 3000, icon: 'ℹ️', id: 'need-type' });
        setIsSavingStep(false);
        return;
      }

      const payload = buildFullPayload();
      const currentId = localExerciseId || (isEditing ? exercise_Id : null);

      // Require exerciseName before hitting the API for the first time
      if (!currentId && !formData.exerciseName?.trim()) {
        toast('Enter an exercise name to save', { position: 'top-right', duration: 2500, icon: 'ℹ️', id: 'need-name' });
        setIsSavingStep(false);
        return;
      }
// Require exerciseName before hitting the API for the first time
      if (!currentId && !formData.exerciseName?.trim()) {
        toast('Enter an exercise name to save', { position: 'top-right', duration: 2500, icon: 'ℹ️', id: 'need-name' });
        setIsSavingStep(false);
        return;
      }
      let response: any;
      if (currentId) {
        response = await exerciseApi.updateExercise(getEntityType(nodeType), nodeId, currentId, payload);
      } else {
        response = await exerciseApi.addExercise(getEntityType(nodeType), nodeId, payload);
        const newId = response?.data?.exercise?._id || response?.data?._id || response?._id;
        if (newId) setLocalExerciseId(newId);
      }

      // Mark current step as saved, and mark all previous steps that already have
      // their required fields filled as saved/completed too (payload covered them all)
      const currentStepIdx = steps.findIndex(s => s.id === currentStep);
      setSavedSteps(prev => {
        const n = new Set(prev);
        n.add(currentStep);
        steps.slice(0, currentStepIdx).forEach(s => { if (hasStepRequiredFieldsFilled(s.id)) n.add(s.id); });
        return n;
      });
      setCompletedSteps(prev => {
        const n = new Set(prev);
        // Current step: we just saved to DB, so use field-only check (not isStepCompleted which
        // gates on completedSteps.has() — that's stale here and would always return false for a
        // first-time save on any step)
        if (hasStepRequiredFieldsFilled(currentStep)) { n.add(currentStep); } else { n.delete(currentStep); }
        // Previous steps
        steps.slice(0, currentStepIdx).forEach(s => {
          if (hasStepRequiredFieldsFilled(s.id)) { n.add(s.id); } else { n.delete(s.id); }
        });
        return n;
      });

      // After saving, check if any earlier steps have unfilled required fields
      // and navigate to the first one to guide the user
      const firstIncompletePrev = steps.slice(0, currentStepIdx).find(s => !hasStepRequiredFieldsFilled(s.id));
      if (firstIncompletePrev) {
        setCurrentStep(firstIncompletePrev.id);
        toast(`Please also complete: ${firstIncompletePrev.title}`, {
          position: 'top-right', duration: 3000, icon: 'ℹ️', id: 'prev-step-incomplete',
        });
      } else {
        afterSave?.();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save';
      toast.error(`Save failed: ${msg}`, { position: 'top-right', duration: 4000, id: 'step-save-err' });
    } finally {
      setIsSavingStep(false);
    }
  }, [isLocked, buildFullPayload, localExerciseId, isEditing, exercise_Id, formData.exerciseName,
    formData.exerciseType, getEntityType, nodeType, nodeId, currentStep,
    steps, hasStepRequiredFieldsFilled]);

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
      fields.push('exerciseName', 'totalDuration', 'totalMarks');
      if (formData.exerciseType === 'Combined') fields.push('totalMarksMCQ', 'totalMarksProgramming');
    }

    if (currentTitle === 'Question Configuration') {
      if (formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') {
        errors = { ...errors, ...validateMCQConfiguration() };
        fields.push('mcqGeneralQuestionCount', 'mcqMarksPerQuestion', 'mcqTotalMarks');
      }
      if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
        errors = { ...errors, ...validateProgrammingConfiguration() };
        if (programmingLevelMismatch) errors.programmingTotalMarks = programmingLevelMismatch;
        fields.push('programmingGeneralQuestionCount', 'programmingMarksPerQuestion',
          'programmingLevelCounts', 'programmingLevelCounts_Easy',
          'programmingLevelCounts_Medium', 'programmingLevelCounts_Hard', 'programmingTotalMarks');
      }
    }

    if (currentTitle === 'Schedule') {
      errors = { ...errors, ...validateSchedule() };
      fields.push('startDate', 'endDate');
      if ((formData.schedule as any).cutOffEnabled) fields.push('cutOffDate');
    }

    if (currentTitle === 'Grade Settings') {
      errors = { ...errors, ...validateGradeSettings() };
      fields.push('programmingGrade', 'programmingGradeToPass', 'mcqGradeToPass', 'combinedGradeToPass');
    }

    // If any errors — show red borders and stop. No toast, no API call.
    if (Object.keys(errors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...errors }));
      markAllTouched(fields);
      return;
    }

    // All valid — proceed to API save
    await performSave(() => {
      toast.success('Saved!', { position: 'top-right', duration: 1800, id: 'step-save-ok' });
      if (currentTitle === 'Question Configuration' && formData.exerciseType === 'Combined' && combinedConfigTab === 'mcq') {
        setCombinedConfigTab('programming');
      }
    });
  }, [
    performSave, steps, currentStep, formData.exerciseType, formData.selectedModule,
    formData.selectedLanguages, formData.schedule, combinedConfigTab,
    validateExerciseDetails, validateMCQConfiguration, validateProgrammingConfiguration,
    validateSchedule, validateGradeSettings, programmingLevelMismatch,
    setValidationErrors, markAllTouched,
  ]);
  // ── Sidebar step click — locked until Step 1 has been saved ────────────────
  const handleStepClick = useCallback((targetStepId: number) => {
    if (targetStepId === currentStep) return;
    // Gate: all non-first steps are locked until Exercise Details has been saved
    const step1Id = steps.find(s => s.title === 'Exercise Details')?.id ?? 1;
    const step1Unlocked = savedSteps.has(step1Id);
    if (!step1Unlocked && targetStepId !== step1Id) return;
    setCurrentStep(targetStepId);
  }, [currentStep, steps, savedSteps]);

  // FIXED: handleSelectExerciseType - restored programming config reset from old version
  const handleSelectExerciseType = useCallback((type: 'MCQ' | 'Programming' | 'Combined') => {
    setFormData(prev => ({
      ...prev,
      exerciseType: type,
      // Reset module and languages for MCQ
      ...(type === 'MCQ' && {
        selectedModule: '',
        selectedLanguages: []
      }),
      // Initialize programming config with defaults
      ...(type === 'Programming' && {
        programmingConfig: {
          ...prev.programmingConfig,
          questionConfigType: 'general',
          generalQuestionCount: 0,
          selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
          levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
          scoreSettings: {
            ...prev.programmingConfig.scoreSettings,
            equalDistribution: prev.totalMarksProgramming > 0 ? prev.totalMarksProgramming / 1 : 0
          }
        }
      }),
      // Initialize combined mode with both sections configured
      ...(type === 'Combined' && {
        // Ensure programming config has valid values
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
        // Ensure MCQ config has valid values if totalMarksMCQ is set
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

  const shouldShowScoringSection = useMemo(() => {
    const ct = formData.programmingConfig.questionConfigType;
    if (ct === 'general') return false;
    if (ct === 'levelBased') { const c = formData.programmingConfig.levelBasedCounts; return c.easy > 0 && c.medium > 0 && c.hard > 0; }
    if (ct === 'selectionLevel') { const c = formData.programmingConfig.selectionLevelCounts; return c.easy > 0 || c.medium > 0 || c.hard > 0; }
    return false;
  }, [formData.programmingConfig]);

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
    ];
    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Settings2 size={13} /></div>
          <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Select Exercise Type</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
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
                <h3 className="text-sm font-bold mb-0.5" style={{ color: sel ? t.color : D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{t.label}</h3>
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
  //           <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Select Languages</h3>
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
  //         <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Module & Languages</h3>
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
  //                 <div className="text-xs font-bold" style={{ color: sel ? colors[mod] : D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{mod}</div>
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
  const isProgramming = formData.exerciseType === 'Programming' || isCombined;
  const combinedTotal = formData.totalMarksMCQ + formData.totalMarksProgramming;

  const exerciseTypeOptions = [
    { value: 'MCQ', label: 'MCQ — Multiple Choice Questions (auto-graded)' },
    { value: 'Programming', label: 'Programming — Code challenges with test cases' },
    { value: 'Combined', label: 'Combined — MCQ + Programming (hybrid)' },
  ];

  const difficultyOptions = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'expert', label: 'Expert' },
  ];

  const labelCell = (label: string, required?: boolean, info?: string) => (
    <div className="flex items-center gap-1 pt-2 min-w-0">
      <span className="text-xs font-semibold truncate" style={{ color: D.textSub, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{label}</span>
      {required && <span className="text-xs font-bold flex-shrink-0" style={{ color: D.orange }}>*</span>}
      {info && <InfoTooltip content={info} />}
    </div>
  );

  // ── Build flat language list from configuredLanguages ──────────────────
  const buildConfiguredLangList = () => {
    if (!configuredLanguages) return [];
    const allIconEntries = [
      ...moduleLanguages['Core Programming'],
      ...moduleLanguages['Frontend'],
      ...moduleLanguages['Database'],
    ];
    const langAliases: Record<string, string> = {
      'js': 'JavaScript', 'ts': 'TypeScript', 'css': 'CSS', 'html': 'HTML',
      'react': 'React', 'bootstrap': 'Bootstrap', 'sql': 'SQL',
      'mongodb': 'MongoDB', 'c': 'C', 'c++': 'C++', 'java': 'Java',
      'python': 'Python', 'c#': 'C#',
    };
    const findIcon = (name: string) => {
      const searchName = langAliases[name.toLowerCase()] || name;
      return allIconEntries.find(l => l.name.toLowerCase() === searchName.toLowerCase())?.icon || '';
    };
    const result: { name: string; icon: string; category: string }[] = [];
    const entries: [string, string][] = [
      ['Core Programming', 'coreProgram'],
      ['Frontend', 'frontend'],
      ['Database', 'database'],
    ];
    for (const [category, key] of entries) {
      const names: string[] = (configuredLanguages as any)[key] || [];
      for (const name of names) result.push({ name, icon: findIcon(name), category });
    }
    return result;
  };

  return (
    <div className="px-4 py-3">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: D.orangeLight, color: D.orange }}>
            <FileText size={13} />
          </div>
          <h3 className="text-sm font-bold"
            style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Exercise Details
          </h3>
        </div>
      </div>

      <div className="space-y-3">

        {/* Row: Exercise ID + Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SectionLabel info="Auto-generated unique identifier for this exercise">Exercise ID</SectionLabel>
            <OInput value={formData.exerciseId} onChange={() => {}} readOnly />
          </div>
          <div>
            <SectionLabel required info="The name displayed to students in their dashboard">Exercise Name</SectionLabel>
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

        <div style={{ borderTop: `1px solid ${D.border}` }} />

        {/* Row: Exercise Type */}
        <div className="grid grid-cols-[140px_1fr] items-start gap-3">
          {labelCell('Exercise Type', true, 'MCQ for multiple-choice, Programming for code challenges, or Combined for both')}
          <div>
            <select
              value={formData.exerciseType || ''}
              onChange={e => {
                const v = e.target.value as any;
                handleSelectExerciseType(v);
                if (v) setValidationErrors(prev => { const n = { ...prev }; delete n.exerciseType; return n; });
              }}
              onBlur={() => markTouched('exerciseType')}
              className="px-3 py-2 text-xs rounded-lg border outline-none transition-all"
              style={{
                borderColor: validationErrors.exerciseType && touchedFields.has('exerciseType') ? D.red : D.border,
                background: D.bg,
                color: formData.exerciseType ? D.textMain : D.textMuted,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 600,
                width: 'auto',
                minWidth: '200px',
              }}>
              <option value="" disabled>Select exercise type…</option>
              {exerciseTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {validationErrors.exerciseType && touchedFields.has('exerciseType') && (
              <p className="mt-1 text-xs flex items-center gap-1" style={{ color: D.red }}>
                <AlertCircle size={11} />{validationErrors.exerciseType}
              </p>
            )}
          </div>
        </div>

        {/* Row: Skill Set / Module (Programming / Combined only) */}
        {isProgramming && (
          <div className="grid grid-cols-[140px_1fr] items-start gap-3">
            {labelCell(
              configuredLanguages ? 'Skill Set' : 'Module',
              true,
              configuredLanguages
                ? 'Skill set configured for this topic'
                : 'Select the programming module this exercise belongs to'
            )}
            <div className="space-y-2">
            {configuredLanguages ? (
  (() => {
    const allLangs = buildConfiguredLangList();
    return (
      <div className="flex flex-wrap gap-1.5">
        {allLangs.map(lang => (
          <span
            key={lang.name}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
            style={{ borderColor: D.orange, background: D.orangeLight, color: D.orange }}
          >
            {lang.icon && (
              <img
                src={lang.icon}
                alt={lang.name}
                className="w-3.5 h-3.5 object-contain"
                onError={e => { (e.target as any).style.display = 'none'; }}
              />
            )}
            {lang.name}
          </span>
        ))}
      </div>
    );
  })()
) : (
  // Default section
  <>
    <div className="flex gap-2">
      {(['Core Programming', 'Frontend', 'Database'] as const).map(mod => {
        const sel = formData.selectedModule === mod;
        const colors: Record<string, string> = {
          'Core Programming': D.blue,
          'Frontend': D.orange,
          'Database': D.emerald,
        };
        const icons: Record<string, React.ReactNode> = {
          'Core Programming': <Terminal size={11} />,
          'Frontend': <Code size={11} />,
          'Database': <Database size={11} />,
        };
        return (
          <button
            key={mod}
            type="button"
            onClick={() => {
              setFormData(prev => ({ ...prev, selectedModule: mod, selectedLanguages: [] }));
              setValidationErrors(prev => { const n = { ...prev }; delete n.selectedModule; return n; });
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-bold transition-all"
            style={{
              borderColor: sel ? colors[mod] : D.border,
              background: sel ? colors[mod] + '10' : D.bg,
              color: sel ? colors[mod] : D.textMuted,
              cursor: 'pointer',
            }}>
            {icons[mod]}{mod}
          </button>
        );
      })}
    </div>
    {validationErrors.selectedModule && touchedFields.has('selectedModule') && (
      <p className="text-xs flex items-center gap-1" style={{ color: D.red }}>
        <AlertCircle size={11} />{validationErrors.selectedModule}
      </p>
    )}
    {formData.selectedModule && (() => {
      const langs = getFilteredLanguages(formData.selectedModule);
      const allSel = langs.length > 0 && langs.every(l => formData.selectedLanguages.includes(l.name));
      return (
        <div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {/* Language checkboxes */}
            {langs.map(lang => {
              const sel = formData.selectedLanguages.includes(lang.name);
              return (
                <label
                  key={lang.name}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg border cursor-pointer select-none text-xs font-semibold transition-all"
                  style={{
                    borderColor: sel ? D.orange : D.border,
                    background: sel ? D.orangeLight : D.bg,
                    color: sel ? D.orange : D.textSub,
                  }}>
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 cursor-pointer opacity-0 absolute"
                      checked={sel}
                      onChange={() => toggleLanguage(lang.name)}
                    />
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${sel ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'}`}>
                      {sel && <Check size={10} className="text-white" strokeWidth={2.5} />}
                    </div>
                  </div>
                  {lang.icon && (
                    <img
                      src={lang.icon}
                      alt={lang.name}
                      className="w-3.5 h-3.5 object-contain"
                      onError={e => { (e.target as any).style.display = 'none'; }}
                    />
                  )}
                  {lang.name}
                </label>
              );
            })}
            
            {/* Select All button - right after checkboxes, not corner */}
            <button
              type="button"
              onClick={() => {
                const all = langs.map(l => l.name);
                setFormData(prev => ({ ...prev, selectedLanguages: allSel ? [] : all }));
              }}
              className="text-xs font-semibold px-2 py-1 rounded transition-all hover:opacity-70 whitespace-nowrap"
              style={{ color: D.orange }}>
              {allSel ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          {validationErrors.selectedLanguages && touchedFields.has('selectedLanguages') && (
            <p className="mt-1 text-xs flex items-center gap-1" style={{ color: D.red }}>
              <AlertCircle size={11} />{validationErrors.selectedLanguages}
            </p>
          )}
        </div>
      );
    })()}
  </>
)}
            </div>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${D.border}` }} />

        {/* Row: Description */}
        <div>
          <SectionLabel info="A brief overview shown to students before they start">Description</SectionLabel>
          <TipTapEditor
            value={formData.description}
            onChange={v => setFormData(prev => ({ ...prev, description: v }))}
            onBlur={() => markTouched('description')}
            placeholder="Enter a brief description..."
            minHeight="72px"
            maxHeight="72px"
            showToolbar
            editable
            error={validationErrors.description}
            touched={touchedFields.has('description')}
          />
        </div>

        {/* Row: Difficulty Level */}
        <div className="grid grid-cols-[140px_1fr] items-start gap-3">
          {labelCell('Difficulty Level', false, 'Sets the challenge level — affects filtering and student guidance')}
          <select
            value={formData.exerciseLevel}
            onChange={e => setFormData(prev => ({ ...prev, exerciseLevel: e.target.value as any }))}
            className="px-3 py-2 text-xs rounded-lg border outline-none transition-all"
            style={{
              borderColor: D.border,
              background: D.bg,
              color: D.textMain,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontWeight: 600,
              width: 'auto',
              minWidth: '200px',
            }}>
            {difficultyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Row: Duration + Marks */}
        <div className="flex gap-3">
          <div className="w-2/5">
            <SectionLabel required info="Total time allowed in minutes">Duration (min)</SectionLabel>
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
            />
          </div>
          <div className="w-3/5">
            {!isCombined ? (
              <div>
                <SectionLabel required info="Maximum marks a student can score">Total Marks</SectionLabel>
                <ONumberInput
                  value={formData.totalMarks}
                  onChange={v => {
                    setFormData(prev => ({ ...prev, totalMarks: v }));
                    if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalMarks; return e; });
                  }}
                  onBlur={() => markTouched('totalMarks')}
                  placeholder="100"
                  error={validationErrors.totalMarks}
                  touched={touchedFields.has('totalMarks')}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SectionLabel required info="Marks for MCQ section">MCQ Marks</SectionLabel>
                  <ONumberInput
                    value={formData.totalMarksMCQ}
                    onChange={v => {
                      setFormData(prev => ({ ...prev, totalMarksMCQ: v, totalMarks: v + prev.totalMarksProgramming }));
                      if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalMarksMCQ; return e; });
                    }}
                    onBlur={() => markTouched('totalMarksMCQ')}
                    placeholder="50"
                    error={validationErrors.totalMarksMCQ}
                    touched={touchedFields.has('totalMarksMCQ')}
                  />
                </div>
                <div>
                  <SectionLabel required info="Marks for programming section">Prog. Marks</SectionLabel>
                  <ONumberInput
                    value={formData.totalMarksProgramming}
                    onChange={v => {
                      setFormData(prev => ({ ...prev, totalMarksProgramming: v, totalMarks: prev.totalMarksMCQ + v }));
                      if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalMarksProgramming; return e; });
                    }}
                    onBlur={() => markTouched('totalMarksProgramming')}
                    placeholder="50"
                    error={validationErrors.totalMarksProgramming}
                    touched={touchedFields.has('totalMarksProgramming')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}, [
  formData,
  validationErrors,
  touchedFields,
  markTouched,
  handleSelectExerciseType,
  toggleLanguage,
  configuredLanguages,
]);
  // ==========================================================================
  // RENDER: MCQ Configuration (RESTORED: question specific mode info)
  // ==========================================================================
  const renderMCQConfiguration = useCallback(() => {
    const isEqual = formData.mcqConfig.scoreSettings.scoreType === 'equalDistribution';
    const isCombined = formData.exerciseType === 'Combined';
    const totalToUse = isCombined ? formData.totalMarksMCQ : formData.totalMarks;
    const allocated = isEqual ? formData.mcqConfig.generalQuestionCount * formData.mcqConfig.scoreSettings.equalDistribution : 0;
    const isMatch = isEqual ? isApproximatelyEqual(allocated, totalToUse) : true;
    return (
      <div className="px-4 py-3">
        <div className="mb-3 p-2.5 rounded-xl flex items-center justify-between" style={{ background: D.blue + '08', border: `1px solid ${D.blue}20` }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: D.blue + '20', color: D.blue }}><List size={13} /></div>
            <div>
              <h3 className="text-xs font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>MCQ Configuration</h3>
              {isCombined && <p className="text-[10px]" style={{ color: D.blue }}>Section: {formData.totalMarksMCQ} Total marks</p>}
            </div>
          </div>
          {isEqual && (
            <div className="text-right">
              <div className="text-[10px] font-semibold" style={{ color: isMatch ? D.emerald : D.amber }}>Allocated</div>
              <div className="text-sm font-bold" style={{ color: isMatch ? D.emerald : D.amber, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formatDecimal(allocated)}<span className="text-xs font-normal" style={{ color: D.textMuted }}>/{totalToUse}</span></div>
            </div>
          )}
        </div>
        <div className="space-y-2.5">
          {/* Scoring Type */}
          <div>
            <SectionLabel info="Equal Distribution splits marks evenly across all questions; Question Specific lets you set marks per question individually">Scoring Type</SectionLabel>
            <ODropdown value={formData.mcqConfig.scoreSettings.scoreType} options={mcqScoringOptions}
              onChange={v => {
                const tot = isCombined ? formData.totalMarksMCQ : formData.totalMarks;
                setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, scoreSettings: { ...prev.mcqConfig.scoreSettings, scoreType: v as any, equalDistribution: v === 'equalDistribution' && prev.mcqConfig.generalQuestionCount > 0 ? tot / prev.mcqConfig.generalQuestionCount : 0, totalMarks: tot } } }));
              }} />
            <p className="mt-1 text-[11px]" style={{ color: D.textMuted }}>
              {isEqual ? 'All questions will have equal marks, auto-calculated from total.' : 'Set individual marks per question when creating them.'}
            </p>
          </div>

          {isEqual && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="grid grid-cols-2 gap-3 mt-3">
                {/* Total Questions — always editable */}
                <div>
                  <SectionLabel className="mb-4"  required info="Total number of MCQ question " >Total Questions</SectionLabel>
                  <ONumberInput value={formData.mcqConfig.generalQuestionCount}
                    onChange={v => {
                      const tot = isCombined ? formData.totalMarksMCQ : formData.totalMarks;
                      setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, generalQuestionCount: v, scoreSettings: { ...prev.mcqConfig.scoreSettings, equalDistribution: v > 0 && tot > 0 ? tot / v : 0 } } }));
                      if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.mcqGeneralQuestionCount; return e; });
                    }}
                    onBlur={() => markTouched('mcqGeneralQuestionCount')} min={0} placeholder="e.g. 10"
                    error={validationErrors.mcqGeneralQuestionCount} touched={touchedFields.has('mcqGeneralQuestionCount')} />
                </div>
                <div>
                  <SectionLabel info="Auto-calculated">Marks Per Question</SectionLabel>
                  <div className="relative">
                    <input type="text" value={formatDecimal(formData.mcqConfig.scoreSettings.equalDistribution)} disabled readOnly
                      className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: D.border, background: D.surface, color: D.textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: D.orange }}>Auto</span>
                  </div>
                  {formData.mcqConfig.generalQuestionCount > 0 && formData.mcqConfig.scoreSettings.equalDistribution > 0 && (
                    <p className="mt-1 text-[11px]" style={{ color: D.textMuted }}>{totalToUse} ÷ {formData.mcqConfig.generalQuestionCount} = <strong style={{ color: D.textSub }}>{formatDecimal(formData.mcqConfig.scoreSettings.equalDistribution)}</strong></p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RESTORED: Question Specific mode info text */}
          {!isEqual && (
            <div className="p-2.5 rounded-lg" style={{ background: D.blue + '08', border: `1px solid ${D.blue}20` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: D.blue }}>Question Specific Mode</p>
              <p className="text-[11px]" style={{ color: D.textMuted }}>
                Assign individual marks per question when creating them. Sum must equal <strong>{totalToUse}</strong>.
                Question count is not tracked in this mode.
              </p>
            </div>
          )}

          {validationErrors.totalMarks && touchedFields.has('totalMarks') && !isCombined && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff2f2', border: `1px solid ${D.red}25` }}>
              <AlertCircle size={13} style={{ color: D.red }} /><p className="text-xs" style={{ color: D.red }}>{validationErrors.totalMarks}</p>
            </div>
          )}

          {/* Attempt Limit */}
          <div className="pt-2 border-t" style={{ borderColor: D.border }}>
            <OToggle enabled={formData.mcqConfig.attemptLimitEnabled} onChange={v => setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, attemptLimitEnabled: v, submissionAttempts: v ? prev.mcqConfig.submissionAttempts : 1 } }))} label="Attempt Limit" description="Restrict the number of submission attempts" />
            {formData.mcqConfig.attemptLimitEnabled && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <SectionLabel info="Maximum number of times a student can submit their MCQ answers (1–10)">Attempts Allowed</SectionLabel>
                <div className="w-28">
                  <ONumberInput value={formData.mcqConfig.submissionAttempts} onChange={v => setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, submissionAttempts: Math.max(1, Math.min(10, v)) } }))} min={1} max={10} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [formData.mcqConfig, formData.totalMarks, formData.totalMarksMCQ, formData.exerciseType, mcqScoringOptions, validationErrors, touchedFields, markTouched]);

  // ==========================================================================
  // RENDER: Programming Configuration
  // ==========================================================================
  const renderProgrammingConfiguration = useCallback(() => {
    const totalQs = getProgrammingTotalQuestions();
    const isCombined = formData.exerciseType === 'Combined';
    const totalToUse = isCombined ? formData.totalMarksProgramming : formData.totalMarks;
    const isMatch = isApproximatelyEqual(programmingAllocatedMarks, totalToUse);

    const renderScoringConfiguration = () => {
      const counts = formData.programmingConfig.questionConfigType === 'selectionLevel' ? formData.programmingConfig.selectionLevelCounts : formData.programmingConfig.levelBasedCounts;
      const ls = formData.programmingConfig.scoreSettings.levelScoringConfiguration;
      const scoringErrors = (validationErrors.programmingLevelScoring as Record<string, string>) || {};
      const levelStyles = {
        easy: { label: 'Easy', color: D.emerald, bg: D.emerald + '10', border: D.border2 }, // Changed to neutral border
        medium: { label: 'Medium', color: D.amber, bg: D.amber + '10', border: D.border2 }, // Changed to neutral border
        hard: { label: 'Hard', color: D.red, bg: D.red + '10', border: D.border2 }, // Changed to neutral border
      };
      const activeLevels = (['easy', 'medium', 'hard'] as const).filter(l => counts[l] > 0);

      return (
        <div className="grid grid-cols-3 gap-2">
          {activeLevels.map(level => {
            const count = counts[level];
            const scoring = ls[level];
            const style = levelStyles[level];
            const hasError = touchedFields.has(`scoring_${level}`) && !!scoringErrors[level];
            const isQSpec = scoring?.type === 'question_specific';
            const total = isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0) * count;

            return (
              <div key={level} className="p-2.5 rounded-lg border flex flex-col gap-1.5"
                style={{
                  background: hasError ? '#fff2f2' : style.bg,
                  borderColor: hasError ? D.red + '40' : style.border // Using neutral border
                }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold" style={{ color: style.color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{style.label}</span>
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: style.color + '20', color: style.color }}>{count}Question</span>
                </div>
                <div>
                  <div className="text-[9px] font-semibold mb-1" style={{ color: D.textMuted }}>TYPE</div>
                  <select value={scoring?.type || 'level_specific'} onChange={e => updateLevelScoringConfig(level, { type: e.target.value as any, ...(e.target.value === 'level_specific' ? { marksPerQuestion: 2, totalMarks: undefined } : { totalMarks: 10, marksPerQuestion: undefined }) })}
                    className="w-full px-2 py-1 text-[11px] rounded-md border font-semibold outline-none"
                    style={{ borderColor: D.border2, background: '#fff', color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}> {/* Changed to neutral border */}
                    <option value="level_specific">Level-specific</option>
                    <option value="question_specific">Question-specific</option>
                  </select>
                </div>
                <div>
                  <div className="text-[9px] font-semibold mb-1" style={{ color: D.textMuted }}>{isQSpec ? 'TOTAL MARKS' : 'PER QUESTION'}</div>
                  <ONumberInput value={isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0)}
                    onChange={v => updateLevelScoringConfig(level, isQSpec ? { totalMarks: v } : { marksPerQuestion: v })}
                    className="text-xs" />
                </div>
                <div className="text-[10px] text-center font-semibold pt-1 border-t" style={{ borderColor: D.border2, color: style.color }}> {/* Changed to neutral border */}
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
    const scoringCounts = formData.programmingConfig.questionConfigType === 'selectionLevel'
      ? formData.programmingConfig.selectionLevelCounts
      : formData.programmingConfig.levelBasedCounts;
    const ls = formData.programmingConfig.scoreSettings.levelScoringConfiguration;
    const scoringErrors = (validationErrors.programmingLevelScoring as Record<string, string>) || {};
    const activeScoringLevels = (['easy', 'medium', 'hard'] as const).filter(l => scoringCounts[l] > 0);

    return (
      <div className="px-4 py-3">
        {/* Header — sticky */}
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between py-2" style={{ background: '#fff' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.surface2, color: D.textMain }}>
              <Terminal size={13} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Programming Configuration</h3>
              {isCombined && <p className="text-[10px]" style={{ color: D.textSub }}>Section: {formData.totalMarksProgramming} marks</p>}
            </div>
          </div>
          {/* <div className="text-right">
            <div className="text-[10px] font-semibold" style={{ color: isMatch ? D.emerald : D.amber }}>{isMatch ? 'Balanced' : 'Mismatch'}</div>
            <div className="text-sm font-bold" style={{ color: isMatch ? D.emerald : D.amber, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {formatDecimal(programmingAllocatedMarks)}<span className="text-xs font-normal" style={{ color: D.textMuted }}>/{totalToUse}</span>
            </div>
          </div> */}
        </div>

        {programmingLevelMismatch && (
          <div className="sticky z-10 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ top: '44px', background: D.red + '10', border: `1px solid ${D.red}40` }}>
            <AlertCircle size={13} style={{ color: D.red }} />
            <p className="text-xs font-semibold flex-1" style={{ color: D.red }}>{programmingLevelMismatch}</p>
          </div>
        )}

        <div className="space-y-0">
          {/* Config Strategy + Difficulty Counts — side by side */}
          <div className="py-2.5 border-b" style={{ borderColor: D.border }}>
            {formData.programmingConfig.questionConfigType === 'general' ? (
              /* ── GENERAL: 3 columns — Config Strategy | Total Questions | Marks/Q ── */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: '12px', alignItems: 'start' }}>
                {/* Col 1: Config Strategy */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Config Strategy</span>
                    <InfoTooltip content="General: fixed question count; Level Based: questions by difficulty (Easy/Medium/Hard); Selection Level: pick up to 2 difficulty levels" side="right" />
                  </div>
                  <ODropdown value={formData.programmingConfig.questionConfigType} options={configOptions}
                    onChange={v => {
                      setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, questionConfigType: v as any, ...(v === 'general' ? { generalQuestionCount: 0, levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } } : { levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }) } }));
                      setLevelScoringOpen({ easy: false, medium: false, hard: false });
                    }} />
                </div>
                {/* Col 2: Total Questions */}
                <div>
                  <div className="mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Total Questions <span style={{ color: D.orange }}>*</span></span>
                  </div>
                  <ONumberInput value={formData.programmingConfig.generalQuestionCount}
                    onChange={v => { if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.programmingGeneralQuestionCount; return e; }); setFormData(prev => { const tot = prev.exerciseType === 'Combined' ? prev.totalMarksProgramming : prev.totalMarks; return { ...prev, programmingConfig: { ...prev.programmingConfig, generalQuestionCount: v, scoreSettings: { ...prev.programmingConfig.scoreSettings, equalDistribution: v > 0 && tot > 0 ? tot / v : 0 } } }; }); }}
                    onBlur={() => markTouched('programmingGeneralQuestionCount')} min={0} placeholder="e.g. 5"
                    error={validationErrors.programmingGeneralQuestionCount} touched={touchedFields.has('programmingGeneralQuestionCount')} />
                </div>
                {/* Col 3: Marks/Q */}
                <div>
                  <div className="mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Marks/Q</span>
                  </div>
                  <div className="relative">
                    <input type="text" value={formData.programmingConfig.scoreSettings.equalDistribution > 0 ? formatDecimal(formData.programmingConfig.scoreSettings.equalDistribution) : '0'} disabled readOnly
                      className="w-full px-3 py-2 text-sm rounded-lg border text-center" style={{ borderColor: D.border, background: D.surface, color: D.textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: D.orange }}>Auto</span>
                  </div>
                </div>
              </div>
            ) : (
              /* ── LEVEL BASED / SELECTION LEVEL: 2 columns — Config Strategy | Difficulty Counts ── */
              <div style={{ display: 'grid', gridTemplateColumns: '40% 1fr', gap: '16px', alignItems: 'start' }}>
                {/* Col 1: Config Strategy */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Config Strategy</span>
                    <InfoTooltip content="General: fixed question count; Level Based: questions by difficulty (Easy/Medium/Hard); Selection Level: pick up to 2 difficulty levels" side="right" />
                  </div>
                  <ODropdown value={formData.programmingConfig.questionConfigType} options={configOptions}
                    onChange={v => {
                      setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, questionConfigType: v as any, ...(v === 'general' ? { generalQuestionCount: 0, levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } } : { levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }) } }));
                      setLevelScoringOpen({ easy: false, medium: false, hard: false });
                    }} />
                </div>
                {/* Col 2: Difficulty Counts */}
                {formData.programmingConfig.questionConfigType === 'levelBased' ? (
                  <div>
                    <div className="mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Difficulty Counts <span className="text-[10px] font-normal" style={{ color: D.textMuted }}>(all 3 required)</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(['easy', 'medium', 'hard'] as const).map(level => {
                        const ek = `programmingLevelCounts_${level.charAt(0).toUpperCase() + level.slice(1)}`;
                        return (
                          <div key={level} className="flex-1">
                            <div className="text-[10px] font-bold mb-1 capitalize" style={{ color: levelColors[level] }}>{level}</div>
                            <ONumberInput value={formData.programmingConfig.levelBasedCounts?.[level] === 0 ? ('' as any) : formData.programmingConfig.levelBasedCounts?.[level]}
                              onChange={v => { setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, levelBasedCounts: { ...prev.programmingConfig.levelBasedCounts, [level]: v } } })); if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e[ek]; return e; }); setTouchedFields(prev => { const n = new Set(prev); n.delete('scoring_easy'); n.delete('scoring_medium'); n.delete('scoring_hard'); return n; }); }}
                              onBlur={() => markTouched('programmingLevelCounts')} min={0} placeholder="Count"
                              error={validationErrors[ek]} touched={touchedFields.has('programmingLevelCounts')} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                  <div className="mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Difficulty Counts <span className="text-[10px] font-normal" style={{ color: D.textMuted }}>(up to 2 levels)</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    {(['easy', 'medium', 'hard'] as const).map(level => {
                      const checked = formData.programmingConfig.selectionLevelCounts?.[level] > 0;
                      return (
                        <div key={level} className="flex-1">
                          <label className="flex items-center gap-1 mb-1 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={e => {
                              const nc = { ...formData.programmingConfig.selectionLevelCounts, [level]: e.target.checked ? 1 : 0 };
                              const active = (['easy', 'medium', 'hard'] as const).filter(l => nc[l] > 0).length;
                              if (active > 2) setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, questionConfigType: 'levelBased', levelBasedCounts: { easy: nc.easy > 0 ? nc.easy : 1, medium: nc.medium > 0 ? nc.medium : 1, hard: nc.hard > 0 ? nc.hard : 1 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } } }));
                              else setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, selectionLevelCounts: nc } }));
                            }} className="w-3 h-3 rounded" style={{ accentColor: levelColors[level] }} />
                            <span className="text-[10px] font-bold capitalize" style={{ color: levelColors[level] }}>{level}</span>
                          </label>
                          <ONumberInput value={formData.programmingConfig.selectionLevelCounts?.[level] === 0 ? ('' as any) : formData.programmingConfig.selectionLevelCounts?.[level]}
                            onChange={v => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, selectionLevelCounts: { ...prev.programmingConfig.selectionLevelCounts, [level]: v } } }))}
                            disabled={!checked} min={0} placeholder={checked ? 'Count' : '—'} />
                        </div>
                      );
                    })}
                  </div>
                  {validationErrors.programmingLevelCounts && touchedFields.has('programmingLevelCounts') && (
                    <p className="text-[10px] mt-1" style={{ color: D.red }}>{validationErrors.programmingLevelCounts}</p>
                  )}
                </div>
                )}
              </div>
            )}
          </div>

          {/* Scoring Configuration */}
          {shouldShowScoringSection && (
            <>
              <div className="pt-3 pb-1 flex items-center gap-2">
                <Calculator size={12} style={{ color: D.textMuted }} />
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: D.textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Scoring Configuration</span>
              </div>
              <div className="border-b pb-3" style={{ borderColor: D.border }}>
                {/* Row 1: Titles */}
                <div className="flex gap-3 mb-2">
                  {activeScoringLevels.map(level => (
                    <div key={level} className="flex-1 flex items-center gap-1.5">
                      <span className="text-xs font-bold capitalize" style={{ color: levelColors[level], fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{level}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: levelColors[level] + '15', color: levelColors[level] }}>{scoringCounts[level]} Question</span>
                    </div>
                  ))}
                </div>
                {/* Row 2: Inputs */}
                <div className="flex gap-3 mb-2">
                  {activeScoringLevels.map(level => {
                    const scoring = ls[level];
                    const hasError = touchedFields.has(`scoring_${level}`) && !!scoringErrors[level];
                    const isQSpec = scoring?.type === 'question_specific';
                    return (
                      <div key={level} className="flex-1 flex flex-col gap-1.5">
                        <select value={scoring?.type || 'level_specific'}
                          onChange={e => updateLevelScoringConfig(level, { type: e.target.value as any, ...(e.target.value === 'level_specific' ? { marksPerQuestion: 2, totalMarks: undefined } : { totalMarks: 10, marksPerQuestion: undefined }) })}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border outline-none"
                          style={{ borderColor: hasError ? D.red + '60' : D.border, background: '#fff', color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          <option value="level_specific">Level-specific</option>
                          <option value="question_specific">Question-specific</option>
                        </select>
                        <ONumberInput value={isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0)}
                          onChange={v => updateLevelScoringConfig(level, isQSpec ? { totalMarks: v } : { marksPerQuestion: v })} />
                        {hasError && <span className="text-[10px]" style={{ color: D.red }}>{scoringErrors[level]}</span>}
                      </div>
                    );
                  })}
                </div>
                {/* Row 3: Totals */}
                <div className="flex gap-3">
                  {activeScoringLevels.map(level => {
                    const scoring = ls[level];
                    const isQSpec = scoring?.type === 'question_specific';
                    const total = isQSpec ? (scoring?.totalMarks || 0) : (scoring?.marksPerQuestion || 0) * scoringCounts[level];
                    return (
                      <div key={level} className="flex-1 text-center text-xs font-semibold py-1 rounded" style={{ background: levelColors[level] + '10', color: levelColors[level] }}>
                        = {total} marks
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Question Flow */}
          <div className={`flex items-center gap-3 py-2.5 border-b${programmingLevelMismatch ? ' opacity-40 pointer-events-none' : ''}`} style={{ borderColor: D.border }}>
            <div className="w-36 flex-shrink-0 flex items-center gap-1.5">
              <Shuffle size={12} style={{ color: D.textMuted }} />
              <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Question Flow</span>
            </div>
            <div className="flex-1 flex gap-2">
              {questionFlowOptions.map(opt => {
                const sel = formData.programmingConfig.questionFlow === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, questionFlow: opt.value as any } }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                    style={{ borderColor: sel ? D.orange : D.border, background: sel ? D.orangeLight : D.bg, color: sel ? D.orange : D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
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
            <OToggle enabled={formData.programmingConfig.attemptLimitEnabled}
              onChange={v => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, attemptLimitEnabled: v, submissionAttempts: v ? prev.programmingConfig.submissionAttempts : 1 } }))}
              label="Attempt Limit" description="Restrict code submission attempts" />
            {formData.programmingConfig.attemptLimitEnabled && (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: D.border }}>
                <div className="w-36 flex-shrink-0 flex items-center gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Attempts Allowed</span>
                  <InfoTooltip content="Maximum number of code submissions allowed per student (1–10)" side="right" />
                </div>
                <div className="w-24">
                  <ONumberInput value={formData.programmingConfig.submissionAttempts}
                    onChange={v => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, submissionAttempts: Math.max(1, Math.min(10, v)) } }))} min={1} max={10} />
                </div>
              </div>
            )}
          </div>

          {validationErrors.programmingTotalMarks && touchedFields.has('programmingTotalMarks') && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff2f2', border: `1px solid ${D.red}25` }}>
              <AlertCircle size={13} style={{ color: D.red }} /><p className="text-xs" style={{ color: D.red }}>{validationErrors.programmingTotalMarks}</p>
            </div>
          )}
        </div>
      </div>
    );
  }, [formData, validationErrors, touchedFields, markTouched, programmingAllocatedMarks, programmingLevelMismatch, shouldShowScoringSection, getProgrammingTotalQuestions, questionFlowOptions, updateLevelScoringConfig, configOptions]);
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
          label: 'Remind Me to Grade By',
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
    }> = ({ value, onChange, disabled, minDate, minTime, placeholder = "Select date & time", error, touched }) => {
      const [isOpen, setIsOpen] = useState(false);
      const [tempDate, setTempDate] = useState<Date | null>(value);
      const pickerRef = useRef<HTMLDivElement>(null);
      const buttonRef = useRef<HTMLButtonElement>(null);

      const [calMonth, setCalMonth] = useState(value ? value.getMonth() : new Date().getMonth());
      const [calYear, setCalYear] = useState(value ? value.getFullYear() : new Date().getFullYear());

      // Sync state whenever picker opens
      useEffect(() => {
        if (isOpen) {
          setTempDate(value);
          const base = value ?? new Date();
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

      // Smart popup positioning
      const getPopupStyle = (): React.CSSProperties => {
        if (!buttonRef.current) return { width: 320, top: 0, left: 0 };
        const rect = buttonRef.current.getBoundingClientRect();
        const POPUP_WIDTH = 320;
        // Use actual measured height if available (from previous render), fallback to estimate
        const POPUP_HEIGHT = pickerRef.current ? pickerRef.current.offsetHeight || 440 : 440;
        const MARGIN = 8;

        // Get modal container boundaries
        const modalContainer = document.querySelector('.es-main');
        const modalRect = modalContainer?.getBoundingClientRect();

        let left = rect.left;
        let top: number;

        // Calculate space within modal if available, otherwise use viewport
        const boundsRect = modalRect ?? { top: MARGIN, bottom: window.innerHeight - MARGIN, left: MARGIN, right: window.innerWidth - MARGIN };
        const availableSpace = {
          top: rect.top - boundsRect.top,
          bottom: boundsRect.bottom - rect.bottom,
          left: rect.left - boundsRect.left,
          right: boundsRect.right - rect.right,
        };

        // Horizontal positioning — clamp within modal/viewport
        if (left + POPUP_WIDTH > boundsRect.right - MARGIN) {
          left = boundsRect.right - POPUP_WIDTH - MARGIN;
        }
        if (left < boundsRect.left + MARGIN) {
          left = boundsRect.left + MARGIN;
        }

        // Vertical positioning — prefer below if enough space, otherwise above
        const spaceBelow = availableSpace.bottom;
        const spaceAbove = availableSpace.top;

        if (spaceBelow >= POPUP_HEIGHT) {
          // Enough space below — show below
          top = rect.bottom + MARGIN;
        } else if (spaceAbove >= POPUP_HEIGHT) {
          // Not enough below but enough above — show above
          top = rect.top - POPUP_HEIGHT - MARGIN;
        } else if (spaceBelow >= spaceAbove) {
          // More space below than above — show below (will be clamped)
          top = rect.bottom + MARGIN;
        } else {
          // More space above than below — show above (will be clamped)
          top = rect.top - POPUP_HEIGHT - MARGIN;
        }

        // Hard clamp — guarantee popup never exits modal/viewport bounds
        top = Math.max(boundsRect.top + MARGIN, top);
        top = Math.min(boundsRect.bottom - POPUP_HEIGHT - MARGIN, top);

        // maxHeight so popup scrolls internally if space is still too small
        const maxHeight = boundsRect.bottom - top - MARGIN;

        return { width: POPUP_WIDTH, top, left, maxHeight, overflowY: 'auto' };
      };
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const minutes = Array.from({ length: 60 }, (_, i) => i);

      return (
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => !disabled && setIsOpen(v => !v)}
            disabled={disabled}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${error && touched ? 'border-red-300 bg-red-50/30' : 'border-[#ecedf1] bg-white'
              } ${disabled
                ? 'bg-[#fafafa] text-[#9b9bae] cursor-not-allowed'
                : 'hover:border-[#F27757] focus:border-[#F27757] focus:ring-1 focus:ring-[rgba(242,119,87,0.12)]'
              }`}
          >
            <span className={`truncate ${!value ? 'text-[#9b9bae]' : 'text-[#1a1a2e]'}`}>
              {formatDateTime(value)}
            </span>
            <Calendar size={14} className="flex-shrink-0" style={{ color: D.textMuted }} />
          </button>

          {error && touched && (
            <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>
          )}

          {isOpen && !disabled && (
            <div
              ref={pickerRef}
              className="fixed z-[9999] p-4 rounded-xl shadow-2xl border bg-white"
              style={getPopupStyle()}
            >
              {/* Calendar header */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                      else setCalMonth(m => m - 1);
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-sm font-bold">{months[calMonth]} {calYear}</span>
                  <button
                    onClick={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                      else setCalMonth(m => m + 1);
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-100"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold py-1" style={{ color: D.textMuted }}>{d}</div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays(calYear, calMonth).map((day, idx) => {
                    const isDisabled = day ? isDayDisabled(day) : true;
                    const isSelected = tempDate && day === tempDate.getDate() &&
                      calMonth === tempDate.getMonth() && calYear === tempDate.getFullYear();
                    const isToday = !isSelected && day === new Date().getDate() &&
                      calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
                    return (
                      <button
                        key={idx}
                        onClick={() => day && !isDisabled && handleDateSelect(day)}
                        disabled={!day || isDisabled}
                        className="h-8 w-8 text-xs rounded-lg flex items-center justify-center transition-all mx-auto"
                        style={{
                          background: isSelected ? D.orange : 'transparent',
                          color: isSelected ? '#fff' : isDisabled ? '#d1d5db' : '#1a1a2e',
                          fontWeight: isToday ? 700 : 400,
                          outline: isToday && !isSelected ? `1.5px solid ${D.orange}` : 'none',
                          cursor: !day || isDisabled ? 'default' : 'pointer',
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time picker — always shown so user can set time before picking date */}
              <div className="border-t pt-3" style={{ borderColor: D.border }}>
                <div className="text-xs font-semibold mb-2" style={{ color: D.textMuted }}>Time</div>
                <div className="flex gap-2">
                  <select
                    value={tempDate?.getHours() ?? 0}
                    onChange={e => {
                      const h = parseInt(e.target.value);
                      if (!tempDate) {
                        const d = new Date(); d.setHours(h, 0, 0, 0); setTempDate(d);
                      } else handleTimeChange(h, tempDate.getMinutes());
                    }}
                    className="flex-1 px-2 py-1.5 text-sm rounded-lg border outline-none"
                    style={{ borderColor: D.border }}
                  >
                    {hours.map(h => {
                      const isDisabled = tempDate && minDate && minTime
                        ? isTimeDisabled(tempDate, h, tempDate?.getMinutes() ?? 0)
                        : false;
                      return (
                        <option key={h} value={h} disabled={!!isDisabled}>
                          {h.toString().padStart(2, '0')}:00
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={tempDate?.getMinutes() ?? 0}
                    onChange={e => {
                      const m = parseInt(e.target.value);
                      if (!tempDate) {
                        const d = new Date(); d.setHours(0, m, 0, 0); setTempDate(d);
                      } else handleTimeChange(tempDate.getHours(), m);
                    }}
                    className="flex-1 px-2 py-1.5 text-sm rounded-lg border outline-none"
                    style={{ borderColor: D.border }}
                  >
                    {minutes.map(m => {
                      const isDisabled = tempDate && minDate && minTime
                        ? isTimeDisabled(tempDate, tempDate?.getHours() ?? 0, m)
                        : false;
                      return (
                        <option key={m} value={m} disabled={!!isDisabled}>
                          :{m.toString().padStart(2, '0')}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

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
                  onClick={() => { setTempDate(value); setIsOpen(false); }}
                  className="text-xs font-semibold"
                  style={{ color: D.textMuted }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="text-xs font-semibold px-3 py-1 rounded-lg text-white"
                  style={{ background: D.orange }}
                >
                  OK
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
          <h3 className="text-sm font-bold" style={{ color: '#000000', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
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
                      style={{ background: isEnabled ? D.orange : '#e2e3e8' }}
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
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-[#fafafa]" style={{ borderColor: D.border }}>
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
  }, [formData.schedule, validationErrors, touchedFields]);
  // ==========================================================================
  // RENDER: Notification Settings
  // ==========================================================================
  const renderNotifications = useCallback(() => {
    const rows = [
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
      },
      {
        key: 'notifyStudent',
        label: 'Notify Student',
        description: formData.notifications.notifyStudent
          ? 'Students will be notified when grades/feedback are released.'
          : 'Students will not be notified about grades or feedback.',
        icon: <Bell size={14} />,
        color: D.orange,
        value: formData.notifications.notifyStudent,
        onChange: (v: boolean) => setFormData(prev => ({ ...prev, notifications: { ...prev.notifications, notifyStudent: v } })),
      },
    ];

    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Bell size={13} /></div>
          <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Notifications</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: D.textMuted }}>Configure who gets notified about submissions and grading.</p>
        <div className="space-y-2">
          {rows.map(row => (
            <div key={row.key} className="flex items-start justify-between p-3 rounded-xl border" style={{ borderColor: D.border, background: D.bg }}>
              <div className="flex items-start gap-2.5 flex-1 mr-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: row.color + '12', color: row.color }}>{row.icon}</div>
                <div>
                  <div className="text-xs font-semibold leading-tight" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{row.label}</div>
                  <div className="text-[10.5px] mt-0.5 leading-relaxed" style={{ color: D.textMuted }}>{row.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] font-bold" style={{ color: row.value ? D.emerald : D.red }}>{row.value ? 'Yes' : 'No'}</span>
                <button type="button" onClick={() => row.onChange(!row.value)}
                  className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                  style={{ background: row.value ? D.emerald : '#e2e3e8' }}>
                  <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${row.value ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [formData.notifications]);

  // ==========================================================================
  // RENDER: Grade Settings
  // ==========================================================================
  const renderGradeSettings = useCallback(() => {
    const et = formData.exerciseType;
    const sep = formData.grades.separateMarks;
    const g = formData.grades;
    const ve = validationErrors;
    const tf = touchedFields;

    // Inside renderGradeSettings, modify the GradeRow component to be memoized
    const GradeRow = React.memo(({ icon, color, label, info, fieldKey, value, onChange, autoValue, error, errorTouched }: {
      icon: React.ReactNode; color: string; label: string; info: string; fieldKey?: string;
      value?: number | null; onChange?: (v: number) => void;
      autoValue?: number | string; error?: string; errorTouched?: boolean;
    }) => (
      <div className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: D.border }}>
        <div className="flex items-center gap-2.5 flex-1 mr-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '12', color }}>{icon}</div>
          <div>
            <div className="flex items-center gap-0.5">
              <span className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{label}</span>
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
                className="w-full px-3 py-1.5 text-sm rounded-lg border" style={{ borderColor: D.border, background: D.surface, color: D.textMuted }} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold" style={{ color: D.orange }}>Auto</span>
            </div>
          ) : (
            <ONumberInput
              key={fieldKey} // Add unique key to prevent remounting
              value={value ?? 0}
              onChange={onChange!}
              onBlur={() => fieldKey && markTouched(fieldKey)}
              placeholder="0"
              error={error}
              touched={errorTouched}
            />
          )}
        </div>
      </div>
    ));
    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Award size={13} /></div>
          <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Grade Settings</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: D.textMuted }}>Configure grading based on the selected exercise type.</p>

        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
          <div className="px-3">
            {/* MCQ — Grade auto, Grade to Pass user-entered */}
            {et === 'MCQ' && (<>
              <GradeRow icon={<List size={13} />} color={D.blue} label="Grade" info="Auto-calculated from MCQ total marks"
                autoValue={formData.totalMarks || 'Auto'} />
              <GradeRow icon={<Award size={13} />} color={D.blue} label="Grade to Pass" info="Minimum marks to pass — cannot exceed Grade"
                fieldKey="mcqGradeToPass" value={g.mcqGradeToPass} onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, mcqGradeToPass: v } }))}
                error={ve.mcqGradeToPass} errorTouched={tf.has('mcqGradeToPass')} />
            </>)}

            {/* Programming */}
            {et === 'Programming' && (<>
              <GradeRow icon={<Terminal size={13} />} color={D.orange} label="Grade" info="Total marks for the programming exercise"
                fieldKey="programmingGrade" value={g.programmingGrade} onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGrade: v } }))}
                error={ve.programmingGrade} errorTouched={tf.has('programmingGrade')} />
              <GradeRow icon={<Award size={13} />} color={D.orange} label="Grade to Pass" info="Minimum marks required to pass — cannot exceed Grade"
                fieldKey="programmingGradeToPass" value={g.programmingGradeToPass} onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))}
                error={ve.programmingGradeToPass} errorTouched={tf.has('programmingGradeToPass')} />
            </>)}

            {/* Combined */}
            {et === 'Combined' && (<>
              {/* Separate Marks toggle row */}
              <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: D.border }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.purple + '12', color: D.purple }}><Layers size={13} /></div>
                  <div>
                    <span className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Separate Marks</span>
                    <p className="text-[10.5px]" style={{ color: D.textMuted }}>Grade each section (MCQ & Programming) independently</p>
                  </div>
                </div>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, grades: { ...prev.grades, separateMarks: !sep } }))}
                  className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                  style={{ background: sep ? D.orange : '#e2e3e8' }}>
                  <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${sep ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                </button>
              </div>

              {!sep ? (<>
                {(() => {
                  const ag = (formData.totalMarksMCQ || 0) + (formData.totalMarksProgramming || 0); return (<>
                    <GradeRow icon={<Layers size={13} />} color={D.emerald} label="Grade" info="Auto-calculated: MCQ total + Programming total"
                      autoValue={ag > 0 ? ag : 'Auto'} />
                    <GradeRow icon={<Award size={13} />} color={D.emerald} label="Grade to Pass" info={`Overall passing marks — cannot exceed Grade${ag > 0 ? ` (${ag})` : ''}`}
                      fieldKey="combinedGradeToPass" value={g.combinedGradeToPass} onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, combinedGradeToPass: v } }))}
                      error={ve.combinedGradeToPass} errorTouched={tf.has('combinedGradeToPass')} />
                  </>);
                })()}
              </>) : (<>
                <div className="pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: D.blue }}>MCQ Section</div>
                <GradeRow icon={<List size={13} />} color={D.blue} label="MCQ Grade" info="Auto-calculated from MCQ Marks in Exercise Details"
                  autoValue={formData.totalMarksMCQ || 'Auto'} />
                <GradeRow icon={<Award size={13} />} color={D.blue} label="MCQ Grade to Pass" info={`Minimum marks to pass the MCQ section — cannot exceed MCQ Grade${formData.totalMarksMCQ ? ` (${formData.totalMarksMCQ})` : ''}`}
                  fieldKey="mcqGradeToPass" value={g.mcqGradeToPass} onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, mcqGradeToPass: v } }))}
                  error={ve.mcqGradeToPass} errorTouched={tf.has('mcqGradeToPass')} />
                <div className="pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: D.orange }}>Programming Section</div>
                <GradeRow icon={<Terminal size={13} />} color={D.orange} label="Programming Grade" info="Auto-calculated from Programming Marks in Exercise Details"
                  autoValue={formData.totalMarksProgramming || 'Auto'} />
                <GradeRow icon={<Award size={13} />} color={D.orange} label="Programming Grade to Pass" info={`Minimum marks to pass the programming section — cannot exceed Prog. Grade${formData.totalMarksProgramming ? ` (${formData.totalMarksProgramming})` : ''}`}
                  fieldKey="programmingGradeToPass" value={g.programmingGradeToPass} onChange={v => setFormData(prev => ({ ...prev, grades: { ...prev.grades, programmingGradeToPass: v } }))}
                  error={ve.programmingGradeToPass} errorTouched={tf.has('programmingGradeToPass')} />
              </>)}
            </>)}
          </div>
        </div>

        {/* Additional Options */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={13} style={{ color: D.purple }} />
            <span className="text-xs font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Additional Options</span>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
            {[
              { key: 'anonymousSubmissions', label: 'Anonymous Submissions', sub: 'Enable for unbiased grading — graders won\'t see student names', icon: <EyeOff size={14} />, color: D.purple, val: formData.additionalOptions.anonymousSubmissions },
              { key: 'hideGraderIdentity', label: 'Hide Grader Identity', sub: 'Hide evaluator details from students', icon: <Shield size={14} />, color: D.blue, val: formData.additionalOptions.hideGraderIdentity },
            ].map((row, idx) => (
              <div key={row.key} className="flex items-center justify-between px-3 py-2.5 transition-all"
                style={{ background: D.bg, borderTop: idx > 0 ? `1px solid ${D.border}` : 'none' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: row.color + '12', color: row.color }}>{row.icon}</div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{row.label}</div>
                    <div className="text-[10.5px]" style={{ color: D.textMuted }}>{row.sub}</div>
                  </div>
                </div>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, additionalOptions: { ...prev.additionalOptions, [row.key]: !row.val } }))}
                  className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                  style={{ background: row.val ? D.orange : '#e2e3e8' }}>
                  <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${row.val ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [formData.exerciseType, formData.grades, formData.additionalOptions, formData.totalMarks, formData.totalMarksMCQ, formData.totalMarksProgramming, validationErrors, touchedFields]);

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
            {mcqTabDone && <span className="ml-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: D.emerald, color: '#fff' }}><Check size={7} strokeWidth={3} /></span>}
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
      case 'Question Configuration':
        if (formData.exerciseType === 'MCQ') return renderMCQConfiguration();
        if (formData.exerciseType === 'Programming') return renderProgrammingConfiguration();
        if (formData.exerciseType === 'Combined') return renderCombinedConfiguration();
        return null;
      case 'Schedule': return renderScheduleConfiguration();
      case 'Notifications': return renderNotifications();
      case 'Grade Settings': return renderGradeSettings();
      default: return null;
    }
  }, [steps, currentStep, formData.exerciseType, renderExerciseDetails, renderMCQConfiguration, renderProgrammingConfiguration, renderCombinedConfiguration, renderScheduleConfiguration, renderNotifications, renderGradeSettings]);

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================
  const BreadcrumbArrow = () => <span className="mx-1" style={{ color: D.orange, fontWeight: 700, fontSize: 13 }}>»</span>;
  const isLastStep = currentStep === steps[steps.length - 1]?.id;
  const currentStepTitle = steps.find(s => s.id === currentStep)?.title ?? '';
  const step1Id = steps.find(s => s.title === 'Exercise Details')?.id ?? 1;
  const step1Unlocked = savedSteps.has(step1Id);
  const isOnStep1 = currentStep === step1Id;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(6px)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        .es-main, .es-main * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .es-main ::-webkit-scrollbar { width: 8px; height: 8px; }
        .es-main ::-webkit-scrollbar-track { background: #e5e7eb; border-radius: 10px; }
        .es-main ::-webkit-scrollbar-thumb { background: #6b7280; border-radius: 10px; border: 1px solid #e5e7eb; }
        .es-main ::-webkit-scrollbar-thumb:hover { background: #374151; }
        .es-main ::-webkit-scrollbar-thumb:active { background: #1f2937; }
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
        style={{ height: '94vh', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.12)' }}>

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
              <button onClick={() => setShowSummaryModal(true)} className="px-2 py-1 text-xs font-medium rounded transition-colors hover:bg-gray-100" style={{ color: D.textSub }}>Preview</button>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 hover:bg-gray-100" style={{ color: D.textMuted }}>
              <X size={14} />
            </button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── SIDEBAR ── */}
          <aside className="w-44 flex-shrink-0 flex flex-col py-2.5 px-2 overflow-y-auto" style={{ background: D.surface, borderRight: `1px solid ${D.border}` }}>
            <div className="space-y-0.5">
              {steps.map((step, idx) => {
                const active = step.active;

                // Use isStepCompleted for accurate tick — green tick ONLY when ALL required fields filled
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

                // Show green tick ONLY if the step is truly complete (all required fields filled) and not currently active
                const showDone = !active && stepFullyDone;

                // Step 1 gate: non-first steps are locked until Exercise Details is saved
                const isStep1 = step.title === 'Exercise Details';
                const isLocked_step = !isStep1 && !step1Unlocked;

                // Icon: lock if gated, green check if fully done, else normal step icon
                const iconNode = isLocked_step
                  ? <Lock size={8} />
                  : showDone
                    ? <Check size={9} strokeWidth={3} />
                    : <span style={{ fontSize: 8 }}>{step.icon}</span>;

                // Dot colour
                const dotBg = isLocked_step ? D.surface2 : active ? D.orange : showDone ? D.emerald : D.surface2;
                const dotColor = isLocked_step ? D.textMuted : active || showDone ? '#fff' : D.textMuted;
                const dotShadow = active && !isLocked_step ? `0 2px 6px ${D.orangeGlow}` : 'none';

                // Label colour
                const labelColor = isLocked_step ? D.textMuted : active ? D.orange : showDone ? D.textSub : D.textMuted;

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
                            style={{ color: labelColor, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                            {step.title}
                          </div>
                          {active && !isLocked_step && <div className="text-[9px] mt-0.5 font-medium" style={{ color: D.orange + 'aa' }}>{step.subtitle}</div>}
                          {!active && stepHasError && !isLocked_step && <div className="text-[9px] mt-0.5 font-medium" style={{ color: D.red }}>Incomplete</div>}
                        </div>
                        {stepHasError && !isLocked_step && (
                          <span className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black"
                            style={{ background: D.red, color: '#fff', lineHeight: 1 }}>
                            !
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto pt-2 border-t space-y-2" style={{ borderColor: D.border }}>
              {/* Circular progress ring */}
              {(() => {
                const total = steps.length;
                const done = steps.filter(s => isStepCompleted(s.id)).length;
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
                      <text x="37" y="33" textAnchor="middle" fontSize="14" fontWeight="800" fill={ringColor} fontFamily="Plus Jakarta Sans, sans-serif">{pct}%</text>
                      <text x="37" y="47" textAnchor="middle" fontSize="9" fontWeight="600" fill={D.textMuted} fontFamily="Plus Jakarta Sans, sans-serif">{done}/{total} steps</text>
                    </svg>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: D.textMuted }}>Completed</span>
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
                {savedSteps.has(currentStep) && (
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

                {/* Save & Finish — last step, hidden when locked */}
                {isLastStep && !isLocked && (
                  <button onClick={handleComplete} disabled={busy}
                    className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(135deg, ${D.emerald}, #059669)`, boxShadow: `0 3px 10px ${D.emerald}40`, minWidth: 110 }}>
                    {isLoading ? <><Loader2 size={12} className="animate-spin" />Saving…</> : <><FileText size={12} />Save &amp; Finish</>}
                  </button>
                )}
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