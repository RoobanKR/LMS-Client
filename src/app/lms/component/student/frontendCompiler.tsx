"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { 
  Maximize2, Clock, Camera, ChevronLeft, XCircle, Play, Layout as LayoutIcon, 
  BookOpen, ArrowLeft, ArrowRight, Save, 
  CheckCircle, LogOut, AlertTriangle, Loader2, Settings, X, 
  GripVertical, Code2, Palette, Terminal, Moon, Sun, Sidebar, Columns, MonitorPlay, 
  PanelLeftClose, PanelLeftOpen, Zap, ShieldAlert, Eye, MousePointerClick
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- DYNAMIC IMPORTS ---
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-zinc-500 gap-2">
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
    {label && <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>}
    <div className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${checked ? 'bg-blue-600' : 'bg-slate-600'}`}>
      <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  </div>
);

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
    const normCategory = (category || "").replace('_', ' ').toLowerCase().trim();
    return normCategory === 'you do';
  }, [category]);

  const activeSecurity = useMemo(() => {
    if (!isAssessmentMode) {
      return {
        timerEnabled: false, cameraMicEnabled: false, restrictMinimize: false,
        fullScreenMode: false, tabSwitchAllowed: true, disableClipboard: false, maxTabSwitches: 9999
      };
    }
    return security;
  }, [isAssessmentMode, security]);

  const activeAttemptLimit = isAssessmentMode ? attemptLimitEnabled : false;

  // ---------------------------------------------------------------------------
  // 3. STATE
  // ---------------------------------------------------------------------------
  const [layoutMode, setLayoutMode] = useState<'standard' | 'bottom-question'>('standard');
  const [editorViewMode, setEditorViewMode] = useState<'tabbed' | 'split'>('tabbed');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  const [leftPanelWidth, setLeftPanelWidth] = useState(350);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(40);
  const [rightPanelWidth, setRightPanelWidth] = useState(500);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);
  const isResizingBottom = useRef(false);

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [isLocked, setIsLocked] = useState(false); 
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasStarted, setHasStarted] = useState(!isAssessmentMode);
  
  const [showQuestions, setShowQuestions] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [userAttempts, setUserAttempts] = useState(0);
  const [autoRun, setAutoRun] = useState(true);
  
  const [fontSize, setFontSize] = useState(14);
  const [showSettings, setShowSettings] = useState(false);
  const [isUIFullscreen, setIsUIFullscreen] = useState(false);
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [srcDoc, setSrcDoc] = useState("");

  const currentQuestion = questions && questions.length > 0 ? questions[currentQuestionIndex] : null;
  const colors = { border: theme === 'light' ? "border-slate-200" : "border-zinc-700", panel: theme === 'light' ? "bg-white" : "bg-zinc-800" };

  // ---------------------------------------------------------------------------
  // 4. CHECK INITIAL STATUS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const checkExerciseStatus = async () => {
      if (!isAssessmentMode || !courseId || !exerciseId) return;

      try {
        const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
        const response = await axios.get('http://localhost:5533/exercise/status', {
          params: { courseId, exerciseId, category, subcategory },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          const { isLocked, status } = response.data.data;
          
          if (isLocked || status === 'terminated') {
            setIsLocked(true);
            setHasStarted(false);
            setTerminationReason("This exercise is locked. You have been terminated or have already completed it.");
            setIsTerminated(true);
          }
        }
      } catch (error) {
        console.error("Status check failed", error);
      }
    };

    checkExerciseStatus();
  }, [courseId, exerciseId, category, subcategory, isAssessmentMode]);

  // ---------------------------------------------------------------------------
  // 5. CLEANUP & EXIT LOGIC (FIXED)
  // ---------------------------------------------------------------------------
  
  const handleSafeExit = useCallback((skipConfirm = false) => {
    // FIX: Ensure confirmation is shown unless explicitly skipped
    if (!skipConfirm) {
      const msg = isAssessmentMode 
        ? "Are you sure you want to exit? Your progress on this question will be saved." 
        : "Exit Exercise?";
      
      // If user clicks "Cancel", do nothing
      if (!window.confirm(msg)) return;
    }

    // Cleanup Media
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
    }

    // Cleanup Fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Trigger Parent Navigation
    onBack();
  }, [isAssessmentMode, cameraStream, onBack]);

  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    };
  }, [cameraStream]);

  // ---------------------------------------------------------------------------
  // 6. COMPILE LOGIC
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
  // 7. RESIZING LOGIC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const minWidth = 250;
      
      if (isResizingLeft.current) {
        let newWidth = e.clientX - containerRect.left;
        if (newWidth < minWidth) newWidth = minWidth;
        setLeftPanelWidth(newWidth);
      } 
      
      if (isResizingRight.current) {
        let newWidth = containerRect.right - e.clientX;
        if (newWidth < minWidth) newWidth = minWidth;
        setRightPanelWidth(newWidth);
      }

      if (isResizingBottom.current) {
         const newHeight = ((containerRect.bottom - e.clientY) / containerRect.height) * 100;
         setBottomPanelHeight(Math.min(Math.max(20, newHeight), 60));
      }
    };

    const handleMouseUp = () => {
      isResizingLeft.current = false;
      isResizingRight.current = false;
      isResizingBottom.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 8. FETCHING & SUBMISSION (FIXED FOR LAST QUESTION)
  // ---------------------------------------------------------------------------
  const fetchUserAnswer = async () => {
    if (!courseId || !exerciseId) return;
    const qId = currentQuestion?._id || currentQuestion?.questionId;
    if (!qId) return;

    setIsFetching(true);

    try {
      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
      const response = await axios.get('http://localhost:5533/courses/answers/single', {
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
    const toastId = toast.loading("Submitting...");

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
      await axios.post('http://localhost:5533/courses/answers/submit', payload, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      // --- LOGIC CHANGE START ---
      setUserAttempts(prev => prev + 1);
      if (!completedQuestions.includes(currentQuestionIndex)) {
        setCompletedQuestions(prev => [...prev, currentQuestionIndex]);
      }

      // Check if this is the last question
      if (currentQuestionIndex === questions.length - 1) {
        toast.update(toastId, { render: "All Questions Completed! Exiting...", type: "success", isLoading: false, autoClose: 2000 });
        
        // Wait 1.5s for user to read message, then auto-exit
        setTimeout(() => {
           handleSafeExit(true); // true = skip confirmation logic
        }, 1500);

      } else {
        toast.update(toastId, { render: "Submitted Successfully!", type: "success", isLoading: false, autoClose: 3000 });
        // Optional: Uncomment next line to auto-move to next question
        // setCurrentQuestionIndex(prev => prev + 1);
      }
      // --- LOGIC CHANGE END ---

    } catch (error: any) {
      if (error.response?.status === 403) toast.update(toastId, { render: "Max attempts reached!", type: "error", isLoading: false });
      else toast.update(toastId, { render: "Submission failed.", type: "error", isLoading: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 9. SECURITY EFFECTS (TERMINATION & LOCKING)
  // ---------------------------------------------------------------------------
  
  const handleTermination = useCallback(async (reason: string) => {
    if (!isAssessmentMode) return;
    
    setIsTerminated(true);
    setIsLocked(true);
    setHasStarted(false);
    setTerminationReason(reason);
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
    }
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }

    try {
       const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
       await axios.post('http://localhost:5533/exercise/lock', {
         courseId, 
         exerciseId,
         category, 
         subcategory,
         status: 'terminated',
         reason: reason
       }, {
         headers: { Authorization: `Bearer ${token}` }
       });
    } catch (err) {
       console.error("Failed to lock exercise in backend:", err);
    }

  }, [isAssessmentMode, cameraStream, courseId, exerciseId, category, subcategory]);

  // Timer
  useEffect(() => {
    if (!hasStarted || !activeSecurity.timerEnabled) return;
    if (timeLeft === null && activeSecurity.timerDuration) setTimeLeft(activeSecurity.timerDuration * 60);
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
  }, [activeSecurity.timerEnabled, hasStarted, handleTermination]);

  // Tab Switch
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

  // Clipboard
  useEffect(() => {
    if (!hasStarted || !activeSecurity.disableClipboard || !isAssessmentMode) return;
    const prevent = (e: Event) => { e.preventDefault(); toast.error("Copy/Paste Disabled"); };
    window.addEventListener('copy', prevent); window.addEventListener('paste', prevent); window.addEventListener('cut', prevent);
    return () => { window.removeEventListener('copy', prevent); window.removeEventListener('paste', prevent); window.removeEventListener('cut', prevent); };
  }, [activeSecurity.disableClipboard, hasStarted, isAssessmentMode]);

  // Full Screen
  useEffect(() => {
    if (!hasStarted || !activeSecurity.fullScreenMode || !isAssessmentMode) return;
    const checkFS = () => { if (!document.fullscreenElement) toast.error("Maintain Full Screen!"); };
    document.addEventListener('fullscreenchange', checkFS);
    return () => document.removeEventListener('fullscreenchange', checkFS);
  }, [activeSecurity.fullScreenMode, hasStarted, isAssessmentMode]);

  // Camera
  useEffect(() => {
    if (hasStarted && activeSecurity.cameraMicEnabled && !cameraStream && isAssessmentMode) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => { setCameraStream(stream); if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(() => toast.error("Camera required"));
    }
  }, [activeSecurity.cameraMicEnabled, hasStarted, isAssessmentMode, cameraStream]);

  // UI Fullscreen
  useEffect(() => {
    if (isUIFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => setIsUIFullscreen(false));
    } else if (!isUIFullscreen && document.fullscreenElement && !activeSecurity.fullScreenMode) {
      document.exitFullscreen().catch(() => {});
    }
  }, [isUIFullscreen, activeSecurity.fullScreenMode]);

  // ---------------------------------------------------------------------------
  // 10. RENDER HELPERS
  // ---------------------------------------------------------------------------
  
  const handleStartExercise = async () => {
    if (isLocked) {
        toast.error("This exercise is locked.");
        return;
    }
    if (activeSecurity.fullScreenMode) {
      try { await document.documentElement.requestFullscreen(); } 
      catch { toast.error("Full screen required."); return; }
    }
    setHasStarted(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLimitReached = activeAttemptLimit && userAttempts >= maxAttempts;

  // Question Panel
  const QuestionPanel = () => (
    <div className={`flex flex-col h-full border-r relative ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-700'}`}>
      <div className={`p-4 border-b flex justify-between items-center ${theme === 'light' ? 'border-slate-200' : 'border-zinc-800'}`}>
        <h2 className="font-bold flex items-center gap-2 text-sm"><BookOpen size={16} className="text-blue-500"/> Problem</h2>
        <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">{currentQuestionIndex + 1} / {questions.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {currentQuestion ? (
          <>
            <div className="mb-2">
              <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold mb-2">{currentQuestion.title}</h3>
                    {completedQuestions.includes(currentQuestionIndex) && <CheckCircle size={16} className="text-green-500 mt-1" />}
              </div>
              <div className="flex gap-2 mb-4">
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider">Score: {currentQuestion.score || 10}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">{currentQuestion.difficulty || 'Medium'}</span>
              </div>
            </div>
            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${theme === 'light' ? 'text-slate-600' : 'text-zinc-400'}`}>{currentQuestion.description || "No description provided."}</div>
            {currentQuestion.sampleInput && <div className="bg-black/80 p-3 rounded border border-zinc-700 mt-4 text-white"><span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">Sample Input</span><code className="font-mono text-sm whitespace-pre-wrap">{currentQuestion.sampleInput}</code></div>}
            {currentQuestion.sampleOutput && <div className="bg-black/80 p-3 rounded border border-zinc-700 mt-2 text-white"><span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">Sample Output</span><code className="font-mono text-green-400 text-sm whitespace-pre-wrap">{currentQuestion.sampleOutput}</code></div>}
          </>
        ) : <div className="text-center text-sm py-10 opacity-50">No active question found.</div>}
      </div>
      <div className={`p-3 border-t flex gap-2 ${theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-900'}`}>
          <button onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))} disabled={currentQuestionIndex === 0} className="w-10 flex items-center justify-center rounded text-sm font-medium bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white"><ArrowLeft size={16} /></button>
          <button onClick={handleSubmitQuestion} disabled={isSubmitting || (isAssessmentMode && activeAttemptLimit && userAttempts >= maxAttempts)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:bg-zinc-700 disabled:cursor-not-allowed">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : (isAssessmentMode && activeAttemptLimit && userAttempts >= maxAttempts) ? <span>Limit Reached</span> : <><Save size={16}/> {currentQuestionIndex === questions.length - 1 ? "Submit & Finish" : "Submit Question"}</>}
          </button>
          <button onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))} disabled={currentQuestionIndex === questions.length - 1} className="w-10 flex items-center justify-center rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-zinc-800 text-white"><ArrowRight size={16} /></button>
      </div>
    </div>
  );

  // --- MAIN RENDER ---
  
  if (isTerminated || isLocked) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white p-4">
        <div className="bg-zinc-800 p-8 rounded border border-red-600 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Terminated</h2>
          <p className="text-red-200 mb-6">{terminationReason || "You have been locked out of this exercise."}</p>
          <button onClick={() => handleSafeExit(true)} className="bg-zinc-700 px-6 py-2 rounded hover:bg-zinc-600 font-bold transition-colors">
            Exit to Course
          </button>
        </div>
      </div>
    );
  }

  // --- START SCREEN ---
  if (!hasStarted && isAssessmentMode) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white relative">
        <button onClick={onBack} className="absolute top-4 left-4 flex items-center gap-2 text-zinc-400 hover:text-white"><ChevronLeft size={20}/> Back</button>
        <div className="max-w-xl w-full bg-zinc-800 p-8 rounded-xl shadow-2xl border border-zinc-700 flex flex-col max-h-[90vh]">
          
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2 text-blue-400">{title}</h1>
            <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-900/50 text-red-200 text-xs border border-red-800 uppercase font-bold flex items-center gap-2">
                   <ShieldAlert size={12}/> Assessment Mode
                </span>
            </div>
            <p className="text-zinc-400 mt-2 text-sm">The following security protocols are active for this session.</p>
          </div>

          <div className="space-y-3 mb-8 text-sm flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {activeSecurity.timerEnabled && (
                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded border border-zinc-700/50">
                    <Clock className="text-amber-500 shrink-0" size={20}/>
                    <div className="flex flex-col">
                        <span className="font-bold text-zinc-200">Time Limit Enforced</span>
                        <span className="text-xs text-zinc-400">Total duration: {activeSecurity.timerDuration} minutes.</span>
                    </div>
                </div>
            )}
            {activeSecurity.fullScreenMode && (
                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded border border-zinc-700/50">
                    <Maximize2 className="text-blue-500 shrink-0" size={20}/>
                    <div className="flex flex-col">
                        <span className="font-bold text-zinc-200">Full Screen Required</span>
                        <span className="text-xs text-zinc-400">Exiting full screen mode may terminate the session.</span>
                    </div>
                </div>
            )}
            {activeSecurity.cameraMicEnabled && (
                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded border border-zinc-700/50">
                    <Camera className="text-purple-500 shrink-0" size={20}/>
                    <div className="flex flex-col">
                        <span className="font-bold text-zinc-200">Camera Monitoring</span>
                        <span className="text-xs text-zinc-400">Webcam access is required and will be recorded.</span>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded border border-zinc-700/50">
                <Eye className="text-orange-500 shrink-0" size={20}/>
                <div className="flex flex-col">
                    <span className="font-bold text-zinc-200">Tab Focus Monitoring</span>
                    <span className="text-xs text-zinc-400">
                        {!activeSecurity.tabSwitchAllowed 
                            ? "Strict Mode: Tab switching is strictly prohibited." 
                            : `Allowed with limit: Max ${activeSecurity.maxTabSwitches || 'unlimited'} switches.`
                        }
                    </span>
                </div>
            </div>
            {activeSecurity.disableClipboard && (
                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded border border-zinc-700/50">
                    <MousePointerClick className="text-pink-500 shrink-0" size={20}/>
                    <div className="flex flex-col">
                        <span className="font-bold text-zinc-200">Clipboard Disabled</span>
                        <span className="text-xs text-zinc-400">Copy, Cut, and Paste actions are blocked.</span>
                    </div>
                </div>
            )}
            {activeAttemptLimit && (
                <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded border border-zinc-700/50">
                    <AlertTriangle className="text-red-500 shrink-0" size={20}/>
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-200">Attempt Limit</span>
                        <span className="text-xs text-zinc-400">You have a maximum of {maxAttempts} submission attempts.</span>
                    </div>
                </div>
            )}
          </div>

          <button onClick={handleStartExercise} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
              <span>Start Assessment</span> <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    );
  }

  // --- EDITOR RENDER ---
  return (
    <div className={`flex flex-col h-full ${theme === 'light' ? 'bg-slate-50 text-slate-800' : 'bg-[#1e1e1e] text-white'} ${isUIFullscreen && !activeSecurity.fullScreenMode ? 'fixed inset-0 z-50' : ''}`}>
      <ToastContainer theme={theme === 'light' ? 'light' : 'dark'} position="top-center" />
      
      {/* Header */}
      <header className={`h-14 border-b flex items-center justify-between px-4 shrink-0 ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-zinc-800 border-zinc-700'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => handleSafeExit()} className={`hover:opacity-75 ${theme === 'light' ? 'text-slate-500' : 'text-zinc-400'}`}><ChevronLeft size={20}/></button>
          <div className="flex flex-col">
            <h1 className="font-semibold text-sm flex items-center gap-2">
                {title}
                {isAssessmentMode && <span className="text-[10px] bg-red-900 text-red-200 px-1.5 rounded border border-red-800">Assessment</span>}
            </h1>
            {activeAttemptLimit && (
               <span className={`text-[10px] font-mono flex items-center gap-1 ${isLimitReached ? 'text-red-500' : 'text-zinc-400'}`}>
                 {isLimitReached && <AlertTriangle className="w-3 h-3"/>} Attempts: {userAttempts} / {maxAttempts}
               </span>
            )}
          </div>
          <button onClick={() => setIsSidebarVisible(!isSidebarVisible)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${theme === 'light' ? 'bg-slate-100 hover:bg-slate-200' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
              {isSidebarVisible ? <PanelLeftClose size={16}/> : <PanelLeftOpen size={16}/>}
          </button>
        </div>

        <div className="flex items-center gap-4">
          {activeSecurity.timerEnabled && timeLeft !== null && isAssessmentMode && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono font-medium ${timeLeft < 60 ? 'bg-red-600 animate-pulse text-white' : 'bg-zinc-900 text-amber-400'}`}>
              <Clock size={14} /> {formatTime(timeLeft)}
            </div>
          )}
          
          {activeSecurity.cameraMicEnabled && isAssessmentMode && (
             <div className="w-16 h-12 bg-black rounded border border-zinc-600 overflow-hidden"><video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/></div>
          )}
          
          <div className="flex items-center gap-2 relative">
              <button onClick={() => setAutoRun(!autoRun)} className={`p-2 rounded-lg border transition-all ${autoRun ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'text-zinc-400 border-transparent hover:bg-zinc-700'}`} title="Toggle Auto-Run">
                <Zap className={`w-4 h-4 ${autoRun ? 'fill-current' : ''}`} />
              </button>

              <button onClick={compileCode} className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs font-bold flex items-center gap-2 text-white"><Play className="w-3 h-3"/> Run</button>
              
              {/* SETTINGS */}
              <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-700'}`}>
                <Settings className="w-5 h-5" />
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <div className={`absolute top-12 right-0 w-80 rounded-xl shadow-2xl border ${colors.border} ${colors.panel} z-50 p-5 animate-in slide-in-from-top-2 duration-200`}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Editor Settings</h3>
                      <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">Interface Layout</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setLayoutMode('standard')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${layoutMode === 'standard' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-700 opacity-60 hover:opacity-100'}`}>
                            <Sidebar className="w-5 h-5" />
                            <span className="text-[10px] font-semibold text-zinc-400">Standard</span>
                          </button>
                          <button onClick={() => setLayoutMode('bottom-question')} className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${layoutMode === 'bottom-question' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-zinc-700 opacity-60 hover:opacity-100'}`}>
                            <LayoutIcon className="w-5 h-5 rotate-180" />
                            <span className="text-[10px] font-semibold text-zinc-400">Bottom Dock</span>
                          </button>
                        </div>
                      </div>

                      <div>
                         <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">Editor Style</label>
                         <div className={`flex p-1 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-zinc-900'}`}>
                           <button onClick={() => setEditorViewMode('tabbed')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${editorViewMode === 'tabbed' ? 'bg-zinc-700 shadow-sm text-white' : 'text-zinc-500'}`}>
                             <MonitorPlay className="w-3.5 h-3.5" /> Tabs
                           </button>
                           <button onClick={() => setEditorViewMode('split')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${editorViewMode === 'split' ? 'bg-zinc-700 shadow-sm text-white' : 'text-zinc-500'}`}>
                             <Columns className="w-3.5 h-3.5" /> Split
                           </button>
                         </div>
                      </div>

                      <div className="h-px bg-zinc-700" />

                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Active Languages</label>
                        <div className="flex flex-wrap gap-2">
                          <div className={`px-2.5 py-1.5 rounded text-xs font-medium ${showHtml ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-zinc-800 text-zinc-600'}`}>HTML</div>
                          <div className={`px-2.5 py-1.5 rounded text-xs font-medium ${showCss ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-zinc-800 text-zinc-600'}`}>CSS</div>
                          <div className={`px-2.5 py-1.5 rounded text-xs font-medium ${showJs ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-zinc-800 text-zinc-600'}`}>JS</div>
                          <div className={`px-2.5 py-1.5 rounded text-xs font-medium ${enableBootstrap ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' : 'bg-zinc-800 text-zinc-600'}`}>Bootstrap</div>
                        </div>
                      </div>

                      <div className="h-px bg-zinc-700" />

                      <div>
                        <div className="flex justify-between text-xs mb-2 font-medium">
                          <span className="text-zinc-400">Font Size</span>
                          <span className="text-blue-400">{fontSize}px</span>
                        </div>
                        <input type="range" min="10" max="24" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      </div>
                      
                      {!isAssessmentMode && (
                         <ToggleSwitch checked={isUIFullscreen} onChange={setIsUIFullscreen} label="Editor Fullscreen" />
                      )}

                      <div className="flex items-center justify-between">
                         <span className="text-xs text-slate-400">Theme</span>
                         <button onClick={() => setTheme(prev => prev === 'vs-dark' ? 'light' : 'vs-dark')} className="p-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-white">
                             {theme === 'vs-dark' ? <Moon size={14}/> : <Sun size={14}/>}
                         </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button onClick={() => handleSafeExit()} className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${isAssessmentMode ? "bg-red-900/50 text-red-200 border-red-900 hover:bg-red-900" : "bg-zinc-800 border-zinc-600 hover:bg-zinc-700 text-white"}`}>
                 <LogOut size={14} className="inline mr-1"/> {isAssessmentMode ? "Finish" : "Exit"}
              </button>
          </div>
        </div>
      </header>

      {/* --- RESIZABLE CONTAINER --- */}
      <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
        
        {/* PANEL 1: QUESTIONS */}
        {layoutMode === 'standard' && isSidebarVisible && showQuestions && (
          <div style={{ width: leftPanelWidth }} className="flex flex-col shrink-0 relative">
              <QuestionPanel />
              <div className="absolute right-0 top-0 bottom-0 w-1 hover:bg-blue-500 cursor-col-resize z-10 flex items-center justify-center transition-colors" onMouseDown={() => { isResizingLeft.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}>
                <GripVertical className="w-3 h-3 text-zinc-500" />
              </div>
          </div>
        )}

        {/* PANEL 2: EDITOR */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          
          {editorViewMode === 'tabbed' && (
            <div className={`h-10 border-b flex items-center px-2 gap-1 ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#1e1e1e] border-zinc-700'}`}>
              {showHtml && <button onClick={() => setActiveTab('html')} className={`flex items-center gap-2 px-4 h-full text-xs border-t-2 ${activeTab === 'html' ? 'border-orange-500 bg-zinc-800 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}><Code2 size={14} className="text-orange-500"/> HTML</button>}
              {showCss && <button onClick={() => setActiveTab('css')} className={`flex items-center gap-2 px-4 h-full text-xs border-t-2 ${activeTab === 'css' ? 'border-blue-500 bg-zinc-800 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}><Palette size={14} className="text-blue-500"/> CSS</button>}
              {showJs && <button onClick={() => setActiveTab('js')} className={`flex items-center gap-2 px-4 h-full text-xs border-t-2 ${activeTab === 'js' ? 'border-yellow-500 bg-zinc-800 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}><Terminal size={14} className="text-yellow-500"/> JS</button>}
            </div>
          )}

          <div className="flex-1 relative bg-[#1e1e1e] flex">
            {isFetching && <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#1e1e1e]/80"><Loader2 className="w-8 h-8 text-blue-500 animate-spin"/></div>}
            
            {editorViewMode === 'tabbed' ? (
                <div className="w-full h-full">
                   {activeTab === 'html' && showHtml && <MonacoEditor height="100%" language="html" theme={theme} value={htmlCode} onChange={(v) => setHtmlCode(v || "")} options={{ fontSize, minimap: { enabled: false } }} />}
                   {activeTab === 'css' && showCss && <MonacoEditor height="100%" language="css" theme={theme} value={cssCode} onChange={(v) => setCssCode(v || "")} options={{ fontSize, minimap: { enabled: false } }} />}
                   {activeTab === 'js' && showJs && <MonacoEditor height="100%" language="javascript" theme={theme} value={jsCode} onChange={(v) => setJsCode(v || "")} options={{ fontSize, minimap: { enabled: false } }} />}
                </div>
            ) : (
               <div className="flex w-full h-full">
                  {showHtml && <div className="flex-1 border-r border-zinc-700 flex flex-col"><div className="bg-zinc-800 px-2 py-1 text-xs text-orange-500">HTML</div><div className="flex-1"><MonacoEditor height="100%" language="html" theme={theme} value={htmlCode} onChange={(v) => setHtmlCode(v || "")} options={{ fontSize, minimap: { enabled: false } }} /></div></div>}
                  {showCss && <div className="flex-1 border-r border-zinc-700 flex flex-col"><div className="bg-zinc-800 px-2 py-1 text-xs text-blue-500">CSS</div><div className="flex-1"><MonacoEditor height="100%" language="css" theme={theme} value={cssCode} onChange={(v) => setCssCode(v || "")} options={{ fontSize, minimap: { enabled: false } }} /></div></div>}
                  {showJs && <div className="flex-1 flex flex-col"><div className="bg-zinc-800 px-2 py-1 text-xs text-yellow-500">JS</div><div className="flex-1"><MonacoEditor height="100%" language="javascript" theme={theme} value={jsCode} onChange={(v) => setJsCode(v || "")} options={{ fontSize, minimap: { enabled: false } }} /></div></div>}
               </div>
            )}
          </div>
          
          {layoutMode === 'bottom-question' && isSidebarVisible && showQuestions && (
              <div style={{ height: `${bottomPanelHeight}%` }} className="border-t border-zinc-700 overflow-hidden relative shrink-0">
                 <div className="absolute top-0 left-0 right-0 h-1 hover:bg-blue-500 cursor-row-resize z-10 flex items-center justify-center transition-colors" onMouseDown={() => { isResizingBottom.current = true; document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; }}>
                    <div className="w-8 h-1 bg-zinc-600 rounded-full"/>
                 </div>
                 <QuestionPanel />
              </div>
          )}
        </div>

        {/* PANEL 3: PREVIEW */}
        <div style={{ width: rightPanelWidth }} className={`flex flex-col min-w-0 relative border-l ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-white border-zinc-700'}`}>
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 -ml-0.5 hover:bg-blue-500 cursor-col-resize z-10 flex items-center justify-center transition-colors"
            onMouseDown={() => { isResizingRight.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
          >
              <GripVertical className="w-3 h-3 text-zinc-400" />
          </div>
          
          <div className="h-10 bg-zinc-100 border-b border-zinc-200 flex items-center px-4 text-xs text-zinc-500 gap-2 font-medium pl-3">
              <div className="w-2 h-2 rounded-full bg-red-400"></div><div className="w-2 h-2 rounded-full bg-yellow-400"></div><div className="w-2 h-2 rounded-full bg-green-400"></div><span className="ml-2">Live Preview</span>
          </div>
          <iframe srcDoc={srcDoc} title="output" sandbox="allow-scripts" frameBorder="0" width="100%" height="100%" className="flex-1 bg-white"/>
        </div>
      </div>
    </div>
  );
};

export default FrontendCompiler;