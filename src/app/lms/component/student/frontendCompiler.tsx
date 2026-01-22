"use client";
 
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
 
import {
  Maximize2, Clock, Camera, ChevronLeft, XCircle, Play, Layout as LayoutIcon,
  FileCode, FileJson, BookOpen, ArrowLeft, ArrowRight, Save,
  CheckCircle, LogOut, AlertTriangle, Loader2, Settings, X,
  GripVertical, Code2, Palette, Terminal, Moon, Sun, Sidebar, Columns, MonitorPlay,
  PanelLeftClose, PanelLeftOpen, Zap, ShieldAlert, Eye, MousePointerClick,
  AlertCircle, Check, Video, StopCircle, Monitor, Mic, MicOff, Search,
  ShieldCheck, Shield, UserCheck, CheckCircle2, FileText, ChevronRight, Menu,
  ArrowUpDown, Trash2, AlertTriangle as AlertTriangleIcon, Lock, SkipForward,
  Loader2 as Loader2Icon, Grid3x3, SplitSquareHorizontal, SplitSquareVertical,
  EyeOff, Type, Braces, Code, Plus, Minus, Maximize, Minimize,
  List, Filter, SortAsc, ChevronDown, Circle, CircleDot, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
 
// --- DYNAMIC IMPORTS ---
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white text-gray-500 gap-2">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-xs font-medium">Loading Editor...</span>
    </div>
  )
});
 
// --- TYPES ---
interface SecuritySettings {
  timerEnabled?: boolean;
  timerType?: string;
  timerDuration?: number;
  cameraMicEnabled?: boolean;
  restrictMinimize?: boolean;
  fullScreenMode?: boolean;
  tabSwitchAllowed?: boolean;
  maxTabSwitches?: number;
  disableClipboard?: boolean;
  screenRecordingEnabled?: boolean;
}
 
interface FrontendCompilerProps {
  onBack: () => void;
  title: string;
  questions?: any[];
  selectedLanguages?: string[];
  level: string;
  entityId: string;
  entityType: string;
  security?: SecuritySettings;
  exerciseId: string;
  courseId: string;
  category: string;
  subcategory: string;
  attemptLimitEnabled?: boolean;
  maxAttempts?: number;
}
 
