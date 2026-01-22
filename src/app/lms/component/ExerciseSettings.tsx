import React, { useState, useEffect } from 'react';
import {
  Save, X, ChevronDown, ChevronRight,
  Cpu, Terminal, Globe, SettingsIcon, TestTube,
  FileCode, Settings2, Code, Layers, Calendar,
  BarChart3, BookOpen, Wrench, Brain, Zap,
  Copy, Shuffle, SkipForward, Key, Users,
  Eye, MessageCircle, Loader2, RotateCcw,
  Check, AlertCircle, Plus, Minus, Award, TrendingUp,
  Shield, Camera, Clock, MonitorX, ClipboardX, Maximize,
  Info, Minimize // <--- 1. Added Minimize Icon
} from 'lucide-react';
import { exerciseApi, EntityType } from '@/apiServices/exercise';
import TipTapEditor from './tiptopEditor';
import 'react-toastify/dist/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';

interface HierarchyData {
  courseName: string;
  moduleName: string;
  submoduleName: string;
  topicName: string;
  subtopicName: string;
  nodeType: string;
  level: number;
}

interface LevelConfiguration {
  levelType: 'levelBased' | 'general';
  levelBased: {
    easy: number;
    medium: number;
    hard: number;
  };
  general: number;
}

interface ScoreSettings {
  scoreType: 'evenMarks' | 'separateMarks' | 'levelBasedMarks';
  evenMarks: number;
  separateMarks: {
    general: number[];
    levelBased: {
      easy: number[];
      medium: number[];
      hard: number[];
    };
  };
  levelBasedMarks: {
    easy: number;
    medium: number;
    hard: number;
  };
  totalMarks: number;
}

interface SecuritySettings {
  timerEnabled: boolean;
  timerType: 'exercise' | 'question';
  timerDuration: number;
  cameraMicEnabled: boolean;
  tabSwitchAllowed: boolean;
  maxTabSwitches: number;
  disableClipboard: boolean;
  fullScreenMode: boolean;
  restrictMinimize: boolean; // <--- 2. Added new interface property
  screenRecordingEnabled: boolean; // <--- ADD THIS

}

