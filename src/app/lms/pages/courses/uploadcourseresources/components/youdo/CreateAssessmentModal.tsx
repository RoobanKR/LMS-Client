// CreateAssessmentModal.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { X, Sparkles, Settings2, ArrowLeft, ArrowRight, FileText, Loader2, Check, Lock, Shield, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { exerciseApi } from '@/apiServices/exercise';
import TipTapEditor from '@/app/lms/component/tiptopEditor';
import { D, injectFonts, getEntityType, isApproximatelyEqual, formatDecimal, moduleLanguages, mcqScoringOptions, generateCalendarDays } from './assessments/constants';
import { ExerciseSettingsProps, HierarchyData, Step, ValidationErrors, FormDataType } from './assessments/types';
import { MCQConfiguration } from './assessments/QuestionConfigurationSteps';
import { ScheduleStep } from './assessments/ScheduleStep';
import { NotificationsStep } from './assessments/NotificationsStep';
import { GradeSettingsStep } from './assessments/GradeSettingsStep';
import { InfoTooltip, OInput, ONumberInput, OToggle, ODropdown, GradeRow, DateRowPicker } from './assessments/UIComponents';
import { ExerciseDetailsStep, SectionItem, ExerciseDetailsStepRef } from './assessments/ExerciseDetailsStep';
import { SecuritySettings, SecuritySettingsData, defaultSecuritySettings } from './assessments/SecuritySettings';
import { courseDataApi } from '@/apiServices/coursesData';
import { ProgrammingConfiguration } from './assessments/ProgrammingConfiguration';
import { CombinedConfiguration } from './assessments/CombinedConfiguration';
import { OthersConfiguration } from './assessments/OthersConfiguration';
import { SectionConfigurationStep, SectionConfigurationStepRef } from './assessments/SectionConfiguration';

