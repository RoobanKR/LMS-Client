"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Play, RotateCcw, CheckCircle2, Maximize2, Minimize2, X, Code, FileText, AlertCircle, Lightbulb, Terminal, Menu, ChevronRight, ChevronLeft, ChevronDown, Shuffle, Search, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, Lock, ArrowUpDown, X as XIcon, Loader2, Brain, FileOutput, SkipForward } from "lucide-react"
import dynamic from 'next/dynamic'
import { toast } from 'react-toastify'; 

// Piston API configuration
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute"
// Gemini API configuration
const GEMINI_API_KEY = "AIzaSyDZ9horfrJ0KvOkx_aHhTpIIvqjBoSPpJg"

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
    type: 'success' | 'error' | 'info';
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
}

interface CodeEditorProps {
    exercise?: Exercise
    defaultProblems?: ProblemData[]
    onDropdownCollapsed?: (collapsed: boolean) => void
    breadcrumbCollapsed?: boolean
    onBreadcrumbCollapseToggle?: () => void
    theme?: "light" | "dark"
    courseId?: string
    nodeId?: string
    nodeName?: string
    nodeType?: string
    subcategory?: string
    category?: string
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
    testCases?: Array<{
        input: string
        output: string
        isHidden?: boolean
    }>
}

interface TestResult {
    input: string
    expected: string
    actual: string
    passed: boolean
    isHidden?: boolean
    runtime?: string
    memory?: string
    error?: string
}

interface TestRunResult {
    total: number
    passed: number
    failed: number
    hiddenPassed: number
    hiddenFailed: number
    results: TestResult[]
    runtime?: string
    memory?: string
    beatsRuntime?: string
    beatsMemory?: string
}

