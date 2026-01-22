"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
    Play, RotateCcw, CheckCircle2, Maximize2, Minimize2,  // Add this
    X, Code, FileText, AlertCircle, Terminal, Menu, ChevronRight, ChevronLeft, Search, AlertTriangle, CheckCircle, XCircle, Lock, ArrowUpDown, X as XIcon, Loader2, SkipForward, Clock, ShieldAlert, Camera, Video, Save, LogOut, Trash2, Shield, Mic, MicOff, ShieldCheck, UserCheck, Monitor
} from "lucide-react"
import dynamic from 'next/dynamic'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'
import Script from 'next/script'

// Piston API configuration
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"

// Cloudinary configuration for recording
const CLOUDINARY_CLOUD_NAME = "dusxfgvhi";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const CLOUDINARY_PRESET = "dusxfgvhi";

const MonacoEditor = dynamic(
    () => import('@monaco-editor/react'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-gray-600">Loading Editor...</p>
                </div>
            </div>
        )
    }
)

interface ToastNotification {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    duration: number;
}

interface ExerciseInformation {
    exerciseId: string
    exerciseName: string
    description: string
    exerciseLevel: "beginner" | "medium" | "hard"
    _id: string
    totalPoints?: number
    totalQuestions?: number
    estimatedTime?: number
}

interface ProgrammingSettings {
    selectedModule: string
    selectedLanguages: string[]
    _id: string
    levelConfiguration?: {
        levelBased?: {
            easy: number
            medium: number
            hard: number
        }
        levelType: string
        general: number
    }
}

interface CompilerSettings {
    allowCopyPaste: boolean
    autoSuggestion: boolean
    autoCloseBrackets: boolean
    _id: string
    theme?: string
    fontSize?: number
    tabSize?: number
}

interface AvailabilityPeriod {
    startDate: string
    endDate: string
    gracePeriodAllowed: boolean
    gracePeriodDate: string | null
    _id: string
}

interface QuestionBehavior {
    shuffleQuestions: boolean
    allowNext: boolean
    allowSkip: boolean
    attemptLimitEnabled: boolean
    maxAttempts: number
    _id: string
    showPoints?: boolean
    showDifficulty?: boolean
    allowHintUsage?: boolean
    allowTestRun?: boolean
}

interface ManualEvaluation {
    enabled: boolean
    submissionNeeded: boolean
    _id: string
}

interface EvaluationSettings {
    practiceMode: boolean
    manualEvaluation: ManualEvaluation
    aiEvaluation: boolean
    automationEvaluation: boolean
    _id: string
    passingScore?: number
    showResultsImmediately?: boolean
    allowReview?: boolean
}

interface GroupSettings {
    groupSettingsEnabled: boolean
    showExistingUsers: boolean
    selectedGroups: any[]
    chatEnabled: boolean
    _id: string
    collaborationEnabled?: boolean
}

interface ExerciseQuestion {
    _id: string
    title: string
    description: string
    difficulty: "easy" | "medium" | "hard" | "beginner" | "intermediate" | "advanced"
    sampleInput: string
    sampleOutput: string
    points: number
    constraints: string[]
    hints: Array<{
        hintText: string
        pointsDeduction: number
        isPublic: boolean
        sequence: number
        _id: string
    }>
    testCases: Array<{
        input: string
        expectedOutput: string
        isSample: boolean
        isHidden: boolean
        points: number
        explanation?: string
        _id: string
    }>
    solutions: {
        startedCode?: string
        staetedCode?: string
        functionName: string
        language: string
        _id: string
    }
    timeLimit: number
    memoryLimit: number
    isActive: boolean
    sequence: number
    createdAt: string
    updatedAt: string
    allowedLanguages?: string[]
}

interface Exercise {
    _id: string
    exerciseInformation: ExerciseInformation
    programmingSettings: ProgrammingSettings
    compilerSettings: CompilerSettings
    availabilityPeriod: AvailabilityPeriod
    questionBehavior: QuestionBehavior
    evaluationSettings: EvaluationSettings
    groupSettings: GroupSettings
    createdAt: string
    updatedAt: string
    version?: number
    questions: ExerciseQuestion[]
    courseId?: string
    securitySettings?: {
        timerEnabled?: boolean
        timerDuration?: number
        cameraMicEnabled?: boolean
        fullScreenMode?: boolean
        tabSwitchAllowed?: boolean
        maxTabSwitches?: number
        disableClipboard?: boolean
        screenRecordingEnabled?: boolean
    }
}

interface ProblemData {
    id: number
    title: string
    description: string
    difficulty: "Easy" | "Medium" | "Hard"
    examples: Array<{
        input: string
        output: string
        explanation?: string
    }>
    constraints: string[]
    initialCode: string
    hints?: string[]
    solution?: string
}

interface LogEntry {
    id: string;
    type: 'stdout' | 'stderr' | 'stdin' | 'system' | 'error' | 'warning' | 'success' | 'info';
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

// In your CodeEditor component, update the interface
interface CodeEditorProps {
    exercise?: Exercise;
    defaultProblems?: ProblemData[];
    onDropdownCollapsed?: () => void;
    breadcrumbCollapsed?: boolean;
    onBreadcrumbCollapseToggle?: () => void;
    theme?: "light" | "dark";
    courseId?: string;
    nodeId?: string;
    nodeName?: string;
    nodeType?: string;
    subcategory?: string;
    category?: string;
    studentId?: string;
    onBack?: () => void;
    // Add these new props
    onCloseExercise?: () => void; // Renamed for clarity
    onResetExercise?: () => void; // Alternative: specific function to reset exercise
}

const convertExerciseToProblems = (exercise: Exercise): ProblemData[] => {
    if (!exercise.questions || exercise.questions.length === 0) {
        return [{
            id: 1,
            title: exercise.exerciseInformation.exerciseName || "Exercise",
            description: exercise.exerciseInformation.description || "Complete the exercise",
            difficulty: (exercise.exerciseInformation.exerciseLevel.charAt(0).toUpperCase() + exercise.exerciseInformation.exerciseLevel.slice(1)) as "Easy" | "Medium" | "Hard",
            examples: [],
            constraints: [],
            initialCode: exercise.questions?.[0]?.solutions?.startedCode || exercise.questions?.[0]?.solutions?.staetedCode || `// Write your solution here\nfunction solution() {\n    // Your code here\n    return null;\n}`,
            hints: exercise.questions?.[0]?.hints?.map(h => h.hintText) || [],
            solution: exercise.questions?.[0]?.solutions?.startedCode || exercise.questions?.[0]?.solutions?.staetedCode
        }];
    }

    return exercise.questions.map((question, index) => ({
        id: index + 1,
        title: question.title || `Question ${index + 1}`,
        description: question.description || `Solve question ${index + 1}`,
        difficulty: (question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)) as "Easy" | "Medium" | "Hard",
        examples: [{
            input: question.sampleInput,
            output: question.sampleOutput,
            explanation: "Sample input and output"
        }],
        constraints: question.constraints || [],
        initialCode: question.solutions?.startedCode || question.solutions?.staetedCode || `// Write your solution here\nfunction ${question.solutions?.functionName || 'solution'}() {\n    // Your code here\n    return null;\n}`,
        hints: question.hints?.map(h => h.hintText) || [],
        solution: question.solutions?.startedCode || question.solutions?.staetedCode
    }));
};

const getPistonLanguage = (language: string): { language: string; version: string } => {
    const languageMap: { [key: string]: { language: string; version: string } } = {
        javascript: { language: "javascript", version: "18.15.0" },
        python: { language: "python", version: "3.10.0" },
        java: { language: "java", version: "15.0.2" },
        cpp: { language: "cpp", version: "10.2.0" },
        c: { language: "c", version: "10.2.0" },
        csharp: { language: "csharp", version: "6.12.0" },
        typescript: { language: "typescript", version: "5.0.3" }
    };
    return languageMap[language.toLowerCase()] || { language: "javascript", version: "18.15.0" };
};

