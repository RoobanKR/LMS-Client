import React, { useEffect, useState } from 'react';
import {
  X, ChevronRight, Settings2, FileCode,
  ArrowLeft, ArrowRight, Code, FileText,
  Layers, Calendar, Bell, Award,
  Plus, Minus, Loader2, Mail,
  MessageCircle, Clock, Lock, Eye,
  Home, BookOpen, Folder, Activity,
  ChevronDown, Shuffle,
  ShuffleIcon, Check, List, Terminal, Grid
} from 'lucide-react';
import { toast } from 'react-toastify';
import { exerciseApi } from '@/apiServices/exercise';

// Define the complete payload interface
export interface ExercisePayload {
  configurationType: 'manual';
  tabType: "I_Do" | "We_Do" | "You_Do";
  subcategory: string;
  exerciseType: 'MCQ' | 'Programming' | 'Combined';
  programmingSettings?: {
    selectedModule: string;
    selectedLanguages: string[];
  };
  exerciseInformation: {
    exerciseId: string;
    exerciseName: string;
    description: string;
    exerciseLevel: 'beginner' | 'intermediate' | 'expert';
    totalDuration: number;
  };
  questionConfiguration: {
    mcqConfig?: {
      questionConfigType: 'general';
      generalQuestionCount: number;
      scoreSettings: {
        scoreType: 'evenMarks';
        evenMarks: number;
        totalMarks: number;
      };
      attemptLimitEnabled: boolean;
      submissionAttempts: number;
    };
    programmingConfig?: {
      questionConfigType: 'general' | 'levelBased' | 'selectionLevel';
      generalQuestionCount?: number;
      levelBasedCounts?: {
        easy: number;
        medium: number;
        hard: number;
      };
      selectionLevelCounts?: {
        easy: number;
        medium: number;
        hard: number;
      };
      scoreSettings: {
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
      };
      questionFlow: 'freeFlow' | 'controlled';
      attemptLimitEnabled: boolean;
      submissionAttempts: number;
    };
  };
  availabilityPeriod: {
    startDate: string;
    endDate: string;
    gracePeriodEnabled: boolean;
    gracePeriodDate?: string;
  };
  notificationSettings: {
    notifyUsers: boolean;
    notifyGmail: boolean;
    notifyWhatsApp: boolean;
    gradeSheet: boolean;
  };
}

interface HierarchyData {
  courseName: string;
  moduleName: string;
  submoduleName: string;
  topicName: string;
  subtopicName: string;
  nodeType: string;
  level: number;
}

interface ExerciseSettingsProps {
  hierarchyData: HierarchyData;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  subcategory: string;
  onSave: (exerciseData: ExercisePayload) => void;
  onClose: () => void;
  isEditing?: boolean;
  tabType?: 'I_Do' | 'We_Do' | 'You_Do';
  initialData?: any; // Optional initial data for editing
  exerciseId?: string; // Required for editing
}

interface Step {
  id: number;
  title: string;
  subtitle: string;
  completed: boolean;
  active: boolean;
  icon: React.ReactNode;
  subItems?: {
    id: string;
    title: string;
    type: 'mcq' | 'programming';
    active: boolean;
  }[];
}

