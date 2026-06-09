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

// ─── Shared design tokens, helpers, step components ──────────────────────────
// Step renders progressively extracted into ExerciseSettings/steps/* — see
// ExerciseSettings/shared/* for the tokens, fonts and reusable UI primitives
// shared across the shell and every step.
import { D, FONT, injectFonts } from './ExerciseSettings/shared/tokens';
import {
  InfoTooltip, OInput, ONumberInput, OToggle, PortalDropdown,
  ExpandableSection, TimePicker, SectionLabel, ODropdown,
  SpinField, MonthDropField, DateRowPicker, GradeRow,
} from './ExerciseSettings/shared/UIComponents';
import { isApproximatelyEqual, formatDecimal } from './ExerciseSettings/shared/utils';
import { ScheduleStep } from './ExerciseSettings/steps/ScheduleStep';
import { NotificationsStep } from './ExerciseSettings/steps/NotificationsStep';
import { CombinedConfigStep } from './ExerciseSettings/steps/CombinedConfigStep';
import { ExerciseTypeStep } from './ExerciseSettings/steps/ExerciseTypeStep';
import { GradeSettingsStep } from './ExerciseSettings/steps/GradeSettingsStep';
import { ExerciseDetailsStep } from './ExerciseSettings/steps/ExerciseDetailsStep';

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


