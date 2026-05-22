// CombinedExerciseMixed.tsx - ONLY ADD RIGHT SIDEBAR WITH FLAG, KEEP EVERYTHING ELSE
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Loader2, CheckCircle, ArrowLeft, FileText, Code, XCircle, Monitor, Database,
  Flag, X, ChevronLeft, ChevronRight, BookOpen, GraduationCap, Home,
  Layers, Hash, File, Folder, Clock, Check, AlertCircle, Target,
  Video, Presentation, Archive, Link, Filter, ChevronDown, ChevronUp,
  HelpCircle, Info, Settings2, Menu
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import dynamic from 'next/dynamic';

// Dynamically import components - KEEP EXISTING
const MCQQuestion = dynamic(() => import('./mcq'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  )
});

const ProgrammingQuestion = dynamic(() => import('./program-section'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  )
});

const FrontendQuestion = dynamic(() => import('./frontend'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  )
});

const SqlEditor = dynamic(() => import('./sql'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  )
});

// --- Question Status Sidebar Component (exactly like MCQ) ---
const QuestionStatusSidebar = ({
  questions,
  currentIndex,
  completedQuestions,
  flaggedQuestions,
  onJumpToQuestion,
  onClose
}: {
  questions: any[];
  currentIndex: number;
  completedQuestions: Set<number>;
  flaggedQuestions: Set<number>;
  onJumpToQuestion: (index: number) => void;
  onClose: () => void;
}) => {
  const getQuestionStatus = (index: number) => {
    const question = questions[index];
    const qType = question._processedType || question.questionType;
    const isCompleted = completedQuestions.has(index);
    const isFlagged = flaggedQuestions.has(index);
    const isCurrent = index === currentIndex;

    if (isCurrent) return 'current';
    if (isCompleted && isFlagged) return 'completed-flagged';
    if (isCompleted) return 'completed';
    if (isFlagged) return 'flagged';
    return 'uncompleted';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'current': 
        return 'bg-blue-100 text-blue-700 font-medium border-l-2 border-blue-500';
      case 'completed': 
        return 'bg-green-100 text-green-700';
      case 'flagged': 
        return 'bg-red-100 text-red-700';
      case 'completed-flagged': 
        return 'bg-orange-100 text-orange-700';
      default: 
        return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check size={12} className="text-green-600" />;
      case 'flagged':
        return <Flag size={12} className="text-red-600" fill="currentColor" />;
      case 'completed-flagged':
        return <Flag size={12} className="text-orange-600" fill="currentColor" />;
      default:
        return null;
    }
  };

  // Get question type icon and color
  const getQuestionTypeInfo = (question: any) => {
    const qType = question._processedType || question.questionType;
    switch (qType) {
      case 'mcq': 
        return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', label: 'MCQ' };
      case 'programming': 
        return { icon: Code, color: 'text-green-500', bg: 'bg-green-50', label: 'Code' };
      case 'frontend': 
        return { icon: Monitor, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Frontend' };
      case 'sql': 
        return { icon: Database, color: 'text-orange-500', bg: 'bg-orange-50', label: 'SQL' };
      default: 
        return { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Question' };
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200 w-80 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-medium text-sm text-gray-900 flex items-center gap-2">
          <Layers size={16} className="text-gray-500" />
          Question Navigator
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Stats Summary */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/50">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-white rounded border border-gray-200">
            <div className="font-semibold text-gray-900">{questions.length}</div>
            <div className="text-gray-500">Total</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded border border-green-200">
            <div className="font-semibold text-green-700">{completedQuestions.size}</div>
            <div className="text-green-600">Completed</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded border border-red-200">
            <div className="font-semibold text-red-700">{flaggedQuestions.size}</div>
            <div className="text-red-600">Flagged</div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {questions.map((question, index) => {
          const status = getQuestionStatus(index);
          const statusStyle = getStatusStyle(status);
          const statusIcon = getStatusIcon(status);
          const typeInfo = getQuestionTypeInfo(question);
          const TypeIcon = typeInfo.icon;

          return (
            <button
              key={index}
              onClick={() => onJumpToQuestion(index)}
              className={`
                w-full flex items-center gap-2 px-3 py-2.5 rounded text-xs transition-all
                ${statusStyle}
              `}
            >
              {/* Question Number */}
              <span className="font-mono font-medium w-6 text-center">
                {index + 1}
              </span>

              {/* Question Type Icon */}
              <div className={`p-1 rounded ${typeInfo.bg}`}>
                <TypeIcon size={12} className={typeInfo.color} />
              </div>

              {/* Question Title (truncated) */}
              <span className="flex-1 text-left truncate">
                {question.title || question.questionTitle || `Question ${index + 1}`}
              </span>

              {/* Status Icon */}
              {statusIcon && (
                <span className="flex-shrink-0">
                  {statusIcon}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50 text-xs">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
            <span className="text-gray-600">Flagged</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
            <span className="text-gray-600">Both</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
            <span className="text-gray-600">Current</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Info Tooltip Component ---
const InfoTooltip: React.FC<{ content: string; side?: 'top' | 'right' | 'bottom' | 'left' }> = ({
  content,
  side = 'top'
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block ml-1 align-middle">
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors cursor-help"
        aria-label="Information"
      >
        <Info size={12} />
      </span>
      {showTooltip && (
        <div className={`absolute z-50 w-48 p-2 text-xs bg-gray-900 text-white rounded shadow-xl leading-relaxed transition-opacity duration-200 ${side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}>
          {content}
          <div className={`absolute ${side === 'top' ? 'top-full left-2 border-4 border-transparent border-t-gray-900' : 'bottom-full left-2 border-4 border-transparent border-b-gray-900'
            }`} />
        </div>
      )}
    </div>
  );
};

const CombinedExerciseMixed = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State - KEEP ALL EXISTING STATE
  const [exerciseData, setExerciseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, any>>({});
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);

  // NEW: State for flagged questions and sidebar
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [showSidebar, setShowSidebar] = useState(false);

  // Get URL parameters
  const exerciseId = searchParams.get('exerciseId') || '';
  const courseId = searchParams.get('courseId') || '';
  const category = searchParams.get('category') || '';
  const subcategory = searchParams.get('subcategory') || '';
  const nodeId = searchParams.get('nodeId') || '';
  const nodeName = searchParams.get('nodeName') || '';
  const nodeType = searchParams.get('nodeType') || 'exercise';
  const studentId = searchParams.get('studentId') || '';
  const moduleName = searchParams.get('moduleName') || ''; // Added for breadcrumb

  // Helper function to determine if question should be treated as frontend
  const isFrontendModule = () => {
    return exerciseData?.programmingSettings?.selectedModule === 'Frontend';
  };

  // Helper to get actual question type
  const getQuestionType = (question: any) => {
    // If module is Frontend and question is programming type, treat it as frontend
    if (isFrontendModule() && question.questionType === 'programming') {
      return 'frontend';
    }

    // Check if it's SQL programming
    if (question.questionType === 'programming' && question.solutions?.language === 'sql') {
      return 'sql';
    }

    return question.questionType;
  };

  // Process questions to set correct type
  const processQuestions = (questions: any[]) => {
    if (!questions || !exerciseData) return questions;

    return questions.map((q: any) => ({
      ...q,
      _processedType: getQuestionType(q)
    }));
  };



  const handleFinalTestSubmission = async () => {
  try {
    const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
    
    // We submit against the LAST question with isTestSubmission=true
    // This is what increments testSubmissions on the exercise record
    const lastQuestion = processedQuestions[processedQuestions.length - 1];
    
    const formData = new FormData();
    formData.append('courseId', courseId);
    formData.append('exerciseId', exerciseId);
    formData.append('questionId', lastQuestion._id);
    formData.append('code', ''); // empty for MCQ-type final trigger
    formData.append('score', '0');
    formData.append('status', 'submitted');
    formData.append('category', category);
    formData.append('subcategory', subcategory);
    formData.append('nodeId', nodeId);
    formData.append('nodeName', nodeName);
    formData.append('nodeType', nodeType);
    formData.append('language', 'text');
    formData.append('isTestSubmission', 'true'); // ← THE KEY FLAG

    const response = await fetch('https://lms-server-ym1q.onrender.com/courses/answers/submit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (response.ok) {
      setIsTestSubmitted(true);
      toast.success('Exercise submitted successfully!');
      setExerciseCompleted(true);
    } else {
      throw new Error('Final submission failed');
    }
  } catch (error) {
    toast.error('Failed to submit exercise. Please try again.');
  }
};

  // Get processed questions
  const processedQuestions = exerciseData ? processQuestions(exerciseData.questions || []) : [];

  // Fetch exercise data - KEEP EXISTING
  useEffect(() => {
    const fetchExerciseData = async () => {
      try {
        setIsLoading(true);
        console.log('📡 Fetching Combined exercise with ID:', exerciseId);

        if (!exerciseId) {
          throw new Error('Exercise ID is required');
        }

        const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';

        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await fetch(`https://lms-server-ym1q.onrender.com/exercise/${exerciseId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ API Response received');

        if (data.message?.[0]?.key === 'success' && data.data?.exercise) {
          const fetchedExercise = data.data.exercise;

          // Verify it's a Combined exercise
          if (fetchedExercise.exerciseType !== 'Combined') {
            throw new Error(`This is not a Combined exercise. Type: ${fetchedExercise.exerciseType}`);
          }

          setExerciseData(fetchedExercise);

          // Load saved flagged questions from localStorage
          const savedFlagged = localStorage.getItem(`combined_flagged_${exerciseId}`);
          if (savedFlagged) {
            try {
              const flaggedSet = new Set(JSON.parse(savedFlagged));
              setFlaggedQuestions(flaggedSet);
            } catch (e) {
              console.error('Error parsing flagged questions:', e);
            }
          }

          console.log('📊 Combined Exercise loaded:', {
            name: fetchedExercise.exerciseInformation?.exerciseName,
            type: fetchedExercise.exerciseType,
            module: fetchedExercise.programmingSettings?.selectedModule,
            totalQuestions: fetchedExercise.questions?.length || 0
          });

        } else {
          throw new Error(data.message?.[0]?.value || 'Failed to load exercise data');
        }
      } catch (error: any) {
        console.error('❌ Error fetching exercise:', error);
        setError(error.message || 'Failed to load exercise from server');
        toast.error(error.message || 'Failed to load exercise');
      } finally {
        setIsLoading(false);
      }
    };

    if (exerciseId) {
      fetchExerciseData();
    } else {
      setError('Exercise ID is missing');
      setIsLoading(false);
    }
  }, [exerciseId]);

  // Save flagged questions to localStorage whenever they change
  useEffect(() => {
    if (exerciseId && flaggedQuestions.size > 0) {
      localStorage.setItem(`combined_flagged_${exerciseId}`, JSON.stringify([...flaggedQuestions]));
    } else if (exerciseId) {
      localStorage.removeItem(`combined_flagged_${exerciseId}`);
    }
  }, [flaggedQuestions, exerciseId]);

  // Handle back navigation - KEEP EXISTING
  const handleBack = () => {
    router.back();
  };

  // Handle next question - KEEP EXISTING
  const handleNextQuestion = () => {
    if (currentQuestionIndex < processedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Last question completed
      setExerciseCompleted(true);
      toast.success('All questions completed!');
    }
  };

  // Handle previous question - KEEP EXISTING
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle jump to question - KEEP EXISTING
  const handleJumpToQuestion = (index: number) => {
    if (index >= 0 && index < processedQuestions.length) {
      setCurrentQuestionIndex(index);
      // Close sidebar on mobile after selection
      if (window.innerWidth < 1024) {
        setShowSidebar(false);
      }
    }
  };

  // NEW: Toggle flag for current question
  const toggleFlag = () => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(currentQuestionIndex)) {
        next.delete(currentQuestionIndex);
        toast.info('Question unmarked for review');
      } else {
        next.add(currentQuestionIndex);
        toast.info('Question marked for review');
      }
      return next;
    });
  };

  // Handle MCQ answer - KEEP EXISTING
  const handleMcqAnswer = (questionId: string, answer: any) => {
    setMcqAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    // Mark as completed
    setCompletedQuestions(prev => new Set([...prev, currentQuestionIndex]));
  };

  // Handle programming completion - KEEP EXISTING
  const handleProgrammingComplete = (questionId: string) => {
    setCompletedQuestions(prev => new Set([...prev, currentQuestionIndex]));
  };

  // Handle frontend completion - KEEP EXISTING
  const handleFrontendComplete = (questionId: string) => {
    setCompletedQuestions(prev => new Set([...prev, currentQuestionIndex]));
  };

  // Handle SQL completion - NEW for SQL
  const handleSqlComplete = (questionId: string, query: string, result: any) => {
    setCompletedQuestions(prev => new Set([...prev, currentQuestionIndex]));
  };

  // Submit current MCQ answer - KEEP EXISTING
  const submitCurrentMcqAnswer = async () => {
    try {
      const currentQuestion = processedQuestions[currentQuestionIndex];
      if (!currentQuestion) return;

      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
      if (!token) return;

      const answer = mcqAnswers[currentQuestion._id];
      if (!answer) {
        toast.error('Please select an answer first');
        return;
      }

      let formData = new FormData();
      formData.append('courseId', courseId);
      formData.append('exerciseId', exerciseId);
      formData.append('questionId', currentQuestion._id);
      formData.append('category', category);
      formData.append('subcategory', subcategory);
      formData.append('nodeId', nodeId);
      formData.append('nodeName', nodeName || exerciseData.exerciseInformation?.exerciseName || 'Combined Exercise');
      formData.append('nodeType', nodeType);
      formData.append('code', answer?.text || '');
      formData.append('score', '0');
      formData.append('status', 'attempted');
      formData.append('language', 'text');

      const response = await fetch('https://lms-server-ym1q.onrender.com/courses/answers/submit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        toast.success('Answer submitted successfully!');
        handleNextQuestion();
      } else {
        throw new Error('Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to save answer');
    }
  };

  // NEW: Submit SQL answer using submit-multiple-files
  const submitSqlAnswer = async (query: string, result: any) => {
    try {
      const currentQuestion = processedQuestions[currentQuestionIndex];
      if (!currentQuestion) return;

      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
      if (!token) {
        toast.error('Please login to submit your answer');
        return;
      }

      if (!query.trim()) {
        toast.warning('Please write a SQL query first');
        return;
      }

      // Prepare the files array for SQL submission
      const files = [{
        id: `sql-file-${Date.now()}`,
        filename: 'query.sql',
        content: query,
        language: 'sql',
        path: '/query.sql',
        folderPath: '/',
        isEntryPoint: true,
        lastModified: new Date().toISOString(),
        size: Buffer.byteLength(query, 'utf8')
      }];

      // Prepare submission payload
      const payload = {
        courseId,
        exerciseId,
        questionId: currentQuestion._id,
        questionTitle: currentQuestion.title || currentQuestion.questionTitle || 'SQL Question',
        exerciseName: exerciseData.exerciseInformation?.exerciseName || 'SQL Exercise',
        category: category || 'We_Do',
        subcategory: subcategory || '',
        selectedProgrammingLanguage: 'sql',
        nodeId: nodeId || "",
        nodeName: nodeName || "",
        nodeType: nodeType || "",
        files: files,
        folders: [],
        status: 'submitted',
        score: 0,
        attemptCount: 1,
        queryResult: result || null,
        studentId: studentId || "unknown_student",
        projectStructure: {
          totalFiles: files.length,
          sqlFiles: files.length,
          entryPoints: files.filter(f => f.isEntryPoint).map(f => f.filename),
          folderCount: 0,
          hasFolders: false,
          fileDistribution: {
            sql: files.length
          }
        }
      };

      console.log('Submitting SQL answer with payload:', {
        fileCount: files.length,
        queryLength: query.length
      });

      const response = await fetch('https://lms-server-ym1q.onrender.com/courses/answers/submit-multiple-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('SQL submission response:', data);

      if (data.success) {
        toast.success('SQL answer submitted successfully!');
        handleSqlComplete(currentQuestion._id, query, result);
        handleNextQuestion();
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (error: any) {
      console.error("Error submitting SQL answer:", error);
      toast.error(error.message || 'Failed to submit SQL answer');
    }
  };

  // Render loading state - KEEP EXISTING
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Combined Exercise...</p>
        </div>
      </div>
    );
  }

  // Render error state - KEEP EXISTING
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Exercise</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors w-full"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check if we have exercise data - KEEP EXISTING
  if (!exerciseData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Exercise Data</h2>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render completion screen - KEEP EXISTING
  if (exerciseCompleted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <ToastContainer position="top-right" />
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Exercise Completed!</h1>
          <p className="text-gray-600 mb-6">
            You have successfully completed all {processedQuestions.length} questions.
          </p>
          <button
            onClick={handleBack}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Return to Course
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = processedQuestions[currentQuestionIndex];
  const totalQuestions = processedQuestions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Get processed question type
  const questionType = currentQuestion?._processedType || currentQuestion?.questionType;
  const isMcqQuestion = questionType === 'mcq';
  const isProgrammingQuestion = questionType === 'programming';
  const isFrontendQuestion = questionType === 'frontend';
  const isSqlQuestion = questionType === 'sql';

  // Get question type icon and color - UPDATED for SQL
  const getQuestionTypeInfo = () => {
    if (isMcqQuestion) {
      return {
        icon: FileText,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        label: 'Multiple Choice'
      };
    } else if (isProgrammingQuestion) {
      return {
        icon: Code,
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        label: 'Programming'
      };
    } else if (isFrontendQuestion) {
      return {
        icon: Monitor,
        color: 'text-purple-500',
        bgColor: 'bg-purple-100',
        label: 'Frontend'
      };
    } else if (isSqlQuestion) {
      return {
        icon: Database,
        color: 'text-orange-500',
        bgColor: 'bg-orange-100',
        label: 'SQL'
      };
    }
    return {
      icon: FileText,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      label: 'Unknown'
    };
  };

  const questionTypeInfo = getQuestionTypeInfo();

  // Module badge
  const moduleType = isFrontendModule() ? 'Frontend' : 'Programming';
  const moduleColor = isFrontendModule() ? 'purple' : 'green';

 // Add this near your other searchParam reads:
const hierarchy = searchParams.get('hierarchy') || '';
const exerciseName = searchParams.get('exerciseName') || '';
const courseName = searchParams.get('courseName') || '';

// Format category label (We_Do → We Do)
const formatCategory = (cat: string) => {
  return cat.replace(/_/g, ' ');
};

// Format subcategory label (assignment → Assignment)
const formatSubcategory = (sub: string) => {
  return sub.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getBreadcrumbs = () => {
  const crumbs: Array<{ name: string; type: string; isCurrent?: boolean; path?: string }> = [];

  crumbs.push({ name: 'Dashboard', type: 'dashboard', path: '/lms/pages/studentdashboard' });
  crumbs.push({ name: 'Courses', type: 'courses', path: '/lms/pages/courses' }); // ← fix here

  if (courseName && courseName !== 'undefined') {
    crumbs.push({ name: courseName, type: 'course' });
  }

  if (hierarchy && hierarchy !== 'undefined') {
    hierarchy.split(',').forEach((node, idx) => {
      if (node && node.trim()) {
        crumbs.push({ name: node.trim(), type: idx === 0 ? 'module' : 'node' });
      }
    });
  }

  if (category && category !== 'undefined') {
    crumbs.push({ name: formatCategory(category), type: 'method' });
  }

  if (subcategory && subcategory !== 'undefined') {
    crumbs.push({ name: formatSubcategory(subcategory), type: 'activity' });
  }

  const name = exerciseName || exerciseData?.exerciseInformation?.exerciseName;
  if (name) {
    crumbs.push({ name, type: 'exercise', isCurrent: true });
  }

  return crumbs;
};
  const breadcrumbs = getBreadcrumbs();

  // Check if current question is flagged
  const isCurrentFlagged = flaggedQuestions.has(currentQuestionIndex);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden relative">
      <ToastContainer position="top-right" />

      {/* Header - Updated with proper breadcrumbs */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Left side - Breadcrumbs */}
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="text-sm">Back</span>
              </button>
              
              <div className="h-5 w-px bg-gray-300"></div>

              {/* Breadcrumbs Navigation */}
              <nav className="flex items-center" aria-label="Breadcrumb">
                <ol className="flex items-center flex-wrap gap-1">
  {breadcrumbs.map((crumb, idx) => (
    <React.Fragment key={idx}>
      <li>
        {crumb.isCurrent ? (
          <span className="text-sm font-medium text-emerald-600">
            {crumb.name}
          </span>
        ) : (
          <span
            onClick={() => crumb.path && router.push(crumb.path)}
            className={`text-sm text-gray-600 ${crumb.path ? 'hover:text-gray-900 cursor-pointer hover:underline' : 'cursor-default'}`}
          >
            {crumb.name}
          </span>
        )}
      </li>
      {idx < breadcrumbs.length - 1 && (
        <li>
          <span className="text-gray-400 mx-1">›</span>
        </li>
      )}
    </React.Fragment>
  ))}
</ol>
              </nav>

              {/* Question Type Badge */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${questionTypeInfo.bgColor} ${questionTypeInfo.color.replace('text-', 'border-').replace('500', '200')}`}>
                <questionTypeInfo.icon className={`w-3.5 h-3.5 ${questionTypeInfo.color}`} />
                <span className="text-xs font-medium">{questionTypeInfo.label}</span>
              </div>
            </div>

            {/* Right side - Stats and Actions */}
            <div className="flex items-center gap-3">
          
              {/* Sidebar Toggle Button */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors relative"
                title="Toggle question navigator"
              >
                <Layers size={16} />
                {completedQuestions.size > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                    {completedQuestions.size}
                  </span>
                )}
              </button>


{!isTestSubmitted && (
  <button
    onClick={handleFinalTestSubmission}
    className="flex items-center gap-2 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
  >
    <CheckCircle size={16} />
    Submit Exercise
  </button>
)}

{isTestSubmitted && (
  <span className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
    <CheckCircle size={14} />
    Submitted
  </span>
)}
            </div>
          </div>
        </div>
      </div>

      {/* Question Navigation - Centered Previous and Next buttons */}
      <div className="bg-gray-50 border-b border-gray-200 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            {/* Question Counter */}
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>

            {isMcqQuestion ? (
              <button
                onClick={submitCurrentMcqAnswer}
                disabled={!mcqAnswers[currentQuestion?._id]}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLastQuestion ? 'Complete' : 'Save & Next'}
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isLastQuestion ? 'Complete' : 'Next'}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - No layout shift */}
      <div className="flex-1 overflow-hidden relative">
        {/* Question Content - Always full width */}
        <div className="h-full w-full">
          {isMcqQuestion ? (
            <MCQQuestion
              question={currentQuestion}
              selectedAnswer={mcqAnswers[currentQuestion._id]}
              onAnswerSelect={(answer) => handleMcqAnswer(currentQuestion._id, answer)}
            />
          ) : isProgrammingQuestion ? (
            <ProgrammingQuestion
              question={currentQuestion}
              courseId={courseId}
              exerciseId={exerciseId}
              category={category}
              subcategory={subcategory}
              nodeId={nodeId}
              nodeName={nodeName}
              nodeType={nodeType}
              studentId={studentId}
              onComplete={() => handleProgrammingComplete(currentQuestion._id)}
              onNext={handleNextQuestion}
              isLastQuestion={isLastQuestion}
            />
          ) : isFrontendQuestion ? (
            <FrontendQuestion
              question={currentQuestion}
              courseId={courseId}
              exerciseId={exerciseId}
              category={category}
              subcategory={subcategory}
              nodeId={nodeId}
              nodeName={nodeName}
              nodeType={nodeType}
              studentId={studentId}
              onComplete={() => handleFrontendComplete(currentQuestion._id)}
              onNext={handleNextQuestion}
              isLastQuestion={isLastQuestion}
            />
          ) : isSqlQuestion ? (
            <div className="h-full">
              <SqlEditor
                question={currentQuestion}
                courseId={courseId}
                exerciseId={exerciseId}
                category={category}
                subcategory={subcategory}
                nodeId={nodeId}
                nodeName={nodeName}
                nodeType={nodeType}
                studentId={studentId}
                initialQuery={currentQuestion.solutions?.startedCode || `-- ${currentQuestion.description || 'Write your SQL query here'}\n\n`}
                theme="light"
                showSubmitButton={true}
                submitLabel="Submit Answer"
                showDatabaseControls={true}
                onSubmit={submitSqlAnswer}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Unknown Question Type</h2>
                <p className="text-gray-600">This question type is not supported.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Overlay */}
        {showSidebar && (
          <>
            {/* Backdrop for mobile */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
            
            {/* Sidebar - positioned absolute over the content */}
            <div className="absolute top-0 right-0 h-full z-50">
              <QuestionStatusSidebar
                questions={processedQuestions}
                currentIndex={currentQuestionIndex}
                completedQuestions={completedQuestions}
                flaggedQuestions={flaggedQuestions}
                onJumpToQuestion={handleJumpToQuestion}
                onClose={() => setShowSidebar(false)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Main component with Suspense - KEEP EXISTING
const CombinedExerciseMixedWrapper = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      }
    >
      <CombinedExerciseMixed />
    </Suspense>
  );
};

export default CombinedExerciseMixedWrapper;