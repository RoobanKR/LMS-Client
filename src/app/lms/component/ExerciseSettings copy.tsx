import React, { useEffect, useState, useCallback, useMemo, useRef, ChangeEvent } from 'react';
import {
  X, ChevronRight, Settings2, FileCode,
  ArrowLeft, ArrowRight, Code, FileText,
  Layers, Calendar, Bell, Award,
  Plus, Minus, Loader2, Mail,
  MessageCircle, Clock, Lock, Eye,
  ChevronDown, Shuffle,
  Check, List, Terminal,
  AlertCircle, Info, Calculator,
  Home, HelpCircle,
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
    startDate: string; endDate: string; gracePeriodEnabled: boolean;
    gracePeriodAllowed?: boolean; gracePeriodDate?: string; extendedDays?: number;
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

  useEffect(() => { setInternal(value.toString()); }, [value]);

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

  if (type === 'textarea') return (
    <div className="w-full">
      <textarea value={internal} onChange={handleChange as any} onBlur={() => { onChange(internal); onBlur?.(); }} placeholder={placeholder} disabled={disabled} readOnly={readOnly} id={id} rows={2}
        className={baseClass + ' resize-none leading-relaxed'} />
      {error && touched && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}
    </div>
  );

  return (
    <div className="w-full">
      <input type={type} value={internal} onChange={handleChange as any} onBlur={() => { onChange(internal); onBlur?.(); }} placeholder={placeholder} disabled={disabled} readOnly={readOnly} id={id}
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
  const [disp, setDisp] = useState(value === 0 ? '' : value.toString());

  useEffect(() => { setDisp(value === 0 ? '' : value.toString()); }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
      setDisp(raw);
      if (raw === '') onChange(0);
      else { const n = parseFloat(raw); if (!isNaN(n) && n >= min && n <= max) onChange(n); }
    }
  };

  const handleBlur = () => {
    if (disp === '') { onChange(0); setDisp(''); }
    else {
      const n = parseFloat(disp);
      if (isNaN(n) || n < min) { setDisp(min.toString()); onChange(min); }
      else if (n > max) { setDisp(max.toString()); onChange(max); }
    }
    onBlur?.();
  };

  return (
    <div className="w-full">
      <input type="text" inputMode="decimal" value={disp} onChange={handleChange} onBlur={handleBlur}
        placeholder={placeholder} id={id} disabled={disabled} style={style}
        className={[
          'w-full px-3 py-2 text-sm rounded-lg border transition-all duration-150 outline-none font-[Plus_Jakarta_Sans,sans-serif]',
          error && touched ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-1 focus:ring-red-100' : 'border-[#ecedf1] bg-white focus:border-[#F27757] focus:ring-1 focus:ring-[rgba(242,119,87,0.12)]',
          disabled ? 'bg-[#fafafa] text-[#9b9bae] cursor-not-allowed' : 'text-[#1a1a2e]',
          className,
        ].filter(Boolean).join(' ')}
      />
      {error && touched && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}
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

// ─── DateRowPicker (FIXED: extracted as proper component to avoid hooks-in-map) ──
const DateRowPicker: React.FC<{
  label: string; fieldKey: string; icon: string; color: string; toggleable: boolean;
  data: any; isEnabled: boolean; activePicker: { field: string | null; type: string | null };
  setActivePicker: (v: { field: string | null; type: string | null }) => void;
  onUpdate: (field: string, type: string, value: any) => void;
  onToggleEnable: () => void;
  hasError?: string; isTouched: boolean;
  generateCalendarDays: (year: number, month: number) => (number | null)[];
  isDateDisabled: (year: number, month: number, day: number, fieldKey: string) => boolean;
  isEmptyDate?: boolean;
}> = ({
  label, fieldKey, icon, color, toggleable, data, isEnabled, activePicker,
  setActivePicker, onUpdate, onToggleEnable, hasError, isTouched,
  generateCalendarDays, isDateDisabled, isEmptyDate = false
}) => {
    const [calMonth, setCalMonth] = useState(data?.month && !isNaN(data.month) ? Number(data.month) : new Date().getMonth() + 1);
    const [calYear, setCalYear] = useState(data?.year && !isNaN(data.year) ? Number(data.year) : new Date().getFullYear());
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const hour = data?.hour ?? (fieldKey === 'startDate' ? 0 : 23);
    const minute = data?.minute ?? (fieldKey === 'startDate' ? 0 : 59);
    const period = hour >= 12 ? 'PM' : 'AM';
    const dh = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    const dateStr = isEmptyDate
      ? 'Not set'
      : (data?.day && data?.month && data?.year && data.day > 0 && data.month > 0 && data.year > 0
        ? `${String(data.day).padStart(2, '0')} ${months[Number(data.month) - 1] || 'Jan'} ${data.year}, ${dh}:${String(minute).padStart(2, '0')} ${period}`
        : 'Select date & time');

    const isOpen = (type: string) => activePicker?.field === fieldKey && activePicker?.type === type;
    const closePicker = () => setActivePicker({ field: null, type: null });

    // Handle click outside
    useEffect(() => {
      if (!isOpen('date') && !isOpen('time')) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          closePicker();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen('date'), isOpen('time')]);

    // Calculate picker position
    const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('bottom');

    useEffect(() => {
      if ((isOpen('date') || isOpen('time')) && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const pickerHeight = 320; // Approximate height of picker

        // Position above if there's more space, otherwise below
        if (spaceBelow < pickerHeight && spaceAbove > pickerHeight) {
          setPickerPosition('top');
        } else {
          setPickerPosition('bottom');
        }
      }
    }, [isOpen('date'), isOpen('time')]);

    return (
      <div ref={containerRef} className="rounded-lg border overflow-hidden transition-all duration-200 relative"
        style={{
          borderColor: !isEnabled ? D.border : (hasError && isTouched ? D.red + '40' : color + '25'),
          background: !isEnabled ? D.surface : '#fff',
          opacity: !isEnabled ? 0.6 : 1
        }}>
        <div className="flex items-center gap-2 px-3 py-2">
          {toggleable && (
            <button type="button" onClick={onToggleEnable}
              className="relative inline-flex items-center h-5 w-9 flex-shrink-0 rounded-full border-transparent transition-colors duration-200 p-[2px]"
              style={{ background: isEnabled ? D.orange : '#e2e3e8' }}>
              <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${isEnabled ? 'translate-x-[17px]' : 'translate-x-0'}`} />
            </button>
          )}
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: color + '12', color }}>
            {icon === '▶' && <ArrowRight size={12} />}
            {icon === '⏹' && <Square size={12} />}
            {icon === '↗' && <ArrowUpRight size={12} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold" style={{ color: isEnabled ? color : D.textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{label}</div>
          </div>
          <div className="relative">
            <button
              ref={buttonRef}
              disabled={!isEnabled}
              onClick={() => {
                if (!isEnabled) return;
                setActivePicker({ field: fieldKey, type: 'date' });
                setCalMonth(data?.month && !isNaN(data.month) ? Number(data.month) : new Date().getMonth() + 1);
                setCalYear(data?.year && !isNaN(data.year) ? Number(data.year) : new Date().getFullYear());
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={{
                borderColor: isOpen('date') || isOpen('time') ? color : D.border,
                background: isOpen('date') || isOpen('time') ? color + '08' : D.surface,
                color: (data?.day && data.day > 0) ? D.textMain : D.textMuted,
                fontFamily: 'Plus Jakarta Sans, sans-serif'
              }}>
              <Calendar size={12} style={{ color: isEnabled ? color : D.textMuted }} />
              {dateStr}
            </button>

            {/* Date Picker */}
            {isOpen('date') && (
              <div
                ref={pickerRef}
                className="fixed z-[100] p-3 rounded-xl shadow-2xl border"
                style={{
                  background: D.bg,
                  borderColor: D.border,
                  width: 270,
                  top: buttonRef.current ?
                    (pickerPosition === 'bottom'
                      ? buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 4
                      : buttonRef.current.getBoundingClientRect().top + window.scrollY - 320)
                    : 'auto',
                  left: buttonRef.current ?
                    Math.min(
                      Math.max(buttonRef.current.getBoundingClientRect().left + window.scrollX - 100, 10),
                      window.innerWidth - 280
                    )
                    : 'auto'
                }}>
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => {
                      if (calMonth === 1) {
                        setCalMonth(12);
                        setCalYear(calYear - 1);
                      } else setCalMonth(calMonth - 1);
                    }}
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-gray-100"
                    style={{ color: D.textMuted }}>
                    <ChevronLeft size={13} />
                  </button>
                  <span className="text-xs font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {monthsFull[calMonth - 1]} {calYear}
                  </span>
                  <button
                    onClick={() => {
                      if (calMonth === 12) {
                        setCalMonth(1);
                        setCalYear(calYear + 1);
                      } else setCalMonth(calMonth + 1);
                    }}
                    className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-gray-100"
                    style={{ color: D.textMuted }}>
                    <ChevronRight size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-center text-[9px] font-bold py-0.5" style={{ color: D.textHint }}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {generateCalendarDays(calYear, calMonth).map((day, idx) => {
                    const disabled = day ? isDateDisabled(calYear, calMonth, day, fieldKey) : false;
                    const sel = data?.day === day && data?.month === calMonth && data?.year === calYear;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (day && !disabled) {
                            onUpdate(fieldKey, 'day', day);
                            onUpdate(fieldKey, 'month', calMonth);
                            onUpdate(fieldKey, 'year', calYear);
                            setActivePicker({ field: fieldKey, type: 'time' });
                          }
                        }}
                        disabled={!day || disabled}
                        className="h-7 w-7 mx-auto text-[11px] rounded-lg flex items-center justify-center transition-all"
                        style={{
                          background: sel ? color : 'transparent',
                          color: sel ? '#fff' : disabled ? D.textHint : D.textSub,
                          cursor: !day || disabled ? 'default' : 'pointer',
                          fontWeight: sel ? 700 : 500,
                          fontFamily: 'Plus Jakarta Sans, sans-serif'
                        }}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 pt-2 flex justify-between border-t" style={{ borderColor: D.border }}>
                  <button
                    onClick={() => setActivePicker({ field: fieldKey, type: 'time' })}
                    className="flex items-center gap-1 text-xs font-bold"
                    style={{ color }}>
                    <Clock size={10} />Set time
                  </button>
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
                    className="text-xs font-bold"
                    style={{ color }}>
                    Today
                  </button>
                </div>
              </div>
            )}

            {/* Time Picker */}
            {isOpen('time') && (
              <div
                ref={pickerRef}
                className="fixed z-[100] p-3 rounded-xl shadow-2xl border"
                style={{
                  background: D.bg,
                  borderColor: D.border,
                  width: 250,
                  top: buttonRef.current ?
                    (pickerPosition === 'bottom'
                      ? buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 4
                      : buttonRef.current.getBoundingClientRect().top + window.scrollY - 280)
                    : 'auto',
                  left: buttonRef.current ?
                    Math.min(
                      Math.max(buttonRef.current.getBoundingClientRect().left + window.scrollX - 100, 10),
                      window.innerWidth - 260
                    )
                    : 'auto'
                }}>
                <h4 className="text-xs font-bold mb-2" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Select Time</h4>
                <TimePicker
                  value={{ hour: data?.hour ?? (fieldKey === 'startDate' ? 0 : 23), minute: data?.minute ?? (fieldKey === 'startDate' ? 0 : 59) }}
                  onChange={t => {
                    onUpdate(fieldKey, 'hour', t.hour);
                    onUpdate(fieldKey, 'minute', t.minute);
                  }}
                  disabled={!isEnabled}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={closePicker}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ background: color }}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
  isEditing = false, tabType = 'We_Do', initialData, exercise_Id
}) => {
  injectFonts();

  const [currentStep, setCurrentStep] = useState(isEditing ? 2 : 1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [activePicker, setActivePicker] = useState<{ field: string | null; type: string | null }>({ field: null, type: null });
  const [mcqScoringOpen, setMcqScoringOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isScoringOpen, setIsScoringOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const configBtnRef = useRef<HTMLButtonElement>(null);
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
      cutoffEnabled: true,
      cutoffDate: { day: 0, month: 0, year: 0, hour: 23, minute: 59 },
      gracePeriodEnabled: false,
      gracePeriodDate: { day: 0, month: 0, year: 0, hour: 23, minute: 59 },
    },
    notifyUsers: true, notifyGmail: false, notifyWhatsApp: false, gradeSheet: true,
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
      schedule: { allowSubmissions: true, startDate: parseDate(avail.startDate, dS), cutoffEnabled: true, cutoffDate: parseDate(avail.endDate, dE), gracePeriodEnabled: avail.gracePeriodAllowed ?? false, gracePeriodDate: parseDate(avail.gracePeriodDate, dG) },
      notifyUsers: notif.notifyUsers ?? true, notifyGmail: notif.notifyGmail ?? false, notifyWhatsApp: notif.notifyWhatsApp ?? false, gradeSheet: notif.gradeSheet ?? true,
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
    const endDate = parseDate(avail.endDate);
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
        // FIXED: Only set dates if they exist in the database
        startDate: startDate || { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
        cutoffEnabled: true,
        cutoffDate: endDate || { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
        gracePeriodEnabled: avail.gracePeriodAllowed ?? false,
        gracePeriodDate: graceDate || { day: 0, month: 0, year: 0, hour: 0, minute: 0 },
      },
      notifyUsers: notif.notifyUsers ?? true,
      notifyGmail: notif.notifyGmail ?? false,
      notifyWhatsApp: notif.notifyWhatsApp ?? false,
      gradeSheet: notif.gradeSheet ?? true,
    }));
    setCurrentStep(1);
    setValidationErrors({});
    setTouchedFields(new Set());
  }, [isEditing, initialData]);



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
    if (!isEditing) steps.push({ id: 1, title: 'Exercise Type', subtitle: 'Select type', completed: currentStep > 1, active: currentStep === 1, icon: <Settings2 size={12} /> });
    let next = isEditing ? 1 : 2;
    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      steps.push({ id: next, title: 'Module', subtitle: 'Languages', completed: currentStep > next, active: currentStep === next, icon: <Code size={12} /> }); next++;
    }
    const did = next;
    steps.push({ id: did, title: 'Exercise Details', subtitle: 'Info & Time', completed: currentStep > did, active: currentStep === did, icon: <FileText size={12} /> }); next = did + 1;
    if (formData.exerciseType === 'Combined') {
      const qpid = next - 0.5;
      steps.push({ id: qpid, title: 'Question Configuration', subtitle: 'MCQ & Programming', completed: currentStep > qpid, active: currentStep === qpid, icon: <Layers size={12} /> });
      const mcqid = next; steps.push({ id: mcqid, title: 'MCQ Configuration', subtitle: 'Configure MCQ', completed: currentStep > mcqid, active: currentStep === mcqid, icon: <List size={12} />, indentLevel: 1, isChild: true }); next = mcqid + 1;
      const pid = next; steps.push({ id: pid, title: 'Programming Configuration', subtitle: 'Configure programming', completed: currentStep > pid, active: currentStep === pid, icon: <Terminal size={12} />, indentLevel: 1, isChild: true }); next = pid + 1;
    } else if (formData.exerciseType === 'MCQ') {
      const mid = next; steps.push({ id: mid, title: 'MCQ Configuration', subtitle: 'Configure MCQ', completed: currentStep > mid, active: currentStep === mid, icon: <List size={12} /> }); next = mid + 1;
    } else if (formData.exerciseType === 'Programming') {
      const pid = next; steps.push({ id: pid, title: 'Programming Configuration', subtitle: 'Configure programming', completed: currentStep > pid, active: currentStep === pid, icon: <Terminal size={12} /> }); next = pid + 1;
    }
    const sid = next; steps.push({ id: sid, title: 'Schedule', subtitle: 'Dates & Times', completed: currentStep > sid, active: currentStep === sid, icon: <Calendar size={12} /> }); next = sid + 1;
    const fid = next; steps.push({ id: fid, title: 'Notification', subtitle: 'Review & Notify', completed: currentStep > fid, active: currentStep === fid, icon: <Bell size={12} /> });
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

    if (formData.programmingConfig.questionConfigType === 'general') {
      // Add validation for question count
      if (formData.programmingConfig.generalQuestionCount <= 0) {
        e.programmingGeneralQuestionCount = 'Number of questions must be greater than 0';
      }

      if (formData.programmingConfig.scoreSettings.scoreType === 'equalDistribution') {
        const alloc = formData.programmingConfig.generalQuestionCount * formData.programmingConfig.scoreSettings.equalDistribution;
        if (!isApproximatelyEqual(alloc, tot) && tot > 0) e.programmingTotalMarks = `Allocated (${alloc.toFixed(2)}) must equal total (${tot})`;
      }
    } else if (formData.programmingConfig.questionConfigType === 'levelBased') {
      const counts = formData.programmingConfig.levelBasedCounts;
      if (counts.easy <= 0) e.programmingLevelCounts_Easy = 'Easy count required';
      if (counts.medium <= 0) e.programmingLevelCounts_Medium = 'Medium count required';
      if (counts.hard <= 0) e.programmingLevelCounts_Hard = 'Hard count required';

      // Also check if any counts are provided at all
      if (counts.easy <= 0 && counts.medium <= 0 && counts.hard <= 0) {
        e.programmingLevelCounts = 'At least one question count must be greater than 0';
      }

      const ls = formData.programmingConfig.scoreSettings.levelScoringConfiguration;
      const le: Record<string, string> = {};
      (['easy', 'medium', 'hard'] as const).forEach(level => {
        if (counts[level] <= 0) return;
        const s = ls[level];
        if (!s) { le[level] = 'Scoring not configured'; return; }
        if (s.type === 'level_specific' && (!s.marksPerQuestion || s.marksPerQuestion <= 0)) le[level] = 'Marks per question must be > 0';
        else if (s.type === 'question_specific' && (!s.totalMarks || s.totalMarks <= 0)) le[level] = 'Total marks must be > 0';
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
        if (!s) { le[level] = 'Scoring not configured'; return; }
        if (s.type === 'level_specific' && (!s.marksPerQuestion || s.marksPerQuestion <= 0)) le[level] = 'Marks per question must be > 0';
        else if (s.type === 'question_specific' && (!s.totalMarks || s.totalMarks <= 0)) le[level] = 'Total marks must be > 0';
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
    const ed = formData.schedule.cutoffDate;
    const gd = formData.schedule.gracePeriodDate;

    const startSelected = sd.day > 0 && sd.month > 0 && sd.year > 0;
    const endSelected = ed.day > 0 && ed.month > 0 && ed.year > 0;
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

    // End Date validation - with same day time check
    if (!endSelected) {
      e.endDate = 'End date & time is required';
    } else if (startSelected) {
      const startDT = new Date(sd.year, sd.month - 1, sd.day, sd.hour || 0, sd.minute || 0);
      const endDT = new Date(ed.year, ed.month - 1, ed.day, ed.hour ?? 23, ed.minute ?? 59);

      // Check if end date is before start date
      if (startDT > endDT) {
        e.endDate = 'End date & time must be after start date & time';
      }
      // Check if same day but end time is before or equal to start time
      else if (startDT.getDate() === endDT.getDate() &&
        startDT.getMonth() === endDT.getMonth() &&
        startDT.getFullYear() === endDT.getFullYear() &&
        startDT.getTime() >= endDT.getTime()) {
        e.endDate = `End time must be after start time (${String(sd.hour || 0).padStart(2, '0')}:${String(sd.minute || 0).padStart(2, '0')})`;
      }
    }

    // Grace Period validation - with same day time check
    if (formData.schedule.gracePeriodEnabled) {
      if (!graceSelected) {
        e.gracePeriod = 'Grace period date & time is required';
      } else if (endSelected) {
        const endDT = new Date(ed.year, ed.month - 1, ed.day, ed.hour ?? 23, ed.minute ?? 59);
        const graceDT = new Date(gd.year, gd.month - 1, gd.day, gd.hour ?? 23, gd.minute ?? 59);

        if (endDT >= graceDT) {
          e.gracePeriod = 'Grace period must be after end date & time';
        }
        // Check if same day but grace time is before or equal to end time
        else if (endDT.getDate() === graceDT.getDate() &&
          endDT.getMonth() === graceDT.getMonth() &&
          endDT.getFullYear() === graceDT.getFullYear() &&
          endDT.getTime() >= graceDT.getTime()) {
          e.gracePeriod = `Grace period time must be after end time (${String(ed.hour ?? 23).padStart(2, '0')}:${String(ed.minute ?? 59).padStart(2, '0')})`;
        }
      }
    }

    return e;
  }, [formData.schedule, isEditing]);
  const markTouched = useCallback((f: string) => setTouchedFields(prev => new Set(prev).add(f)), []);
  const markAllTouched = useCallback((fields: string[]) => setTouchedFields(prev => { const n = new Set(prev); fields.forEach(f => n.add(f)); return n; }), []);

  const validateCurrentStep = useCallback((): boolean => {
    const step = steps.find(s => s.id === currentStep);
    if (!step) return true;
    let errors: ValidationErrors = {};
    let fields: string[] = [];

    switch (step.title) {
      case 'Exercise Type': {
        const te = validateExerciseType();
        if (te) { errors.exerciseType = te; fields.push('exerciseType'); }
        break;
      }
      case 'Module': {
        // Only required for Programming / Combined
        if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
          const me = validateModule();
          if (me.module) { errors.selectedModule = me.module; fields.push('selectedModule'); }
          if (me.languages) { errors.selectedLanguages = me.languages; fields.push('selectedLanguages'); }
        }
        break;
      }
      case 'Exercise Details': {
        errors = { ...errors, ...validateExerciseDetails() };
        fields.push('exerciseName', 'totalDuration', 'totalMarks');
        if (formData.exerciseType === 'Combined') fields.push('totalMarksMCQ', 'totalMarksProgramming');
        break;
      }
      case 'MCQ Configuration': {
        errors = { ...errors, ...validateMCQConfiguration() };
        fields.push('mcqGeneralQuestionCount', 'mcqMarksPerQuestion', 'mcqTotalMarks');
        break;
      }
      case 'Programming Configuration': {
        // Only required for Programming / Combined
        if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
          errors = { ...errors, ...validateProgrammingConfiguration() };
          if (programmingLevelMismatch) errors.programmingTotalMarks = programmingLevelMismatch;
          fields.push('programmingGeneralQuestionCount', 'programmingMarksPerQuestion',
            'programmingLevelCounts', 'programmingLevelCounts_Easy',
            'programmingLevelCounts_Medium', 'programmingLevelCounts_Hard', 'programmingTotalMarks');
        }
        break;
      }
      // Schedule, Notification, Question Configuration — free, no validation
      default:
        return true;
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    markAllTouched(fields);
    return Object.keys(errors).length === 0;
  }, [currentStep, steps, validateExerciseType, validateModule, validateExerciseDetails,
    validateMCQConfiguration, validateProgrammingConfiguration, markAllTouched,
    formData.exerciseType, programmingLevelMismatch]);

  // ── handleComplete ──────────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    let allErrors: ValidationErrors = {};
    let allFields: string[] = [];

    // 1. Exercise Type — always required
    const typeError = validateExerciseType();
    if (typeError) { allErrors.exerciseType = typeError; allFields.push('exerciseType'); }

    // 2. Module — required for Programming / Combined
    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      const me = validateModule();
      if (me.module) { allErrors.selectedModule = me.module; allFields.push('selectedModule'); }
      if (me.languages) { allErrors.selectedLanguages = me.languages; allFields.push('selectedLanguages'); }
    }

    // 3. Exercise Details — always required
    const detailsErrors = validateExerciseDetails();
    allErrors = { ...allErrors, ...detailsErrors };
    allFields.push('exerciseName', 'totalDuration', 'totalMarks');
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

    // Check for errors
    if (Object.keys(allErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...allErrors }));
      markAllTouched(allFields);

      // Collect which required steps have errors (in order)
      const incompleteSteps: string[] = [];
      if (allErrors.exerciseType)
        incompleteSteps.push('Exercise Type');
      if (allErrors.selectedModule || allErrors.selectedLanguages)
        incompleteSteps.push('Module');
      if (allErrors.exerciseName || allErrors.totalDuration || allErrors.totalMarks ||
        allErrors.totalMarksMCQ || allErrors.totalMarksProgramming)
        incompleteSteps.push('Exercise Details');
      if (allErrors.mcqGeneralQuestionCount || allErrors.mcqMarksPerQuestion || allErrors.mcqTotalMarks)
        incompleteSteps.push('MCQ Configuration');
      if (allErrors.programmingGeneralQuestionCount || allErrors.programmingMarksPerQuestion ||
        allErrors.programmingLevelCounts || allErrors.programmingLevelCounts_Easy ||
        allErrors.programmingLevelCounts_Medium || allErrors.programmingLevelCounts_Hard ||
        allErrors.programmingTotalMarks || allErrors.programmingLevelScoring)
        incompleteSteps.push('Programming Configuration');

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

    // All validations passed, proceed with submission
    setIsLoading(true);

    try {
      if (!tabType || !subcategory) {
        throw new Error('Missing required fields: tabType or subcategory');
      }

      if (!formData.exerciseName) {
        throw new Error('Exercise name is required');
      }

      // Transform question descriptions if they exist
      const transformQuestionDescription = (question: any) => {
        if (!question) return question;
        const tq = { ...question };
        if (tq.description && typeof tq.description === 'string') {
          tq.description = {
            text: tq.description,
            imageUrl: null,
            imageAlignment: "left",
            imageSizePercent: 100
          };
        }
        return tq;
      };

      // Format dates
      const pad = (n: number) => String(n).padStart(2, '0');
      const sd = formData.schedule.startDate;
      const startDT = (sd.day > 0 && sd.month > 0 && sd.year > 0)
        ? `${sd.year}-${pad(sd.month)}-${pad(sd.day)}T${pad(sd.hour || 0)}:${pad(sd.minute || 0)}`
        : null;

      const ed = formData.schedule.cutoffDate;
      const endDT = (ed.day > 0 && ed.month > 0 && ed.year > 0)
        ? `${ed.year}-${pad(ed.month)}-${pad(ed.day)}T${pad(ed.hour || 23)}:${pad(ed.minute || 59)}`
        : null;

      const gd = formData.schedule.gracePeriodDate;
      const graceDT = (formData.schedule.gracePeriodEnabled && gd.day > 0 && gd.month > 0 && gd.year > 0)
        ? `${gd.year}-${pad(gd.month)}-${pad(gd.day)}T${pad(gd.hour || 23)}:${pad(gd.minute || 59)}`
        : null;

      // Calculate marks
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

      // Build base payload
      const basePayload: any = {
        tabType,
        subcategory,
        exerciseType: formData.exerciseType,
        configurationType: {
          mcqMode: formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined',
          programmingMode: formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined',
          combinedMode: formData.exerciseType === 'Combined'
        },
        exerciseInformation: {
          exerciseId: formData.exerciseId || `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          exerciseName: formData.exerciseName,
          description: formData.description || '',
          exerciseLevel: formData.exerciseLevel || 'beginner',
          totalDuration: formData.totalDuration || 60,
          totalMarks: formData.exerciseType === 'Combined'
            ? (formData.totalMarksMCQ + formData.totalMarksProgramming)
            : formData.totalMarks
        },
        ...(formData.exerciseType === 'Combined' && {
          totalMarksMCQ: formData.totalMarksMCQ,
          totalMarksProgramming: formData.totalMarksProgramming
        }),
        availabilityPeriod: {
          startDate: startDT,
          endDate: endDT,
          gracePeriodEnabled: formData.schedule.gracePeriodEnabled,
          gracePeriodAllowed: formData.schedule.gracePeriodEnabled,
          ...(formData.schedule.gracePeriodEnabled && graceDT && { gracePeriodDate: graceDT }),
          extendedDays: 0
        },
        notificationSettings: {
          notifyUsers: formData.notifyUsers || false,
          notifyGmail: formData.notifyGmail || false,
          notifyWhatsApp: formData.notifyWhatsApp || false,
          gradeSheet: formData.gradeSheet !== undefined ? formData.gradeSheet : true
        },
        questions: [],
      };

      // Add programming settings if applicable
      if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
        basePayload.programmingSettings = {
          selectedModule: formData.selectedModule || '',
          selectedLanguages: formData.selectedLanguages || []
        };
      }

      // Transform questions if present
      if ((formData as any).questions) {
        basePayload.questions = (formData as any).questions.map(transformQuestionDescription);
      }

      // Helper function to build programming configuration
      const buildProgConfig = (pc: typeof formData.programmingConfig, sTotal: number) => {
        let bst = 'evenMarks';
        if (pc.questionConfigType === 'levelBased' || pc.questionConfigType === 'selectionLevel') {
          bst = 'levelBasedMarks';
        } else {
          if (pc.scoreSettings?.scoreType === 'equalDistribution') bst = 'evenMarks';
          else if (pc.scoreSettings?.scoreType === 'questionSpecific') bst = 'separateMarks';
          else if (pc.scoreSettings?.scoreType === 'levelSpecific') bst = 'levelBasedMarks';
        }

        const cfg: any = {
          questionConfigType: pc.questionConfigType,
          scoreSettings: {
            scoreType: bst,
            evenMarks: pc.scoreSettings?.scoreType === 'equalDistribution' ? pc.scoreSettings.equalDistribution : 0,
            separateMarks: pc.scoreSettings?.questionSpecific || {
              general: [],
              levelBased: { easy: [], medium: [], hard: [] }
            },
            levelBasedMarks: pc.scoreSettings?.levelBasedMarks || { easy: 0, medium: 0, hard: 0 },
            levelScoringConfiguration: pc.scoreSettings?.levelScoringConfiguration,
            totalMarks: sTotal
          },
          questionFlow: pc.questionFlow || 'freeFlow',
          attemptLimitEnabled: pc.attemptLimitEnabled || false,
          submissionAttempts: pc.submissionAttempts || 1,
          allowCodeExecution: true,
          enableTestCases: true,
          showSampleCases: true
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

      // Add question configuration based on exercise type
      if (formData.exerciseType === 'MCQ') {
        basePayload.questionConfiguration = {
          mcqConfig: {
            questionConfigType: 'general',
            generalQuestionCount: formData.mcqConfig.generalQuestionCount || 0,
            scoreSettings: {
              scoreType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution',
              equalDistribution: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
              totalMarks: mcqTotalMarks
            },
            attemptLimitEnabled: formData.mcqConfig.attemptLimitEnabled || false,
            submissionAttempts: formData.mcqConfig.submissionAttempts || 1,
            mcqTotalMarks,
            marksPerQuestion: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
            totalMcqQuestions: formData.mcqConfig.generalQuestionCount || 0,
            scoringType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution',
            shuffleQuestions: true
          }
        };
      } else if (formData.exerciseType === 'Programming') {
        basePayload.questionConfiguration = {
          programmingConfig: buildProgConfig(formData.programmingConfig, progTotalMarks)
        };
      } else if (formData.exerciseType === 'Combined') {
        const mcqP = {
          questionConfigType: 'general',
          generalQuestionCount: formData.mcqConfig.generalQuestionCount || 0,
          scoreSettings: {
            scoreType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution',
            equalDistribution: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
            totalMarks: formData.totalMarksMCQ
          },
          attemptLimitEnabled: formData.mcqConfig.attemptLimitEnabled || false,
          submissionAttempts: formData.mcqConfig.submissionAttempts || 1,
          mcqTotalMarks: formData.totalMarksMCQ,
          marksPerQuestion: formData.mcqConfig.scoreSettings?.equalDistribution || 0,
          totalMcqQuestions: formData.mcqConfig.generalQuestionCount || 0,
          scoringType: formData.mcqConfig.scoreSettings?.scoreType || 'equalDistribution',
          shuffleQuestions: true
        };

        basePayload.questionConfiguration = {
          mcqConfig: mcqP,
          programmingConfig: buildProgConfig(formData.programmingConfig, formData.totalMarksProgramming)
        };
      }

      // Make API call
      let response;
      if (isEditing && exercise_Id) {
        response = await exerciseApi.updateExercise(
          getEntityType(nodeType),
          nodeId,
          exercise_Id,
          basePayload
        );
      } else {
        response = await exerciseApi.addExercise(
          getEntityType(nodeType),
          nodeId,
          basePayload
        );
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

      // Format error message
      let msg = `Failed to ${isEditing ? 'update' : 'create'} exercise: `;
      if (error.response?.data?.message) {
        msg += error.response.data.message;
      } else if (error.message) {
        msg += error.message;
      } else {
        msg += 'Unknown error occurred';
      }

      // Show error toast
      toast.error(msg, {
        position: 'top-right',
        duration: 4000,
        id: 'exercise-error'
      });

      // Clear loading state on error
      setIsLoading(false);

      // Re-throw error for debugging
      throw error;
    }
  }, [
    validateExerciseType,
    validateModule,
    validateExerciseDetails,
    validateMCQConfiguration,
    validateProgrammingConfiguration,
    programmingLevelMismatch,
    programmingAllocatedMarks,
    formData,
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
  ]);
  const handleNext = useCallback(() => {
    const cs = steps.find(s => s.id === currentStep);

    // Special handling for combined mode
    if (formData.exerciseType === 'Combined') {
      if (cs?.title === 'Question Configuration') {
        const ms = steps.find(s => s.title === 'MCQ Configuration' && s.isChild);
        if (ms) { setCurrentStep(ms.id); return; }
      }
      if (cs?.isChild) {
        const ci = steps.findIndex(s => s.id === currentStep);
        const ns = steps.slice(ci + 1).find(s => s.isChild);
        if (ns) { setCurrentStep(ns.id); return; }
        const nr = steps.slice(ci + 1).find(s => !s.isChild);
        if (nr) { setCurrentStep(nr.id); return; }
      }
    }

    const ci = steps.findIndex(s => s.id === currentStep);
    let ni = ci + 1;

    // Skip Question Configuration step in combined mode
    if (formData.exerciseType === 'Combined' && ni < steps.length && steps[ni]?.title === 'Question Configuration') {
      ni += 1;
    }

    if (ni >= steps.length) {
      handleComplete();
    } else {
      setCurrentStep(steps[ni].id);
    }
  }, [steps, currentStep, formData.exerciseType, handleComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      const cs = steps.find(s => s.id === currentStep);
      const ps = steps.find(s => s.id === currentStep - 1);
      if (formData.exerciseType === 'Combined' && cs?.title === 'MCQ Configuration' && ps?.title === 'Question Configuration') { setCurrentStep(ps.id - 0.5); return; }
      let p = currentStep - 1;
      const pt = steps.find(s => s.id === p);
      if (formData.exerciseType === 'Combined' && pt?.title === 'Question Configuration') p -= 1;
      setCurrentStep(p);
    }
  }, [currentStep, formData.exerciseType, steps]);

  // ── Sidebar step click — direct navigation, no validation ──────────────────
  const handleStepClick = useCallback((targetStepId: number) => {
    if (targetStepId === currentStep) return;
    setCurrentStep(targetStepId);
  }, [currentStep]);

  // FIXED: handleSelectExerciseType - restored programming config reset from old version
  const handleSelectExerciseType = useCallback((type: 'MCQ' | 'Programming' | 'Combined') => {
    setFormData(prev => ({
      ...prev, exerciseType: type,
      ...(type === 'MCQ' && { selectedModule: '', selectedLanguages: [] }),
      ...(type === 'Programming' && {
        programmingConfig: { ...prev.programmingConfig, questionConfigType: 'general', generalQuestionCount: 0, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 }, levelBasedCounts: { easy: 0, medium: 0, hard: 0 } }
      }),
    }));
    setValidationErrors(prev => { const e = { ...prev }; delete e.exerciseType; return e; });
    setCurrentStep(1);
  }, []);

  // FIXED: removed isEditing guard on language toggles (matching old behavior)
  const toggleLanguage = useCallback((lang: string) => {
    setFormData(prev => ({ ...prev, selectedLanguages: prev.selectedLanguages.includes(lang) ? prev.selectedLanguages.filter(l => l !== lang) : [...prev.selectedLanguages, lang] }));
    setValidationErrors(prev => { const e = { ...prev }; delete e.selectedLanguages; return e; });
  }, []);

  const toggleAllLanguages = useCallback(() => {
    const cur = moduleLanguages[formData.selectedModule]?.map(l => l.name) || [];
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

    // For end date: cannot be before start date
    if (fieldKey === 'cutoffDate') {
      const startDate = formData.schedule.startDate;
      if (startDate.day > 0 && startDate.month > 0 && startDate.year > 0) {
        const startDateTime = new Date(startDate.year, startDate.month - 1, startDate.day);
        startDateTime.setHours(0, 0, 0, 0);

        // Disable any date that is before the start date
        return date < startDateTime;
      }
    }

    // For grace period: cannot be before end date
    if (fieldKey === 'gracePeriodDate' && formData.schedule.gracePeriodEnabled) {
      const endDate = formData.schedule.cutoffDate;
      if (endDate.day > 0 && endDate.month > 0 && endDate.year > 0) {
        const endDateTime = new Date(endDate.year, endDate.month - 1, endDate.day);
        endDateTime.setHours(0, 0, 0, 0);

        // Disable any date that is before the end date
        return date < endDateTime;
      }
    }

    return false;
  }, [isEditing, formData.schedule.startDate, formData.schedule.cutoffDate, formData.schedule.gracePeriodEnabled]);
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
                style={{ borderColor: sel ? t.color : D.border, background: sel ? t.color + '08' : D.bg, boxShadow: sel ? `0 0 0 3px ${t.color}15` : '0 1px 3px rgba(0,0,0,0.04)' }}>
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
  const renderModule = useCallback(() => {
    if (formData.exerciseType !== 'Programming' && formData.exerciseType !== 'Combined') return null;
    const modules = ['Core Programming', 'Frontend', 'Database'];
    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Code size={13} /></div>
          <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Module & Languages</h3>
        </div>

        <div className="space-y-4">
          {/* Programming Module Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel required>Programming Module</SectionLabel>
              {isEditing && (
                <p className="text-[11px] flex items-center gap-1" style={{ color: D.amber }}>
                  <Lock size={10} />Module cannot be changed
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {modules.map(mod => {
                const sel = formData.selectedModule === mod;
                const icons: Record<string, React.ReactNode> = {
                  'Core Programming': <Terminal size={15} />,
                  'Frontend': <Code size={15} />,
                  'Database': <Database size={15} />
                };
                const colors: Record<string, string> = {
                  'Core Programming': D.blue,
                  'Frontend': D.orange,
                  'Database': D.emerald
                };
                return (
                  <button
                    key={mod}
                    type="button"
                    disabled={isEditing}
                    onClick={() => {
                      if (!isEditing) {
                        setFormData(prev => ({
                          ...prev,
                          selectedModule: mod,
                          selectedLanguages: []
                        }));
                        setValidationErrors(prev => {
                          const e = { ...prev };
                          delete e.selectedModule;
                          return e;
                        });
                        setIsOpen(false);
                      }
                    }}
                    className="relative p-2.5 rounded-xl border-2 text-left transition-all duration-200 focus:outline-none"
                    style={{
                      borderColor: sel ? colors[mod] : D.border,
                      background: sel ? colors[mod] + '08' : D.bg,
                      cursor: isEditing ? 'not-allowed' : 'pointer',
                      opacity: isEditing && !sel ? 0.6 : 1
                    }}>
                    {sel && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: colors[mod] }}>
                        <Check size={9} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5" style={{
                      background: sel ? colors[mod] : colors[mod] + '15',
                      color: sel ? '#fff' : colors[mod]
                    }}>
                      {icons[mod]}
                    </div>
                    <div className="text-xs font-bold" style={{ color: sel ? colors[mod] : D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {mod}
                    </div>
                  </button>
                );
              })}
            </div>
            {validationErrors.selectedModule && touchedFields.has('selectedModule') && (
              <p className="mt-1 text-xs flex items-center gap-1" style={{ color: D.red }}>
                <AlertCircle size={11} />{validationErrors.selectedModule}
              </p>
            )}
          </div>

          {/* Languages Selection */}
          {formData.selectedModule && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between mb-2">
                <SectionLabel required>Select Languages</SectionLabel>
                <button
                  type="button"
                  onClick={toggleAllLanguages}
                  className="text-xs font-bold transition-colors px-2 py-1 rounded hover:opacity-80"
                  style={{ color: D.orange }}>
                  {formData.selectedLanguages.length === moduleLanguages[formData.selectedModule]?.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {moduleLanguages[formData.selectedModule]?.map(lang => {
                  const sel = formData.selectedLanguages.includes(lang.name);
                  return (
                    <button
                      key={lang.name}
                      type="button"
                      onClick={() => toggleLanguage(lang.name)}
                      onBlur={() => markTouched('selectedLanguages')}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all duration-200"
                      style={{
                        borderColor: sel ? D.orange : D.border,
                        background: sel ? D.orangeLight : D.bg,
                        color: sel ? D.orange : D.textSub
                      }}>
                      <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0" style={{
                        borderColor: sel ? D.orange : D.border,
                        background: sel ? D.orange : 'transparent'
                      }}>
                        {sel && <Check size={9} className="text-white" strokeWidth={3} />}
                      </div>
                      {lang.icon && (
                        <img
                          src={lang.icon}
                          alt={lang.name}
                          className="w-4 h-4 object-contain"
                          onError={e => { (e.target as any).style.display = 'none'; }}
                        />
                      )}
                      {lang.name}
                    </button>
                  );
                })}
              </div>
              {validationErrors.selectedLanguages && touchedFields.has('selectedLanguages') && (
                <p className="mt-1 text-xs flex items-center gap-1" style={{ color: D.red }}>
                  <AlertCircle size={11} />{validationErrors.selectedLanguages}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }, [formData.selectedModule, formData.selectedLanguages, formData.exerciseType, isEditing, validationErrors, touchedFields, toggleLanguage, toggleAllLanguages, markTouched]);
  // ==========================================================================
  // RENDER: Exercise Details
  // ==========================================================================
  const renderExerciseDetails = useCallback(() => {
    const isCombined = formData.exerciseType === 'Combined';
    const combinedTotal = formData.totalMarksMCQ + formData.totalMarksProgramming;

    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><FileText size={13} /></div>
            <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Exercise Details</h3>
          </div>
          {isCombined && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold" style={{ background: combinedTotal > 0 ? D.emerald + '15' : D.surface, color: combinedTotal > 0 ? D.emerald : D.textMuted, border: `1px solid ${combinedTotal > 0 ? D.emerald + '30' : D.border}` }}>
              <Calculator size={11} />{combinedTotal} total marks {combinedTotal > 0 && <Check size={11} />}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionLabel>Exercise ID</SectionLabel>
              <OInput value={formData.exerciseId} onChange={() => { }} readOnly />
            </div>
            <div>
              <SectionLabel required>Exercise Name</SectionLabel>
              <OInput value={formData.exerciseName}
                onChange={v => { setFormData(prev => ({ ...prev, exerciseName: v })); if (v.trim()) setValidationErrors(prev => { const e = { ...prev }; delete e.exerciseName; return e; }); }}
                onBlur={() => markTouched('exerciseName')} placeholder="e.g. Advanced Algorithms"
                error={validationErrors.exerciseName} touched={touchedFields.has('exerciseName')} />
            </div>
          </div>
          <div>
            <SectionLabel>Description</SectionLabel>
            <TipTapEditor value={formData.description}
              onChange={v => setFormData(prev => ({ ...prev, description: v }))}
              onBlur={() => markTouched('description')} placeholder="Enter a brief description..."
              minHeight="80px" maxHeight="80px" showToolbar editable
              error={validationErrors.description} touched={touchedFields.has('description')} />
          </div>
          <div>
            <SectionLabel>Difficulty Level</SectionLabel>
            <div className="flex gap-2">
              {(['beginner', 'intermediate', 'expert'] as const).map(level => {
                const sel = formData.exerciseLevel === level;
                const colors = { beginner: D.emerald, intermediate: D.amber, expert: D.red };
                const labels = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' };
                return (
                  <button key={level} type="button" onClick={() => setFormData(prev => ({ ...prev, exerciseLevel: level }))}
                    className="flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition-all duration-200"
                    style={{ borderColor: sel ? colors[level] : D.border, background: sel ? colors[level] + '10' : D.bg, color: sel ? colors[level] : D.textMuted }}>
                    {labels[level]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <SectionLabel required info="Total time allowed in minutes">Duration (min)</SectionLabel>
              <ONumberInput value={formData.totalDuration}
                onChange={v => { setFormData(prev => ({ ...prev, totalDuration: v })); if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalDuration; return e; }); }}
                onBlur={() => markTouched('totalDuration')} placeholder="60"
                error={validationErrors.totalDuration} touched={touchedFields.has('totalDuration')} />
            </div>
            {!isCombined ? (
              <div className="col-span-2 mt-2">
                <SectionLabel required>Total Marks</SectionLabel>
                <ONumberInput value={formData.totalMarks}
                  onChange={v => { setFormData(prev => ({ ...prev, totalMarks: v })); if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalMarks; return e; }); }}
                  onBlur={() => markTouched('totalMarks')} placeholder="100"
                  error={validationErrors.totalMarks} touched={touchedFields.has('totalMarks')} />
              </div>
            ) : (
              <>
                <div>
                  <SectionLabel required info="Marks for MCQ section">MCQ Marks</SectionLabel>
                  <ONumberInput value={formData.totalMarksMCQ}
                    onChange={v => { setFormData(prev => ({ ...prev, totalMarksMCQ: v, totalMarks: v + prev.totalMarksProgramming })); if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalMarksMCQ; return e; }); }}
                    onBlur={() => markTouched('totalMarksMCQ')} placeholder="50"
                    error={validationErrors.totalMarksMCQ} touched={touchedFields.has('totalMarksMCQ')} />
                </div>
                <div>
                  <SectionLabel required info="Marks for programming section">Prog. Marks</SectionLabel>
                  <ONumberInput value={formData.totalMarksProgramming}
                    onChange={v => { setFormData(prev => ({ ...prev, totalMarksProgramming: v, totalMarks: prev.totalMarksMCQ + v })); if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.totalMarksProgramming; return e; }); }}
                    onBlur={() => markTouched('totalMarksProgramming')} placeholder="50"
                    error={validationErrors.totalMarksProgramming} touched={touchedFields.has('totalMarksProgramming')} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }, [formData, validationErrors, touchedFields, markTouched]);

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
              {isCombined && <p className="text-[10px]" style={{ color: D.blue }}>Section: {formData.totalMarksMCQ} marks</p>}
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
          <div>
            <SectionLabel>Scoring Type {isEditing && <span className="text-[10px] font-bold ml-1" style={{ color: D.amber }}>(locked)</span>}</SectionLabel>
            <ODropdown value={formData.mcqConfig.scoreSettings.scoreType} options={mcqScoringOptions}
              onChange={v => {
                if (isEditing) return;
                const tot = isCombined ? formData.totalMarksMCQ : formData.totalMarks;
                setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, scoreSettings: { ...prev.mcqConfig.scoreSettings, scoreType: v as any, equalDistribution: v === 'equalDistribution' && prev.mcqConfig.generalQuestionCount > 0 ? tot / prev.mcqConfig.generalQuestionCount : 0, totalMarks: tot } } }));
              }}
              disabled={isEditing} />
            <p className="mt-1 text-[11px]" style={{ color: D.textMuted }}>
              {isEqual ? 'All questions will have equal marks, auto-calculated from total.' : 'Set individual marks per question when creating them.'}
            </p>
          </div>

          {isEqual && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SectionLabel required info="Total number of MCQ questions">Total Questions</SectionLabel>
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

          <div className="pt-2 border-t" style={{ borderColor: D.border }}>
            <OToggle enabled={formData.mcqConfig.attemptLimitEnabled} onChange={v => setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, attemptLimitEnabled: v, submissionAttempts: v ? prev.mcqConfig.submissionAttempts : 1 } }))} label="Attempt Limit" description="Restrict the number of submission attempts" />
            {formData.mcqConfig.attemptLimitEnabled && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <SectionLabel>Attempts Allowed</SectionLabel>
                <div className="w-28">
                  <ONumberInput value={formData.mcqConfig.submissionAttempts} onChange={v => setFormData(prev => ({ ...prev, mcqConfig: { ...prev.mcqConfig, submissionAttempts: Math.max(1, Math.min(10, v)) } }))} min={1} max={10} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [formData.mcqConfig, formData.totalMarks, formData.totalMarksMCQ, formData.exerciseType, mcqScoringOptions, validationErrors, touchedFields, markTouched, isEditing]);

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

    return (
      <div className="px-4 py-3">
        {/* Top header card - changed border to neutral */}
        <div className="mb-3 p-2.5 rounded-xl flex items-center justify-between" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: D.surface2, color: D.textMain }}><Terminal size={13} /></div>
            <div>
              <h3 className="text-xs font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Programming Configuration</h3>
              {isCombined && <p className="text-[10px]" style={{ color: D.textSub }}>Section: {formData.totalMarksProgramming} marks</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold" style={{ color: isMatch ? D.emerald : D.amber }}>{isMatch ? 'Balanced' : 'Mismatch'}</div>
            <div className="text-sm font-bold" style={{ color: isMatch ? D.emerald : D.amber, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {formatDecimal(programmingAllocatedMarks)}<span className="text-xs font-normal" style={{ color: D.textMuted }}>/{totalToUse}</span>
            </div>
          </div>
        </div>
        {programmingLevelMismatch && (
          <div className="mb-3 sticky top-0 z-10 flex items-center gap-2 px-3 py-2.5 rounded-lg shadow-sm border-2"
            style={{
              background: D.red + '10',
              borderColor: D.red + '40',
              backdropFilter: 'blur(8px)',
              marginTop: '-4px',
              boxShadow: `0 2px 8px ${D.red}20`
            }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: D.red + '20', color: D.red }}>
              <AlertCircle size={13} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold" style={{ color: D.red }}>
                Marks Mismatch Detected
              </p>
              <p className="text-[11px]" style={{ color: D.textMain }}>
                {programmingLevelMismatch}
              </p>
            </div>
            <div className="text-xs font-bold px-2 py-1 rounded" style={{ background: D.red + '20', color: D.red }}>
              {(() => {
                const match = programmingLevelMismatch.match(/sum to (\d+)/);
                const totalMatch = programmingLevelMismatch.match(/total is (\d+)/);
                if (match && totalMatch) {
                  const sum = parseInt(match[1]);
                  const total = parseInt(totalMatch[1]);
                  const diff = total - sum;
                  return diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`;
                }
                return '';
              })()}
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          <ExpandableSection
            id="configuration"
            title="Question Distribution"
            subtitle="Define how questions are distributed"
            icon={<Settings2 size={14} />}
            isExpanded={expandedSections.has('configuration')}
            onToggle={handleToggleSection}
            accent={D.textMain} // Changed to neutral
            headerExtra={levelBasedWarningBadge}>
            <div className="space-y-2.5">
              <div>
                <SectionLabel>Configuration Strategy {isEditing && <span className="text-[10px] font-bold ml-1" style={{ color: D.amber }}>(locked)</span>}</SectionLabel>
                <ODropdown value={formData.programmingConfig.questionConfigType} options={configOptions}
                  onChange={v => {
                    if (isEditing) return;
                    setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, questionConfigType: v as any, ...(v === 'general' ? { generalQuestionCount: 0, levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } } : { levelBasedCounts: { easy: 0, medium: 0, hard: 0 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } }) } }));
                    setLevelScoringOpen({ easy: false, medium: false, hard: false });
                  }}
                  disabled={isEditing} className="max-w-xs" />
              </div>

              {formData.programmingConfig.questionConfigType === 'general' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <SectionLabel required>Total Questions</SectionLabel>
                    <ONumberInput value={formData.programmingConfig.generalQuestionCount}
                      onChange={v => { if (v > 0) setValidationErrors(prev => { const e = { ...prev }; delete e.programmingGeneralQuestionCount; return e; }); setFormData(prev => { const tot = prev.exerciseType === 'Combined' ? prev.totalMarksProgramming : prev.totalMarks; return { ...prev, programmingConfig: { ...prev.programmingConfig, generalQuestionCount: v, scoreSettings: { ...prev.programmingConfig.scoreSettings, equalDistribution: v > 0 && tot > 0 ? tot / v : 0 } } }; }); }}
                      onBlur={() => markTouched('programmingGeneralQuestionCount')} min={0} placeholder="e.g. 5"
                      error={validationErrors.programmingGeneralQuestionCount} touched={touchedFields.has('programmingGeneralQuestionCount')} />
                  </div>
                  <div>
                    <SectionLabel info="Auto-calculated from total marks">Marks per Question</SectionLabel>
                    <div className="relative">
                      <input type="text" value={formData.programmingConfig.scoreSettings.equalDistribution > 0 ? formatDecimal(formData.programmingConfig.scoreSettings.equalDistribution) : '0'} disabled readOnly
                        className="w-full px-3 py-2 text-sm rounded-lg border" style={{ borderColor: D.border, background: D.surface, color: D.textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif' }} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: D.orange }}>Auto</span>
                    </div>
                  </div>
                </div>
              ) : formData.programmingConfig.questionConfigType === 'levelBased' ? (
                <div>
                  <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: D.textMuted }}><AlertCircle size={11} />All 3 difficulty levels are required</div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['easy', 'medium', 'hard'] as const).map(level => {
                      const colors = { easy: D.emerald, medium: D.amber, hard: D.red };
                      const ek = `programmingLevelCounts_${level.charAt(0).toUpperCase() + level.slice(1)}`;
                      return (
                        <div key={level}>
                          <div className="text-xs font-bold mb-1 capitalize" style={{ color: colors[level] }}>{level}</div>
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
                  <div className="text-xs mb-2" style={{ color: D.textMuted }}>💡 Select up to 2 difficulty levels. Selecting all 3 auto-switches to Level Based.</div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['easy', 'medium', 'hard'] as const).map(level => {
                      const colors = { easy: D.emerald, medium: D.amber, hard: D.red };
                      const checked = formData.programmingConfig.selectionLevelCounts?.[level] > 0;
                      return (
                        <div key={level}>
                          <label className="flex items-center gap-2 mb-1 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={e => {
                              const nc = { ...formData.programmingConfig.selectionLevelCounts, [level]: e.target.checked ? 1 : 0 };
                              const active = (['easy', 'medium', 'hard'] as const).filter(l => nc[l] > 0).length;
                              if (active > 2) setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, questionConfigType: 'levelBased', levelBasedCounts: { easy: nc.easy > 0 ? nc.easy : 1, medium: nc.medium > 0 ? nc.medium : 1, hard: nc.hard > 0 ? nc.hard : 1 }, selectionLevelCounts: { easy: 0, medium: 0, hard: 0 } } }));
                              else setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, selectionLevelCounts: nc } }));
                            }}
                              className="w-3.5 h-3.5 rounded" style={{ accentColor: colors[level] }} />
                            <span className="text-xs font-bold capitalize" style={{ color: colors[level] }}>{level}</span>
                          </label>
                          <ONumberInput value={formData.programmingConfig.selectionLevelCounts?.[level] === 0 ? ('' as any) : formData.programmingConfig.selectionLevelCounts?.[level]}
                            onChange={v => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, selectionLevelCounts: { ...prev.programmingConfig.selectionLevelCounts, [level]: v } } }))}
                            disabled={!checked} min={0} placeholder={checked ? 'Count' : 'Disabled'} />
                        </div>
                      );
                    })}
                  </div>
                  {validationErrors.programmingLevelCounts && touchedFields.has('programmingLevelCounts') && <p className="mt-1 text-xs" style={{ color: D.red }}>{validationErrors.programmingLevelCounts}</p>}
                </div>
              )}
            </div>
          </ExpandableSection>

          {shouldShowScoringSection && (
            <ExpandableSection
              id="scoring"
              title="Scoring Configuration"
              subtitle="Set marks per difficulty level"
              icon={<Calculator size={14} />}
              isExpanded={expandedSections.has('scoring')}
              onToggle={handleToggleSection}
              onCollapse={() => setLevelScoringOpen({ easy: false, medium: false, hard: false })}
              accent={D.textMain}> {/* Changed to neutral */}
              {renderScoringConfiguration()}
            </ExpandableSection>
          )}

          <div className={programmingLevelMismatch ? 'opacity-40 pointer-events-none' : ''}>
            <ExpandableSection
              id="flow"
              title="Question Flow"
              subtitle="Control how students navigate"
              icon={<Shuffle size={14} />}
              isExpanded={expandedSections.has('flow')}
              onToggle={handleToggleSection}
              accent={D.textMain}> {/* Changed to neutral */}
              <div className="grid grid-cols-2 gap-2">
                {questionFlowOptions.map(opt => {
                  const sel = formData.programmingConfig.questionFlow === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, questionFlow: opt.value as any } }))}
                      className="p-2.5 rounded-lg border-2 text-left transition-all duration-200"
                      style={{ borderColor: sel ? D.orange : D.border, background: sel ? D.orangeLight : D.bg }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: sel ? D.orange + '20' : D.surface, color: sel ? D.orange : D.textMuted }}>{opt.icon}</div>
                        {sel && <Check size={11} style={{ color: D.orange }} />}
                      </div>
                      <div className="text-xs font-bold mb-0.5" style={{ color: sel ? D.orange : D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{opt.label}</div>
                      <div className="text-[10px]" style={{ color: D.textMuted }}>{opt.description}</div>
                    </button>
                  );
                })}
              </div>
            </ExpandableSection>
          </div>

          <div className="p-2.5 rounded-lg border" style={{ borderColor: D.border, background: D.surface }}>
            <OToggle enabled={formData.programmingConfig.attemptLimitEnabled} onChange={v => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, attemptLimitEnabled: v, submissionAttempts: v ? prev.programmingConfig.submissionAttempts : 1 } }))} label="Attempt Limit" description="Restrict code submission attempts" />
            {formData.programmingConfig.attemptLimitEnabled && (
              <div className="mt-2 pt-2 border-t animate-in fade-in duration-150" style={{ borderColor: D.border }}>
                <SectionLabel>Attempts Allowed</SectionLabel>
                <div className="w-28">
                  <ONumberInput value={formData.programmingConfig.submissionAttempts} onChange={v => setFormData(prev => ({ ...prev, programmingConfig: { ...prev.programmingConfig, submissionAttempts: Math.max(1, Math.min(10, v)) } }))} min={1} max={10} />
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
  }, [formData, expandedSections, validationErrors, touchedFields, markTouched, programmingAllocatedMarks, programmingLevelMismatch, shouldShowScoringSection, getProgrammingTotalQuestions, handleToggleSection, questionFlowOptions, updateLevelScoringConfig, configOptions, isEditing, levelBasedWarningBadge]);
  // ==========================================================================
  // RENDER: Schedule (FIXED: uses extracted DateRowPicker component)
  // ==========================================================================
  const renderScheduleConfiguration = useCallback(() => {
    const handleUpdate = (field: string, type: string, value: any) => {
      setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, [field]: { ...(prev.schedule[field as keyof typeof prev.schedule] as any), [type]: value } } }));
      setValidationErrors(prev => {
        const e = { ...prev };
        if (field === 'startDate') delete e.startDate;
        if (field === 'cutoffDate') delete e.endDate;
        if (field === 'gracePeriodDate') delete e.gracePeriod;
        return e;
      });
    };

    const dateRows = [
      { label: 'Start Date & Time', fieldKey: 'startDate', icon: '▶', color: D.blue, toggleable: false },
      { label: 'End Date & Time', fieldKey: 'cutoffDate', icon: '⏹', color: D.red, toggleable: false },
      { label: 'Grace Period', fieldKey: 'gracePeriodDate', icon: '↗', color: D.purple, toggleable: true },
    ];

    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Calendar size={13} /></div>
          <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Schedule Configuration</h3>
        </div>
        <div className="space-y-2">
          {dateRows.map(({ label, fieldKey, icon, color, toggleable }) => {
            const data = formData.schedule[fieldKey as keyof typeof formData.schedule] as any || {};

            // FIXED: Check if date is empty (all zeros)
            const isEmptyDate = data.day === 0 && data.month === 0 && data.year === 0;

            const isEnabled = toggleable ? (fieldKey === 'gracePeriodDate' ? formData.schedule.gracePeriodEnabled : false) : true;
            const hasError = fieldKey === 'startDate' ? validationErrors.startDate : fieldKey === 'cutoffDate' ? validationErrors.endDate : fieldKey === 'gracePeriodDate' ? validationErrors.gracePeriod : undefined;
            const isTouched = fieldKey === 'startDate' ? touchedFields.has('startDate') : fieldKey === 'cutoffDate' ? touchedFields.has('endDate') : touchedFields.has('gracePeriod');

            return (
              <DateRowPicker
                key={fieldKey}
                label={label} fieldKey={fieldKey} icon={icon} color={color} toggleable={toggleable}
                data={data}
                isEnabled={isEnabled}
                isEmptyDate={isEmptyDate} // Pass this to DateRowPicker
                activePicker={activePicker} setActivePicker={setActivePicker}
                onUpdate={handleUpdate}
                onToggleEnable={() => {
                  if (fieldKey === 'gracePeriodDate') setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, gracePeriodEnabled: !prev.schedule.gracePeriodEnabled } }));
                }}
                hasError={hasError} isTouched={isTouched}
                generateCalendarDays={generateCalendarDays}
                isDateDisabled={isDateDisabled}
              />
            );
          })}
        </div>
      </div>
    );
  }, [formData.schedule, activePicker, validationErrors, touchedFields, generateCalendarDays, isDateDisabled]);
  // ==========================================================================
  // RENDER: Notification Settings
  // ==========================================================================
  const renderNotificationSettings = useCallback(() => {
    const rows = [
      { key: 'gradeSheet', label: 'Grade Sheet', sub: 'Auto-generate grade sheets after submission', icon: <Award size={14} />, color: D.blue, val: formData.gradeSheet, set: (v: boolean) => setFormData(prev => ({ ...prev, gradeSheet: v })) },
      { key: 'notify-dashboard', label: 'Dashboard Notification', sub: 'Always on — visible in student dashboard', icon: <Home size={14} />, color: D.orange, val: true, set: null, locked: true },
      { key: 'notifyUsers', label: 'User Notifications', sub: 'Send notifications to enrolled students', icon: <Bell size={14} />, color: D.orange, val: formData.notifyUsers, set: (v: boolean) => setFormData(prev => ({ ...prev, notifyUsers: v, notifyGmail: v ? prev.notifyGmail : false, notifyWhatsApp: v ? prev.notifyWhatsApp : false })) },
      ...(formData.notifyUsers ? [
        { key: 'notifyGmail', label: 'Email', sub: 'Notify via email / Gmail', icon: <Mail size={14} />, color: D.red, val: formData.notifyGmail, set: (v: boolean) => setFormData(prev => ({ ...prev, notifyGmail: v })), indent: true },
        { key: 'notifyWhatsApp', label: 'WhatsApp', sub: 'Notify via WhatsApp message', icon: <MessageCircle size={14} />, color: D.emerald, val: formData.notifyWhatsApp, set: (v: boolean) => setFormData(prev => ({ ...prev, notifyWhatsApp: v })), indent: true },
      ] : []),
    ];

    return (
      <div className="px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Bell size={13} /></div>
          <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Notifications & Grades</h3>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${D.border}` }}>
          {rows.map((row: any, idx: number) => (
            <div key={row.key}
              className="flex items-center justify-between px-3 py-2.5 transition-all duration-150"
              style={{
                background: D.bg,
                marginLeft: row.indent ? 16 : 0,
                borderTop: idx > 0 ? `1px solid ${D.border}` : 'none',
              }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: row.color + '12', color: row.color }}>{row.icon}</div>
                <div>
                  <div className="text-xs font-semibold leading-tight" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{row.label}</div>
                  <div className="text-[10.5px] mt-0.5 leading-tight" style={{ color: D.textMuted }}>{row.sub}</div>
                </div>
              </div>
              {row.locked ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-bold" style={{ color: row.color }}>Always On</span>
                  <div className="relative inline-flex items-center h-5 w-9 rounded-full opacity-60 p-[2px]" style={{ background: D.orange }}>
                    <span className="inline-block h-[13px] w-[13px] rounded-full bg-white shadow translate-x-[17px]" />
                  </div>
                </div>
              ) : row.set ? (
                <button type="button" onClick={() => row.set!(!(row.val as boolean))}
                  className="relative inline-flex items-center flex-shrink-0 h-5 w-9 rounded-full border-transparent transition-colors duration-200 p-[2px]"
                  style={{ background: row.val ? D.orange : '#e2e3e8' }}>
                  <span className={`inline-block h-[13px] w-[13px] transform rounded-full bg-white shadow transition-transform duration-200 ${row.val ? 'translate-x-[17px]' : 'translate-x-0'}`} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }, [formData.notifyUsers, formData.notifyGmail, formData.notifyWhatsApp, formData.gradeSheet]);

  // ==========================================================================
  // RENDER: Current Step
  // ==========================================================================
  const renderCurrentStep = useCallback(() => {
    const step = steps.find(s => s.id === currentStep);
    if (!step) return null;
    switch (step.title) {
      case 'Exercise Type': return renderExerciseType();
      case 'Module': return renderModule();
      case 'Exercise Details': return renderExerciseDetails();
      case 'Question Configuration':
        return (
          <div className="px-4 py-3">
            <div className="mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: D.orangeLight, color: D.orange }}><Layers size={13} /></div>
              <h3 className="text-sm font-bold" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Question Configuration</h3>
            </div>
            <p className="text-xs mb-2" style={{ color: D.textMuted }}>Configure MCQ and Programming questions separately in the next steps.</p>
            <div className="grid grid-cols-2 gap-3">
              {[{ title: 'MCQ Configuration', sub: 'Multiple choice questions with auto-grading', icon: <List size={15} />, color: D.blue }, { title: 'Programming Config', sub: 'Code challenges with test cases', icon: <Terminal size={15} />, color: D.orange }].map(c => (
                <div key={c.title} className="p-2.5 rounded-lg border" style={{ borderColor: c.color + '25', background: c.color + '05' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5" style={{ background: c.color + '15', color: c.color }}>{c.icon}</div>
                  <h4 className="text-xs font-bold mb-0.5" style={{ color: D.textMain, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{c.title}</h4>
                  <p className="text-[11px]" style={{ color: D.textMuted }}>{c.sub}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'MCQ Configuration': return renderMCQConfiguration();
      case 'Programming Configuration': return renderProgrammingConfiguration();
      case 'Schedule': return renderScheduleConfiguration();
      case 'Notification': return renderNotificationSettings();
      default: return null;
    }
  }, [steps, currentStep, renderExerciseType, renderModule, renderExerciseDetails, renderMCQConfiguration, renderProgrammingConfiguration, renderScheduleConfiguration, renderNotificationSettings]);

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================
  const BreadcrumbArrow = () => <span className="mx-1" style={{ color: D.orange, fontWeight: 700, fontSize: 13 }}>»</span>;
  const isLastStep = currentStep === steps[steps.length - 1]?.id;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(6px)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        .es-main, .es-main * { font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .es-main ::-webkit-scrollbar { width: 5px; height: 5px; }
        .es-main ::-webkit-scrollbar-track { background: transparent; }
        .es-main ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }
        .es-main ::-webkit-scrollbar-thumb:hover { background: #bbb; }
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
                const done = step.completed;

                // Determine if this step has unfilled required fields
                const stepHasError = (() => {
                  switch (step.title) {
                    case 'Exercise Type':
                      return !!validationErrors.exerciseType;
                    case 'Module':
                      return !!(validationErrors.selectedModule || validationErrors.selectedLanguages);
                    case 'Exercise Details':
                      return !!(validationErrors.exerciseName || validationErrors.totalDuration ||
                        validationErrors.totalMarks || validationErrors.totalMarksMCQ || validationErrors.totalMarksProgramming);
                    case 'MCQ Configuration':
                      return !!(validationErrors.mcqGeneralQuestionCount || validationErrors.mcqMarksPerQuestion || validationErrors.mcqTotalMarks);
                    case 'Programming Configuration':
                      return !!(validationErrors.programmingGeneralQuestionCount || validationErrors.programmingMarksPerQuestion ||
                        validationErrors.programmingLevelCounts || validationErrors.programmingLevelCounts_Easy ||
                        validationErrors.programmingLevelCounts_Medium || validationErrors.programmingLevelCounts_Hard ||
                        validationErrors.programmingTotalMarks || validationErrors.programmingLevelScoring);
                    default:
                      return false;
                  }
                })();

                // Schedule & Notification never show tick — always neutral
                const isOptionalStep = step.title === 'Schedule' || step.title === 'Notification';
                const showDone = done && !isOptionalStep;

                // Icon: check only if done AND no errors, else normal step icon
                const iconNode = showDone && !stepHasError
                  ? <Check size={9} strokeWidth={3} />
                  : <span style={{ fontSize: 8 }}>{step.icon}</span>;

                // Dot colour — no amber/warning tint
                const dotBg = active ? D.orange : (showDone && !stepHasError) ? D.emerald : D.surface2;
                const dotColor = active || (showDone && !stepHasError) ? '#fff' : D.textMuted;
                const dotShadow = active ? `0 2px 6px ${D.orangeGlow}` : 'none';

                // Label colour
                const labelColor = active ? D.orange : showDone ? D.textSub : D.textMuted;

                return (
                  <div key={step.id} className={`relative ${step.indentLevel ? 'ml-3' : ''}`}>
                    {idx > 0 && !step.isChild && (
                      <div className="absolute left-3 -top-0.5 h-1.5 w-px"
                        style={{ background: done ? D.orange + '40' : D.border }} />
                    )}
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 text-left focus:outline-none"
                      style={{
                        background: active ? D.orangeLight : 'transparent',
                        borderLeft: active ? `2px solid ${D.orange}` : '2px solid transparent',
                        cursor: active ? 'default' : 'pointer',
                      }}
                      title={active ? step.title : `Go to ${step.title}`}
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
                          {active && <div className="text-[9px] mt-0.5 font-medium" style={{ color: D.orange + 'aa' }}>{step.subtitle}</div>}
                          {!active && stepHasError && <div className="text-[9px] mt-0.5 font-medium" style={{ color: D.red }}>Incomplete</div>}
                        </div>
                        {stepHasError && (
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
            <div className="mt-auto pt-2 border-t" style={{ borderColor: D.border }}>
              {formData.exerciseType && (
                <div className="px-2 py-1.5 rounded-lg" style={{ background: D.orangeLight }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: D.orange + 'aa' }}>Type</div>
                  <div className="text-[11px] font-bold" style={{ color: D.orange }}>{formData.exerciseType}</div>
                </div>
              )}
            </div>
          </aside>

          {/* ── MAIN FORM ── */}
          <main className="flex-1 overflow-y-auto" style={{ background: D.bg }}>
            {renderCurrentStep()}
          </main>
        </div>

        {/* ── FOOTER ── */}
        <footer className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderTop: `1px solid ${D.border}`, background: D.bg }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {steps.map(s => (
                <div key={s.id} className="h-1.5 rounded-full transition-all duration-200"
                  style={{ background: s.completed ? D.orange : s.active ? D.orange : D.border, width: s.active ? 14 : 5 }} />
              ))}
            </div>
            <span className="text-[11px] font-semibold" style={{ color: D.textMuted }}>
              Step <span style={{ color: D.orange, fontWeight: 700 }}>{steps.findIndex(s => s.id === currentStep) + 1}</span> / {steps.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button onClick={handleBack} disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border disabled:opacity-50"
                style={{ borderColor: D.border, color: D.textSub, background: D.bg }}>
                <ArrowLeft size={12} />Back
              </button>
            )}
            <button onClick={handleNext} disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, ${D.orange}, ${D.orangeDark})`, boxShadow: `0 3px 10px ${D.orangeGlow}` }}>
              {isLoading && <Loader2 size={12} className="animate-spin" />}
              {isLastStep
                ? (isLoading ? 'Saving…' : isEditing ? '✓ Update Exercise' : '✓ Create Exercise')
                : 'Continue'}
              {!isLoading && !isLastStep && <ArrowRight size={12} />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ExerciseSettings;