// All UI primitives & helpers now live in ./ExerciseSettings/shared/*
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
  // Schedule popup state lives inside the extracted ScheduleStep component now.
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
          // Green tick — Mark to Pass is optional, so just check that Grade Settings was visited/saved
          if (formData.exerciseType === 'MCQ') filled = true;
          else if (formData.exerciseType === 'Other') filled = true;
          else if (formData.exerciseType === 'Programming') filled = (formData.grades.programmingGrade ?? 0) > 0;
          else if (formData.exerciseType === 'Combined') filled = true;
          else filled = false;
          break;
        }
        case 'Grade Settings':
          // Mark to Pass is optional — only Mark (programmingGrade) is required for Programming type
          if (formData.exerciseType === 'MCQ')
            filled = true;
          else if (formData.exerciseType === 'Other')
            filled = true;
          else if (formData.exerciseType === 'Programming')
            filled = (formData.grades.programmingGrade ?? 0) > 0;
          else if (formData.exerciseType === 'Combined')
            filled = true;
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
      // All three levels must have marks configured — a level with count > 0 but 0 marks is invalid
      const missingMarks = (['easy', 'medium', 'hard'] as const).filter(l => {
        const c = counts[l] ?? 0; if (!c) return false;
        const sc = ls?.[l];
        if (!sc) return true;
        return sc.type === 'level_specific' ? !(sc.marksPerQuestion && sc.marksPerQuestion > 0) : !(sc.totalMarks && sc.totalMarks > 0);
      });
      if (missingMarks.length > 0) return `Please enter marks for: ${missingMarks.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}`;
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
      // All three levels must have marks configured — a level with count > 0 but 0 marks is invalid
      const missingMarks = (['easy', 'medium', 'hard'] as const).filter(l => {
        const c = counts[l] ?? 0; if (!c) return false;
        const sc = ls?.[l];
        if (!sc) return true;
        return sc.type === 'level_specific' ? !(sc.marksPerQuestion && sc.marksPerQuestion > 0) : !(sc.totalMarks && sc.totalMarks > 0);
      });
      if (missingMarks.length > 0) return `Please enter marks for: ${missingMarks.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}`;
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
      // Mark to Pass is optional — only validate "cannot exceed" when provided
      if (g.mcqGradeToPass && autoGrade > 0 && g.mcqGradeToPass > autoGrade) {
        e.mcqGradeToPass = `Cannot exceed Mark (${autoGrade})`;
      }
    }

    if (et === 'Programming') {
      if (!g.programmingGrade || g.programmingGrade <= 0) e.programmingGrade = 'Mark is required';
      // Mark to Pass is optional — only validate "cannot exceed" when provided
      if (g.programmingGradeToPass && g.programmingGrade && g.programmingGradeToPass > g.programmingGrade) {
        e.programmingGradeToPass = `Cannot exceed Mark (${g.programmingGrade})`;
      }
    }

    if (et === 'Other') {
      const autoGrade = formData.totalMarks || 0;
      // Mark to Pass is optional — only validate "cannot exceed" when provided
      if (g.programmingGradeToPass && autoGrade > 0 && g.programmingGradeToPass > autoGrade) {
        e.programmingGradeToPass = `Cannot exceed Mark (${autoGrade})`;
      }
    }

    if (et === 'Combined') {
      if (g.separateMarks) {
        const autoMCQ = formData.totalMarksMCQ || 0;
        const autoProg = formData.totalMarksProgramming || 0;
        // Mark to Pass is optional — only validate "cannot exceed" when provided
        if (g.mcqGradeToPass && autoMCQ > 0 && g.mcqGradeToPass > autoMCQ)
          e.mcqGradeToPass = `Cannot exceed MCQ Mark (${autoMCQ})`;
        if (g.programmingGradeToPass && autoProg > 0 && g.programmingGradeToPass > autoProg)
          e.programmingGradeToPass = `Cannot exceed Programming Mark (${autoProg})`;
      } else {
        const autoGrade = (formData.totalMarksMCQ || 0) + (formData.totalMarksProgramming || 0);
        // Mark to Pass is optional — only validate "cannot exceed" when provided
        if (g.combinedGradeToPass && autoGrade > 0 && g.combinedGradeToPass > autoGrade) {
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
        'othersLevelCounts_Medium', 'othersLevelCounts_Hard', 'othersTotalMarks',
        'scoring_others_easy', 'scoring_others_medium', 'scoring_others_hard');
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
        allErrors.programmingTotalMarks || allErrors.programmingLevelScoring ||
        allErrors.othersGeneralQuestionCount || allErrors.othersMarksPerQuestion ||
        allErrors.othersLevelCounts || allErrors.othersLevelCounts_Easy ||
        allErrors.othersLevelCounts_Medium || allErrors.othersLevelCounts_Hard ||
        allErrors.othersTotalMarks || allErrors.othersLevelScoring)
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
      const BASE_URL = 'https://lms-server-ym1q.onrender.com';
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
  // ── buildStepScopedPayload ─────────────────────────────────────────────────
  // Update path: send ONLY the fields owned by the current step so the backend's
  // merge logic preserves data from steps the user hasn't reached yet. This avoids
  // 500s where empty/partial later-step data fails Mongoose validation.
  const buildStepScopedPayload = useCallback((stepTitle: string) => {
    const full: any = buildFullPayload();
    const base: any = {
      tabType: full.tabType,
      subcategory: full.subcategory,
      exerciseType: full.exerciseType,
      isGraded: full.isGraded,
      stepsSaved: full.stepsSaved,
      configurationType: full.configurationType,
    };
    switch (stepTitle) {
      case 'Exercise Details':
        base.exerciseInformation = full.exerciseInformation;
        if (full.programmingSettings) base.programmingSettings = full.programmingSettings;
        break;
      case 'Question Configuration':
        base.questionConfiguration = full.questionConfiguration;
        base.exerciseInformation = full.exerciseInformation; // totals live here
        if (full.programmingSettings) base.programmingSettings = full.programmingSettings;
        if (full.questionBehavior) base.questionBehavior = full.questionBehavior;
        break;
      case 'Schedule':
        base.availabilityPeriod = full.availabilityPeriod;
        break;
      case 'Notifications':
      case 'Notification':
        base.notificationSettings = full.notificationSettings;
        break;
      case 'Grade Settings':
        base.gradeSettings = full.gradeSettings;
        if (full.additionalOptions) base.additionalOptions = full.additionalOptions;
        break;
      default:
        // Unknown step → fall back to full payload (safe).
        return full;
    }
    return base;
  }, [buildFullPayload]);

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

      const currentTitle = steps.find(s => s.id === currentStep)?.title;
      const currentId = localExerciseId || (isEditing ? exercise_Id : null);
      // On UPDATE, send only this step's slice — backend merges, untouched data
      // from later/unfilled steps stays intact. On CREATE (no currentId yet),
      // we still need the full payload so the document is constructed correctly.
      const payload = (currentId && currentTitle)
        ? buildStepScopedPayload(currentTitle)
        : buildFullPayload();
      // Always advance stepsSaved with the step being saved now.
      if (currentTitle) {
        const merged = new Set(savedSteps);
        merged.add(currentTitle);
        payload.stepsSaved = [...merged];
      }

      if (!currentId && !formData.exerciseName?.trim()) {
        toast('Enter an exercise name to save', { position: 'top-right', duration: 2500, icon: 'ℹ️', id: 'need-name' });
        setIsSavingStep(false);
        return;
      }

      // FIXED: declare before if/else
      const entityPath = getEntityType(nodeType);
      const BASE_URL = 'https://lms-server-ym1q.onrender.com';
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

      // Clear all validation errors on successful save — sidebar indicators reset
      setValidationErrors({});
      setTouchedFields(new Set());

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
    buildStepScopedPayload,
    savedSteps,
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
          'othersLevelCounts_Medium', 'othersLevelCounts_Hard', 'othersTotalMarks',
          'scoring_others_easy', 'scoring_others_medium', 'scoring_others_hard');
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

      // For Combined type: auto-switch to the tab that has errors so the user can see them
      if (formData.exerciseType === 'Combined' && currentTitle === 'Question Configuration') {
        const hasProgrammingErrors = Object.keys(errors).some(k =>
          k.startsWith('programming') || k === 'programmingTotalMarks' || k === 'programmingLevelScoring'
        );
        const hasMCQErrors = Object.keys(errors).some(k =>
          k.startsWith('mcq') || k === 'mcqTotalMarks'
        );
        // Switch to the tab with errors; prefer programming if both have errors and user is on mcq
        if (hasProgrammingErrors && combinedConfigTab === 'mcq') {
          setCombinedConfigTab('programming');
        } else if (hasMCQErrors && combinedConfigTab === 'programming') {
          setCombinedConfigTab('mcq');
        }
      }

      // Determine which section has issues for a helpful toast message
      const hasLevelScoringError = !!(errors.othersLevelScoring || errors.programmingLevelScoring);
      const hasSumError = !!(errors.othersTotalMarks || errors.programmingTotalMarks);
      const scoringMsg = hasLevelScoringError
        ? 'Please fill in marks for all configured levels'
        : hasSumError
          ? 'Level marks total must equal total marks'
          : 'Please fill in all required fields';
      toast.error(scoringMsg, { position: 'top-right', duration: 4000, id: 'step-validation-error' });
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
  const renderExerciseType = useCallback(() => (
    <ExerciseTypeStep
      formData={formData}
      validationErrors={validationErrors}
      touchedFields={touchedFields}
      onSelectType={handleSelectExerciseType}
    />
  ), [formData.exerciseType, validationErrors, touchedFields, handleSelectExerciseType]);
  // ==========================================================================
  // RENDER: Exercise Details
  // ==========================================================================
  const renderExerciseDetails = useCallback(() => (
    <ExerciseDetailsStep
      formData={formData}
      setFormData={setFormData}
      validationErrors={validationErrors}
      setValidationErrors={setValidationErrors}
      touchedFields={touchedFields}
      markTouched={markTouched}
      handleSelectExerciseType={handleSelectExerciseType}
      configuredLanguages={configuredLanguages}
      isLockedForEdit={isLockedForEdit}
      steps={steps}
      savedSteps={savedSteps}
    />
  ), [formData, validationErrors, touchedFields, markTouched, handleSelectExerciseType, configuredLanguages, isLockedForEdit, steps, savedSteps, setFormData, setValidationErrors]);
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

    const progUsedMarks = othersAllocatedMarks;
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
                    liveUpdate
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
                    {othersLevelMismatch && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: D.red + '10', border: `1px solid ${D.red}30` }}>
                        <AlertCircle size={10} style={{ color: D.red, flexShrink: 0 }} />
                        <span className="text-[10px] font-semibold" style={{ color: D.red }}>{othersLevelMismatch}</span>
                      </div>
                    )}
                  </div>
                  {formData.isGraded !== false && (
                    <div className="flex items-center gap-1.5" style={{ fontFamily: FONT }}>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: D.blue + '15', color: D.blue }}>
                        Total Marks : &nbsp;<strong>{totalToUse}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: D.emerald + '15', color: D.emerald }}>
                        Used Marks : &nbsp;<strong>{formatDecimal(progUsedMarks)}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: (progRemainingMarks === 0 ? D.emerald : D.red) + '15', color: progRemainingMarks === 0 ? D.emerald : D.red }}>
                        Left Marks : &nbsp;<strong>{formatDecimal(progRemainingMarks)}</strong>
                      </span>
                    </div>
                  )}
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
                      {formData.isGraded !== false && (<>
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
                                onChange={v => updateOthersLevelScoringConfig(level, isQSpec ? { totalMarks: v } : { marksPerQuestion: v })}
                                liveUpdate />
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
                      </>)}
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
  // RENDER: Schedule — matches ScheduleStep.tsx layout (compact, orange palette)
  // ==========================================================================
  const renderScheduleConfiguration = useCallback(() => (
    <ScheduleStep
      formData={formData}
      setFormData={setFormData}
      validationErrors={validationErrors}
      setValidationErrors={setValidationErrors}
      touchedFields={touchedFields}
      isEditing={!!isEditing}
    />
  ), [formData, validationErrors, touchedFields, isEditing, setFormData, setValidationErrors]);
  // ==========================================================================
  // RENDER: Notification Settings
  // ==========================================================================