const CreateAssessmentModal: React.FC<ExerciseSettingsProps> = ({
  hierarchyData, nodeId, nodeName, nodeType, subcategory, courseId, onSave = () => {}, onClose,
  isEditing = false, tabType = 'You_Do', initialData, exercise_Id, exerciseData: preloadedExercise, configuredLanguages
}) => {
  injectFonts();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [savedSteps, setSavedSteps] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLocked, setIsLocked] = useState(false);
  const [localExerciseId, setLocalExerciseId] = useState<string | null>(exercise_Id || null);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [activePicker, setActivePicker] = useState<{ field: string | null; type: string | null }>({ field: null, type: null });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['configuration']));
  const [combinedConfigTab, setCombinedConfigTab] = useState<'mcq' | 'programming'>('mcq');
  
  // Section-based state
  const [isSectionBased, setIsSectionBased] = useState(false);
  const [isSectionBasedDuration, setIsSectionBasedDuration] = useState(false);
  const [exerciseSections, setExerciseSections] = useState<SectionItem[]>([]);
  const exerciseDetailsStepRef = useRef<ExerciseDetailsStepRef>(null);
  const sectionConfigurationStepRef = useRef<SectionConfigurationStepRef>(null);
  // Guard: populate the form from the loaded exercise ONCE per exercise.
  // Without this, a re-rendered `exerciseData` (parent computes it inline via
  // rawExercises.find) re-runs the loader and clobbers in-progress edits
  // (e.g. the Camera Proctoring toggle reverting on save).
  const populatedForIdRef = useRef<string | null>(null);

  const [courseConfig, setCourseConfig] = useState<{
    coreProgram: string[];
    frontend: string[];
    database: string[];
  }>({
    coreProgram: [],
    frontend: [],
    database: []
  });
  const [isLoadingCourse, setIsLoadingCourse] = useState(false);

  const [formData, setFormData] = useState<FormDataType>({
    exerciseType: 'MCQ',
      testType: 'mock',  // ← ADD THIS LINE
    selectedModule: '', selectedLanguages: [],
    exerciseId: `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    exerciseName: '', description: '',
    exerciseLevel: 'intermediate',
    totalDuration: 60, totalMarks: 0, totalMarksMCQ: 0, totalMarksProgramming: 0,
    mcqConfig: {
      questionConfigType: 'general',
      generalQuestionCount: 0,
      sectionConfig: {
        sections: {},
        totalSections: 0,
        totalQuestions: 0,
        totalMarks: 0
      },
      scoreSettings: { 
        scoreType: 'equalDistribution',
        equalDistribution: 0, 
        totalMarks: 0 
      },
      attemptLimitEnabled: false, 
      submissionAttempts: 1,
    },
    programmingConfig: {
      questionConfigType: 'general', generalQuestionCount: 0,
      selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
      levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
      sectionConfig: {
        sections: {},
        totalSections: 0,
        totalQuestions: 0,
        totalMarks: 0
      },
      scoreSettings: {
        scoreType: 'equalDistribution', equalDistribution: 0,
        questionSpecific: { general: [], levelBased: { easy: [], medium: [], hard: [] } },
        levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
        levelScoringConfiguration: {
          easy: { type: 'level_specific', marksPerQuestion: 0, totalMarks: undefined, questionCount: 0 },
          medium: { type: 'level_specific', marksPerQuestion: 0, totalMarks: undefined, questionCount: 0 },
          hard: { type: 'level_specific', marksPerQuestion: 0, totalMarks: undefined, questionCount: 0 },
        },
        totalMarks: 0,
      },
      questionFlow: 'freeFlow', attemptLimitEnabled: false, submissionAttempts: 1,
    },
    othersConfig: {
      questionConfigType: 'general', generalQuestionCount: 0,
      selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
      levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
      sectionConfig: {
        sections: {},
        totalSections: 0,
        totalQuestions: 0,
        totalMarks: 0
      },
      scoreSettings: {
        scoreType: 'equalDistribution', equalDistribution: 0,
        questionSpecific: { general: [], levelBased: { easy: [], medium: [], hard: [] } },
        levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
        levelScoringConfiguration: {
          easy: { type: 'level_specific', marksPerQuestion: 0, totalMarks: undefined, questionCount: 0 },
          medium: { type: 'level_specific', marksPerQuestion: 0, totalMarks: undefined, questionCount: 0 },
          hard: { type: 'level_specific', marksPerQuestion: 0, totalMarks: undefined, questionCount: 0 },
        },
        totalMarks: 0,
      },
      questionFlow: 'freeFlow', attemptLimitEnabled: false, submissionAttempts: 1,
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
    securitySettings: defaultSecuritySettings,
    notifyUsers: true, notifyGmail: false, notifyWhatsApp: false, gradeSheet: true,
    notifications: {
      notifyGradersSubmissions: false,
      notifyGradersLateSubmissions: false,
      notifyStudent: true,
    },
    grades: {
      mcqGrade: null, mcqGradeToPass: null,
      combinedGrade: null, combinedGradeToPass: null,
      separateMarks: false,
    },
    additionalOptions: {
      anonymousSubmissions: false,
      hideGraderIdentity: false,
    },
    sectionConfigs: {},
    isSectionBased: false,
    sections: []
  });

  const updateLevelScoringConfig = useCallback((level: 'easy' | 'medium' | 'hard', updates: any) => {
    setFormData(prev => ({
      ...prev,
      programmingConfig: {
        ...prev.programmingConfig,
        scoreSettings: {
          ...prev.programmingConfig.scoreSettings,
          levelScoringConfiguration: {
            ...prev.programmingConfig.scoreSettings.levelScoringConfiguration,
            [level]: { ...prev.programmingConfig.scoreSettings.levelScoringConfiguration[level], ...updates }
          }
        }
      }
    }));
  }, []);

  const updateOthersLevelScoringConfig = useCallback((level: 'easy' | 'medium' | 'hard', updates: any) => {
    setFormData(prev => ({
      ...prev,
      othersConfig: {
        ...prev.othersConfig,
        scoreSettings: {
          ...prev.othersConfig.scoreSettings,
          levelScoringConfiguration: {
            ...prev.othersConfig.scoreSettings.levelScoringConfiguration,
            [level]: { ...prev.othersConfig.scoreSettings.levelScoringConfiguration[level], ...updates }
          }
        }
      }
    }));
  }, []);

  const getProgrammingTotalQuestions = useCallback(() => {
    const pc = formData.programmingConfig;
    if (pc.questionConfigType === 'general') return pc.generalQuestionCount;
    if (pc.questionConfigType === 'levelBased') {
      const c = pc.levelBasedCounts;
      return c.easy + c.medium + c.hard;
    }
    if (pc.questionConfigType === 'selectionLevel') {
      const c = pc.selectionLevelCounts;
      return c.easy + c.medium + c.hard;
    }
    return 0;
  }, [formData.programmingConfig]);

  const programmingAllocatedMarks = useMemo(() => {
    let m = 0;
    const pc = formData.programmingConfig;
    if (pc.questionConfigType === 'general') {
      if (pc.scoreSettings.scoreType === 'equalDistribution') {
        m = pc.generalQuestionCount * pc.scoreSettings.equalDistribution;
      }
    } else {
      const counts = pc.questionConfigType === 'selectionLevel' ? pc.selectionLevelCounts : pc.levelBasedCounts;
      const ls = pc.scoreSettings.levelScoringConfiguration;
      (['easy', 'medium', 'hard'] as const).forEach(l => {
        const c = counts[l] || 0;
        if (!c) return;
        const s = ls[l];
        if (s) {
          if (s.type === 'level_specific' && s.marksPerQuestion) m += c * s.marksPerQuestion;
          else if (s.type === 'question_specific' && s.totalMarks) m += s.totalMarks;
        }
      });
    }
    return m;
  }, [formData.programmingConfig]);

  const othersAllocatedMarks = useMemo(() => {
    let m = 0;
    const oc = formData.othersConfig;
    if (oc.questionConfigType === 'general') {
      if (oc.scoreSettings.scoreType === 'equalDistribution') {
        m = oc.generalQuestionCount * oc.scoreSettings.equalDistribution;
      }
    } else {
      const counts = oc.questionConfigType === 'selectionLevel' ? oc.selectionLevelCounts : oc.levelBasedCounts;
      const ls = oc.scoreSettings.levelScoringConfiguration;
      (['easy', 'medium', 'hard'] as const).forEach(l => {
        const c = counts[l] || 0;
        if (!c) return;
        const s = ls[l];
        if (s) {
          if (s.type === 'level_specific' && s.marksPerQuestion) m += c * s.marksPerQuestion;
          else if (s.type === 'question_specific' && s.totalMarks) m += s.totalMarks;
        }
      });
    }
    return m;
  }, [formData.othersConfig]);

  const programmingLevelMismatch = useMemo((): string | null => {
    const et = formData.exerciseType;
    if (et !== 'Programming' && et !== 'Combined') return null;
    const ct = formData.programmingConfig.questionConfigType;
    if (ct === 'general') return null;
    const total = et === 'Combined' ? formData.totalMarksProgramming : formData.totalMarks;
    if (total <= 0) return null;
    const ls = formData.programmingConfig.scoreSettings?.levelScoringConfiguration;
    if (!ls) return null;
    
    const getSum = (counts: any) => {
      let s = 0;
      (['easy', 'medium', 'hard'] as const).forEach(l => {
        const c = counts?.[l] ?? 0;
        if (!c) return;
        const sc = ls?.[l];
        if (!sc) return;
        s += sc.type === 'level_specific' ? (sc.marksPerQuestion ?? 0) * c : sc.totalMarks ?? 0;
      });
      return s;
    };
    
    if (ct === 'levelBased') {
      const counts = formData.programmingConfig.levelBasedCounts;
      if (counts.easy <= 0 || counts.medium <= 0 || counts.hard <= 0) return null;
      const sum = getSum(counts);
      if (sum <= 0) return null;
      return isApproximatelyEqual(sum, total) ? null : `Level totals sum to ${sum} but total is ${total}.`;
    }
    
    if (ct === 'selectionLevel') {
      const counts = formData.programmingConfig.selectionLevelCounts;
      const active = (['easy', 'medium', 'hard'] as const).filter(l => counts?.[l] > 0);
      if (!active.length) return null;
      const sum = getSum(counts);
      if (sum <= 0) return null;
      return isApproximatelyEqual(sum, total) ? null : `Selected totals sum to ${sum} but total is ${total}.`;
    }
    return null;
  }, [formData.exerciseType, formData.totalMarks, formData.totalMarksProgramming, formData.programmingConfig]);

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
        const c = counts?.[l] ?? 0;
        if (!c) return;
        const sc = ls?.[l];
        if (!sc) return;
        s += sc.type === 'level_specific' ? (sc.marksPerQuestion ?? 0) * c : sc.totalMarks ?? 0;
      });
      return s;
    };
    
    if (ct === 'levelBased') {
      const counts = formData.othersConfig.levelBasedCounts;
      if (counts.easy <= 0 || counts.medium <= 0 || counts.hard <= 0) return null;
      const sum = getSum(counts);
      if (sum <= 0) return null;
      return isApproximatelyEqual(sum, total) ? null : `Level totals sum to ${sum} but total is ${total}.`;
    }
    
    if (ct === 'selectionLevel') {
      const counts = formData.othersConfig.selectionLevelCounts;
      const active = (['easy', 'medium', 'hard'] as const).filter(l => counts?.[l] > 0);
      if (!active.length) return null;
      const sum = getSum(counts);
      if (sum <= 0) return null;
      return isApproximatelyEqual(sum, total) ? null : `Selected totals sum to ${sum} but total is ${total}.`;
    }
    return null;
  }, [formData.exerciseType, formData.totalMarks, formData.othersConfig]);

  const shouldShowScoringSection = useMemo(() => {
    const ct = formData.programmingConfig.questionConfigType;
    if (ct === 'general') return false;
    if (ct === 'levelBased') {
      const c = formData.programmingConfig.levelBasedCounts;
      return c.easy > 0 && c.medium > 0 && c.hard > 0;
    }
    if (ct === 'selectionLevel') {
      const c = formData.programmingConfig.selectionLevelCounts;
      return c.easy > 0 || c.medium > 0 || c.hard > 0;
    }
    return false;
  }, [formData.programmingConfig]);

  const othersShouldShowScoringSection = useMemo(() => {
    const ct = formData.othersConfig.questionConfigType;
    if (ct === 'general') return false;
    if (ct === 'levelBased') {
      const c = formData.othersConfig.levelBasedCounts;
      return c.easy > 0 && c.medium > 0 && c.hard > 0;
    }
    if (ct === 'selectionLevel') {
      const c = formData.othersConfig.selectionLevelCounts;
      return c.easy > 0 || c.medium > 0 || c.hard > 0;
    }
    return false;
  }, [formData.othersConfig]);

  useEffect(() => {
    const fetchCourseData = async () => {
      let extractedCourseId = null;
      
      if (courseId) {
        extractedCourseId = courseId;
      } else if ((hierarchyData as any)?.courseId) {
        extractedCourseId = (hierarchyData as any).courseId;
      } else if ((hierarchyData as any)?.course?._id) {
        extractedCourseId = (hierarchyData as any).course._id;
      } else if (nodeType === 'course' && nodeId) {
        extractedCourseId = nodeId;
      }
      
      if (!extractedCourseId) {
        return;
      }

      setIsLoadingCourse(true);
      try {
        const response = await courseDataApi.getById(extractedCourseId).queryFn();
        const courseData = response?.data || response;
        
        if (courseData && courseData.testConfiguration) {
          setCourseConfig({
            coreProgram: courseData.testConfiguration.coreProgram || [],
            frontend: courseData.testConfiguration.frontend || [],
            database: courseData.testConfiguration.database || []
          });
        }
      } catch (error) {
        console.error('Failed to fetch course configuration:', error);
        toast.error('Failed to load course configuration');
      } finally {
        setIsLoadingCourse(false);
      }
    };

    if (hierarchyData || nodeId || courseId) {
      fetchCourseData();
    }
  }, [hierarchyData, nodeId, nodeType, courseId]);

  // Prefer the node-scoped configuredLanguages prop (the topic's OWN
  // testConfiguration — e.g. just html/css/js) over the whole-course config
  // fetched below as a fallback. This mirrors how ExerciseSettings receives its
  // node-scoped languages, so the Skill Set chips match it exactly.
  const effectiveConfig = useMemo(() => {
    const hasProp = !!(
      configuredLanguages &&
      ((configuredLanguages.coreProgram?.length ?? 0) ||
        (configuredLanguages.frontend?.length ?? 0) ||
        (configuredLanguages.database?.length ?? 0))
    );
    return hasProp
      ? {
          coreProgram: configuredLanguages!.coreProgram ?? [],
          frontend: configuredLanguages!.frontend ?? [],
          database: configuredLanguages!.database ?? [],
        }
      : courseConfig;
  }, [configuredLanguages, courseConfig]);

  const getFilteredLanguages = useCallback((category: string) => {
    let languages: string[] = [];

    if (category === "Core Programming") {
      languages = effectiveConfig.coreProgram || [];
    } else if (category === "Frontend") {
      languages = effectiveConfig.frontend || [];
    } else if (category === "Database") {
      languages = effectiveConfig.database || [];
    }

    const languageMap: Record<string, { name: string; icon: string }> = {
      c: { name: "C", icon: "" }, cpp: { name: "C++", icon: "" },
      java: { name: "Java", icon: "" }, python: { name: "Python", icon: "" },
      html: { name: "HTML", icon: "" }, css: { name: "CSS", icon: "" },
      js: { name: "JavaScript", icon: "" }, react: { name: "React", icon: "" },
      next: { name: "Next.js", icon: "" }, sql: { name: "SQL", icon: "" },
      mongodb: { name: "MongoDB", icon: "" },
    };

    return languages.map(lang => ({
      name: languageMap[lang]?.name || lang,
      icon: languageMap[lang]?.icon || ""
    }));
  }, [effectiveConfig]);

  const hasPreConfiguredLanguages = useMemo(() => {
    return !!(effectiveConfig.coreProgram?.length || effectiveConfig.frontend?.length || effectiveConfig.database?.length);
  }, [effectiveConfig]);

  const flatLanguages = useMemo(() => {
    return [
      ...(effectiveConfig.coreProgram || []),
      ...(effectiveConfig.frontend || []),
      ...(effectiveConfig.database || [])
    ];
  }, [effectiveConfig]);

  // Auto-select all configured languages as the assessment's Skill Set —
  // mirrors ExerciseSettings. ExerciseDetailsStep shows the Skill Set read-only
  // as chips, so the selection must be applied here for it to be saved.
  useEffect(() => {
    if (!hasPreConfiguredLanguages || flatLanguages.length === 0) return;
    let detectedModule = '';
    if (effectiveConfig.coreProgram?.length) detectedModule = 'Core Programming';
    else if (effectiveConfig.frontend?.length) detectedModule = 'Frontend';
    else if (effectiveConfig.database?.length) detectedModule = 'Database';
    setFormData(prev => ({
      ...prev,
      selectedLanguages: flatLanguages,
      selectedModule: detectedModule || prev.selectedModule,
    }));
    setValidationErrors(prev => {
      const e = { ...prev };
      delete e.selectedModule;
      delete e.selectedLanguages;
      return e;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPreConfiguredLanguages, flatLanguages.join(',')]);

  const mcqScoringOptionsConst = useMemo(() => [
    { value: 'equalDistribution', label: 'Equal Distribution' },
    { value: 'questionSpecific', label: 'Question Specific' },
  ], []);

  const configOptions = useMemo(() => [
    { label: 'General Configuration', value: 'general' },
    { label: 'Level Based Configuration', value: 'levelBased' },
    { label: 'Selection Level Configuration', value: 'selectionLevel' },
  ], []);

  const questionFlowOptions = useMemo(() => [
    { value: 'freeFlow', label: 'Free Flow', description: 'Users can attempt questions in any order', icon: null },
    { value: 'controlled', label: 'Controlled Flow', description: 'Users must follow specific sequence', icon: null },
  ], []);

  useEffect(() => {
    const loadExerciseData = async () => {
      if (!isEditing) return;

      // Populate ONCE per exercise — never clobber the user's in-progress edits
      // when the parent re-renders and hands us a new `exerciseData` reference.
      const loadKey = String(
        exercise_Id ||
        (preloadedExercise && (preloadedExercise._id || preloadedExercise.id)) ||
        'edit'
      );
      if (populatedForIdRef.current === loadKey) return;
      populatedForIdRef.current = loadKey;

      // ── Fast path: parent already has the data — no API call needed ──
      if (preloadedExercise) {
        populateFormFromExercise(preloadedExercise);
        setSavedSteps(new Set([1, 2, 3, 4, 5, 6, 7]));
        setCompletedSteps(new Set([1, 2, 3, 4, 5, 6, 7]));
        return;
      }

      // ── Slow path: fetch by ID if no preloaded data provided ──
      if (!exercise_Id) return;
      setIsLoading(true);
      try {
        const response = await exerciseApi.getExerciseById(exercise_Id);
        const exerciseData = response?.data?.exercise || response?.data || response;
        if (exerciseData) {
          populateFormFromExercise(exerciseData);
          setSavedSteps(new Set([1, 2, 3, 4, 5, 6, 7]));
          setCompletedSteps(new Set([1, 2, 3, 4, 5, 6, 7]));
        }
      } catch (error) {
        console.error('Failed to load exercise data:', error);
        toast.error('Failed to load exercise data');
      } finally {
        setIsLoading(false);
      }
    };

    loadExerciseData();
  }, [isEditing, exercise_Id, preloadedExercise]);

  // Sync isSectionBasedDuration state with formData.sectionBasedDuration
  useEffect(() => {
    if (formData.sectionBasedDuration !== undefined) {
      setIsSectionBasedDuration(formData.sectionBasedDuration);
    }
  }, [formData.sectionBasedDuration]);

  const populateFormFromExercise = useCallback((exercise: any) => {
    const info = exercise.exerciseInformation || {};
    const schedule = exercise.availabilityPeriod || {};
    const notifications = exercise.notificationSettings || {};
    const gradeSettings = exercise.gradeSettings || {};
    const additionalOptions = exercise.additionalOptions || {};
    const questionConfig = exercise.questionConfiguration || {};

    // Support both naming conventions the backend may use
    const mcqConfig =
      questionConfig.mcqConfig ||
      questionConfig.mcqQuestionConfiguration ||
      {};
    const programmingConfig =
      questionConfig.programmingConfig ||
      questionConfig.programmingQuestionConfiguration ||
      {};
    const othersConfig =
      questionConfig.othersQuestionConfiguration ||
      questionConfig.othersConfig ||
      {};

    const sectionsData = exercise.sections || [];
    const isSectionBasedVal =
      exercise.isSectionBased || info.isSectionBased || false;

    // 'SectionBased' is a storage value, not a valid form exerciseType —
    // fall back to root exercise.exerciseType or 'MCQ' so type buttons render properly
    let exerciseTypeVal: string =
      info.exerciseType || exercise.exerciseType || 'MCQ';
    if (exerciseTypeVal === 'SectionBased') exerciseTypeVal = 'MCQ';

    const parseDate = (dateStr: string) => {
      if (!dateStr) return { day: 0, month: 0, year: 0, hour: 0, minute: 0 };
      const date = new Date(dateStr);
      return {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        hour: date.getHours(),
        minute: date.getMinutes(),
      };
    };

    setFormData(prev => ({
      ...prev,

      // ── Exercise Details ───────────────────────────────────────────
      exerciseType: exerciseTypeVal,
      testType: info.testType || 'mock',
      exerciseId: info.exerciseId || prev.exerciseId,
      exerciseName: info.exerciseName || '',
      description: info.description || '',
      exerciseLevel: info.exerciseLevel || 'intermediate',
      totalDuration: info.totalDuration || 60,
      totalMarks: info.totalMarks || 0,
      totalMarksMCQ: info.totalMarksMCQ || 0,
      totalMarksProgramming: info.totalMarksProgramming || 0,
      selectedModule: info.selectedModule || '',
      selectedLanguages: info.selectedLanguages || [],
      isSectionBased: isSectionBasedVal,
      sectionBasedDuration: info.sectionBasedDuration || false,
      sections: sectionsData,
      sectionConfigs: exercise.sectionConfigs || {},

      // ── MCQ question config ────────────────────────────────────────
      mcqConfig: {
        ...prev.mcqConfig,
        questionConfigType: mcqConfig.questionConfigType || 'general',
        generalQuestionCount: mcqConfig.generalQuestionCount || 0,
        sectionConfig: mcqConfig.sectionConfig || prev.mcqConfig.sectionConfig,
        scoreSettings: mcqConfig.scoreSettings || prev.mcqConfig.scoreSettings,
        attemptLimitEnabled: mcqConfig.attemptLimitEnabled || false,
        submissionAttempts: mcqConfig.submissionAttempts || 1,
      },

      // ── Programming question config ────────────────────────────────
      programmingConfig: {
        ...prev.programmingConfig,
        questionConfigType: programmingConfig.questionConfigType || 'general',
        generalQuestionCount: programmingConfig.generalQuestionCount || 0,
        selectionLevelCounts:
          programmingConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 },
        levelBasedCounts:
          programmingConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 },
        scoreSettings:
          programmingConfig.scoreSettings || prev.programmingConfig.scoreSettings,
        questionFlow: programmingConfig.questionFlow || 'freeFlow',
        attemptLimitEnabled: programmingConfig.attemptLimitEnabled || false,
        submissionAttempts: programmingConfig.submissionAttempts || 1,
      },

      // ── Others question config ─────────────────────────────────────
      othersConfig: {
        ...prev.othersConfig,
        questionConfigType: othersConfig.questionConfigType || 'general',
        generalQuestionCount: othersConfig.generalQuestionCount || 0,
        selectionLevelCounts:
          othersConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 },
        levelBasedCounts:
          othersConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 },
        scoreSettings:
          othersConfig.scoreSettings || prev.othersConfig.scoreSettings,
        questionFlow: othersConfig.questionFlow || 'freeFlow',
        attemptLimitEnabled: othersConfig.attemptLimitEnabled || false,
        submissionAttempts: othersConfig.submissionAttempts || 1,
      },

      // ── Schedule ───────────────────────────────────────────────────
      schedule: {
        ...prev.schedule,
        allowSubmissions:
          schedule.allowSubmissions !== undefined ? schedule.allowSubmissions : true,
        startDate: parseDate(schedule.startDate),
        endDate: parseDate(schedule.endDate),
        cutOffEnabled: schedule.cutOffEnabled || false,
        cutOffDate: parseDate(schedule.cutOffDate),
        gracePeriodEnabled: schedule.gracePeriodEnabled || false,
        gracePeriodDate: parseDate(schedule.gracePeriodDate),
        remindGradeByEnabled: schedule.remindGradeByEnabled || false,
        remindGradeBy: parseDate(schedule.remindGradeBy),
      },

      // ── Security Settings ──────────────────────────────────────────
      // Merge defaults so older assessments (saved before newer fields like
      // faceMonitoringDetection existed) still have every field defined —
      // otherwise NumberInputs flip uncontrolled→controlled.
      securitySettings: { ...defaultSecuritySettings, ...(exercise.securitySettings || {}) },

      // ── Notifications ──────────────────────────────────────────────
      notifyUsers: notifications.notifyUsers || false,
      notifyGmail: notifications.notifyGmail || false,
      notifyWhatsApp: notifications.notifyWhatsApp || false,
      gradeSheet:
        notifications.gradeSheet !== undefined ? notifications.gradeSheet : true,
      notifications: {
        notifyGradersSubmissions: notifications.notifyGradersSubmissions || false,
        notifyGradersLateSubmissions:
          notifications.notifyGradersLateSubmissions || false,
        notifyStudent:
          notifications.notifyStudent !== undefined
            ? notifications.notifyStudent
            : true,
      },

      // ── Grades / Mark Settings ─────────────────────────────────────
      grades: {
        ...prev.grades,
        // Hydrate master toggle. Older saved exercises won't have this field
        // so default to true to preserve their existing behaviour.
        enablePassMark: gradeSettings.enablePassMark !== false,
        mcqGrade: gradeSettings.mcqGrade ?? null,
        mcqGradeToPass: gradeSettings.mcqGradeToPass ?? null,
        combinedGrade: gradeSettings.combinedGrade ?? null,
        combinedGradeToPass: gradeSettings.combinedGradeToPass ?? null,
        separateMarks: gradeSettings.separateMarks || false,
        // Hydrate per-section pass marks if the saved exercise has them.
        sectionPassMarks: gradeSettings.sectionPassMarks || prev.grades.sectionPassMarks || {},
      },

      // ── Additional Options ─────────────────────────────────────────
      additionalOptions: {
        anonymousSubmissions: additionalOptions.anonymousSubmissions || false,
        hideGraderIdentity: additionalOptions.hideGraderIdentity || false,
      },
    }));

    // Always sync isSectionBasedDuration regardless of whether sections are present
    if (isSectionBasedVal) {
      setIsSectionBased(true);
      setIsSectionBasedDuration(info.sectionBasedDuration || false);
      if (sectionsData.length > 0) {
        setExerciseSections(sectionsData);
      }
    }
  }, []);

  const toggleLanguage = useCallback((lang: string) => {
    setFormData(prev => ({ ...prev, selectedLanguages: prev.selectedLanguages.includes(lang) ? prev.selectedLanguages.filter(l => l !== lang) : [...prev.selectedLanguages, lang] }));
    setValidationErrors(prev => { const e = { ...prev }; delete e.selectedLanguages; return e; });
  }, []);

  const markTouched = useCallback((f: string) => setTouchedFields(prev => new Set(prev).add(f)), []);
  const markAllTouched = useCallback((fields: string[]) => setTouchedFields(prev => { const n = new Set(prev); fields.forEach(f => n.add(f)); return n; }), []);

  const handleSelectExerciseType = useCallback((type: "MCQ" | "Programming" | "Combined" | "Other") => {
    setFormData(prev => ({
      ...prev,
      exerciseType: type,
      selectedModule: '',
      selectedLanguages: [],
    }));
  }, []);

  const getSteps = useCallback((): Step[] => {
    const steps: Step[] = [];
    let next = 1;
    steps.push({ id: next, title: 'Exercise Details', subtitle: 'Info & Time', completed: currentStep > next, active: currentStep === next, icon: <FileText size={12} /> }); 
    next++;
    
    if (isSectionBased) {
      steps.push({ id: next, title: 'Section Details', subtitle: 'Configure Sections', completed: currentStep > next, active: currentStep === next, icon: <Layers size={12} /> }); 
      next++;
    }
     if (!isSectionBased) {
    steps.push({ id: next, title: 'Question Configuration', subtitle: 'Configure Questions', completed: currentStep > next, active: currentStep === next, icon: <FileText size={12} /> }); 
    next++;
  }
    steps.push({ id: next, title: 'Schedule', subtitle: 'Dates & Times', completed: currentStep > next, active: currentStep === next, icon: <FileText size={12} /> }); 
    next++;
    steps.push({ id: next, title: 'Security Settings', subtitle: 'Test Security', completed: currentStep > next, active: currentStep === next, icon: <Shield size={12} /> }); 
    next++;
    steps.push({ id: next, title: 'Notifications', subtitle: 'Alerts & Notify', completed: currentStep > next, active: currentStep === next, icon: <FileText size={12} /> }); 
    next++;
    steps.push({ id: next, title: 'Mark Settings', subtitle: 'Marks & Grading', completed: currentStep > next, active: currentStep === next, icon: <FileText size={12} /> });
    
    return steps;
  }, [currentStep, isSectionBased]);

  const steps = useMemo(() => getSteps(), [getSteps]);

  const validateExerciseDetails = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    if (!formData.exerciseName.trim()) e.exerciseName = 'Exercise name is required';
    if (formData.totalDuration <= 0) e.totalDuration = 'Duration must be greater than 0';
    if (formData.totalMarks <= 0 && !isSectionBased) e.totalMarks = 'Total marks must be greater than 0';
    if (!isSectionBased && !formData.exerciseType) e.exerciseType = 'Exercise type is required';
    return e;
  }, [formData.exerciseName, formData.totalDuration, formData.totalMarks, formData.exerciseType, isSectionBased]);

  const validateGradeSettings = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    const g = formData.grades;

    // Master toggle off → no pass-mark fields are shown, so nothing to validate.
    if (g.enablePassMark === false) return e;

    // ── Section-based: one overall Mark to Pass, validated against the
    // aggregated total (sum of every part's totalMarks). Rule: > 0 AND
    // strictly less than the aggregated total (e.g. parts 50 + 30 + 40 = 120
    // → max overall pass mark 119). Per-section pass marks were dropped
    // in favour of a single overall threshold.
    if (isSectionBased) {
      const aggregatedTotal = exerciseSections.reduce(
        (sum, s) => sum + Number(s.totalMarks || 0),
        0
      );
      const v = g.combinedGradeToPass;
      if (v == null || Number.isNaN(v) || v <= 0) {
        e.combinedGradeToPass = 'Mark to Pass is required';
      } else if (aggregatedTotal > 0 && v >= aggregatedTotal) {
        e.combinedGradeToPass = `Mark to Pass must be less than Total Mark (${aggregatedTotal}) — max ${aggregatedTotal - 1}`;
      }
      return e;
    }

    // ── Non-section path (unchanged) ────────────────────────────────────
    const autoGrade = formData.totalMarks;
    if (!g.mcqGradeToPass || g.mcqGradeToPass <= 0) e.mcqGradeToPass = 'Mark to Pass is required';
    else if (autoGrade > 0 && g.mcqGradeToPass > autoGrade) e.mcqGradeToPass = `Cannot exceed Mark (${autoGrade})`;
    return e;
  }, [formData.grades, formData.totalMarks, isSectionBased, exerciseSections]);

  const validateSections = useCallback((): ValidationErrors => {
    const e: ValidationErrors = {};
    if (isSectionBased) {
      if (exerciseSections.length === 0) {
        e.sections = 'At least one section is required';
      }
      exerciseSections.forEach((section, idx) => {
        if (!section.name.trim()) {
          e[`section_${section.id}_name`] = `Section ${idx + 1} name is required`;
        }
      });
    }
    return e;
  }, [isSectionBased, exerciseSections]);

  const isStepCompleted = useCallback((stepId: number): boolean => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return false;
    switch (step.title) {
      case 'Exercise Details': {
        const base = !!(formData.exerciseName?.trim() && formData.totalDuration > 0);
        if (isSectionBased) {
          return base && exerciseSections.length > 0 && exerciseSections.every(s => s.name.trim());
        }
        return base && formData.totalMarks > 0 && !!formData.exerciseType;
      }
      case 'Section Details':
        return exerciseSections.length > 0 && exerciseSections.every(s => s.name.trim());
      case 'Schedule': {
        const sched = formData.schedule as any;
        return !!(sched.startDate?.year > 0 && sched.endDate?.year > 0);
      }
      case 'Security Settings': return true;
      case 'Mark Settings': return Object.keys(validateGradeSettings()).length === 0;
      default: return true;
    }
  }, [steps, formData, validateGradeSettings, isSectionBased, exerciseSections]);

  const handleNext = useCallback(() => {
    if (isStepCompleted(currentStep)) setCompletedSteps(prev => new Set(prev).add(currentStep));
    if (currentStep < steps[steps.length - 1]?.id) {
      const ci = steps.findIndex(s => s.id === currentStep);
      if (ci < steps.length - 1) setCurrentStep(steps[ci + 1].id);
    }
  }, [currentStep, steps, isStepCompleted]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      const ci = steps.findIndex(s => s.id === currentStep);
      if (ci > 0) setCurrentStep(steps[ci - 1].id);
    }
  }, [currentStep, steps]);

const buildFullPayload = useCallback((overrideSectionConfigs?: Record<string, any>) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const sd = formData.schedule.startDate;
  const startDT = (sd.day > 0 && sd.month > 0 && sd.year > 0) ? `${sd.year}-${pad(sd.month)}-${pad(sd.day)}T${pad(sd.hour || 0)}:${pad(sd.minute || 0)}` : null;
  const ed = (formData.schedule as any).endDate;
  const endDT = (ed && ed.day > 0 && ed.month > 0 && ed.year > 0) ? `${ed.year}-${pad(ed.month)}-${pad(ed.day)}T${pad(ed.hour || 0)}:${pad(ed.minute || 0)}` : null;

  // Use override if provided, otherwise use formData.sectionConfigs
  const sectionConfigsToUse = overrideSectionConfigs || formData.sectionConfigs;

  const payload: any = {
    tabType, 
    subcategory, 
    exerciseType: isSectionBased ? 'SectionBased' : formData.exerciseType,
    isSectionBased,
    sections: exerciseSections,
    sectionConfigs: sectionConfigsToUse,  // Use the override
    configurationType: { mcqMode: formData.exerciseType === 'MCQ' },
    
    // ... rest of the payload remains the same
    exerciseInformation: { 
      exerciseId: formData.exerciseId, 
      exerciseName: formData.exerciseName, 
      testType: formData.testType || 'mock',
      description: formData.description || '', 
      exerciseLevel: formData.exerciseLevel || 'beginner', 
      totalDuration: formData.totalDuration || 60, 
      totalMarks: formData.totalMarks,
      exerciseType: isSectionBased ? 'SectionBased' : formData.exerciseType,
      selectedModule: formData.selectedModule,
      selectedLanguages: formData.selectedLanguages,
      isSectionBased,
      sectionBasedDuration: formData.sectionBasedDuration || false,
    },
    
    securitySettings: formData.securitySettings,
    
    availabilityPeriod: { 
      startDate: startDT, 
      endDate: endDT, 
      cutOffEnabled: !!(formData.schedule as any).cutOffEnabled, 
      cutOffDate: (formData.schedule as any).cutOffEnabled ? (formData.schedule as any).cutOffDate : null, 
      gracePeriodEnabled: formData.schedule.gracePeriodEnabled, 
      gracePeriodAllowed: formData.schedule.gracePeriodEnabled, 
      extendedDays: 0 
    },
    notificationSettings: { 
      notifyUsers: formData.notifyUsers || false, 
      notifyGmail: formData.notifyGmail || false, 
      notifyWhatsApp: formData.notifyWhatsApp || false, 
      gradeSheet: formData.gradeSheet !== undefined ? formData.gradeSheet : true, 
      notifyGradersSubmissions: formData.notifications.notifyGradersSubmissions, 
      notifyGradersLateSubmissions: formData.notifications.notifyGradersLateSubmissions, 
      notifyStudent: formData.notifications.notifyStudent 
    },
    gradeSettings: {
      // Master toggle. When false, downstream consumers should treat the
      // exercise as having no pass/fail threshold and ignore the mark fields.
      enablePassMark: formData.grades.enablePassMark !== false,
      mcqGrade: formData.grades.mcqGrade || null,
      mcqGradeToPass: formData.grades.mcqGradeToPass || null,
      // Persist per-section pass marks when the exercise is section-based.
      // Shape: { [sectionId]: number } — keyed by SectionItem.id so the
      // backend can map back to the section that owns the pass mark.
      ...(isSectionBased ? { sectionPassMarks: formData.grades.sectionPassMarks || {} } : {}),
    },
    additionalOptions: { 
      anonymousSubmissions: formData.additionalOptions.anonymousSubmissions, 
      hideGraderIdentity: formData.additionalOptions.hideGraderIdentity 
    },
    questionConfiguration: {
      mcqConfig: {
        generalQuestionCount: formData.mcqConfig.generalQuestionCount,
        scoreSettings: formData.mcqConfig.scoreSettings,
        attemptLimitEnabled: formData.mcqConfig.attemptLimitEnabled,
        submissionAttempts: formData.mcqConfig.submissionAttempts
      }
    },
    questions: [],
  };
  
    if (!isSectionBased) {
      if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
        payload.questionConfiguration.programmingConfig = {
          questionConfigType: formData.programmingConfig.questionConfigType,
          generalQuestionCount: formData.programmingConfig.generalQuestionCount,
          selectionLevelCounts: formData.programmingConfig.selectionLevelCounts,
          levelBasedCounts: formData.programmingConfig.levelBasedCounts,
          scoreSettings: formData.programmingConfig.scoreSettings,
          questionFlow: formData.programmingConfig.questionFlow,
          attemptLimitEnabled: formData.programmingConfig.attemptLimitEnabled,
          submissionAttempts: formData.programmingConfig.submissionAttempts,
        };
      }
      
      if (formData.exerciseType === 'Other') {
        payload.questionConfiguration.othersQuestionConfiguration = {
          questionConfigType: formData.othersConfig.questionConfigType,
          generalQuestionCount: formData.othersConfig.generalQuestionCount,
          selectionLevelCounts: formData.othersConfig.selectionLevelCounts,
          levelBasedCounts: formData.othersConfig.levelBasedCounts,
          scoreSettings: formData.othersConfig.scoreSettings,
          questionFlow: formData.othersConfig.questionFlow,
          attemptLimitEnabled: formData.othersConfig.attemptLimitEnabled,
          submissionAttempts: formData.othersConfig.submissionAttempts,
        };
      }
    }
    
    // 🔒 TEMP DIAGNOSTIC — what securitySettings is actually being sent on save.
    console.log('🔒 SAVE securitySettings →', JSON.stringify(payload.securitySettings));
    return payload;
}, [formData, tabType, subcategory, isSectionBased, exerciseSections]);
  const performSave = useCallback(async (afterSave?: () => void) => {
    if (isLocked) return;
    
    const currentTitle = steps.find(s => s.id === currentStep)?.title;
    if (currentTitle === 'Mark Settings') {
      toast('Please click "Save & Finish" to complete', { position: 'top-right', duration: 2000 });
      return;
    }
    
    setIsSavingStep(true);
    try {
      const payload = buildFullPayload();
      const currentId = localExerciseId || (isEditing ? exercise_Id : null);
      if (!currentId && !formData.exerciseName?.trim()) { 
        toast('Enter an exercise name to save', { position: 'top-right', duration: 2500, icon: 'ℹ️' }); 
        setIsSavingStep(false); 
        return; 
      }
      let response: any;
      if (currentId) {
        response = await exerciseApi.updateYouDoExercise(getEntityType(nodeType), nodeId, currentId, payload);
      } else {
        response = await exerciseApi.youDoAddExercise(getEntityType(nodeType), nodeId, payload);
        const newId = response?.data?.exercise?._id || response?.data?._id || response?._id;
        if (newId) setLocalExerciseId(newId);
      }
      setSavedSteps(prev => new Set(prev).add(currentStep));
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      afterSave?.();
    } catch (err: any) {
      toast.error(`Save failed: ${err?.response?.data?.message || err?.message || 'Failed to save'}`, { position: 'top-right', duration: 4000 });
    } finally { setIsSavingStep(false); }
  }, [isLocked, buildFullPayload, localExerciseId, isEditing, exercise_Id, formData.exerciseName, getEntityType, nodeType, nodeId, currentStep, steps, isStepCompleted]);

const handleSave = useCallback(async () => {
  const currentTitle = steps.find(s => s.id === currentStep)?.title;

  if (currentTitle === 'Mark Settings') {
    toast('Please click "Save & Finish" to complete your exercise', { position: 'top-right', duration: 2000 });
    return;
  }

  if (currentTitle === 'Notifications' || currentTitle === 'Notification') {
    // Persist to the backend (not just mark the step done) — same fix as the
    // Security Settings step, which previously only saved on Finish.
    await performSave(() => {
      toast.success('Notifications settings saved!', { position: 'top-right', duration: 1800 });
    });
    return;
  }

  if (currentTitle === 'Security Settings') {
    // Persist to the backend (not just mark the step done) so editing + Save
    // actually updates securitySettings — previously only Finish saved them.
    await performSave(() => {
      toast.success('Security settings saved!', { position: 'top-right', duration: 1800 });
    });
    return;
  }

  if (currentTitle === 'Section Details') {
    // ── STEP 1: Validate section names/details ─────────────────────
    const sectionErrors = validateSections();
    if (Object.keys(sectionErrors).length > 0) {
      setValidationErrors(prev => ({ ...prev, ...sectionErrors }));
      toast.error('Please complete all section details', { position: 'top-right', duration: 3000 });
      return;
    }

    // ── STEP 2: Validate all exercise types are selected ───────────
    if (isSectionBased && sectionConfigurationStepRef.current) {
      const exerciseTypeValidation = sectionConfigurationStepRef.current.validateAllExerciseTypesSelected();
      if (!exerciseTypeValidation.isValid) {
        toast.error(
          exerciseTypeValidation.error || 'Please select exercise type for all sections',
          { position: 'top-right', duration: 4000 }
        );
        return;
      }
    }

    // ── STEP 3: Validate marks match for every section ─────────────
    // This blocks save if any section's entered marks ≠ allocated marks
    if (isSectionBased && sectionConfigurationStepRef.current) {
      const marksValid = sectionConfigurationStepRef.current.validateAndShowAllErrors();
      if (!marksValid) {
        // Toast messages are already shown inside validateAndShowAllErrors
        // with section names e.g. "Part B: Total entered marks (27) must match allocated marks (50)"
        return;
      }
    }

    // ── STEP 4: All validations passed — proceed to save ──────────
    setIsSavingStep(true);
    try {
      const currentId = localExerciseId || (isEditing ? exercise_Id : null);

      // Wait for formData sectionConfigs to be in sync
      await new Promise(resolve => setTimeout(resolve, 50));

      const payload = buildFullPayload();

      console.log('Section Details Payload:', JSON.stringify(payload, null, 2));
      console.log('Calling API with:', {
        entityType: getEntityType(nodeType),
        nodeId,
        exerciseId: currentId,
        payload
      });

      let response: any;
      if (currentId) {
        response = await exerciseApi.updateYouDoExercise(getEntityType(nodeType), nodeId, currentId, payload);
      } else {
        response = await exerciseApi.youDoAddExercise(getEntityType(nodeType), nodeId, payload);
        const newId = response?.data?.exercise?._id || response?.data?._id || response?._id;
        if (newId) setLocalExerciseId(newId);
      }

      setSavedSteps(prev => new Set(prev).add(currentStep));
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      toast.success('Section configuration saved!', { position: 'top-right', duration: 1800 });
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(
        `Save failed: ${err?.response?.data?.message || err?.message || 'Failed to save'}`,
        { position: 'top-right', duration: 4000 }
      );
    } finally {
      setIsSavingStep(false);
    }
    return;
  }

  // ── All other steps ────────────────────────────────────────────────
  let errors: ValidationErrors = {};
  if (currentTitle === 'Exercise Details') {
    const detailsErrors = validateExerciseDetails();
    errors = { ...errors, ...detailsErrors };

    if (isSectionBased && exerciseDetailsStepRef.current) {
      const sectionValidation = exerciseDetailsStepRef.current.validateSectionBased();
      if (!sectionValidation.isValid) {
        toast.error(
          sectionValidation.error || 'Section validation failed',
          { position: 'top-right', duration: 4000 }
        );
        return;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    setValidationErrors(prev => ({ ...prev, ...errors }));
    markAllTouched(['exerciseName', 'totalDuration', 'totalMarks', 'exerciseType']);
    return;
  }

  await performSave(() => {
    toast.success('Saved!', { position: 'top-right', duration: 1800 });
  });
}, [
  steps,
  currentStep,
  validateExerciseDetails,
  validateSections,
  performSave,
  markAllTouched,
  buildFullPayload,
  localExerciseId,
  isEditing,
  exercise_Id,
  nodeType,
  nodeId,
  isSectionBased,
]);



const handleComplete = useCallback(async () => {
    if (isLoading) return;

    let allErrors: ValidationErrors = {};
    const detailsErrors = validateExerciseDetails();
    allErrors = { ...allErrors, ...detailsErrors };
    const gradeErrors = validateGradeSettings();
    allErrors = { ...allErrors, ...gradeErrors };

    // Surface section-based Mark to Pass validation as a toast so it's not
    // silently hidden behind the inline field error (Mark Settings step may
    // not be visible when Save & Finish is clicked from a different step).
    if (isSectionBased && gradeErrors.combinedGradeToPass) {
      setValidationErrors(prev => ({ ...prev, ...gradeErrors }));
      markTouched('combinedGradeToPass');
      toast.error(String(gradeErrors.combinedGradeToPass), { position: 'top-right', duration: 4000 });
      return;
    }

    // Validate section-based exercises
    if (isSectionBased && exerciseDetailsStepRef.current) {
      const sectionValidation = exerciseDetailsStepRef.current.validateSectionBased();
      if (!sectionValidation.isValid) {
        toast.error(sectionValidation.error || 'Section validation failed', { position: 'top-right', duration: 4000 });
        return;
      }
    }

    // Validate that all sections have exercise type selected
    if (isSectionBased && sectionConfigurationStepRef.current) {
      const exerciseTypeValidation = sectionConfigurationStepRef.current.validateAllExerciseTypesSelected();
      if (!exerciseTypeValidation.isValid) {
        toast.error(exerciseTypeValidation.error || 'Please select exercise type for all sections', { position: 'top-right', duration: 4000 });
        return;
      }
    }

    setIsLoading(true);
    try {
      const basePayload = buildFullPayload();
      const finalId = localExerciseId || (isEditing ? exercise_Id : null);
      
      let response;
      if (finalId) {
        response = await exerciseApi.updateYouDoExercise(getEntityType(nodeType), nodeId, finalId, basePayload);
      } else {
        response = await exerciseApi.youDoAddExercise(getEntityType(nodeType), nodeId, basePayload);
        const newId = response?.data?.exercise?._id || response?.data?._id || response?._id;
        if (newId) setLocalExerciseId(newId);
      }
      
      toast.success(isEditing ? 'Exercise updated successfully!' : 'Exercise created successfully!');
      setIsLocked(true);
      setCompletedSteps(new Set(steps.map(s => s.id)));
      setSavedSteps(new Set(steps.map(s => s.id)));
      
      if (typeof onSave === 'function') {
        await onSave(basePayload);
      }
      
      setIsLoading(false);
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save exercise');
      setIsLoading(false);
    }
  }, [validateExerciseDetails, validateGradeSettings, validateSections, isEditing, exercise_Id, getEntityType, nodeType, nodeId, onSave, onClose, buildFullPayload, localExerciseId, steps, isLoading, isSectionBased]);

  const handleStepClick = useCallback((targetStepId: number) => {
    if (targetStepId === currentStep) return;
    const step1Id = steps.find(s => s.title === 'Exercise Details')?.id ?? 1;
    // In edit mode all steps are already persisted — allow free navigation
    const step1Unlocked = isEditing || savedSteps.has(step1Id);
    if (!step1Unlocked && targetStepId !== step1Id) return;
    setCurrentStep(targetStepId);
  }, [currentStep, steps, savedSteps, isEditing]);

  const isDateDisabled = useCallback((year: number, month: number, day: number, fieldKey: string): boolean => {
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    if (fieldKey === 'startDate' && !isEditing) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return date < today;
    }
    return false;
  }, [isEditing]);

  const SectionLabel = useCallback(({ children, required, info }: { children: React.ReactNode; required?: boolean; info?: string }) => (
    <div className="flex items-center gap-1 mb-1">
      <label className="text-xs font-semibold" style={{ color: D.textSub, fontFamily: 'Inter, sans-serif' }}>{children}</label>
      {required && <span className="text-xs font-bold" style={{ color: D.orange }}>*</span>}
      {info && <InfoTooltip content={info} />}
    </div>
  ), []);

  const renderCurrentStep = useCallback(() => {
    const step = steps.find(s => s.id === currentStep);
    if (!step) return null;
    
    if (isLoadingCourse && step.title === 'Exercise Details') {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-2" style={{ color: D.orange }} />
            <p style={{ color: D.textMuted }}>Loading course configuration...</p>
          </div>
        </div>
      );
    }
    
    const sharedConfigProps = {
      formData,
      setFormData,
      setValidationErrors,
      validationErrors,
      touchedFields,
      markTouched,
      InfoTooltip,
      SectionLabel,
      ODropdown,
      ONumberInput,
      OToggle,
      OInput,
      D,
      mcqScoringOptions: mcqScoringOptionsConst,
      configOptions,
      questionFlowOptions,
      getProgrammingTotalQuestions,
      programmingAllocatedMarks,
      programmingLevelMismatch,
      shouldShowScoringSection,
      othersAllocatedMarks,
      othersLevelMismatch,
      othersShouldShowScoringSection,
      updateLevelScoringConfig,
      updateOthersLevelScoringConfig,
      setExpandedSections,
      expandedSections,
      combinedConfigTab,
      setCombinedConfigTab,
    };
    
    switch (step.title) {
      case 'Exercise Details':
        return <ExerciseDetailsStep
          ref={exerciseDetailsStepRef}
          formData={formData}
          setFormData={setFormData}
          setValidationErrors={setValidationErrors}
          validationErrors={validationErrors}
          touchedFields={touchedFields}
          markTouched={markTouched}
          handleSelectExerciseType={handleSelectExerciseType}
          toggleLanguage={toggleLanguage}
          configuredLanguages={effectiveConfig}
          hasPreConfiguredLanguages={hasPreConfiguredLanguages}
          flatLanguages={flatLanguages}
          getFilteredLanguages={getFilteredLanguages}
          TipTapEditor={TipTapEditor}
          OInput={OInput}
          ONumberInput={ONumberInput}
          SectionLabel={SectionLabel}
          onSectionsChange={setExerciseSections}
          isSectionBasedProp={isSectionBased}
          onSectionBasedChange={setIsSectionBased}
          sectionsProp={exerciseSections}
          isSectionBasedDurationProp={isSectionBasedDuration}
          onSectionBasedDurationChange={setIsSectionBasedDuration}
        />;
        case 'Question Configuration':
if (formData.exerciseType === 'MCQ') {
  return <MCQConfiguration {...sharedConfigProps} configOptions={configOptions} />;
}
  if (formData.exerciseType === 'Programming') {
    return <ProgrammingConfiguration {...sharedConfigProps} />;
  }
  if (formData.exerciseType === 'Combined') {
    return <CombinedConfiguration {...sharedConfigProps} />;
  }
  if (formData.exerciseType === 'Other') {
    return <OthersConfiguration {...sharedConfigProps} />;
  }
  return null;
        
      case 'Section Details':
        return (
          <SectionConfigurationStep
            ref={sectionConfigurationStepRef}
            sections={exerciseSections}
            formData={formData}
            setFormData={setFormData}
            setValidationErrors={setValidationErrors}
            validationErrors={validationErrors}
            touchedFields={touchedFields}
            markTouched={markTouched}
            InfoTooltip={InfoTooltip}
            SectionLabel={SectionLabel}
            ODropdown={ODropdown}
            ONumberInput={ONumberInput}
            OToggle={OToggle}
            OInput={OInput}
            configOptions={configOptions}
            questionFlowOptions={questionFlowOptions}
            mcqScoringOptions={mcqScoringOptionsConst}
          />
        );
        
      case 'Schedule':
        return <ScheduleStep 
          formData={formData} 
          setFormData={setFormData} 
          setValidationErrors={setValidationErrors}
          validationErrors={validationErrors} 
          touchedFields={touchedFields} 
          isEditing={isEditing} 
          activePicker={activePicker}
          setActivePicker={setActivePicker}
          DateRowPicker={DateRowPicker} 
          isDateDisabled={isDateDisabled} 
        />;
        
      case 'Security Settings':
        return (
          <div className="px-4 py-3">
            <div className="mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: D.orangeLight, color: D.orange }}>
                <Shield size={13} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: D.textMain }}>
                Security Settings
              </h3>
            </div>
            <SecuritySettings
              value={formData.securitySettings}
              onChange={(settings) => setFormData(prev => ({ ...prev, securitySettings: settings }))}
              disabled={isLocked}
            />
          </div>
        );
        
      case 'Notifications':
        return <NotificationsStep formData={formData} setFormData={setFormData} D={D} />;
        
      case 'Mark Settings':
        return <GradeSettingsStep formData={formData} setFormData={setFormData} validationErrors={validationErrors} touchedFields={touchedFields} markTouched={markTouched} D={D} GradeRow={GradeRow} isSectionBased={isSectionBased} exerciseSections={exerciseSections} />;
        
      default: 
        return null;
    }
  }, [steps, currentStep, formData, validationErrors, touchedFields, markTouched, handleSelectExerciseType, toggleLanguage, hasPreConfiguredLanguages, flatLanguages, getFilteredLanguages, effectiveConfig, isLoadingCourse, TipTapEditor, OInput, ONumberInput, InfoTooltip, ODropdown, OToggle, mcqScoringOptionsConst, isEditing, DateRowPicker, isDateDisabled, GradeRow, SectionLabel, updateLevelScoringConfig, updateOthersLevelScoringConfig, configOptions, questionFlowOptions, getProgrammingTotalQuestions, programmingAllocatedMarks, programmingLevelMismatch, shouldShowScoringSection, othersAllocatedMarks, othersLevelMismatch, othersShouldShowScoringSection, expandedSections, setExpandedSections, combinedConfigTab, setCombinedConfigTab, isSectionBased, exerciseSections]);

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
  const step1Id = steps.find(s => s.title === 'Exercise Details')?.id ?? 1;
  // When editing an existing exercise all steps are already saved — unlock entire sidebar
  const step1Unlocked = isEditing || savedSteps.has(step1Id);
  const isLastStep = currentStep === steps[steps.length - 1]?.id;
  const isOnStep1 = currentStep === step1Id;
  const busy = isLoading || isSavingStep;

  const BreadcrumbArrow = () => <span className="mx-1" style={{ color: D.orange, fontWeight: 700, fontSize: 13 }}>»</span>;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(6px)', fontFamily: 'Inter, sans-serif' }}>
      <div className="es-main bg-white w-full max-w-6xl flex flex-col overflow-hidden" style={{ height: '94vh', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.25), 0 8px 24px rgba(0,0,0,0.12)' }}>
        <header className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${D.border}`, background: D.bg }}>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isEditing ? D.amber + '20' : D.orange, boxShadow: `0 3px 8px ${D.orangeGlow}` }}>
              {isEditing ? <Settings2 size={13} style={{ color: D.amber }} /> : <Sparkles size={13} className="text-white" />}
            </div>
            <div className="w-px h-5 flex-shrink-0" style={{ background: D.border }} />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-extrabold mb-0.5" style={{ color: D.textMain }}>{isEditing ? 'Edit Exercise' : 'Create Exercise'}</div>
              <nav className="flex items-center flex-wrap">
                {breadcrumbs.slice(0, 2).map((c, i) => (<React.Fragment key={i}><span className="text-[11px] font-semibold truncate max-w-[80px]" style={{ color: D.textMuted }}>{c.name}</span><BreadcrumbArrow /></React.Fragment>))}
                {breadcrumbs.length > 0 && <><span className="text-[11px] font-semibold" style={{ color: D.textSub }}>{breadcrumbs[breadcrumbs.length - 1].name}</span><BreadcrumbArrow /></>}
                <span className="text-[11px] font-semibold" style={{ color: D.textSub }}>{tabType.replace(/_/g, ' ')}</span><BreadcrumbArrow />
                <span className="text-[11px] font-bold" style={{ color: D.orange }}>{subcategory}</span>
              </nav>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 hover:bg-gray-100" style={{ color: D.textMuted }}><X size={14} /></button>
        </header>

        {/* Dark scrollbar styling — scoped to the Create Assessment modal so
            the Exercise Details main scroll, the section list scroll, and the
            steps sidebar all share a visible dark thumb instead of the near-
            invisible browser default. */}
        <style>{`
          .ca-dark-scroll {
            scrollbar-color: #4b4b66 transparent;
            scrollbar-width: thin;
          }
          .ca-dark-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
          .ca-dark-scroll::-webkit-scrollbar-track { background: transparent; }
          .ca-dark-scroll::-webkit-scrollbar-thumb {
            background: #4b4b66;
            border-radius: 6px;
            border: 2px solid transparent;
            background-clip: padding-box;
          }
          .ca-dark-scroll::-webkit-scrollbar-thumb:hover { background: #2e2e44; background-clip: padding-box; }
          .ca-dark-scroll::-webkit-scrollbar-corner { background: transparent; }
        `}</style>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-44 flex-shrink-0 flex flex-col py-2.5 px-2 overflow-y-auto ca-dark-scroll" style={{ background: D.surface, borderRight: `1px solid ${D.border}` }}>
            <div className="space-y-0.5">
              {steps.map((step, idx) => {
                const active = step.active;
                const isStepSaved = savedSteps.has(step.id);
                const isLocked_step = step.title !== 'Exercise Details' && !step1Unlocked;
                const stepHasError = step.title === 'Exercise Details' && !!(validationErrors.exerciseName || validationErrors.totalDuration || validationErrors.totalMarks);
                const showDone = !active && isStepSaved;
                const iconNode = isLocked_step ? <Lock size={8} /> : showDone ? <Check size={9} strokeWidth={3} /> : <span style={{ fontSize: 8 }}>{step.icon}</span>;
                const dotBg = isLocked_step ? D.surface2 : active ? D.orange : isStepSaved ? D.emerald : D.surface2;
                const dotColor = isLocked_step ? D.textMuted : active || isStepSaved ? '#fff' : D.textMuted;
                const labelColor = isLocked_step ? D.textMuted : active ? D.orange : isStepSaved ? D.textSub : D.textMuted;
                return (
                  <button key={step.id} onClick={() => handleStepClick(step.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-150 text-left focus:outline-none" style={{ background: active ? D.orangeLight : 'transparent', borderLeft: active ? `2px solid ${D.orange}` : '2px solid transparent', cursor: isLocked_step ? 'not-allowed' : active ? 'default' : 'pointer', opacity: isLocked_step ? 0.55 : 1 }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200" style={{ background: dotBg, color: dotColor }}>{iconNode}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate leading-tight" style={{ color: labelColor }}>{step.title}</div>
                      {stepHasError && !isLocked_step && <div className="text-[9px] mt-0.5 font-medium" style={{ color: D.red }}>Required fields missing</div>}
                      {!active && !isLocked_step && !stepHasError && isStepSaved && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full inline-block mt-0.5" style={{ background: D.emerald + '15', color: D.emerald }}>Saved</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto flex flex-col ca-dark-scroll" style={{ background: D.bg }}>
            <div className="flex-1 overflow-y-auto ca-dark-scroll">
              {isLocked && (<div className="mx-4 mt-3 mb-0 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: D.emerald + '12', border: `1px solid ${D.emerald}35` }}><Lock size={12} style={{ color: D.emerald }} /><span className="text-xs font-semibold" style={{ color: D.emerald }}>This exercise has been submitted and is now read-only.</span></div>)}
              <div style={isLocked ? { pointerEvents: 'none', userSelect: 'none', opacity: 0.82 } : {}}>{renderCurrentStep()}</div>
            </div>
          </main>
        </div>

        <footer className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderTop: `1px solid ${D.border}`, background: D.bg }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">{steps.map(s => (<div key={s.id} className="h-1.5 rounded-full transition-all duration-200" style={{ background: isStepCompleted(s.id) ? D.emerald : s.active ? D.orange : D.border, width: s.active ? 14 : 5 }} />))}</div>
            <span className="text-[11px] font-semibold" style={{ color: D.textMuted }}>Step <span style={{ color: D.orange, fontWeight: 700 }}>{steps.findIndex(s => s.id === currentStep) + 1}</span> / {steps.length}</span>
            {savedSteps.has(currentStep) && (<span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: D.emerald + '12', color: D.emerald, border: `1px solid ${D.emerald}25` }}><Check size={8} strokeWidth={3} />Saved</span>)}
          </div>
          <div className="flex items-center gap-3">
            {currentStep > 1 && (<button onClick={handleBack} disabled={busy} className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold transition-all border disabled:opacity-50" style={{ borderColor: D.border, color: D.textSub, background: D.bg, minWidth: 90 }}><ArrowLeft size={12} />Back</button>)}
            {!isLastStep && !isLocked && (<button onClick={handleSave} disabled={busy} className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all border-0 cursor-pointer disabled:opacity-50" style={{ background: isSavingStep ? '#16a34a' : 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 3px 10px rgba(34,197,94,0.35)', minWidth: 90 }}>{isSavingStep ? <><Loader2 size={12} className="animate-spin" />Saving…</> : <><FileText size={12} />Save</>}</button>)}
            {!isLastStep && (<button onClick={handleNext} disabled={busy || (isOnStep1 && !step1Unlocked)} className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${D.orange}, ${D.orangeDark})`, boxShadow: `0 3px 10px ${D.orangeGlow}`, minWidth: 90 }}>Next <ArrowRight size={12} /></button>)}
            {isLastStep && !isLocked && (<button onClick={handleComplete} disabled={busy} className="flex items-center justify-center gap-1.5 px-6 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60" style={{ background: `linear-gradient(135deg, ${D.emerald}, #059669)`, boxShadow: `0 3px 10px ${D.emerald}40`, minWidth: 110 }}>{isLoading ? <><Loader2 size={12} className="animate-spin" />Saving…</> : <><FileText size={12} />Save &amp; Finish</>}</button>)}
            {isLocked && (<span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: D.emerald + '15', color: D.emerald, border: `1px solid ${D.emerald}40` }}><Check size={12} strokeWidth={3} />Submitted</span>)}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CreateAssessmentModal;