// Security Agreement Modal Component
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
                            {/* In SecurityAgreementModal component, around line ~160 */}
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
                                <li className="flex items-center gap-2">
                                    <Camera className="w-3 h-3 text-gray-500" />
                                    <span>Camera: Disabled</span>
                                </li>
                            )}

                            {/* Screen Recording - Always shown */}
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
                                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                                    <span>Copy/Paste Disabled</span>
                                </li>
                            ) : (
                                <li className="flex items-center gap-2 text-gray-400">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Copy/Paste: Allowed</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-yellow-800 bg-yellow-900/10' : 'border-yellow-300 bg-yellow-50'}`}>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                            Important Instructions
                        </h4>
                        <ul className="text-sm space-y-1">
                            <li>• You must allow screen recording when prompted</li>
                            <li>• Keep your camera on throughout the assessment</li>
                            <li>• Do not switch tabs or windows during the assessment</li>
                            <li>• Do not use external resources unless permitted</li>
                            <li>• Complete all questions within the time limit</li>
                            <li>• Violations may result in automatic termination</li>
                        </ul>
                    </div> */}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-medium border transition-colors ${theme === 'dark'
                            ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                    >
                        Cancel Assessment  {/* Text changed from "Cancel" to "Cancel Assessment" */}
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
// Add this component near the SecurityAgreementModal component
const ExitConfirmationModal = ({
    isOpen,
    onConfirm,
    onCancel,
    theme = "light"
}: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    theme?: "light" | "dark";
}) => {
    if (!isOpen) return null;

    const themeClasses = theme === 'dark'
        ? 'bg-gray-900 text-white border-gray-700'
        : 'bg-white text-gray-900 border-gray-300';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-xl shadow-2xl border p-6 ${themeClasses}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Exit Assessment?</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Are you sure you want to leave the assessment?
                        </p>
                    </div>
                </div>

                <div className="mb-6">
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <h4 className="font-semibold mb-2">⚠️ Important Notice</h4>
                        <ul className="text-sm space-y-2">
                            <li className="flex items-start gap-2">
                                <div className="mt-0.5">•</div>
                                <span>Your progress will be saved up to this point</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-0.5">•</div>
                                <span>You cannot resume this assessment once exited</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-0.5">•</div>
                                <span>This action may be recorded and reviewed</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-medium border transition-colors ${theme === 'dark'
                            ? 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                    >
                        Continue Assessment
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 px-4 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Exit Assessment
                    </button>
                </div>
            </div>
        </div>
    );
};
// Interactive Terminal Component
const InteractiveTerminal = ({
    isOpen,
    onClose,
    logs,
    isWaitingForInput,
    onInputSubmit,
    isRunning,
    language,
    onClear,
    theme = "light"
}: any) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState("");
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        if (isWaitingForInput && inputRef.current) setTimeout(() => inputRef.current?.focus(), 50);
    }, [logs, isWaitingForInput, isOpen]);

    if (!isOpen) return null;

    const themeClasses = theme === 'dark'
        ? 'bg-slate-950 text-slate-300 border-slate-800'
        : 'bg-white text-gray-800 border-gray-300';

    return (
        <div className={`fixed z-[100] flex flex-col shadow-2xl rounded-lg overflow-hidden border transition-all duration-300 ease-in-out font-sans animate-in slide-in-from-bottom-10 ${themeClasses}`}
            style={isMaximized ? { top: '20px', left: '20px', right: '20px', bottom: '20px', width: 'auto', height: 'auto' } : { bottom: '20px', right: '20px', width: '600px', height: '400px' }}>

            <div className={`flex items-center justify-between px-4 py-2 border-b ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-gray-100 border-gray-300'}`}>
                <div className="flex items-center gap-2.5">
                    <Terminal className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-500' : 'text-green-600'}`} />
                    <div>
                        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>Console Output</span>
                        <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-600'} font-mono uppercase`}>
                            {language || 'unknown'} • {isRunning ? 'Running...' : 'Idle'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onClear}
                        className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                        title="Clear"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-200'}`}
                        title="Maximize"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onClose}
                        className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-red-400 hover:bg-slate-800' : 'text-gray-500 hover:text-red-600 hover:bg-gray-200'}`}
                        title="Close"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className={`flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin ${theme === 'dark' ? 'bg-slate-950 text-slate-300 scrollbar-thumb-slate-700' : 'bg-white text-gray-800 scrollbar-thumb-gray-300'}`}
            >
                {logs.length === 0 && !isRunning && (
                    <div className={`italic ${theme === 'dark' ? 'text-slate-600' : 'text-gray-500'}`}>
                        Ready to execute. Click 'Run' to start.
                    </div>
                )}

                {logs.map((log: LogEntry) => (
                    <div key={log.id} className="break-all whitespace-pre-wrap leading-relaxed">
                        {log.type === 'stdout' && <span className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>{log.content}</span>}
                        {log.type === 'stderr' && <span className="text-rose-600 dark:text-rose-400">{log.content}</span>}
                        {log.type === 'system' && <span className={`italic select-none ${theme === 'dark' ? 'text-emerald-400' : 'text-green-600'}`}>➜ {log.content}</span>}
                        {log.type === 'stdin' && <span className={`font-bold flex items-start gap-1 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                            <span className={theme === 'dark' ? 'text-slate-600' : 'text-gray-500'}>$</span> {log.content}
                        </span>}
                        {log.type === 'error' && <span className="text-red-600 dark:text-red-400">{log.content}</span>}
                        {log.type === 'warning' && <span className="text-yellow-600 dark:text-yellow-400">{log.content}</span>}
                        {log.type === 'success' && <span className="text-green-600 dark:text-green-400">{log.content}</span>}
                        {log.type === 'info' && <span className="text-blue-600 dark:text-blue-400">{log.content}</span>}
                    </div>
                ))}

                {isRunning && !isWaitingForInput && (
                    <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                        <span className={theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}>Executing...</span>
                    </div>
                )}

                {isWaitingForInput && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            onInputSubmit(inputValue);
                            setInputValue("");
                        }}
                        className={`flex items-center gap-2 mt-2 border-t pt-2 ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}
                    >
                        <span className="text-amber-500 font-bold select-none animate-pulse">{">"}</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className={`flex-1 bg-transparent border-none outline-none font-bold placeholder:${theme === 'dark' ? 'text-slate-700' : 'text-gray-400'} caret-amber-400`}
                            placeholder="Type input and press Enter..."
                            autoComplete="off"
                            autoFocus
                        />
                    </form>
                )}
            </div>
        </div>
    );
};