const renderNotifications = useCallback(() => (
  <NotificationsStep formData={formData} setFormData={setFormData} />
), [formData.notifications, formData.isGraded, setFormData]);
  // ==========================================================================
  // RENDER: Grade Settings
  // ==========================================================================

  const renderGradeSettings = useCallback(() => (
    <GradeSettingsStep
      formData={formData}
      setFormData={setFormData}
      validationErrors={validationErrors}
      setValidationErrors={setValidationErrors}
      touchedFields={touchedFields}
      markTouched={markTouched}
      levelTotalsFromConfig={levelTotalsFromConfig}
    />
  ), [formData, validationErrors, touchedFields, levelTotalsFromConfig, markTouched, setFormData, setValidationErrors]);
  // ==========================================================================
  // RENDER: Combined Question Configuration (tabbed MCQ + Programming)
  // ==========================================================================
  const renderCombinedConfiguration = useCallback(() => (
    <CombinedConfigStep
      combinedConfigTab={combinedConfigTab}
      setCombinedConfigTab={setCombinedConfigTab}
      validationErrors={validationErrors}
      mcqContent={renderMCQConfiguration()}
      programmingContent={renderProgrammingConfiguration()}
    />
  ), [combinedConfigTab, setCombinedConfigTab, validationErrors, renderMCQConfiguration, renderProgrammingConfiguration]);

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
