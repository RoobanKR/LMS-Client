"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { 
  Play, RotateCcw, CheckCircle, Maximize2, Minimize2, Code, FileText, 
  AlertCircle, Terminal, Menu, ChevronRight, ChevronLeft, Search, 
  AlertTriangle, XCircle, Loader2, Brain, FileOutput, Clock, 
  ShieldAlert, Eye, Lock, Camera, LogOut, Save, GripVertical, CheckCircle2,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react"
import dynamic from 'next/dynamic'
import axios from 'axios'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// --- API CONFIGURATION ---
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"
const GEMINI_API_KEY = "AIzaSyDZ9horfrJ0KvOkx_aHhTpIIvqjBoSPpJg" // ⚠️ Move to env in production

// --- DYNAMIC EDITOR IMPORT ---
const MonacoEditor = dynamic(
    () => import('@monaco-editor/react'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#1e1e1e] text-zinc-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-xs font-medium">Loading Editor...</p>
            </div>
        )
    }
)

// --- INTERFACES ---

interface SecuritySettings {
    timerEnabled?: boolean;
    timerDuration?: number; 
    cameraMicEnabled?: boolean;
    fullScreenMode?: boolean;
    tabSwitchAllowed?: boolean;
    maxTabSwitches?: number;
    disableClipboard?: boolean;
}

interface QuestionBehavior {
    attemptLimitEnabled?: boolean;
    maxAttempts?: number;
    allowSkip?: boolean;
    allowNext?: boolean;
    shuffleQuestions?: boolean;
}

interface ExerciseQuestion {
    _id: string;
    title: string;
    description: string;
    difficulty: "Easy" | "Medium" | "Hard" | string;
    sampleInput?: string;
    sampleOutput?: string;
    constraints?: string[];
    hints?: { hintText: string }[];
    testCases?: { input: string; expectedOutput: string; isHidden: boolean; _id?: string }[];
    solutions?: { startedCode?: string; staetedCode?: string; language?: string };
}

interface CodeEditorProps {
    exercise?: any; 
    defaultProblems?: any[];
    theme?: "light" | "dark";
    courseId?: string;
    nodeId?: string;
    nodeName?: string;
    nodeType?: string;
    subcategory?: string;
    category?: string; // "I_Do" | "We_Do" | "You_Do"
    onBack?: () => void;
    // UI Props
    onDropdownCollapsed?: (collapsed: boolean) => void;
    breadcrumbCollapsed?: boolean;
    onBreadcrumbCollapseToggle?: () => void;
}

interface TestRunResult {
    total: number;
    passed: number;
    failed: number;
    results: {
        input: string;
        expected: string;
        actual: string;
        passed: boolean;
        isHidden?: boolean;
        runtime?: string;
        error?: string;
    }[];
    runtime?: string;
}

interface AIEvaluationResult {
    score: number;
    feedback: string;
    suggestions: string[];
    isPassed: boolean;
    detailedAnalysis: string;
}

// --- HELPER FUNCTIONS ---

const getPistonLanguage = (language: string): { language: string; version: string } => {
    const languageMap: { [key: string]: { language: string; version: string } } = {
        javascript: { language: "javascript", version: "18.15.0" },
        typescript: { language: "typescript", version: "5.0.3" },
        python: { language: "python", version: "3.10.0" },
        java: { language: "java", version: "15.0.2" },
        cpp: { language: "cpp", version: "10.2.0" },
        c: { language: "c", version: "10.2.0" },
        csharp: { language: "csharp", version: "6.12.0" },
        sql: { language: "sql", version: "sqlite3" },
        plsql: { language: "plsql", version: "oracle" }
    };
    return languageMap[language.toLowerCase()] || { language: "javascript", version: "18.15.0" };
};

const getMonacoLanguage = (lang: string) => {
    const map: Record<string, string> = {
        'c': 'c', 'cpp': 'cpp', 'csharp': 'csharp', 'java': 'java', 
        'python': 'python', 'sql': 'sql', 'javascript': 'javascript', 'typescript': 'typescript', 'plsql': 'sql'
    };
    return map[lang] || 'javascript';
};

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- MAIN COMPONENT ---