const ExerciseSettings: React.FC<ExerciseSettingsProps> = ({
  hierarchyData,
  nodeId,
  nodeName,
  nodeType,
  subcategory,
  onSave,
  onClose,
  isEditing = false,
  tabType = 'We_Do',
  initialData,
  exercise_Id // This must be here
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Form states
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isScoringOpen, setIsScoringOpen] = useState(false);
  const [isQuestionFlowOpen, setIsQuestionFlowOpen] = useState(false);
  const [currentScoringLabel, setCurrentScoringLabel] = useState('Even Marks - All questions equal marks');
  const [isOpen, setIsOpen] = useState(false);

  // Helper function to format date to YYYY-MM-DDTHH:mm for datetime-local input
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to get default times
  const getDefaultStartTime = (): string => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    now.setSeconds(0);
    return formatDateForInput(now);
  };

  const getDefaultEndTime = (): string => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    now.setHours(23);
    now.setMinutes(59);
    now.setSeconds(0);
    return formatDateForInput(now);
  };

  const getDefaultGracePeriodTime = (): string => {
    const now = new Date();
    now.setDate(now.getDate() + 14);
    now.setHours(23);
    now.setMinutes(59);
    now.setSeconds(0);
    return formatDateForInput(now);
  };

  // Form data state - UPDATED with proper initial values
  const [formData, setFormData] = useState({
    exerciseType: '' as 'MCQ' | 'Programming' | 'Combined' | '',
    selectedModule: '',
    selectedLanguages: [] as string[],
    exerciseId: `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    exerciseName: '',
    description: '',
    exerciseLevel: 'intermediate' as 'beginner' | 'intermediate' | 'expert',
    totalDuration: 60,

    // MCQ Configuration
    mcqConfig: {
      questionConfigType: 'general' as const,
      generalQuestionCount: 5,
      scoreSettings: {
        scoreType: 'evenMarks' as const,
        evenMarks: 10,
        totalMarks: 50
      },
      attemptLimitEnabled: false,
      submissionAttempts: 1
    },

    // Programming Configuration
    programmingConfig: {
      questionConfigType: 'general' as 'general' | 'levelBased' | 'selectionLevel',
      generalQuestionCount: 5,
      selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
      levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
      scoreSettings: {
        scoreType: 'evenMarks' as 'evenMarks' | 'separateMarks' | 'levelBasedMarks',
        evenMarks: 10,
        separateMarks: {
          general: [] as number[],
          levelBased: {
            easy: [] as number[],
            medium: [] as number[],
            hard: [] as number[]
          }
        },
        levelBasedMarks: {
          easy: 10,
          medium: 15,
          hard: 20
        },
        totalMarks: 0
      },
      questionFlow: 'freeFlow' as 'freeFlow' | 'controlled',
      attemptLimitEnabled: false,
      submissionAttempts: 1,
    },

    // Schedule settings
    startDateTime: getDefaultStartTime(),
    endDateTime: getDefaultEndTime(),
    gracePeriodEnabled: false,
    gracePeriodDateTime: getDefaultGracePeriodTime(),
    notifyUsers: false,
    notifyGmail: false,
    notifyWhatsApp: false,
    gradeSheet: true,
  });

  // Module languages mapping
  const moduleLanguages: Record<string, { name: string; icon: string }[]> = {
    'Core Programming': [
      { name: 'C', icon: '/active-images/c.png' },
      { name: 'C++', icon: '/active-images/cpp.png' },
      { name: 'Java', icon: '/active-images/java.png' },
      { name: 'Python', icon: '/active-images/python.png' },
      { name: 'C#', icon: '/active-images/csharp.png' }
    ],
    'Frontend': [
      { name: 'HTML', icon: '/active-images/html.png' },
      { name: 'CSS', icon: '/active-images/css.png' },
      { name: 'JavaScript', icon: '/active-images/javascript.png' },
      { name: 'TypeScript', icon: '/active-images/typescript.png' },
      { name: 'React', icon: '/active-images/react.png' },
      { name: 'Vue', icon: '/active-images/vue.png' },
      { name: 'Angular', icon: '/active-images/angular.png' }
    ],
    'Database': [
      { name: 'SQL', icon: '/active-images/sql.png' },
      { name: 'PL/SQL', icon: '/active-images/plsql.png' },
      { name: 'MongoDB', icon: '/active-images/mongodb.png' },
      { name: 'PostgreSQL', icon: '/active-images/postgresql.png' },
      { name: 'MySQL', icon: '/active-images/mysql.png' }
    ]
  };

  // Dynamic steps based on exercise type
  const getSteps = (): Step[] => {
    const steps: Step[] = [
      {
        id: 1,
        title: 'Exercise Type',
        subtitle: 'Select type',
        completed: currentStep > 1,
        active: currentStep === 1,
        icon: <Settings2 size={16} />
      }
    ];

    // Add Module step only for Programming/Combined
    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      steps.push({
        id: 2,
        title: 'Module',
        subtitle: 'Languages',
        completed: currentStep > 2,
        active: currentStep === 2,
        icon: <Code size={16} />
      });
    }

    // Add Exercise Details step
    const detailsStepId = steps.length + 1;
    steps.push({
      id: detailsStepId,
      title: 'Exercise Details',
      subtitle: 'Info & Time',
      completed: currentStep > detailsStepId,
      active: currentStep === detailsStepId,
      icon: <FileText size={16} />
    });

    // Add Question Configuration step with sub-items
    const questionStepId = detailsStepId + 1;
    steps.push({
      id: questionStepId,
      title: 'Question Configuration',
      subtitle: 'Configure questions',
      completed: currentStep > questionStepId,
      active: currentStep === questionStepId,
      icon: <Layers size={16} />,
      subItems: formData.exerciseType === 'Combined' ? [
        { id: 'mcq', title: 'MCQ Configuration', type: 'mcq', active: true },
        { id: 'programming', title: 'Programming Configuration', type: 'programming', active: true }
      ] : formData.exerciseType === 'MCQ' ? [
        { id: 'mcq', title: 'MCQ Configuration', type: 'mcq', active: true }
      ] : formData.exerciseType === 'Programming' ? [
        { id: 'programming', title: 'Programming Configuration', type: 'programming', active: true }
      ] : undefined
    });

    // Add Schedule step
    const scheduleStepId = questionStepId + 1;
    steps.push({
      id: scheduleStepId,
      title: 'Schedule',
      subtitle: 'Dates & Times',
      completed: currentStep > scheduleStepId,
      active: currentStep === scheduleStepId,
      icon: <Calendar size={16} />
    });

    // Add Final step
    const finalStepId = scheduleStepId + 1;
    steps.push({
      id: finalStepId,
      title: 'Final',
      subtitle: 'Review',
      completed: currentStep > finalStepId,
      active: currentStep === finalStepId,
      icon: <Bell size={16} />
    });

    return steps;
  };

  const steps = getSteps();

  // Configuration options
  const configOptions = [
    { label: 'General Configuration', value: 'general' },
    { label: 'Level-Based Configuration', value: 'levelBased' },
    { label: 'Selection Level Configuration', value: 'selectionLevel' }
  ];

  const questionFlowOptions = [
    {
      value: 'freeFlow',
      label: 'Free Flow',
      description: 'Users can attempt questions in any order and navigate freely',
      icon: <Shuffle size={14} className="text-blue-500" />
    },
    {
      value: 'controlled',
      label: 'Controlled Flow',
      description: 'Users must follow a specific sequence; navigation is restricted',
      icon: <Lock size={14} className="text-purple-500" />
    }
  ];

  // Handle exercise type selection
  const handleSelectExerciseType = (type: 'MCQ' | 'Programming' | 'Combined') => {
    setFormData(prev => ({
      ...prev,
      exerciseType: type,
      ...(type === 'MCQ' && {
        selectedModule: '',
        selectedLanguages: []
      })
    }));
  };

  // Update current step when exercise type changes
  useEffect(() => {
    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      if (currentStep === 1) {
        setCurrentStep(2);
      }
    }
  }, [formData.exerciseType, currentStep]);

  // In ExerciseSettings.tsx, add this useEffect
  useEffect(() => {
    console.log('🔄 ExerciseSettings useEffect triggered:', {
      isEditing,
      exercise_Id,
      hasInitialData: !!initialData
    });

    const fetchExerciseData = async () => {
      console.log('🔍 fetchExerciseData called with exercise_Id:', exercise_Id);

      if (isEditing && exercise_Id && !initialData) {
        try {
          setIsLoading(true);
          console.log('📞 Calling API with exercise_Id:', exercise_Id);

          const response = await exerciseApi.getExerciseById(exercise_Id);

          console.log('📦 API Response received:', response.data);

          if (response.data?.exercise) {
            const exerciseData = response.data.exercise;

            console.log('📝 Parsing exerciseData:', {
              name: exerciseData.exerciseInformation?.exerciseName,
              id: exerciseData.exerciseInformation?.exerciseId,
              type: exerciseData.exerciseType, // Check if this exists
              hasScoreSettings: !!exerciseData.scoreSettings
            });

            // CORRECTED: Transform the backend data to UI format
            const newFormData = {
              // Basic info
              exerciseType: exerciseData.exerciseType || 'Programming', // Default to Programming since it has programmingSettings
              selectedModule: exerciseData.programmingSettings?.selectedModule || '',
              selectedLanguages: exerciseData.programmingSettings?.selectedLanguages || [],
              exerciseId: exerciseData.exerciseInformation?.exerciseId || '',
              exerciseName: exerciseData.exerciseInformation?.exerciseName || '',
              description: exerciseData.exerciseInformation?.description || '',
              exerciseLevel: exerciseData.exerciseInformation?.exerciseLevel || 'intermediate',
              totalDuration: exerciseData.exerciseInformation?.totalDuration || 60,

              // MCQ Configuration - Set defaults since API doesn't have MCQ data
              mcqConfig: {
                questionConfigType: 'general' as const,
                generalQuestionCount: 5,
                scoreSettings: {
                  scoreType: 'evenMarks' as const,
                  evenMarks: 10,
                  totalMarks: 50
                },
                attemptLimitEnabled: false,
                submissionAttempts: 1
              },

              // Programming Configuration - Use data from API
              programmingConfig: {
                questionConfigType: exerciseData.questionConfiguration?.levelType === 'general' ? 'general' :
                  exerciseData.questionConfiguration?.levelType === 'levelBased' ? 'levelBased' : 'selectionLevel',
                generalQuestionCount: exerciseData.questionConfiguration?.general || 0,
                levelBasedCounts: exerciseData.questionConfiguration?.levelBased || { easy: 0, medium: 0, hard: 0 },
                selectionLevelCounts: exerciseData.questionConfiguration?.selectedLevel || { easy: 0, medium: 0, hard: 0 },
                scoreSettings: {
                  // CORRECTED: Use scoreSettings from root, not from questionConfiguration
                  scoreType: exerciseData.scoreSettings?.scoreType || 'evenMarks',
                  evenMarks: exerciseData.scoreSettings?.evenMarks || 10,
                  separateMarks: exerciseData.scoreSettings?.separateMarks || {
                    general: [],
                    levelBased: { easy: [], medium: [], hard: [] }
                  },
                  levelBasedMarks: exerciseData.scoreSettings?.levelBasedMarks || {
                    easy: 10, medium: 15, hard: 20
                  },
                  totalMarks: exerciseData.scoreSettings?.totalMarks || 0
                },
                questionFlow: exerciseData.questionConfiguration?.questionFlow || 'freeFlow',
                attemptLimitEnabled: false, // Default since API doesn't have this
                submissionAttempts: 1, // Default since API doesn't have this
              },

              // Schedule data - CORRECTED property names
              startDateTime: exerciseData.availabilityPeriod?.startDate ?
                formatDateForInput(new Date(exerciseData.availabilityPeriod.startDate)) : getDefaultStartTime(),
              endDateTime: exerciseData.availabilityPeriod?.endDate ?
                formatDateForInput(new Date(exerciseData.availabilityPeriod.endDate)) : getDefaultEndTime(),
              gracePeriodEnabled: exerciseData.availabilityPeriod?.gracePeriodAllowed || false,
              gracePeriodDateTime: exerciseData.availabilityPeriod?.gracePeriodDate ?
                formatDateForInput(new Date(exerciseData.availabilityPeriod.gracePeriodDate)) : getDefaultGracePeriodTime(),

              // Notification settings - CORRECTED property name (typo in API)
              notifyUsers: exerciseData.notificatonandGradeSettings?.notifyUsers || false,
              notifyGmail: exerciseData.notificatonandGradeSettings?.notifyGmail || false,
              notifyWhatsApp: exerciseData.notificatonandGradeSettings?.notifyWhatsApp || false,
              gradeSheet: exerciseData.notificatonandGradeSettings?.gradeSheet || true
            };

            console.log('🎯 New form data prepared:', {
              exerciseName: newFormData.exerciseName,
              exerciseId: newFormData.exerciseId,
              description: newFormData.description,
              exerciseType: newFormData.exerciseType,
              selectedModule: newFormData.selectedModule,
              selectedLanguages: newFormData.selectedLanguages
            });

            // Update the form state
            setFormData(prev => {
              const updated = {
                ...prev,
                ...newFormData
              };
              console.log('🔄 Form data updated');
              return updated;
            });

          } else {
            console.warn('⚠️ No exercise data found in response');
          }
        } catch (error: any) {
          console.error('❌ Error fetching exercise data:', error);
          toast.error('Failed to load exercise data for editing', {
            position: "top-right",
            autoClose: 3000,
          });
        } finally {
          setIsLoading(false);
        }
      } else if (initialData && isEditing) {
        console.log('📝 Using initialData for editing:', initialData);
        // Use the initialData passed from parent
        setFormData(prev => ({
          ...prev,
          exerciseType: initialData.exerciseType || '',
          selectedModule: initialData.programmingSettings?.selectedModule || '',
          selectedLanguages: initialData.programmingSettings?.selectedLanguages || [],
          exerciseId: initialData.exerciseInformation?.exerciseId || '',
          exerciseName: initialData.exerciseInformation?.exerciseName || '',
          description: initialData.exerciseInformation?.description || '',
          exerciseLevel: initialData.exerciseInformation?.exerciseLevel || 'intermediate',
          totalDuration: initialData.exerciseInformation?.totalDuration || 60,
        }));
      } else if (!isEditing) {
        console.log('➕ Creating new exercise (not editing mode)');
        // Reset to default for new exercise
        setFormData({
          exerciseType: '' as 'MCQ' | 'Programming' | 'Combined' | '',
          selectedModule: '',
          selectedLanguages: [] as string[],
          exerciseId: `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          exerciseName: '',
          description: '',
          exerciseLevel: 'intermediate' as 'beginner' | 'intermediate' | 'expert',
          totalDuration: 60,

          // MCQ Configuration
          mcqConfig: {
            questionConfigType: 'general' as const,
            generalQuestionCount: 5,
            scoreSettings: {
              scoreType: 'evenMarks' as const,
              evenMarks: 10,
              totalMarks: 50
            },
            attemptLimitEnabled: false,
            submissionAttempts: 1
          },

          // Programming Configuration
          programmingConfig: {
            questionConfigType: 'general' as 'general' | 'levelBased' | 'selectionLevel',
            generalQuestionCount: 5,
            selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
            levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
            scoreSettings: {
              scoreType: 'evenMarks' as 'evenMarks' | 'separateMarks' | 'levelBasedMarks',
              evenMarks: 10,
              separateMarks: {
                general: [] as number[],
                levelBased: {
                  easy: [] as number[],
                  medium: [] as number[],
                  hard: [] as number[]
                }
              },
              levelBasedMarks: {
                easy: 10,
                medium: 15,
                hard: 20
              },
              totalMarks: 0
            },
            questionFlow: 'freeFlow' as 'freeFlow' | 'controlled',
            attemptLimitEnabled: false,
            submissionAttempts: 1,
          },

          // Schedule settings
          startDateTime: getDefaultStartTime(),
          endDateTime: getDefaultEndTime(),
          gracePeriodEnabled: false,
          gracePeriodDateTime: getDefaultGracePeriodTime(),
          notifyUsers: false,
          notifyGmail: false,
          notifyWhatsApp: false,
          gradeSheet: true,
        });
      }
    };

    fetchExerciseData();
  }, [isEditing, exercise_Id, initialData]);
  // Get entity type from node type
  const getEntityType = (nodeType: string) => {
    const normalized = nodeType ? nodeType.toLowerCase() : 'topic';
    const mapping: Record<string, any> = {
      'module': 'modules',
      'submodule': 'submodules',
      'topic': 'topics',
      'subtopic': 'subtopics'
    };
    return mapping[normalized] || 'topics';
  };

  const entityType = getEntityType(hierarchyData.nodeType);

  // Get breadcrumbs from hierarchy data
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
x
  // Validation
  const validateCurrentStep = (): boolean => {
    const step = steps.find(s => s.id === currentStep);
    if (!step) return false;

    switch (step.title) {
      case 'Exercise Type':
        return formData.exerciseType !== '';
      case 'Module':
        return formData.selectedModule.trim() !== '' && formData.selectedLanguages.length > 0;
      case 'Exercise Details':
        return (
          formData.exerciseId.trim() !== '' &&
          formData.exerciseName.trim() !== '' &&
          formData.description.trim() !== '' &&
          formData.totalDuration > 0
        );
      case 'Question Configuration':
        if (formData.exerciseType === 'MCQ') {
          return formData.mcqConfig.generalQuestionCount > 0;
        } else if (formData.exerciseType === 'Programming') {
          if (formData.programmingConfig.questionConfigType === 'general') {
            return formData.programmingConfig.generalQuestionCount > 0;
          }
          const counts = formData.programmingConfig.questionConfigType === 'selectionLevel'
            ? formData.programmingConfig.selectionLevelCounts
            : formData.programmingConfig.levelBasedCounts;
          return (counts.easy + counts.medium + counts.hard) > 0;
        } else { // Combined
          const mcqValid = formData.mcqConfig.generalQuestionCount > 0;
          let programmingValid = false;
          if (formData.programmingConfig.questionConfigType === 'general') {
            programmingValid = formData.programmingConfig.generalQuestionCount > 0;
          } else {
            const counts = formData.programmingConfig.questionConfigType === 'selectionLevel'
              ? formData.programmingConfig.selectionLevelCounts
              : formData.programmingConfig.levelBasedCounts;
            programmingValid = (counts.easy + counts.medium + counts.hard) > 0;
          }
          return mcqValid && programmingValid;
        }
      case 'Schedule':
        const start = new Date(formData.startDateTime);
        const end = new Date(formData.endDateTime);
        if (start >= end) return false;
        if (formData.gracePeriodEnabled) return new Date(formData.gracePeriodDateTime) >= end;
        return true;
      case 'Final':
        return true;
      default:
        return false;
    }
  };

  // Get total questions for programming section
  const getProgrammingTotalQuestions = (): number => {
    if (formData.programmingConfig.questionConfigType === 'general') {
      return formData.programmingConfig.generalQuestionCount;
    }
    const counts = formData.programmingConfig.questionConfigType === 'selectionLevel'
      ? formData.programmingConfig.selectionLevelCounts
      : formData.programmingConfig.levelBasedCounts;
    return counts.easy + counts.medium + counts.hard;
  };

  // Calculate total marks
  const getTotalMarks = () => {
    let mcqTotal = 0;
    let programmingTotal = 0;

    if (formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') {
      mcqTotal = formData.mcqConfig.generalQuestionCount * formData.mcqConfig.scoreSettings.evenMarks;
    }

    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      const programmingQuestions = getProgrammingTotalQuestions();
      if (formData.programmingConfig.scoreSettings.scoreType === 'evenMarks') {
        programmingTotal = programmingQuestions * formData.programmingConfig.scoreSettings.evenMarks;
      } else if (formData.programmingConfig.scoreSettings.scoreType === 'levelBasedMarks') {
        const counts = formData.programmingConfig.questionConfigType === 'selectionLevel'
          ? formData.programmingConfig.selectionLevelCounts
          : formData.programmingConfig.levelBasedCounts;
        programmingTotal =
          (counts.easy * formData.programmingConfig.scoreSettings.levelBasedMarks.easy) +
          (counts.medium * formData.programmingConfig.scoreSettings.levelBasedMarks.medium) +
          (counts.hard * formData.programmingConfig.scoreSettings.levelBasedMarks.hard);
      }
    }

    return { mcqTotal, programmingTotal, total: mcqTotal + programmingTotal };
  };

  // Handle next step
  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast.error('Please complete all required fields correctly.', { position: "top-right", autoClose: 2000 });
      return;
    }

    const totalSteps = steps.length;
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  // Handle back step
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Toggle language selection
  const toggleLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      selectedLanguages: prev.selectedLanguages.includes(language)
        ? prev.selectedLanguages.filter(l => l !== language)
        : [...prev.selectedLanguages, language]
    }));
  };

  // Toggle all languages
  const toggleAllLanguages = () => {
    const currentLanguages = moduleLanguages[formData.selectedModule]?.map(lang => lang.name) || [];
    const allSelected = currentLanguages.every(lang => formData.selectedLanguages.includes(lang));
    setFormData(prev => ({
      ...prev,
      selectedLanguages: allSelected ? [] : [...currentLanguages]
    }));
  };



  //   const handleComplete = async () => {
  //   if (validateCurrentStep()) {
  //     setIsLoading(true);

  //     try {
  //       console.log('🔍 Starting exercise operation...');

  //       // Calculate totals
  //       const mcqTotal = formData.mcqConfig?.generalQuestionCount * (formData.mcqConfig?.scoreSettings?.evenMarks || 0);
  //       const programmingTotal = getTotalMarks().programmingTotal;

  //       // Ensure all required fields are present
  //       if (!formData.tabType || !formData.subcategory) {
  //         throw new Error('Missing required fields: tabType or subcategory');
  //       }

  //       if (!formData.exerciseName) {
  //         throw new Error('Exercise name is required');
  //       }

  //       // Generate exercise ID if not provided
  //       const exerciseId = formData.exerciseId || `EX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  //       // Prepare the base payload
  //       const basePayload: any = {
  //         exerciseType: formData.exerciseType,
  //         configurationType: {
  //           mcqMode: formData.exerciseType === 'MCQ',
  //           programmingMode: formData.exerciseType === 'Programming',
  //           combinedMode: formData.exerciseType === 'Combined'
  //         },
  //         tabType: formData.tabType,
  //         subcategory: formData.subcategory,
  //         exerciseInformation: {
  //           exerciseId: exerciseId,
  //           exerciseName: formData.exerciseName,
  //           description: formData.description || '',
  //           exerciseLevel: formData.exerciseLevel || 'beginner',
  //           totalDuration: formData.totalDuration || 60
  //         },
  //         availabilityPeriod: {
  //           startDate: formData.startDateTime,
  //           endDate: formData.endDateTime,
  //           gracePeriodAllowed: formData.gracePeriodEnabled || false,
  //           ...(formData.gracePeriodEnabled && formData.gracePeriodDateTime && {
  //             gracePeriodDate: formData.gracePeriodDateTime
  //           }),
  //           extendedDays: 0
  //         },
  //         notificatonandGradeSettings: {
  //           notifyUsers: formData.notifyUsers || false,
  //           notifyGmail: formData.notifyGmail || false,
  //           notifyWhatsApp: formData.notifyWhatsApp || false,
  //           gradeSheet: formData.gradeSheet !== undefined ? formData.gradeSheet : true
  //         },
  //         questions: []
  //       };

  //       console.log('📋 Base payload prepared:', {
  //         isEditing,
  //         exerciseId,
  //         exerciseType: formData.exerciseType,
  //         payload: basePayload
  //       });

  //       // Add Programming Settings for Programming/Combined types
  //       if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
  //         basePayload.programmingSettings = {
  //           selectedModule: formData.selectedModule || '',
  //           selectedLanguages: formData.selectedLanguages || []
  //         };
  //       }

  //       // Handle different exercise types
  //       if (formData.exerciseType === 'MCQ') {
  //         const mcqConfig = formData.mcqConfig || {
  //           generalQuestionCount: 0,
  //           scoreSettings: { evenMarks: 0, totalMarks: 0 },
  //           attemptLimitEnabled: false,
  //           submissionAttempts: 1
  //         };

  //         basePayload.questionConfiguration = {
  //           mcqQuestionConfiguration: {
  //             totalMcqQuestions: mcqConfig.generalQuestionCount || 0,
  //             marksPerQuestion: mcqConfig.scoreSettings?.evenMarks || 0,
  //             mcqTotalMarks: mcqConfig.scoreSettings?.totalMarks || 0,
  //             attemptLimitEnabled: mcqConfig.attemptLimitEnabled || false,
  //             submissionAttempts: mcqConfig.submissionAttempts || 1,
  //             shuffleQuestions: true
  //           }
  //         };
  //       } 
  //       else if (formData.exerciseType === 'Programming') {
  //         const progConfig = formData.programmingConfig || {
  //           questionConfigType: 'general',
  //           scoreSettings: {
  //             scoreType: 'evenMarks',
  //             evenMarks: 0,
  //             separateMarks: { general: [], levelBased: { easy: [], medium: [], hard: [] } },
  //             levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
  //             totalMarks: 0
  //           },
  //           questionFlow: 'freeFlow',
  //           attemptLimitEnabled: false,
  //           submissionAttempts: 1
  //         };

  //         // Determine level configuration
  //         let levelConfig: any = {};
  //         let questionCount = 0;

  //         if (progConfig.questionConfigType === 'general') {
  //           levelConfig.general = progConfig.generalQuestionCount || 0;
  //           questionCount = progConfig.generalQuestionCount || 0;
  //         } else if (progConfig.questionConfigType === 'levelBased') {
  //           levelConfig.levelBased = progConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
  //           const counts = progConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
  //           questionCount = counts.easy + counts.medium + counts.hard;
  //         } else if (progConfig.questionConfigType === 'selectionLevel') {
  //           levelConfig.levelBased = progConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
  //           const counts = progConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
  //           questionCount = counts.easy + counts.medium + counts.hard;
  //         }

  //         // Calculate total marks if not provided
  //         let totalMarks = progConfig.scoreSettings?.totalMarks || 0;
  //         if (totalMarks === 0 && progConfig.scoreSettings) {
  //           if (progConfig.scoreSettings.scoreType === 'evenMarks') {
  //             totalMarks = questionCount * (progConfig.scoreSettings.evenMarks || 0);
  //           } else if (progConfig.scoreSettings.scoreType === 'levelBasedMarks') {
  //             const marks = progConfig.scoreSettings.levelBasedMarks || { easy: 0, medium: 0, hard: 0 };
  //             const counts = levelConfig.levelBased || { easy: 0, medium: 0, hard: 0 };
  //             totalMarks = (counts.easy * marks.easy) + (counts.medium * marks.medium) + (counts.hard * marks.hard);
  //           }
  //         }

  //         basePayload.questionConfiguration = {
  //           programmingQuestionConfiguration: {
  //             questionConfigType: progConfig.questionConfigType,
  //             ...levelConfig,
  //             scoreSettings: {
  //               ...progConfig.scoreSettings,
  //               totalMarks: totalMarks
  //             },
  //             attemptLimitEnabled: progConfig.attemptLimitEnabled || false,
  //             submissionAttempts: progConfig.submissionAttempts || 1,
  //             questionFlow: progConfig.questionFlow || 'freeFlow',
  //             allowCodeExecution: true,
  //             enableTestCases: true,
  //             showSampleCases: true
  //           }
  //         };
  //       } 
  //       else if (formData.exerciseType === 'Combined') {
  //         const mcqConfig = formData.mcqConfig || {
  //           generalQuestionCount: 0,
  //           scoreSettings: { evenMarks: 0, totalMarks: 0 },
  //           attemptLimitEnabled: false,
  //           submissionAttempts: 1
  //         };

  //         const progConfig = formData.programmingConfig || {
  //           questionConfigType: 'general',
  //           scoreSettings: {
  //             scoreType: 'evenMarks',
  //             evenMarks: 0,
  //             separateMarks: { general: [], levelBased: { easy: [], medium: [], hard: [] } },
  //             levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
  //             totalMarks: 0
  //           },
  //           questionFlow: 'freeFlow',
  //           attemptLimitEnabled: false,
  //           submissionAttempts: 1
  //         };

  //         // Determine level configuration for programming
  //         let progLevelConfig: any = {};
  //         let progQuestionCount = 0;

  //         if (progConfig.questionConfigType === 'general') {
  //           progLevelConfig.general = progConfig.generalQuestionCount || 0;
  //           progQuestionCount = progConfig.generalQuestionCount || 0;
  //         } else if (progConfig.questionConfigType === 'levelBased') {
  //           progLevelConfig.levelBased = progConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
  //           const counts = progConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
  //           progQuestionCount = counts.easy + counts.medium + counts.hard;
  //         } else if (progConfig.questionConfigType === 'selectionLevel') {
  //           progLevelConfig.levelBased = progConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
  //           const counts = progConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
  //           progQuestionCount = counts.easy + counts.medium + counts.hard;
  //         }

  //         // Calculate programming total marks if not provided
  //         let progTotalMarks = progConfig.scoreSettings?.totalMarks || 0;
  //         if (progTotalMarks === 0 && progConfig.scoreSettings) {
  //           if (progConfig.scoreSettings.scoreType === 'evenMarks') {
  //             progTotalMarks = progQuestionCount * (progConfig.scoreSettings.evenMarks || 0);
  //           } else if (progConfig.scoreSettings.scoreType === 'levelBasedMarks') {
  //             const marks = progConfig.scoreSettings.levelBasedMarks || { easy: 0, medium: 0, hard: 0 };
  //             const counts = progLevelConfig.levelBased || { easy: 0, medium: 0, hard: 0 };
  //             progTotalMarks = (counts.easy * marks.easy) + (counts.medium * marks.medium) + (counts.hard * marks.hard);
  //           }
  //         }

  //         basePayload.questionConfiguration = {
  //           mcqQuestionConfiguration: {
  //             totalMcqQuestions: mcqConfig.generalQuestionCount || 0,
  //             marksPerQuestion: mcqConfig.scoreSettings?.evenMarks || 0,
  //             mcqTotalMarks: mcqConfig.scoreSettings?.totalMarks || 0,
  //             attemptLimitEnabled: mcqConfig.attemptLimitEnabled || false,
  //             submissionAttempts: mcqConfig.submissionAttempts || 1,
  //             shuffleQuestions: true
  //           },
  //           programmingQuestionConfiguration: {
  //             questionConfigType: progConfig.questionConfigType,
  //             ...progLevelConfig,
  //             scoreSettings: {
  //               ...progConfig.scoreSettings,
  //               totalMarks: progTotalMarks
  //             },
  //             attemptLimitEnabled: progConfig.attemptLimitEnabled || false,
  //             submissionAttempts: progConfig.submissionAttempts || 1,
  //             questionFlow: progConfig.questionFlow || 'freeFlow',
  //             allowCodeExecution: true,
  //             enableTestCases: true,
  //             showSampleCases: true
  //           }
  //         };
  //       }

  //       console.log('📦 Final payload:', JSON.stringify(basePayload, null, 2));

  //       // Call appropriate API based on isEditing flag
  //       let response;
  //       if (isEditing && exerciseId) {
  //         console.log('🔄 Updating exercise:', exerciseId);

  //         // Get entity type for update
  //         const getEntityType = (nodeType: string) => {
  //           const normalized = nodeType.toLowerCase().trim();
  //           const mapping: Record<string, EntityType> = {
  //             'module': 'modules',
  //             'modules': 'modules',
  //             'submodule': 'submodules',
  //             'submodules': 'submodules',
  //             'topic': 'topics',
  //             'topics': 'topics',
  //             'subtopic': 'subtopics',
  //             'subtopics': 'subtopics'
  //           };
  //           return mapping[normalized] || 'topics';
  //         };

  //         const entityType = getEntityType(nodeType);

  //         response = await exerciseApi.updateExercise(
  //           entityType,
  //           nodeId,
  //           exerciseId,
  //           basePayload
  //         );

  //         toast.success('Exercise updated successfully!', {
  //           position: "top-right",
  //           autoClose: 3000,
  //         });
  //       } else {
  //         console.log('➕ Creating new exercise');

  //         // Get entity type for create
  //         const getEntityType = (nodeType: string) => {
  //           const normalized = nodeType.toLowerCase().trim();
  //           const mapping: Record<string, EntityType> = {
  //             'module': 'modules',
  //             'modules': 'modules',
  //             'submodule': 'submodules',
  //             'submodules': 'submodules',
  //             'topic': 'topics',
  //             'topics': 'topics',
  //             'subtopic': 'subtopics',
  //             'subtopics': 'subtopics'
  //           };
  //           return mapping[normalized] || 'topics';
  //         };

  //         const entityType = getEntityType(nodeType);

  //         response = await exerciseApi.addExercise(
  //           entityType,
  //           nodeId,
  //           basePayload
  //         );

  //         toast.success('Exercise created successfully!', {
  //           position: "top-right",
  //           autoClose: 3000,
  //         });
  //       }

  //       console.log('✅ Operation successful:', response);

  //       // Call onSave callback if provided
  //       if (onSave) {
  //         onSave(basePayload);
  //       }

  //       // Optionally reset form or navigate away
  //       if (!isEditing) {
  //         // Reset form or close modal
  //         console.log('🎉 Exercise created, you can reset the form here');
  //       }

  //     } catch (error: any) {
  //       console.error('❌ Error in handleComplete:', error);
  //       console.error('❌ Error details:', {
  //         message: error.message,
  //         response: error.response?.data,
  //         status: error.response?.status,
  //         config: error.config
  //       });

  //       let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${error.message}`;

  //       if (error.response?.data?.message) {
  //         errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${error.response.data.message}`;
  //       } else if (error.response?.data?.error) {
  //         errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${error.response.data.error}`;
  //       } else if (error.response?.data) {
  //         errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${JSON.stringify(error.response.data)}`;
  //       }

  //       toast.error(errorMessage, {
  //         position: "top-right",
  //         autoClose: 5000,
  //       });

  //       // Optionally re-throw the error for parent components
  //       throw error;
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   } else {
  //     console.error('❌ Validation failed for current step');
  //     toast.error('Please complete all required fields correctly.', { 
  //       position: "top-right", 
  //       autoClose: 2000 
  //     });
  //   }
  // };
  // const handleComplete = async () => {
  //   if (validateCurrentStep()) {
  //     setIsLoading(true);

  //     try {
  //       console.log('🔍 Starting exercise operation...');

  //       // Calculate totals
  //       const mcqTotal = formData.mcqConfig.generalQuestionCount * formData.mcqConfig.scoreSettings.evenMarks;
  //       const programmingTotal = getTotalMarks().programmingTotal;

  //       // Prepare the base payload (UI format)
  //       const basePayload: ExercisePayload = {
  //         configurationType: 'manual',
  //         tabType: tabType,
  //         subcategory: subcategory,
  //         exerciseType: formData.exerciseType,

  //         exerciseInformation: {
  //           exerciseId: formData.exerciseId,
  //           exerciseName: formData.exerciseName,
  //           description: formData.description,
  //           exerciseLevel: formData.exerciseLevel,
  //           totalDuration: formData.totalDuration
  //         },

  //         availabilityPeriod: {
  //           startDate: formData.startDateTime,
  //           endDate: formData.endDateTime,
  //           gracePeriodEnabled: formData.gracePeriodEnabled,
  //           ...(formData.gracePeriodEnabled && {
  //             gracePeriodDate: formData.gracePeriodDateTime
  //           })
  //         },

  //         notificationSettings: {
  //           notifyUsers: formData.notifyUsers,
  //           notifyGmail: formData.notifyGmail,
  //           notifyWhatsApp: formData.notifyWhatsApp,
  //           gradeSheet: formData.gradeSheet
  //         },

  //         questionConfiguration: undefined
  //       };

  //       // console.log('📋 Base payload prepared:', {
  //       //   isEditing,
  //       //   exerciseId,
  //       //   exerciseType: formData.exerciseType
  //       // });

  //       // Add Programming Settings for Programming/Combined types
  //       if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
  //         basePayload.programmingSettings = {
  //           selectedModule: formData.selectedModule,
  //           selectedLanguages: formData.selectedLanguages
  //         };
  //       }

  //       // Handle different exercise types
  //       if (formData.exerciseType === 'MCQ') {
  //         basePayload.questionConfiguration = {
  //           mcqConfig: {
  //             questionConfigType: 'general',
  //             generalQuestionCount: formData.mcqConfig.generalQuestionCount,
  //             scoreSettings: {
  //               scoreType: 'evenMarks',
  //               evenMarks: formData.mcqConfig.scoreSettings.evenMarks,
  //               totalMarks: mcqTotal
  //             },
  //             attemptLimitEnabled: formData.mcqConfig.attemptLimitEnabled,
  //             submissionAttempts: formData.mcqConfig.submissionAttempts
  //           }
  //         };
  //       } else if (formData.exerciseType === 'Programming') {
  //         const programmingConfig: any = {
  //           questionConfigType: formData.programmingConfig.questionConfigType,
  //           scoreSettings: {
  //             scoreType: formData.programmingConfig.scoreSettings.scoreType,
  //             evenMarks: formData.programmingConfig.scoreSettings.evenMarks || 0,
  //             separateMarks: formData.programmingConfig.scoreSettings.separateMarks || {
  //               general: [],
  //               levelBased: { easy: [], medium: [], hard: [] }
  //             },
  //             levelBasedMarks: formData.programmingConfig.scoreSettings.levelBasedMarks || { 
  //               easy: 0, medium: 0, hard: 0 
  //             },
  //             totalMarks: programmingTotal
  //           },
  //           questionFlow: formData.programmingConfig.questionFlow,
  //           attemptLimitEnabled: formData.programmingConfig.attemptLimitEnabled,
  //           submissionAttempts: formData.programmingConfig.submissionAttempts
  //         };

  //         if (formData.programmingConfig.questionConfigType === 'general') {
  //           programmingConfig.generalQuestionCount = formData.programmingConfig.generalQuestionCount;
  //         } else if (formData.programmingConfig.questionConfigType === 'selectionLevel') {
  //           programmingConfig.selectionLevelCounts = formData.programmingConfig.selectionLevelCounts;
  //         } else if (formData.programmingConfig.questionConfigType === 'levelBased') {
  //           programmingConfig.levelBasedCounts = formData.programmingConfig.levelBasedCounts;
  //         }

  //         basePayload.questionConfiguration = {
  //           programmingConfig: programmingConfig
  //         };
  //       } else if (formData.exerciseType === 'Combined') {
  //         const mcqConfig = {
  //           questionConfigType: 'general' as const,
  //           generalQuestionCount: formData.mcqConfig.generalQuestionCount,
  //           scoreSettings: {
  //             scoreType: 'evenMarks' as const,
  //             evenMarks: formData.mcqConfig.scoreSettings.evenMarks,
  //             totalMarks: mcqTotal
  //           },
  //           attemptLimitEnabled: formData.mcqConfig.attemptLimitEnabled,
  //           submissionAttempts: formData.mcqConfig.submissionAttempts
  //         };

  //         const programmingConfig: any = {
  //           questionConfigType: formData.programmingConfig.questionConfigType,
  //           scoreSettings: {
  //             scoreType: formData.programmingConfig.scoreSettings.scoreType,
  //             evenMarks: formData.programmingConfig.scoreSettings.evenMarks || 0,
  //             separateMarks: formData.programmingConfig.scoreSettings.separateMarks || {
  //               general: [],
  //               levelBased: { easy: [], medium: [], hard: [] }
  //             },
  //             levelBasedMarks: formData.programmingConfig.scoreSettings.levelBasedMarks || { 
  //               easy: 0, medium: 0, hard: 0 
  //             },
  //             totalMarks: programmingTotal
  //           },
  //           questionFlow: formData.programmingConfig.questionFlow,
  //           attemptLimitEnabled: formData.programmingConfig.attemptLimitEnabled,
  //           submissionAttempts: formData.programmingConfig.submissionAttempts
  //         };

  //         if (formData.programmingConfig.questionConfigType === 'general') {
  //           programmingConfig.generalQuestionCount = formData.programmingConfig.generalQuestionCount;
  //         } else if (formData.programmingConfig.questionConfigType === 'selectionLevel') {
  //           programmingConfig.selectionLevelCounts = formData.programmingConfig.selectionLevelCounts;
  //         } else if (formData.programmingConfig.questionConfigType === 'levelBased') {
  //           programmingConfig.levelBasedCounts = formData.programmingConfig.levelBasedCounts;
  //         }

  //         basePayload.questionConfiguration = {
  //           mcqConfig: mcqConfig,
  //           programmingConfig: programmingConfig
  //         };
  //       }

  //       // Call appropriate API based on isEditing flag
  //       let response;
  //       if (isEditing && exerciseId) {
  //         console.log('🔄 Updating exercise:', exerciseId);

  //         // Get entity type for update
  //         const getEntityType = (nodeType: string) => {
  //           const normalized = nodeType.toLowerCase().trim();
  //           const mapping: Record<string, EntityType> = {
  //             'module': 'modules',
  //             'modules': 'modules',
  //             'submodule': 'submodules',
  //             'submodules': 'submodules',
  //             'topic': 'topics',
  //             'topics': 'topics',
  //             'subtopic': 'subtopics',
  //             'subtopics': 'subtopics'
  //           };
  //           return mapping[normalized] || 'topics';
  //         };

  //         const entityType = getEntityType(nodeType);

  //         response = await exerciseApi.updateExercise(
  //           entityType,
  //           nodeId,
  //           exerciseId,
  //           basePayload
  //         );

  //         toast.success('Exercise updated successfully!', {
  //           position: "top-right",
  //           autoClose: 3000,
  //         });
  //       } else {
  //         console.log('➕ Creating new exercise');

  //         // Get entity type for create
  //         const getEntityType = (nodeType: string) => {
  //           const normalized = nodeType.toLowerCase().trim();
  //           const mapping: Record<string, EntityType> = {
  //             'module': 'modules',
  //             'modules': 'modules',
  //             'submodule': 'submodules',
  //             'submodules': 'submodules',
  //             'topic': 'topics',
  //             'topics': 'topics',
  //             'subtopic': 'subtopics',
  //             'subtopics': 'subtopics'
  //           };
  //           return mapping[normalized] || 'topics';
  //         };

  //         const entityType = getEntityType(nodeType);

  //         response = await exerciseApi.addExercise(
  //           entityType,
  //           nodeId,
  //           basePayload
  //         );

  //         toast.success('Exercise created successfully!', {
  //           position: "top-right",
  //           autoClose: 3000,
  //         });
  //       }

  //       console.log('✅ Operation successful:', response);

  //       onSave(basePayload);

  //     } catch (error: any) {
  //       console.error('❌ Error:', error);
  //       console.error('❌ Error details:', {
  //         message: error.message,
  //         response: error.response?.data,
  //         status: error.response?.status
  //       });

  //       let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${error.message}`;
  //       if (error.response?.data?.message) {
  //         errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${error.response.data.message}`;
  //       } else if (error.response?.data?.error) {
  //         errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${error.response.data.error}`;
  //       }

  //       toast.error(errorMessage, {
  //         position: "top-right",
  //         autoClose: 5000,
  //       });
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   } else {
  //     console.error('❌ Validation failed for current step');
  //     toast.error('Please complete all required fields correctly.', { 
  //       position: "top-right", 
  //       autoClose: 2000 
  //     });
  //   }
  // };

  // Render MCQ Configuration with Attempt Limit

  const handleComplete = async () => {
    if (validateCurrentStep()) {
      setIsLoading(true);

      try {
        console.log('🔍 Starting exercise operation...');

        // Calculate totals - FIXED: Ensure proper calculations
        const mcqTotal = (formData.mcqConfig?.generalQuestionCount || 0) * (formData.mcqConfig?.scoreSettings?.evenMarks || 0);
        const programmingTotal = getTotalMarks().programmingTotal;

        // Ensure all required fields are present
        if (!tabType || !subcategory) {
          throw new Error('Missing required fields: tabType or subcategory');
        }

        if (!formData.exerciseName) {
          throw new Error('Exercise name is required');
        }

        // Prepare the base payload (UI format) - MATCHING BACKEND EXPECTATIONS
        const basePayload: any = {
          tabType: tabType,
          subcategory: subcategory,
          exerciseType: formData.exerciseType,
          configurationType: {
            mcqMode: formData.exerciseType === 'MCQ',
            programmingMode: formData.exerciseType === 'Programming',
            combinedMode: formData.exerciseType === 'Combined'
          },
          exerciseInformation: {
            exerciseId: formData.exerciseId || `EX${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            exerciseName: formData.exerciseName,
            description: formData.description || '',
            exerciseLevel: formData.exerciseLevel || 'beginner',
            totalDuration: formData.totalDuration || 60
          },
          availabilityPeriod: {
            startDate: formData.startDateTime,
            endDate: formData.endDateTime,
            gracePeriodAllowed: formData.gracePeriodEnabled || false,
            ...(formData.gracePeriodEnabled && formData.gracePeriodDateTime && {
              gracePeriodDate: formData.gracePeriodDateTime
            }),
            extendedDays: 0
          },
          notificationSettings: {
            notifyUsers: formData.notifyUsers || false,
            notifyGmail: formData.notifyGmail || false,
            notifyWhatsApp: formData.notifyWhatsApp || false,
            gradeSheet: formData.gradeSheet !== undefined ? formData.gradeSheet : true
          },
        };

        console.log('📋 Base payload prepared:', {
          isEditing,
          exerciseId: formData.exerciseId,
          exerciseType: formData.exerciseType,
          tabType: tabType,
          subcategory: subcategory
        });

        // Add Programming Settings for Programming/Combined types
        if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
          basePayload.programmingSettings = {
            selectedModule: formData.selectedModule || '',
            selectedLanguages: formData.selectedLanguages || []
          };
        }

        // Handle different exercise types - SENDING STRUCTURE THAT BACKEND EXPECTS
        if (formData.exerciseType === 'MCQ') {
          const mcqConfig = formData.mcqConfig || {
            generalQuestionCount: 0,
            scoreSettings: { evenMarks: 0, totalMarks: 0 },
            attemptLimitEnabled: false,
            submissionAttempts: 1
          };

          // Backend expects mcqConfig object (not mcqQuestionConfiguration)
          basePayload.questionConfiguration = {
            mcqConfig: {
              questionConfigType: 'general',
              generalQuestionCount: mcqConfig.generalQuestionCount || 0,
              scoreSettings: {
                scoreType: 'evenMarks',
                evenMarks: mcqConfig.scoreSettings?.evenMarks || 0,
                totalMarks: mcqTotal // Use calculated total
              },
              attemptLimitEnabled: mcqConfig.attemptLimitEnabled || false,
              submissionAttempts: mcqConfig.submissionAttempts || 1
            }
          };
        }
        else if (formData.exerciseType === 'Programming') {
          const progConfig = formData.programmingConfig || {
            questionConfigType: 'general',
            scoreSettings: {
              scoreType: 'evenMarks',
              evenMarks: 0,
              separateMarks: { general: [], levelBased: { easy: [], medium: [], hard: [] } },
              levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
              totalMarks: 0
            },
            questionFlow: 'freeFlow',
            attemptLimitEnabled: false,
            submissionAttempts: 1
          };

          // Determine level configuration
          let generalQuestionCount = 0;
          let levelBasedCounts = { easy: 0, medium: 0, hard: 0 };
          let selectionLevelCounts = { easy: 0, medium: 0, hard: 0 };

          if (progConfig.questionConfigType === 'general') {
            generalQuestionCount = progConfig.generalQuestionCount || 0;
          } else if (progConfig.questionConfigType === 'levelBased') {
            levelBasedCounts = progConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
          } else if (progConfig.questionConfigType === 'selectionLevel') {
            selectionLevelCounts = progConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
          }

          // Calculate total marks based on scoring type
          let totalMarks = programmingTotal;
          if (totalMarks === 0 && progConfig.scoreSettings) {
            if (progConfig.scoreSettings.scoreType === 'evenMarks') {
              const questionCount = progConfig.questionConfigType === 'general'
                ? (progConfig.generalQuestionCount || 0)
                : (levelBasedCounts.easy + levelBasedCounts.medium + levelBasedCounts.hard);
              totalMarks = questionCount * (progConfig.scoreSettings.evenMarks || 0);
            } else if (progConfig.scoreSettings.scoreType === 'levelBasedMarks') {
              const counts = progConfig.questionConfigType === 'levelBased' ? levelBasedCounts : selectionLevelCounts;
              const levelMarks = progConfig.scoreSettings.levelBasedMarks || { easy: 0, medium: 0, hard: 0 };
              totalMarks = (counts.easy * levelMarks.easy) +
                (counts.medium * levelMarks.medium) +
                (counts.hard * levelMarks.hard);
            }
          }

          // Backend expects programmingConfig object
          const programmingConfig: any = {
            questionConfigType: progConfig.questionConfigType,
            scoreSettings: {
              scoreType: progConfig.scoreSettings?.scoreType || 'evenMarks',
              evenMarks: progConfig.scoreSettings?.evenMarks || 0,
              separateMarks: progConfig.scoreSettings?.separateMarks || {
                general: [],
                levelBased: { easy: [], medium: [], hard: [] }
              },
              levelBasedMarks: progConfig.scoreSettings?.levelBasedMarks || {
                easy: 0, medium: 0, hard: 0
              },
              totalMarks: totalMarks
            },
            questionFlow: progConfig.questionFlow || 'freeFlow',
            attemptLimitEnabled: progConfig.attemptLimitEnabled || false,
            submissionAttempts: progConfig.submissionAttempts || 1
          };

          if (progConfig.questionConfigType === 'general') {
            programmingConfig.generalQuestionCount = generalQuestionCount;
          } else if (progConfig.questionConfigType === 'levelBased') {
            programmingConfig.levelBasedCounts = levelBasedCounts;
          } else if (progConfig.questionConfigType === 'selectionLevel') {
            programmingConfig.selectionLevelCounts = selectionLevelCounts;
          }

          basePayload.questionConfiguration = {
            programmingConfig: programmingConfig
          };
        }
        else if (formData.exerciseType === 'Combined') {
          const mcqConfig = formData.mcqConfig || {
            generalQuestionCount: 0,
            scoreSettings: { evenMarks: 0, totalMarks: 0 },
            attemptLimitEnabled: false,
            submissionAttempts: 1
          };

          const progConfig = formData.programmingConfig || {
            questionConfigType: 'general',
            scoreSettings: {
              scoreType: 'evenMarks',
              evenMarks: 0,
              separateMarks: { general: [], levelBased: { easy: [], medium: [], hard: [] } },
              levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
              totalMarks: 0
            },
            questionFlow: 'freeFlow',
            attemptLimitEnabled: false,
            submissionAttempts: 1
          };

          // Determine level configuration for programming
          let generalQuestionCount = 0;
          let levelBasedCounts = { easy: 0, medium: 0, hard: 0 };
          let selectionLevelCounts = { easy: 0, medium: 0, hard: 0 };

          if (progConfig.questionConfigType === 'general') {
            generalQuestionCount = progConfig.generalQuestionCount || 0;
          } else if (progConfig.questionConfigType === 'levelBased') {
            levelBasedCounts = progConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
          } else if (progConfig.questionConfigType === 'selectionLevel') {
            selectionLevelCounts = progConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
          }

          // Calculate programming total marks
          let progTotalMarks = programmingTotal;
          if (progTotalMarks === 0 && progConfig.scoreSettings) {
            if (progConfig.scoreSettings.scoreType === 'evenMarks') {
              const questionCount = progConfig.questionConfigType === 'general'
                ? (progConfig.generalQuestionCount || 0)
                : (levelBasedCounts.easy + levelBasedCounts.medium + levelBasedCounts.hard);
              progTotalMarks = questionCount * (progConfig.scoreSettings.evenMarks || 0);
            } else if (progConfig.scoreSettings.scoreType === 'levelBasedMarks') {
              const counts = progConfig.questionConfigType === 'levelBased' ? levelBasedCounts : selectionLevelCounts;
              const levelMarks = progConfig.scoreSettings.levelBasedMarks || { easy: 0, medium: 0, hard: 0 };
              progTotalMarks = (counts.easy * levelMarks.easy) +
                (counts.medium * levelMarks.medium) +
                (counts.hard * levelMarks.hard);
            }
          }

          // Combined mode - send both configs
          basePayload.questionConfiguration = {
            mcqConfig: {
              questionConfigType: 'general',
              generalQuestionCount: mcqConfig.generalQuestionCount || 0,
              scoreSettings: {
                scoreType: 'evenMarks',
                evenMarks: mcqConfig.scoreSettings?.evenMarks || 0,
                totalMarks: mcqTotal
              },
              attemptLimitEnabled: mcqConfig.attemptLimitEnabled || false,
              submissionAttempts: mcqConfig.submissionAttempts || 1
            },
            programmingConfig: {
              questionConfigType: progConfig.questionConfigType,
              scoreSettings: {
                scoreType: progConfig.scoreSettings?.scoreType || 'evenMarks',
                evenMarks: progConfig.scoreSettings?.evenMarks || 0,
                separateMarks: progConfig.scoreSettings?.separateMarks || {
                  general: [],
                  levelBased: { easy: [], medium: [], hard: [] }
                },
                levelBasedMarks: progConfig.scoreSettings?.levelBasedMarks || {
                  easy: 0, medium: 0, hard: 0
                },
                totalMarks: progTotalMarks
              },
              questionFlow: progConfig.questionFlow || 'freeFlow',
              attemptLimitEnabled: progConfig.attemptLimitEnabled || false,
              submissionAttempts: progConfig.submissionAttempts || 1
            }
          };

          // Add counts to programming config based on type
          if (progConfig.questionConfigType === 'general') {
            basePayload.questionConfiguration.programmingConfig.generalQuestionCount = generalQuestionCount;
          } else if (progConfig.questionConfigType === 'levelBased') {
            basePayload.questionConfiguration.programmingConfig.levelBasedCounts = levelBasedCounts;
          } else if (progConfig.questionConfigType === 'selectionLevel') {
            basePayload.questionConfiguration.programmingConfig.selectionLevelCounts = selectionLevelCounts;
          }
        }

        console.log('📦 Final payload for backend:', JSON.stringify(basePayload, null, 2));

        // Call appropriate API based on isEditing flag
        let response;
        if (isEditing && exercise_Id) {
          console.log('🔄 Updating exercise:', exercise_Id);

          // Get entity type for update
          const getEntityType = (nodeType: string) => {
            const normalized = nodeType.toLowerCase().trim();
            const mapping: Record<string, any> = {
              'module': 'modules',
              'modules': 'modules',
              'submodule': 'submodules',
              'submodules': 'submodules',
              'topic': 'topics',
              'topics': 'topics',
              'subtopic': 'subtopics',
              'subtopics': 'subtopics'
            };
            return mapping[normalized] || 'topics';
          };

          const entityType = getEntityType(nodeType);

          response = await exerciseApi.updateExercise(
            entityType,
            nodeId,
            exercise_Id,
            basePayload
          );

          toast.success('Exercise updated successfully!', {
            position: "top-right",
            autoClose: 3000,
          });
        } else {
          console.log('➕ Creating new exercise');

          // Get entity type for create
          const getEntityType = (nodeType: string) => {
            const normalized = nodeType.toLowerCase().trim();
            const mapping: Record<string, any> = {
              'module': 'modules',
              'modules': 'modules',
              'submodule': 'submodules',
              'submodules': 'submodules',
              'topic': 'topics',
              'topics': 'topics',
              'subtopic': 'subtopics',
              'subtopics': 'subtopics'
            };
            return mapping[normalized] || 'topics';
          };

          const entityType = getEntityType(nodeType);

          response = await exerciseApi.addExercise(
            entityType,
            nodeId,
            basePayload
          );

          toast.success('Exercise created successfully!', {
            position: "top-right",
            autoClose: 3000,
          });
        }

        console.log('✅ Operation successful:', response);

        // Call onSave callback if provided
        if (onSave) {
          onSave(basePayload);
        }

        // Close modal after successful operation
        onClose();

      } catch (error: any) {
        console.error('❌ Error in handleComplete:', error);
        console.error('❌ Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          config: error.config
        });

        let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${error.message}`;

        if (error.response?.data?.message) {
          errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${JSON.stringify(error.response.data.message)}`;
        } else if (error.response?.data?.error) {
          errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${error.response.data.error}`;
        } else if (error.response?.data) {
          errorMessage = `Failed to ${isEditing ? 'update' : 'create'} exercise: ${JSON.stringify(error.response.data)}`;
        }

        toast.error(errorMessage, {
          position: "top-right",
          autoClose: 5000,
        });

        // Optionally re-throw the error for parent components
        throw error;
      } finally {
        setIsLoading(false);
      }
    } else {
      console.error('❌ Validation failed for current step');
      toast.error('Please complete all required fields correctly.', {
        position: "top-right",
        autoClose: 2000
      });
    }
  };

  const renderMCQConfiguration = () => {
    const { mcqTotal } = getTotalMarks();

    return (
      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 rounded-lg p-2">
            <List size={18} className="text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">MCQ Configuration</h4>
            <p className="text-xs text-gray-500">Configure Multiple Choice Questions</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700 mb-1 ml-0.5">
                Total MCQ Questions
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={formData.mcqConfig.generalQuestionCount}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      mcqConfig: {
                        ...prev.mcqConfig,
                        generalQuestionCount: Math.max(1, parseInt(e.target.value) || 1)
                      }
                    }))
                  }
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                             bg-white text-gray-700 placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                             transition-all duration-200 shadow-sm"
                  placeholder="Enter total MCQ questions"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 text-xs">questions</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700 mb-1 ml-0.5">
                Marks Per Question
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.mcqConfig.scoreSettings.evenMarks}
                  onChange={(e) => {
                    const marks = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                    setFormData(prev => ({
                      ...prev,
                      mcqConfig: {
                        ...prev.mcqConfig,
                        scoreSettings: {
                          ...prev.mcqConfig.scoreSettings,
                          evenMarks: marks
                        }
                      }
                    }));
                  }}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                             bg-white text-gray-700 placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                             transition-all duration-200 shadow-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 text-xs">marks</span>
                </div>
              </div>
            </div>
          </div>

          {/* MCQ Attempt Limit Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-gray-600" />
                <div>
                  <h4 className="text-xs font-bold text-gray-900">MCQ Attempt Limit</h4>
                  <p className="text-[10px] text-gray-500">Limit number of MCQ submission attempts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.mcqConfig.attemptLimitEnabled}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    mcqConfig: {
                      ...prev.mcqConfig,
                      attemptLimitEnabled: e.target.checked,
                      submissionAttempts: e.target.checked ? prev.mcqConfig.submissionAttempts : 1
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {formData.mcqConfig.attemptLimitEnabled && (
              <div className="animate-in slide-in-from-top-1">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700 mb-1 ml-0.5">
                      Number of MCQ Attempts Allowed
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.mcqConfig.submissionAttempts}
                        onChange={(e) => {
                          const attempts = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
                          setFormData(prev => ({
                            ...prev,
                            mcqConfig: {
                              ...prev.mcqConfig,
                              submissionAttempts: attempts
                            }
                          }));
                        }}
                        className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                                   bg-white text-gray-700 placeholder-gray-400
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                                   transition-all duration-200 shadow-sm"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 text-xs">attempts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border border-blue-100 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-blue-800">MCQ Total Marks</div>
                <div className="text-xs text-blue-600">
                  {formData.mcqConfig.generalQuestionCount} questions × {formData.mcqConfig.scoreSettings.evenMarks} marks
                </div>
              </div>
              <div className="text-lg font-bold text-blue-700">
                {mcqTotal} marks
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render score options for programming
  const renderProgrammingScoreOptions = () => {
    const totalQuestions = getProgrammingTotalQuestions();
    const counts = formData.programmingConfig.questionConfigType === 'selectionLevel'
      ? formData.programmingConfig.selectionLevelCounts
      : formData.programmingConfig.levelBasedCounts;

    const scoringOptions = [
      { value: 'evenMarks', label: 'Even Marks - All questions equal marks' },
      { value: 'separateMarks', label: 'Separate Marks - Individual question marks' },
      ...(formData.programmingConfig.questionConfigType === 'levelBased' || formData.programmingConfig.questionConfigType === 'selectionLevel'
        ? [{ value: 'levelBasedMarks', label: 'Level Based Marks - Marks by difficulty' }]
        : [])
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 rounded-lg p-2">
            <Award size={18} className="text-gray-700" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Scoring Configuration</h4>
            <p className="text-xs text-gray-500">Configure how marks will be awarded</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Scoring Type
          </label>
          <div className="relative w-auto inline-block">
            <button
              type="button"
              onClick={() => setIsScoringOpen(!isScoringOpen)}
              className={`
                relative flex items-center justify-between
                px-3 py-2
                bg-white
                border border-gray-200
                rounded-lg
                text-left text-sm text-gray-800
                shadow-sm
                transition-all duration-150 ease-in-out
                hover:shadow hover:border-purple-300
                focus:outline-none focus:ring-1 focus:ring-purple-200
                ${isScoringOpen ? 'ring-1 ring-purple-200 border-purple-400' : ''}
                min-w-[280px] max-w-[350px]
              `}
            >
              <span className="block truncate text-sm">{currentScoringLabel}</span>
              <span className={`ml-2 flex items-center pointer-events-none transition-transform duration-200 ${isScoringOpen ? 'rotate-180' : ''}`}>
                <svg className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </button>

            {isScoringOpen && (
              <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-75 min-w-[280px] max-w-[350px]">
                <div className="py-1">
                  {scoringOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        const newType = option.value as 'evenMarks' | 'separateMarks' | 'levelBasedMarks';
                        setFormData(prev => ({
                          ...prev,
                          programmingConfig: {
                            ...prev.programmingConfig,
                            scoreSettings: {
                              ...prev.programmingConfig.scoreSettings,
                              scoreType: newType
                            }
                          }
                        }));
                        setCurrentScoringLabel(option.label);
                        setIsScoringOpen(false);
                      }}
                      className={`
                        w-full text-left block px-3 py-2 text-sm transition-colors duration-100 hover:bg-gray-50
                        ${formData.programmingConfig.scoreSettings?.scoreType === option.value
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:text-gray-900'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${formData.programmingConfig.scoreSettings?.scoreType === option.value ? 'bg-purple-500' : 'bg-gray-300'}`} />
                        <span className="truncate">{option.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          {formData.programmingConfig.scoreSettings?.scoreType === 'evenMarks' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marks Per Question
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.programmingConfig.scoreSettings.evenMarks}
                    onChange={(e) => {
                      const marks = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                      setFormData(prev => ({
                        ...prev,
                        programmingConfig: {
                          ...prev.programmingConfig,
                          scoreSettings: {
                            ...prev.programmingConfig.scoreSettings,
                            evenMarks: marks
                          }
                        }
                      }));
                    }}
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                               bg-white text-gray-700 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                               transition-all duration-200 shadow-sm"
                  />
                  <span className="text-sm text-gray-500">marks per question</span>
                </div>
              </div>
            </div>
          )}

          {formData.programmingConfig.scoreSettings?.scoreType === 'separateMarks' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-1">Separate Marks Configuration</h5>
                    <p className="text-xs text-gray-600">
                      Marks will be configured individually for each question during question creation.
                      Total marks will be calculated automatically based on individual question marks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {formData.programmingConfig.scoreSettings?.scoreType === 'levelBasedMarks' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {counts.easy > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Easy Level</span>
                          <span className="text-xs text-gray-500">{counts.easy} questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.programmingConfig.scoreSettings.levelBasedMarks.easy}
                            onChange={(e) => {
                              const marks = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                              setFormData(prev => ({
                                ...prev,
                                programmingConfig: {
                                  ...prev.programmingConfig,
                                  scoreSettings: {
                                    ...prev.programmingConfig.scoreSettings,
                                    levelBasedMarks: {
                                      ...prev.programmingConfig.scoreSettings.levelBasedMarks,
                                      easy: marks
                                    }
                                  }
                                }
                              }));
                            }}
                            className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                                       bg-white text-gray-700 placeholder-gray-400
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                                       transition-all duration-200 shadow-sm"
                          />
                          <span className="text-sm text-gray-500">marks</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {counts.medium > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Medium Level</span>
                          <span className="text-xs text-gray-500">{counts.medium} questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.programmingConfig.scoreSettings.levelBasedMarks.medium}
                            onChange={(e) => {
                              const marks = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                              setFormData(prev => ({
                                ...prev,
                                programmingConfig: {
                                  ...prev.programmingConfig,
                                  scoreSettings: {
                                    ...prev.programmingConfig.scoreSettings,
                                    levelBasedMarks: {
                                      ...prev.programmingConfig.scoreSettings.levelBasedMarks,
                                      medium: marks
                                    }
                                  }
                                }
                              }));
                            }}
                            className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                                       bg-white text-gray-700 placeholder-gray-400
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                                       transition-all duration-200 shadow-sm"
                          />
                          <span className="text-sm text-gray-500">marks</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {counts.hard > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Hard Level</span>
                          <span className="text-xs text-gray-500">{counts.hard} questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.programmingConfig.scoreSettings.levelBasedMarks.hard}
                            onChange={(e) => {
                              const marks = Math.min(100, Math.max(1, parseInt(e.target.value) || 1));
                              setFormData(prev => ({
                                ...prev,
                                programmingConfig: {
                                  ...prev.programmingConfig,
                                  scoreSettings: {
                                    ...prev.programmingConfig.scoreSettings,
                                    levelBasedMarks: {
                                      ...prev.programmingConfig.scoreSettings.levelBasedMarks,
                                      hard: marks
                                    }
                                  }
                                }
                              }));
                            }}
                            className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                                       bg-white text-gray-700 placeholder-gray-400
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                                       transition-all duration-200 shadow-sm"
                          />
                          <span className="text-sm text-gray-500">marks</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Programming Configuration
  const renderProgrammingConfiguration = () => {
    const currentConfigLabel = configOptions.find(opt => opt.value === formData.programmingConfig.questionConfigType)?.label || 'Select Type';
    const currentFlowOption = questionFlowOptions.find(opt => opt.value === formData.programmingConfig.questionFlow);

    return (
      <div className={`border rounded-lg p-4 ${formData.exerciseType === 'Combined' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`rounded-lg p-2 ${formData.exerciseType === 'Combined' ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Terminal size={18} className={formData.exerciseType === 'Combined' ? 'text-green-600' : 'text-gray-700'} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {formData.exerciseType === 'Combined' ? 'Programming Configuration' : 'Question Configuration'}
            </h4>
            <p className="text-xs text-gray-500">
              {formData.exerciseType === 'Combined'
                ? 'Configure Programming Questions'
                : 'Configure questions, scoring, and flow'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Configuration Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-700 mb-1 ml-0.5">
                Configuration Type
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(!isConfigOpen)}
                  className={`
                    relative w-full flex items-center justify-between
                    px-3 py-2
                    bg-white
                    border border-gray-200
                    rounded-lg
                    text-left text-sm text-gray-800
                    shadow-sm
                    transition-all duration-150 ease-in-out
                    hover:shadow hover:border-purple-300
                    focus:outline-none focus:ring-1 focus:ring-purple-200
                    ${isConfigOpen ? 'ring-1 ring-purple-200 border-purple-400' : ''}
                  `}
                >
                  <span className="block truncate text-sm">{currentConfigLabel}</span>
                  <span className={`ml-2 flex items-center pointer-events-none transition-transform duration-200 ${isConfigOpen ? 'rotate-180' : ''}`}>
                    <svg className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>

                {isConfigOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-75">
                    <div className="py-0.5">
                      {configOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            const newType = option.value as 'general' | 'levelBased' | 'selectionLevel';
                            setFormData(prev => ({
                              ...prev,
                              programmingConfig: {
                                ...prev.programmingConfig,
                                questionConfigType: newType,
                                generalQuestionCount: 0,
                                selectionLevelCounts: { easy: 0, medium: 0, hard: 0 },
                                levelBasedCounts: { easy: 0, medium: 0, hard: 0 },
                              }
                            }));
                            setIsConfigOpen(false);
                          }}
                          className={`
                            w-full text-left block px-3 py-1.5 text-sm transition-colors duration-100
                            ${formData.programmingConfig.questionConfigType === option.value
                              ? 'bg-purple-50 text-purple-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                          `}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {formData.programmingConfig.questionConfigType === 'general' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700 mb-1 ml-0.5">
                  Total Questions
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={formData.programmingConfig.generalQuestionCount}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        programmingConfig: {
                          ...prev.programmingConfig,
                          generalQuestionCount: Math.max(1, parseInt(e.target.value) || 1),
                        }
                      }))
                    }
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                               bg-white text-gray-700 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                               transition-all duration-200 shadow-sm"
                    placeholder="Enter total questions"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500 text-xs">questions</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-2">
                  {['easy', 'medium', 'hard'].map(level => {
                    const l = level as keyof typeof formData.programmingConfig.selectionLevelCounts;
                    const counts =
                      formData.programmingConfig.questionConfigType === 'selectionLevel'
                        ? formData.programmingConfig.selectionLevelCounts
                        : formData.programmingConfig.levelBasedCounts;

                    const count = counts[l];

                    const levelStyles = {
                      easy: { label: 'Easy', color: 'text-emerald-700' },
                      medium: { label: 'Medium', color: 'text-amber-700' },
                      hard: { label: 'Hard', color: 'text-rose-700' }
                    };

                    const style = levelStyles[l];

                    return (
                      <div key={l} className="space-y-0.5">
                        <label className={`text-xs font-medium ${style.color}`}>
                          {style.label}
                        </label>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => {
                              const newCounts = { ...counts, [l]: Math.max(0, count - 1) };
                              setFormData(prev => ({
                                ...prev,
                                programmingConfig: {
                                  ...prev.programmingConfig,
                                  [formData.programmingConfig.questionConfigType === 'selectionLevel'
                                    ? 'selectionLevelCounts'
                                    : 'levelBasedCounts']: newCounts,
                                }
                              }));
                            }}
                            className={`
                              w-7 h-7 flex items-center justify-center border rounded
                              transition-colors duration-150 flex-shrink-0
                              ${count === 0
                                ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100'
                              }
                            `}
                            disabled={count === 0}
                          >
                            <Minus size={12} />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={(e) => {
                              const value = Math.max(0, parseInt(e.target.value) || 0);
                              const newCounts = { ...counts, [l]: value };
                              setFormData(prev => ({
                                ...prev,
                                programmingConfig: {
                                  ...prev.programmingConfig,
                                  [formData.programmingConfig.questionConfigType === 'selectionLevel'
                                    ? 'selectionLevelCounts'
                                    : 'levelBasedCounts']: newCounts,
                                }
                              }));
                            }}
                            className="w-full px-2 py-1.5 text-center text-xs rounded-lg border border-gray-200 
                                       bg-white text-gray-700 placeholder-gray-400
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                                       transition-all duration-200 shadow-sm"
                          />

                          <button
                            onClick={() => {
                              const newCounts = { ...counts, [l]: count + 1 };
                              setFormData(prev => ({
                                ...prev,
                                programmingConfig: {
                                  ...prev.programmingConfig,
                                  [formData.programmingConfig.questionConfigType === 'selectionLevel'
                                    ? 'selectionLevelCounts'
                                    : 'levelBasedCounts']: newCounts,
                                }
                              }));
                            }}
                            className="
                              w-7 h-7 flex items-center justify-center border border-gray-300 rounded
                              bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400
                              active:bg-gray-100 transition-colors duration-150 flex-shrink-0
                            "
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Questions Summary */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-800">
                  Total Programming Questions
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {formData.programmingConfig.questionConfigType === 'general'
                    ? 'Total questions configured'
                    : 'Configured across all difficulty levels'}
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <div className="text-2xl font-bold text-gray-900">
                  {getProgrammingTotalQuestions()}
                </div>
                <span className="text-sm text-gray-600">questions</span>
              </div>
            </div>
          </div>

          {/* Scoring Configuration */}
          {renderProgrammingScoreOptions()}

          {/* Programming Attempt Limit */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-gray-600" />
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Attempt Limit</h4>
                  <p className="text-[10px] text-gray-500">Limit number of submission attempts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.programmingConfig.attemptLimitEnabled}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    programmingConfig: {
                      ...prev.programmingConfig,
                      attemptLimitEnabled: e.target.checked,
                      submissionAttempts: e.target.checked ? prev.programmingConfig.submissionAttempts : 1
                    }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {formData.programmingConfig.attemptLimitEnabled && (
              <div className="animate-in slide-in-from-top-1">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-700 mb-1 ml-0.5">
                      Number of Attempts Allowed
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.programmingConfig.submissionAttempts}
                        onChange={(e) => {
                          const attempts = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
                          setFormData(prev => ({
                            ...prev,
                            programmingConfig: {
                              ...prev.programmingConfig,
                              submissionAttempts: attempts
                            }
                          }));
                        }}
                        className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                                   bg-white text-gray-700 placeholder-gray-400
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                                   transition-all duration-200 shadow-sm"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 text-xs">attempts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Question Flow - Only for Programming */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 rounded-lg p-2">
                <ShuffleIcon size={18} className="text-gray-700" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Question Flow</h4>
                <p className="text-xs text-gray-500">Configure question format flow for programming questions</p>
              </div>
            </div>
            <div className="space-y-1.5 pb-2">
              <label className="block text-xs font-medium text-gray-700 mb-1 ml-0.5">
                Question Flow
              </label>

              <div className="relative max-w-xs">
                <button
                  type="button"
                  onClick={() => setIsQuestionFlowOpen(!isQuestionFlowOpen)}
                  className={`
                    w-full flex items-center justify-between
                    px-3 py-2
                    bg-white
                    border border-gray-300
                    rounded-lg
                    text-left text-sm text-gray-800
                    shadow-sm
                    transition-all duration-150 ease-in-out
                    hover:shadow hover:border-purple-300
                    focus:outline-none focus:ring-1 focus:ring-purple-200
                    ${isQuestionFlowOpen ? 'ring-1 ring-purple-200 border-purple-400' : ''}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${formData.programmingConfig.questionFlow === 'freeFlow' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {formData.programmingConfig.questionFlow === 'freeFlow' ?
                        <Shuffle size={14} className="text-blue-600" /> :
                        <Lock size={14} className="text-purple-600" />
                      }
                    </div>
                    <span>{formData.programmingConfig.questionFlow === 'freeFlow' ? 'Free Flow' : 'Controlled Flow'}</span>
                  </div>
                  <span className={`ml-2 flex items-center pointer-events-none transition-transform duration-200 ${isQuestionFlowOpen ? 'rotate-180' : ''}`}>
                    <svg className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>

                {isQuestionFlowOpen && (
                  <div className="absolute z-40 w-full mt-1 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-75">
                    <div className="py-1">
                      {questionFlowOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              programmingConfig: {
                                ...prev.programmingConfig,
                                questionFlow: option.value as 'freeFlow' | 'controlled'
                              }
                            }));
                            setIsQuestionFlowOpen(false);
                          }}
                          className={`
                            w-full text-left block px-3 py-2 text-sm transition-colors duration-100
                            ${formData.programmingConfig.questionFlow === option.value
                              ? 'bg-purple-50 text-purple-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${option.value === 'freeFlow' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                              {option.icon}
                            </div>
                            <span>{option.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render current step
  const renderCurrentStep = () => {
    const currentStepData = steps.find(step => step.id === currentStep);
    if (!currentStepData) return null;

    switch (currentStepData.title) {
      case 'Exercise Type':
        return (
          <div className="flex items-center justify-center font-sans">
            <div className="w-full max-w-6xl bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ">
                {/* MCQ Option */}
                <label className={`group relative flex cursor-pointer flex-col rounded-xl border-2 p-6 transition-all duration-200 ${formData.exerciseType === 'MCQ'
                  ? 'border-blue-500 bg-blue-50/30 shadow-md'
                  : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm'
                  }`}>
                  <input
                    type="radio"
                    name="exercise_type"
                    value="MCQ"
                    checked={formData.exerciseType === 'MCQ'}
                    onChange={() => handleSelectExerciseType('MCQ')}
                    className="sr-only peer"
                  />
                  <div className="flex flex-col items-center text-center">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${formData.exerciseType === 'MCQ'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                      }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-7 w-7">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                    </div>
                    <div className="mt-5">
                      <h3 className={`font-bold text-lg ${formData.exerciseType === 'MCQ' ? 'text-blue-700' : 'text-gray-700 group-hover:text-blue-700'}`}>
                        MCQ Only
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">Multiple Choice Questions only</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className={formData.exerciseType === 'MCQ' ? 'text-blue-600' : 'text-gray-400'} />
                        <span>Simple configuration</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className={formData.exerciseType === 'MCQ' ? 'text-blue-600' : 'text-gray-400'} />
                        <span>Even marks distribution</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className={formData.exerciseType === 'MCQ' ? 'text-blue-600' : 'text-gray-400'} />
                        <span>Quick setup</span>
                      </div>
                    </div>
                  </div>
                  {formData.exerciseType === 'MCQ' && (
                    <div className="absolute right-4 top-4 text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className={`absolute inset-0 rounded-xl border-2 ${formData.exerciseType === 'MCQ' ? 'border-blue-500' : 'border-transparent'}`}></div>
                </label>

                {/* Programming Option */}
                <label className={`group relative flex cursor-pointer flex-col rounded-xl border-2 p-6 transition-all duration-200 ${formData.exerciseType === 'Programming'
                  ? 'border-green-500 bg-green-50/30 shadow-md'
                  : 'border-gray-200 hover:border-green-400 hover:bg-green-50 hover:shadow-sm'
                  }`}>
                  <input
                    type="radio"
                    name="exercise_type"
                    value="Programming"
                    checked={formData.exerciseType === 'Programming'}
                    onChange={() => handleSelectExerciseType('Programming')}
                    className="sr-only peer"
                  />
                  <div className="flex flex-col items-center text-center">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${formData.exerciseType === 'Programming'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-green-100 group-hover:text-green-600'
                      }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-7 w-7">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                      </svg>
                    </div>
                    <div className="mt-5">
                      <h3 className={`font-bold text-lg ${formData.exerciseType === 'Programming' ? 'text-green-700' : 'text-gray-700 group-hover:text-green-700'}`}>
                        Programming Only
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">Coding & Implementation</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className={formData.exerciseType === 'Programming' ? 'text-green-600' : 'text-gray-400'} />
                        <span>Coding exercises only</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className={formData.exerciseType === 'Programming' ? 'text-green-600' : 'text-gray-400'} />
                        <span>Module & language selection</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className={formData.exerciseType === 'Programming' ? 'text-green-600' : 'text-gray-400'} />
                        <span>Advanced scoring options</span>
                      </div>
                    </div>
                  </div>
                  {formData.exerciseType === 'Programming' && (
                    <div className="absolute right-4 top-4 text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className={`absolute inset-0 rounded-xl border-2 ${formData.exerciseType === 'Programming' ? 'border-green-500' : 'border-transparent'}`}></div>
                </label>

                {/* Combined Option */}
                <label className={`group relative flex cursor-pointer flex-col rounded-xl border-2 p-6 transition-all duration-200 ${formData.exerciseType === 'Combined'
                  ? 'border-purple-500 bg-purple-50/30 shadow-md'
                  : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50 hover:shadow-sm'
                  }`}>
                  <input
                    type="radio"
                    name="exercise_type"
                    value="Combined"
                    checked={formData.exerciseType === 'Combined'}
                    onChange={() => handleSelectExerciseType('Combined')}
                    className="sr-only peer"
                  />
                  <div className="flex flex-col items-center text-center">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${formData.exerciseType === 'Combined'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-600 group-hover:bg-purple-100 group-hover:text-purple-600'
                      }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-7 w-7">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                      </svg>
                    </div>
                    <div className="mt-5">
                      <h3 className={`font-bold text-lg ${formData.exerciseType === 'Combined' ? 'text-purple-700' : 'text-gray-700 group-hover:text-purple-700'}`}>
                        Combined
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">MCQ + Programming</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className={formData.exerciseType === 'Combined' ? 'text-purple-600' : 'text-gray-400'} />
                        <span>Mix of MCQ and Programming</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className={formData.exerciseType === 'Combined' ? 'text-purple-600' : 'text-gray-400'} />
                        <span>Independent configuration</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                        <Check size={12} className={formData.exerciseType === 'Combined' ? 'text-purple-600' : 'text-gray-400'} />
                        <span>Separate scoring for each section</span>
                      </div>
                    </div>
                  </div>
                  {formData.exerciseType === 'Combined' && (
                    <div className="absolute right-4 top-4 text-purple-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className={`absolute inset-0 rounded-xl border-2 ${formData.exerciseType === 'Combined' ? 'border-purple-500' : 'border-transparent'}`}></div>
                </label>
              </div>
            </div>
          </div>
        );

      case 'Module':
        if (formData.exerciseType !== 'Programming' && formData.exerciseType !== 'Combined') return null;

        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="inline-block">
              <div className="relative w-[180px]">
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className={`
                    w-full px-4 py-2.5 text-sm rounded-lg border bg-white 
                    flex items-center justify-between text-left
                    transition-all duration-200 shadow-sm outline-none
                    ${isOpen
                      ? 'border-blue-400 ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <span className={formData.selectedModule ? "text-gray-700" : "text-gray-400"}>
                    {formData.selectedModule || "Select Module"}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl">
                    <ul className="py-1">
                      {['Core Programming', 'Frontend', 'Database'].map((option) => (
                        <li
                          key={option}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              selectedModule: option,
                              selectedLanguages: []
                            }));
                            setIsOpen(false);
                          }}
                          className={`
                            px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between
                            ${formData.selectedModule === option
                              ? 'bg-blue-50 text-blue-600 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                            }
                          `}
                        >
                          {option}
                          {formData.selectedModule === option && (
                            <span className="text-blue-500 text-lg">✓</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {formData.selectedModule && (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase text-slate-500">Programming Languages</h4>
                  <button
                    type="button"
                    onClick={toggleAllLanguages}
                    className="text-[10px] font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                  >
                    {moduleLanguages[formData.selectedModule]?.every(lang => formData.selectedLanguages.includes(lang.name)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {moduleLanguages[formData.selectedModule]?.map(language => {
                    const isSelected = formData.selectedLanguages.includes(language.name);
                    return (
                      <div
                        key={language.name}
                        onClick={() => toggleLanguage(language.name)}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-xs font-medium transition-all ${isSelected ? 'bg-white border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                      >
                        <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                          }`}>
                          {isSelected && <Check size={8} className="text-white" />}
                        </div>
                        <div className="w-4 h-4 flex items-center justify-center">
                          <img
                            src={language.icon}
                            alt={language.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                        {language.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'Exercise Details':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Exercise ID</label>
                <input
                  type="text"
                  value={formData.exerciseId}
                  onChange={(e) => setFormData(prev => ({ ...prev, exerciseId: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                             bg-white text-gray-700 placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                             transition-all duration-200 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Exercise Name</label>
                <input
                  type="text"
                  value={formData.exerciseName}
                  onChange={(e) => setFormData(prev => ({ ...prev, exerciseName: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                             bg-white text-gray-700 placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                             transition-all duration-200 shadow-sm"
                  placeholder="e.g. Array Logic"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 text-sm rounded-lg border border-gray-200 
                           bg-white text-gray-700 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                           transition-all duration-200 shadow-sm h-32 resize-none"
                placeholder="Brief description of the exercise..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4 ">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Difficulty Level</label>
                <div className="flex p-1 bg-gray-100 rounded-lg">
                  {(['beginner', 'intermediate', 'expert'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, exerciseLevel: level }))}
                      className={`flex-1 py-1.5 text-[10px] sm:text-xs font-medium rounded transition-all ${formData.exerciseLevel === level ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                        }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 mt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600">Total Duration</label>
                  <span className="text-[10px] text-gray-400 font-medium">in minutes</span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    value={formData.totalDuration}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      totalDuration: Math.max(1, parseInt(e.target.value) || 1)
                    }))}
                    className="w-full px-4 py-2.5 pl-4 pr-16 text-sm rounded-lg border border-gray-200 
                               bg-white text-gray-700 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                               transition-all duration-200 shadow-sm"
                    placeholder="Enter duration in minutes"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <span className="text-sm text-gray-500">minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Question Configuration':
        const { mcqTotal, programmingTotal, total } = getTotalMarks();

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* For Combined Mode - Show both configurations directly */}
            {formData.exerciseType === 'Combined' && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <h3 className="text-sm font-semibold text-gray-900">Combined Exercise Configuration</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Configure both MCQ and Programming sections for your combined exercise
                </p>
              </>
            )}

            {/* Show MCQ Configuration for MCQ or Combined */}
            {(formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') && renderMCQConfiguration()}

            {/* Show Programming Configuration for Programming or Combined */}
            {(formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') && renderProgrammingConfiguration()}

            {/* Total Marks Summary */}
            <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Total Marks Summary</h4>
                  <p className="text-xs text-gray-500">Calculated based on configuration</p>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {total} marks
                </div>
              </div>

              {formData.exerciseType === 'Combined' && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">MCQ Section:</span>
                    <span className="font-medium">{mcqTotal} marks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Programming Section:</span>
                    <span className="font-medium">{programmingTotal} marks</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-lg text-blue-700">{total} marks</span>
                    </div>
                  </div>
                </div>
              )}

              {formData.exerciseType === 'MCQ' && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">MCQ Questions:</span>
                    <span className="font-medium">{formData.mcqConfig.generalQuestionCount} questions</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Marks per question:</span>
                    <span className="font-medium">{formData.mcqConfig.scoreSettings.evenMarks} marks</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-lg text-blue-700">{mcqTotal} marks</span>
                    </div>
                  </div>
                </div>
              )}

              {formData.exerciseType === 'Programming' && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total Questions:</span>
                    <span className="font-medium">{getProgrammingTotalQuestions()} questions</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Total Marks:</span>
                      <span className="font-bold text-lg text-blue-700">{programmingTotal} marks</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'Schedule':
        const calculateDaysBetween = (startDateTime: string, endDateTime: string): number => {
          const start = new Date(startDateTime);
          const end = new Date(endDateTime);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        };

        const gracePeriodDays = formData.gracePeriodEnabled
          ? calculateDaysBetween(formData.endDateTime, formData.gracePeriodDateTime)
          : 0;

        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Start Date & Time</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={formData.startDateTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))}
                    className="w-full px-4 py-2.5 pl-10 text-sm rounded-lg border border-gray-200 
                               bg-white text-gray-700 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                               transition-all duration-200 shadow-sm"
                  />
                  <Calendar size={14} className="absolute left-3 top-3 text-gray-500" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">End Date & Time</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={formData.endDateTime}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      endDateTime: e.target.value,
                      gracePeriodDateTime: formData.gracePeriodEnabled
                        ? new Date(new Date(e.target.value).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                        : prev.gracePeriodDateTime
                    }))}
                    min={formData.startDateTime}
                    className="w-full px-4 py-2.5 pl-10 text-sm rounded-lg border border-gray-200 
                               bg-white text-gray-700 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                               transition-all duration-200 shadow-sm"
                  />
                  <Calendar size={14} className="absolute left-3 top-3 text-gray-500" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-purple-600" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Grace Period</h4>
                    <p className="text-[10px] text-gray-500">Allow late submissions after end date</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.gracePeriodEnabled}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      gracePeriodEnabled: e.target.checked,
                      gracePeriodDateTime: e.target.checked
                        ? new Date(new Date(prev.endDateTime).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                        : prev.gracePeriodDateTime
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {formData.gracePeriodEnabled && (
                <div className="animate-in slide-in-from-top-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">
                      Grace Period Deadline
                    </label>
                    {gracePeriodDays > 0 && (
                      <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {gracePeriodDays} day{gracePeriodDays !== 1 ? 's' : ''} after end date
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="datetime-local"
                      value={formData.gracePeriodDateTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, gracePeriodDateTime: e.target.value }))}
                      min={formData.endDateTime}
                      className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-gray-200 
                                 bg-white text-gray-700 placeholder-gray-400
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                                 transition-all duration-200 shadow-sm"
                    />
                    <div className="text-xs text-gray-500 min-w-[100px]">
                      {gracePeriodDays > 0 ? (
                        <span className="text-purple-600 font-medium">
                          +{gracePeriodDays} day{gracePeriodDays !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">Same as end date</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'Final':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-yellow-600" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">Grade Sheet</h4>
                    <p className="text-[10px] text-gray-500">Provide detailed grade sheet to users</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer w-12 h-6">
                  <input
                    type="checkbox"
                    checked={formData.gradeSheet}
                    onChange={(e) => setFormData(prev => ({ ...prev, gradeSheet: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-checked:bg-yellow-500 rounded-full transition-colors duration-200">
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${formData.gradeSheet ? 'translate-x-6' : ''}`}></div>
                  </div>
                </label>
              </div>

              <div className="p-3">
                <div className="text-[10px] text-gray-500">
                  Enable to provide detailed grade sheet to users after submission, including scores, correct answers, and performance analysis.
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-blue-600" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">Notifications</h4>
                    <p className="text-[10px] text-gray-500">Send notifications to users</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer w-12 h-6">
                  <input
                    type="checkbox"
                    checked={formData.notifyUsers}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      notifyUsers: e.target.checked,
                      notifyGmail: e.target.checked ? prev.notifyGmail : false,
                      notifyWhatsApp: e.target.checked ? prev.notifyWhatsApp : false
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-checked:bg-blue-600 rounded-full peer-focus:outline-none transition-colors duration-200">
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${formData.notifyUsers ? 'translate-x-6' : ''}`}></div>
                  </div>
                </label>
              </div>

              <div className={`p-3 space-y-2 transition-all duration-200 ${formData.notifyUsers ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="text-[10px] text-gray-500 mb-2 px-1">Select notification channels:</div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <Mail size={16} className="text-red-500" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-700">Email Notifications</div>
                      <div className="text-[10px] text-gray-500">Send notifications via Gmail</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer w-12 h-6">
                    <input
                      type="checkbox"
                      checked={formData.notifyGmail}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notifyGmail: e.target.checked
                      }))}
                      disabled={!formData.notifyUsers}
                      className="sr-only peer"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${formData.notifyUsers ? 'cursor-pointer' : 'cursor-not-allowed'} ${formData.notifyGmail ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${formData.notifyGmail ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <MessageCircle size={16} className="text-green-500" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-700">WhatsApp Notifications</div>
                      <div className="text-[10px] text-gray-500">Send notifications via WhatsApp</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer w-12 h-6">
                    <input
                      type="checkbox"
                      checked={formData.notifyWhatsApp}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notifyWhatsApp: e.target.checked
                      }))}
                      disabled={!formData.notifyUsers}
                      className="sr-only peer"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${formData.notifyUsers ? 'cursor-pointer' : 'cursor-not-allowed'} ${formData.notifyWhatsApp ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${formData.notifyWhatsApp ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get question summary for modal
  const getQuestionSummary = () => {
    let summary = [];

    if (formData.exerciseType === 'MCQ' || formData.exerciseType === 'Combined') {
      summary.push(`MCQ: ${formData.mcqConfig.generalQuestionCount} questions`);
    }

    if (formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') {
      if (formData.programmingConfig.questionConfigType === 'general') {
        summary.push(`Programming: ${formData.programmingConfig.generalQuestionCount} questions`);
      } else {
        const counts = formData.programmingConfig.questionConfigType === 'selectionLevel'
          ? formData.programmingConfig.selectionLevelCounts
          : formData.programmingConfig.levelBasedCounts;
        const total = counts.easy + counts.medium + counts.hard;
        const parts = [];
        if (counts.easy > 0) parts.push(`${counts.easy} Easy`);
        if (counts.medium > 0) parts.push(`${counts.medium} Medium`);
        if (counts.hard > 0) parts.push(`${counts.hard} Hard`);
        summary.push(`Programming: ${total} total (${parts.join(', ')})`);
      }
    }

    return summary.join(' | ');
  };

  // Get notification summary for modal
  const getNotificationSummary = () => {
    if (!formData.notifyUsers) return 'Disabled';
    const channels = [];
    if (formData.notifyGmail) channels.push('Gmail');
    if (formData.notifyWhatsApp) channels.push('WhatsApp');
    return channels.length > 0 ? channels.join(' & ') : 'Enabled (No channel selected)';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] md:h-[96vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1 rounded ${isEditing ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                {isEditing ? (
                  <Settings2 size={12} className={isEditing ? 'text-yellow-600' : 'text-blue-600'} />
                ) : (
                  <FileCode size={12} className="text-blue-600" />
                )}
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-xs text-gray-900 truncate">
                  {isEditing ? 'Edit Exercise' : 'New Exercise'} • {nodeName}
                </h2>
                <div className="flex items-center gap-1 text-[9px] text-gray-500 mt-0.5 overflow-hidden">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.type}>
                      {index > 0 && <span className="text-gray-300">›</span>}
                      <span className="truncate">
                        <span className="font-medium">{crumb.type.charAt(0)}:</span>
                        <span className="ml-0.5">{crumb.name}</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-0.5 hover:bg-gray-100 rounded flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-50 border-r border-slate-200 hidden md:flex flex-col">
            <div className="p-6 overflow-y-auto h-full">
              <div className="relative pl-2">
                <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-slate-200" />
                <div className="space-y-6">
                  {steps.map((step) => (
                    <div key={step.id}>
                      <div
                        className={`relative flex items-center gap-4 z-10 transition-all duration-300 p-2 rounded-xl border border-transparent
                          ${step.active
                            ? 'bg-white shadow-sm border-slate-100 -ml-2 pl-4'
                            : 'hover:bg-slate-100/50'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 bg-white
                          ${step.active
                            ? 'border-blue-600 ring-4 ring-blue-50 scale-110'
                            : step.completed
                              ? 'border-green-500 bg-green-50'
                              : 'border-slate-300'
                          }`}
                        >
                          {step.completed && <Check size={14} className="text-green-600" />}
                          {step.active && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />}
                          {!step.completed && !step.active && <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                        </div>

                        <div className={`transition-opacity ${step.active ? 'opacity-100' : 'opacity-70'}`}>
                          <h4 className={`text-sm font-bold ${step.active ? 'text-slate-800' : 'text-slate-500'}`}>
                            {step.title}
                          </h4>
                          <p className="text-xs text-slate-400 font-medium">{step.subtitle}</p>
                        </div>
                      </div>

                      {/* Sub-items for Question Configuration */}
                      {step.title === 'Question Configuration' && step.subItems && step.subItems.length > 0 && step.active && (
                        <div className="ml-10 mt-2 space-y-1 animate-in fade-in slide-in-from-top-2">
                          {step.subItems.map((subItem) => (
                            <div
                              key={subItem.id}
                              className={`flex items-center gap-2 text-xs p-2 rounded-lg transition-all ${subItem.active
                                ? 'text-blue-600 font-semibold'
                                : 'text-gray-400'
                                }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${subItem.active ? 'bg-blue-500' : 'bg-gray-300'}`} />
                              {subItem.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-white relative">
            {/* Scrollable Area */}
            <div className="flex-1 overflow-hidden mt-1 mx-5">
              <div className="max-w-5xl mx-auto h-full overflow-y-auto p-4">
                <div className="mb-5">
                  <h1 className="text-xl font-bold text-gray-900">
                    {steps.find(step => step.id === currentStep)?.title || 'Exercise Settings'}
                  </h1>
                  <p className="text-xs text-gray-500">
                    {steps.find(step => step.id === currentStep)?.subtitle || 'Configure exercise settings'}
                  </p>
                </div>
                <div className="pb-8 mt-3">
                  {renderCurrentStep()}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex items-center justify-between z-20 shadow-sm">
              <button
                onClick={handleBack}
                disabled={currentStep === 1 || isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs transition-all ${currentStep === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <ArrowLeft size={14} />
                Back
              </button>

              <div className="flex items-center gap-3">
                {currentStep === steps.length && (
                  <button
                    type="button"
                    onClick={() => setShowSummaryModal(true)}
                    className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Configuration Summary"
                  >
                    <Eye size={18} />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  disabled={isLoading || !validateCurrentStep()}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-xs shadow-sm transition-all active:scale-95 ${validateCurrentStep()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : currentStep === steps.length ? (
                    'Create Exercise'
                  ) : (
                    <>
                      Next
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Modal */}
        {showSummaryModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Configuration Summary</h3>
                </div>
                <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">General Information</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">Exercise Type</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formData.exerciseType === 'MCQ' ? 'MCQ Only' :
                            formData.exerciseType === 'Programming' ? 'Programming Only' : 'Combined (MCQ + Programming)'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">Duration</div>
                        <div className="text-sm font-semibold text-gray-900">{formData.totalDuration} minutes</div>
                      </div>
                      {(formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') && (
                        <>
                          <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Module</div>
                            <div className="text-sm font-semibold text-gray-900 truncate">{formData.selectedModule || 'Not selected'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">Languages</div>
                            <div className="text-sm font-semibold text-gray-900">{formData.selectedLanguages.join(', ') || 'None selected'}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Configuration Settings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">Question Config</div>
                        <div className="text-sm font-semibold text-gray-900">{getQuestionSummary()}</div>
                      </div>
                      {(formData.exerciseType === 'Programming' || formData.exerciseType === 'Combined') && (
                        <div>
                          <div className="text-[10px] text-gray-500 mb-0.5">Question Flow</div>
                          <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                            {formData.programmingConfig.questionFlow === 'freeFlow' ? (
                              <>
                                <Shuffle size={14} className="text-blue-500" />
                                Free Flow
                              </>
                            ) : (
                              <>
                                <Lock size={14} className="text-purple-500" />
                                Controlled Flow
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">Total Marks</div>
                        <div className="text-sm font-semibold text-gray-900">{getTotalMarks().total} marks</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">Grade Sheet</div>
                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Award size={14} className={formData.gradeSheet ? 'text-yellow-500' : 'text-gray-400'} />
                          {formData.gradeSheet ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 mb-0.5">Notifications</div>
                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                          <Bell size={14} className={formData.notifyUsers ? 'text-blue-500' : 'text-gray-400'} />
                          {getNotificationSummary()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-right">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Close Summary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseSettings;