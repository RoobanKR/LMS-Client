import React, { useState, useEffect, useRef } from 'react';
import { X, Loader } from 'lucide-react';
import { questionApi, QuestionData } from '@/apiServices/question';
import { Question } from '../QuestionsView';
import FrontendQuestionForm from './FrontendQuestionForm';
import DatabaseQuestionForm from './DatabaseQuestionForm';
import ProgrammingQuestionForm from './ProgrammingQuestionForm';

interface AddQuestionFormProps {
  exerciseData: {
    exerciseId: string;
    exerciseName: string;
    exerciseLevel: string;
    selectedLanguages: string[];
    evaluationSettings?: {
      practiceMode: boolean;
      manualEvaluation?: {
        enabled: boolean;
        submissionNeeded?: boolean;
      };
      aiEvaluation: boolean;
      automationEvaluation: boolean;
    };
    nodeId: string;
    nodeName: string;
    subcategory: string;
    nodeType: string;
    fullExerciseData: {
      exerciseInformation: any;
      programmingSettings: {
        selectedLanguages: string[];
        levelConfiguration: any;
        selectedModule: string;
      };
      evaluationSettings: any;
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
    };
  };
  tabType: string;
  initialData?: Question;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (questionData: any) => void;
}

const AddQuestionForm: React.FC<AddQuestionFormProps> = ({
  exerciseData,
  tabType,
  initialData,
  isEditing = false,
  onClose,
  onSave
}) => {
  // Debug: Log the exercise data
  useEffect(() => {
    console.log('📋 Exercise Data Received in AddQuestionForm:', exerciseData);
    console.log('📋 Exercise ID:', exerciseData.exerciseId);
  }, [exerciseData]);

  // Determine module type
  const selectedModule = exerciseData.fullExerciseData?.programmingSettings?.selectedModule?.toLowerCase();
  console.log(exerciseData.fullExerciseData);
  
  const isFrontendModule = selectedModule === 'frontend';
  const isDatabaseModule = ['mysql', 'sqlite', 'postgresql', 'mongodb', 'database'].includes(selectedModule || '');
  const isProgrammingModule = !isFrontendModule && !isDatabaseModule;

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

  // Helper functions
  const getModuleTypeLabel = () => {
    if (isFrontendModule) return 'Frontend';
    if (isDatabaseModule) return 'Database';
    if (isProgrammingModule) return 'Programming';
    return 'General';
  };

  const getEvaluationModeLabel = () => {
    if (!exerciseData.evaluationSettings) return 'Not specified';
    
    if (exerciseData.evaluationSettings.practiceMode) return 'Practice Mode';
    if (exerciseData.evaluationSettings.automationEvaluation) return 'Automated Evaluation';
    if (exerciseData.evaluationSettings.manualEvaluation?.enabled) return 'Manual Evaluation';
    if (exerciseData.evaluationSettings.aiEvaluation) return 'AI Evaluation';
    
    return 'Not specified';
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
    if (isFrontendModule) {
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