export default function CodeEditor({
    exercise,
    defaultProblems = [],
    theme = "light",
    courseId = "",
    nodeId = "",
    nodeName = "",
    nodeType = "",
    subcategory = "",
    category = "We_Do",
    onBack,
    onDropdownCollapsed,
    breadcrumbCollapsed,
    onBreadcrumbCollapseToggle
}: CodeEditorProps) {

    // ---------------------------------------------------------------------------
    // 1. CONFIGURATION
    // ---------------------------------------------------------------------------

    const isAssessmentMode = useMemo(() => {
        const normCategory = (category || "").replace('_', ' ').toLowerCase().trim();
        return normCategory === 'you do';
    }, [category]);

    const activeSecurity = useMemo<SecuritySettings>(() => {
        if (!isAssessmentMode) return {}; 
        return exercise?.securitySettings || {};
    }, [isAssessmentMode, exercise]);

    const behavior = useMemo<QuestionBehavior>(() => {
        return exercise?.questionBehavior || {};
    }, [exercise]);

    const problems = useMemo(() => {
        if (exercise?.questions && exercise.questions.length > 0) {
            return exercise.questions.map((q: any, i: number) => ({
                id: i + 1,
                title: q.title,
                description: q.description,
                difficulty: q.difficulty,
                sampleInput: q.sampleInput,
                sampleOutput: q.sampleOutput,
                testCases: q.testCases || [],
                initialCode: q.solutions?.startedCode || q.solutions?.staetedCode || "",
                ...q
            }));
        }
        return defaultProblems || [];
    }, [exercise, defaultProblems]);

    const availableLanguages = exercise?.programmingSettings?.selectedLanguages || ["javascript", "python", "java", "cpp", "c", "csharp", "sql"];

    // ---------------------------------------------------------------------------
    // 2. STATE
    // ---------------------------------------------------------------------------

    // Security & Status
    const [hasStarted, setHasStarted] = useState(!isAssessmentMode);
    const [isLocked, setIsLocked] = useState(false);
    const [isTerminated, setIsTerminated] = useState(false);
    const [terminationReason, setTerminationReason] = useState("");
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [userAttempts, setUserAttempts] = useState(0);
    const [showCopyWarning, setShowCopyWarning] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);

    // Editor & Execution
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
    const [code, setCode] = useState("");
    const [selectedLanguage, setSelectedLanguage] = useState("javascript");
    const [output, setOutput] = useState("");
    const [testResults, setTestResults] = useState<TestRunResult | null>(null);
    const [aiEvaluationResult, setAIEvaluationResult] = useState<AIEvaluationResult | null>(null);
    const [solvedQuestions, setSolvedQuestions] = useState<Set<number>>(new Set());
    const [isEvaluating, setIsEvaluating] = useState(false);

    // UI
    const [activeTab, setActiveTab] = useState<'output' | 'results' | 'ai'>('output');
    const [isRunning, setIsRunning] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [leftPanelWidth, setLeftPanelWidth] = useState(40);
    const [rightPanelSplit, setRightPanelSplit] = useState(70);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isResizing, setIsResizing] = useState(false);
    const [isHorizontalResizing, setIsHorizontalResizing] = useState(false);
    const [editorReady, setEditorReady] = useState(false);

    // Refs
    const editorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const currentQuestion = problems[currentProblemIndex];

    // ---------------------------------------------------------------------------
    // 3. SECURITY EFFECTS
    // ---------------------------------------------------------------------------

    // A. Backend Lock Check
    useEffect(() => {
        const checkStatus = async () => {
            if (!isAssessmentMode || !courseId || !exercise?._id) return;
            try {
                const token = localStorage.getItem('smartcliff_token') || '';
                const response = await axios.get('https://lms-server-ym1q.onrender.com/exercise/status', {
                    params: { courseId, exerciseId: exercise._id, category, subcategory },
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (response.data.success) {
                    const { isLocked, status } = response.data.data;
                    if (isLocked || status === 'terminated') {
                        setIsLocked(true);
                        setIsTerminated(true);
                        setHasStarted(false);
                        setTerminationReason("Exercise is locked or terminated.");
                    }
                }
            } catch (err) { console.error("Status check failed", err); }
        };
        checkStatus();
    }, [courseId, exercise?._id, category, subcategory, isAssessmentMode]);

    // B. Fetch Progress
    useEffect(() => {
        const fetchProgress = async () => {
            if(!currentQuestion || !courseId) return;
            try {
                const token = localStorage.getItem('smartcliff_token') || '';
                const res = await axios.get(`https://lms-server-ym1q.onrender.com/courses/answers/single`, {
                    params: { courseId, exerciseId: exercise?._id, questionId: currentQuestion._id, category, subcategory },
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if(res.data.success && res.data.data) {
                    setUserAttempts(res.data.attempts || 0);
                    if(res.data.status === 'solved') {
                        setSolvedQuestions(prev => new Set(prev).add(currentProblemIndex));
                    }
                    if(res.data.data.code && res.data.data.code.trim() !== "") {
                        setCode(res.data.data.code); 
                    } else {
                        setCode(currentQuestion.initialCode || "// Write your code here...");
                    }
                } else {
                    setUserAttempts(0);
                    setCode(currentQuestion.initialCode || "// Write your code here...");
                }
            } catch (e) { 
                console.error("Fetch progress failed", e);
                setCode(currentQuestion?.initialCode || "");
            }
        };
        fetchProgress();

        setOutput("");
        setTestResults(null);
        setAIEvaluationResult(null);
        setActiveTab('output');
        
        if(currentQuestion?.solutions?.language) {
            setSelectedLanguage(currentQuestion.solutions.language.toLowerCase());
        }
    }, [currentQuestion, exercise, currentProblemIndex, courseId, category, subcategory]);

    // C. Termination Handler
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
        if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});

        try {
            const token = localStorage.getItem('smartcliff_token') || '';
            await axios.post('https://lms-server-ym1q.onrender.com/exercise/lock', {
                courseId, exerciseId: exercise?._id, category, subcategory,
                status: 'terminated', reason
            }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (e) { console.error("Lock failed", e); }
    }, [isAssessmentMode, cameraStream, courseId, exercise, category, subcategory]);

    // D. Timer
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

    // E. Tab Monitoring (Corrected)
    useEffect(() => {
        if (!hasStarted || isTerminated || !isAssessmentMode) return;
        
        const handleVisibility = () => {
            if (document.hidden) {
                if (!activeSecurity.tabSwitchAllowed) {
                    handleTermination("Tab switching is strictly prohibited.");
                    return;
                }

                setTabSwitchCount(prevCount => {
                    const newCount = prevCount + 1;
                    const maxSwitches = activeSecurity.maxTabSwitches || 0;

                    if (maxSwitches > 0 && newCount > maxSwitches) {
                        handleTermination(`Tab switch limit exceeded (${newCount - 1}/${maxSwitches}).`);
                    } else {
                        const remaining = maxSwitches ? maxSwitches - newCount : '∞';
                        toast.warn(`Warning: Tab switch detected! (${newCount} used, ${remaining} left)`, { 
                            theme: theme === 'dark' ? 'dark' : 'light',
                            autoClose: 4000
                        });
                    }
                    return newCount;
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [activeSecurity, hasStarted, isTerminated, isAssessmentMode, handleTermination, theme]);

    // F. Fullscreen & Clipboard
    useEffect(() => {
        if (!hasStarted || !isAssessmentMode) return;
        
        const handleCopy = (e: ClipboardEvent) => { 
            if (activeSecurity.disableClipboard) {
                e.preventDefault(); 
                toast.error("Copy/Paste Disabled"); 
                setShowCopyWarning(true); 
                setTimeout(()=>setShowCopyWarning(false), 2000); 
            }
        };

        const handleFS = () => {
            if (activeSecurity.fullScreenMode && !document.fullscreenElement) {
                toast.error("Please maintain full screen!"); 
            }
        };

        window.addEventListener('copy', handleCopy); 
        window.addEventListener('paste', handleCopy); 
        window.addEventListener('cut', handleCopy);
        document.addEventListener('fullscreenchange', handleFS);

        return () => { 
            window.removeEventListener('copy', handleCopy); 
            window.removeEventListener('paste', handleCopy); 
            window.removeEventListener('cut', handleCopy);
            document.removeEventListener('fullscreenchange', handleFS);
        };
    }, [activeSecurity, hasStarted, isAssessmentMode]);

    // G. Camera
    useEffect(() => {
        if (hasStarted && activeSecurity.cameraMicEnabled && !cameraStream && isAssessmentMode) {
            navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                .then(stream => { 
                    setCameraStream(stream); 
                    if (videoRef.current) videoRef.current.srcObject = stream; 
                })
                .catch(() => toast.error("Camera access required for assessment."));
        }
    }, [activeSecurity.cameraMicEnabled, hasStarted, isAssessmentMode, cameraStream]);

    // ---------------------------------------------------------------------------
    // 4. API & EXECUTION LOGIC
    // ---------------------------------------------------------------------------

    const executeCode = async (input: string = "") => {
        try {
            const pistonLang = getPistonLanguage(selectedLanguage);
            const response = await fetch(PISTON_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: pistonLang.language,
                    version: pistonLang.version,
                    files: [{ content: code }],
                    stdin: input
                })
            });
            const data = await response.json();
            return {
                output: data.run?.output?.trim() || "",
                error: data.run?.stderr || data.run?.error,
                runtime: data.run?.time ? `${data.run.time}ms` : "N/A"
            };
        } catch (e) { return { output: "", error: String(e), runtime: "0ms" }; }
    };

    const runCode = async () => {
        if(showCopyWarning) return; 
        setIsRunning(true);
        setActiveTab('output');
        setOutput("Running...");
        
        const input = currentQuestion?.sampleInput || "";
        const res = await executeCode(input);
        
        if(res.error) setOutput(`❌ Error:\n${res.error}`);
        else setOutput(res.output);
        
        setIsRunning(false);
    };

    const submitCode = async () => {
        if (behavior.attemptLimitEnabled && userAttempts >= (behavior.maxAttempts || 3)) {
            toast.error(`Maximum attempts (${behavior.maxAttempts}) reached.`);
            return;
        }

        setIsRunning(true);
        const toastId = toast.loading("Evaluating Solution...");
        
        try {
            let isSuccess = false;
            let score = 0;
            let feedback = "";
            
            // A. AI EVALUATION
            if (exercise?.evaluationSettings?.aiEvaluation) {
                setActiveTab('ai');
                const prompt = `Evaluate this ${selectedLanguage} code for question: "${currentQuestion.title}".
                Description: ${currentQuestion.description}
                Constraints: ${currentQuestion.constraints?.join(', ')}
                Code: \n${code}\n
                Return JSON only: { "score": number, "isPassed": boolean, "feedback": string, "suggestions": string[], "detailedAnalysis": string }`;

                const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const aiData = await aiRes.json();
                const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    setAIEvaluationResult(result);
                    isSuccess = result.isPassed;
                    score = result.score;
                    feedback = result.feedback;
                } else {
                    isSuccess = false;
                    feedback = "AI parsing failed.";
                }

            } 
            // B. TEST CASE EVALUATION
            else {
                setActiveTab('results');
                const testCases = currentQuestion.testCases || [];
                
                if(testCases.length === 0) {
                    const run = await executeCode(currentQuestion.sampleInput);
                    isSuccess = !run.error;
                    score = isSuccess ? 100 : 0;
                    setTestResults({ total: 1, passed: isSuccess?1:0, failed: isSuccess?0:1, results: [], runtime: run.runtime });
                } else {
                    const results = [];
                    let passedCount = 0;

                    for (const tc of testCases) {
                        const res = await executeCode(tc.input);
                        const passed = !res.error && res.output.trim() === tc.expectedOutput.trim();
                        if (passed) passedCount++;
                        results.push({ ...tc, actual: res.output, passed, runtime: res.runtime });
                    }

                    setTestResults({ total: testCases.length, passed: passedCount, failed: testCases.length - passedCount, results });
                    isSuccess = passedCount === testCases.length;
                    score = (passedCount / testCases.length) * 100;
                }
            }

            // C. BACKEND SUBMISSION
            const token = localStorage.getItem('smartcliff_token') || '';
            await axios.post('https://lms-server-ym1q.onrender.com/courses/answers/submit', {
                courseId, exerciseId: exercise?._id, questionId: currentQuestion._id,
                code, language: selectedLanguage,
                status: isSuccess ? 'solved' : 'attempted',
                score, category, subcategory,
                attemptLimitEnabled: behavior.attemptLimitEnabled,
                maxAttempts: behavior.maxAttempts
            }, { headers: { Authorization: `Bearer ${token}` } });

            setUserAttempts(p => p + 1);
            if(isSuccess) setSolvedQuestions(p => new Set(p).add(currentProblemIndex));

            toast.update(toastId, { 
                render: isSuccess ? "Success! Question Solved." : "Submission Failed.", 
                type: isSuccess ? "success" : "warning", 
                isLoading: false, autoClose: 3000 
            });

            if(isSuccess && behavior.allowNext && currentProblemIndex < problems.length - 1) {
                setTimeout(() => setCurrentProblemIndex(p => p + 1), 1500);
            }

        } catch (err: any) {
            console.error(err);
            toast.update(toastId, { render: "Error submitting code.", type: "error", isLoading: false, autoClose: 3000 });
        } finally {
            setIsRunning(false);
        }
    };

    // ---------------------------------------------------------------------------
    // 5. RENDER UI
    // ---------------------------------------------------------------------------

    // --- MOUSE HANDLERS ---
    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (isResizing && containerRef.current) {
                const newW = ((e.clientX - containerRef.current.getBoundingClientRect().left) / containerRef.current.clientWidth) * 100;
                setLeftPanelWidth(Math.min(Math.max(20, newW), 60));
            }
            if (isHorizontalResizing && containerRef.current) {
                const containerH = containerRef.current.clientHeight || 800;
                const relativeY = e.clientY - (containerRef.current.getBoundingClientRect().top || 0);
                const newH = (relativeY / containerH) * 100;
                setRightPanelSplit(Math.min(Math.max(30, newH), 80));
            }
        };
        const handleUp = () => { setIsResizing(false); setIsHorizontalResizing(false); };
        if (isResizing || isHorizontalResizing) {
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
        }
        return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    }, [isResizing, isHorizontalResizing]);

    // --- VIEW: LOCKED ---
    if (isTerminated || isLocked) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white p-4">
                <div className="bg-zinc-800 p-8 rounded border border-red-600 max-w-md text-center shadow-2xl">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Access Terminated</h2>
                    <p className="text-red-200 mb-6">{terminationReason || "Exercise is currently locked."}</p>
                    <button onClick={onBack} className="bg-zinc-700 px-6 py-2 rounded hover:bg-zinc-600 font-bold w-full">Exit</button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={editorRef}
            className={`${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} border-gray-300 rounded-lg w-full flex flex-col border transition-all duration-300 ${isFullscreen
                ? "fixed inset-0 z-50 rounded-none"
                : "relative h-full min-h-0 flex-1"
                }`}
        >
            <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} position="top-right"/>
            
            {/* COMPACT OVERLAY: START ASSESSMENT */}
            {isAssessmentMode && !hasStarted && (
                <div className="absolute inset-0 z-[60] bg-zinc-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 flex flex-col max-h-full">
                        <div className="p-6 border-b border-zinc-700">
                            <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5"/> Assessment Mode
                            </h2>
                            <p className="text-zinc-400 text-sm mt-1">
                                {exercise?.exerciseInformation?.exerciseName || "Coding Assessment"}
                            </p>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-3">
                            <p className="text-sm text-zinc-300 mb-4">Please review the environment constraints before starting:</p>
                            {activeSecurity.timerEnabled && <div className="flex items-center gap-3 text-sm text-zinc-300"><Clock className="w-4 h-4 text-amber-500"/> <span>Time Limit: <strong>{activeSecurity.timerDuration} mins</strong></span></div>}
                            {activeSecurity.fullScreenMode && <div className="flex items-center gap-3 text-sm text-zinc-300"><Maximize2 className="w-4 h-4 text-blue-500"/> <span>Fullscreen Required</span></div>}
                            {activeSecurity.cameraMicEnabled && <div className="flex items-center gap-3 text-sm text-zinc-300"><Camera className="w-4 h-4 text-purple-500"/> <span>Camera Proctoring Active</span></div>}
                            <div className="flex items-center gap-3 text-sm text-zinc-300"><Eye className="w-4 h-4 text-orange-500"/> <span>Tab Switching: <strong>{activeSecurity.tabSwitchAllowed ? `Max ${activeSecurity.maxTabSwitches}` : "Prohibited"}</strong></span></div>
                        </div>
                        <div className="p-6 border-t border-zinc-700 flex gap-3">
                            <button onClick={onBack} className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium">Exit</button>
                            <button 
                                onClick={() => { if(activeSecurity.fullScreenMode) document.documentElement.requestFullscreen().catch(()=>{}); setHasStarted(true); }} 
                                className="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2"
                            >
                                Start Assessment <ChevronRight size={16}/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OVERLAY: COPY WARNING */}
            {showCopyWarning && (
                <div className="absolute inset-0 bg-black/80 z-[70] flex items-center justify-center">
                    <div className="bg-zinc-800 p-6 rounded-lg text-center border border-red-500 shadow-xl">
                        <Lock className="w-12 h-12 text-red-500 mx-auto mb-2"/>
                        <h3 className="text-xl font-bold text-white mb-2">Action Prohibited</h3>
                        <p className="text-zinc-400">Copy/Paste is disabled.</p>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className={`flex items-center justify-between p-2.5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}
                    >
                        {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                    </button>

                    <div className="flex flex-col">
                        <h1 className="font-bold text-sm flex items-center gap-2">
                            {exercise?.exerciseInformation?.exerciseName || "Code Editor"}
                            {isAssessmentMode && <span className="text-[10px] bg-red-900 text-red-200 px-1.5 rounded border border-red-800">ASSESSMENT</span>}
                        </h1>
                        <span className="text-[10px] text-zinc-500">Problem {currentProblemIndex + 1} of {problems.length}</span>
                    </div>

                    {/* FEATURE: Timer & Camera */}
                    {activeSecurity.timerEnabled && timeLeft !== null && (
                        <div className={`flex items-center gap-1 text-xs font-mono font-bold px-2 py-1 rounded border ${timeLeft < 60 ? 'bg-red-900 text-white border-red-700 animate-pulse' : 'bg-zinc-800 text-amber-500 border-zinc-700'}`}>
                            <Clock size={12}/> {formatTime(timeLeft)}
                        </div>
                    )}
                    {activeSecurity.cameraMicEnabled && isAssessmentMode && (
                        <div className="w-10 h-8 bg-black rounded border border-zinc-600 overflow-hidden relative">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
                            <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className={`h-7 text-xs border rounded px-1.5 ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                    >
                        {availableLanguages.map((lang: string) => (
                            <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                        ))}
                    </select>
                    
                    <button onClick={runCode} disabled={isRunning} className="h-7 px-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1">
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run
                    </button>

                    <button onClick={submitCode} disabled={isRunning} className="h-7 px-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
                        <Save className="w-3 h-3" /> Submit
                    </button>

                    <button onClick={() => setIsFullscreen(!isFullscreen)} className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark' ? 'border-gray-600 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 bg-gray-100 hover:bg-gray-200'}`}>
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    
                    <button onClick={onBack} className={`w-7 h-7 flex items-center justify-center border rounded hover:bg-red-900/50 ${theme === 'dark' ? 'border-gray-600 bg-gray-800 text-red-400' : 'border-gray-300 bg-gray-100 text-red-600'}`}>
                        <LogOut className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* BODY CONTENT */}
            <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
                {showSidebar && (
                    <div className={`w-72 border-r overflow-hidden flex flex-col shrink-0 ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'}`}>
                        <div className={`p-3 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                            <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Problems</h3>
                            <button onClick={() => setShowSearch(!showSearch)}><Search size={14} className="text-gray-500"/></button>
                        </div>
                        {showSearch && (
                            <div className="p-2 border-b border-gray-700">
                                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full bg-gray-800 text-white text-xs p-1 rounded"/>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto">
                            {problems.filter((p: any) => p.title?.toLowerCase().includes(searchQuery.toLowerCase())).map((p: any, index: number) => (
                                <button key={index} onClick={() => setCurrentProblemIndex(index)} className={`w-full p-3 text-left transition-colors border-b ${theme === 'dark' ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-100 hover:bg-gray-50'} ${currentProblemIndex === index ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>{index + 1}. {p.title}</div>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.difficulty==='Hard'?'bg-red-900/30 text-red-400':'bg-green-900/30 text-green-400'}`}>{p.difficulty}</span>
                                        </div>
                                        {solvedQuestions.has(index) && <CheckCircle className="w-3.5 h-3.5 text-green-500"/>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ width: `${leftPanelWidth}%` }} className="overflow-y-auto h-full custom-scrollbar border-r border-gray-300 dark:border-gray-700">
                    <div className={`p-5 space-y-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                        <div>
                            <h1 className={`text-xl font-semibold mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{currentQuestion?.title}</h1>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{currentQuestion?.difficulty || 'Medium'}</span>
                                {/* Attempt Limit Indicator */}
                                {behavior.attemptLimitEnabled && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                                        <AlertTriangle size={10}/> Attempts: {userAttempts} / {behavior.maxAttempts}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 mb-2"><FileText className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} /><h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Description</h3></div>
                            <div className={`text-xs space-y-3 prose prose-invert ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{currentQuestion?.description}</div>
                        </div>
                        {currentQuestion?.sampleInput && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-2"><Terminal className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} /><h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Sample Input</h3></div>
                                <div className={`p-2 rounded font-mono text-xs ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-900'}`}>{currentQuestion.sampleInput}</div>
                            </div>
                        )}
                        {currentQuestion?.sampleOutput && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-2"><Terminal className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} /><h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Sample Output</h3></div>
                                <div className={`p-2 rounded font-mono text-xs ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-900'}`}>{currentQuestion.sampleOutput}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resizer Vertical */}
                <div 
                    className="w-1 bg-gray-300 dark:bg-gray-700 cursor-col-resize hover:bg-blue-500 z-10 flex items-center justify-center group"
                    onMouseDown={() => setIsResizing(true)}
                >
                    <GripVertical className="w-3 h-3 text-gray-500 group-hover:text-white"/>
                </div>

                <div className="flex flex-col flex-1 min-w-0 h-full custom-scrollbar" style={{ width: `${100 - leftPanelWidth}%` }}>
                    <div className="flex flex-col" style={{ height: `${rightPanelSplit}%`, minHeight: `${rightPanelSplit}%`, position: 'relative' }}>
                        <div className={`flex items-center justify-between p-2 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5"><Code className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} /><span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Code</span></div>
                            <button onClick={() => setCode(currentQuestion?.solutions?.startedCode || "")} className={`flex items-center gap-1 px-2 py-0.5 text-xs border rounded transition-colors ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><RotateCcw className="w-3.5 h-3.5" /> Reset</button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <MonacoEditor
                                height="100%"
                                language={getMonacoLanguage(selectedLanguage)}
                                value={code}
                                onChange={(v) => setCode(v || "")}
                                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                                options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
                            />
                        </div>
                    </div>

                    {/* Resizer Horizontal */}
                    <div className={`h-1 bg-gray-300 dark:bg-gray-700 cursor-row-resize hover:bg-blue-500 z-10`} onMouseDown={() => setIsHorizontalResizing(true)} />

                    <div className="flex flex-col custom-scrollbar" style={{ height: `${100 - rightPanelSplit}%`, minHeight: `${100 - rightPanelSplit}%` }}>
                        <div className={`flex border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                            <button onClick={() => setActiveTab('output')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} ${activeTab === 'output' ? 'text-blue-500 border-t-2 border-t-blue-500' : 'text-gray-500'}`}><FileOutput className="w-3.5 h-3.5" /> Output</button>
                            <button onClick={() => setActiveTab('results')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'} ${activeTab === 'results' ? 'text-blue-500 border-t-2 border-t-blue-500' : 'text-gray-500'}`}><CheckCircle className="w-3.5 h-3.5" /> Results</button>
                            {exercise?.evaluationSettings?.aiEvaluation && (
                                <button onClick={() => setActiveTab('ai')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'ai' ? 'text-purple-500 border-t-2 border-t-purple-500' : 'text-gray-500'}`}><Brain className="w-3.5 h-3.5" /> AI</button>
                            )}
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3">
                            {activeTab === 'output' && (
                                <div className={`h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                                    <pre className={`text-xs font-mono whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{output || "Run code to see output..."}</pre>
                                </div>
                            )}
                            {activeTab === 'results' && testResults && (
                                <div className="space-y-2">
                                    <div className={`text-sm font-bold ${testResults.failed===0 ? 'text-green-500' : 'text-red-500'}`}>Passed: {testResults.passed}/{testResults.total}</div>
                                    {testResults.results.map((r, i) => (
                                        <div key={i} className={`p-2 rounded border text-xs ${r.passed ? 'border-green-800 bg-green-900/20' : 'border-red-800 bg-red-900/20'}`}>
                                            <div className="flex justify-between font-bold"><span>Test Case {i+1}</span><span>{r.passed?"PASS":"FAIL"}</span></div>
                                            {!r.passed && !r.isHidden && <div className="mt-1 opacity-75"><div>Exp: {r.expected}</div><div>Act: {r.actual}</div></div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'ai' && aiEvaluationResult && (
                                <div className="space-y-3">
                                    <div className="text-xl font-bold text-blue-400">Score: {aiEvaluationResult.score}/100</div>
                                    <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700 text-sm text-zinc-300">{aiEvaluationResult.feedback}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar { scrollbar-width: thin; scrollbar-color: ${theme === 'dark' ? '#4b5563 transparent' : '#9ca3af transparent'}; }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${theme === 'dark' ? '#4b5563' : '#9ca3af'}; border-radius: 4px; }
            `}</style>
        </div>
    )
}