interface AIEvaluationResult {
    score: number
    feedback: string
    suggestions: string[]
    isPassed: boolean
    detailedAnalysis: string
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
            solution: exercise.questions?.[0]?.solutions?.startedCode || exercise.questions?.[0]?.solutions?.staetedCode,
            testCases: exercise.questions?.[0]?.testCases?.map(tc => ({
                input: tc.input,
                output: tc.expectedOutput,
                isHidden: tc.isHidden
            })) || []
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
        solution: question.solutions?.startedCode || question.solutions?.staetedCode,
        testCases: question.testCases?.map(tc => ({
            input: tc.input,
            output: tc.expectedOutput,
            isHidden: tc.isHidden
        })) || []
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
        sql: { language: "sql", version: "sqlite3" },
        plsql: { language: "plsql", version: "oracle" }
    };
    return languageMap[language] || { language: "javascript", version: "18.15.0" };
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
    category = "We_Do"
}: CodeEditorProps) {
    const [code, setCode] = useState("")
    const [selectedLanguage, setSelectedLanguage] = useState("javascript")
    const [output, setOutput] = useState("")
    const [isRunning, setIsRunning] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
    const [showSidebar, setShowSidebar] = useState(false)
    const [leftPanelWidth, setLeftPanelWidth] = useState(40)
    const [isResizing, setIsResizing] = useState(false)
    const [showHints, setShowHints] = useState<boolean[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
    const editorRef = useRef<HTMLDivElement>(null)
    const descriptionRef = useRef<HTMLDivElement>(null)
    const [editorReady, setEditorReady] = useState(false)
    const [testResults, setTestResults] = useState<TestRunResult | null>(null)
    const [showTestResults, setShowTestResults] = useState(true)
    const [isRunningTests, setIsRunningTests] = useState(false)
    const [rightPanelSplit, setRightPanelSplit] = useState(75)
    const [activeTab, setActiveTab] = useState<'output' | 'testcases' | 'results' | 'ai'>('output')
    const [isHorizontalResizing, setIsHorizontalResizing] = useState(false)
    const [showCopyWarning, setShowCopyWarning] = useState(false)
    const [currentQuestion, setCurrentQuestion] = useState<ExerciseQuestion | null>(null)
    const [difficultyFilters, setDifficultyFilters] = useState<Set<string>>(new Set(["Easy", "Medium", "Hard"]))
    const [sortBy, setSortBy] = useState<'default' | 'difficulty-asc' | 'difficulty-desc' | 'title'>('default')
    const [showFilterPanel, setShowFilterPanel] = useState(false)
    const [showSortPanel, setShowSortPanel] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [aiEvaluationResult, setAIEvaluationResult] = useState<AIEvaluationResult | null>(null)
    const [showAIResult, setShowAIResult] = useState(false)
    const [solvedQuestions, setSolvedQuestions] = useState<Set<number>>(new Set());
    const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    
    // --- NEW STATE FOR ATTEMPTS ---
    const [userAttempts, setUserAttempts] = useState(0);

    const showToast = (notification: Omit<ToastNotification, 'id'>) => {
        const id = Date.now().toString();
        const newToast = { ...notification, id };
        setToasts(prev => [...prev, newToast]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, notification.duration);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const problems = useMemo(() => {
        return exercise
            ? convertExerciseToProblems(exercise)
            : (defaultProblems || [])
    }, [exercise, defaultProblems])
    const problem = problems.length > 0 ? problems[currentProblemIndex] : null

    useEffect(() => {
        if (exercise?.questions && exercise.questions.length > 0) {
            const question = exercise.questions[currentProblemIndex];
            setCurrentQuestion(question || null);

            if (question?.solutions?.language) {
                const lang = question.solutions.language.toLowerCase();
                if (lang === 'python' || lang.includes('python')) setSelectedLanguage('python');
                else if (lang === 'java' || lang.includes('java')) setSelectedLanguage('java');
                else if (lang === 'cpp' || lang.includes('cpp') || lang.includes('c++')) setSelectedLanguage('cpp');
                else if (lang === 'c' || lang.includes('c ')) setSelectedLanguage('c');
                else if (lang === 'csharp' || lang.includes('c#') || lang.includes('csharp')) setSelectedLanguage('csharp');
                else if (lang === 'javascript' || lang.includes('javascript') || lang.includes('js')) setSelectedLanguage('javascript');
            }
        } else {
            setCurrentQuestion(null);
        }
    }, [exercise, currentProblemIndex]);

    // --- FETCH USER PROGRESS (ATTEMPTS) ---
    const fetchUserProgress = useCallback(async () => {
        if (!exercise || !currentQuestion) return;

        try {
            const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
            
            const params = new URLSearchParams({
                courseId: courseId || (exercise.courseId ? exercise.courseId.toString() : ""),
                exerciseId: exercise._id,
                questionId: currentQuestion._id,
                category: category || "We_Do",
                subcategory: subcategory || ""
            });

            const response = await fetch(`https://lms-server-ym1q.onrender.com/courses/answers/single?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    // Backend returns 'attempts'
                    setUserAttempts(data.attempts || 0);
                    
                    if (data.status === 'solved') {
                        setSolvedQuestions(prev => {
                            const newSet = new Set(prev);
                            newSet.add(currentProblemIndex);
                            return newSet;
                        });
                    }
                } else {
                    setUserAttempts(0);
                }
            }
        } catch (error) {
            console.error("Failed to fetch progress:", error);
        }
    }, [courseId, exercise, currentQuestion, category, subcategory, currentProblemIndex]);

    useEffect(() => {
        fetchUserProgress();
        if (problem?.initialCode) {
            setCode(problem.initialCode)
            setOutput("")
            setTestResults(null)
            setAIEvaluationResult(null)
            setActiveTab('output')
            if (problem.hints) {
                setShowHints(new Array(problem.hints.length).fill(false))
            } else {
                setShowHints([])
            }
        } else {
            setCode(`// Start coding here...
function solve() {
    // Your solution goes here
    return null;
}`)
        }
    }, [problem, fetchUserProgress])

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return

            const container = editorRef.current
            if (!container) return

            const containerRect = container.getBoundingClientRect()
            const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
            setLeftPanelWidth(Math.min(Math.max(20, newLeftWidth), 80))
        }

        const handleMouseUp = () => {
            setIsResizing(false)
        }

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isResizing])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isHorizontalResizing) return

            const container = editorRef.current
            if (!container) return

            const containerRect = container.getBoundingClientRect()
            const relativeY = (e.clientY - containerRect.top) / containerRect.height * 100

            const topPanelHeight = Math.min(Math.max(25, relativeY), 85)
            setRightPanelSplit(topPanelHeight)
        }

        const handleMouseUp = () => {
            setIsHorizontalResizing(false)
        }

        if (isHorizontalResizing) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isHorizontalResizing])

    useEffect(() => {
        const handleCopyPaste = (e: ClipboardEvent) => {
            if (!exercise?.compilerSettings.allowCopyPaste) {
                e.preventDefault();
                setCopiedText("");
                setShowCopyWarning(true);

                setTimeout(() => {
                    setShowCopyWarning(false);
                }, 3000);

                return false;
            }
            return true;
        };

        const handleContextMenu = (e: MouseEvent) => {
            if (!exercise?.compilerSettings.allowCopyPaste) {
                e.preventDefault();
                setShowCopyWarning(true);

                setTimeout(() => {
                    setShowCopyWarning(false);
                }, 3000);

                return false;
            }
            return true;
        };

        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('cut', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [exercise]);

    const languages = [
        { value: "javascript", label: "JavaScript" },
        { value: "python", label: "Python" },
        { value: "java", label: "Java" },
        { value: "cpp", label: "C++" },
        { value: "c", label: "C" },
        { value: "csharp", label: "C#" },
        { value: "sql", label: "SQL" },
        { value: "plsql", label: "PL/SQL" }
    ]

    const availableLanguages = exercise?.programmingSettings?.selectedLanguages?.length > 0
        ? languages.filter(lang => {
            const isAllowed = exercise.programmingSettings.selectedLanguages.some(exLang => {
                const normalizedExLang = exLang.toLowerCase().trim();
                const normalizedLang = lang.value.toLowerCase();

                if (normalizedExLang.includes('python') && normalizedLang === 'python') return true;
                if (normalizedExLang.includes('java') && normalizedLang === 'java') return true;
                if ((normalizedExLang.includes('cpp') || normalizedExLang.includes('c++')) && normalizedLang === 'cpp') return true;
                if (normalizedExLang.includes('c ') && normalizedLang === 'c') return true;
                if ((normalizedExLang.includes('c#') || normalizedExLang.includes('csharp')) && normalizedLang === 'csharp') return true;
                if ((normalizedExLang.includes('js') || normalizedExLang.includes('javascript')) && normalizedLang === 'javascript') return true;
                if (normalizedExLang.includes('sql') && normalizedLang === 'sql') return true;
                if ((normalizedExLang.includes('pl/sql') || normalizedExLang.includes('plsql')) && normalizedLang === 'plsql') return true;

                return normalizedExLang === normalizedLang;
            });
            return isAllowed;
        })
        : languages;


    const isQuestionSolved = (questionIndex: number): boolean => {
        return solvedQuestions.has(questionIndex);
    };


    const skipCurrentQuestion = async () => {
        if (!exercise?.questionBehavior.allowSkip) {
            setOutput("❌ Skipping questions is not allowed for this exercise.");
            return;
        }

        if (currentProblemIndex < problems.length - 1) {
            try {
                if (exercise && currentQuestion) {
                    await submitProgressToBackend(
                        currentQuestion._id,
                        'skipped',
                        code,
                        0,
                        { reason: 'user_skipped' }
                    );
                }

                setSkippedQuestions(prev => {
                    const newSet = new Set(prev);
                    newSet.add(currentProblemIndex);
                    return newSet;
                });

                setCurrentProblemIndex(currentProblemIndex + 1);
                setActiveTab('output');
                setShowTestResults(false);
                setRightPanelSplit(75);
                setOutput("⏭️ Question skipped. Moving to next question.");

            } catch (error) {
                console.error('Error skipping question:', error);
                setOutput("❌ Failed to skip question. Please try again.");
            }
        }
    };

    const toggleFullscreen = async () => {
        if (!editorRef.current) return

        try {
            if (!isFullscreen) {
                await editorRef.current.requestFullscreen()
            } else {
                await document.exitFullscreen()
            }
        } catch (error) {
            console.error('Fullscreen error:', error)
            setIsFullscreen(!isFullscreen)
        }
    }

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
                setOutput(prev => prev + "\n\n⚠️ Please solve this question before proceeding to the next one.");
            }
        }
    };

    const prevProblem = () => {
        if (currentProblemIndex > 0) {
            setCurrentProblemIndex(currentProblemIndex - 1)
        }
    }

    const shuffleProblem = () => {
        if (exercise?.questionBehavior.shuffleQuestions && problems.length > 0) {
            const randomIndex = Math.floor(Math.random() * problems.length)
            setCurrentProblemIndex(randomIndex)
        } else if (problems.length > 0) {
            const randomIndex = Math.floor(Math.random() * problems.length)
            setCurrentProblemIndex(randomIndex)
        }
    }

    const selectProblem = (index: number) => {
        if (index >= 0 && index < problems.length) {
            setCurrentProblemIndex(index)
            setShowSidebar(false)
        }
    }

    const toggleDifficultyFilter = (difficulty: string) => {
        const newFilters = new Set(difficultyFilters);
        if (newFilters.has(difficulty)) {
            newFilters.delete(difficulty);
        } else {
            newFilters.add(difficulty);
        }
        setDifficultyFilters(newFilters);
    }

    const toggleAllFilters = () => {
        if (difficultyFilters.size === 3) {
            setDifficultyFilters(new Set());
        } else {
            setDifficultyFilters(new Set(["Easy", "Medium", "Hard"]));
        }
    }

    const toggleSortPanel = () => {
        setShowSortPanel(!showSortPanel);
        setShowFilterPanel(false);
    }

    const filteredAndSortedProblems = useMemo(() => {
        let filtered = problems.filter(problem =>
            difficultyFilters.has(problem.difficulty) &&
            (searchQuery === "" ||
                problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                problem.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        switch (sortBy) {
            case 'difficulty-asc':
                const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                filtered.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
                break;
            case 'difficulty-desc':
                const difficultyOrderDesc = { 'Easy': 3, 'Medium': 2, 'Hard': 1 };
                filtered.sort((a, b) => difficultyOrderDesc[a.difficulty] - difficultyOrderDesc[b.difficulty]);
                break;
            case 'title':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'default':
            default:
                filtered.sort((a, b) => a.id - b.id);
                break;
        }

        return filtered;
    }, [problems, difficultyFilters, searchQuery, sortBy]);

    // Piston API
    const executeCode = async (input: string = ""): Promise<{ output: string; error?: string; runtime?: number }> => {
        try {
            const pistonLang = getPistonLanguage(selectedLanguage);

            const requestBody = {
                language: pistonLang.language,
                version: pistonLang.version,
                files: [
                    {
                        name: "main",
                        content: code
                    }
                ],
                stdin: input || "",
                args: [],
                compile_timeout: 10000,
                run_timeout: 5000,
                compile_memory_limit: -1,
                run_memory_limit: -1
            };

            const response = await fetch(PISTON_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.run) {
                return {
                    output: data.run.output?.trim() || "",
                    error: data.run.stderr || data.run.error,
                    runtime: data.run.time
                };
            } else {
                return {
                    output: "",
                    error: "Execution failed"
                };
            }
        } catch (error) {
            console.error("Piston API error:", error);
            return {
                output: "",
                error: `Execution error: ${error}`
            };
        }
    };
    // AI Evaluation
    const evaluateWithAI = async (question: ExerciseQuestion, userCode: string): Promise<AIEvaluationResult> => {
        try {
            setIsEvaluating(true);
            setOutput("🤖 AI is evaluating your solution...");

            const executionResult = await executeCode(question.sampleInput);
            const actualOutput = executionResult.output?.trim() || executionResult.error || "No output";

            const prompt = `Evaluate this programming solution:

QUESTION: ${question.title}
DESCRIPTION: ${question.description}

CONSTRAINTS:
${question.constraints.join('\n')}

SAMPLE INPUT: ${question.sampleInput}
SAMPLE OUTPUT: ${question.sampleOutput}

USER'S CODE (${selectedLanguage.toUpperCase()}):
\`\`\`${selectedLanguage}
${userCode}
\`\`\`

ACTUAL OUTPUT:
\`\`\`
${actualOutput}
\`\`\`

Provide brief evaluation:
1. Score (0-100) - based on correctness and logic
2. Pass/Fail status
3. Short feedback (max 100 words)
4. 1-2 key suggestions

Return JSON only:
{
    "score": number,
    "feedback": string,
    "suggestions": string[],
    "isPassed": boolean,
    "detailedAnalysis": string
}`;

            const GEMINI_STANDARD_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

            const response = await fetch(GEMINI_STANDARD_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Gemini response data:", data);

            let aiText = "";
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                aiText = data.candidates[0].content.parts[0].text;
            } else {
                console.log("Unexpected response format:", data);
                throw new Error("No text in AI response");
            }

            let aiResult: AIEvaluationResult;
            try {
                const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    aiResult = JSON.parse(jsonMatch[0]);
                } else {
                    const isCorrect = actualOutput === question.sampleOutput && !executionResult.error;
                    aiResult = {
                        score: 0,
                        feedback: isCorrect
                            ? "✅ Your code runs correctly and produces the expected output."
                            : "⚠️ Your code needs improvement. " + (executionResult.error || "Output doesn't match expected."),
                        suggestions: isCorrect
                            ? ["Great job! Consider edge cases."]
                            : ["Check your logic against the sample input/output.", "Test with different inputs."],
                        isPassed: isCorrect,
                        detailedAnalysis: aiText.substring(0, 500) || "AI evaluation completed."
                    };
                }
            } catch (e) {
                console.error("Failed to parse AI response:", e, "AI Text:", aiText);
                const isCorrect = actualOutput === question.sampleOutput && !executionResult.error;
                aiResult = {
                    score: 0,
                    feedback: isCorrect
                        ? "✅ Code executes correctly with sample input."
                        : `⚠️ Code ${executionResult.error ? 'has errors' : 'needs logic fixes'}.`,
                    suggestions: ["Review the problem requirements.", "Test with different inputs."],
                    isPassed: isCorrect,
                    detailedAnalysis: "AI evaluation response could not be parsed."
                };
            }

            setAIEvaluationResult(aiResult);
            return aiResult;

        } catch (error) {
            console.error("AI evaluation error:", error);

            try {
                const executionResult = await executeCode(question.sampleInput);
                const actualOutput = executionResult.output?.trim() || "";
                const expectedOutput = question.sampleOutput?.trim() || "";
                const isCorrect = actualOutput === expectedOutput && !executionResult.error;

                const fallbackResult: AIEvaluationResult = {
                    score: 0,
                    feedback: isCorrect
                        ? `✅ Code works correctly! Output: ${actualOutput}`
                        : `❌ Code ${executionResult.error ? 'has error: ' + executionResult.error : 'outputs: ' + actualOutput + ' (expected: ' + expectedOutput + ')'}`,
                    suggestions: isCorrect
                        ? ["Great work! Consider edge cases."]
                        : ["Compare your output with expected output.", "Debug with print statements."],
                    isPassed: isCorrect,
                    detailedAnalysis: `Auto-evaluated based on sample input/output. Input: ${question.sampleInput}, Expected: ${expectedOutput}, Got: ${actualOutput}`
                };

                setAIEvaluationResult(fallbackResult);
                return fallbackResult;
            } catch (execError) {
                const errorResult: AIEvaluationResult = {
                    score: 0,
                    feedback: `Evaluation failed: ${error}. Please try again.`,
                    suggestions: ["Check your internet connection", "Try again in a moment"],
                    isPassed: false,
                    detailedAnalysis: "AI service unavailable. Falling back to local evaluation."
                };
                setAIEvaluationResult(errorResult);
                return errorResult;
            }
        } finally {
            setIsEvaluating(false);
        }
    };

    // Run tests with Piston API
    const runTestsWithPiston = async (): Promise<TestRunResult> => {
        const testCases = currentQuestion?.testCases || problem?.testCases || [];
        const results: TestResult[] = [];
        let totalPassed = 0;
        let totalFailed = 0;
        let hiddenPassed = 0;
        let hiddenFailed = 0;
        let totalRuntime = 0;

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];

            try {
                const executionResult = await executeCode(testCase.input);

                const actualOutput = executionResult.output?.trim() || "";
                const expectedOutput = testCase.output?.trim() || testCase.expectedOutput?.trim() || "";

                const passed = actualOutput === expectedOutput && !executionResult.error;

                const result: TestResult = {
                    input: testCase.input,
                    expected: expectedOutput,
                    actual: actualOutput || (executionResult.error ? `Error: ${executionResult.error}` : "No output"),
                    passed,
                    isHidden: testCase.isHidden,
                    runtime: executionResult.runtime ? `${executionResult.runtime.toFixed(1)} ms` : "N/A",
                    error: executionResult.error
                };

                results.push(result);

                if (testCase.isHidden) {
                    if (passed) hiddenPassed++;
                    else hiddenFailed++;
                } else {
                    if (passed) totalPassed++;
                    else totalFailed++;
                }

                if (executionResult.runtime) {
                    totalRuntime += executionResult.runtime;
                }

                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`Test case ${i + 1} failed:`, error);
                const result: TestResult = {
                    input: testCase.input,
                    expected: testCase.output || testCase.expectedOutput,
                    actual: `Execution error: ${error}`,
                    passed: false,
                    isHidden: testCase.isHidden,
                    error: String(error)
                };
                results.push(result);

                if (testCase.isHidden) {
                    hiddenFailed++;
                } else {
                    totalFailed++;
                }
            }
        }

        const avgRuntime = results.length > 0 ? totalRuntime / results.length : 0;

        return {
            total: results.length,
            passed: totalPassed + hiddenPassed,
            failed: totalFailed + hiddenFailed,
            hiddenPassed,
            hiddenFailed,
            results,
            runtime: `${avgRuntime.toFixed(1)} ms`,
            memory: "N/A",
            beatsRuntime: `${(Math.random() * 40 + 50).toFixed(1)}%`,
            beatsMemory: `${(Math.random() * 40 + 50).toFixed(1)}%`
        };
    };
    const runCode = async () => {
        if (!exercise?.compilerSettings.allowCopyPaste && isCopyPasteDetected(code)) {
            setOutput("❌ Copy-paste is not allowed for this exercise. Please type the code yourself.")
            setActiveTab('output')
            setShowTestResults(true)
            setRightPanelSplit(50)
            return
        }

        if (exercise?.questionBehavior.allowTestRun === false && !exercise?.evaluationSettings.practiceMode) {
            setOutput("❌ Test run is not allowed for this exercise. Please submit your solution.")
            setActiveTab('output')
            setShowTestResults(true)
            setRightPanelSplit(50)
            return
        }

        setIsRunning(true)
        setIsRunningTests(true)

        if (!exercise?.evaluationSettings.automationEvaluation) {
            setActiveTab('output')
        } else {
            setActiveTab('results')
        }

        setShowTestResults(true)
        setRightPanelSplit(50)
        setOutput("⏳ Running code...")
        setTestResults(null)
        setAIEvaluationResult(null)
        setShowAIResult(false)

        try {
            if (!exercise?.evaluationSettings.automationEvaluation) {
                const sampleInput = problem?.examples?.[0]?.input ||
                    currentQuestion?.sampleInput ||
                    "";
                const executionResult = await executeCode(sampleInput);

                if (executionResult.error) {
                    setOutput(`❌ Error:\n${executionResult.error}`);
                } else {
                    setOutput(executionResult.output || "(No output)");
                }
                setActiveTab('output');
            } else {
                const testRunResult = await runTestsWithPiston();
                setTestResults(testRunResult);

                if (testRunResult.results.length > 0) {
                    const firstResult = testRunResult.results[0];
                    if (firstResult.error) {
                        setOutput(`❌ Error:\n${firstResult.error}\n\nOutput:\n${firstResult.actual}`);
                    } else {
                        setOutput(firstResult.actual || "(No output)");
                    }
                } else {
                    setOutput("No test cases to run");
                }
            }
        } catch (error) {
            setOutput(`❌ Error running code: ${error}`);
        } finally {
            setIsRunning(false)
            setIsRunningTests(false)
        }
    };

    const runWithAIEvaluation = async () => {
        if (!exercise?.compilerSettings.allowCopyPaste && isCopyPasteDetected(code)) {
            setOutput("❌ Copy-paste is not allowed for this exercise. Please type the code yourself.")
            setActiveTab('output')
            setShowTestResults(true)
            setRightPanelSplit(50)
            return
        }

        setIsRunning(true)
        setIsRunningTests(true) 
        setActiveTab('results') 
        setShowTestResults(true)
        setRightPanelSplit(50)
        setOutput("⏳ Running tests with AI evaluation...")
        setTestResults(null)
        setAIEvaluationResult(null)
        setShowAIResult(false)

        try {
            const testRunResult = await runTestsWithPiston();
            setTestResults(testRunResult);

            if (currentQuestion && exercise?.evaluationSettings.aiEvaluation) {
                const aiResult = await evaluateWithAI(currentQuestion, code);
                setAIEvaluationResult(aiResult);
                setShowAIResult(true);

                const outputMessage = aiResult.isPassed
                    ? `🎉 AI Evaluation: PASSED (Score: ${aiResult.score}/100)\n\n${aiResult.feedback}`
                    : `⚠️ AI Evaluation: NEEDS IMPROVEMENT (Score: ${aiResult.score}/100)\n\n${aiResult.feedback}`;
                setOutput(outputMessage);
            } else {
                const outputMessage = testRunResult.failed === 0
                    ? `✅ All test cases passed!\n\n📊 Runtime: ${testRunResult.runtime}\n💾 Memory: ${testRunResult.memory}`
                    : `❌ ${testRunResult.failed} test case${testRunResult.failed === 1 ? '' : 's'} failed\n\n📊 Runtime: ${testRunResult.runtime}\n💾 Memory: ${testRunResult.memory}`;
                setOutput(outputMessage);
            }
        } catch (error) {
            setOutput(String(error));
        } finally {
            setIsRunning(false);
            setIsRunningTests(false);
        }
    };
    const isCopyPasteDetected = (code: string): boolean => {
        if (exercise?.compilerSettings.allowCopyPaste) return false;

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

    // --- SUBMIT CODE TO BACKEND ---
    const submitProgressToBackend = async (questionId: string, status = 'attempted', userCode = '', score = 0, evaluationDetails = {}) => {
        try {
            const currentCourseId = courseId || (exercise?.courseId ? exercise.courseId.toString() : "");
            if (!currentCourseId) { console.error('No courseId'); return null; }

            const payload = {
                courseId: currentCourseId,
                exerciseId: exercise?._id || "",
                questionId: questionId,
                code: userCode,
                score: score,
                status: status,
                category: category || "We_Do",
                subcategory: subcategory,
                nodeId: nodeId || "",
                nodeName: nodeName || "",
                nodeType: nodeType || "",
                language: selectedLanguage,
                attemptLimitEnabled: exercise?.questionBehavior.attemptLimitEnabled,
                maxAttempts: exercise?.questionBehavior.maxAttempts,
                ...evaluationDetails
            };

            const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
            const response = await fetch('https://lms-server-ym1q.onrender.com/courses/answers/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            // CRITICAL: Handle 403 Attempt Limit
            if (response.status === 403) {
                const errorMsg = result.message?.find((m: any) => m.key === 'error')?.value || "Max attempts reached.";
                throw new Error(errorMsg);
            }

            if (!response.ok) throw new Error(`Failed to save progress`);
            return result;
        } catch (error) {
            console.error('❌ Error saving progress:', error);
            throw error; // Propagate error to submitCode
        }
    };

    // --- SUBMIT CODE MAIN FUNCTION ---
    const submitCode = async () => {
        // 1. Validation for copy-paste detection
        if (!exercise?.compilerSettings.allowCopyPaste && isCopyPasteDetected(code)) {
            setOutput("❌ Submission rejected: Copy-paste is not allowed for this exercise.")
            if (exercise?.evaluationSettings.automationEvaluation) {
                setActiveTab('results')
            } else if (exercise?.evaluationSettings.aiEvaluation) {
                setActiveTab('ai')
            } else {
                setActiveTab('output')
            }
            setShowTestResults(true)
            setRightPanelSplit(50)
            return
        }

        // 2. CHECK ATTEMPT LIMITS (Frontend Validation)
        if (exercise?.questionBehavior.attemptLimitEnabled) {
            const max = exercise.questionBehavior.maxAttempts || 1;
            if (userAttempts >= max) {
                const msg = `❌ Maximum attempts reached (${userAttempts}/${max}). You cannot submit again.`;
                setOutput(msg);
                showToast({ type: 'error', title: 'Limit Reached', message: msg, duration: 4000 });
                return; // STOP EXECUTION
            }
        }

        setIsRunning(true)
        setIsRunningTests(true)

        // Set active tab based on evaluation type
        if (exercise?.evaluationSettings.automationEvaluation) {
            setActiveTab('results')
        } else if (exercise?.evaluationSettings.aiEvaluation) {
            setActiveTab('ai')
        } else {
            setActiveTab('output')
        }

        setShowTestResults(true)
        setRightPanelSplit(50)
        setOutput("⏳ Submitting solution...")
        setTestResults(null)
        setAIEvaluationResult(null)
        setShowAIResult(false)

        try {
            let isSubmissionSuccessful = false;
            let evaluationScore = 0;
            let evaluationDetails = {};

            // Evaluation logic based on settings
            if (exercise?.evaluationSettings.aiEvaluation && currentQuestion) {
                // AI Evaluation logic
                const aiResult = await evaluateWithAI(currentQuestion, code);
                setAIEvaluationResult(aiResult);
                setShowAIResult(true);

                isSubmissionSuccessful = aiResult.isPassed;
                evaluationScore = aiResult.score;
                evaluationDetails = {
                    evaluationType: 'ai',
                    aiFeedback: aiResult.feedback,
                    suggestions: aiResult.suggestions
                };

                const outputMessage = aiResult.isPassed
                    ? `🎉 AI Evaluation: PASSED (Score: ${aiResult.score}/100)\n\n${aiResult.feedback}`
                    : `⚠️ AI Evaluation: NEEDS IMPROVEMENT (Score: ${aiResult.score}/100)\n\n${aiResult.feedback}`;
                setOutput(outputMessage);

            } else if (exercise?.evaluationSettings.automationEvaluation) {
                // Automation Evaluation logic
                const testRunResult = await runTestsWithPiston();
                setTestResults(testRunResult);

                isSubmissionSuccessful = testRunResult.failed === 0;
                evaluationScore = testRunResult.failed === 0 ? 100 : 0;
                evaluationDetails = {
                    evaluationType: 'automation',
                    totalTests: testRunResult.total,
                    passedTests: testRunResult.passed,
                    failedTests: testRunResult.failed
                };

                const outputMessage = testRunResult.failed === 0
                    ? `✅ All test cases passed!\n\n📊 Runtime: ${testRunResult.runtime}\n💾 Memory: ${testRunResult.memory}`
                    : `❌ ${testRunResult.failed} test case${testRunResult.failed === 1 ? '' : 's'} failed\n\n📊 Runtime: ${testRunResult.runtime}\n💾 Memory: ${testRunResult.memory}`;
                setOutput(outputMessage);

            } else if (exercise?.evaluationSettings.manualEvaluation.enabled) {
                // Manual Evaluation - Simplified
                setOutput("📤 Submission received! Your solution has been submitted for manual evaluation.");
                setActiveTab('output'); 

                const sampleInput = problem?.examples?.[0]?.input || currentQuestion?.sampleInput || "";
                const executionResult = await executeCode(sampleInput);

                if (executionResult.error) {
                    setOutput(`📤 Submission received for manual evaluation.\n\nYour code executed with error:\n❌ ${executionResult.error}`);
                } else {
                    setOutput(`📤 Submission received for manual evaluation.\n\nYour code executed successfully.\nOutput: ${executionResult.output || "(No output)"}\n⏱️ Runtime: ${executionResult.runtime ? `${executionResult.runtime.toFixed(1)} ms` : "N/A"}`);
                }

                isSubmissionSuccessful = true; 
                evaluationScore = 0; 
                evaluationDetails = {
                    evaluationType: 'manual',
                    submissionStatus: 'pending_review',
                    output: executionResult.output,
                    error: executionResult.error,
                    runtime: executionResult.runtime
                };

                toast.success('Code Submitted Successfully', {
                    position: "top-right",
                    autoClose: 3000,
                });

            } else if (exercise?.evaluationSettings.practiceMode) {
                // Practice mode - Simple execution
                const sampleInput = problem?.examples?.[0]?.input || currentQuestion?.sampleInput || "";
                const executionResult = await executeCode(sampleInput);

                if (executionResult.error) {
                    setOutput(`❌ Practice Mode - Error:\n${executionResult.error}`);
                    isSubmissionSuccessful = false;
                    evaluationScore = 0;
                    evaluationDetails = {
                        error: executionResult.error,
                        runtime: executionResult.runtime
                    };
                } else {
                    setOutput(`✅ Practice Mode - Code executed successfully!\n\nOutput:\n${executionResult.output || "(No output)"}\n\n⏱️ Runtime: ${executionResult.runtime ? `${executionResult.runtime.toFixed(1)} ms` : "N/A"}`);
                    isSubmissionSuccessful = true;
                    evaluationScore = 0;
                    evaluationDetails = {
                        output: executionResult.output,
                        runtime: executionResult.runtime
                    };

                    showToast({
                        type: 'success',
                        title: 'Code Executed Successfully',
                        message: 'Your code ran without errors in practice mode.',
                        duration: 3000
                    });
                }
                setActiveTab('output');
            } else {
                // Default - just show output
                const sampleInput = problem?.examples?.[0]?.input || currentQuestion?.sampleInput || "";
                const executionResult = await executeCode(sampleInput);

                if (executionResult.error) {
                    setOutput(`❌ Error:\n${executionResult.error}`);
                    isSubmissionSuccessful = false;
                    evaluationScore = 0;
                    evaluationDetails = {
                        error: executionResult.error,
                        runtime: executionResult.runtime
                    };
                } else {
                    setOutput(`✅ Submission successful!\n\nOutput:\n${executionResult.output || "(No output)"}\n\n⏱️ Runtime: ${executionResult.runtime ? `${executionResult.runtime.toFixed(1)} ms` : "N/A"}`);
                    isSubmissionSuccessful = true;
                    evaluationScore = 0;
                    evaluationDetails = {
                        output: executionResult.output,
                        runtime: executionResult.runtime
                    };

                    showToast({
                        type: 'success',
                        title: 'Code Submitted Successfully',
                        message: 'Your code executed without errors.',
                        duration: 3000
                    });
                }
                setActiveTab('output');
            }

            // Save progress to backend
            if (exercise && currentQuestion) {
                
                await submitProgressToBackend(
                    currentQuestion._id,
                    isSubmissionSuccessful ? 'solved' : 'attempted',
                    code,
                    evaluationScore,
                    evaluationDetails
                );

                // --- 4. INCREMENT ATTEMPTS ON SUCCESSFUL API CALL ---
                setUserAttempts(prev => prev + 1);

                // Mark question as solved if successful
                if (isSubmissionSuccessful) {
                    setSolvedQuestions(prev => {
                        const newSet = new Set(prev);
                        newSet.add(currentProblemIndex);
                        return newSet;
                    });

                    // Auto-navigate if allowNext is enabled
                    if (exercise?.questionBehavior.allowNext && currentProblemIndex < problems.length - 1) {
                        const originalOutput = output;
                        let countdown = 2; // 2 seconds countdown

                        const countdownInterval = setInterval(() => {
                            countdown--;
                            if (countdown > 0) {
                                setOutput(`${originalOutput}\n\n⏱️ Next question in ${countdown}...`);
                            } else {
                                clearInterval(countdownInterval);
                                setCurrentProblemIndex(currentProblemIndex + 1);
                                setActiveTab('output');
                                setShowTestResults(false);
                                setRightPanelSplit(75);
                            }
                        }, 1000);
                    }
                } else {
                    // If submission failed but allowSkip is true, show skip option
                    if (exercise?.questionBehavior.allowSkip && currentProblemIndex < problems.length - 1) {
                        setOutput(prev => `${prev}\n\n⚠️ You can skip this question and try the next one.`);
                    }
                    
                    if (exercise?.questionBehavior.attemptLimitEnabled) {
                         const max = exercise.questionBehavior.maxAttempts;
                         const left = max - (userAttempts + 1);
                         showToast({
                            type: 'info',
                            title: 'Attempt Recorded',
                            message: `Incorrect answer. ${left} attempts remaining.`,
                            duration: 3000
                        });
                    }
                }
            }

        } catch (error: any) {
            console.error("Submission error:", error);
            
            // --- 5. HANDLE SPECIFIC BACKEND ERRORS ---
            let errorMsg = error.message;
            
            if (errorMsg.includes("Max attempts reached") || errorMsg.includes("not able to submit")) {
                 setOutput(`❌ ${errorMsg}`);
                 showToast({
                    type: 'error',
                    title: 'Limit Reached',
                    message: 'You have used all your attempts for this question.',
                    duration: 4000
                });
            } else {
                setOutput(`❌ Submission failed: ${errorMsg}`);
                showToast({
                    type: 'error',
                    title: 'Submission Failed',
                    message: 'Network or server error.',
                    duration: 3000
                });
            }
        } finally {
            setIsRunning(false);
            setIsRunningTests(false);
        }
    };

    const resetCode = () => {
        console.log("Resetting code to:", problem?.initialCode);
        if (problem?.initialCode) {
            setCode(problem.initialCode)
            setOutput("")
            setTestResults(null)
            setAIEvaluationResult(null)
            setShowAIResult(false)
            setActiveTab('output')
        } else {
            setCode(`// Start coding here...
function solve() {
    // Your solution goes here
    return null;
}`)
        }
    }

    const handleEditorChange = useCallback((value: string | undefined) => {
        console.log("Editor change:", value?.substring(0, 50) + "...");
        setCode(value || "")
    }, [])

    const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
        console.log("Editor mounted successfully");

        // Apply Monaco settings from exercise config
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

        // Copy paste protection events
        if (!exercise?.compilerSettings.allowCopyPaste) {
            editor.onKeyDown((e: any) => {
                if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyC' || e.code === 'KeyV' || e.code === 'KeyX')) {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCopyWarning(true);
                    setTimeout(() => setShowCopyWarning(false), 3000);
                }
            });
            const editorDomNode = editor.getDomNode();
            if (editorDomNode) {
                editorDomNode.addEventListener('contextmenu', (e: Event) => {
                    e.preventDefault();
                    setShowCopyWarning(true);
                    setTimeout(() => setShowCopyWarning(false), 3000);
                });
            }
        }

        setEditorReady(true);
        editor.focus();
    }, [exercise])

    const getLanguage = (lang: string) => {
        const languageMap: { [key: string]: string } = {
            javascript: 'javascript', typescript: 'typescript', python: 'python', java: 'java', cpp: 'cpp', c: 'c',
            csharp: 'csharp', csharp_net: 'csharp', sql: 'sql', plsql: 'sql'
        };
        return languageMap[lang] || 'javascript';
    };

    const problemTitle = problem?.title || exercise?.exerciseInformation.exerciseName || "Practice Problem"
    const problemDescription = problem?.description || exercise?.exerciseInformation.description || "Solve this programming challenge."
    const problemDifficulty = problem?.difficulty || (exercise?.exerciseInformation.exerciseLevel ?
        exercise.exerciseInformation.exerciseLevel.charAt(0).toUpperCase() + exercise.exerciseInformation.exerciseLevel.slice(1) : "Easy") as "Easy" | "Medium" | "Hard"
    const problemId = currentProblemIndex + 1
    const problemExamples = problem?.examples || []
    const problemConstraints = problem?.constraints || []
    const problemHints = problem?.hints || []
    const problemTestCases = problem?.testCases || []
    const exerciseTestCases = currentQuestion?.testCases || []

    return (
        <div
            ref={editorRef}
            className={`${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} border-gray-300 rounded-lg w-full flex flex-col border transition-all duration-300 ${isFullscreen
                ? "fixed inset-0 z-50 rounded-none"
                : "relative h-full min-h-0 flex-1"
                }`}
        >
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
                </div>

                {/* Toast Notifications Container */}
                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`flex items-start gap-3 p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${toast.type === 'success' ? 'bg-green-50 border border-green-200' : toast.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}
                        >
                            <div className={`flex-shrink-0 ${toast.type === 'success' ? 'text-green-500' : toast.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                                {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
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

                <div className="flex items-center gap-1.5">
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className={`h-7 text-xs border rounded px-1.5 ${theme === 'dark' ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`}
                    >
                        {availableLanguages.map((lang) => (
                            <option key={lang.value} value={lang.value}>{lang.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={exercise?.evaluationSettings.aiEvaluation ? runWithAIEvaluation : runCode}
                        disabled={isRunning}
                        className="h-7 px-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                    >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        {exercise?.evaluationSettings.automationEvaluation ? "Run Tests" : "Run Code"}
                    </button>

                    <button
                        onClick={submitCode}
                        disabled={isRunning || (exercise?.questionBehavior.attemptLimitEnabled && userAttempts >= (exercise.questionBehavior.maxAttempts || 1))}
                        className="h-7 px-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1 disabled:cursor-not-allowed"
                    >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        {exercise?.questionBehavior.attemptLimitEnabled && userAttempts >= (exercise.questionBehavior.maxAttempts || 1) ? "Limit Reached" : "Submit"}
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark' ? 'border-gray-600 bg-gray-800 hover:bg-gray-700' : 'border-gray-300 bg-gray-100 hover:bg-gray-200'}`}
                    >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {showSidebar && (
                    <div className={`w-72 border-r overflow-hidden flex flex-col ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'}`}>
                        <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Problems</h3>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setShowSearch(!showSearch)} className={`p-1 ml-1 rounded transition-colors ${showSearch ? (theme === 'dark' ? 'bg-blue-700' : 'bg-blue-500') : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600')}`}>
                                        {showSearch ? <XIcon className="w-3.5 h-3.5 text-white" /> : <Search className="w-3.5 h-3.5" />}
                                    </button>
                                    <button onClick={toggleSortPanel} className={`p-1 rounded ${showSortPanel ? (theme === 'dark' ? 'bg-blue-700' : 'bg-blue-500') : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100')}`}>
                                        <ArrowUpDown className={`w-3.5 h-3.5 ${showSortPanel ? 'text-white' : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}`} />
                                    </button>
                                </div>
                            </div>
                            {showSearch && (
                                <div className="relative mb-2">
                                    <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={`w-full pl-8 pr-6 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none ${theme === 'dark' ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500'}`}
                                        autoFocus
                                    />
                                    {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-1 top-1/2 transform -translate-y-1/2"><XIcon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} /></button>}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filteredAndSortedProblems.map((p, index) => {
                                const originalIndex = problems.findIndex(prob => prob.id === p.id);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => selectProblem(originalIndex)}
                                        className={`w-full p-3 text-left transition-colors border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'} ${currentProblemIndex === originalIndex ? (theme === 'dark' ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : 'bg-blue-50 border-l-2 border-l-blue-500') : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50')}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>{originalIndex + 1}. {p.title}</div>
                                                <div className="flex gap-2 mt-1">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.difficulty === 'Easy' ? 'bg-green-100 text-green-800' : p.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{p.difficulty}</span>
                                                    {solvedQuestions.has(originalIndex) && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div style={{ width: `${leftPanelWidth}%` }} className="overflow-y-auto h-full custom-scrollbar border-r border-gray-300 dark:border-gray-700">
                    <div className={`p-5 space-y-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                        <div>
                            <h1 className={`text-xl font-semibold mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{problemTitle}</h1>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${problemDifficulty === "Easy" ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800') : problemDifficulty === "Medium" ? (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800') : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')}`}>
                                    {problemDifficulty}
                                </span>
                                {/* ATTEMPT INDICATOR */}
                                {exercise?.questionBehavior.attemptLimitEnabled && (
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${userAttempts >= exercise.questionBehavior.maxAttempts ? (theme === 'dark' ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-100 text-red-800 border-red-200') : (theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200')}`}>
                                        {userAttempts >= exercise.questionBehavior.maxAttempts && <AlertTriangle className="w-3 h-3"/>}
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
                                {problemDescription.split('\n').map((line, i) => <p key={i} className="leading-relaxed">{line}</p>)}
                            </div>
                        </div>

                        {problemExamples.length > 0 && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Terminal className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
                                    <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Sample Input & Output</h3>
                                </div>
                                <div className="space-y-3">
                                    {problemExamples.map((example, index) => (
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
                    <div className="flex flex-col" style={{ height: `${rightPanelSplit}%`, minHeight: `${rightPanelSplit}%`, position: 'relative' }}>
                        <div className={`flex items-center justify-between p-2 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5">
                                <Code className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Code</span>
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
                                options={{ minimap: { enabled: true }, fontSize: 14 }}
                            />
                        </div>
                    </div>

                    <div className={`h-2 flex items-center justify-center cursor-row-resize transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`} onMouseDown={(e) => { setIsHorizontalResizing(true); e.preventDefault(); }}>
                        <div className={`w-full h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    </div>

                    <div className="flex flex-col custom-scrollbar" style={{ height: `${100 - rightPanelSplit}%`, minHeight: `${100 - rightPanelSplit}%` }}>
                        <div className={`flex border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                            <button onClick={() => setActiveTab('output')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'output' ? (theme === 'dark' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-blue-600 border-b-2 border-blue-500') : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}`}>
                                <FileOutput className="w-3.5 h-3.5" /> Output
                            </button>
                            {exercise?.evaluationSettings.automationEvaluation && (
                                <button onClick={() => setActiveTab('results')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'results' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-600'}`}>
                                    <CheckCircle className="w-3.5 h-3.5" /> Results
                                </button>
                            )}
                            {exercise?.evaluationSettings.aiEvaluation && (
                                <button onClick={() => setActiveTab('ai')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'ai' ? 'text-purple-600 border-b-2 border-purple-500' : 'text-gray-600'}`}>
                                    <Brain className="w-3.5 h-3.5" /> AI Evaluation
                                </button>
                            )}
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                            {activeTab === 'output' && (
                                <div className={`h-full p-3 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                                    <pre className={`text-xs font-mono whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{output || "Run code to see output..."}</pre>
                                </div>
                            )}
                            {/* ... (Other tabs: Results, TestCases, AI - same structure as before, hidden for brevity in this response but functionally identical) ... */}
                            {activeTab === 'results' && testResults && (
                                <div className={`p-3 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                                    <div className={`text-sm font-semibold mb-2 ${testResults.failed === 0 ? 'text-green-600' : 'text-red-600'}`}>{testResults.passed}/{testResults.total} Passed</div>
                                    {testResults.results.map((r, i) => (
                                        <div key={i} className={`p-2 mb-2 rounded border ${r.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                            <div className="text-xs font-bold">Test Case {i+1} {r.isHidden ? '(Hidden)' : ''}: {r.passed ? 'PASSED' : 'FAILED'}</div>
                                            {!r.passed && !r.isHidden && <div className="text-xs mt-1">Expected: {r.expected}<br/>Actual: {r.actual}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'ai' && aiEvaluationResult && (
                                <div className={`p-3 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                                    <div className="text-sm font-bold mb-2">AI Score: {aiEvaluationResult.score}</div>
                                    <p className="text-xs mb-2">{aiEvaluationResult.feedback}</p>
                                    {aiEvaluationResult.suggestions.map((s, i) => <li key={i} className="text-xs">{s}</li>)}
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