interface ExerciseSettingsData {
  tabType: 'I_Do' | 'We_Do' | 'You_Do';
  subcategory: string;
  exerciseInformation: {
    exerciseId: string;
    exerciseName: string;
    description: string;
    exerciseLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  programmingSettings: {
    selectedModule: string;
    selectedLanguages: string[];
    levelConfiguration: LevelConfiguration;
  };
  compilerSettings: {
    allowCopyPaste: boolean;
    autoSuggestion: boolean;
    autoCloseBrackets: boolean;
  };
  availabilityPeriod: {
    startDate: string;
    endDate: string;
    gracePeriodAllowed: boolean;
    gracePeriodDate: string;
    extendedDays: number;
  };
  questionBehavior: {
    shuffleQuestions: boolean;
    allowNext: boolean;
    allowSkip: boolean;
    attemptLimitEnabled: boolean;
    maxAttempts: number;
  };
  evaluationSettings: {
    practiceMode: boolean;
    manualEvaluation: {
      enabled: boolean;
      submissionNeeded: boolean;
    };
    aiEvaluation: boolean;
    automationEvaluation: boolean;
  };
  groupSettings: {
    groupSettingsEnabled: boolean;
    showExistingUsers: boolean;
    selectedGroups: string[];
    chatEnabled: boolean;
  };
  scoreSettings: ScoreSettings;
  securitySettings: SecuritySettings;
}

interface ExerciseSettingsProps {
  hierarchyData: HierarchyData;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  level: number;
  subcategory: string;
  onSave: (settings: ExerciseSettingsData) => void;
  onClose: () => void;
  initialData?: Partial<ExerciseSettingsData>;
  isEditing?: boolean;
  exerciseId?: string;
  tabType?: 'I_Do' | 'We_Do' | 'You_Do';
}

const ExerciseSettings: React.FC<ExerciseSettingsProps> = ({
  hierarchyData,
  nodeId,
  nodeName,
  nodeType,
  subcategory,
  onSave,
  onClose,
  initialData,
  isEditing = false,
  exerciseId,
  tabType = 'We_Do'
}) => {
  const moduleOptions = [
    {
      id: 'core',
      name: 'Core Programming',
      languages: ['C', 'C++', 'Java', 'Python', 'C#']
    },
    {
      id: 'database',
      name: 'Database',
      languages: ['SQL', 'PL/SQL', 'MongoDB']
    },
    {
      id: 'frontend',
      name: 'Frontend',
      languages: ['HTML', 'CSS', 'JS', 'BOOTSTRAP', 'React', 'Vue']
    },
    {
      id: 'backend',
      name: 'Backend',
      languages: ['Node.js', 'Python', 'Java', 'C#']
    },
    {
      id: 'mobile',
      name: 'Mobile',
      languages: ['Swift', 'Kotlin', 'React Native']
    }
  ];

  const groupOptions = [
    { id: 'group1', name: 'Group A', members: 25 },
    { id: 'group2', name: 'Group B', members: 30 },
    { id: 'group3', name: 'Group C', members: 20 },
    { id: 'group4', name: 'Group D', members: 28 },
    { id: 'group5', name: 'Group E', members: 22 }
  ];

  const [formData, setFormData] = useState<ExerciseSettingsData>({
    tabType: initialData?.tabType || tabType,
    subcategory: subcategory,
    exerciseInformation: {
      exerciseId: initialData?.exerciseInformation?.exerciseId || '',
      exerciseName: initialData?.exerciseInformation?.exerciseName || '',
      description: initialData?.exerciseInformation?.description || '',
      exerciseLevel: initialData?.exerciseInformation?.exerciseLevel || 'intermediate'
    },
    programmingSettings: {
      selectedModule: initialData?.programmingSettings?.selectedModule || 'Core Programming',
      selectedLanguages: initialData?.programmingSettings?.selectedLanguages || ['Python', 'Java'],
      levelConfiguration: initialData?.programmingSettings?.levelConfiguration || {
        levelType: 'levelBased',
        levelBased: { easy: 2, medium: 2, hard: 1 },
        general: 0
      }
    },
    compilerSettings: {
      allowCopyPaste: initialData?.compilerSettings?.allowCopyPaste ?? true,
      autoSuggestion: initialData?.compilerSettings?.autoSuggestion ?? true,
      autoCloseBrackets: initialData?.compilerSettings?.autoCloseBrackets ?? true
    },
    availabilityPeriod: {
      startDate: initialData?.availabilityPeriod?.startDate || new Date().toISOString().split('T')[0],
      endDate: initialData?.availabilityPeriod?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      gracePeriodAllowed: initialData?.availabilityPeriod?.gracePeriodAllowed ?? false,
      gracePeriodDate: initialData?.availabilityPeriod?.gracePeriodDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      extendedDays: initialData?.availabilityPeriod?.extendedDays || 0
    },
    questionBehavior: {
      shuffleQuestions: initialData?.questionBehavior?.shuffleQuestions ?? false,
      allowNext: initialData?.questionBehavior?.allowNext ?? true,
      allowSkip: initialData?.questionBehavior?.allowSkip ?? false,
      attemptLimitEnabled: initialData?.questionBehavior?.attemptLimitEnabled ?? false,
      maxAttempts: initialData?.questionBehavior?.maxAttempts || 3
    },
    evaluationSettings: {
      practiceMode: initialData?.evaluationSettings?.practiceMode ?? true,
      manualEvaluation: initialData?.evaluationSettings?.manualEvaluation || { enabled: false, submissionNeeded: false },
      aiEvaluation: initialData?.evaluationSettings?.aiEvaluation ?? false,
      automationEvaluation: initialData?.evaluationSettings?.automationEvaluation ?? false
    },
    groupSettings: {
      groupSettingsEnabled: initialData?.groupSettings?.groupSettingsEnabled ?? false,
      showExistingUsers: initialData?.groupSettings?.showExistingUsers ?? true,
      selectedGroups: initialData?.groupSettings?.selectedGroups || [],
      chatEnabled: initialData?.groupSettings?.chatEnabled ?? false
    },
    scoreSettings: initialData?.scoreSettings || {
      scoreType: 'evenMarks',
      evenMarks: 10,
      separateMarks: {
        general: [],
        levelBased: {
          easy: [],
          medium: [],
          hard: []
        }
      },
      levelBasedMarks: {
        easy: 10,
        medium: 15,
        hard: 20
      },
      totalMarks: 0
    },
    securitySettings: initialData?.securitySettings || {
      timerEnabled: false,
      timerType: 'exercise',
      timerDuration: 60,
      cameraMicEnabled: false,
      tabSwitchAllowed: true,
      maxTabSwitches: 3,
      disableClipboard: false,
      fullScreenMode: false,
      restrictMinimize: false,
      screenRecordingEnabled: false // <--- ADD THIS

    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState(false);
  const [existingExercisesCount, setExistingExercisesCount] = useState<number | null>(null);

  const [expandedMainTabs, setExpandedMainTabs] = useState({
    basic: true,
    advanced: true
  });

  const [activeSubTab, setActiveSubTab] = useState('basic-info');

  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const options = {
      position: "top-right" as const,
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: {
        background: type === 'success' ? '#10b981' :
          type === 'error' ? '#ef4444' :
            type === 'warning' ? '#f59e0b' : '#3b82f6',
        color: 'white',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }
    };

    switch (type) {
      case 'success':
        toast.success(message, options);
        break;
      case 'error':
        toast.error(message, options);
        break;
      case 'warning':
        toast.warn(message, options);
        break;
      default:
        toast.info(message, options);
    }
  };

  const getCurrentModuleLanguages = () => {
    const module = moduleOptions.find(m => m.name === formData.programmingSettings.selectedModule);
    return module ? module.languages : [];
  };

  useEffect(() => {
    const config = formData.programmingSettings.levelConfiguration;
    const newSeparateMarks = { ...formData.scoreSettings.separateMarks };

    if (config.levelType === 'general') {
      const currentLength = newSeparateMarks.general.length;
      const targetLength = config.general;

      if (currentLength < targetLength) {
        const newElements = Array(targetLength - currentLength).fill(10);
        newSeparateMarks.general = [...newSeparateMarks.general, ...newElements];
      } else if (currentLength > targetLength) {
        newSeparateMarks.general = newSeparateMarks.general.slice(0, targetLength);
      }
    } else {
      const easyCount = config.levelBased.easy;
      const mediumCount = config.levelBased.medium;
      const hardCount = config.levelBased.hard;

      if (newSeparateMarks.levelBased.easy.length < easyCount) {
        const newElements = Array(easyCount - newSeparateMarks.levelBased.easy.length).fill(10);
        newSeparateMarks.levelBased.easy = [...newSeparateMarks.levelBased.easy, ...newElements];
      } else if (newSeparateMarks.levelBased.easy.length > easyCount) {
        newSeparateMarks.levelBased.easy = newSeparateMarks.levelBased.easy.slice(0, easyCount);
      }

      if (newSeparateMarks.levelBased.medium.length < mediumCount) {
        const newElements = Array(mediumCount - newSeparateMarks.levelBased.medium.length).fill(15);
        newSeparateMarks.levelBased.medium = [...newSeparateMarks.levelBased.medium, ...newElements];
      } else if (newSeparateMarks.levelBased.medium.length > mediumCount) {
        newSeparateMarks.levelBased.medium = newSeparateMarks.levelBased.medium.slice(0, mediumCount);
      }

      if (newSeparateMarks.levelBased.hard.length < hardCount) {
        const newElements = Array(hardCount - newSeparateMarks.levelBased.hard.length).fill(20);
        newSeparateMarks.levelBased.hard = [...newSeparateMarks.levelBased.hard, ...newElements];
      } else if (newSeparateMarks.levelBased.hard.length > hardCount) {
        newSeparateMarks.levelBased.hard = newSeparateMarks.levelBased.hard.slice(0, hardCount);
      }
    }

    setFormData(prev => ({
      ...prev,
      scoreSettings: {
        ...prev.scoreSettings,
        separateMarks: newSeparateMarks
      }
    }));
  }, [formData.programmingSettings.levelConfiguration]);

  useEffect(() => {
    if (formData.availabilityPeriod.gracePeriodAllowed &&
      formData.availabilityPeriod.gracePeriodDate &&
      formData.availabilityPeriod.endDate) {

      const endDate = new Date(formData.availabilityPeriod.endDate);
      const graceDate = new Date(formData.availabilityPeriod.gracePeriodDate);

      if (graceDate > endDate) {
        const diffTime = Math.abs(graceDate.getTime() - endDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        setFormData(prev => ({
          ...prev,
          availabilityPeriod: {
            ...prev.availabilityPeriod,
            extendedDays: diffDays
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          availabilityPeriod: {
            ...prev.availabilityPeriod,
            extendedDays: 0
          }
        }));
      }
    }
  }, [formData.availabilityPeriod.gracePeriodDate, formData.availabilityPeriod.endDate, formData.availabilityPeriod.gracePeriodAllowed]);

  useEffect(() => {
    if (!isEditing) {
      const fetchExistingExercisesCount = async () => {
        setFetchingId(true);
        try {
          const getEntityType = (nodeType: string): EntityType => {
            const normalized = nodeType.toLowerCase().trim();
            const mapping: Record<string, EntityType> = {
              'module': 'modules',
              'submodule': 'submodules',
              'topic': 'topics',
              'subtopic': 'subtopics',
              'modules': 'modules',
              'submodules': 'submodules',
              'topics': 'topics',
              'subtopics': 'subtopics'
            };
            return mapping[normalized] || 'topics';
          };

          const entityType = getEntityType(nodeType);

          if (!entityType) return;

          const response = await exerciseApi.getExercises(
            entityType as "modules" | "submodules" | "topics" | "subtopics",
            nodeId,
            formData.tabType,
            subcategory
          );

          let exerciseCount = 0;
          if (response.data?.exercises && Array.isArray(response.data.exercises)) {
            exerciseCount = response.data.exercises.length;
          }

          setExistingExercisesCount(exerciseCount);

          const nextIdNumber = (exerciseCount + 1).toString().padStart(3, '0');
          const nextExerciseId = `EX${nextIdNumber}`;

          setFormData(prev => ({
            ...prev,
            exerciseInformation: {
              ...prev.exerciseInformation,
              exerciseId: nextExerciseId
            }
          }));

        } catch (error) {
          console.error('Error fetching existing exercises count:', error);
          const fallbackId = `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
          setFormData(prev => ({
            ...prev,
            exerciseInformation: {
              ...prev.exerciseInformation,
              exerciseId: fallbackId
            }
          }));
        } finally {
          setFetchingId(false);
        }
      };

      fetchExistingExercisesCount();
    }
  }, [nodeId, subcategory, nodeType, isEditing, formData.tabType]);

  const toggleMainTab = (tabId: string) => {
    setExpandedMainTabs(prev => ({
      ...prev,
      [tabId]: !prev[tabId as keyof typeof prev]
    }));
  };

  useEffect(() => {
    console.log(formData.tabType);
  }, [formData.tabType])

  const regenerateExerciseId = () => {
    if (isEditing || existingExercisesCount === null) return;

    const nextIdNumber = (existingExercisesCount + 1).toString().padStart(3, '0');
    const nextExerciseId = `EX${nextIdNumber}`;

    setFormData(prev => ({
      ...prev,
      exerciseInformation: {
        ...prev.exerciseInformation,
        exerciseId: nextExerciseId
      }
    }));

    showNotification(`Regenerated Exercise ID: ${nextExerciseId}`, 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!formData.exerciseInformation.exerciseName.trim()) {
        throw new Error('Exercise name is required');
      }
      if (!formData.exerciseInformation.exerciseId.trim()) {
        throw new Error('Exercise ID is required');
      }
      const totalQuestions = calculateLevelConfigTotal();
      if (totalQuestions === 0) {
        throw new Error('Please configure at least one question in Level Config');
      }
      if (!validateScoreSettings()) {
        throw new Error('Invalid score configuration. Please check marks distribution.');
      }
      if (!validateScheduleDates()) {
        throw new Error('Invalid date configuration. Please check start and end dates.');
      }

      if (formData.tabType === 'You_Do' && formData.securitySettings.timerEnabled && formData.securitySettings.timerDuration <= 0) {
        throw new Error('Timer duration must be greater than 0 minutes');
      }

      const totalMarks = calculateTotalMarks();
      const updatedFormData = {
        ...formData,
        scoreSettings: {
          ...formData.scoreSettings,
          totalMarks: totalMarks
        }
      };

      showNotification(isEditing ? 'Updating exercise...' : 'Creating exercise...', 'info');

      const getEntityType = (nodeType: string): EntityType => {
        const normalized = nodeType ? nodeType.toLowerCase() : 'topic';
        const mapping: Record<string, EntityType> = {
          'module': 'modules',
          'submodule': 'submodules',
          'topic': 'topics',
          'subtopic': 'subtopics'
        };
        return mapping[normalized] || 'topics';
      };

      const entityType = getEntityType(hierarchyData.nodeType);

      if (isEditing && exerciseId) {
        await exerciseApi.updateExercise(
          entityType,
          nodeId,
          exerciseId,
          updatedFormData
        );
      } else {
        await exerciseApi.addExercise(
          entityType,
          nodeId,
          updatedFormData
        );
      }

      showNotification(
        isEditing ? 'Exercise updated successfully!' : 'Exercise created successfully!',
        'success'
      );

      setTimeout(() => {
        onSave(updatedFormData);
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('Error submitting form:', err);
      let errorMessage = 'Failed to save settings.';
      if (err.response?.data?.message?.[0]?.value) {
        errorMessage = err.response.data.message[0].value;
      } else if (err.message) {
        errorMessage = err.message;
      }

      if (err.response?.status === 409 || errorMessage.includes('already exists')) {
        showNotification('Exercise saved successfully!', 'success');
        setTimeout(() => {
          onSave(formData);
          onClose();
        }, 1500);
        return;
      }

      setError(errorMessage);
      showNotification(errorMessage, 'error');
      setIsLoading(false);
    }
  };

  const validateScheduleDates = (): boolean => {
    const { startDate, endDate, gracePeriodAllowed, gracePeriodDate } = formData.availabilityPeriod;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return false;
    }

    if (gracePeriodAllowed && gracePeriodDate) {
      const grace = new Date(gracePeriodDate);
      if (grace < end) {
        return false;
      }
    }

    return true;
  };

  const validateScoreSettings = (): boolean => {
    const { scoreType, separateMarks } = formData.scoreSettings;
    const config = formData.programmingSettings.levelConfiguration;

    if (scoreType === 'separateMarks') {
      if (config.levelType === 'general') {
        return separateMarks.general.every(mark => mark > 0);
      } else {
        return [
          ...separateMarks.levelBased.easy,
          ...separateMarks.levelBased.medium,
          ...separateMarks.levelBased.hard
        ].every(mark => mark > 0);
      }
    }
    return true;
  };

  const handleModuleSelect = (moduleName: string) => {
    const module = moduleOptions.find(m => m.name === moduleName);
    if (!module) return;

    setFormData(prev => ({
      ...prev,
      programmingSettings: {
        ...prev.programmingSettings,
        selectedModule: moduleName,
        selectedLanguages: [module.languages[0]]
      }
    }));
  };

  const toggleLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      programmingSettings: {
        ...prev.programmingSettings,
        selectedLanguages: prev.programmingSettings.selectedLanguages.includes(language)
          ? prev.programmingSettings.selectedLanguages.filter(l => l !== language)
          : [...prev.programmingSettings.selectedLanguages, language]
      }
    }));
  };

  const toggleAllLanguages = () => {
    const currentLanguages = getCurrentModuleLanguages();
    const allSelected = currentLanguages.every(lang =>
      formData.programmingSettings.selectedLanguages.includes(lang)
    );

    setFormData(prev => ({
      ...prev,
      programmingSettings: {
        ...prev.programmingSettings,
        selectedLanguages: allSelected ? [] : [...currentLanguages]
      }
    }));
  };

  const toggleGroup = (groupId: string) => {
    const isSelected = formData.groupSettings.selectedGroups.includes(groupId);

    setFormData(prev => ({
      ...prev,
      groupSettings: {
        ...prev.groupSettings,
        selectedGroups: isSelected
          ? prev.groupSettings.selectedGroups.filter(g => g !== groupId)
          : [...prev.groupSettings.selectedGroups, groupId]
      }
    }));
  };

  const areAllLanguagesSelected = () => {
    const currentLanguages = getCurrentModuleLanguages();
    return currentLanguages.every(lang =>
      formData.programmingSettings.selectedLanguages.includes(lang)
    );
  };

  const handleEvaluationToggle = (type: 'practice' | 'manual' | 'ai' | 'automation', checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      evaluationSettings: {
        practiceMode: type === 'practice' ? checked : false,
        manualEvaluation: {
          enabled: type === 'manual' ? checked : false,
          submissionNeeded: type === 'manual' ? checked && prev.evaluationSettings.manualEvaluation.submissionNeeded : false
        },
        aiEvaluation: type === 'ai' ? checked : false,
        automationEvaluation: type === 'automation' ? checked : false
      }
    }));
  };

  const calculateLevelConfigTotal = () => {
    const config = formData.programmingSettings.levelConfiguration;
    if (config.levelType === 'levelBased') {
      return config.levelBased.easy + config.levelBased.medium + config.levelBased.hard;
    } else {
      return config.general;
    }
  };

  const calculateTotalMarks = () => {
    const { scoreType, evenMarks, separateMarks, levelBasedMarks } = formData.scoreSettings;
    const config = formData.programmingSettings.levelConfiguration;

    if (config.levelType === 'general') {
      const totalQuestions = config.general;

      if (scoreType === 'evenMarks') {
        return totalQuestions * evenMarks;
      } else if (scoreType === 'separateMarks') {
        return separateMarks.general.reduce((sum, mark) => sum + mark, 0);
      }
    } else {
      const easyCount = config.levelBased.easy;
      const mediumCount = config.levelBased.medium;
      const hardCount = config.levelBased.hard;

      if (scoreType === 'evenMarks') {
        return (easyCount + mediumCount + hardCount) * evenMarks;
      } else if (scoreType === 'levelBasedMarks') {
        return (easyCount * levelBasedMarks.easy) +
          (mediumCount * levelBasedMarks.medium) +
          (hardCount * levelBasedMarks.hard);
      } else if (scoreType === 'separateMarks') {
        const easyMarks = separateMarks.levelBased.easy.reduce((sum, mark) => sum + mark, 0);
        const mediumMarks = separateMarks.levelBased.medium.reduce((sum, mark) => sum + mark, 0);
        const hardMarks = separateMarks.levelBased.hard.reduce((sum, mark) => sum + mark, 0);
        return easyMarks + mediumMarks + hardMarks;
      }
    }

    return 0;
  };

  const getBreadcrumbs = () => {
    const crumbs = [];

    if (hierarchyData.courseName) {
      crumbs.push({
        name: hierarchyData.courseName,
        type: 'course'
      });
    }

    if (hierarchyData.moduleName) {
      crumbs.push({
        name: hierarchyData.moduleName,
        type: 'module'
      });
    }

    if (hierarchyData.submoduleName) {
      crumbs.push({
        name: hierarchyData.submoduleName,
        type: 'submodule'
      });
    }

    if (hierarchyData.topicName) {
      crumbs.push({
        name: hierarchyData.topicName,
        type: 'topic'
      });
    }

    if (hierarchyData.subtopicName) {
      crumbs.push({
        name: hierarchyData.subtopicName,
        type: 'subtopic'
      });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const mainTabs = [
    {
      id: 'basic',
      label: 'Basic Settings',
      icon: <SettingsIcon size={16} />,
      subtabs: [
        { id: 'basic-info', label: 'Basic Information', icon: <FileCode size={14} /> },
        { id: 'programming', label: 'Programming Settings', icon: <Code size={14} /> },
        { id: 'level-config', label: 'Level Configuration', icon: <Layers size={14} /> },
        { id: 'schedule', label: 'Schedule & Availability', icon: <Calendar size={14} /> },
        { id: 'evaluation', label: 'Evaluation Settings', icon: <BarChart3 size={14} /> }
      ]
    },
    {
      id: 'advanced',
      label: 'Advanced Settings',
      icon: <Settings2 size={16} />,
      subtabs: [
        { id: 'compiler', label: 'Compiler Settings', icon: <Terminal size={14} /> },
        { id: 'behavior', label: 'Behavior Settings', icon: <Shuffle size={14} /> },
        { id: 'groups', label: 'Group Settings', icon: <Users size={14} /> },
        { id: 'score', label: 'Score Settings', icon: <Award size={14} /> },
        // Condition to show Security Settings only for 'You_Do'
        ...(formData.tabType === 'You_Do' ? [
          { id: 'security', label: 'Security Settings', icon: <Shield size={14} /> }
        ] : [])
      ]
    }
  ];

  const renderBasicInfo = () => (
    <div className="space-y-3">
      {/* Method type is now passed from parent and not selectable here */}

      {/* Exercise ID and Name - compact row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Exercise ID
          </label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={formData.exerciseInformation.exerciseId}
              className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md font-mono bg-gray-50"
              disabled
              readOnly
            />
            {!isEditing && (
              <button
                type="button"
                onClick={regenerateExerciseId}
                disabled={fetchingId}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Regenerate ID"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Exercise Name *
          </label>
          <input
            type="text"
            value={formData.exerciseInformation.exerciseName}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              exerciseInformation: {
                ...prev.exerciseInformation,
                exerciseName: e.target.value
              }
            }))}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Exercise name"
            required
          />
        </div>
      </div>

      {/* Description - compact */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Description
        </label>
        <div className="border border-gray-300 rounded overflow-hidden">
          <TipTapEditor
            value={formData.exerciseInformation.description}
            onChange={(value) => setFormData(prev => ({
              ...prev,
              exerciseInformation: {
                ...prev.exerciseInformation,
                description: value
              }
            }))}
            placeholder="Describe the exercise..."
            minHeight="80px"
            maxHeight="100px"
            showToolbar={true}
            editable={true}
          />
        </div>
      </div>

      {/* Difficulty Level - compact buttons */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Difficulty Level
        </label>
        <div className="grid grid-cols-3 gap-1">
          {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
            <button
              key={level}
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  exerciseInformation: {
                    ...prev.exerciseInformation,
                    exerciseLevel: level
                  }
                }));
              }}
              className={`py-2 text-xs font-medium rounded transition-colors ${formData.exerciseInformation.exerciseLevel === level
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <Shield className="text-orange-600 mt-1" size={20} />
          <div>
            <h4 className="font-semibold text-orange-900 text-sm">Security & Proctoring</h4>
            <p className="text-xs text-orange-800 mt-1">
              Configure strict assessment rules for the "You Do" environment.
            </p>
          </div>
        </div>
      </div>

      {/* --- TIMER SETTINGS --- */}
      <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Enable Timer</div>
              <div className="text-xs text-gray-500">Limit the time allowed for this assessment</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.securitySettings.timerEnabled}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                securitySettings: {
                  ...prev.securitySettings,
                  timerEnabled: e.target.checked
                }
              }))}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Conditional Timer Options */}
        {formData.securitySettings.timerEnabled && (
          <div className="pl-6 pt-3 border-t border-gray-100 mt-2 space-y-4">

            {/* Timer Type Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Timer Based On</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="timerType"
                    value="exercise"
                    checked={formData.securitySettings.timerType === 'exercise'}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      securitySettings: { ...prev.securitySettings, timerType: 'exercise' }
                    }))}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Total Exercise Time</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="timerType"
                    value="question"
                    checked={formData.securitySettings.timerType === 'question'}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      securitySettings: { ...prev.securitySettings, timerType: 'question' }
                    }))}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Per Question Time</span>
                </label>
              </div>
            </div>

            {/* Input Logic: Only show if Exercise Based */}
            {formData.securitySettings.timerType === 'exercise' ? (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Total Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.securitySettings.timerDuration}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    securitySettings: {
                      ...prev.securitySettings,
                      timerDuration: Math.max(1, parseInt(e.target.value) || 1)
                    }
                  }))}
                  className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <div className="p-2 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 flex items-start gap-2">
                <Info size={14} className="mt-0.5" />
                <span>
                  You have selected <strong>Question Based</strong> timer. You will configure the specific duration for each question in the Questions creation page later.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- COMMON ASSESSMENT SECURITY --- */}
      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-6 mb-2">Environment Controls</h5>

      {/* 1. Camera and Mic */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-gray-600" />
          <div>
            <div className="text-sm font-medium text-gray-900">Camera & Microphone</div>
            <div className="text-xs text-gray-500">Video proctoring required</div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.securitySettings.cameraMicEnabled}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              securitySettings: { ...prev.securitySettings, cameraMicEnabled: e.target.checked }
            }))}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* 2. Full Screen Mode */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white mt-3">
        <div className="flex items-center gap-2">
          <Maximize size={18} className="text-gray-600" />
          <div>
            <div className="text-sm font-medium text-gray-900">Enforce Full Screen</div>
            <div className="text-xs text-gray-500">Test auto-submits if full screen is exited</div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.securitySettings.fullScreenMode}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              securitySettings: { ...prev.securitySettings, fullScreenMode: e.target.checked }
            }))}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* 3. Restrict Window Minimize (NEW) */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white mt-3">
        <div className="flex items-center gap-2">
          <Minimize size={18} className="text-gray-600" />
          <div>
            <div className="text-sm font-medium text-gray-900">Restrict Window Minimize</div>
            <div className="text-xs text-gray-500">Prevent user from minimizing browser window</div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.securitySettings.restrictMinimize}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              securitySettings: { ...prev.securitySettings, restrictMinimize: e.target.checked }
            }))}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      {/* 4. Screen Recording (Code Editor Only) */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white mt-3">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-gray-600" />
          <div>
            <div className="text-sm font-medium text-gray-900">Enable Screen Recording</div>
            <div className="text-xs text-gray-500">Record screen only when in code editor</div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.securitySettings.screenRecordingEnabled}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              securitySettings: {
                ...prev.securitySettings,
                screenRecordingEnabled: e.target.checked
              }
            }))}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      {/* 4. Disable Clipboard (Copy/Paste) */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white mt-3">
        <div className="flex items-center gap-2">
          <ClipboardX size={18} className="text-gray-600" />
          <div>
            <div className="text-sm font-medium text-gray-900">Disable Clipboard</div>
            <div className="text-xs text-gray-500">Prevent Copy, Paste, and Right-click</div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.securitySettings.disableClipboard}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              securitySettings: { ...prev.securitySettings, disableClipboard: e.target.checked }
            }))}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* 5. Tab Switching Settings */}
      <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-white mt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MonitorX size={18} className="text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Allow Tab Switching</div>
              <div className="text-xs text-gray-500">Allow user to switch tabs/windows during test</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.securitySettings.tabSwitchAllowed}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                securitySettings: {
                  ...prev.securitySettings,
                  tabSwitchAllowed: e.target.checked
                }
              }))}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {formData.securitySettings.tabSwitchAllowed && (
          <div className="pl-6 pt-2 border-t border-gray-100 mt-2">
            <div className="text-xs text-gray-500 mb-2">
              Note: If enabled, users can switch tabs freely. If disabled, the test may auto-submit or warn on switch.
            </div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Warnings before auto-submit
            </label>
            <input
              type="number"
              min="0"
              value={formData.securitySettings.maxTabSwitches}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                securitySettings: {
                  ...prev.securitySettings,
                  maxTabSwitches: Math.max(0, parseInt(e.target.value) || 0)
                }
              }))}
              className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
  const renderProgrammingSettings = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Module Selection - Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Module
          </label>
          <select
            value={formData.programmingSettings.selectedModule}
            onChange={(e) => {
              const moduleName = e.target.value;
              const module = moduleOptions.find(m => m.name === moduleName);
              if (!module) return;

              setFormData(prev => ({
                ...prev,
                programmingSettings: {
                  ...prev.programmingSettings,
                  selectedModule: moduleName,
                  selectedLanguages: [module.languages[0]]
                }
              }));
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a module</option>
            {moduleOptions.map(module => (
              <option key={module.id} value={module.name}>
                {module.name}
              </option>
            ))}
          </select>
        </div>

        {/* Language Selection - Checkboxes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Languages
            </label>
            <button
              type="button"
              onClick={toggleAllLanguages}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {areAllLanguagesSelected() ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div
            className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] overflow-y-auto ${!formData.programmingSettings.selectedModule ? 'opacity-50 pointer-events-none' : ''
              }`}
          >
            {formData.programmingSettings.selectedModule ? (
              <div className="space-y-2">
                {getCurrentModuleLanguages().map(lang => (
                  <div key={lang} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`lang-${lang}`}
                      value={lang}
                      checked={formData.programmingSettings.selectedLanguages.includes(lang)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          programmingSettings: {
                            ...prev.programmingSettings,
                            selectedLanguages: isChecked
                              ? [...prev.programmingSettings.selectedLanguages, lang]
                              : prev.programmingSettings.selectedLanguages.filter(l => l !== lang)
                          }
                        }));
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`lang-${lang}`}
                      className="ml-2 text-sm text-gray-700 cursor-pointer"
                    >
                      {lang}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic text-center py-4">
                Please select a module first
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formData.programmingSettings.selectedLanguages.length > 0 ? (
              <>
                Selected: {formData.programmingSettings.selectedLanguages.join(', ')}
              </>
            ) : (
              'Select languages from the available options'
            )}
          </p>
        </div>
      </div>
    </div>
  );

  const renderLevelConfiguration = () => (
    <div className="space-y-4">
      {/* Conditional layout based on distribution type */}
      {formData.programmingSettings.levelConfiguration.levelType === 'general' ? (
        // General mode
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distribution Type
            </label>
            <select
              value={formData.programmingSettings.levelConfiguration.levelType}
              onChange={(e) => {
                const newType = e.target.value as 'levelBased' | 'general';
                setFormData(prev => ({
                  ...prev,
                  programmingSettings: {
                    ...prev.programmingSettings,
                    levelConfiguration: {
                      ...prev.programmingSettings.levelConfiguration,
                      levelType: newType,
                      ...(newType === 'levelBased'
                        ? { general: 0 }
                        : { levelBased: { easy: 0, medium: 0, hard: 0 } }
                      )
                    }
                  }
                }));
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="levelBased">Level Based</option>
              <option value="general">General</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    programmingSettings: {
                      ...prev.programmingSettings,
                      levelConfiguration: {
                        ...prev.programmingSettings.levelConfiguration,
                        general: Math.max(0, prev.programmingSettings.levelConfiguration.general - 1)
                      }
                    }
                  }));
                }}
                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-600">-</span>
              </button>
              <input
                type="text"
                value={formData.programmingSettings.levelConfiguration.general === 0 ? '' : formData.programmingSettings.levelConfiguration.general}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string for empty input
                  if (value === '') {
                    setFormData(prev => ({
                      ...prev,
                      programmingSettings: {
                        ...prev.programmingSettings,
                        levelConfiguration: {
                          ...prev.programmingSettings.levelConfiguration,
                          general: 0
                        }
                      }
                    }));
                  } else {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                      setFormData(prev => ({
                        ...prev,
                        programmingSettings: {
                          ...prev.programmingSettings,
                          levelConfiguration: {
                            ...prev.programmingSettings.levelConfiguration,
                            general: Math.max(0, numValue)
                          }
                        }
                      }));
                    }
                  }
                }}
                placeholder="Enter number"
                className="flex-1 px-3 py-2 text-center text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    programmingSettings: {
                      ...prev.programmingSettings,
                      levelConfiguration: {
                        ...prev.programmingSettings.levelConfiguration,
                        general: prev.programmingSettings.levelConfiguration.general + 1
                      }
                    }
                  }));
                }}
                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-600">+</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Level Based mode
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distribution Type
            </label>
            <select
              value={formData.programmingSettings.levelConfiguration.levelType}
              onChange={(e) => {
                const newType = e.target.value as 'levelBased' | 'general';
                setFormData(prev => ({
                  ...prev,
                  programmingSettings: {
                    ...prev.programmingSettings,
                    levelConfiguration: {
                      ...prev.programmingSettings.levelConfiguration,
                      levelType: newType,
                      ...(newType === 'levelBased'
                        ? { general: 0 }
                        : { levelBased: { easy: 0, medium: 0, hard: 0 } }
                      )
                    }
                  }
                }));
              }}
              className="w-full lg:w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="levelBased">Level Based</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Level Based question controls */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Set questions per level:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { level: 'easy', label: 'Easy', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
                { level: 'medium', label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
                { level: 'hard', label: 'Hard', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
              ].map(({ level, label, color, bgColor, borderColor }) => (
                <div key={level} className={`p-3 rounded-lg border-2 ${borderColor} ${bgColor}`}>
                  <div className={`font-semibold text-sm mb-2 ${color}`}>{label}</div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          programmingSettings: {
                            ...prev.programmingSettings,
                            levelConfiguration: {
                              ...prev.programmingSettings.levelConfiguration,
                              levelBased: {
                                ...prev.programmingSettings.levelConfiguration.levelBased,
                                [level]: Math.max(0, prev.programmingSettings.levelConfiguration.levelBased[level as 'easy' | 'medium' | 'hard'] - 1)
                              }
                            }
                          }
                        }));
                      }}
                      className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-white transition-colors"
                    >
                      <span className="text-gray-600">-</span>
                    </button>
                    <input
                      type="text"
                      value={formData.programmingSettings.levelConfiguration.levelBased[level as 'easy' | 'medium' | 'hard'] === 0 ? '' : formData.programmingSettings.levelConfiguration.levelBased[level as 'easy' | 'medium' | 'hard']}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string for empty input
                        if (value === '') {
                          setFormData(prev => ({
                            ...prev,
                            programmingSettings: {
                              ...prev.programmingSettings,
                              levelConfiguration: {
                                ...prev.programmingSettings.levelConfiguration,
                                levelBased: {
                                  ...prev.programmingSettings.levelConfiguration.levelBased,
                                  [level]: 0
                                }
                              }
                            }
                          }));
                        } else {
                          const numValue = parseInt(value);
                          if (!isNaN(numValue)) {
                            setFormData(prev => ({
                              ...prev,
                              programmingSettings: {
                                ...prev.programmingSettings,
                                levelConfiguration: {
                                  ...prev.programmingSettings.levelConfiguration,
                                  levelBased: {
                                    ...prev.programmingSettings.levelConfiguration.levelBased,
                                    [level]: Math.max(0, numValue)
                                  }
                                }
                              }
                            }));
                          }
                        }
                      }}
                      placeholder="0"
                      className="w-16 px-2 py-1.5 text-center text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          programmingSettings: {
                            ...prev.programmingSettings,
                            levelConfiguration: {
                              ...prev.programmingSettings.levelConfiguration,
                              levelBased: {
                                ...prev.programmingSettings.levelConfiguration.levelBased,
                                [level]: prev.programmingSettings.levelConfiguration.levelBased[level as 'easy' | 'medium' | 'hard'] + 1
                              }
                            }
                          }
                        }));
                      }}
                      className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-white transition-colors"
                    >
                      <span className="text-gray-600">+</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderSchedule = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            value={formData.availabilityPeriod.startDate}
            onChange={(e) => {
              const newStartDate = e.target.value;
              const endDate = new Date(formData.availabilityPeriod.endDate);
              const startDate = new Date(newStartDate);

              if (startDate > endDate) {
                showNotification('Start date cannot be after end date', 'error');
                return;
              }

              setFormData({
                ...formData,
                availabilityPeriod: {
                  ...formData.availabilityPeriod,
                  startDate: newStartDate
                }
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date *
          </label>
          <input
            type="date"
            value={formData.availabilityPeriod.endDate}
            onChange={(e) => {
              const newEndDate = e.target.value;
              const startDate = new Date(formData.availabilityPeriod.startDate);
              const endDate = new Date(newEndDate);

              if (endDate < startDate) {
                showNotification('End date cannot be before start date', 'error');
                return;
              }

              setFormData({
                ...formData,
                availabilityPeriod: {
                  ...formData.availabilityPeriod,
                  endDate: newEndDate
                }
              });
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Grace Period</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.availabilityPeriod.gracePeriodAllowed}
            onChange={(e) => {
              const isChecked = e.target.checked;
              setFormData({
                ...formData,
                availabilityPeriod: {
                  ...formData.availabilityPeriod,
                  gracePeriodAllowed: isChecked,
                  gracePeriodDate: isChecked ?
                    new Date(new Date(formData.availabilityPeriod.endDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
                    formData.availabilityPeriod.gracePeriodDate
                }
              });
            }}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {formData.availabilityPeriod.gracePeriodAllowed && (
        <>
          <div className="lg:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grace Period Date *
            </label>
            <input
              type="date"
              value={formData.availabilityPeriod.gracePeriodDate}
              onChange={(e) => {
                const newGraceDate = e.target.value;
                const endDate = new Date(formData.availabilityPeriod.endDate);
                const graceDate = new Date(newGraceDate);

                if (graceDate <= endDate) {
                  showNotification('Grace period date must be after end date', 'error');
                  return;
                }

                setFormData({
                  ...formData,
                  availabilityPeriod: {
                    ...formData.availabilityPeriod,
                    gracePeriodDate: newGraceDate
                  }
                });
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {formData.availabilityPeriod.extendedDays > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-900">Extended Duration</div>
                  <div className="text-xs text-blue-700">Additional time allowed after end date</div>
                </div>
                <div className="text-base font-bold text-blue-900">
                  +{formData.availabilityPeriod.extendedDays} days
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderEvaluation = () => (
    <div>
      {/* Evaluation options in 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          {
            type: 'practice' as const,
            label: 'Practice Mode',
            description: 'Learning without evaluation',
            checked: formData.evaluationSettings.practiceMode
          },
          {
            type: 'manual' as const,
            label: 'Manual Evaluation',
            description: 'Instructor reviews submissions',
            checked: formData.evaluationSettings.manualEvaluation.enabled
          },
          {
            type: 'ai' as const,
            label: 'AI Evaluation',
            description: 'AI reviews and scores',
            checked: formData.evaluationSettings.aiEvaluation
          },
          {
            type: 'automation' as const,
            label: 'Automation',
            description: 'Automated test execution',
            checked: formData.evaluationSettings.automationEvaluation
          }
        ].map((evalType) => (
          <div
            key={evalType.type}
            className={`p-3 rounded-lg border cursor-pointer hover:border-gray-400 transition-colors ${evalType.checked
              ? 'border-2 border-blue-500 bg-blue-50 shadow-sm'
              : 'border border-gray-200 bg-white hover:bg-gray-50'
              }`}
            onClick={() => handleEvaluationToggle(evalType.type, !evalType.checked)}
          >
            <div className="flex items-start gap-2">
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${evalType.checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                }`}>
                {evalType.checked && <Check size={10} className="text-white" />}
              </div>
              <div>
                <div className="font-semibold text-xs text-gray-900">{evalType.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{evalType.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCompilerSettings = () => (
    <div className="space-y-2">
      {[
        {
          label: 'Allow copy-paste',
          checked: formData.compilerSettings.allowCopyPaste,
          onChange: (checked: boolean) => {
            setFormData({
              ...formData,
              compilerSettings: { ...formData.compilerSettings, allowCopyPaste: checked }
            });
          }
        },
        {
          label: 'Auto suggestion',
          checked: formData.compilerSettings.autoSuggestion,
          onChange: (checked: boolean) => {
            setFormData({
              ...formData,
              compilerSettings: { ...formData.compilerSettings, autoSuggestion: checked }
            });
          }
        },
        {
          label: 'Auto close brackets',
          checked: formData.compilerSettings.autoCloseBrackets,
          onChange: (checked: boolean) => {
            setFormData({
              ...formData,
              compilerSettings: { ...formData.compilerSettings, autoCloseBrackets: checked }
            });
          }
        }
      ].map((setting, index) => (
        <div key={index} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white">
          <span className="text-sm font-medium text-gray-900">{setting.label}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={setting.checked}
              onChange={(e) => setting.onChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      ))}
    </div>
  );

  const renderBehaviorSettings = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Shuffle', checked: formData.questionBehavior.shuffleQuestions, key: 'shuffleQuestions' },
          { label: 'Allow Next', checked: formData.questionBehavior.allowNext, key: 'allowNext' },
          { label: 'Allow Skip', checked: formData.questionBehavior.allowSkip, key: 'allowSkip' }
        ].map((item, index) => (
          <div key={index} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white">
            <span className="text-sm font-medium text-gray-900">{item.label}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setFormData({
                    ...formData,
                    questionBehavior: {
                      ...formData.questionBehavior,
                      [item.key]: isChecked
                    }
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="p-3 border border-gray-200 rounded-lg bg-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">Attempt Limit</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.questionBehavior.attemptLimitEnabled}
              onChange={(e) => {
                const isChecked = e.target.checked;
                setFormData({
                  ...formData,
                  questionBehavior: {
                    ...formData.questionBehavior,
                    attemptLimitEnabled: isChecked,
                    // If enabled, ensure at least 1 attempt is set if it was 0
                    maxAttempts: isChecked && formData.questionBehavior.maxAttempts === 0 ? 1 : formData.questionBehavior.maxAttempts
                  }
                });
              }}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {formData.questionBehavior.attemptLimitEnabled && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Number of Attempts allowed
            </label>
            <input
              type="number"
              min="1"
              value={formData.questionBehavior.maxAttempts}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFormData({
                  ...formData,
                  questionBehavior: {
                    ...formData.questionBehavior,
                    maxAttempts: Math.max(1, value || 1)
                  }
                });
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter limit"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderGroupSettings = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white">
        <span className="text-sm font-medium text-gray-900">Enable Groups</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.groupSettings.groupSettingsEnabled}
            onChange={(e) => {
              const isChecked = e.target.checked;
              setFormData({
                ...formData,
                groupSettings: {
                  ...formData.groupSettings,
                  groupSettingsEnabled: isChecked
                }
              });
            }}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {formData.groupSettings.groupSettingsEnabled && (
        <>
          <div className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white">
            <span className="text-sm font-medium text-gray-900">Show Users</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.groupSettings.showExistingUsers}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setFormData({
                    ...formData,
                    groupSettings: {
                      ...formData.groupSettings,
                      showExistingUsers: isChecked
                    }
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Select Groups</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {groupOptions.map(group => (
                <div
                  key={group.id}
                  className={`flex items-center justify-between p-2.5 border rounded-lg cursor-pointer transition-colors ${formData.groupSettings.selectedGroups.includes(group.id)
                    ? 'border-2 border-blue-500 bg-blue-50 shadow-sm'
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  onClick={() => toggleGroup(group.id)}
                >
                  <div>
                    <div className="font-medium text-xs text-gray-900">{group.name}</div>
                    <div className="text-xs text-gray-600">{group.members} members</div>
                  </div>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formData.groupSettings.selectedGroups.includes(group.id)
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                    }`}>
                    {formData.groupSettings.selectedGroups.includes(group.id) && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white">
            <span className="text-sm font-medium text-gray-900">Enable Chat</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.groupSettings.chatEnabled}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setFormData({
                    ...formData,
                    groupSettings: {
                      ...formData.groupSettings,
                      chatEnabled: isChecked
                    }
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </>
      )}
    </div>
  );

  // Render score settings based on level configuration type
  const renderScoreSettings = () => {
    const config = formData.programmingSettings.levelConfiguration;
    const { scoreType, evenMarks, separateMarks, levelBasedMarks } = formData.scoreSettings;
    const totalMarks = calculateTotalMarks();

    return (
      <div className="space-y-4">
        {/* Score type selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Score Distribution Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {config.levelType === 'general' ? (
              // General configuration options
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      scoreSettings: {
                        ...prev.scoreSettings,
                        scoreType: 'evenMarks'
                      }
                    }));
                  }}
                  className={`p-3 rounded-lg border transition-all ${scoreType === 'evenMarks'
                    ? 'border-2 border-blue-500 bg-blue-50 shadow-sm'
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-medium text-gray-900 mb-1 text-sm">Even Marks</div>
                  <p className="text-xs text-gray-500">Same marks for all questions</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      scoreSettings: {
                        ...prev.scoreSettings,
                        scoreType: 'separateMarks'
                      }
                    }));
                  }}
                  className={`p-3 rounded-lg border transition-all ${scoreType === 'separateMarks'
                    ? 'border-2 border-blue-500 bg-blue-50 shadow-sm'
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-medium text-gray-900 mb-1 text-sm">Separate Marks</div>
                  <p className="text-xs text-gray-500">Different marks per question</p>
                </button>
              </>
            ) : (
              // Level-based configuration options
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      scoreSettings: {
                        ...prev.scoreSettings,
                        scoreType: 'evenMarks'
                      }
                    }));
                  }}
                  className={`p-3 rounded-lg border transition-all ${scoreType === 'evenMarks'
                    ? 'border-2 border-blue-500 bg-blue-50 shadow-sm'
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-medium text-gray-900 mb-1 text-sm">Even Marks</div>
                  <p className="text-xs text-gray-500">Same marks for all questions</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      scoreSettings: {
                        ...prev.scoreSettings,
                        scoreType: 'separateMarks'
                      }
                    }));
                  }}
                  className={`p-3 rounded-lg border transition-all ${scoreType === 'separateMarks'
                    ? 'border-2 border-blue-500 bg-blue-50 shadow-sm'
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-medium text-gray-900 mb-1 text-sm">Separate Marks</div>
                  <p className="text-xs text-gray-500">Different marks per question</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      scoreSettings: {
                        ...prev.scoreSettings,
                        scoreType: 'levelBasedMarks'
                      }
                    }));
                  }}
                  className={`p-3 rounded-lg border transition-all ${scoreType === 'levelBasedMarks'
                    ? 'border-2 border-blue-500 bg-blue-50 shadow-sm'
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-medium text-gray-900 mb-1 text-sm">Level-based Marks</div>
                  <p className="text-xs text-gray-500">Fixed marks per difficulty level</p>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Score configuration based on selected type */}
        {scoreType === 'evenMarks' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks per Question
              </label>
              <div className="flex items-center gap-2 max-w-xs">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      scoreSettings: {
                        ...prev.scoreSettings,
                        evenMarks: Math.max(1, prev.scoreSettings.evenMarks - 1)
                      }
                    }));
                  }}
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Minus size={14} className="text-gray-600" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={evenMarks}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    scoreSettings: {
                      ...prev.scoreSettings,
                      evenMarks: Math.max(1, parseInt(e.target.value) || 1)
                    }
                  }))}
                  className="flex-1 px-3 py-2 text-center text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      scoreSettings: {
                        ...prev.scoreSettings,
                        evenMarks: prev.scoreSettings.evenMarks + 1
                      }
                    }));
                  }}
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Plus size={14} className="text-gray-600" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-900">Total Questions: {calculateLevelConfigTotal()}</div>
                  <div className="text-xs text-blue-700">× {evenMarks} marks each</div>
                </div>
                <div className="text-base font-bold text-blue-900">
                  Total: {totalMarks} marks
                </div>
              </div>
            </div>
          </div>
        )}

        {scoreType === 'separateMarks' && config.levelType === 'general' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks Distribution ({config.general} questions total)
              </label>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Separate marks enabled:</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Total Questions: {config.general}</div>
                    <div className="text-xs text-gray-600">Marks will be set per question individually</div>
                  </div>
                  <div className="text-lg font-bold text-blue-600">{totalMarks} total marks</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {scoreType === 'separateMarks' && config.levelType === 'levelBased' && (
          <div className="space-y-4">
            {[
              { level: 'easy', label: 'Easy Questions', count: config.levelBased.easy, color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
              { level: 'medium', label: 'Medium Questions', count: config.levelBased.medium, color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
              { level: 'hard', label: 'Hard Questions', count: config.levelBased.hard, color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
            ].map(({ level, label, count, color, bgColor, borderColor }) => (
              count > 0 && (
                <div key={level} className={`p-4 rounded-lg border-2 ${borderColor} ${bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`font-semibold text-sm ${color}`}>{label} ({count})</div>
                    <div className="text-xs text-gray-600">Separate marks per question</div>
                  </div>
                </div>
              )
            ))}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-blue-900">Total Exercise Marks</div>
                <div className="text-lg font-bold text-blue-900">{totalMarks} marks</div>
              </div>
            </div>
          </div>
        )}

        {scoreType === 'levelBasedMarks' && config.levelType === 'levelBased' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { level: 'easy', label: 'Easy', value: levelBasedMarks.easy, count: config.levelBased.easy, color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
                { level: 'medium', label: 'Medium', value: levelBasedMarks.medium, count: config.levelBased.medium, color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
                { level: 'hard', label: 'Hard', value: levelBasedMarks.hard, count: config.levelBased.hard, color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
              ].map(({ level, label, value, count, color, bgColor, borderColor }) => (
                <div key={level} className={`p-3 rounded-lg border-2 ${borderColor} ${bgColor}`}>
                  <div className={`font-semibold text-sm mb-2 ${color}`}>{label}</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            scoreSettings: {
                              ...prev.scoreSettings,
                              levelBasedMarks: {
                                ...prev.scoreSettings.levelBasedMarks,
                                [level]: Math.max(1, value - 1)
                              }
                            }
                          }));
                        }}
                        className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-white transition-colors"
                      >
                        <Minus size={12} className="text-gray-600" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={value}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          scoreSettings: {
                            ...prev.scoreSettings,
                            levelBasedMarks: {
                              ...prev.scoreSettings.levelBasedMarks,
                              [level]: Math.max(1, parseInt(e.target.value) || 1)
                            }
                          }
                        }))}
                        className="w-16 px-2 py-1.5 text-center text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            scoreSettings: {
                              ...prev.scoreSettings,
                              levelBasedMarks: {
                                ...prev.scoreSettings.levelBasedMarks,
                                [level]: value + 1
                              }
                            }
                          }));
                        }}
                        className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-white transition-colors"
                      >
                        <Plus size={12} className="text-gray-600" />
                      </button>
                    </div>
                    <div className="text-center text-xs text-gray-600">
                      {count} questions × {value} marks = {count * value} marks
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-blue-900">Total Exercise Marks</div>
                <div className="text-lg font-bold text-blue-900">{totalMarks} marks</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeSubTab) {
      case 'basic-info': return renderBasicInfo();
      case 'programming': return renderProgrammingSettings();
      case 'level-config': return renderLevelConfiguration();
      case 'schedule': return renderSchedule();
      case 'evaluation': return renderEvaluation();
      case 'compiler': return renderCompilerSettings();
      case 'behavior': return renderBehaviorSettings();
      case 'groups': return renderGroupSettings();
      case 'score': return renderScoreSettings();
      case 'security': return renderSecuritySettings();
      default: return renderBasicInfo();
    }
  };

  const scrollbarStyles = `
    /* Custom scrollbar styles */
    .exercise-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #94a3b8 #f1f5f9;
    }
       
    .exercise-scrollbar::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
       
    .exercise-scrollbar::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }
       
    .exercise-scrollbar::-webkit-scrollbar-thumb {
      background: #94a3b8;
      border-radius: 4px;
      border: 2px solid #f1f5f9;
      transition: all 0.2s ease;
    }
       
    .exercise-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #64748b;
      cursor: pointer;
    }
       
    /* Thin scrollbar variant */
    .thin-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
       
    /* Smooth scrolling */
    .smooth-scroll {
      scroll-behavior: smooth;
    }
       
    /* Scrollbar gutter - reserve space */
    .scrollbar-gutter-stable {
      scrollbar-gutter: stable;
    }
  `;

  return (
    <>
      <style>{scrollbarStyles}</style>

      <ToastContainer />
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col">
          {/* Header Section */}
          <div className="border-b border-gray-200 bg-white px-5 py-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isEditing ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                  {isEditing ? (
                    <Settings2 size={18} className={isEditing ? 'text-yellow-600' : 'text-blue-600'} />
                  ) : (
                    <FileCode size={18} className="text-blue-600" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-base text-gray-900">
                    {isEditing ? 'Edit Exercise Settings' : 'Create New Exercise'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {nodeName} • {nodeType}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Breadcrumbs Hierarchy */}
            <div className="flex items-center gap-1 text-xs">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.type}>
                  {index > 0 && (
                    <ChevronRight size={10} className="text-gray-400" />
                  )}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${index === breadcrumbs.length - 1 ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}>
                    <span className="capitalize">{crumb.type}:</span>
                    <span className="font-medium">{crumb.name}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Alert messages */}
            {error && (
              <div className={`mt-2 px-3 py-2 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200`}>
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-1 min-h-0 exercise-scrollbar scrollbar-gutter-stable thin-scrollbar">
            {/* Left sidebar with hierarchical structure */}
            <div className="w-56 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto py-3 exercise-scrollbar scrollbar-gutter-stable thin-scrollbar">
                <div className="space-y-1 px-2">
                  {mainTabs.map((tab) => (
                    <div key={tab.id} className="mb-1">
                      <button
                        onClick={() => toggleMainTab(tab.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {tab.icon}
                          {tab.label}
                        </div>
                        {expandedMainTabs[tab.id as keyof typeof expandedMainTabs] ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>

                      {expandedMainTabs[tab.id as keyof typeof expandedMainTabs] && (
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {tab.subtabs.map((subtab) => (
                            <button
                              key={subtab.id}
                              onClick={() => setActiveSubTab(subtab.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${activeSubTab === subtab.id
                                ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                              {subtab.icon}
                              {subtab.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main content area - No scrolling needed */}
            <div className="flex-1 flex flex-col min-h-0">
              <form onSubmit={handleSubmit} className="flex-1 overflow-hidden">
                <div className="p-4 h-full overflow-y-auto exercise-scrollbar scrollbar-gutter-stable smooth-scroll">
                  <div className="max-w-3xl mx-auto">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-900">
                        {mainTabs.flatMap(tab => tab.subtabs).find(t => t.id === activeSubTab)?.label}
                      </h3>
                      {activeSubTab === 'level-config' && (
                        <div className="text-xs text-blue-600 font-medium mt-1">
                          Total Questions: {calculateLevelConfigTotal()}
                        </div>
                      )}
                      {activeSubTab === 'score' && (
                        <div className="text-xs text-blue-600 font-medium mt-1">
                          Total Marks: {calculateTotalMarks()}
                        </div>
                      )}
                    </div>
                    <div className="h-[calc(100vh-280px)] min-h-[400px]">
                      {renderTabContent()}
                    </div>
                  </div>
                </div>
              </form>

              {/* Footer with actions */}
              <div className="border-t border-gray-200 px-5 py-3 flex-shrink-0 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    {isEditing ? 'Update existing exercise' : 'Create new exercise'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        showNotification('Cancelled exercise creation', 'info');
                      }}
                      className="px-4 py-2 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading || (!isEditing && fetchingId)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${isEditing
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={14} className="animate-spin" />
                          {isEditing ? 'Updating...' : 'Creating...'}
                        </span>
                      ) : isEditing ? (
                        'Update Exercise'
                      ) : (
                        'Create Exercise'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExerciseSettings;