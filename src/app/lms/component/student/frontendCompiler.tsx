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
  Loader2 as Loader2Icon
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

// --- HELPER: SWITCH ---
const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: (v: boolean) => void, label?: string }) => (
  <div className="flex items-center justify-between cursor-pointer group" onClick={() => onChange(!checked)}>
    {label && <span className="text-xs font-medium text-gray-600 group-hover:text-gray-800 transition-colors">{label}</span>}
    <div className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </div>
);

// --- SECURITY AGREEMENT MODAL ---
const SecurityAgreementModal = ({
  isOpen,
  onAgree,
  onCancel,
  securitySettings,
  theme = "light"
}: {
  isOpen: boolean;
  onAgree: () => void;
  onCancel: () => void;
  securitySettings: SecuritySettings;
  theme?: "light" | "dark";
}) => {
  if (!isOpen) return null;

  const themeClasses = theme === 'dark'
    ? 'bg-gray-900 text-white border-gray-700'
    : 'bg-white text-gray-900 border-gray-300';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-xl shadow-2xl border p-6 ${themeClasses}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Assessment Security Agreement</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Please review and agree to the security measures</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4" /> Security Features
            </h3>
            <ul className="space-y-2 text-sm">
              {securitySettings.timerEnabled ? (
                <li className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span>Timed Assessment: {securitySettings.timerDuration || 60} minutes</span>
                </li>
              ) : (
                <li className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>Timed Assessment: Disabled</span>
                </li>
              )}

              {securitySettings.fullScreenMode ? (
                <li className="flex items-center gap-2">
                  <Maximize2 className="w-3 h-3 text-purple-500" />
                  <span>Full Screen Mode Required</span>
                </li>
              ) : (
                <li className="flex items-center gap-2 text-gray-400">
                  <Maximize2 className="w-3 h-3" />
                  <span>Full Screen Mode: Optional</span>
                </li>
              )}

              {securitySettings.cameraMicEnabled ? (
                <li className="flex items-center gap-2">
                  <Camera className="w-3 h-3 text-green-500" />
                  <span>Camera & Microphone Monitoring</span>
                </li>
              ) : (
                <li className="flex items-center gap-2 text-gray-400">
                  <Camera className="w-3 h-3" />
                  <span>Camera & Microphone: Disabled</span>
                </li>
              )}

              {securitySettings.screenRecordingEnabled ? (
                <li className="flex items-center gap-2">
                  <Video className="w-3 h-3 text-red-500" />
                  <span>Screen Recording Active</span>
                </li>
              ) : (
                <li className="flex items-center gap-2 text-gray-400">
                  <Video className="w-3 h-3" />
                  <span>Screen Recording: Disabled</span>
                </li>
              )}

              {securitySettings.tabSwitchAllowed === false ? (
                <li className="flex items-center gap-2">
                  <Lock className="w-3 h-3 text-yellow-500" />
                  <span>Tab Switching Restricted</span>
                </li>
              ) : (
                <li className="flex items-center gap-2 text-gray-400">
                  <Lock className="w-3 h-3" />
                  <span>Tab Switching: Allowed</span>
                </li>
              )}

              {securitySettings.disableClipboard ? (
                <li className="flex items-center gap-2">
                  <AlertTriangleIcon className="w-3 h-3 text-orange-500" />
                  <span>Copy/Paste Disabled</span>
                </li>
              ) : (
                <li className="flex items-center gap-2 text-gray-400">
                  <AlertTriangleIcon className="w-3 h-3" />
                  <span>Copy/Paste: Allowed</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium border transition-colors ${theme === 'dark'
              ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            Cancel Assessment
          </button>
          <button
            onClick={onAgree}
            className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
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

// --- CLOUDINARY CONFIG ---
const CLOUDINARY_CLOUD_NAME = "dusxfgvhi";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const CLOUDINARY_PRESET = "dusxfgvhi";

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

  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');

  useEffect(() => {
    if (showHtml) setActiveTab('html');
    else if (showCss) setActiveTab('css');
    else if (showJs) setActiveTab('js');
  }, [showHtml, showCss, showJs]);

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
  const [layoutMode, setLayoutMode] = useState<'standard' | 'bottom-question'>('standard');
  const [editorViewMode, setEditorViewMode] = useState<'tabbed' | 'split'>('tabbed');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const [leftPanelWidth, setLeftPanelWidth] = useState(350);
  const [rightPanelWidth, setRightPanelWidth] = useState(500);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftResizerRef = useRef<HTMLDivElement>(null);
  const rightResizerRef = useRef<HTMLDivElement>(null);

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [hasStarted, setHasStarted] = useState(!isAssessmentMode);
  const [hasAgreedToSecurity, setHasAgreedToSecurity] = useState(!isAssessmentMode);
  const [showSecurityAgreement, setShowSecurityAgreement] = useState(false); // Start as false, will be set based on check

  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);
  const [autoRedirectTimer, setAutoRedirectTimer] = useState<NodeJS.Timeout | null>(null);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [userAttempts, setUserAttempts] = useState(0);
  const [autoRun, setAutoRun] = useState(true);

  const [fontSize, setFontSize] = useState(15);
  const [showSettings, setShowSettings] = useState(false);
  const [isUIFullscreen, setIsUIFullscreen] = useState(false);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('light');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isRecordingStartedRef = useRef(false); // NEW: Track if recording has started

  // Screen recording refs
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);

  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [srcDoc, setSrcDoc] = useState("");
  const [isProblemsListVisible, setIsProblemsListVisible] = useState(true);
  const currentQuestion = questions && questions.length > 0 ? questions[currentQuestionIndex] : null;
  const colors = { border: theme === 'light' ? "border-gray-200" : "border-zinc-700", panel: theme === 'light' ? "bg-white" : "bg-zinc-800" };

  // ---------------------------------------------------------------------------
  // 4. FILTERING & SORTING STATE
  // ---------------------------------------------------------------------------
  const [sortBy, setSortBy] = useState<'default' | 'difficulty' | 'title'>('default');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  // ---------------------------------------------------------------------------
  // 5. CHECK INITIAL STATUS - FIXED: Check before showing security agreement
  // ---------------------------------------------------------------------------
 // ---------------------------------------------------------------------------
// 7. CHECK INITIAL STATUS - FIXED: Check locked status FIRST
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 5. CHECK INITIAL STATUS - FIXED: Check before showing security agreement
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

        // Check if exercise is locked or completed
        if (isLocked || status === 'terminated' || status === 'completed') {
          setIsLocked(true);
          setHasStarted(false);
          if (status === 'completed') {
            setTerminationReason("This assessment has already been completed. You cannot retake it.");
          } else {
            setTerminationReason("This exercise is locked. You have been terminated or have already completed it.");
          }
          setIsTerminated(true);
          setShowSecurityAgreement(false);
        }
        // If not locked/completed, showSecurityAgreement remains false initially
      }
    } catch (error) {
      console.error("Status check failed", error);
    }
  };

  checkExerciseStatus();
}, [courseId, exerciseId, category, subcategory, isAssessmentMode]);
  // ---------------------------------------------------------------------------
  // 6. HELPER FUNCTIONS FOR FILTERING/SORTING
  // ---------------------------------------------------------------------------

  const getFilteredAndSortedProblems = useCallback(() => {
    if (!questions || questions.length === 0) return [];

    let filtered = [...questions];

    // Apply difficulty filter
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(q => {
        const difficulty = q.difficulty || 'Medium';
        return difficulty.toLowerCase() === filterDifficulty.toLowerCase();
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(q =>
        (q.title?.toLowerCase().includes(query) || false) ||
        (q.description?.toLowerCase().includes(query) || false)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'difficulty':
        const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        filtered.sort((a, b) => {
          const aDiff = a.difficulty || 'Medium';
          const bDiff = b.difficulty || 'Medium';
          return difficultyOrder[aDiff] - difficultyOrder[bDiff];
        });
        break;
      case 'title':
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'default':
      default:
        // Keep original order (by sequence or index)
        filtered.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        break;
    }

    return filtered;
  }, [questions, filterDifficulty, searchQuery, sortBy]);

  const getSortIcon = () => {
    switch (sortBy) {
      case 'difficulty':
        return '🟢🟡🔴';
      case 'title':
        return 'A-Z';
      case 'default':
      default:
        return '123';
    }
  };

  const cycleSortOption = () => {
    const sortOptions: Array<'default' | 'difficulty' | 'title'> = ['default', 'difficulty', 'title'];
    const currentIndex = sortOptions.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortBy(sortOptions[nextIndex]);
  };

  // ---------------------------------------------------------------------------
  // 7. SECURITY AGREEMENT HANDLING
  // ---------------------------------------------------------------------------
  const handleSecurityAgreement = async () => {
  // Double-check if not locked before starting
  if (isLocked) {
    setTerminationReason("This exercise has been locked. Please contact your instructor.");
    setIsTerminated(true);
    return;
  }
  
  // Mark as agreed and start assessment
  setHasAgreedToSecurity(true);
  setHasStarted(true);

  // Force fullscreen if required
  if (activeSecurity.fullScreenMode) {
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast.error('Fullscreen required. Please enable it manually.');
      return;
    }
  }

  // Start recording if enabled - ONLY ONCE
  if ((activeSecurity.screenRecordingEnabled || activeSecurity.cameraMicEnabled) && !isRecordingStartedRef.current) {
    try {
      isRecordingStartedRef.current = true;
      
      if (activeSecurity.screenRecordingEnabled) {
        await startScreenRecording();
      } else if (activeSecurity.cameraMicEnabled) {
        await startCameraRecording();
      }

      toast.success(`Assessment started with ${activeSecurity.screenRecordingEnabled ? 'screen recording' : 'camera monitoring'}`, { autoClose: 3000 });
    } catch (error) {
      console.error('Recording start error:', error);
      toast.warning('Could not start recording, but assessment will continue');
    }
  } else {
    toast.success('Assessment started', { autoClose: 3000 });
  }

  // Start timer if enabled
  if (activeSecurity.timerEnabled && activeSecurity.timerDuration) {
    setTimeLeft(activeSecurity.timerDuration * 60);
  }
};

const handleCancelAssessment = () => {
  setHasStarted(false);
  onBack();
};

  // ---------------------------------------------------------------------------
  // 8. CLEANUP & EXIT LOGIC
  // ---------------------------------------------------------------------------
  const cleanupAllMedia = useCallback(() => {
    console.log('🧹 Cleaning up all media streams...');
    
    // Stop media recorder
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } catch (e) {
        console.error('Error stopping recorder:', e);
      }
    }

    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      setCameraStream(null);
    }

    // Stop screen stream
    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      setScreenStream(null);
    }

    // Stop combined stream
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      combinedStreamRef.current = null;
    }

    // Clean up video elements
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => {
        t.stop();
        t.enabled = false;
      });
      videoRef.current.srcObject = null;
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }

    // Reset recording flag
    isRecordingStartedRef.current = false;
  }, [cameraStream, screenStream, isRecording]);
const performExit = useCallback(async () => {
  // If this is assessment mode and test is finished, mark as completed
  if (isAssessmentMode && hasStarted && currentQuestionIndex === questions.length - 1) {
    try {
      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
      
      // Final check: ensure exercise is marked as completed using lock endpoint
      await axios.post('https://lms-server-ym1q.onrender.com/exercise/lock', {
        courseId,
        exerciseId,
        category,
        subcategory,
        status: 'completed',
        reason: 'user_exited_after_completion'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Exercise finalized as completed');
    } catch (error) {
      console.error('Failed to finalize exercise completion:', error);
    }
  }

  // Clean up all media first
  cleanupAllMedia();
  
  // Try to save recording silently (don't show errors)
  if (recordedChunksRef.current.length > 0) {
    try {
      await saveRecordingSilently();
    } catch (error) {
      console.log('Recording save failed silently:', error);
    }
  }

  // Clear any auto-redirect timer
  if (autoRedirectTimer) {
    clearTimeout(autoRedirectTimer);
    setAutoRedirectTimer(null);
  }

  // Clear stored exercise data
  localStorage.removeItem('currentFrontendExercise');

  // Navigate to course detailed view
  router.push(`/lms/pages/courses/coursesdetailedview/${courseId}`);
}, [cleanupAllMedia, courseId, router, autoRedirectTimer, isAssessmentMode, hasStarted, currentQuestionIndex, questions.length, exerciseId, category, subcategory]); // Silent recording save (no error shown to user)
  const saveRecordingSilently = async (): Promise<boolean> => {
    if (recordedChunksRef.current.length === 0) {
      return true;
    }

    try {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });

      if (blob.size === 0) {
        return true;
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const recordingType = activeSecurity.screenRecordingEnabled ? 'screen' : 'camera';
      const filename = `${recordingType}_recording_${courseId}_${exerciseId}_${timestamp}.webm`;

      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
      formData.append('folder', 'assessments');

      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      // Clear recording chunks after upload
      recordedChunksRef.current = [];
      return true;

    } catch (error) {
      console.error('Silent recording save error:', error);
      return false;
    }
  };

  // ---------------------------------------------------------------------------
  // 9. START ASSESSMENT FUNCTION
  // ---------------------------------------------------------------------------
  const startAssessment = async () => {
    if (!isAssessmentMode) return;

    setHasStarted(true);

    // Force fullscreen if required
    if (activeSecurity.fullScreenMode) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (error) {
        console.error('Fullscreen error:', error);
        toast.error('Fullscreen required. Please enable it manually.');
        return;
      }
    }

    // Start recording if enabled - ONLY ONCE
    if ((activeSecurity.screenRecordingEnabled || activeSecurity.cameraMicEnabled) && !isRecordingStartedRef.current) {
      try {
        isRecordingStartedRef.current = true; // Set flag to prevent duplicate starts
        
        if (activeSecurity.screenRecordingEnabled) {
          await startScreenRecording();
        } else if (activeSecurity.cameraMicEnabled) {
          await startCameraRecording();
        }

        toast.success(`Assessment started with ${activeSecurity.screenRecordingEnabled ? 'screen recording' : 'camera monitoring'}`, { autoClose: 3000 });
      } catch (error) {
        console.error('Recording start error:', error);
        toast.warning('Could not start recording, but assessment will continue');
      }
    } else {
      toast.success('Assessment started', { autoClose: 3000 });
    }

    // Start timer if enabled
    if (activeSecurity.timerEnabled && activeSecurity.timerDuration) {
      setTimeLeft(activeSecurity.timerDuration * 60);
    }
  };

  // ---------------------------------------------------------------------------
  // 10. TERMINATION HANDLER
  // ---------------------------------------------------------------------------
const handleTermination = useCallback(async (reason: string) => {
  if (!isAssessmentMode) return;

  console.log('🚫 Terminating assessment:', reason);

  // Clean up media
  cleanupAllMedia();

  // Try to save recording silently
  if (recordedChunksRef.current.length > 0) {
    try {
      await saveRecordingSilently();
    } catch (error) {
      console.log('Recording save failed on termination:', error);
    }
  }

  // Update UI state
  setIsTerminated(true);
  setIsLocked(true);
  setHasStarted(false);
  setTerminationReason(reason);

  // Call Backend to Lock Exercise with 'completed' status
  try {
    const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
    await axios.post('https://lms-server-ym1q.onrender.com/exercise/lock', {
      courseId,
      exerciseId,
      category,
      subcategory,
      status: 'completed', // This should lock it as completed
      reason: reason || 'Assessment completed by user'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Exercise marked as completed in backend");
  } catch (err) {
    console.error("Failed to mark exercise as completed:", err);
  }
}, [isAssessmentMode, courseId, exerciseId, category, subcategory, cleanupAllMedia]);
  // ---------------------------------------------------------------------------
  // 11. SECURITY EFFECTS
  // ---------------------------------------------------------------------------

  // Timer
  useEffect(() => {
    if (!hasStarted || !activeSecurity.timerEnabled || !timeLeft) return;

    const timer = setInterval(() => {
      setTimeLeft(p => {
        if (p !== null && p <= 0) {
          clearInterval(timer);
          handleTermination("Time Limit Exceeded");
          return 0;
        }
        return p !== null ? p - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSecurity.timerEnabled, hasStarted, timeLeft, handleTermination]);

  // Tab switching detection
  useEffect(() => {
    if (!hasStarted || isTerminated || isLocked || !isAssessmentMode) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitchCount(c => {
          const newCount = c + 1;

          if (!activeSecurity.tabSwitchAllowed) {
            handleTermination("Tab switching is strictly prohibited.");
            return newCount;
          }

          if (activeSecurity.tabSwitchAllowed && activeSecurity.maxTabSwitches && newCount > activeSecurity.maxTabSwitches) {
            handleTermination(`Tab switch limit (${activeSecurity.maxTabSwitches}) exceeded.`);
            return newCount;
          }

          const limitText = activeSecurity.maxTabSwitches ? `/${activeSecurity.maxTabSwitches}` : '';
          toast.warn(`Warning: Tab switch detected! (${newCount}${limitText})`);

          return newCount;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [activeSecurity, hasStarted, isTerminated, isLocked, isAssessmentMode, handleTermination]);

  // Clipboard restrictions
  useEffect(() => {
    if (!hasStarted || !activeSecurity.disableClipboard || !isAssessmentMode) return;

    const preventCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error("Copy/Paste is disabled in assessment mode");
    };

    document.addEventListener('copy', preventCopyPaste);
    document.addEventListener('paste', preventCopyPaste);
    document.addEventListener('cut', preventCopyPaste);

    return () => {
      document.removeEventListener('copy', preventCopyPaste);
      document.removeEventListener('paste', preventCopyPaste);
      document.removeEventListener('cut', preventCopyPaste);
    };
  }, [activeSecurity.disableClipboard, hasStarted, isAssessmentMode]);

  // Full screen enforcement
  useEffect(() => {
    if (!hasStarted || !activeSecurity.fullScreenMode || !isAssessmentMode) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        toast.error("Full screen mode is required! Returning to full screen...");
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {
            handleTermination("Failed to maintain full screen mode");
          });
        }, 1000);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [activeSecurity.fullScreenMode, hasStarted, isAssessmentMode, handleTermination]);

  // ---------------------------------------------------------------------------
  // 12. RECORDING FUNCTIONS - FIXED: No duplicate screen share
  // ---------------------------------------------------------------------------

  const startScreenRecording = async () => {
    try {
      console.log('🔴 Starting screen recording...');

      // Request screen capture ONLY if not already have stream
      if (!screenStream) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: micEnabled
        });

        console.log('✅ Screen stream obtained:', displayStream.id);
        setScreenStream(displayStream);

        // Handle screen stream ending
        displayStream.getVideoTracks()[0].onended = () => {
          console.log('🛑 User stopped screen sharing');
          stopRecording();
        };
      }

      let cameraStream: MediaStream | null = null;
      if (activeSecurity.cameraMicEnabled && !this.cameraStream) {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 320 },
              height: { ideal: 240 },
              frameRate: { ideal: 15 }
            },
            audio: micEnabled
          });
          console.log('✅ Camera stream obtained:', cameraStream.id);
          setCameraStream(cameraStream);

          if (videoRef.current) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.play().catch(console.error);
          }
        } catch (err) {
          console.warn("Camera access failed:", err);
          toast.warning("Camera access denied. Screen recording will continue without camera.");
        }
      }

      // Create a canvas to combine screen and camera
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      canvasRef.current = canvas;

      // Create video elements
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.autoplay = true;
      screenVideo.playsInline = true;
      screenVideo.onloadedmetadata = () => {
        screenVideo.play().catch(console.error);
      };
      screenVideoRef.current = screenVideo;

      const cameraVideo = document.createElement('video');
      if (cameraStream) {
        cameraVideo.srcObject = cameraStream;
        cameraVideo.autoplay = true;
        cameraVideo.playsInline = true;
        cameraVideo.onloadedmetadata = () => {
          cameraVideo.play().catch(console.error);
        };
      }

      // Composite frames
      const drawFrame = () => {
        if (!ctx) return;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw screen (scaled to fit)
        if (screenVideo.videoWidth > 0 && screenVideo.videoHeight > 0) {
          const screenAspect = screenVideo.videoWidth / screenVideo.videoHeight;
          const canvasAspect = canvas.width / canvas.height;

          let drawWidth, drawHeight, drawX, drawY;

          if (screenAspect > canvasAspect) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / screenAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
          } else {
            drawHeight = canvas.height;
            drawWidth = canvas.height * screenAspect;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
          }

          ctx.drawImage(screenVideo, drawX, drawY, drawWidth, drawHeight);
        }

        // Draw camera overlay if available
        if (cameraVideo && cameraVideo.srcObject && activeSecurity.cameraMicEnabled) {
          const camWidth = 320;
          const camHeight = 240;
          const padding = 20;

          // Draw background for camera
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(
            canvas.width - camWidth - padding,
            padding,
            camWidth + 10,
            camHeight + 10
          );

          // Draw camera feed
          ctx.drawImage(
            cameraVideo,
            canvas.width - camWidth - padding + 5,
            padding + 5,
            camWidth,
            camHeight
          );

          // Draw timestamp
          ctx.fillStyle = 'white';
          ctx.font = '14px Arial';
          ctx.fillText(
            new Date().toLocaleTimeString(),
            canvas.width - camWidth - padding + 10,
            padding + 20
          );
        }

        animationFrameRef.current = requestAnimationFrame(drawFrame);
      };

      // Start drawing
      drawFrame();

      // Capture canvas stream
      const canvasStream = canvas.captureStream(15);

      // Add audio from screen or camera
      if (screenStream?.getAudioTracks().length > 0) {
        canvasStream.addTrack(screenStream.getAudioTracks()[0]);
      } else if (cameraStream?.getAudioTracks().length > 0) {
        canvasStream.addTrack(cameraStream.getAudioTracks()[0]);
      }

      // Get supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : MediaRecorder.isTypeSupported('video/mp4')
            ? 'video/mp4'
            : '';

      if (!mimeType) {
        throw new Error('No supported MIME type found for recording');
      }

      // Create media recorder
      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 2500000
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        toast.error("Recording error occurred");
      };

      // Start recording
      mediaRecorder.start(1000);
      setIsRecording(true);

      console.log('✅ Recording started successfully');
      toast.success("Screen recording started", { autoClose: 3000 });

    } catch (error) {
      console.error('❌ Screen recording error:', error);
      toast.error("Could not start screen recording. Please check permissions.");
    }
  };

  const startCameraRecording = async () => {
    if (!activeSecurity.cameraMicEnabled) return;

    try {
      console.log('📹 Starting camera recording...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: micEnabled
      });

      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }

      // Get supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : MediaRecorder.isTypeSupported('video/mp4')
            ? 'video/mp4'
            : '';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('📹 Camera recording stopped');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);

      console.log('✅ Camera recording started');
      toast.success("Camera recording started");

    } catch (error) {
      console.error("Camera recording error:", error);
      toast.error("Failed to start camera recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('🛑 Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Remove duplicate recording start effect
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      cleanupAllMedia();
    };
  }, [cleanupAllMedia]);

  // ---------------------------------------------------------------------------
  // 13. COMPILE LOGIC
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

  useEffect(() => {
    if (autoRun) {
      const t = setTimeout(compileCode, 800);
      return () => clearTimeout(t);
    }
  }, [htmlCode, cssCode, jsCode, compileCode, autoRun]);

  // ---------------------------------------------------------------------------
  // 14. SMOOTH RESIZING LOGIC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const minWidth = 250;

      // Left resizing (between problems list and question)
      if (leftResizerRef.current?.classList.contains('resizing')) {
        let newWidth = e.clientX - containerRect.left;
        if (newWidth < minWidth) newWidth = minWidth;
        setLeftPanelWidth(newWidth);
      }

      // Right resizing (between editor and preview)
      if (rightResizerRef.current?.classList.contains('resizing')) {
        let newWidth = containerRect.right - e.clientX;
        if (newWidth < minWidth) newWidth = minWidth;
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      // Remove resizing classes
      if (leftResizerRef.current) leftResizerRef.current.classList.remove('resizing');
      if (rightResizerRef.current) rightResizerRef.current.classList.remove('resizing');
      
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      document.body.style.pointerEvents = 'auto';
    };

    const handleMouseDown = (e: MouseEvent, resizerType: 'left' | 'right') => {
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';

      if (resizerType === 'left' && leftResizerRef.current) {
        leftResizerRef.current.classList.add('resizing');
      } else if (resizerType === 'right' && rightResizerRef.current) {
        rightResizerRef.current.classList.add('resizing');
      }
    };

    // Add event listeners to resizers
    const leftResizer = leftResizerRef.current;
    const rightResizer = rightResizerRef.current;

    if (leftResizer) {
      leftResizer.addEventListener('mousedown', (e) => handleMouseDown(e, 'left'));
    }
    if (rightResizer) {
      rightResizer.addEventListener('mousedown', (e) => handleMouseDown(e, 'right'));
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (leftResizer) {
        leftResizer.removeEventListener('mousedown', (e) => handleMouseDown(e, 'left'));
      }
      if (rightResizer) {
        rightResizer.removeEventListener('mousedown', (e) => handleMouseDown(e, 'right'));
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 15. FETCHING & SUBMISSION
  // ---------------------------------------------------------------------------
  const fetchUserAnswer = async () => {
    if (!courseId || !exerciseId) return;
    const qId = currentQuestion?._id || currentQuestion?.questionId;
    if (!qId) return;

    setIsFetching(true);

    try {
      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
      const response = await axios.get('https://lms-server-ym1q.onrender.com/courses/answers/single', {
        params: { courseId, exerciseId, questionId: qId, category, subcategory },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.data) {
        let parsedCode = response.data.data;
        if (typeof parsedCode === 'string') {
          try { parsedCode = JSON.parse(parsedCode); } catch (e) { /* ignore */ }
        }
        setHtmlCode(parsedCode.html || "");
        setCssCode(parsedCode.css || "");
        setJsCode(parsedCode.js || "");

        if (typeof response.data.attempts === 'number') setUserAttempts(response.data.attempts);
        if (response.data.status === 'solved' || response.data.status === 'completed') {
          if (!completedQuestions.includes(currentQuestionIndex)) setCompletedQuestions(prev => [...prev, currentQuestionIndex]);
        }
      } else {
        setHtmlCode("");
        setCssCode(showCss ? "/* Write your CSS here */" : "");
        setJsCode(showJs ? "// Write your JS here" : "");
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (hasStarted) fetchUserAnswer();
  }, [currentQuestionIndex, exerciseId, currentQuestion?._id, hasStarted]);

const handleSubmitQuestion = async () => {
  if (isSubmitting) return;
  if (activeAttemptLimit && userAttempts >= maxAttempts) {
    toast.error(`Maximum attempts (${maxAttempts}) reached.`);
    return;
  }

  if ((showHtml && !htmlCode.trim()) && (showJs && !jsCode.trim())) {
    toast.warning("Cannot submit empty code!");
    return;
  }

  setIsSubmitting(true);
  toast.success("Submitting code...", { autoClose: 2000 });

  try {
    // IMPORTANT: Only stop recording if this is the LAST question
    // Don't stop recording for intermediate submissions
    if (isRecording && isLastQuestion) {
      console.log('🛑 Stopping recording for final submission...');
      stopRecording();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

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
    
    // Submit the answer
    await axios.post('https://lms-server-ym1q.onrender.com/courses/answers/submit', payload, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });

    toast.success("Code submitted successfully!", { autoClose: 2000 });

    setUserAttempts(prev => prev + 1);
    if (!completedQuestions.includes(currentQuestionIndex)) {
      setCompletedQuestions(prev => [...prev, currentQuestionIndex]);
    }

    // If this is the last question, mark exercise as COMPLETED
    if (isLastQuestion) {
      // Clean up all media
      cleanupAllMedia();

      // Try to save recording silently
      if (recordedChunksRef.current.length > 0) {
        try {
          await saveRecordingSilently();
        } catch (error) {
          console.log('Final recording save failed:', error);
        }
      }

      // IMPORTANT: Update exercise status to COMPLETED in backend using lock endpoint
      try {
        await axios.post('https://lms-server-ym1q.onrender.com/exercise/lock', {
          courseId,
          exerciseId,
          category,
          subcategory,
          status: 'completed',
          reason: 'Assessment successfully completed by user',
          finalScore: ((completedQuestions.length + 1) / questions.length * 100).toFixed(2),
          totalQuestions: questions.length,
          completedQuestions: completedQuestions.length + 1
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✅ Exercise locked as completed in backend');
      } catch (error) {
        console.error('Failed to lock exercise as completed:', error);
        // Continue anyway - don't block user from finishing
      }

      // Show success modal
      setShowSubmissionSuccess(true);
      
      // Auto-redirect after 5 seconds
      const timer = setTimeout(() => {
        performExit();
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
  // 16. RENDER HELPERS
  // ---------------------------------------------------------------------------

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLimitReached = activeAttemptLimit && userAttempts >= maxAttempts;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // ---------------------------------------------------------------------------
  // 17. PROBLEMS LIST PANEL
  // ---------------------------------------------------------------------------
  const ProblemsListPanel = () => {
    const filteredAndSortedQuestions = getFilteredAndSortedProblems();

    return (
      <div className={`flex flex-col h-full ${theme === 'light' ? 'bg-white' : 'bg-zinc-900'}`}>
        {/* Header */}
        <div className={`p-3 border-b ${theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-zinc-800 bg-zinc-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold flex items-center gap-2 text-sm">
              <BookOpen size={16} className="text-blue-500" />
              Problems ({filteredAndSortedQuestions.length}/{questions.length})
            </h2>
            <button
              onClick={() => setIsProblemsListVisible(false)}
              className={`p-1.5 rounded transition-colors ${theme === 'light' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-zinc-700 text-zinc-400'}`}
              title="Close problems list"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mb-2">
            <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 ${theme === 'light' ? 'text-gray-400' : 'text-zinc-400'}`} />
            <input
              type="text"
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-6 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none ${theme === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-zinc-600 bg-zinc-900 text-white'}`}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-1 top-1/2 transform -translate-y-1/2">
                <X className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-gray-400' : 'text-zinc-400'}`} />
              </button>
            )}
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex items-center gap-2">
            {/* Difficulty Filter */}
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value as any)}
              className={`flex-1 text-xs border rounded px-2 py-1.5 ${theme === 'light' ? 'bg-white border-gray-300 text-gray-900' : 'bg-zinc-900 border-zinc-600 text-white'}`}
            >
              <option value="all">All</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            {/* Sort Button */}
            <button
              onClick={cycleSortOption}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs border rounded transition-colors ${theme === 'light' ? 'border-gray-300 hover:bg-gray-100' : 'border-zinc-600 hover:bg-zinc-700'}`}
              title={`Sort by: ${sortBy === 'default' ? 'Default Order' : sortBy === 'difficulty' ? 'Difficulty' : 'Title'}`}
            >
              <ArrowUpDown size={12} />
              <span>{getSortIcon()}</span>
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto">
          {filteredAndSortedQuestions.length === 0 ? (
            <div className="p-4 text-center">
              <div className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-zinc-400'}`}>
                No problems found
                {filterDifficulty !== 'all' && ` for "${filterDifficulty}" difficulty`}
                {searchQuery && ` matching "${searchQuery}"`}
              </div>
            </div>
          ) : (
            filteredAndSortedQuestions.map((question, filteredIndex) => {
              const originalIndex = questions.findIndex(
                q => 
                  (q._id && question._id && q._id === question._id) ||
                  (q.questionId && question.questionId && q.questionId === question.questionId) ||
                  (q.title && question.title && q.title === question.title)
              );
              
              const isCurrent = originalIndex === currentQuestionIndex;
              const difficulty = question.difficulty || 'Medium';

              return (
                <button
                  key={question._id || question.questionId || filteredIndex}
                  onClick={() => {
                    if (originalIndex !== -1) {
                      setCurrentQuestionIndex(originalIndex);
                      setTimeout(() => {
                        fetchUserAnswer();
                      }, 100);
                    } else {
                      const fallbackIndex = filteredIndex;
                      if (fallbackIndex < questions.length) {
                        setCurrentQuestionIndex(fallbackIndex);
                      }
                    }
                  }}
                  className={`w-full p-3 text-left transition-colors border-b ${
                    isCurrent
                      ? theme === 'light' 
                        ? 'bg-blue-100 border-l-4 border-l-blue-500' 
                        : 'bg-blue-900/30 border-l-4 border-l-blue-500'
                      : theme === 'light'
                        ? 'hover:bg-gray-50 border-l-4 border-l-transparent'
                        : 'hover:bg-zinc-800 border-l-4 border-l-transparent'
                  } ${theme === 'light' ? 'border-gray-100' : 'border-zinc-800'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          isCurrent
                            ? 'bg-blue-500 text-white'
                            : theme === 'light'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-zinc-700 text-zinc-300'
                        }`}>
                          {filteredIndex + 1}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                            {question.title}
                          </div>
                          <div className="mt-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              difficulty === 'Easy' || difficulty === 'easy'
                                ? theme === 'light'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-green-900/40 text-green-300'
                                : difficulty === 'Medium' || difficulty === 'medium'
                                  ? theme === 'light'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-yellow-900/40 text-yellow-300'
                                  : theme === 'light'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-red-900/40 text-red-300'
                            }`}>
                              {difficulty}
                            </span>
                            {completedQuestions.includes(originalIndex) && originalIndex !== -1 && (
                              <span className="ml-2 inline-block">
                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 mt-1 ${theme === 'light' ? 'text-gray-400' : 'text-zinc-400'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // 18. QUESTION PANEL
  // ---------------------------------------------------------------------------
  const QuestionPanel = () => {
    return (
      <div className={`flex flex-col h-full relative ${theme === 'light' ? 'bg-white' : 'bg-zinc-900'}`}>
        {/* Header */}
        <div className={`p-3 border-b flex items-center justify-between ${theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-zinc-800 bg-zinc-800'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsProblemsListVisible(!isProblemsListVisible)}
              className={`p-1.5 rounded transition-colors ${theme === 'light' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-zinc-700 text-zinc-400'}`}
              title={isProblemsListVisible ? "Hide problems list" : "Show problems list"}
            >
              <Menu size={18} />
            </button>
            <div>
              <h2 className="font-bold text-sm flex items-center gap-2">
                {currentQuestion ? currentQuestion.title : `Question ${currentQuestionIndex + 1}`}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
                {currentQuestion?.difficulty && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'easy'
                      ? theme === 'light' ? 'bg-green-100 text-green-800' : 'bg-green-900/30 text-green-300'
                      : currentQuestion.difficulty === 'Medium' || currentQuestion.difficulty === 'medium'
                        ? theme === 'light' ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-900/30 text-yellow-300'
                        : theme === 'light' ? 'bg-red-100 text-red-800' : 'bg-red-900/30 text-red-300'
                  }`}>
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsProblemsListVisible(!isProblemsListVisible)}
            className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${theme === 'light' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'}`}
          >
            <BookOpen size={12} />
            {isProblemsListVisible ? "Hide Problems" : "Show Problems"}
          </button>
        </div>

        {/* Scrollable Question Description Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentQuestion ? (
            <>
              <div className="mb-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {completedQuestions.includes(currentQuestionIndex) && (
                      <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${theme === 'light' ? 'bg-green-100 text-green-800' : 'bg-green-900/30 text-green-300'}`}>
                        <CheckCircle className="w-3 h-3" />
                        Submitted
                      </span>
                    )}
                  </div>
                </div>

                <div className={`leading-relaxed whitespace-pre-wrap text-sm ${theme === 'light' ? 'text-gray-700' : 'text-zinc-300'}`}>
                  {currentQuestion.description || "No description provided."}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 opacity-50 text-sm">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Loading question {currentQuestionIndex + 1}...</p>
              <button
                onClick={() => setIsProblemsListVisible(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Open Problems List
              </button>
            </div>
          )}
        </div>

        {/* Fixed Navigation and Submit Section at Bottom */}
        <div className={`border-t p-4 shrink-0 ${theme === 'light' ? 'border-gray-200 bg-white' : 'border-zinc-800 bg-zinc-800'}`}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newIndex = Math.max(0, currentQuestionIndex - 1);
                  setCurrentQuestionIndex(newIndex);
                }}
                disabled={currentQuestionIndex === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 rounded transition-colors"
              >
                <ArrowLeft size={12} />
                Previous
              </button>

              <button
                onClick={handleSubmitQuestion}
                disabled={isSubmitting || (isAssessmentMode && activeAttemptLimit && userAttempts >= maxAttempts)}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 rounded transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="w-3 h-3 animate-spin" />
                    Submitting...
                  </>
                ) : isLastQuestion ? (
                  <>
                    <Check size={12} />
                    Submit & Finish
                  </>
                ) : (
                  <>
                    <Save size={12} />
                    Submit
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const newIndex = Math.min(questions.length - 1, currentQuestionIndex + 1);
                  setCurrentQuestionIndex(newIndex);
                }}
                disabled={currentQuestionIndex === questions.length - 1}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded transition-colors"
              >
                Next
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs mt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${completedQuestions.includes(currentQuestionIndex) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={theme === 'light' ? 'text-gray-600' : 'text-zinc-400'}>
                    {completedQuestions.includes(currentQuestionIndex) ? 'Submitted' : 'Not submitted'}
                  </span>
                </div>
                {activeAttemptLimit && (
                  <span className={`px-2 py-1 rounded ${isLimitReached ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    Attempts: {userAttempts}/{maxAttempts}
                  </span>
                )}
              </div>
              {isLastQuestion && (
                <span className="text-green-600 font-medium">
                  ✓ Complete all questions to finish
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // 19. MODAL RENDERING - FIXED: Check isLocked before showing security agreement
  // ---------------------------------------------------------------------------

  // Show security agreement modal only if assessment mode, not locked, and not yet agreed
  // if (showSecurityAgreement && isAssessmentMode && !hasAgreedToSecurity && !isLocked) {
  //   return (
  //     <SecurityAgreementModal
  //       isOpen={showSecurityAgreement}
  //       onAgree={handleSecurityAgreement}
  //       onCancel={handleCancelAssessment}
  //       securitySettings={activeSecurity}
  //       theme={theme === 'vs-dark' ? 'dark' : 'light'}
  //     />
  //   );
  // }

  // Show submission success modal
  if (showSubmissionSuccess) {
    return (
      <SubmissionSuccessModal
        isOpen={showSubmissionSuccess}
        onConfirm={performExit}
        theme={theme === 'vs-dark' ? 'dark' : 'light'}
      />
    );
  }
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
        <button onClick={performExit} className="bg-gray-800 px-6 py-2 rounded-lg hover:bg-gray-900 text-white font-bold transition-colors">
          Exit to Course
        </button>
      </div>
    </div>
  );
}

// 2. SECOND: Show submission success modal
if (showSubmissionSuccess) {
  return (
    <SubmissionSuccessModal
      isOpen={showSubmissionSuccess}
      onConfirm={performExit}
      theme={theme === 'vs-dark' ? 'dark' : 'light'}
    />
  );
}

// 3. THIRD: Show start screen if assessment mode and not started
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
          <p className="text-gray-600 mt-2 text-sm">Please review the security settings before starting.</p>
        </div>

        <div className="space-y-3 mb-8 text-sm flex-1 overflow-y-auto pr-2">

          {activeSecurity.timerEnabled && (
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
              <Clock className="text-amber-500 shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">Time Limit Enforced</span>
                <span className="text-xs text-gray-600">Total duration: {activeSecurity.timerDuration} minutes.</span>
              </div>
            </div>
          )}

          {activeSecurity.fullScreenMode && (
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
              <Maximize2 className="text-blue-500 shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">Full Screen Required</span>
                <span className="text-xs text-gray-600">Exiting full screen mode may terminate the session.</span>
              </div>
            </div>
          )}

          {activeSecurity.cameraMicEnabled && (
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
              <Camera className="text-purple-500 shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">Camera Monitoring</span>
                <span className="text-xs text-gray-600">Webcam access is required and will be recorded.</span>
              </div>
            </div>
          )}

          {activeSecurity.screenRecordingEnabled && (
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
              <Monitor className="text-green-500 shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">Screen Recording</span>
                <span className="text-xs text-gray-600">Your screen will be recorded with camera overlay.</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
            <Eye className="text-orange-500 shrink-0" size={20} />
            <div className="flex flex-col">
              <span className="font-bold text-gray-900">Tab Focus Monitoring</span>
              <span className="text-xs text-gray-600">
                {!activeSecurity.tabSwitchAllowed
                  ? "Strict Mode: Tab switching is strictly prohibited."
                  : `Allowed with limit: Max ${activeSecurity.maxTabSwitches || 'unlimited'} switches.`
                }
              </span>
            </div>
          </div>

          {activeSecurity.disableClipboard && (
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
              <MousePointerClick className="text-pink-500 shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">Clipboard Disabled</span>
                <span className="text-xs text-gray-600">Copy, Cut, and Paste actions are blocked.</span>
              </div>
            </div>
          )}

          {activeAttemptLimit && (
            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <div className="flex flex-col">
                <span className="font-bold text-gray-900">Attempt Limit</span>
                <span className="text-xs text-gray-600">You have a maximum of {maxAttempts} submission attempts.</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Security Agreement</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              By clicking "Start Assessment", you agree to all security measures listed above.
              Violations may result in immediate termination of your assessment.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>I understand and agree to the security requirements</span>
            </div>
          </div>

          <button onClick={handleSecurityAgreement} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
            <span>Start Assessment</span> <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

  // ---------------------------------------------------------------------------
  // 20. MAIN EDITOR RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className={`flex flex-col h-full ${theme === 'light' ? 'bg-white text-gray-800' : 'bg-[#1e1e1e] text-white'} ${isUIFullscreen && !activeSecurity.fullScreenMode ? 'fixed inset-0 z-50' : ''}`}>
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
        <div className="flex items-center gap-4">
          <button
            onClick={performExit}
            className={`hover:opacity-75 ${theme === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-zinc-400 hover:text-white'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="font-semibold text-sm flex items-center gap-2">
              {title}
              {isAssessmentMode && <span className="text-xs bg-red-100 text-red-700 px-1.5 rounded border border-red-200">Assessment</span>}
            </h1>
            {activeAttemptLimit && (
              <span className={`text-xs font-mono flex items-center gap-1 ${isLimitReached ? 'text-red-600' : 'text-gray-600'}`}>
                {isLimitReached && <AlertTriangle className="w-3 h-3" />} Attempts: {userAttempts} / {maxAttempts}
              </span>
            )}
          </div>
          <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
            {isSidebarVisible ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer Display */}
          {activeSecurity.timerEnabled && timeLeft !== null && isAssessmentMode && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono font-medium ${timeLeft < 60 ? 'bg-red-600 animate-pulse text-white' : 'bg-gray-900 text-amber-400'}`}>
              <Clock size={14} /> {formatTime(timeLeft)}
            </div>
          )}

          {/* Security Status Indicators */}
          {isAssessmentMode && (
            <div className="flex items-center gap-2">
              {/* Recording Status */}
              {isRecording && (
                <div className="flex items-center gap-1.5 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>REC</span>
                  <span className="text-xs">({activeSecurity.screenRecordingEnabled ? 'Screen' : 'Camera'})</span>
                </div>
              )}

              {/* Tab Switch Counter */}
              {tabSwitchCount > 0 && activeSecurity.tabSwitchAllowed && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${tabSwitchCount >= (activeSecurity.maxTabSwitches || 3) ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  <Eye size={12} />
                  <span>Tab Switches: {tabSwitchCount}/{activeSecurity.maxTabSwitches || 3}</span>
                </div>
              )}

              {/* Camera Preview */}
              {activeSecurity.cameraMicEnabled && cameraStream && (
                <div className="relative">
                  <div className="w-20 h-12 bg-black rounded border border-gray-300 overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Video error:', e)}
                    />
                  </div>
                  {!micEnabled && (
                    <div className="absolute bottom-1 right-1">
                      <MicOff className="w-3 h-3 text-red-500 bg-white rounded-full p-0.5" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 relative">
            {/* Auto-run toggle */}
            <button onClick={() => setAutoRun(!autoRun)} className={`p-2 rounded-lg border transition-all ${autoRun ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'text-gray-500 border-transparent hover:bg-gray-100'}`} title="Toggle Auto-Run">
              <Zap className={`w-4 h-4 ${autoRun ? 'fill-current' : ''}`} />
            </button>

            {/* Run button */}
            <button onClick={compileCode} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold flex items-center gap-2 text-white">
              <Play className="w-3 h-3" /> Run
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors relative ${showSettings ? 'bg-blue-500/10 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Settings menu */}
            {showSettings && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                <div className={`absolute top-12 right-0 w-80 rounded-xl shadow-2xl border ${colors.border} ${colors.panel} z-50 p-5 animate-in slide-in-from-top-2 duration-200 max-h-[80vh] overflow-y-auto`}>
                  <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-3 border-b">
                    <h3 className="text-sm font-bold text-gray-900">Editor Settings</h3>
                    <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Interface Layout</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setLayoutMode('standard')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${layoutMode === 'standard' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 opacity-60 hover:opacity-100 hover:border-gray-400'}`}>
                          <Sidebar className="w-5 h-5" />
                          <span className="text-xs font-semibold text-gray-600">Standard</span>
                        </button>
                        <button onClick={() => setLayoutMode('bottom-question')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${layoutMode === 'bottom-question' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 opacity-60 hover:opacity-100 hover:border-gray-400'}`}>
                          <LayoutIcon className="w-5 h-5 rotate-180" />
                          <span className="text-xs font-semibold text-gray-600">Bottom Dock</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Editor Style</label>
                      <div className="flex p-1 rounded-lg bg-gray-100">
                        <button onClick={() => setEditorViewMode('tabbed')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${editorViewMode === 'tabbed' ? 'bg-gray-800 shadow-sm text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                          <MonitorPlay className="w-3.5 h-3.5" /> Tabs
                        </button>
                        <button onClick={() => setEditorViewMode('split')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${editorViewMode === 'split' ? 'bg-gray-800 shadow-sm text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                          <Columns className="w-3.5 h-3.5" /> Split
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-gray-200" />

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Active Languages</label>
                      <div className="flex flex-wrap gap-2">
                        <div className={`px-2.5 py-1.5 rounded text-xs font-medium ${showHtml ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-400'}`}>HTML</div>
                        <div className={`px-2.5 py-1.5 rounded text-xs font-medium ${showCss ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-400'}`}>CSS</div>
                        <div className={`px-2.5 py-1.5 rounded text-xs font-medium ${showJs ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-gray-100 text-gray-400'}`}>JS</div>
                        <div className={`px-2.5 py-1.5 rounded text-xs font-medium ${enableBootstrap ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-400'}`}>Bootstrap</div>
                      </div>
                    </div>

                    <div className="h-px bg-gray-200" />

                    <div>
                      <div className="flex justify-between text-xs mb-2 font-medium">
                        <span className="text-gray-600">Font Size</span>
                        <span className="text-blue-600">{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="20"
                        step="1"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Small</span>
                        <span>Medium</span>
                        <span>Large</span>
                      </div>
                    </div>

                    {!isAssessmentMode && (
                      <ToggleSwitch checked={isUIFullscreen} onChange={setIsUIFullscreen} label="Editor Fullscreen" />
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Theme</span>
                      <button
                        onClick={() => setTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark')}
                        className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 flex items-center gap-2"
                      >
                        {theme === 'vs-dark' ? <Moon size={14} /> : <Sun size={14} />}
                        <span className="text-xs font-medium">
                          {theme === 'vs-dark' ? 'Dark' : 'Light'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Exit button */}
            <button
              onClick={performExit}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${isAssessmentMode
                  ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-900 text-white"
                }`}
            >
              <LogOut size={14} className="inline mr-1" />
              {isAssessmentMode ? "Finish" : "Exit"}
            </button>
          </div>
        </div>
      </header>

      {/* Main resizable container */}
      <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
        
        {/* Only show both panels when sidebar is visible */}
        {isSidebarVisible && (
          <>
            {/* Column 1: Problems List - Only show if isProblemsListVisible is true */}
            {isProblemsListVisible && (
              <div style={{ width: leftPanelWidth }} className="flex flex-col shrink-0 relative border-r border-gray-200">
                <ProblemsListPanel />
                <div 
                  ref={leftResizerRef}
                  className="absolute right-0 top-0 bottom-0 w-1 hover:bg-blue-500 cursor-col-resize z-10 flex items-center justify-center transition-colors active:bg-blue-500"
                >
                  <GripVertical className="w-3 h-3 text-gray-400" />
                </div>
              </div>
            )}

            {/* Column 2: Question Description - Always show when sidebar is visible */}
            <div style={{ width: 400 }} className={`flex flex-col shrink-0 relative ${isProblemsListVisible ? 'border-r border-gray-200' : ''} ${theme === 'light' ? 'bg-white' : 'bg-zinc-900'}`}>
              <QuestionPanel />
            </div>
          </>
        )}

        {/* Column 3: Editor (HTML/CSS/JS) - Always visible */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          
          {/* Editor Header (Tabs) */}
          {editorViewMode === 'tabbed' && (
            <div className={`h-10 border-b flex items-center px-2 gap-1 ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#1e1e1e] border-zinc-700'}`}>
              {showHtml && (
                <button 
                  onClick={() => setActiveTab('html')} 
                  className={`flex items-center gap-2 px-4 h-full text-xs border-t-2 ${activeTab === 'html' ? 'border-orange-500 bg-white text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Code2 size={14} className="text-orange-500"/> HTML
                </button>
              )}
              {showCss && (
                <button 
                  onClick={() => setActiveTab('css')} 
                  className={`flex items-center gap-2 px-4 h-full text-xs border-t-2 ${activeTab === 'css' ? 'border-blue-500 bg-white text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Palette size={14} className="text-blue-500"/> CSS
                </button>
              )}
              {showJs && (
                <button 
                  onClick={() => setActiveTab('js')} 
                  className={`flex items-center gap-2 px-4 h-full text-xs border-t-2 ${activeTab === 'js' ? 'border-yellow-500 bg-white text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Terminal size={14} className="text-yellow-500"/> JS
                </button>
              )}
            </div>
          )}

          <div className="flex-1 relative bg-white flex">
            {isFetching && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/80">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin"/>
              </div>
            )}
            
            {/* Editor View Logic */}
            {editorViewMode === 'tabbed' ? (
              <div className="w-full h-full">
                {activeTab === 'html' && showHtml && (
                  <MonacoEditor 
                    height="100%" 
                    language="html" 
                    theme={theme} 
                    value={htmlCode} 
                    onChange={(v) => setHtmlCode(v || "")} 
                    options={{ 
                      fontSize, 
                      minimap: { enabled: false },
                      readOnly: isAssessmentMode && !hasStarted,
                      automaticLayout: true
                    }} 
                  />
                )}
                {activeTab === 'css' && showCss && (
                  <MonacoEditor 
                    height="100%" 
                    language="css" 
                    theme={theme} 
                    value={cssCode} 
                    onChange={(v) => setCssCode(v || "")} 
                    options={{ 
                      fontSize, 
                      minimap: { enabled: false },
                      readOnly: isAssessmentMode && !hasStarted,
                      automaticLayout: true
                    }} 
                  />
                )}
                {activeTab === 'js' && showJs && (
                  <MonacoEditor 
                    height="100%" 
                    language="javascript" 
                    theme={theme} 
                    value={jsCode} 
                    onChange={(v) => setJsCode(v || "")} 
                    options={{ 
                      fontSize, 
                      minimap: { enabled: false },
                      readOnly: isAssessmentMode && !hasStarted,
                      automaticLayout: true
                    }} 
                  />
                )}
              </div>
            ) : (
              /* Split View */
              <div className="flex w-full h-full">
                {showHtml && (
                  <div className="flex-1 border-r border-gray-200 flex flex-col">
                    <div className="bg-gray-50 px-2 py-1 text-xs text-orange-600 font-medium border-b border-gray-200">HTML</div>
                    <div className="flex-1">
                      <MonacoEditor 
                        height="100%" 
                        language="html" 
                        theme={theme} 
                        value={htmlCode} 
                        onChange={(v) => setHtmlCode(v || "")} 
                        options={{ 
                          fontSize, 
                          minimap: { enabled: false },
                          readOnly: isAssessmentMode && !hasStarted,
                          automaticLayout: true
                        }} 
                      />
                    </div>
                  </div>
                )}
                {showCss && (
                  <div className="flex-1 border-r border-gray-200 flex flex-col">
                    <div className="bg-gray-50 px-2 py-1 text-xs text-blue-600 font-medium border-b border-gray-200">CSS</div>
                    <div className="flex-1">
                      <MonacoEditor 
                        height="100%" 
                        language="css" 
                        theme={theme} 
                        value={cssCode} 
                        onChange={(v) => setCssCode(v || "")} 
                        options={{ 
                          fontSize, 
                          minimap: { enabled: false },
                          readOnly: isAssessmentMode && !hasStarted,
                          automaticLayout: true
                        }} 
                      />
                    </div>
                  </div>
                )}
                {showJs && (
                  <div className="flex-1 flex flex-col">
                    <div className="bg-gray-50 px-2 py-1 text-xs text-yellow-600 font-medium border-b border-gray-200">JavaScript</div>
                    <div className="flex-1">
                      <MonacoEditor 
                        height="100%" 
                        language="javascript" 
                        theme={theme} 
                        value={jsCode} 
                        onChange={(v) => setJsCode(v || "")} 
                        options={{ 
                          fontSize, 
                          minimap: { enabled: false },
                          readOnly: isAssessmentMode && !hasStarted,
                          automaticLayout: true
                        }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Column 4: Live Preview - Always visible */}
        <div style={{ width: rightPanelWidth }} className={`flex flex-col min-w-0 relative border-l ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-white border-zinc-700'}`}>
          <div
            ref={rightResizerRef}
            className="absolute left-0 top-0 bottom-0 w-1 -ml-0.5 hover:bg-blue-500 cursor-col-resize z-10 flex items-center justify-center transition-colors active:bg-blue-500"
          >
            <GripVertical className="w-3 h-3 text-gray-400" />
          </div>

          <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-4 text-xs text-gray-600 gap-2 font-medium pl-3">
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