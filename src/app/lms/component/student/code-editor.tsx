"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Script from 'next/script';
import {
    Play, RotateCcw, CheckCircle, Maximize2, Minimize2, Code, FileText,
    AlertCircle, Terminal, Menu, ChevronRight, ChevronLeft, Search,
    AlertTriangle, XCircle, Loader2, Brain, FileOutput, Clock,
    ShieldAlert, Eye, Lock, Camera, LogOut, Save, GripVertical, CheckCircle2,
    SkipForward, Video, Trash2, X
} from "lucide-react"
import dynamic from 'next/dynamic'
import axios from 'axios'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// --- API CONFIGURATION ---
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"
const GEMINI_API_KEY = "AIzaSyDZ9horfrJ0KvOkx_aHhTpIIvqjBoSPpJg" // ⚠️ Move to env in production

// --- CLOUDINARY CONFIGURATION ---
const CLOUDINARY_CLOUD_NAME = "dusxfgvhi";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const CLOUDINARY_PRESET = "dusxfgvhi";

// --- DYNAMIC EDITOR IMPORT ---
const MonacoEditor = dynamic(
    () => import('@monaco-editor/react'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#1e1e1e] text-gray-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-xs font-medium">Loading Editor...</p>
            </div>
        )
    }
)

// --- INTERFACES ---

interface LogEntry {
    id: string;
    type: 'stdout' | 'stderr' | 'stdin' | 'system';
    content: string;
    timestamp: number;
}

interface SecuritySettings {
    timerEnabled?: boolean;
    timerDuration?: number;
    cameraMicEnabled?: boolean;
    fullScreenMode?: boolean;
    tabSwitchAllowed?: boolean;
    maxTabSwitches?: number;
    disableClipboard?: boolean;
    screenRecordingEnabled?: boolean;
}

interface QuestionBehavior {
    attemptLimitEnabled?: boolean;
    maxAttempts?: number;
    allowSkip?: boolean;
    allowNext?: boolean;
    shuffleQuestions?: boolean;
    allowTestRun?: boolean;
}

interface CodeEditorProps {
    exercise?: any;
    defaultProblems?: any[];
    theme?: "light" | "dark";
    courseId?: string;
    studentId?: string;
    nodeId?: string;
    nodeName?: string;
    nodeType?: string;
    subcategory?: string;
    category?: string;
    onBack?: () => void;
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

// ---------------------------------------------------------------------------
// 1. COMPONENT: INTERACTIVE TERMINAL
// ---------------------------------------------------------------------------
const InteractiveTerminal = ({ isOpen, onClose, logs, isWaitingForInput, onInputSubmit, isRunning, language, onClear, inputPlaceholder = "Type input here..." }: any) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState("");
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        if (isWaitingForInput && inputRef.current) setTimeout(() => inputRef.current?.focus(), 50);
    }, [logs, isWaitingForInput, isOpen]);

    if (!isOpen) return null;

    return (
        <div className={`fixed z-[100] flex flex-col shadow-2xl rounded-lg overflow-hidden border border-slate-800 bg-slate-950 transition-all duration-300 ease-in-out font-sans animate-in slide-in-from-bottom-10`}
            style={isMaximized ? { top: '20px', left: '20px', right: '20px', bottom: '20px', width: 'auto', height: 'auto' } : { bottom: '20px', right: '20px', width: '600px', height: '400px' }}>
            
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    <div>
                        <span className="text-xs font-bold text-slate-200 block">Console Output</span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">{language || 'unknown'} • {isRunning ? 'Running...' : 'Idle'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onClear} className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors" title="Clear"><Trash2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setIsMaximized(!isMaximized)} className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors" title="Maximize"><Maximize2 className="w-3.5 h-3.5" /></button>
                    <button onClick={onClose} className="h-6 w-6 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors" title="Close"><X className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-slate-950 cursor-text scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {logs.length === 0 && !isRunning && <div className="text-slate-600 italic">Ready to execute. Click 'Run' to start.</div>}
                
                {logs.map((log: any) => (
                    <div key={log.id} className="break-all whitespace-pre-wrap leading-relaxed">
                        {log.type === 'stdout' && <span className="text-slate-300">{log.content}</span>}
                        {log.type === 'stderr' && <span className="text-rose-400">{log.content}</span>}
                        {log.type === 'system' && <span className="text-emerald-600/70 italic select-none">➜ {log.content}</span>}
                        {log.type === 'stdin' && <span className="text-amber-400 font-bold flex items-start gap-1"><span className="text-slate-600 select-none">$</span> {log.content}</span>}
                    </div>
                ))}
                
                {isRunning && !isWaitingForInput && (
                    <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                        <span className="text-slate-500 italic">Executing...</span>
                    </div>
                )}

                {isWaitingForInput && (
                    <form onSubmit={(e) => { e.preventDefault(); onInputSubmit(inputValue); setInputValue(""); }} className="flex items-center gap-2 mt-2 border-t border-slate-800 pt-2">
                        <span className="text-amber-500 font-bold select-none animate-pulse">{">"}</span>
                        <input 
                            ref={inputRef} 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            className="flex-1 bg-transparent border-none outline-none text-amber-400 font-bold placeholder:text-slate-700/50 caret-amber-400" 
                            placeholder={inputPlaceholder} 
                            autoComplete="off" 
                            autoFocus 
                        />
                    </form>
                )}
            </div>
        </div>
    );
};