export default function CodeEditor({
    exercise,
    defaultProblems,
    onDropdownCollapsed,
    breadcrumbCollapsed,
    onBreadcrumbCollapseToggle,
    theme = "light",
    courseId = "",
    nodeId = "",
    nodeName = "",
    nodeType = "",
    subcategory = "",
    category = "We_Do",
    studentId = "unknown_student",
    onBack,
    // Add these new props
    onCloseExercise,
    onResetExercise
}: CodeEditorProps) {
    // --- Security State ---
    const [isAssessmentMode, setIsAssessmentMode] = useState(false);
    const [showSecurityAgreement, setShowSecurityAgreement] = useState(false);
    const [hasAgreedToSecurity, setHasAgreedToSecurity] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [isTerminated, setIsTerminated] = useState(false);
    const [terminationReason, setTerminationReason] = useState("");
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [showTerminal, setShowTerminal] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
    const [isWaitingForInput, setIsWaitingForInput] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [isInFullscreenMode, setIsInFullscreenMode] = useState(false);
    const [micEnabled, setMicEnabled] = useState(true);
    const [pyodideReady, setPyodideReady] = useState(false);
    const pyodideRef = useRef<any>(null);
    const [showSearch, setShowSearch] = useState(false);

    // --- Core State ---
    const [code, setCode] = useState("")
    const [selectedLanguage, setSelectedLanguage] = useState("javascript")
    const [output, setOutput] = useState("")
    const [isRunning, setIsRunning] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
    const [showSidebar, setShowSidebar] = useState(false)
    const [leftPanelWidth, setLeftPanelWidth] = useState(40)
    const [isResizing, setIsResizing] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const editorRef = useRef<HTMLDivElement>(null)
    const descriptionRef = useRef<HTMLDivElement>(null)
    const [editorReady, setEditorReady] = useState(false)
    const [isHorizontalResizing, setIsHorizontalResizing] = useState(false)
    const [showCopyWarning, setShowCopyWarning] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState<ExerciseQuestion | null>(null)
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);
    const [userAttempts, setUserAttempts] = useState(0);
    const [attemptsLoaded, setAttemptsLoaded] = useState(false);
    const [solvedQuestions, setSolvedQuestions] = useState<Set<number>>(new Set());
    const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());

    // --- Available Languages ---
    const [availableLanguages, setAvailableLanguages] = useState<string[]>(["javascript", "python", "java", "cpp", "c", "csharp"]);

    // --- Refs ---
    const currentQuestionRef = useRef<string>("");
    const editorInstanceRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement>(null);
    const inputResolverRef = useRef<((value: string) => void) | null>(null);
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);
    const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null);

    // Add these with your existing state variables
    // Add these with your existing state variables
    const [sortBy, setSortBy] = useState<'default' | 'difficulty' | 'title'>('default');
    const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
    const problems = useMemo(() => {
        return exercise
            ? convertExerciseToProblems(exercise)
            : (defaultProblems || [])
    }, [exercise, defaultProblems])
    const problem = problems.length > 0 ? problems[currentProblemIndex] : null

    // --- Security Configuration ---
    const securitySettings = exercise?.securitySettings || {};

    // Determine if assessment mode is active (You Do category)
    useEffect(() => {
        const normCategory = (category || "").replace(/_/g, ' ').toLowerCase().trim();
        const isYouDoCategory = normCategory === 'you do';

        setIsAssessmentMode(isYouDoCategory);

        // Show security agreement if You Do category
        if (isYouDoCategory && !hasAgreedToSecurity) {
            setShowSecurityAgreement(true);
        }

        if (!isAssessmentMode) {
            setHasStarted(true); // Auto-start if not assessment mode
        }
    }, [category, hasAgreedToSecurity]);
    const normalizeLanguageName = (lang: string): string => {
        const normalized = lang.toLowerCase();
        if (normalized.includes('python')) return 'python';
        if (normalized.includes('java') && !normalized.includes('javascript')) return 'java';
        if (normalized.includes('javascript') || normalized.includes('js')) return 'javascript';
        if (normalized.includes('c++') || normalized.includes('cpp')) return 'cpp';
        if (normalized === 'c' || normalized.includes('c ')) return 'c';
        if (normalized.includes('c#') || normalized.includes('csharp')) return 'csharp';
        if (normalized.includes('typescript') || normalized.includes('ts')) return 'typescript';
        return normalized;
    };


    // --- Initialize ---
    useEffect(() => {
        if (exercise?.questions && exercise.questions.length > 0) {
            const question = exercise.questions[currentProblemIndex];
            setCurrentQuestion(question || null);
            currentQuestionRef.current = question?._id || "";

            // Get available languages for THIS SPECIFIC QUESTION
            let allowedLanguages: string[] = [];

            // 1. Check if question has specific allowed languages
            if (question?.allowedLanguages && question.allowedLanguages.length > 0) {
                allowedLanguages = question.allowedLanguages.map(lang => lang.toLowerCase());
            }

            // 2. If not, use the exercise's programming settings
            if (allowedLanguages.length === 0 && exercise.programmingSettings?.selectedLanguages) {
                allowedLanguages = exercise.programmingSettings.selectedLanguages.map(lang => lang.toLowerCase());
            }

            // 3. If still empty, default to the question's solution language
            if (allowedLanguages.length === 0 && question?.solutions?.language) {
                allowedLanguages = [question.solutions.language.toLowerCase()];
            }

            // 4. If still empty, use a sensible default based on available languages
            if (allowedLanguages.length === 0) {
                allowedLanguages = ["javascript", "python", "java", "cpp", "c", "csharp"];
            }

            // Normalize language names
            const normalizedLanguages = allowedLanguages.map(lang => {
                const normalized = lang.toLowerCase();
                if (normalized.includes('python')) return 'python';
                if (normalized.includes('java') && !normalized.includes('javascript')) return 'java';
                if (normalized.includes('javascript') || normalized.includes('js')) return 'javascript';
                if (normalized.includes('c++') || normalized.includes('cpp')) return 'cpp';
                if (normalized === 'c' || normalized.includes('c ')) return 'c';
                if (normalized.includes('c#') || normalized.includes('csharp')) return 'csharp';
                if (normalized.includes('typescript') || normalized.includes('ts')) return 'typescript';
                return normalized;
            });

            // Remove duplicates
            const uniqueLanguages = Array.from(new Set(normalizedLanguages)).filter(lang => lang && lang.trim() !== "");

            setAvailableLanguages(uniqueLanguages);

            // Set initial language - use question's solution language if available and allowed
            if (question?.solutions?.language) {
                const lang = question.solutions.language.toLowerCase();
                const normalizedLang = normalizeLanguageName(lang);

                if (uniqueLanguages.includes(normalizedLang)) {
                    setSelectedLanguage(normalizedLang);
                } else if (uniqueLanguages.length > 0) {
                    setSelectedLanguage(uniqueLanguages[0]);
                }
            } else if (uniqueLanguages.length > 0) {
                setSelectedLanguage(uniqueLanguages[0]);
            }
        } else {
            setCurrentQuestion(null);
            currentQuestionRef.current = "";

            // Default languages if no exercise
            setAvailableLanguages(["javascript", "python", "java", "cpp", "c", "csharp"]);
            setSelectedLanguage("javascript");
        }

        if (problem?.initialCode) {
            setCode(problem.initialCode)
            setOutput("")
        } else {
            setCode(`// Start coding here...
function solve() {
    // Your solution goes here
    return null;
}`)
        }
    }, [problem, exercise, currentProblemIndex])


    // --- Pyodide Initialization ---
    const initPyodide = async () => {
        if (!pyodideReady && (window as any).loadPyodide) {
            try {
                const pyodide = await (window as any).loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
                });
                pyodideRef.current = pyodide;
                setPyodideReady(true);

                // Setup async input for Python
                (window as any).getReactInput = () => new Promise((resolve) => {
                    setIsWaitingForInput(true);
                    inputResolverRef.current = resolve;
                });
            } catch (e) {
                console.error("Pyodide Load Error", e);
            }
        }
    };

    // --- Toast System ---
    const showToast = (notification: Omit<ToastNotification, 'id'>) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast = { ...notification, id };
        setToasts(prev => [...prev, newToast]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, notification.duration);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    // --- User Progress ---
    const fetchUserProgress = useCallback(async (questionId?: string) => {
        const targetQuestionId = questionId || currentQuestion?._id;
        if (!exercise || !targetQuestionId) return;

        if (questionId && currentQuestionRef.current !== questionId) {
            return;
        }

        try {
            setIsLoadingAttempts(true);
            const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';

            const params = new URLSearchParams({
                courseId: courseId || (exercise.courseId ? exercise.courseId.toString() : ""),
                exerciseId: exercise._id,
                questionId: targetQuestionId,
                category: category || "We_Do",
                subcategory: subcategory || ""
            });

            const response = await fetch(`https://lms-server-ym1q.onrender.com/courses/answers/single?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (currentQuestionRef.current !== targetQuestionId) {
                return;
            }

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setUserAttempts(data.attempts || 0);
                    setAttemptsLoaded(true);

                    if (data.data && data.data !== "null" && data.data.trim() !== "") {
                        setCode(data.data);
                    }

                    if (data.status === 'solved') {
                        setSolvedQuestions(prev => {
                            const newSet = new Set(prev);
                            newSet.add(currentProblemIndex);
                            return newSet;
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch progress for question:", error);
            setAttemptsLoaded(true);
        } finally {
            setIsLoadingAttempts(false);
        }
    }, [courseId, exercise, currentQuestion, category, subcategory, currentProblemIndex]);

    // Fetch progress on mount
    useEffect(() => {
        if (currentQuestion?._id) {
            fetchUserProgress(currentQuestion._id);
        }
    }, [currentQuestion?._id]);





    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isFullscreen);
            setIsInFullscreenMode(isFullscreen);

            if (isAssessmentMode && hasStarted && !isFullscreen && !showExitConfirmation) {
                // User exited fullscreen without confirmation - show confirmation modal
                setPendingExitAction(() => () => {
                    // Exit assessment and return to exercises
                    handleCancelAssessment();
                });
                setShowExitConfirmation(true);

                // Try to re-enter fullscreen while showing modal
                setTimeout(() => {
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => { });
                    }
                }, 100);
            }
        }

        // Also handle ESC key press
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isAssessmentMode && hasStarted && e.key === 'Escape' && document.fullscreenElement) {
                e.preventDefault();
                e.stopPropagation();

                setPendingExitAction(() => () => {
                    document.exitFullscreen().catch(() => { });
                    handleCancelAssessment();
                });
                setShowExitConfirmation(true);
            }
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleKeyDown, true);
        }
    }, [isAssessmentMode, hasStarted, showExitConfirmation]);

    // Add a function to handle assessment cancellation
    const handleCancelAssessment = () => {
        // Stop recording if active
        if (isRecording) {
            stopScreenRecording();
        }

        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }

        // Reset all assessment states
        setIsAssessmentMode(false);
        setHasAgreedToSecurity(false);
        setHasStarted(false);
        setIsLocked(false);
        setShowExitConfirmation(false);

        // Call the close exercise callback
        if (onCloseExercise) {
            onCloseExercise();
        } else if (onBack) {
            onBack();
        }

        showToast({
            type: 'info',
            title: 'Assessment Cancelled',
            message: 'Returning to exercises...',
            duration: 3000
        });
    };

    // Add this after line ~610
    useEffect(() => {
        console.log("📋 SECURITY SETTINGS:", {
            category: category,
            isAssessmentMode: isAssessmentMode,
            hasStarted: hasStarted,
            securitySettings: securitySettings,
            exerciseSecurity: exercise?.securitySettings,
            // Detailed breakdown:
            timerEnabled: securitySettings.timerEnabled,
            timerDuration: securitySettings.timerDuration,
            cameraMicEnabled: securitySettings.cameraMicEnabled,
            fullScreenMode: securitySettings.fullScreenMode,
            tabSwitchAllowed: securitySettings.tabSwitchAllowed,
            maxTabSwitches: securitySettings.maxTabSwitches,
            disableClipboard: securitySettings.disableClipboard,
            screenRecordingEnabled: securitySettings.screenRecordingEnabled,
        });

        // Also log category detection
        console.log("📊 CATEGORY ANALYSIS:", {
            rawCategory: category,
            normalized: (category || "").replace(/_/g, ' ').toLowerCase().trim(),
            isYouDo: (category || "").replace(/_/g, ' ').toLowerCase().trim() === 'you do'
        });
    }, [exercise, category, isAssessmentMode, hasStarted]);
    // --- Security Effects ---
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isFullscreen);
            setIsInFullscreenMode(isFullscreen);

            if (isAssessmentMode && hasStarted && !isFullscreen) {
                showToast({
                    type: 'warning',
                    title: 'Fullscreen Required',
                    message: 'Please return to fullscreen mode',
                    duration: 3000
                });
                setTimeout(() => {
                    document.documentElement.requestFullscreen().catch(() => { });
                }, 1000);
            }
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [isAssessmentMode, hasStarted])

    // --- Tab Switch Detection ---
    // Update the tab switch detection useEffect around line ~920
    useEffect(() => {
        if (!isAssessmentMode || !hasStarted) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitchCount(prev => {
                    const newCount = prev + 1;
                    const maxSwitches = securitySettings.maxTabSwitches || 3; // Use security setting or default to 3

                    // Show toast with formatted count (e.g., "1/3")
                    showToast({
                        type: 'warning',
                        title: 'Tab Switch Detected',
                        message: `Tab switch ${newCount}/${maxSwitches}`,
                        duration: 3000
                    });

                    if (newCount >= maxSwitches) {
                        handleTermination("Maximum tab switches exceeded", 'terminated');
                    }

                    return newCount;
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isAssessmentMode, hasStarted, securitySettings.maxTabSwitches]);

    // --- Timer Implementation ---
    // --- Timer Implementation ---
    useEffect(() => {
        if (!isAssessmentMode || !hasStarted) return;

        // Check if timer is enabled in security settings
        const shouldStartTimer = securitySettings.timerEnabled;

        if (shouldStartTimer) {
            const duration = securitySettings.timerDuration || 60; // Default to 60 minutes if not specified
            setTimeLeft(duration * 60); // Convert minutes to seconds

            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev === null || prev <= 0) {
                        clearInterval(timer);
                        handleTermination("Time limit exceeded", 'terminated');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        } else {
            // Timer is disabled, set timeLeft to null
            setTimeLeft(null);
        }
    }, [isAssessmentMode, hasStarted, securitySettings.timerEnabled, securitySettings.timerDuration]);
    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "No Limit";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    const addTerminalLog = (type: LogEntry['type'], content: string) => {
        setTerminalLogs(prev => [...prev, {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${prev.length}`,
            type,
            content,
            timestamp: Date.now()
        }]);
    };
    const clearTerminal = () => setTerminalLogs([]);

    const handleTerminalInput = (value: string) => {
        addTerminalLog('stdin', value);
        if (inputResolverRef.current) {
            inputResolverRef.current(value);
            inputResolverRef.current = null;
        }
        setIsWaitingForInput(false);
    };

    // --- Enhanced Screen Recording Implementation ---
    const startScreenRecording = async () => {
        if (!securitySettings.screenRecordingEnabled) {
            addTerminalLog('info', 'Screen recording is disabled in security settings.');
            return;
        }

        try {
            addTerminalLog('system', '🎥 Starting screen recording...');

            // First request screen recording permission
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: 'screen',
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 },
                    frameRate: { ideal: 15, max: 30 }
                },
                audio: securitySettings.cameraMicEnabled ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100,
                    channelCount: 2
                } : false
            });

            setScreenStream(displayStream);

            // Request camera ONLY if cameraMicEnabled is true
            let cameraStream: MediaStream | null = null;
            if (securitySettings.cameraMicEnabled) {
                try {
                    cameraStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 320, max: 640 },
                            height: { ideal: 240, max: 480 },
                            frameRate: { ideal: 15, max: 30 },
                            facingMode: 'user'
                        },
                        audio: micEnabled ? {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            sampleRate: 44100,
                            channelCount: 1
                        } : false
                    });

                    setCameraStream(cameraStream);

                    // Make sure the videoRef is current
                    if (videoRef.current) {
                        videoRef.current.srcObject = cameraStream;
                        videoRef.current.muted = true;
                        videoRef.current.autoplay = true;
                        videoRef.current.playsInline = true;

                        // Add event listeners to handle video playback
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current?.play().catch(e => {
                                console.warn("Autoplay prevented:", e);
                            });
                        };

                        // Force play after a short delay with user interaction fallback
                        const playWithFallback = () => {
                            if (videoRef.current) {
                                const playPromise = videoRef.current.play();
                                if (playPromise !== undefined) {
                                    playPromise.catch(() => {
                                        // Try playing with user interaction
                                        document.addEventListener('click', () => {
                                            videoRef.current?.play().catch(() => { });
                                        }, { once: true });
                                    });
                                }
                            }
                        };

                        setTimeout(playWithFallback, 500);
                    }

                    addTerminalLog('success', '📹 Camera access granted');
                } catch (err) {
                    console.warn("Camera access failed:", err);
                    addTerminalLog('warning', '📹 Camera access denied - continuing without camera');
                    showToast({
                        type: 'warning',
                        title: 'Camera Access Denied',
                        message: 'Screen recording will continue without camera',
                        duration: 4000
                    });
                }
            } else {
                addTerminalLog('info', '📹 Camera monitoring disabled in settings');
            }

            // Create canvas for compositing screen + camera
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');

            canvasRef.current = canvas;

            // Create video element for screen
            const screenVideo = document.createElement('video');
            screenVideo.srcObject = displayStream;
            screenVideo.autoplay = true;
            screenVideo.playsInline = true;
            screenVideo.onloadedmetadata = () => {
                screenVideo.play().catch(console.error);
            };
            screenVideoRef.current = screenVideo;

            const cameraVideo = videoRef.current;

            // Composite frames function
            const drawFrame = () => {
                if (!ctx || !screenVideo.videoWidth) return;

                try {
                    // Clear canvas
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw screen content
                    const screenAspect = screenVideo.videoWidth / screenVideo.videoHeight;
                    const canvasAspect = canvas.width / canvas.height;

                    let drawWidth, drawHeight, offsetX, offsetY;

                    if (screenAspect > canvasAspect) {
                        // Screen is wider than canvas
                        drawWidth = canvas.width;
                        drawHeight = canvas.width / screenAspect;
                        offsetX = 0;
                        offsetY = (canvas.height - drawHeight) / 2;
                    } else {
                        // Screen is taller than canvas
                        drawHeight = canvas.height;
                        drawWidth = canvas.height * screenAspect;
                        offsetX = (canvas.width - drawWidth) / 2;
                        offsetY = 0;
                    }

                    ctx.drawImage(screenVideo, offsetX, offsetY, drawWidth, drawHeight);

                    // Draw camera overlay ONLY if camera is enabled and available
                    if (securitySettings.cameraMicEnabled && cameraVideo && cameraVideo.srcObject) {
                        const camWidth = 320;
                        const camHeight = 240;
                        const padding = 20;
                        const cornerRadius = 10;

                        // Draw rounded rectangle background
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.beginPath();
                        ctx.roundRect(
                            canvas.width - camWidth - padding,
                            padding,
                            camWidth + 10,
                            camHeight + 10,
                            cornerRadius
                        );
                        ctx.fill();

                        // Draw camera feed with rounded corners
                        ctx.save();
                        ctx.beginPath();
                        ctx.roundRect(
                            canvas.width - camWidth - padding + 5,
                            padding + 5,
                            camWidth,
                            camHeight,
                            cornerRadius - 2
                        );
                        ctx.clip();
                        ctx.drawImage(
                            cameraVideo,
                            canvas.width - camWidth - padding + 5,
                            padding + 5,
                            camWidth,
                            camHeight
                        );
                        ctx.restore();

                        // Draw timestamp
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.font = 'bold 14px Arial';
                        ctx.fillText(
                            new Date().toLocaleTimeString(),
                            canvas.width - camWidth - padding + 15,
                            padding + 25
                        );

                        // Draw recording indicator
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath();
                        ctx.arc(
                            canvas.width - camWidth - padding + 10,
                            padding + 15,
                            5,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                    }

                    // Draw assessment info in bottom right
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.font = '12px Arial';
                    const info = `You Do Assessment - ${courseId || 'Unknown Course'} - ${formatTime(timeLeft || 0)}`;
                    ctx.fillText(info, canvas.width - ctx.measureText(info).width - 10, canvas.height - 10);

                } catch (err) {
                    console.error('Error drawing frame:', err);
                }

                animationFrameRef.current = requestAnimationFrame(drawFrame);
            };

            // Wait for video to load before starting to draw
            screenVideo.onloadeddata = () => {
                drawFrame();
            };

            // Capture canvas stream
            const canvasStream = canvas.captureStream(15);

            // Add audio tracks
            const audioTracks = [];

            // Add screen audio if available
            if (displayStream.getAudioTracks().length > 0) {
                audioTracks.push(displayStream.getAudioTracks()[0]);
            }

            // Add camera/mic audio if available
            if (cameraStream?.getAudioTracks().length > 0) {
                audioTracks.push(cameraStream.getAudioTracks()[0]);
            }

            // Mix audio tracks if multiple sources
            if (audioTracks.length > 0) {
                canvasStream.addTrack(audioTracks[0]);
            }

            // Create media recorder
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                    ? 'video/webm;codecs=vp8'
                    : 'video/webm';

            const mediaRecorder = new MediaRecorder(canvasStream, {
                mimeType,
                videoBitsPerSecond: 2500000,
                audioBitsPerSecond: 128000
            });

            mediaRecorderRef.current = mediaRecorder;
            recordedChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }

                // Stop all tracks
                displayStream.getTracks().forEach(track => track.stop());
                if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                }

                // Clean up camera preview
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
                setCameraStream(null);
                setScreenStream(null);

                // Save recording to Cloudinary
                await saveRecording();
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                addTerminalLog('error', '❌ Recording error occurred');
            };

            mediaRecorder.start(1000); // Collect data every second
            setIsRecording(true);

            addTerminalLog('success', '✅ Recording started successfully');
            showToast({
                type: 'success',
                title: 'Recording Started',
                message: securitySettings.cameraMicEnabled
                    ? 'Screen recording with camera is now active'
                    : 'Screen recording is now active',
                duration: 3000
            });

        } catch (error) {
            console.error('Screen recording error:', error);
            addTerminalLog('error', `❌ Failed to start recording: ${error}`);
            showToast({
                type: 'error',
                title: 'Recording Failed',
                message: 'Could not start screen recording. Please check permissions.',
                duration: 5000
            });
        }
    };
    const stopScreenRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                setCameraStream(null);
            }

            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
                setScreenStream(null);
            }

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            addTerminalLog('system', '⏹️ Stopping recording...');
        }
    };

    const saveRecording = async () => {
        try {
            setIsSaving(true);
            addTerminalLog('system', '💾 Saving recording to Cloudinary...');

            if (recordedChunksRef.current.length === 0) {
                throw new Error('No recording data available');
            }

            const blob = new Blob(recordedChunksRef.current, {
                type: mediaRecorderRef.current?.mimeType || 'video/webm'
            });

            // Generate unique filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `you_do_assessment_${courseId || 'unknown'}_${studentId}_${timestamp}.webm`;

            const formData = new FormData();
            formData.append('file', blob, filename);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
            formData.append('folder', 'you_do_assessments');
            formData.append('tags', `you_do,assessment,course:${courseId},student:${studentId}`);
            formData.append('context', JSON.stringify({
                course_id: courseId,
                student_id: studentId,
                exercise_id: exercise?._id,
                question_id: currentQuestion?._id,
                timestamp: new Date().toISOString(),
                category: 'You_Do',
                duration: Math.floor(blob.size / 2500000)
            }));

            const response = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const data = await response.json();

            addTerminalLog('success', `✅ Recording saved: ${data.secure_url}`);
            showToast({
                type: 'success',
                title: 'Recording Saved',
                message: 'Assessment recording has been uploaded successfully',
                duration: 3000
            });

            // Save recording URL to backend
            try {
                const token = localStorage.getItem('smartcliff_token') || '';
                const saveResponse = await fetch('https://lms-server-ym1q.onrender.com/assessment/recording', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        courseId,
                        exerciseId: exercise?._id,
                        questionId: currentQuestion?._id,
                        studentId,
                        recordingUrl: data.secure_url,
                        duration: Math.floor(blob.size / 2500000),
                        timestamp: new Date().toISOString(),
                        category: 'You_Do'
                    })
                });

                if (saveResponse.ok) {
                    addTerminalLog('success', '✅ Recording metadata saved to database');
                }
            } catch (backendError) {
                console.error('Failed to save recording metadata:', backendError);
            }

            // Clear recorded chunks
            recordedChunksRef.current = [];

        } catch (error) {
            console.error('Save recording error:', error);
            addTerminalLog('error', `❌ Failed to save recording: ${error}`);
            showToast({
                type: 'error',
                title: 'Upload Failed',
                message: 'Could not upload recording to Cloudinary',
                duration: 5000
            });
        } finally {
            setIsSaving(false);
        }
    };

    // --- Assessment Control ---
    const handleSecurityAgreement = () => {
        setHasAgreedToSecurity(true);
        setShowSecurityAgreement(false);
        startAssessment();
    };
    const getFilteredAndSortedProblems = useCallback(() => {
        let filtered = [...problems];

        // Apply difficulty filter
        if (filterDifficulty !== 'all') {
            filtered = filtered.filter(p => p.difficulty === filterDifficulty);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(query) ||
                (p.description?.toLowerCase().includes(query) || false)
            );
        }

        // Apply sorting
        switch (sortBy) {
            case 'difficulty':
                const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                filtered.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
                break;
            case 'title':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'default':
            default:
                // Keep original order (by id/index)
                filtered.sort((a, b) => a.id - b.id);
                break;
        }

        return filtered;
    }, [problems, filterDifficulty, searchQuery, sortBy]);
    const startAssessment = async () => {
        if (!isAssessmentMode) return;

        setHasStarted(true);

        // Force fullscreen immediately
        try {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
            setIsInFullscreenMode(true);
        } catch (error) {
            console.error('Fullscreen error:', error);
            showToast({
                type: 'error',
                title: 'Fullscreen Required',
                message: 'Assessment cannot start without fullscreen. Please enable it manually.',
                duration: 5000
            });
            return; // Don't proceed if fullscreen fails
        }

        // Start recording ONLY if enabled
        if (securitySettings.screenRecordingEnabled) {
            await startScreenRecording();
            showToast({
                type: 'success',
                title: 'You Do Assessment Started',
                message: `Screen recording and camera are now active${securitySettings.timerEnabled ? ` (Timer: ${securitySettings.timerDuration || 60} minutes)` : ''}`,
                duration: 5000
            });
        } else {
            showToast({
                type: 'success',
                title: 'You Do Assessment Started',
                message: `Security features are now active${securitySettings.timerEnabled ? ` (Timer: ${securitySettings.timerDuration || 60} minutes)` : ''}`,
                duration: 5000
            });
            addTerminalLog('info', 'Screen recording is disabled in security settings.');
        }

        // Log security settings
        console.log("Assessment started with settings:", {
            timerEnabled: securitySettings.timerEnabled,
            timerDuration: securitySettings.timerEnabled ? (securitySettings.timerDuration || 60) : 'disabled',
            cameraEnabled: securitySettings.cameraMicEnabled,
            screenRecording: securitySettings.screenRecordingEnabled,
            fullScreen: securitySettings.fullScreenMode
        });
    };