// --- DIFFICULTY FILTER COMPONENT ---
const DifficultyFilter = ({
  selectedDifficulty,
  setSelectedDifficulty,
  questions,
  theme = "light"
}: any) => {
  // Count questions by difficulty
  const difficultyCounts = useMemo(() => {
    const counts = {
      all: questions?.length || 0,
      easy: 0,
      medium: 0,
      hard: 0
    };
   
    questions?.forEach((question: any) => {
      const difficulty = question.difficulty?.toLowerCase() || '';
      if (difficulty === 'easy') counts.easy++;
      else if (difficulty === 'medium') counts.medium++;
      else if (difficulty === 'hard') counts.hard++;
    });
   
    return counts;
  }, [questions]);
 
  return (
    <div className="flex items-center gap-2">
      <div className={`text-xs font-medium ${theme === 'light' ? 'text-gray-600' : 'text-zinc-400'}`}>
        Filter:
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setSelectedDifficulty('all')}
          className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1 ${selectedDifficulty === 'all' ? 'bg-blue-100 text-blue-700 border border-blue-200 font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <span>All</span>
          <span className="text-xs opacity-70">({difficultyCounts.all})</span>
        </button>
        <button
          onClick={() => setSelectedDifficulty('easy')}
          className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1 ${selectedDifficulty === 'easy' ? 'bg-green-100 text-green-700 border border-green-200 font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Easy
          </span>
          <span className="text-xs opacity-70">({difficultyCounts.easy})</span>
        </button>
        <button
          onClick={() => setSelectedDifficulty('medium')}
          className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1 ${selectedDifficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            Medium
          </span>
          <span className="text-xs opacity-70">({difficultyCounts.medium})</span>
        </button>
        <button
          onClick={() => setSelectedDifficulty('hard')}
          className={`px-3 py-1.5 text-xs rounded-full flex items-center gap-1 ${selectedDifficulty === 'hard' ? 'bg-red-100 text-red-700 border border-red-200 font-medium' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            Hard
          </span>
          <span className="text-xs opacity-70">({difficultyCounts.hard})</span>
        </button>
      </div>
    </div>
  );
};
 
// --- QUESTION LIST DROPDOWN ---
const QuestionDropdown = ({
  questions,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  completedQuestions,
  theme = "light",
  selectedDifficulty,
  setSelectedDifficulty
}: any) => {
  const [isOpen, setIsOpen] = useState(false);
 
  // Group questions by difficulty
  const questionsByDifficulty = useMemo(() => {
    const grouped: Record<string, any[]> = {
      'easy': [],
      'medium': [],
      'hard': [],
      'unknown': []
    };
   
    questions?.forEach((question: any, index: number) => {
      const difficulty = question.difficulty?.toLowerCase() || 'unknown';
      if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
        grouped[difficulty].push({ ...question, originalIndex: index });
      } else {
        grouped['unknown'].push({ ...question, originalIndex: index });
      }
    });
   
    return grouped;
  }, [questions]);
 
  // Get filtered questions based on selected difficulty
  const filteredQuestions = useMemo(() => {
    if (selectedDifficulty === 'all') {
      return questions?.map((q: any, idx: number) => ({ ...q, originalIndex: idx })) || [];
    }
    return questionsByDifficulty[selectedDifficulty] || [];
  }, [selectedDifficulty, questions, questionsByDifficulty]);
 
  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (!questions?.length) return 0;
    return Math.round((completedQuestions.length / questions.length) * 100);
  }, [completedQuestions, questions]);
 
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
      >
        <List size={16} />
        <span>Questions ({questions?.length || 0})</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
     
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">All Questions</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X size={16} />
                </button>
              </div>
             
              {/* Difficulty Filter */}
              <DifficultyFilter
                selectedDifficulty={selectedDifficulty}
                setSelectedDifficulty={setSelectedDifficulty}
                questions={questions}
                theme={theme}
              />
             
              {/* Progress */}
              <div className="mt-3 text-xs text-gray-600">
                <div className="flex justify-between mb-1">
                  <span>Progress</span>
                  <span>{completedQuestions.length}/{questions?.length || 0} ({completionPercentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
           
            {/* Questions List */}
            <div className="overflow-y-auto max-h-[50vh] p-3">
              {filteredQuestions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No questions found for "{selectedDifficulty}"
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDifficulty === 'all' ? (
                    // Show grouped by difficulty when "All" is selected
                    <>
                      {Object.entries(questionsByDifficulty).map(([difficulty, qs]) => {
                        if (qs.length === 0) return null;
                       
                        const difficultyColor = {
                          easy: 'bg-green-100 text-green-800',
                          medium: 'bg-yellow-100 text-yellow-800',
                          hard: 'bg-red-100 text-red-800',
                          unknown: 'bg-gray-100 text-gray-800'
                        }[difficulty];
                       
                        const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
                       
                        return (
                          <div key={difficulty} className="mb-4 last:mb-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${difficultyColor}`}>
                                {difficultyLabel} ({qs.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {qs.map((question: any) => (
                                <QuestionItem
                                  key={question._id || question.originalIndex}
                                  question={question}
                                  currentQuestionIndex={currentQuestionIndex}
                                  setCurrentQuestionIndex={setCurrentQuestionIndex}
                                  completedQuestions={completedQuestions}
                                  onClose={() => setIsOpen(false)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    // Show filtered questions when specific difficulty is selected
                    <div className="space-y-1">
                      {filteredQuestions.map((question: any) => (
                        <QuestionItem
                          key={question._id || question.originalIndex}
                          question={question}
                          currentQuestionIndex={currentQuestionIndex}
                          setCurrentQuestionIndex={setCurrentQuestionIndex}
                          completedQuestions={completedQuestions}
                          onClose={() => setIsOpen(false)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
 
// --- QUESTION ITEM COMPONENT ---
const QuestionItem = ({ question, currentQuestionIndex, setCurrentQuestionIndex, completedQuestions, onClose }: any) => {
  const isCurrent = question.originalIndex === currentQuestionIndex;
  const isCompleted = completedQuestions.includes(question.originalIndex);
  const difficulty = question.difficulty?.toLowerCase() || 'medium';
 
  const difficultyColor = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800'
  }[difficulty];
 
  return (
    <button
      onClick={() => {
        setCurrentQuestionIndex(question.originalIndex);
        onClose();
      }}
      className={`w-full p-2 text-left rounded transition-all ${
        isCurrent
          ? 'bg-blue-50 border-2 border-blue-500'
          : 'hover:bg-gray-50 border border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {question.originalIndex + 1}
            </div>
            <div className={`font-medium text-sm truncate ${isCurrent ? 'text-blue-700' : 'text-gray-900'}`}>
              {question.title}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColor}`}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
            {isCompleted && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle size={12} />
                Submitted
              </span>
            )}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 ${isCurrent ? 'text-blue-500' : 'text-gray-400'}`} />
      </div>
    </button>
  );
};
 
// --- SUBMISSION SUCCESS MODAL ---
const SubmissionSuccessModal = ({
  isOpen,
  onConfirm,
  theme = "light"
}: {
  isOpen: boolean;
  onConfirm: () => void;
  theme?: "light" | "dark";
}) => {
  if (!isOpen) return null;
 
  const themeClasses = theme === 'dark'
    ? 'bg-gray-900 text-white border-gray-700'
    : 'bg-white text-gray-900 border-gray-300';
 
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-xl shadow-2xl border p-6 ${themeClasses}`}>
        <div className="flex flex-col items-center text-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Assessment Submitted Successfully!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your assessment has been submitted. You will be redirected to the course page.
            </p>
          </div>
        </div>
 
        <div className={`mb-6 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> What happens next?
          </h4>
          <ul className="text-sm space-y-2">
            <li className="flex items-start gap-2">
              <div className="mt-0.5">✓</div>
              <span>All your answers have been saved</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5">✓</div>
              <span>Recording has been stopped</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5">✓</div>
              <span>Security monitoring has ended</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5">✓</div>
              <span>You will be redirected automatically in 3 seconds...</span>
            </li>
          </ul>
        </div>
 
        <button
          onClick={onConfirm}
          className="w-full py-3 px-4 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <span>Continue to Course Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
 
// --- MAIN COMPONENT ---
const FrontendCompiler: React.FC<FrontendCompilerProps> = ({
  onBack,
  title,
  questions = [],
  selectedLanguages = [],
  security = {},
  exerciseId,
  courseId,
  entityId,
  entityType,
  category,
  subcategory,
  attemptLimitEnabled = false,
  maxAttempts = 3
}) => {
  const router = useRouter();
 
  // ---------------------------------------------------------------------------
  // 1. CONFIG: Active Languages & Initial State
  // ---------------------------------------------------------------------------
  const activeLanguages = useMemo(() => {
    const langs = selectedLanguages?.map(l => l.toLowerCase()) || [];
    if (langs.length === 0) return { html: true, css: true, js: true, bootstrap: false };
    return {
      html: langs.includes('html'),
      css: langs.includes('css'),
      js: langs.includes('javascript') || langs.includes('js'),
      bootstrap: langs.includes('bootstrap')
    };
  }, [selectedLanguages]);
 
  const showHtml = activeLanguages.html;
  const showCss = activeLanguages.css;
  const showJs = activeLanguages.js;
  const enableBootstrap = activeLanguages.bootstrap;
 
  const [activeEditorTab, setActiveEditorTab] = useState<'html' | 'css' | 'js'>('html');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
 
  // ---------------------------------------------------------------------------
  // 2. SECURITY & MODE CHECK
  // ---------------------------------------------------------------------------
  const isAssessmentMode = useMemo(() => {
    const normCategory = (category || "").replace(/_/g, ' ').toLowerCase().trim();
    return normCategory === 'you do';
  }, [category]);
 
  const activeSecurity = useMemo(() => {
    if (!isAssessmentMode) {
      return {
        timerEnabled: false,
        cameraMicEnabled: false,
        restrictMinimize: false,
        fullScreenMode: false,
        tabSwitchAllowed: true,
        disableClipboard: false,
        maxTabSwitches: 9999,
        screenRecordingEnabled: false
      };
    }
    return {
      timerEnabled: security.timerEnabled,
      cameraMicEnabled: security.cameraMicEnabled,
      restrictMinimize: security.restrictMinimize,
      fullScreenMode: security.fullScreenMode,
      tabSwitchAllowed: security.tabSwitchAllowed,
      maxTabSwitches: security.maxTabSwitches || 3,
      disableClipboard: security.disableClipboard,
      screenRecordingEnabled: security.screenRecordingEnabled || false
    };
  }, [isAssessmentMode, security]);
 
  const activeAttemptLimit = isAssessmentMode ? attemptLimitEnabled : false;
 
  // ---------------------------------------------------------------------------
  // 3. STATE
  // ---------------------------------------------------------------------------
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(!isAssessmentMode);
  const [hasAgreedToSecurity, setHasAgreedToSecurity] = useState(!isAssessmentMode);
 
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);
  const [autoRedirectTimer, setAutoRedirectTimer] = useState<NodeJS.Timeout | null>(null);
 
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [userAttempts, setUserAttempts] = useState(0);
 
  const [fontSize, setFontSize] = useState(15);
  const [isUIFullscreen, setIsUIFullscreen] = useState(false);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('light');
 
  // Question panel state
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);
 
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [srcDoc, setSrcDoc] = useState("");
  const currentQuestion = questions && questions.length > 0 ? questions[currentQuestionIndex] : null;
 
  // ---------------------------------------------------------------------------
  // 4. CHECK INITIAL STATUS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const checkExerciseStatus = async () => {
      if (!isAssessmentMode || !courseId || !exerciseId) return;
 
      try {
        const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
        const response = await axios.get('https://lms-server-ym1q.onrender.com/exercise/status', {
          params: { courseId, exerciseId, category, subcategory },
          headers: { Authorization: `Bearer ${token}` }
        });
 
        if (response.data.success) {
          const { isLocked, status } = response.data.data;
          if (isLocked || status === 'terminated' || status === 'completed') {
            setIsLocked(true);
            setHasStarted(false);
            setIsTerminated(true);
          }
        }
      } catch (error) {
        console.error("Status check failed", error);
      }
    };
 
    checkExerciseStatus();
  }, [courseId, exerciseId, category, subcategory, isAssessmentMode]);
 
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [isLocked, setIsLocked] = useState(false);
 
  // ---------------------------------------------------------------------------
  // 5. COMPILE LOGIC
  // ---------------------------------------------------------------------------
  const compileCode = useCallback(() => {
    const bootstrapLink = enableBootstrap ? '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">' : '';
    const bootstrapScript = enableBootstrap ? '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>' : '';
 
    setSrcDoc(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${bootstrapLink}
          <style>${cssCode}</style>
        </head>
        <body>
          ${htmlCode}
          ${bootstrapScript}
          <script>
            try { ${jsCode} } catch (err) { console.error(err); }
          </script>
        </body>
      </html>
    `);
  }, [htmlCode, cssCode, jsCode, enableBootstrap]);
 
  // Auto-compile effect
  useEffect(() => {
    const t = setTimeout(compileCode, 800);
    return () => clearTimeout(t);
  }, [htmlCode, cssCode, jsCode, compileCode]);
 
  // ---------------------------------------------------------------------------
  // 6. SUBMISSION HANDLER
  // ---------------------------------------------------------------------------
  const handleSubmitQuestion = async () => {
    if (isSubmitting) return;
    if (activeAttemptLimit && userAttempts >= maxAttempts) {
      toast.error(`Maximum attempts (${maxAttempts}) reached.`);
      return;
    }
 
    setIsSubmitting(true);
    toast.success("Submitting code...", { autoClose: 2000 });
 
    try {
      const qId = currentQuestion?._id || currentQuestion?.questionId;
      const payload = {
        courseId, exerciseId, questionId: qId,
        attemptLimitEnabled: activeAttemptLimit,
        maxAttempts,
        entityId, entityType, category, subcategory,
        code: JSON.stringify({ html: htmlCode, css: cssCode, js: jsCode }),
        language: 'html+css+js',
        status: 'solved',
        spentTime: (activeSecurity.timerDuration ? (activeSecurity.timerDuration * 60) - (timeLeft || 0) : 0)
      };
 
      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
     
      await axios.post('https://lms-server-ym1q.onrender.com/courses/answers/submit', payload, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
 
      toast.success("Code submitted successfully!", { autoClose: 2000 });
 
      setUserAttempts(prev => prev + 1);
      if (!completedQuestions.includes(currentQuestionIndex)) {
        setCompletedQuestions(prev => [...prev, currentQuestionIndex]);
      }
 
      // If this is the last question
      if (currentQuestionIndex === questions.length - 1) {
        setShowSubmissionSuccess(true);
        const timer = setTimeout(() => {
          router.push(`/lms/pages/courses/coursesdetailedview/${courseId}`);
        }, 5000);
        setAutoRedirectTimer(timer);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error(`Maximum attempts reached!`, { autoClose: 3000 });
      } else {
        toast.error("Submission failed. Please try again.", { autoClose: 3000 });
      }
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
 
  // ---------------------------------------------------------------------------
  // 7. RENDER HELPERS
  // ---------------------------------------------------------------------------
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
 
  const isLimitReached = activeAttemptLimit && userAttempts >= maxAttempts;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
 
  // Get difficulty badge class
  const getDifficultyClass = (difficulty: string) => {
    const diff = difficulty?.toLowerCase() || 'medium';
    return {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    }[diff] || 'bg-gray-100 text-gray-800';
  };
 
  // ---------------------------------------------------------------------------
  // 8. MODALS
  // ---------------------------------------------------------------------------
  if (isTerminated || isLocked) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white p-4">
        <div className="bg-white p-8 rounded-xl border border-red-200 max-w-md text-center shadow-lg">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-900">
            {terminationReason?.includes('completed') ? 'Assessment Completed' : 'Access Terminated'}
          </h2>
          <p className="text-red-600 mb-6">
            {terminationReason || "You have been locked out of this exercise."}
          </p>
          <button onClick={() => router.push(`/lms/pages/courses/coursesdetailedview/${courseId}`)} className="bg-gray-800 px-6 py-2 rounded-lg hover:bg-gray-900 text-white font-bold transition-colors">
            Exit to Course
          </button>
        </div>
      </div>
    );
  }
 
  if (showSubmissionSuccess) {
    return (
      <SubmissionSuccessModal
        isOpen={showSubmissionSuccess}
        onConfirm={() => router.push(`/lms/pages/courses/coursesdetailedview/${courseId}`)}
        theme={theme === 'vs-dark' ? 'dark' : 'light'}
      />
    );
  }
 
  if (!hasStarted && isAssessmentMode) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white relative">
        <div className="max-w-xl w-full bg-white p-8 rounded-xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 text-blue-600">{title}</h1>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs border border-red-200 uppercase font-bold flex items-center gap-2">
                <ShieldAlert size={12} /> Assessment Mode
              </span>
            </div>
          </div>
         
          <div className="space-y-4 mb-8">
            <button
              onClick={() => {
                setHasAgreedToSecurity(true);
                setHasStarted(true);
                if (activeSecurity.timerEnabled && activeSecurity.timerDuration) {
                  setTimeLeft(activeSecurity.timerDuration * 60);
                }
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Start Assessment</span> <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }
 
  // ---------------------------------------------------------------------------
  // 9. MAIN RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className={`flex flex-col h-full ${theme === 'light' ? 'bg-white text-gray-800' : 'bg-[#1e1e1e] text-white'}`}>
      <ToastContainer
        theme="light"
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={3}
      />
 
      {/* Header */}
      <header className={`h-14 border-b flex items-center justify-between px-4 shrink-0 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-zinc-800 border-zinc-700'}`}>
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`p-2 rounded hover:bg-gray-100 ${theme === 'light' ? 'text-gray-600' : 'text-zinc-400'}`}
          >
            <ChevronLeft size={20} />
          </button>
         
          <div className="flex flex-col">
            <h1 className="font-semibold text-sm flex items-center gap-2">
              {title}
              {isAssessmentMode && (
                <span className="text-xs bg-red-100 text-red-700 px-1.5 rounded border border-red-200">Assessment</span>
              )}
            </h1>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              {activeAttemptLimit && (
                <span className={isLimitReached ? 'text-red-600' : 'text-gray-600'}>
                  Attempts: {userAttempts} / {maxAttempts}
                </span>
              )}
            </div>
          </div>
        </div>
 
        {/* Center Section - Timer & Question Dropdown */}
        <div className="flex items-center gap-4">
          {activeSecurity.timerEnabled && timeLeft !== null && isAssessmentMode && (
            <div className={`px-4 py-1.5 rounded font-mono font-medium ${timeLeft < 60 ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-900 text-amber-400'}`}>
              <Clock size={14} className="inline mr-2" /> {formatTime(timeLeft)}
            </div>
          )}
         
          {/* Question Dropdown */}
          <QuestionDropdown
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
            completedQuestions={completedQuestions}
            theme={theme === 'vs-dark' ? 'dark' : 'light'}
            selectedDifficulty={selectedDifficulty}
            setSelectedDifficulty={setSelectedDifficulty}
          />
        </div>
 
        {/* Right Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark')}
            className="p-2 rounded hover:bg-gray-100 text-gray-600"
            title="Toggle Theme"
          >
            {theme === 'vs-dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
 
          <button
            onClick={onBack}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              isAssessmentMode
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-gray-800 hover:bg-gray-900 text-white"
            }`}
          >
            <LogOut size={14} className="inline mr-1" />
            {isAssessmentMode ? "Finish" : "Exit"}
          </button>
        </div>
      </header>
 
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Question */}
        {showQuestionPanel && (
          <div className={`w-96 flex flex-col border-r border-gray-200 transition-all duration-300 ${showQuestionPanel ? 'opacity-100' : 'opacity-0'}`}>
            {/* Question Panel Header */}
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Toggle Button on Left Side */}
                <button
                  onClick={() => setShowQuestionPanel(!showQuestionPanel)}
                  className={`p-1.5 rounded ${showQuestionPanel ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-500 hover:bg-gray-100'}`}
                  title="Hide Question Panel"
                >
                  <ChevronsLeft size={18} />
                </button>
               
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Question {currentQuestionIndex + 1}
                  </span>
                  {currentQuestion?.difficulty && (
                    <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyClass(currentQuestion.difficulty)}`}>
                      {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
                    </span>
                  )}
                </div>
              </div>
             
              {/* Navigation Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous Question"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="text-xs font-medium px-2">
                  {currentQuestionIndex + 1}/{questions.length}
                </span>
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next Question"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
 
            {/* Question Content */}
            {currentQuestion && (
              <div className="flex-1 overflow-y-auto p-4">
                {/* Question Title */}
                <h2 className="font-bold text-lg mb-3">{currentQuestion.title}</h2>
 
                {/* Question Description */}
                <div className="mb-6">
                  <div className={`leading-relaxed whitespace-pre-wrap text-sm ${theme === 'light' ? 'text-gray-700' : 'text-zinc-300'}`}>
                    {currentQuestion.description || "No description provided."}
                  </div>
                </div>
 
                {/* Question Details */}
                <div className="space-y-4">
                  {/* Difficulty and Score */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-gray-600">Difficulty:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getDifficultyClass(currentQuestion.difficulty)}`}>
                        {currentQuestion.difficulty?.charAt(0).toUpperCase() + currentQuestion.difficulty?.slice(1) || 'Medium'}
                      </span>
                    </div>
                    {currentQuestion.score && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-600">Score:</span>
                        <span className="text-blue-600 font-medium">{currentQuestion.score}</span>
                      </div>
                    )}
                  </div>
 
                  {/* Submission Status */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${completedQuestions.includes(currentQuestionIndex) ? 'text-green-600' : 'text-yellow-600'}`}>
                        {completedQuestions.includes(currentQuestionIndex) ? '✓ Submitted' : 'Not submitted yet'}
                      </span>
                      {activeAttemptLimit && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          isLimitReached ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          Attempts: {userAttempts}/{maxAttempts}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {isLastQuestion ?
                        "This is the final question. Submit to complete the assessment." :
                        "Complete your code and submit to proceed to next question."
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
 
        {/* Show Toggle Button when Question Panel is Hidden */}
        {!showQuestionPanel && (
          <div className="w-10 flex flex-col items-center justify-center border-r border-gray-200 bg-gray-50">
            <button
              onClick={() => setShowQuestionPanel(true)}
              className="p-2 rounded hover:bg-blue-50 text-gray-600 hover:text-blue-600"
              title="Show Question Panel"
            >
              <ChevronsRight size={20} />
            </button>
            <span className="text-xs text-gray-500 mt-2 -rotate-90 whitespace-nowrap">Show Question</span>
          </div>
        )}
 
        {/* Middle Panel - Code Editor */}
        <div className={`flex-1 flex flex-col min-w-0 ${showQuestionPanel ? 'border-r border-gray-200' : ''}`}>
          {/* Editor Header with Action Buttons */}
          <div className={`h-10 border-b flex items-center justify-between px-2 ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#1e1e1e] border-zinc-700'}`}>
            {/* Editor Tabs */}
            <div className="flex items-center gap-1">
              {showHtml && (
                <button
                  onClick={() => setActiveEditorTab('html')}
                  className={`flex items-center gap-2 px-4 h-full text-sm border-b-2 ${activeEditorTab === 'html' ? 'border-orange-500 text-orange-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Code2 size={16} /> HTML
                </button>
              )}
              {showCss && (
                <button
                  onClick={() => setActiveEditorTab('css')}
                  className={`flex items-center gap-2 px-4 h-full text-sm border-b-2 ${activeEditorTab === 'css' ? 'border-blue-500 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Palette size={16} /> CSS
                </button>
              )}
              {showJs && (
                <button
                  onClick={() => setActiveEditorTab('js')}
                  className={`flex items-center gap-2 px-4 h-full text-sm border-b-2 ${activeEditorTab === 'js' ? 'border-yellow-500 text-yellow-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Terminal size={16} /> JavaScript
                </button>
              )}
            </div>
           
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmitQuestion}
                disabled={isSubmitting || (isAssessmentMode && activeAttemptLimit && userAttempts >= maxAttempts)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="w-3 h-3 animate-spin" />
                    Submitting...
                  </>
                ) : isLastQuestion ? (
                  'Submit & Finish'
                ) : (
                  'Submit Answer'
                )}
              </button>
             
              <button
                onClick={compileCode}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold flex items-center gap-2 text-white"
              >
                <Play size={12} /> Run Code
              </button>
            </div>
          </div>
 
          {/* Editor Content */}
          <div className="flex-1 relative bg-white">
            {isFetching ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <>
                {activeEditorTab === 'html' && showHtml && (
                  <MonacoEditor
                    height="100%"
                    language="html"
                    theme={theme}
                    value={htmlCode}
                    onChange={(v) => setHtmlCode(v || "")}
                    options={{
                      fontSize,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      wordWrap: 'on'
                    }}
                  />
                )}
                {activeEditorTab === 'css' && showCss && (
                  <MonacoEditor
                    height="100%"
                    language="css"
                    theme={theme}
                    value={cssCode}
                    onChange={(v) => setCssCode(v || "")}
                    options={{
                      fontSize,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      wordWrap: 'on'
                    }}
                  />
                )}
                {activeEditorTab === 'js' && showJs && (
                  <MonacoEditor
                    height="100%"
                    language="javascript"
                    theme={theme}
                    value={jsCode}
                    onChange={(v) => setJsCode(v || "")}
                    options={{
                      fontSize,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      wordWrap: 'on'
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
 
        {/* Right Panel - Preview */}
        <div className={`w-1/3 flex flex-col min-w-0 ${theme === 'light' ? 'bg-white' : 'bg-white'}`}>
          <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-4 text-sm text-gray-600 gap-2 font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="ml-2 font-semibold">Live Preview</span>
            </div>
            {enableBootstrap && (
              <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                Bootstrap
              </span>
            )}
          </div>
          <iframe
            srcDoc={srcDoc}
            title="output"
            sandbox="allow-scripts"
            frameBorder="0"
            width="100%"
            height="100%"
            className="flex-1 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
 
export default FrontendCompiler;  
 