// --- HELPER FUNCTIONS ---

const getPistonLanguage = (language: string): { language: string; version: string } => {
    const normLang = language.toLowerCase().trim();
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
    return languageMap[normLang] || { language: "javascript", version: "18.15.0" };
};

const getMonacoLanguage = (lang: string) => {
    const map: Record<string, string> = {
        'c': 'c', 'cpp': 'cpp', 'csharp': 'csharp', 'java': 'java',
        'python': 'python', 'sql': 'sql', 'javascript': 'javascript', 'typescript': 'typescript', 'plsql': 'sql'
    };
    return map[lang.toLowerCase()] || 'javascript';
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
    courseId = "unknown_course",
    studentId = "unknown_student",
    category = "We_Do",
    subcategory = "",
    onBack,
}: CodeEditorProps) {

    // ---------------------------------------------------------------------------
    // 1. CONFIGURATION
    // ---------------------------------------------------------------------------
    const isAssessmentMode = useMemo(() => {
        const normCategory = (category || "").replace(/_/g, ' ').toLowerCase().trim();
        return normCategory === 'you do';
    }, [category]);

    const activeSecurity = useMemo<SecuritySettings>(() => {
        if (!isAssessmentMode) return {};
        return { screenRecordingEnabled: true, ...exercise?.securitySettings };
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
                constraints: q.constraints || [],
                ...q
            }));
        }
        return defaultProblems || [];
    }, [exercise, defaultProblems]);

    const availableLanguages = exercise?.programmingSettings?.selectedLanguages || ["javascript", "python", "java", "cpp", "c", "csharp", "sql"];

    // ---------------------------------------------------------------------------
    // 2. STATE
    // ---------------------------------------------------------------------------
    
    // UI & Assessment State
    const [hasStarted, setHasStarted] = useState(!isAssessmentMode);
    const [isLocked, setIsLocked] = useState(false);
    const [isTerminated, setIsTerminated] = useState(false);
    const [terminationReason, setTerminationReason] = useState("");
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);

    // Execution Data
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
    const [selectedLanguage, setSelectedLanguage] = useState("javascript");
    const [testResults, setTestResults] = useState<TestRunResult | null>(null);
    const [aiEvaluationResult, setAIEvaluationResult] = useState<AIEvaluationResult | null>(null);
    const [userAttempts, setUserAttempts] = useState(0);
    const [solvedQuestions, setSolvedQuestions] = useState<Set<number>>(new Set());

    // UI Panels
    const [activeTab, setActiveTab] = useState<'results' | 'ai'>('results');
    const [isRunning, setIsRunning] = useState(false);
    const [leftPanelWidth, setLeftPanelWidth] = useState(40);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [showCopyWarning, setShowCopyWarning] = useState(false);

    // Terminal State
    const [showTerminal, setShowTerminal] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const inputResolverRef = useRef<((value: string) => void) | null>(null);
    const [pyodideReady, setPyodideReady] = useState(false);
    const pyodideRef = useRef<any>(null);

    // Recording & Refs
    const [isRecording, setIsRecording] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    // Critical Refs
    const editorRef = useRef<HTMLDivElement>(null); 
    const editorInstanceRef = useRef<any>(null);    
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);

    const currentQuestion = problems[currentProblemIndex];

    // ✅ PRE-ASSESSMENT LOCK CHECK (Ran once on mount)
    useEffect(() => {
        const checkStatus = async () => {
            if (!isAssessmentMode || !courseId || !exercise?._id) return;
            try {
                const token = localStorage.getItem('smartcliff_token') || '';
                const response = await axios.get('http://localhost:5533/exercise/status', {
                    params: { courseId, exerciseId: exercise._id, category, subcategory },
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    const { isLocked, status } = response.data.data;
                    if (isLocked || status === 'terminated' || status === 'completed') {
                        setIsLocked(true);
                        setIsTerminated(true);
                        setHasStarted(false);
                        setTerminationReason(status === 'completed' ? "Assessment Completed." : "Access Terminated.");
                    }
                }
            } catch (err) { console.error("Status check failed", err); }
        };
        checkStatus();
    }, [courseId, exercise?._id, category, subcategory, isAssessmentMode]);

    // ---------------------------------------------------------------------------
    // 3. ENGINE INITIALIZATION
    // ---------------------------------------------------------------------------

    const initEngines = async () => {
        try {
            if (!pyodideReady && (window as any).loadPyodide) {
                const pyodide = await (window as any).loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/" });
                pyodideRef.current = pyodide;
                setPyodideReady(true);
            }
        } catch (e) { console.error("Pyodide Load Error", e); }
        
        (window as any).getReactInput = () => new Promise((resolve) => {
            setIsWaitingForInput(true);
            inputResolverRef.current = resolve;
        });
    };

    const addLog = (type: LogEntry['type'], content: string) => {
        setTerminalLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), type, content, timestamp: Date.now() }]);
    };

    const clearTerminal = () => setTerminalLogs([]);

    const handleTerminalInput = (value: string) => {
        addLog('stdin', value);
        if (inputResolverRef.current) {
            inputResolverRef.current(value);
            inputResolverRef.current = null;
        }
        setIsWaitingForInput(false);
    };

    // ---------------------------------------------------------------------------
    // 4. EDITOR MANAGEMENT
    // ---------------------------------------------------------------------------

    const handleEditorDidMount = (editor: any) => {
        editorInstanceRef.current = editor;
        const initial = currentQuestion?.initialCode || "// Write your solution here...";
        editor.setValue(initial);

        if (activeSecurity.disableClipboard) {
            editor.onKeyDown((e: any) => {
                if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyC' || e.code === 'KeyV')) {
                    e.preventDefault();
                    e.stopPropagation();
                    toast.error("Copy/Paste Disabled");
                }
            });
        }
    };

    useEffect(() => {
        if (editorInstanceRef.current) {
            const newCode = currentQuestion?.initialCode || "// Write your solution here...";
            editorInstanceRef.current.setValue(newCode);
        }
        setTestResults(null);
        setAIEvaluationResult(null);
        setUserAttempts(0);
        clearTerminal();
    }, [currentProblemIndex]);

    // ---------------------------------------------------------------------------
    // 5. EXECUTION LOGIC
    // ---------------------------------------------------------------------------

    const initiateRunCode = async () => {
        const currentCode = editorInstanceRef.current ? editorInstanceRef.current.getValue() : "";
        if (!currentCode) { toast.error('No code to execute'); return; }

        setShowTerminal(true);
        clearTerminal();
        setIsRunning(true);

        const lang = selectedLanguage.toLowerCase().trim();

        if (lang === 'python') {
            if (!pyodideReady) { toast.loading("Loading Python Engine...", { duration: 2000 }); await initEngines(); }
            
            addLog('system', 'Initializing Python Environment...');
            try {
                pyodideRef.current.setStdout({ batched: (msg: string) => addLog('stdout', msg) });
                pyodideRef.current.setStderr({ batched: (msg: string) => addLog('stderr', msg) });
                
                const preamble = `
import js
import asyncio
import builtins
async def _async_input(prompt=""):
    if prompt: print(prompt, end="")
    return await js.getReactInput()
builtins.input = _async_input
`;
                await pyodideRef.current.runPythonAsync(preamble + "\n" + currentCode.replace(/input\s*\(/g, "await input("));
                addLog('system', 'Execution Finished');
            } catch (err: any) {
                addLog('stderr', err.message || String(err));
            } finally {
                setIsRunning(false);
                setIsWaitingForInput(false);
            }
            return;
        }

        addLog('system', `Compiling & Running ${lang.toUpperCase()}...`);
        
        const needsInput = ['java', 'c', 'cpp'].some(l => lang.includes(l)) && 
                           (currentCode.includes('Scanner') || currentCode.includes('scanf') || currentCode.includes('cin'));
        
        let stdin = "";
        if (needsInput) {
            addLog('system', '⚠️ Interactive Input Detected. \nPlease enter inputs below (separated by spaces/newlines) and hit Enter.');
            setIsWaitingForInput(true);
            stdin = await new Promise<string>((resolve) => { inputResolverRef.current = resolve; });
            addLog('system', 'Input captured. Sending to server...');
        }

        try {
            const config = getPistonLanguage(lang);
            const res = await fetch(PISTON_API_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    language: config.language, 
                    version: config.version, 
                    files: [{ content: currentCode }], 
                    stdin: stdin 
                }) 
            });
            const data = await res.json();
            
            if (data.run) {
                if (data.run.stdout) addLog('stdout', data.run.stdout);
                if (data.run.stderr) addLog('stderr', data.run.stderr);
                addLog('system', `Process exited (Runtime: ${data.run.time || 0}ms)`);
            } else {
                addLog('stderr', 'Execution failed to start.');
            }
        } catch (err: any) {
            addLog('stderr', `Network Error: ${err.message}`);
        } finally {
            setIsRunning(false);
            setIsWaitingForInput(false);
        }
    };

    const runTestsWithPiston = async (): Promise<TestRunResult> => {
        const testCases = currentQuestion.testCases || [];
        const results = [];
        let totalPassed = 0;
        let totalFailed = 0;
        const currentCode = editorInstanceRef.current ? editorInstanceRef.current.getValue() : "";

        for (const testCase of testCases) {
            try {
                const config = getPistonLanguage(selectedLanguage);
                const res = await fetch(PISTON_API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: config.language, version: config.version, files: [{ content: currentCode }], stdin: testCase.input })
                });
                const data = await res.json();
                
                const actual = data.run ? (data.run.output || "").trim() : "Error";
                const passed = actual.replace(/\r\n/g, '\n') === testCase.expectedOutput.trim().replace(/\r\n/g, '\n');

                results.push({
                    input: testCase.input,
                    expected: testCase.expectedOutput,
                    actual: actual,
                    passed,
                    isHidden: testCase.isHidden
                });

                if (passed) totalPassed++; else totalFailed++;
                await new Promise(r => setTimeout(r, 50)); 
            } catch (e) {
                totalFailed++;
            }
        }
        return { total: results.length, passed: totalPassed, failed: totalFailed, results, runtime: "N/A" };
    };

    const evaluateWithAI = async (): Promise<AIEvaluationResult> => {
        try {
            const currentCode = editorInstanceRef.current ? editorInstanceRef.current.getValue() : "";
            const prompt = `Evaluate code. Question: ${currentQuestion.title}. Code: ${currentCode}. Return JSON { "score": number, "isPassed": boolean, "feedback": string, "suggestions": string[] }`;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            throw new Error("Invalid AI Response");
        } catch (e) { return { score: 0, isPassed: false, feedback: "AI Eval Unavailable.", suggestions: [], detailedAnalysis: "" }; }
    };

    const submitProgressToBackend = async (status: string, score: number, details: any) => {
        try {
            const currentCode = editorInstanceRef.current ? editorInstanceRef.current.getValue() : "";
            const token = localStorage.getItem('smartcliff_token') || '';
            await axios.post('http://localhost:5533/courses/answers/submit', {
                courseId, exerciseId: exercise?._id, questionId: currentQuestion._id,
                code: currentCode, language: selectedLanguage, status, score, category, subcategory,
                attemptLimitEnabled: behavior.attemptLimitEnabled, maxAttempts: behavior.maxAttempts, ...details
            }, { headers: { Authorization: `Bearer ${token}` } });
            return true;
        } catch (error: any) {
            if (error.response?.status === 403) { toast.error("Max attempts reached!"); return false; }
            return true;
        }
    };

    // ---------------------------------------------------------------------------
    // 6. SECURITY & RECORDING
    // ---------------------------------------------------------------------------

    const uploadRecording = async (blob: Blob) => {
        const formData = new FormData();
        formData.append("file", blob); 
        formData.append("upload_preset", CLOUDINARY_PRESET); 
        formData.append("cloud_name", CLOUDINARY_CLOUD_NAME); 
        formData.append("public_id", `rec_${courseId}_${studentId}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, ""));
        try {
            await axios.post(CLOUDINARY_UPLOAD_URL, formData);
        } catch (error) { toast.error("Upload failed."); } finally { setIsSaving(false); }
    };

    const startCompositedRecording = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { mediaSource: "screen", frameRate: 15 }, audio: true });
            let webcamStream = cameraStream;
            if (!webcamStream && activeSecurity.cameraMicEnabled) {
                try {
                    webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, frameRate: 15 }, audio: true });
                    setCameraStream(webcamStream);
                    if (videoRef.current) videoRef.current.srcObject = webcamStream;
                } catch (e) { console.warn("Camera failed"); }
            }
            const screenVid = document.createElement("video"); screenVid.srcObject = screenStream; screenVid.play(); screenVideoRef.current = screenVid;
            const canvas = document.createElement("canvas"); canvas.width = 1280; canvas.height = 720; const ctx = canvas.getContext("2d"); canvasRef.current = canvas;
            const drawFrame = () => {
                if (!ctx || !screenVid) return;
                ctx.drawImage(screenVid, 0, 0, canvas.width, canvas.height);
                if (videoRef.current && webcamStream) {
                    ctx.fillStyle = "#000"; ctx.fillRect(canvas.width - 250 - 12, canvas.height - 190 - 12, 254, 194);
                    ctx.drawImage(videoRef.current, canvas.width - 250, canvas.height - 190, 240, 180);
                }
                animationFrameRef.current = requestAnimationFrame(drawFrame);
            };
            drawFrame();
            const mixedStream = canvas.captureStream(15);
            if (webcamStream?.getAudioTracks()[0]) mixedStream.addTrack(webcamStream.getAudioTracks()[0]);
            if (screenStream.getAudioTracks()[0]) mixedStream.addTrack(screenStream.getAudioTracks()[0]);
            const mediaRecorder = new MediaRecorder(mixedStream, { mimeType: 'video/webm; codecs=vp9' });
            mediaRecorderRef.current = mediaRecorder; recordedChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
            mediaRecorder.onstop = () => {
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                screenStream.getTracks().forEach(t => t.stop());
                if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
                uploadRecording(new Blob(recordedChunksRef.current, { type: 'video/webm' }));
            };
            mediaRecorder.start(2000); setIsRecording(true); return true;
        } catch (err) { toast.error("Screen recording permission required."); return false; }
    };

    const handleStartAssessment = async () => {
        if (activeSecurity.fullScreenMode) document.documentElement.requestFullscreen().catch(() => {});
        const started = await startCompositedRecording();
        if (started) setHasStarted(true);
    };

    // ✅ FIXED: Termination & Lock Logic
    const handleTermination = useCallback(async (reason: string, status: 'completed' | 'terminated' = 'terminated') => {
        if (!isAssessmentMode) return;
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            setIsSaving(true); mediaRecorderRef.current.stop(); setIsRecording(false);
        }
        
        // Immediate UI Block
        setIsLocked(true); 
        setIsTerminated(true); 
        setHasStarted(false); 
        setTerminationReason(reason);

        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        
        try {
            const token = localStorage.getItem('smartcliff_token') || '';
            await axios.post('http://localhost:5533/exercise/lock', {
                courseId, 
                exerciseId: exercise?._id, 
                category, 
                subcategory,
                status: status, // Dynamic Status
                reason
            }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (e) { console.error("Lock failed", e); }
    }, [isAssessmentMode, courseId, exercise, category, subcategory]);

    useEffect(() => {
        if (!hasStarted || !activeSecurity.timerEnabled) return;
        if (timeLeft === null && activeSecurity.timerDuration) setTimeLeft(activeSecurity.timerDuration * 60);
        const timer = setInterval(() => {
            setTimeLeft(p => {
                if (p !== null && p <= 0) { clearInterval(timer); handleTermination("Time Limit Exceeded", 'terminated'); return 0; }
                return p !== null ? p - 1 : null;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [activeSecurity.timerEnabled, hasStarted, handleTermination]);

    useEffect(() => {
        if (!hasStarted || isTerminated || !isAssessmentMode) return;
        const handleVisibility = () => {
            if (document.hidden) {
                if (!activeSecurity.tabSwitchAllowed) { handleTermination("Tab switching prohibited.", 'terminated'); return; }
                setTabSwitchCount(prev => {
                    const newCount = prev + 1;
                    const max = activeSecurity.maxTabSwitches || 0;
                    if (max > 0 && newCount > max) handleTermination(`Tab limit exceeded.`, 'terminated');
                    else toast.warn(`Tab switch detected!`, { theme: theme === 'dark' ? 'dark' : 'light' });
                    return newCount;
                });
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [activeSecurity, hasStarted, isTerminated]);

    // ---------------------------------------------------------------------------
    // 7. BUTTON HANDLERS
    // ---------------------------------------------------------------------------

    const handleSubmitCode = async () => {
        if (behavior.attemptLimitEnabled && userAttempts >= (behavior.maxAttempts || 1)) { toast.error(`Max attempts reached.`); return; }
        setIsRunning(true);
        const toastId = toast.loading("Evaluating...");
        let isSuccess = false; let score = 0; let evalDetails = {};
        
        try {
            if (exercise?.evaluationSettings?.aiEvaluation) {
                const aiRes = await evaluateWithAI();
                setAIEvaluationResult(aiRes); isSuccess = aiRes.isPassed; score = aiRes.score; evalDetails = { aiFeedback: aiRes.feedback };
                setActiveTab('ai');
            } else {
                const testRes = await runTestsWithPiston();
                setTestResults(testRes); isSuccess = testRes.failed === 0;
                score = isSuccess ? 100 : Math.floor((testRes.passed / testRes.total) * 100);
                evalDetails = { totalTests: testRes.total, passed: testRes.passed };
                setActiveTab('results');
            }
            
            const backendSuccess = await submitProgressToBackend(isSuccess ? 'solved' : 'attempted', score, evalDetails);
            
            if (backendSuccess) {
                setUserAttempts(prev => prev + 1);
                if (isSuccess) {
                    setSolvedQuestions(prev => new Set(prev).add(currentProblemIndex));
                    toast.update(toastId, { render: "Accepted!", type: "success", isLoading: false, autoClose: 2000 });
                    
                    if (behavior.allowNext && currentProblemIndex < problems.length - 1) {
                        setTimeout(() => setCurrentProblemIndex(p => p + 1), 1500);
                    }
                } else {
                    toast.update(toastId, { render: "Incorrect.", type: "error", isLoading: false, autoClose: 2000 });
                }

                // ✅ FIX: EXPLICIT LOCK CALL ON LAST QUESTION SUBMISSION
                if (currentProblemIndex === problems.length - 1 && isAssessmentMode) {
                    toast.success("All questions submitted. Completing Assessment...");
                    setTimeout(() => handleTermination("Assessment Completed Successfully", 'completed'), 2000);
                }
            }
        } catch (e) { toast.update(toastId, { render: "System Error.", type: "error", isLoading: false }); } finally { setIsRunning(false); }
    };

    // ---------------------------------------------------------------------------
    // 8. RENDER
    // ---------------------------------------------------------------------------

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (isResizing && containerRef.current) {
                const newW = ((e.clientX - containerRef.current.getBoundingClientRect().left) / containerRef.current.clientWidth) * 100;
                setLeftPanelWidth(Math.min(Math.max(20, newW), 60));
            }
        };
        const handleUp = () => setIsResizing(false);
        if (isResizing) { document.addEventListener('mousemove', handleMove); document.addEventListener('mouseup', handleUp); }
        return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    }, [isResizing]);

    // ✅ TERMINATED SCREEN (RENDER BLOCK)
    if (isTerminated || isLocked) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white p-4">
                <ToastContainer theme="dark" />
                <div className="bg-zinc-800 p-8 rounded border border-red-600 max-w-md text-center shadow-2xl">
                    {isSaving ? <><Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" /><h2>Saving Session...</h2></> : 
                    <><XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Access Terminated</h2>
                    <p className="mb-4 text-red-200">{terminationReason}</p>
                    <button onClick={onBack} className="bg-zinc-700 px-6 py-2 rounded hover:bg-zinc-600 font-bold w-full">Return</button></>}
                </div>
            </div>
        );
    }

    return (
        <div ref={editorRef} className={`${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} border-gray-300 rounded-lg w-full flex flex-col border transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-50 rounded-none" : "relative h-full min-h-0 flex-1"}`}>
            <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} position="top-right" />
            <Script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" onLoad={initEngines} strategy="afterInteractive" />
            
            <InteractiveTerminal 
                isOpen={showTerminal} 
                onClose={() => setShowTerminal(false)} 
                logs={terminalLogs} 
                isRunning={isRunning} 
                isWaitingForInput={isWaitingForInput} 
                onInputSubmit={handleTerminalInput} 
                language={selectedLanguage} 
                onClear={clearTerminal} 
            />

            {isAssessmentMode && !hasStarted && (
                <div className="absolute inset-0 z-[60] bg-zinc-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 p-6">
                        <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2 mb-4"><ShieldAlert className="w-5 h-5" /> Assessment Mode</h2>
                        <div className="space-y-3 mb-6 text-sm text-zinc-300">
                            <p><strong>Instructions:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Timed Assessment</li><li>Full Screen Required</li><li>Monitoring Active</li>
                            </ul>
                        </div>
                        <button onClick={handleStartAssessment} className="w-full px-4 py-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold">Start Assessment</button>
                        <button onClick={onBack} className="w-full mt-3 px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white font-medium">Cancel</button>
                    </div>
                </div>
            )}

            <div className={`flex items-center justify-between p-2.5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <h1 className="font-bold text-sm">{exercise?.exerciseInformation?.exerciseName || "Code Assessment"}</h1>
                        <span className="text-[10px] text-zinc-500">Problem {currentProblemIndex + 1} of {problems.length}</span>
                    </div>
                    {activeSecurity.timerEnabled && timeLeft !== null && <div className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1"><Clock size={12} /> {formatTime(timeLeft)}</div>}
                    {activeSecurity.cameraMicEnabled && isAssessmentMode && (
                        <div className="w-24 h-16 bg-black rounded border border-zinc-600 overflow-hidden relative shadow-lg">
                            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="h-7 text-xs border rounded px-1.5 bg-zinc-800 text-white border-zinc-600">
                        {availableLanguages.map((lang: string) => <option key={lang} value={lang}>{lang.toUpperCase()}</option>)}
                    </select>
                    {behavior.allowSkip && currentProblemIndex < problems.length - 1 && <button onClick={() => setCurrentProblemIndex(p => p + 1)} className="h-7 px-2 text-xs bg-zinc-700 text-white rounded hover:bg-zinc-600 flex items-center gap-1"><SkipForward className="w-3 h-3" /> Skip</button>}
                    <button onClick={initiateRunCode} disabled={isRunning} className="h-7 px-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1">{isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run</button>
                    <button onClick={handleSubmitCode} disabled={isRunning} className="h-7 px-2 text-xs bg-green-600 text-white rounded hover:bg-green-500 flex items-center gap-1">
                        {currentProblemIndex === problems.length - 1 && isAssessmentMode ? "Finish Assessment" : "Submit"}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative" ref={containerRef}>
                <div style={{ width: `${leftPanelWidth}%` }} className="overflow-y-auto h-full custom-scrollbar border-r border-zinc-700 p-5 space-y-4">
                     <h1 className="text-lg font-bold">{currentQuestion?.title}</h1>
                     <div className="prose prose-invert text-sm whitespace-pre-line">{currentQuestion?.description}</div>
                     {currentQuestion?.sampleInput && <div className="mt-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2 rounded"><div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Sample Input</div><div className="text-xs font-mono text-zinc-800 dark:text-zinc-200">{currentQuestion.sampleInput}</div></div>}
                     {currentQuestion?.sampleOutput && <div className="mt-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2 rounded"><div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Expected Output</div><div className="text-xs font-mono text-zinc-800 dark:text-zinc-200">{currentQuestion.sampleOutput}</div></div>}
                </div>
                <div className="w-1 bg-zinc-700 cursor-col-resize hover:bg-blue-500 transition-colors" onMouseDown={() => setIsResizing(true)} />
                <div className="flex flex-col flex-1 min-w-0 h-full" style={{ width: `${100 - leftPanelWidth}%` }}>
                    <div className="flex-1 min-h-0 relative">
                         {showCopyWarning && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className="bg-red-900/80 border border-red-500 p-4 rounded text-white text-center font-bold">Copy/Paste is Disabled!</div></div>}
                         <MonacoEditor height="100%" defaultValue="// Initializing..." defaultLanguage="javascript" language={getMonacoLanguage(selectedLanguage)} theme={theme === 'dark' ? 'vs-dark' : 'vs'} onMount={handleEditorDidMount} options={{ minimap: { enabled: true }, fontSize: 14, automaticLayout: true }} />
                    </div>
                    {/* RESULTS PANEL (AI / TESTS) */}
                    <div className="h-1/3 border-t border-zinc-700 bg-zinc-900 p-2 overflow-y-auto flex flex-col">
                        <div className="flex gap-4 border-b border-zinc-700 mb-2 pb-1 text-xs">
                             {exercise?.evaluationSettings?.automationEvaluation && <button onClick={() => setActiveTab('results')} className={`flex items-center gap-1 ${activeTab === 'results' ? 'text-blue-400 font-bold border-b-2 border-blue-400' : 'text-zinc-500'}`}><CheckCircle2 size={12}/> Tests</button>}
                             {exercise?.evaluationSettings?.aiEvaluation && <button onClick={() => setActiveTab('ai')} className={`flex items-center gap-1 ${activeTab === 'ai' ? 'text-purple-400 font-bold border-b-2 border-purple-400' : 'text-zinc-500'}`}><Brain size={12}/> AI Feedback</button>}
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {activeTab === 'results' && testResults && (
                                 <div className="space-y-2">
                                    <div className={`text-sm font-bold ${testResults.failed === 0 ? "text-green-400" : "text-red-400"}`}>Passed: {testResults.passed}/{testResults.total}</div>
                                    {testResults.results.map((r, i) => (
                                        <div key={i} className={`text-xs p-2 rounded border ${r.passed ? 'border-green-800 bg-green-900/20' : 'border-red-800 bg-red-900/20'}`}>
                                            <div className="font-bold mb-1 flex justify-between"><span>Test {i+1} {r.isHidden ? '(Hidden)' : ''}</span><span>{r.passed ? 'PASSED' : 'FAILED'}</span></div>
                                            {!r.passed && !r.isHidden && <div className="grid grid-cols-2 gap-2 mt-1 opacity-80"><div><span className="text-zinc-500">Exp:</span> {r.expected}</div><div><span className="text-zinc-500">Act:</span> {r.actual}</div></div>}
                                        </div>
                                    ))}
                                 </div>
                            )}
                            {activeTab === 'ai' && aiEvaluationResult && (
                                <div className="space-y-3">
                                    <div className={`text-sm font-bold ${aiEvaluationResult.isPassed ? "text-green-400" : "text-amber-400"}`}>Score: {aiEvaluationResult.score}/100</div>
                                    <div className="text-xs text-zinc-300 bg-zinc-800 p-2 rounded border border-zinc-700">{aiEvaluationResult.feedback}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </div>
    )
}