import React, { useState, useEffect, useRef } from 'react';
import { X, Loader, Code, ListChecks, ChevronRight, Check, Info } from 'lucide-react';
import { questionApi, QuestionData } from '@/apiServices/question';
import { Question } from '../QuestionsView';
import FrontendQuestionForm from './FrontendQuestionForm';
import DatabaseQuestionForm from './DatabaseQuestionForm';
import ProgrammingQuestionForm from './ProgrammingQuestionForm';
import MCQQuestionForm from './MCQQuestionForm';

interface AddQuestionFormProps {
  exerciseData: {
    exerciseId: string;
    exerciseName: string;
    exerciseLevel: string;
    selectedLanguages: string[];
    nodeId: string;
    nodeName: string;
    subcategory: string;
    nodeType: string;
    fullExerciseData: {
      exerciseInformation: any;
      programmingSettings?: {
        selectedLanguages: string[];
        levelConfiguration: any;
        selectedModule: string;
      };
      availabilityPeriod: any;
      compilerSettings: any;
      questionBehavior: any;
      groupSettings: any;
      scoreSettings?: {
        scoreType: string;
        separateMarks?: {
          levelBased?: {
            easy: number[];
            medium: number[];
            hard: number[];
          };
          general?: number[];
        };
        levelBasedMarks?: {
          easy: number;
          medium: number;
          hard: number;
        };
        evenMarks?: number;
        totalMarks?: number;
      };
      createdAt: string;
      updatedAt: string;
      exerciseType?: string;
      configurationType?: {
        mcqMode?: boolean;
        programmingMode?: boolean;
        combinedMode?: boolean;
        _id?: string;
      };
    };
  };
  tabType: string;
  initialData?: Question;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (questionData: any) => void;
}