const handleTermination = useCallback(async (reason: string, status: 'completed' | 'terminated' = 'terminated') => {
  setIsLocked(true);
  setIsTerminated(true);
  setTerminationReason(reason);

  let screenRecordingBlob: Blob | null = null;
  
  // Create blob from recorded chunks if available
  if (securitySettings.screenRecordingEnabled && recordedChunksRef.current.length > 0) {
    screenRecordingBlob = new Blob(recordedChunksRef.current, {
      type: mediaRecorderRef.current?.mimeType || 'video/webm'
    });
    console.log('📹 Screen recording blob created:', {
      size: screenRecordingBlob.size,
      type: screenRecordingBlob.type
    });
  }

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => { });
  }

  showToast({
    type: 'error',
    title: 'Assessment Terminated',
    message: reason,
    duration: 10000
  });

  // Lock exercise on backend with screen recording
  try {
    const token = localStorage.getItem('smartcliff_token') || '';
    const formData = new FormData();
    
    // Add all data as separate form fields
    formData.append('courseId', courseId || '');
    formData.append('exerciseId', exercise?._id || '');
    formData.append('category', 'You_Do');
    formData.append('subcategory', subcategory || '');
    formData.append('status', status);
    formData.append('isLocked', 'true');
    formData.append('reason', reason || '');
    
    // Get user ID from token or localStorage
    const userData = localStorage.getItem('userData');
    const targetUserId = userData ? JSON.parse(userData)._id : '';
    if (targetUserId) {
      formData.append('targetUserId', targetUserId);
    }

    console.log('📤 Sending lock request with form data fields:');
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        console.log(`${key}: ${value}`);
      } else {
        console.log(`${key}: [File] - ${value.name} (${value.size} bytes)`);
      }
    });

    // Add screen recording if available
    if (screenRecordingBlob) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `terminated_${courseId}_${studentId}_${exercise?._id}_${timestamp}.webm`;
      formData.append('screenRecording', screenRecordingBlob, filename);
      console.log('🎥 Added screen recording to form data:', filename, screenRecordingBlob.size);
    }

    const response = await fetch('https://lms-server-ym1q.onrender.com/exercise/lock', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type header - let browser set it with boundary
      },
      body: formData
    });

    const responseData = await response.json();
    
    if (response.ok) {
      addTerminalLog('success', '✅ Exercise locked with recording successfully');
      console.log('✅ Server response:', responseData);
    } else {
      console.error('❌ Server error response:', responseData);
      throw new Error(`Server responded with ${response.status}: ${JSON.stringify(responseData)}`);
    }
  } catch (error) {
    console.error('Failed to lock exercise:', error);
    addTerminalLog('error', `❌ Failed to lock exercise: ${error.message}`);
  }
}, [courseId, exercise, subcategory, securitySettings.screenRecordingEnabled, studentId]);
    // Update the executeCode function around line ~730
    const executeCode = async (input: string = ""): Promise<{ output: string; error?: string; runtime?: number }> => {
        try {
            const pistonLang = getPistonLanguage(selectedLanguage);
            const currentCode = editorInstanceRef.current ? editorInstanceRef.current.getValue() : code;

            // Check for Python execution with Pyodide
            if (selectedLanguage.toLowerCase() === 'python' && pyodideReady && pyodideRef.current) {
                // REMOVED: addTerminalLog('system', 'Running Python with Pyodide...');

                try {
                    // Setup stdout/stderr capture
                    pyodideRef.current.setStdout({
                        batched: (msg: string) => addTerminalLog('stdout', msg)
                    });
                    pyodideRef.current.setStderr({
                        batched: (msg: string) => addTerminalLog('stderr', msg)
                    });

                    // Handle input
                    if (input) {
                        const inputCode = currentCode.replace(/input\s*\(/g, `(${JSON.stringify(input)} + `);
                        await pyodideRef.current.runPythonAsync(inputCode);
                    } else {
                        await pyodideRef.current.runPythonAsync(currentCode);
                    }

                    return {
                        output: "", // Return empty string instead of success message
                        error: undefined,
                        runtime: 0
                    };
                } catch (err: any) {
                    return {
                        output: "",
                        error: err.message,
                        runtime: 0
                    };
                }
            }

            const requestBody = {
                language: pistonLang.language,
                version: pistonLang.version,
                files: [
                    {
                        name: "main",
                        content: currentCode
                    }
                ],
                stdin: input || "",
                args: [],
                compile_timeout: 10000,
                run_timeout: 5000,
                compile_memory_limit: -1,
                run_memory_limit: -1
            };

            // REMOVED: addTerminalLog('system', `Executing ${selectedLanguage} code...`);

            const response = await fetch(PISTON_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.run) {
                // Only add logs for actual output/errors, not success messages
                if (data.run.output) {
                    addTerminalLog('stdout', data.run.output.trim());
                }
                if (data.run.stderr) {
                    addTerminalLog('stderr', data.run.stderr);
                }
                // REMOVED: if (data.run.error) {
                // REMOVED:     addTerminalLog('error', data.run.error);
                // REMOVED: }

                return {
                    output: data.run.output?.trim() || "",
                    error: data.run.stderr || data.run.error,
                    runtime: data.run.time
                };
            } else {
                // Still show error if execution completely failed
                addTerminalLog('error', 'Execution failed');
                return {
                    output: "",
                    error: "Execution failed"
                };
            }
        } catch (error) {
            console.error("Piston API error:", error);
            addTerminalLog('error', `Execution error: ${error}`);
            return {
                output: "",
                error: `Execution error: ${error}`
            };
        }
    };

    // Update the runCode function around line ~820
    const runCode = async () => {
        // Check security setting first, then exercise setting
        const isCopyPasteDisabled = securitySettings.disableClipboard === true;

        if (isCopyPasteDisabled && isCopyPasteDetected(code)) {
            addTerminalLog('error', 'Copy-paste is not allowed for this exercise. Please type the code yourself.');
            setShowTerminal(true);
            return;
        }

        // Then check exercise setting if security doesn't restrict it
        if (!isCopyPasteDisabled && !exercise?.compilerSettings.allowCopyPaste && isCopyPasteDetected(code)) {
            addTerminalLog('error', 'Copy-paste is not allowed for this exercise. Please type the code yourself.');
            setShowTerminal(true);
            return;
        }

        setIsRunning(true);
        setShowTerminal(true);
        clearTerminal();

        try {
            const sampleInput = problem?.examples?.[0]?.input ||
                currentQuestion?.sampleInput ||
                "";

            const executionResult = await executeCode(sampleInput);



        } catch (error) {
            addTerminalLog('error', `Error: ${error}`);
        } finally {
            setIsRunning(false);
        }
    };
    // Add this useEffect to handle camera stream updates
    useEffect(() => {
        if (cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;

            const playVideo = () => {
                if (videoRef.current && videoRef.current.paused) {
                    videoRef.current.play().catch(e => {
                        console.warn("Camera play failed:", e);
                    });
                }
            };

            // Try to play immediately
            playVideo();

            // Try again after a delay
            const timer = setTimeout(playVideo, 1000);

            return () => clearTimeout(timer);
        }
    }, [cameraStream]);
    // --- Submission ---
  const submitProgressToBackend = async (
  questionId: string,
  status = 'attempted',
  score = 0,
) => {
  try {
    const currentCode = editorInstanceRef.current ? editorInstanceRef.current.getValue() : code;
    const currentCourseId = courseId || (exercise?.courseId ? exercise.courseId.toString() : "");
    if (!currentCourseId) {
      throw new Error('No courseId');
    }

    const finalScore = score > 0 ? score : (status === 'solved' ? 100 : 0);

    // Create FormData for multipart/form-data
    const formData = new FormData();
    
    // Add all data as separate fields for easier parsing on backend
    formData.append('courseId', currentCourseId);
    formData.append('exerciseId', exercise?._id || "");
    formData.append('questionId', questionId);
    formData.append('code', currentCode);
    formData.append('score', finalScore.toString());
    formData.append('status', status);
    formData.append('category', category || "We_Do");
    formData.append('subcategory', subcategory);
    formData.append('nodeId', nodeId || "");
    formData.append('nodeName', nodeName || "");
    formData.append('nodeType', nodeType || "");
    formData.append('language', selectedLanguage);
    formData.append('attemptLimitEnabled', (exercise?.questionBehavior.attemptLimitEnabled || false).toString());
    formData.append('maxAttempts', (exercise?.questionBehavior.maxAttempts || 1).toString());
    
    // Add screen recording if available
  

    addTerminalLog('system', '📤 Submitting to server...');

    const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
    const response = await fetch('https://lms-server-ym1q.onrender.com/courses/answers/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - let browser set it with boundary
      },
      body: formData,
    });

    const result = await response.json();

    if (response.status === 403) {
      const errorMsg = result.message?.find((m: any) => m.key === 'error')?.value || "Max attempts reached.";
      throw new Error(errorMsg);
    }

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    addTerminalLog('success', '✅ Submission successful!');
    return result;

  } catch (error: any) {
    addTerminalLog('error', `❌ Submission failed: ${error.message}`);
    throw error;
  }
};