const AddQuestionForm: React.FC<AddQuestionFormProps> = ({
  breadcrumbs,
  exerciseData,
  tabType,
  initialData,
  isEditing = false,
  onClose,
  onSave
}) => {
  // State for combined exercise type selection
  const [selectedQuestionType, setSelectedQuestionType] = useState<'mcq' | 'programming' | null>(null);
  console.log(breadcrumbs)
  // Debug: Log the exercise data
  useEffect(() => {
    console.log('📋 Exercise Data Received in AddQuestionForm:', exerciseData);
    console.log('📋 Exercise ID:', exerciseData.exerciseId);
    console.log('📋 Exercise Type:', exerciseData.fullExerciseData?.exerciseType);
    console.log('📋 Configuration Type:', exerciseData.fullExerciseData?.configurationType);
    console.log('📋 Selected Module:', exerciseData.fullExerciseData?.programmingSettings?.selectedModule);
    console.log('📋 Selected Languages:', exerciseData.fullExerciseData?.programmingSettings?.selectedLanguages);
  }, [exerciseData]);

  // Check if this is a combined exercise
  const isCombinedExercise = exerciseData.fullExerciseData?.exerciseType?.toLowerCase() === 'combined' || 
                             exerciseData.fullExerciseData?.configurationType?.combinedMode === true;

  // Determine module type - handle all exercise types
  const getModuleType = () => {
    const exerciseType = exerciseData.fullExerciseData?.exerciseType?.toLowerCase();
    const configurationType = exerciseData.fullExerciseData?.configurationType;
    const selectedModule = exerciseData.fullExerciseData?.programmingSettings?.selectedModule?.toLowerCase();
    
    console.log('🔍 Determining module type:', { 
      exerciseType, 
      configurationType,
      selectedModule 
    });
    
    // If combined exercise and user has selected type
    if (isCombinedExercise && selectedQuestionType) {
      console.log('✅ Determined:', selectedQuestionType === 'mcq' ? 'MCQ' : 'Programming', '(from combined exercise selection)');
      return selectedQuestionType;
    }
    
    // First, check if it's MCQ (from exerciseType or configurationType)
    if (exerciseType === 'mcq' || configurationType?.mcqMode === true) {
      console.log('✅ Determined: MCQ (from exerciseType or configurationType)');
      return 'mcq';
    }
    
    // For programming/frontend/database exercises, prioritize selectedModule
    // Priority 1: Check selectedModule (most specific)
    if (selectedModule === 'frontend') {
      console.log('✅ Determined: Frontend module (from selectedModule)');
      return 'frontend';
    } else if (['mysql', 'sqlite', 'postgresql', 'mongodb', 'database'].includes(selectedModule || '')) {
      console.log('✅ Determined: Database module (from selectedModule)');
      return 'database';
    } else if (selectedModule) {
      // Any other selectedModule value (Core Programming, Java, Python, etc.)
      console.log('✅ Determined: Programming module (from selectedModule)');
      return 'programming';
    }
    
    // Priority 2: Check exerciseType if selectedModule is not available
    if (exerciseType === 'frontend') {
      console.log('✅ Determined: Frontend module (from exerciseType)');
      return 'frontend';
    } else if (exerciseType === 'database') {
      console.log('✅ Determined: Database module (from exerciseType)');
      return 'database';
    } else if (exerciseType === 'programming') {
      console.log('✅ Determined: Programming module (from exerciseType)');
      return 'programming';
    }
    
    // Default fallback
    console.log('✅ Determined: Programming module (default)');
    return 'programming';
  };

  const moduleType = getModuleType();
  console.log('🎯 Final module type:', moduleType);
  
  const isFrontendModule = moduleType === 'frontend';
  const isDatabaseModule = moduleType === 'database';
  const isProgrammingModule = moduleType === 'programming';
  const isMCQModule = moduleType === 'mcq';

  const nodeType = exerciseData.nodeType;
  const nodeId = exerciseData.nodeId;

  // State for loading
  const [loadingInitialData, setLoadingInitialData] = useState(false);
  const [showGlobalLoading, setShowGlobalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');

  // Save timeout ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Component for selecting question type in combined exercises
const QuestionTypeSelector: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Select Question Type</h2>
              <p className="text-gray-600 text-sm mt-1">Choose the type of question to create</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
            </button>
          </div>
        </div>

        {/* Question Type Options */}
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {/* MCQ Option */}
            <button
              onClick={() => setSelectedQuestionType('mcq')}
              className="group relative p-4 border-2 border-gray-200 hover:border-blue-500 hover:shadow-md rounded-xl w-full text-left transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
              role="button"
              aria-label="Select Multiple Choice Question"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors flex-shrink-0">
                  <ListChecks className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Multiple Choice (MCQ)</h3>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    Create questions with multiple answer options
                  </p>
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Check className="h-3 w-3 mr-1" /> Knowledge Assessment
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Programming Option */}
            <button
              onClick={() => setSelectedQuestionType('programming')}
              className="group relative p-4 border-2 border-gray-200 hover:border-green-500 hover:shadow-md rounded-xl w-full text-left transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-500"
              role="button"
              aria-label="Select Programming Question"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors flex-shrink-0">
                  <Code className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Programming Question</h3>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                  <p className="text-gray-600 text-sm mt-1">
                    Create coding problems with test cases and execution
                  </p>
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Code className="h-3 w-3 mr-1" /> Practical Skills
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Information Section */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="text-sm">
              <div className="flex items-center gap-2 text-gray-700 mb-3">
                <Info className="h-4 w-4 text-gray-400" />
                <p className="font-medium">Exercise Configuration</p>
              </div>
              
              <p className="text-gray-600 mb-4 text-sm">
                This exercise supports both question types. You can add multiple questions of each type.
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-sm">MCQ Mode</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-green-600 font-medium">Enabled</span>
                    <Check className="h-3 w-3 ml-1 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="font-medium text-sm">Programming Mode</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-green-600 font-medium">Enabled</span>
                    <Check className="h-3 w-3 ml-1 text-green-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  // Loading state UI
  if (loadingInitialData && isEditing) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <div className="flex items-center gap-3">
            <Loader className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading question data...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show question type selector for combined exercises
  if (isCombinedExercise && !selectedQuestionType && !isEditing) {
    return <QuestionTypeSelector />;
  }

  // Helper functions
  const getModuleTypeLabel = () => {
    if (isFrontendModule) return 'Frontend';
    if (isDatabaseModule) return 'Database';
    if (isProgrammingModule) return 'Programming';
    if (isMCQModule) return 'MCQ';
    return 'General';
  };

  // Handle form submission
  const handleSubmit = async (questionData: any) => {
    setIsSaving(true);
    setShowGlobalLoading(true);
    setSaveMessage(isEditing ? 'Updating question...' : 'Saving question...');
    setSaveProgress(0);

    try {
      setSaveProgress(30);

      // Get entity type
      const getEntityType = (nodeType: string): 'modules' | 'submodules' | 'topics' | 'subtopics' => {
        const normalized = nodeType.toLowerCase().trim();
        const mapping: Record<string, 'modules' | 'submodules' | 'topics' | 'subtopics'> = {
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
      setSaveProgress(50);

      let savedQuestion;
      
      if (isEditing && initialData?._id) {
        // Update existing question
        savedQuestion = await questionApi.updateQuestion(
          entityType,
          nodeId,
          exerciseData.exerciseId,
          initialData._id,
          questionData,
          tabType,
          exerciseData.subcategory || 'Practical'
        );
        setSaveMessage('Question updated!');
      } else {
        // Add new question
        savedQuestion = await questionApi.addQuestion(
          entityType,
          nodeId,
          exerciseData.exerciseId,
          questionData,
          tabType,
          exerciseData.subcategory || 'Practical'
        );
        setSaveMessage('Question created!');
      }

      setSaveProgress(90);

      if (savedQuestion) {
        const questionResult = savedQuestion.question ||
          savedQuestion.data?.question ||
          savedQuestion.data ||
          savedQuestion;

        // Close after delay
        saveTimeoutRef.current = setTimeout(() => {
          onSave({
            ...questionResult,
            exerciseId: exerciseData.exerciseId,
            exerciseName: exerciseData.exerciseName,
            moduleType: getModuleTypeLabel(),
            savedAt: new Date().toISOString()
          });
          onClose();
        }, 1500);
      }

      setSaveProgress(100);
    } catch (error) {
      console.error('❌ Failed to save/update question:', error);
      setIsSaving(false);
      setShowGlobalLoading(false);
      alert(`Failed to ${isEditing ? 'update' : 'save'} question: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setTimeout(() => {
        if (isSaving) {
          setIsSaving(false);
          setShowGlobalLoading(false);
        }
      }, 1000);
    }
  };

  // Render the appropriate form component based on module type
  const renderFormComponent = () => {
    if (isMCQModule) {
      return (
        <MCQQuestionForm
          breadcrumbs={breadcrumbs}
          exerciseData={exerciseData}
          tabType={tabType}
          initialData={initialData}
          isEditing={isEditing}
          onClose={onClose}
          onSave={handleSubmit}
          isSaving={isSaving}
          saveProgress={saveProgress}
          saveMessage={saveMessage}
        />
      );
    } else if (isFrontendModule) {
      return (
        <FrontendQuestionForm
          exerciseData={exerciseData}
          tabType={tabType}
          initialData={initialData}
          isEditing={isEditing}
          onClose={onClose}
          onSave={handleSubmit}
          isSaving={isSaving}
          saveProgress={saveProgress}
          saveMessage={saveMessage}
        />
      );
    } else if (isDatabaseModule) {
      return (
        <DatabaseQuestionForm
          exerciseData={exerciseData}
          tabType={tabType}
          initialData={initialData}
          isEditing={isEditing}
          onClose={onClose}
          onSave={handleSubmit}
          isSaving={isSaving}
          saveProgress={saveProgress}
          saveMessage={saveMessage}
        />
      );
    } else {
      return (
        <ProgrammingQuestionForm
          exerciseData={exerciseData}
          tabType={tabType}
          initialData={initialData}
          isEditing={isEditing}
          onClose={onClose}
          onSave={handleSubmit}
          isSaving={isSaving}
          saveProgress={saveProgress}
          saveMessage={saveMessage}
        />
      );
    }
  };

  return (
    <>
      {/* Global loading overlay */}
      {showGlobalLoading && (
        <div className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white/95 p-6 rounded-xl shadow-2xl border border-gray-200 max-w-sm mx-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${saveProgress}%` }}
                ></div>
              </div>
              
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">Saving Question</h3>
                <p className="text-sm text-gray-600 mt-1">{saveMessage}</p>
                <p className="text-xs text-gray-500 mt-2">{saveProgress}% complete</p>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Render the appropriate form */}
      {renderFormComponent()}
    </>
  );
};

export default AddQuestionForm;