const submitCode = async () => {
  if (isAssessmentMode && !hasStarted) {
    showToast({
      type: 'warning',
      title: 'Assessment Not Started',
      message: 'Please start the assessment first',
      duration: 3000
    });
    return;
  }

  // Check security setting first
  const isCopyPasteDisabled = securitySettings.disableClipboard === true;

  if (isCopyPasteDisabled && isCopyPasteDetected(code)) {
    addTerminalLog('error', 'Submission rejected: Copy-paste is not allowed for this exercise.');
    setShowTerminal(true);
    return;
  }

  // Then check exercise setting if security doesn't restrict it
  if (!isCopyPasteDisabled && !exercise?.compilerSettings.allowCopyPaste && isCopyPasteDetected(code)) {
    addTerminalLog('error', 'Submission rejected: Copy-paste is not allowed for this exercise.');
    setShowTerminal(true);
    return;
  }

  // Check attempts
  if (exercise?.questionBehavior.attemptLimitEnabled && currentQuestion) {
    const max = exercise.questionBehavior.maxAttempts || 1;
    if (userAttempts >= max) {
      const msg = `Maximum attempts reached (${userAttempts}/${max}). You cannot submit again.`;
      addTerminalLog('error', msg);
      setShowTerminal(true);
      showToast({
        type: 'error',
        title: 'Limit Reached',
        message: msg,
        duration: 4000
      });
      return;
    }
  }

  setIsRunning(true);
  setShowTerminal(true);
  clearTerminal();

  addTerminalLog('system', '🚀 Starting submission process...');

  try {
    // Prepare screen recording blob if available
let screenRecordingBlob: Blob | undefined;
  if (securitySettings.screenRecordingEnabled && recordedChunksRef.current.length > 0) {
  screenRecordingBlob = new Blob(recordedChunksRef.current, {
    type: mediaRecorderRef.current?.mimeType || 'video/webm'
  });
  addTerminalLog('system', `📹 Including screen recording with submission (${screenRecordingBlob.size} bytes)...`);
  console.log('📹 Screen recording blob for submission:', {
    size: screenRecordingBlob.size,
    type: screenRecordingBlob.type
  });
}

    // Submit to backend with screen recording
    addTerminalLog('system', '💾 Saving progress to server for manual evaluation...');
    const submitResponse = await submitProgressToBackend(
      currentQuestion!._id,
      'submitted', // Use 'submitted' status for manual evaluation
      0, // Score will be assigned manually
      screenRecordingBlob
    );

    if (submitResponse && submitResponse.success) {
      // Update attempts
      setUserAttempts(prev => prev + 1);

      addTerminalLog('success', '✅ Code submitted for manual evaluation!');

      // Mark as submitted
      setSolvedQuestions(prev => {
        const newSet = new Set(prev);
        newSet.add(currentProblemIndex);
        return newSet;
      });

      // Auto-navigate if allowed
      if (exercise?.questionBehavior.allowNext && currentProblemIndex < problems.length - 1) {
        let countdown = 3;

        const countdownInterval = setInterval(() => {
          addTerminalLog('system', `⏱️ Next question in ${countdown}...`);
          countdown--;

          if (countdown < 0) {
            clearInterval(countdownInterval);
            setCurrentProblemIndex(currentProblemIndex + 1);
            addTerminalLog('system', '➡️ Moving to next question...');
          }
        }, 1000);
      }

      // Check if last question in assessment mode
      if (isAssessmentMode && currentProblemIndex === problems.length - 1) {
        setTimeout(() => {
          handleTermination("Assessment Completed Successfully", 'completed');
        }, 2000);
      }
    }

  } catch (error: any) {
    console.error("Submission error:", error);
    addTerminalLog('error', `❌ ${error.message}`);
  } finally {
    setIsRunning(false);
  }
};
    const cycleSortOption = () => {
        const sortOptions: Array<'default' | 'difficulty' | 'title'> = ['default', 'difficulty', 'title'];
        const currentIndex = sortOptions.indexOf(sortBy);
        const nextIndex = (currentIndex + 1) % sortOptions.length;
        setSortBy(sortOptions[nextIndex]);
    };

    const getSortIcon = () => {
        switch (sortBy) {
            case 'difficulty':
                return '🟢🟡🔴'; // Representing Easy, Medium, Hard
            case 'title':
                return 'A-Z';
            case 'default':
            default:
                return '123';
        }
    };
    // --- Helper Functions ---
    const isCopyPasteDetected = (code: string): boolean => {
        // If disableClipboard is false, allow copy-paste
        if (securitySettings.disableClipboard === false) {
            return false;
        }

        // If exercise settings explicitly allow copy-paste
        if (exercise?.compilerSettings.allowCopyPaste) {
            return false;
        }

        const trimmedCode = code.trim()
        const initialCode = problem?.initialCode?.trim() || ""

        if (trimmedCode === initialCode) return true

        const lines = trimmedCode.split('\n')
        const initialLines = initialCode.split('\n')

        let matchingLines = 0
        lines.forEach(line => {
            if (initialLines.some(initialLine => line.trim() === initialLine.trim())) {
                matchingLines++
            }
        })

        return matchingLines / lines.length > 0.7
    }
    const resetCode = () => {
        if (problem?.initialCode) {
            const currentCode = problem.initialCode;
            setCode(currentCode);
            if (editorInstanceRef.current) {
                editorInstanceRef.current.setValue(currentCode);
            }
            addTerminalLog('system', 'Code reset to initial state');
        }
    }

    const handleEditorChange = useCallback((value: string | undefined) => {
        setCode(value || "")
    }, [])

    const handleEditorDidMount = useCallback((editor: any) => {
        editorInstanceRef.current = editor;

        // Set initial code
        if (problem?.initialCode) {
            editor.setValue(problem.initialCode);
        }

        if (exercise?.compilerSettings) {
            editor.updateOptions({
                autoClosingBrackets: exercise.compilerSettings.autoCloseBrackets ? 'always' : 'languageDefined',
                autoClosingQuotes: exercise.compilerSettings.autoCloseBrackets ? 'always' : 'languageDefined',
                suggestOnTriggerCharacters: exercise.compilerSettings.autoSuggestion,
                quickSuggestions: exercise.compilerSettings.autoSuggestion,
                fontSize: exercise.compilerSettings.fontSize || 14,
                tabSize: exercise.compilerSettings.tabSize || 2,
                theme: exercise.compilerSettings.theme === 'dark' ? 'vs-dark' : 'vs'
            });
        }

        // Apply clipboard restrictions based on security settings
        const isCopyPasteDisabled = securitySettings.disableClipboard === true;

        if (isCopyPasteDisabled) {
            // Disable copy-paste in editor
            editor.onKeyDown((e: any) => {
                if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyC' || e.code === 'KeyV' || e.code === 'KeyX')) {
                    e.preventDefault();
                    e.stopPropagation();
                    showToast({
                        type: 'error',
                        title: 'Copy/Paste Disabled',
                        message: 'Copy-paste is not allowed in assessment mode',
                        duration: 3000
                    });
                }
            });

            // Also disable right-click context menu
            editor.onContextMenu((e: any) => {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        setEditorReady(true);
        editor.focus();
    }, [exercise, problem, securitySettings.disableClipboard])
    const getLanguage = (lang: string) => {
        const languageMap: { [key: string]: string } = {
            javascript: 'javascript',
            typescript: 'typescript',
            python: 'python',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            csharp: 'csharp'
        };
        return languageMap[lang] || 'javascript';
    };

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    }

    const isQuestionSolved = (questionIndex: number): boolean => {
        return solvedQuestions.has(questionIndex);
    };

    const skipCurrentQuestion = async () => {
        if (!exercise?.questionBehavior.allowSkip) {
            addTerminalLog('error', 'Skipping questions is not allowed for this exercise.');
            return;
        }

        if (currentProblemIndex < problems.length - 1) {
            try {
                if (exercise && currentQuestion) {
                    await submitProgressToBackend(
                        currentQuestion._id,
                        'skipped',
                        0
                    );
                }

                setSkippedQuestions(prev => {
                    const newSet = new Set(prev);
                    newSet.add(currentProblemIndex);
                    return newSet;
                });

                setCurrentProblemIndex(currentProblemIndex + 1);
                addTerminalLog('info', '⏭️ Question skipped. Moving to next question.');

            } catch (error) {
                addTerminalLog('error', 'Failed to skip question. Please try again.');
            }
        }
    };

    const nextProblem = () => {
        const isCurrentSolved = solvedQuestions.has(currentProblemIndex);
        if (exercise?.questionBehavior.allowNext) {
            if (currentProblemIndex < problems.length - 1) {
                setCurrentProblemIndex(currentProblemIndex + 1);
            }
        } else {
            if (currentProblemIndex < problems.length - 1 && isCurrentSolved) {
                setCurrentProblemIndex(currentProblemIndex + 1);
            } else if (!isCurrentSolved) {
                addTerminalLog('warning', 'Please solve this question before proceeding to the next one.');
            }
        }
    };

    const prevProblem = () => {
        if (currentProblemIndex > 0) {
            setCurrentProblemIndex(currentProblemIndex - 1)
        }
    }

    const selectProblem = (index: number) => {
        if (index >= 0 && index < problems.length) {
            setCurrentProblemIndex(index)
            setShowSidebar(false)
        }
    }

    // Check exercise status on mount
    useEffect(() => {
        const checkExerciseStatus = async () => {
            if (!isAssessmentMode || !courseId || !exercise?._id) return;

            try {
                const token = localStorage.getItem('smartcliff_token') || '';
                const response = await fetch(`https://lms-server-ym1q.onrender.com/exercise/status?courseId=${courseId}&exerciseId=${exercise._id}&category=You_Do&subcategory=${subcategory}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        const { isLocked, status } = data.data;
                        if (isLocked || status === 'terminated' || status === 'completed') {
                            setIsLocked(true);
                            setIsTerminated(true);
                            setHasStarted(false);
                            setTerminationReason(status === 'completed' ? "Assessment Completed." : "Access Terminated.");
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to check exercise status:", error);
            }
        };

        checkExerciseStatus();
    }, [courseId, exercise?._id, subcategory, isAssessmentMode]);

    // Format language name for display
    const formatLanguageName = (lang: string) => {
        const languageNames: { [key: string]: string } = {
            javascript: 'JavaScript',
            typescript: 'TypeScript',
            python: 'Python',
            java: 'Java',
            cpp: 'C++',
            c: 'C',
            csharp: 'C#',
            js: 'JavaScript',
            ts: 'TypeScript',
            py: 'Python',
            cs: 'C#'
        };
        return languageNames[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
    };


    // --- Render ---
    if (isTerminated || isLocked) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white p-4">
                <div className="bg-zinc-800 p-8 rounded border border-red-600 max-w-md text-center shadow-2xl">
                    {isSaving ? (
                        <>
                            <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                            <h2 className="text-xl font-bold mb-2">Saving Session...</h2>
                            <p className="text-gray-400">Please wait while we save your assessment data.</p>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-2">Access Terminated</h2>
                            <p className="mb-4 text-red-200">{terminationReason}</p>
                            <button
                                className="bg-zinc-700 px-6 py-2 rounded hover:bg-zinc-600 font-bold w-full"
                                onClick={onBack}
                            >
                                Return to Dashboard
                            </button>
                        </>
                    )}
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
            {/* Security Agreement Modal */}
            <SecurityAgreementModal
                isOpen={showSecurityAgreement}
                onAgree={handleSecurityAgreement}
                onCancel={() => {
                    setShowSecurityAgreement(false);

                    // Reset all assessment states
                    setIsAssessmentMode(false);
                    setHasAgreedToSecurity(false);
                    setHasStarted(false);

                    // Call the appropriate callback
                    if (onCloseExercise) {
                        onCloseExercise(); // Use the new prop specifically for closing exercise
                    } else if (onBack) {
                        onBack(); // Fallback to onBack for backward compatibility
                    }

                    // Show a toast notification
                    showToast({
                        type: 'info',
                        title: 'Assessment Cancelled',
                        message: 'Returning to exercises...',
                        duration: 3000
                    });
                }}
                // Pass the actual security settings, not hardcoded ones
                securitySettings={securitySettings}
                theme={theme}
            />

            <ExitConfirmationModal
                isOpen={showExitConfirmation}
                onConfirm={() => {
                    if (pendingExitAction) {
                        pendingExitAction();
                    }
                    setShowExitConfirmation(false);
                    setPendingExitAction(null);
                }}
                onCancel={() => {
                    setShowExitConfirmation(false);
                    setPendingExitAction(null);
                    // Force back to fullscreen
                    if (isAssessmentMode && hasStarted && !document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => { });
                    }
                }}
                theme={theme}
            />
            {/* Pyodide Script */}
            <Script
                src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"
                onLoad={initPyodide}
                strategy="afterInteractive"
            />

            {showCopyWarning && !exercise?.compilerSettings.allowCopyPaste && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white p-4 rounded-lg shadow-xl max-w-sm mx-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Lock className="w-5 h-5 text-red-500" />
                            <h3 className="text-sm font-semibold text-gray-900">Copy-Paste Disabled</h3>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">
                            Copy-paste is not allowed for this exercise. Please type the code yourself to learn better.
                        </p>
                        <button
                            onClick={() => setShowCopyWarning(false)}
                            className="w-full py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            )}

            <InteractiveTerminal
                isOpen={showTerminal}
                onClose={() => setShowTerminal(false)}
                logs={terminalLogs}
                isRunning={isRunning}
                isWaitingForInput={isWaitingForInput}
                onInputSubmit={handleTerminalInput}
                language={selectedLanguage}
                onClear={clearTerminal}
                theme={theme}
            />

            {isAssessmentMode && !hasStarted && !showSecurityAgreement && (
                <div className="absolute inset-0 z-[60] bg-zinc-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 p-6">
                        <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2 mb-4">
                            <ShieldAlert className="w-5 h-5" /> You Do Assessment Mode
                        </h2>
                        {/* Around line ~1240 */}
                        <div className="space-y-3 mb-6 text-sm text-zinc-300">
                            <p><strong>Security Features Active:</strong></p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                {securitySettings.timerEnabled ? (
                                    <li>Timed Assessment ({securitySettings.timerDuration || 60} minutes)</li>
                                ) : (
                                    <li>No Time Limit</li>
                                )}
                                {securitySettings.fullScreenMode && <li>Full Screen Required</li>}
                                {securitySettings.cameraMicEnabled && <li>Camera & Microphone Monitoring</li>}
                                {securitySettings.tabSwitchAllowed === false && <li>Tab Switching Restricted (max 3 switches)</li>}
                                {securitySettings.screenRecordingEnabled && <li>Screen Recording Active</li>}
                                {securitySettings.disableClipboard && <li>Copy/Paste Disabled</li>}
                            </ul>
                        </div>
                        <button
                            onClick={startAssessment}
                            className="w-full px-4 py-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold"
                        >
                            Start Assessment
                        </button>
                        <button
                            className="w-full mt-3 px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white font-medium"
                            onClick={onBack}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className={`flex items-center justify-between p-2.5 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}
                        title={showSidebar ? 'Hide problems list' : 'Show problems list'}
                    >
                        {showSidebar ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>

                    {problems.length > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={prevProblem}
                                disabled={currentProblemIndex === 0}
                                className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-700'} disabled:opacity-50`}
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-medium">{currentProblemIndex + 1}/{problems.length}</span>
                            <button
                                onClick={nextProblem}
                                disabled={currentProblemIndex === problems.length - 1 || (!exercise?.questionBehavior.allowNext && !isQuestionSolved(currentProblemIndex))}
                                className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-700'} disabled:opacity-50`}
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            {exercise?.questionBehavior.allowSkip && (
                                <button
                                    onClick={skipCurrentQuestion}
                                    disabled={currentProblemIndex === problems.length - 1}
                                    className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-700'}`}
                                    title="Skip Question"
                                >
                                    <SkipForward className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* In the main render, around line ~1430 */}
                    {isAssessmentMode && hasStarted && securitySettings.screenRecordingEnabled && (
                        <div className="flex items-center gap-2">
                            {/* Camera preview - only show if camera is enabled AND we have a stream */}
                            {securitySettings.cameraMicEnabled && cameraStream && (
                                <div className="fixed bottom-4 left-4 z-40 w-48 h-36 bg-black rounded-lg border-2 border-red-500 shadow-2xl overflow-hidden">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 left-2 flex items-center gap-1">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">LIVE</span>
                                    </div>
                                </div>
                            )}

                            {/* Recording indicator */}
                            {isRecording && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-900/50 rounded text-xs">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    Recording
                                </div>
                            )}

                            {/* Timer display */}
                            {securitySettings.timerEnabled && timeLeft !== null && (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                    <Clock className="w-3 h-3" />
                                    {formatTime(timeLeft)}
                                </div>
                            )}

                            {/* Mic toggle - only show if camera/mic is enabled */}
                            {securitySettings.cameraMicEnabled && (
                                <button
                                    onClick={() => setMicEnabled(!micEnabled)}
                                    className={`p-1.5 rounded ${micEnabled ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-400'}`}
                                    title={micEnabled ? "Microphone is on" : "Microphone is muted"}
                                >
                                    {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* {isAssessmentMode && hasStarted && tabSwitchCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-900/50 rounded text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            Tab Switches: {tabSwitchCount}/3
                        </div>
                    )} */}

                    {/* Language Selector */}
                    {/* Language Selector */}
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className={`h-7 text-xs border rounded px-1.5 ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                        disabled={isAssessmentMode && hasStarted}
                    >
                        {availableLanguages.map((lang) => (
                            <option key={lang} value={lang}>
                                {formatLanguageName(lang)}
                                {lang === selectedLanguage ? " (Selected)" : ""}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowTerminal(true)}
                        className={`h-7 px-2 text-xs border rounded flex items-center gap-1 ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-700'}`}
                    >
                        <Terminal className="w-3 h-3" />
                        Console
                    </button>

                    {/* Add the Exit button right after the Console button */}
                    {isAssessmentMode && hasStarted && (
                        <button
                            onClick={() => {
                                setPendingExitAction(() => handleCancelAssessment);
                                setShowExitConfirmation(true);
                            }}
                            className={`h-7 px-2 text-xs border rounded flex items-center gap-1 ${theme === 'dark'
                                ? 'border-red-600 hover:bg-red-900/50 text-red-400'
                                : 'border-red-300 hover:bg-red-50 text-red-600'}`}
                        >
                            <LogOut className="w-3 h-3" />
                            Exit
                        </button>
                    )}

                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="h-7 px-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                    >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Run
                    </button>

                    <button
                        onClick={submitCode}
                        disabled={isRunning || (exercise?.questionBehavior.attemptLimitEnabled && userAttempts >= (exercise.questionBehavior.maxAttempts || 1))}
                        className="h-7 px-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1 disabled:cursor-not-allowed"
                    >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        {exercise?.questionBehavior.attemptLimitEnabled && userAttempts >= (exercise.questionBehavior.maxAttempts || 1)
                            ? "Limit Reached"
                            : "Submit"}
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark' ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300' : 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {showSidebar && (
                    <div className={`w-80 border-r overflow-hidden flex flex-col ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'}`}>
                        <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                    Problems ({getFilteredAndSortedProblems().length}/{problems.length})
                                </h3>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setShowSearch(!showSearch)}
                                        className={`p-1 ml-1 rounded transition-colors ${showSearch ? (theme === 'dark' ? 'bg-blue-700' : 'bg-blue-500') : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600')}`}
                                    >
                                        {showSearch ? <XIcon className="w-3.5 h-3.5 text-white" /> : <Search className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {showSearch && (
                                <div className="relative mb-3">
                                    <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                                    <input
                                        type="text"
                                        placeholder="Search problems..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={`w-full pl-8 pr-6 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none ${theme === 'dark' ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500'}`}
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery("")} className="absolute right-1 top-1/2 transform -translate-y-1/2">
                                            <XIcon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Filter and Sort Controls */}
                            <div className="flex items-center justify-between gap-3">
                                {/* Difficulty Filter Dropdown */}
                                <div className="flex-1">
                                    <select
                                        value={filterDifficulty}
                                        onChange={(e) => setFilterDifficulty(e.target.value as any)}
                                        className={`w-full text-xs border rounded px-2 py-1.5 ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-900'}`}
                                    >
                                        <option value="all">All Difficulties</option>
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>

                                {/* Sort Icon Button */}
                                <button
                                    onClick={cycleSortOption}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded transition-colors ${theme === 'dark' ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}`}
                                    title={`Sort by: ${sortBy === 'default' ? 'Default Order' : sortBy === 'difficulty' ? 'Difficulty' : 'Title'}. Click to change.`}
                                >
                                    <ArrowUpDown className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                                    <span className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {sortBy === 'default' ? 'Default' : sortBy === 'difficulty' ? 'Difficulty' : 'Title'}
                                    </span>
                                </button>
                            </div>

                            {/* Sort Indicator */}
                            <div className={`mt-2 text-[10px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} flex items-center justify-between`}>
                                <span>
                                    {filterDifficulty !== 'all' && `Filtered: ${filterDifficulty}`}
                                    {filterDifficulty === 'all' && 'Showing all difficulties'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span>Sort:</span>
                                    <span className={`px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                        {getSortIcon()}
                                    </span>
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {getFilteredAndSortedProblems().length === 0 ? (
                                <div className="p-4 text-center">
                                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        No problems found
                                        {filterDifficulty !== 'all' && ` for "${filterDifficulty}" difficulty`}
                                        {searchQuery && ` matching "${searchQuery}"`}
                                    </div>
                                </div>
                            ) : (
                                getFilteredAndSortedProblems().map((p, index) => {
                                    const originalIndex = problems.findIndex(prob => prob.id === p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => selectProblem(originalIndex)}
                                            className={`w-full p-3 text-left transition-colors border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'} ${currentProblemIndex === originalIndex
                                                ? (theme === 'dark' ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : 'bg-blue-50 border-l-2 border-l-blue-500')
                                                : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50')}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                                        {originalIndex + 1}. {p.title}
                                                    </div>
                                                    <div className="flex gap-2 mt-1 items-center">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.difficulty === 'Easy'
                                                            ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')
                                                            : p.difficulty === 'Medium'
                                                                ? (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800')
                                                                : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')}`}>
                                                            {p.difficulty}
                                                        </span>
                                                        {solvedQuestions.has(originalIndex) && (
                                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                        )}
                                                        {skippedQuestions.has(originalIndex) && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                                                Skipped
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
                <div style={{ width: `${leftPanelWidth}%` }} className="overflow-y-auto h-full custom-scrollbar border-r border-gray-300 dark:border-gray-700">
                    <div className={`p-5 space-y-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                        <div>
                            <h1 className={`text-xl font-semibold mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{problem?.title || "Problem"}</h1>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${problem?.difficulty === "Easy" ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800') : problem?.difficulty === "Medium" ? (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800') : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')}`}>
                                    {problem?.difficulty || "Easy"}
                                </span>
                                {exercise?.questionBehavior.attemptLimitEnabled && (
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${userAttempts >= (exercise.questionBehavior.maxAttempts || 1) ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-100 text-red-800 border-red-200') : (theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200')}`}>
                                        {userAttempts >= (exercise.questionBehavior.maxAttempts || 1) && <AlertTriangle className="w-3 h-3" />}
                                        Attempts: {userAttempts} / {exercise.questionBehavior.maxAttempts}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <FileText className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Description</h3>
                            </div>
                            <div className={`text-xs space-y-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {problem?.description?.split('\n').map((line, i) => <p key={i} className="leading-relaxed">{line}</p>)}
                            </div>
                        </div>

                        {problem?.examples && problem.examples.length > 0 && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Terminal className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
                                    <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Sample Input & Output</h3>
                                </div>
                                <div className="space-y-3">
                                    {problem.examples.map((example, index) => (
                                        <div key={index}>
                                            <strong className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Example {index + 1}</strong>
                                            <div className="mt-1 mb-2">
                                                <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Input:</div>
                                                <div className={`p-2 rounded font-mono text-xs ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}>{example.input}</div>
                                            </div>
                                            <div className="mb-2">
                                                <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Output:</div>
                                                <div className={`p-2 rounded font-mono text-xs ${theme === 'dark' ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}>{example.output}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!showSidebar && (
                    <div
                        className="absolute top-0 bottom-0 z-10 hover:cursor-col-resize"
                        style={{ left: `calc(${leftPanelWidth}% - 2px)`, width: '4px' }}
                        onMouseDown={(e) => { setIsResizing(true); e.preventDefault(); }}
                    >
                        <div className={`h-full w-full ${theme === 'dark' ? 'bg-gray-700 hover:bg-blue-500' : 'bg-gray-300 hover:bg-blue-500'} transition-colors`}></div>
                    </div>
                )}

                <div className="flex flex-col flex-1 min-w-0 h-full custom-scrollbar" style={{ width: `${100 - leftPanelWidth}%` }}>
                    <div className="flex flex-col" style={{ height: `75%`, minHeight: `75%`, position: 'relative' }}>
                        <div className={`flex items-center justify-between p-2 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5">
                                <Code className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Code</span>
                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>({formatLanguageName(selectedLanguage)})</span>
                            </div>
                            <button onClick={resetCode} className={`flex items-center gap-1 px-2 py-0.5 text-xs border rounded transition-colors ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                <RotateCcw className="w-3.5 h-3.5" /> Reset
                            </button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <MonacoEditor
                                key={`editor-${currentProblemIndex}-${selectedLanguage}`}
                                height="100%"
                                language={getLanguage(selectedLanguage)}
                                value={code}
                                onChange={handleEditorChange}
                                onMount={handleEditorDidMount}
                                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                                options={{
                                    minimap: { enabled: true },
                                    fontSize: 14,
                                    readOnly: isAssessmentMode && !hasStarted
                                }}
                            />
                        </div>
                    </div>

                    {/* <div className={`h-2 flex items-center justify-center cursor-row-resize transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`} onMouseDown={(e) => { setIsHorizontalResizing(true); e.preventDefault(); }}>
                        <div className={`w-full h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    </div> */}

                    {/* Simple Output Panel */}
                    {/* <div className="h-1/4 border-t border-zinc-700 bg-zinc-900 p-2 overflow-y-auto flex flex-col">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Terminal className="w-4 h-4 text-green-400" />
                            <span className="text-xs font-medium text-zinc-300">Output</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {terminalLogs.length === 0 && !isRunning && (
                                <div className="italic text-zinc-500 text-xs">
                                    Run your code to see output here
                                </div>
                            )}
                            {terminalLogs.slice(-20).map((log) => (
                                <div key={log.id} className="text-xs font-mono break-all whitespace-pre-wrap">
                                    {log.type === 'stdout' && <span className="text-zinc-300">{log.content}</span>}
                                    {log.type === 'stderr' && <span className="text-rose-400">{log.content}</span>}
                                    {log.type === 'error' && <span className="text-red-400">{log.content}</span>}
                                    {log.type === 'success' && <span className="text-green-400">{log.content}</span>}
                                    {log.type === 'info' && <span className="text-blue-400">{log.content}</span>}
                                    {log.type === 'warning' && <span className="text-yellow-400">{log.content}</span>}
                                </div>
                            ))}
                            {isRunning && (
                                <div className="flex items-center gap-2 mt-2">
                                    <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
                                    <span className="text-zinc-500 text-xs">Executing...</span>
                                </div>
                            )}
                        </div>
                    </div> */}
                </div>
            </div>

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-3 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${toast.type === 'success' ? 'bg-green-50 border border-green-200' : toast.type === 'error' ? 'bg-red-50 border border-red-200' : toast.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'}`}
                    >
                        <div className={`flex-shrink-0 ${toast.type === 'success' ? 'text-green-500' : toast.type === 'error' ? 'text-red-500' : toast.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`}>
                            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : toast.type === 'error' ? <XCircle className="w-5 h-5" /> : toast.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">{toast.title}</h4>
                            <p className="text-xs text-gray-600">{toast.message}</p>
                        </div>
                        <button onClick={() => removeToast(toast.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <style jsx global>{`
                .custom-scrollbar { scrollbar-width: thin; scrollbar-color: ${theme === 'dark' ? '#4b5563 transparent' : '#9ca3af transparent'}; }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${theme === 'dark' ? '#4b5563' : '#9ca3af'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: ${theme === 'dark' ? '#6b7280' : '#6b7280'}; }
              video {
        -webkit-transform: scaleX(-1);
        transform: scaleX(-1);
    }
    
    /* For camera preview only (not mirrored) */
    .camera-preview video {
        -webkit-transform: scaleX(1);
        transform: scaleX(1);
    }

          `}</style>
        </div>
    );
}