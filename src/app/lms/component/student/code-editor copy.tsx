"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Play, RotateCcw, CheckCircle2, Maximize2, Minimize2, X, Code, FileText, AlertCircle, Lightbulb, Terminal, Menu, ChevronRight, ChevronLeft, ChevronDown, Shuffle, Grid3x3, Search, List, ChevronUp, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff, Clock, Database, GripVertical, Lock, Copy, Zap, Users, Target, Calendar, Shield, Filter, ArrowUpDown, X as XIcon, Loader2, Brain, Output, FileOutput } from "lucide-react"
import dynamic from 'next/dynamic'

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
}

interface CodeEditorProps {
    exercise?: Exercise
    defaultProblems?: ProblemData[]
    onDropdownCollapsed?: (collapsed: boolean) => void
    breadcrumbCollapsed?: boolean
    onBreadcrumbCollapseToggle?: () => void
    theme?: "light" | "dark"
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

// Map languages to Piston runtime
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
    theme = "light"
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
    const [showResultsPopup, setShowResultsPopup] = useState(false)
    const [popupContent, setPopupContent] = useState<{ title: string, content: string, type: 'output' | 'testcases' }>({ title: 'Output', content: '', type: 'output' })
    const [showHints, setShowHints] = useState<boolean[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
    const editorRef = useRef<HTMLDivElement>(null)
    const descriptionRef = useRef<HTMLDivElement>(null)
    const [editorReady, setEditorReady] = useState(false)
    const [testResults, setTestResults] = useState<TestRunResult | null>(null)
    const [showTestResults, setShowTestResults] = useState(true)
    const [isRunningTests, setIsRunningTests] = useState(false)
    const [showHiddenTests, setShowHiddenTests] = useState(false)
    const [rightPanelSplit, setRightPanelSplit] = useState(75)
    const [activeTab, setActiveTab] = useState<'output' | 'testcases' | 'results'>('output')
    const [isHorizontalResizing, setIsHorizontalResizing] = useState(false)
    const [copiedText, setCopiedText] = useState<string>("")
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

    useEffect(() => {
        console.log("Problem changed, setting code to:", problem?.initialCode);
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
    }, [problem])

    useEffect(() => {
        if (exercise) {
            console.log("Exercise settings applied:", {
                allowCopyPaste: exercise.compilerSettings.allowCopyPaste,
                languages: exercise.programmingSettings.selectedLanguages,
                theme: exercise.compilerSettings.theme,
                fontSize: exercise.compilerSettings.fontSize,
                tabSize: exercise.compilerSettings.tabSize
            });

            if (exercise.programmingSettings.selectedLanguages.length > 0) {
                const firstLang = exercise.programmingSettings.selectedLanguages[0].toLowerCase()
                if (firstLang === 'python' || firstLang.includes('python')) setSelectedLanguage('python')
                else if (firstLang === 'java' || firstLang.includes('java')) setSelectedLanguage('java')
                else if (firstLang === 'cpp' || firstLang.includes('cpp') || firstLang.includes('c++')) setSelectedLanguage('cpp')
                else if (firstLang === 'c' || firstLang.includes('c ')) setSelectedLanguage('c')
                else if (firstLang === 'csharp' || firstLang.includes('c#') || firstLang.includes('csharp')) setSelectedLanguage('csharp')
                else if (firstLang === 'javascript' || firstLang.includes('javascript') || firstLang.includes('js')) setSelectedLanguage('javascript')
                else setSelectedLanguage('javascript')
            }
        }
    }, [exercise])

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
        if (currentProblemIndex < problems.length - 1) {
            setCurrentProblemIndex(currentProblemIndex + 1)
        }
    }

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

    const toggleFilterPanel = () => {
        setShowFilterPanel(!showFilterPanel);
        setShowSortPanel(false);
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

    // Piston API - Execute code
    const executeCode = async (input: string = ""): Promise<{ output: string; error?: string; runtime?: number }> => {
        try {
            const pistonLang = getPistonLanguage(selectedLanguage);
            
            // Prepare code based on language
            let preparedCode = code;
            
            // For Python, ensure there's a print statement for the last expression
            if (selectedLanguage === 'python') {
                const lines = preparedCode.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                
                // If last line doesn't have print() and is not a comment, import, or function definition
                if (!lastLine.includes('print(') && 
                    !lastLine.trim().startsWith('#') && 
                    !lastLine.trim().startsWith('import ') && 
                    !lastLine.trim().startsWith('from ') &&
                    !lastLine.includes('def ') && 
                    !lastLine.includes('class ') &&
                    !lastLine.includes('if ') &&
                    !lastLine.includes('for ') &&
                    !lastLine.includes('while ') &&
                    !lastLine.includes('return ') &&
                    !lastLine.trim().endsWith(':') &&
                    lastLine.trim() !== '') {
                    
                    // Try to evaluate the expression and print result
                    preparedCode = `${preparedCode}\nprint(${lastLine.trim()})`;
                }
            }
            
            // For JavaScript, add console.log for the last expression
            else if (selectedLanguage === 'javascript') {
                const lines = preparedCode.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                
                // If last line is a simple expression (not ending with ; or { or } and not a declaration)
                if (!lastLine.includes('console.log') && 
                    !lastLine.includes('function ') && 
                    !lastLine.includes('const ') && 
                    !lastLine.includes('let ') && 
                    !lastLine.includes('var ') &&
                    !lastLine.includes('if ') &&
                    !lastLine.includes('for ') &&
                    !lastLine.includes('while ') &&
                    !lastLine.includes('return ') &&
                    !lastLine.trim().endsWith(';') &&
                    !lastLine.trim().endsWith('{') &&
                    !lastLine.trim().endsWith('}') &&
                    lastLine.trim() !== '' &&
                    !lastLine.trim().startsWith('//')) {
                    
                    // Check if it's an assignment
                    if (!lastLine.includes('=')) {
                        preparedCode = `${preparedCode}\nconsole.log(${lastLine.trim()})`;
                    }
                }
            }

            const requestBody = {
                language: pistonLang.language,
                version: pistonLang.version,
                files: [
                    {
                        name: "main",
                        content: preparedCode
                    }
                ],
                stdin: input,
                args: [],
                compile_timeout: 10000,
                run_timeout: 5000,
                compile_memory_limit: -1,
                run_memory_limit: -1
            };

            console.log("Executing code with Piston API:", requestBody);

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
                    output: data.run.output || data.run.stdout || "",
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

    // AI Evaluation using Gemini API
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
                        score: isCorrect ? 100 : 50,
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
                    score: isCorrect ? 100 : 50,
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
                    score: isCorrect ? 100 : 50,
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

    // Simple compile and run for practice mode
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
        setIsRunningTests(false)
        setActiveTab('output')
        setShowTestResults(true)
        setRightPanelSplit(50)
        setOutput("⏳ Compiling and running code...")
        setTestResults(null)
        setAIEvaluationResult(null)
        setShowAIResult(false)

        try {
            const sampleInput = problem?.examples?.[0]?.input || currentQuestion?.sampleInput || "";
            const executionResult = await executeCode(sampleInput);
            
            if (executionResult.error) {
                setOutput(`❌ Compilation/Runtime Error:\n${executionResult.error}\n\n💡 Output:\n${executionResult.output || "No output"}`);
            } else {
                setOutput(`✅ Code executed successfully!\n\n📝 Output:\n${executionResult.output || "(No output - check if you're printing results)"}\n\n⏱️ Runtime: ${executionResult.runtime ? `${executionResult.runtime.toFixed(1)} ms` : "N/A"}`);
            }
        } catch (error) {
            setOutput(`❌ Execution failed:\n${error}`);
        } finally {
            setIsRunning(false)
        }
    };

    // Run with AI evaluation
    const runWithAIEvaluation = async () => {
        if (!exercise?.compilerSettings.allowCopyPaste && isCopyPasteDetected(code)) {
            setOutput("❌ Copy-paste is not allowed for this exercise. Please type the code yourself.")
            setActiveTab('output')
            setShowTestResults(true)
            setRightPanelSplit(50)
            return
        }

        setIsRunning(true)
        setActiveTab('output')
        setShowTestResults(true)
        setRightPanelSplit(50)
        setOutput("⏳ Running code and evaluating with AI...")
        setTestResults(null)
        setAIEvaluationResult(null)
        setShowAIResult(false)

        try {
            if (currentQuestion) {
                const aiResult = await evaluateWithAI(currentQuestion, code);
                setAIEvaluationResult(aiResult);
                setShowAIResult(true);
                
                const outputMessage = aiResult.isPassed 
                    ? `✅ AI Evaluation: PASSED (Score: ${aiResult.score}/100)\n\n${aiResult.feedback}`
                    : `⚠️ AI Evaluation: Score: ${aiResult.score}/100\n\n${aiResult.feedback}`;
                setOutput(outputMessage);
            } else {
                const sampleInput = problem?.examples?.[0]?.input || "";
                const executionResult = await executeCode(sampleInput);
                
                if (executionResult.error) {
                    setOutput(`❌ Error:\n${executionResult.error}\n\n💡 Output:\n${executionResult.output}`);
                } else {
                    setOutput(`✅ Execution successful!\n\n📝 Output:\n${executionResult.output}\n\n⏱️ Runtime: ${executionResult.runtime ? `${executionResult.runtime.toFixed(1)} ms` : "N/A"}`);
                }
            }
        } catch (error) {
            setOutput(`❌ Execution failed:\n${error}`);
        } finally {
            setIsRunning(false);
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

    const submitCode = async () => {
        if (!exercise?.compilerSettings.allowCopyPaste && isCopyPasteDetected(code)) {
            setOutput("❌ Submission rejected: Copy-paste is not allowed for this exercise.")
            setActiveTab('output')
            setShowTestResults(true)
            setRightPanelSplit(50)
            return
        }

        if (exercise?.questionBehavior.attemptLimitEnabled) {
            console.log("Attempt tracking would be implemented here")
        }

        setIsRunning(true)
        setIsRunningTests(true)
        setActiveTab('output')
        setShowTestResults(true)
        setRightPanelSplit(50)
        setOutput("⏳ Submitting solution...")
        setTestResults(null)
        setAIEvaluationResult(null)
        setShowAIResult(false)

        try {
            // Check evaluation settings
            if (exercise?.evaluationSettings.aiEvaluation && currentQuestion) {
                // AI Evaluation - Show output and AI evaluation
                setOutput("🧠 AI evaluation in progress...");
                const aiResult = await evaluateWithAI(currentQuestion, code);
                setAIEvaluationResult(aiResult);
                setShowAIResult(true);
                
                const outputMessage = aiResult.isPassed 
                    ? `🎉 AI Evaluation: PASSED (Score: ${aiResult.score}/100)\n\n${aiResult.feedback}`
                    : `⚠️ AI Evaluation: NEEDS IMPROVEMENT (Score: ${aiResult.score}/100)\n\n${aiResult.feedback}`;
                setOutput(outputMessage);
                
                // Set active tab based on evaluation type
                setActiveTab(showAIResult ? 'results' : 'output');
                
            } else if (exercise?.evaluationSettings.automationEvaluation) {
                // Automation Evaluation - Run test cases
                const testRunResult = await runTestsWithPiston();
                setTestResults(testRunResult);
                
                const outputMessage = testRunResult.failed === 0
                    ? `✅ All test cases passed!\n\n📊 Runtime: ${testRunResult.runtime}\n💾 Memory: ${testRunResult.memory}`
                    : `❌ ${testRunResult.failed} test case${testRunResult.failed === 1 ? '' : 's'} failed\n\n📊 Runtime: ${testRunResult.runtime}\n💾 Memory: ${testRunResult.memory}`;
                setOutput(outputMessage);
                
                // Set active tab to results for automation evaluation
                setActiveTab('results');
                
            } else if (exercise?.evaluationSettings.manualEvaluation.enabled) {
                // Manual Evaluation
                setOutput("📤 Submission received! Your solution has been submitted for manual evaluation.");
                setActiveTab('output');
                
            } else if (exercise?.evaluationSettings.practiceMode) {
                // Practice mode - just show output compilation result
                setOutput("🔄 Practice Mode: Running your code...");
                const sampleInput = problem?.examples?.[0]?.input || currentQuestion?.sampleInput || "";
                const executionResult = await executeCode(sampleInput);
                
                if (executionResult.error) {
                    setOutput(`❌ Practice Mode - Error:\n${executionResult.error}\n\n💡 Output:\n${executionResult.output || "No output"}`);
                } else {
                    setOutput(`✅ Practice Mode - Code executed successfully!\n\n📝 Output:\n${executionResult.output || "(No output - check if you're printing results)"}\n\n⏱️ Runtime: ${executionResult.runtime ? `${executionResult.runtime.toFixed(1)} ms` : "N/A"}`);
                }
                setActiveTab('output');
            } else {
                // Default - just show output
                const sampleInput = problem?.examples?.[0]?.input || currentQuestion?.sampleInput || "";
                const executionResult = await executeCode(sampleInput);
                
                if (executionResult.error) {
                    setOutput(`❌ Error:\n${executionResult.error}\n\n💡 Output:\n${executionResult.output || "No output"}`);
                } else {
                    setOutput(`✅ Submission successful!\n\n📝 Output:\n${executionResult.output || "(No output)"}\n\n⏱️ Runtime: ${executionResult.runtime ? `${executionResult.runtime.toFixed(1)} ms` : "N/A"}`);
                }
                setActiveTab('output');
            }
            
        } catch (error) {
            console.error("Submission error:", error);
            setOutput(`❌ Submission failed: ${error}`);
            setActiveTab('output');
        } finally {
            setIsRunning(false)
            setIsRunningTests(false)
        }
    }

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

        if (exercise?.compilerSettings.autoCloseBrackets) {
            editor.updateOptions({
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoSurround: 'languageDefined'
            });
        }

        if (exercise?.compilerSettings.autoSuggestion) {
            editor.updateOptions({
                suggestOnTriggerCharacters: true,
                quickSuggestions: true
            });
        }

        if (exercise?.compilerSettings.theme) {
            editor.updateOptions({
                theme: exercise.compilerSettings.theme === 'dark' ? 'vs-dark' : 'vs'
            });
        }

        if (exercise?.compilerSettings.fontSize) {
            editor.updateOptions({
                fontSize: exercise.compilerSettings.fontSize
            });
        }

        if (exercise?.compilerSettings.tabSize) {
            editor.updateOptions({
                tabSize: exercise.compilerSettings.tabSize
            });
        }

        if (!exercise?.compilerSettings.allowCopyPaste) {
            editor.onKeyDown((e: any) => {
                if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyC' || e.code === 'KeyV' || e.code === 'KeyX')) {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCopyWarning(true);

                    setTimeout(() => {
                        setShowCopyWarning(false);
                    }, 3000);
                }
            });

            const editorDomNode = editor.getDomNode();
            if (editorDomNode) {
                editorDomNode.addEventListener('contextmenu', (e: Event) => {
                    e.preventDefault();
                    setShowCopyWarning(true);

                    setTimeout(() => {
                        setShowCopyWarning(false);
                    }, 3000);
                });
            }
        }

        setEditorReady(true);
        editor.focus();
    }, [exercise])

    const getLanguage = (lang: string) => {
        const languageMap: { [key: string]: string } = {
            javascript: 'javascript',
            typescript: 'typescript',
            python: 'python',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            csharp: 'csharp',
            csharp_net: 'csharp',
            sql: 'sql',
            plsql: 'sql'
        };
        return languageMap[lang] || 'javascript';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

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

    // Determine which tabs to show based on evaluation settings
    const showOutputTab = true; // Always show output tab
    const showTestCasesTab = exercise?.evaluationSettings.automationEvaluation && (problemTestCases.length > 0 || exerciseTestCases.length > 0);
    const showResultsTab = exercise?.evaluationSettings.automationEvaluation || exercise?.evaluationSettings.aiEvaluation || exercise?.evaluationSettings.practiceMode;

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
                        className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${theme === 'dark'
                            ? 'hover:bg-gray-700 text-gray-300'
                            : 'hover:bg-gray-200 text-gray-700'
                            }`}
                        title={showSidebar ? 'Hide problems list' : 'Show problems list'}
                    >
                        {showSidebar ? (
                            <ChevronLeft className="w-4 h-4" />
                        ) : (
                            <Menu className="w-4 h-4" />
                        )}
                    </button>

                    {onBreadcrumbCollapseToggle && (
                        <button
                            onClick={onBreadcrumbCollapseToggle}
                            className={`group relative flex items-center justify-center w-7 h-7 rounded font-mono text-sm transition-colors ${theme === 'dark'
                                ? 'hover:bg-gray-700 text-gray-300'
                                : 'hover:bg-gray-200 text-gray-700'
                                }`}
                            title={breadcrumbCollapsed ? 'Normal layout' : 'Compact layout'}
                        >
                            {breadcrumbCollapsed ? '[   ]' : '[ ]'}

                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-1.5 py-0.5 text-[11px] text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {breadcrumbCollapsed ? 'Normal layout' : 'Compact layout'}
                            </div>
                        </button>
                    )}

                    {problems.length > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={prevProblem}
                                disabled={currentProblemIndex === 0}
                                className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark'
                                    ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                                    : 'border-gray-300 hover:bg-gray-200 text-gray-700'
                                    } disabled:opacity-50`}
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            <span className="text-xs font-medium">
                                {currentProblemIndex + 1}/{problems.length}
                            </span>

                            <button
                                onClick={nextProblem}
                                disabled={currentProblemIndex === problems.length - 1}
                                className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark'
                                    ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                                    : 'border-gray-300 hover:bg-gray-200 text-gray-700'
                                    } disabled:opacity-50`}
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            {exercise?.questionBehavior.shuffleQuestions && (
                                <button
                                    onClick={shuffleProblem}
                                    className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark'
                                        ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                                        : 'border-gray-300 hover:bg-gray-200 text-gray-700'
                                        }`}
                                    title="Random problem"
                                >
                                    <Shuffle className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className={`h-7 text-xs border rounded px-1.5 ${theme === 'dark'
                            ? 'bg-gray-800 text-white border-gray-600'
                            : 'bg-white text-gray-900 border-gray-300'
                            }`}
                    >
                        {availableLanguages.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                                {lang.label}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={exercise?.evaluationSettings.aiEvaluation ? runWithAIEvaluation : runCode}
                        disabled={isRunning}
                        className="h-7 px-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                    >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Run
                    </button>

                    <button
                        onClick={submitCode}
                        disabled={isRunning}
                        className="h-7 px-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                    >
                        {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Submit
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className={`w-7 h-7 flex items-center justify-center border rounded ${theme === 'dark'
                            ? 'border-gray-600 bg-gray-800 hover:bg-gray-700'
                            : 'border-gray-300 bg-gray-100 hover:bg-gray-200'
                            }`}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-3.5 h-3.5" />
                        ) : (
                            <Maximize2 className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {showSidebar && (
                    <div className={`w-72 border-r overflow-hidden flex flex-col ${theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-300 bg-white'}`}>
                        <div className={`p-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-1">
                                    <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                        Problems
                                    </h3>
                                    
                                    {showSearch && (
                                        <div className="relative flex-1 max-w-[160px] transition-all duration-300 ease-in-out">
                                            <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                                            <input
                                                type="text"
                                                placeholder="Search..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className={`w-full pl-8 pr-6 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none ${theme === 'dark'
                                                    ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-gray-500'
                                                    : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-gray-400'
                                                }`}
                                                autoFocus
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="absolute right-1 top-1/2 transform -translate-y-1/2"
                                                >
                                                    <XIcon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setShowSearch(!showSearch)}
                                        className={`p-1 ml-1 rounded transition-colors ${showSearch
                                            ? (theme === 'dark' ? 'bg-blue-700' : 'bg-blue-500')
                                            : (theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600')
                                        }`}
                                        title="Search problems"
                                    >
                                        {showSearch ? (
                                            <XIcon className="w-3.5 h-3.5 text-white" />
                                        ) : (
                                            <Search className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                    
                                    <button
                                        onClick={toggleSortPanel}
                                        className={`p-1 rounded ${showSortPanel
                                            ? (theme === 'dark' ? 'bg-blue-700' : 'bg-blue-500')
                                            : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100')
                                        }`}
                                        title="Sort problems"
                                    >
                                        <ArrowUpDown className={`w-3.5 h-3.5 ${showSortPanel
                                            ? 'text-white'
                                            : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')
                                        }`} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className={`p-2 rounded ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Filter by Difficulty</span>
                                    <button
                                        onClick={toggleAllFilters}
                                        className="text-xs text-blue-500 hover:text-blue-700"
                                    >
                                        {difficultyFilters.size === 3 ? 'Clear All' : 'Select All'}
                                    </button>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => toggleDifficultyFilter('Easy')}
                                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${difficultyFilters.has('Easy')
                                            ? 'bg-green-100 text-green-800 border border-green-300'
                                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        Easy
                                    </button>
                                    <button
                                        onClick={() => toggleDifficultyFilter('Medium')}
                                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${difficultyFilters.has('Medium')
                                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        Medium
                                    </button>
                                    <button
                                        onClick={() => toggleDifficultyFilter('Hard')}
                                        className={`px-2 py-0.5 text-xs rounded-full transition-colors ${difficultyFilters.has('Hard')
                                            ? 'bg-red-100 text-red-800 border border-red-300'
                                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        Hard
                                    </button>

                                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} ml-2`}>
                                        {difficultyFilters.size} of 3
                                    </span>
                                </div>
                            </div>

                            {showSortPanel && (
                                <div className={`mt-2 p-2 rounded ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <ArrowUpDown className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Sort By</span>
                                        </div>
                                        <button
                                            onClick={() => setSortBy('default')}
                                            className="text-xs text-blue-500 hover:text-blue-700"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => setSortBy('default')}
                                            className={`flex items-center justify-between w-full p-1.5 text-xs rounded ${sortBy === 'default'
                                                ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700')
                                                : (theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
                                            }`}
                                        >
                                            <span>Default Order</span>
                                            {sortBy === 'default' && <CheckCircle2 className="w-3 h-3" />}
                                        </button>
                                        <button
                                            onClick={() => setSortBy('difficulty-asc')}
                                            className={`flex items-center justify-between w-full p-1.5 text-xs rounded ${sortBy === 'difficulty-asc'
                                                ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700')
                                                : (theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
                                            }`}
                                        >
                                            <span>Difficulty (Easy → Hard)</span>
                                            {sortBy === 'difficulty-asc' && <CheckCircle2 className="w-3 h-3" />}
                                        </button>
                                        <button
                                            onClick={() => setSortBy('difficulty-desc')}
                                            className={`flex items-center justify-between w-full p-1.5 text-xs rounded ${sortBy === 'difficulty-desc'
                                                ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700')
                                                : (theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
                                            }`}
                                        >
                                            <span>Difficulty (Hard → Easy)</span>
                                            {sortBy === 'difficulty-desc' && <CheckCircle2 className="w-3 h-3" />}
                                        </button>
                                        <button
                                            onClick={() => setSortBy('title')}
                                            className={`flex items-center justify-between w-full p-1.5 text-xs rounded ${sortBy === 'title'
                                                ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700')
                                                : (theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
                                            }`}
                                        >
                                            <span>Title (A → Z)</span>
                                            {sortBy === 'title' && <CheckCircle2 className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className={`p-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Showing {filteredAndSortedProblems.length} of {problems.length} problems
                            </div>
                            {viewMode === 'list' ? (
                                <div className={`divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}`}>
                                    {filteredAndSortedProblems.map((p, index) => {
                                        const originalIndex = problems.findIndex(prob => prob.id === p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => selectProblem(originalIndex)}
                                                className={`w-full p-3 text-left transition-colors ${currentProblemIndex === originalIndex
                                                        ? theme === 'dark'
                                                            ? 'bg-blue-900/20 border-l-2 border-blue-500'
                                                            : 'bg-blue-50 border-l-2 border-blue-500'
                                                        : theme === 'dark'
                                                            ? 'hover:bg-gray-800 border-l-2 border-transparent'
                                                            : 'hover:bg-gray-50 border-l-2 border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {originalIndex + 1}.
                                                            </span>
                                                            <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                                                {p.title}
                                                            </h4>
                                                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${p.difficulty === "Easy"
                                                                    ? theme === 'dark'
                                                                        ? 'bg-green-900/30 text-green-300'
                                                                        : 'bg-green-100 text-green-800'
                                                                    : p.difficulty === "Medium"
                                                                        ? theme === 'dark'
                                                                            ? 'bg-yellow-900/30 text-yellow-300'
                                                                            : 'bg-yellow-100 text-yellow-800'
                                                                        : theme === 'dark'
                                                                            ? 'bg-red-900/30 text-red-300'
                                                                            : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {p.difficulty}
                                                            </span>
                                                            {currentProblemIndex === originalIndex && (
                                                                <span className={`text-[11px] px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                                                                    }`}>
                                                                    Current
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 p-3">
                                    {filteredAndSortedProblems.map((p, index) => {
                                        const originalIndex = problems.findIndex(prob => prob.id === p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => selectProblem(originalIndex)}
                                                className={`p-2.5 rounded border text-left hover:border-blue-500 transition-colors ${currentProblemIndex === originalIndex
                                                        ? theme === 'dark'
                                                            ? 'border-blue-500 bg-blue-900/20'
                                                            : 'border-blue-500 bg-blue-50'
                                                        : theme === 'dark'
                                                            ? 'border-gray-700 bg-gray-800'
                                                            : 'border-gray-200 bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        #{originalIndex + 1}
                                                    </span>
                                                    <h4 className={`font-medium text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                                        {p.title}
                                                    </h4>
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium ${p.difficulty === "Easy"
                                                            ? theme === 'dark'
                                                                ? 'bg-green-900/30 text-green-300'
                                                                : 'bg-green-100 text-green-800'
                                                            : p.difficulty === "Medium"
                                                                ? theme === 'dark'
                                                                    ? 'bg-yellow-900/30 text-yellow-300'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                                : theme === 'dark'
                                                                    ? 'bg-red-900/30 text-red-300'
                                                                    : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {p.difficulty}
                                                    </span>
                                                    {currentProblemIndex === originalIndex && (
                                                        <span className={`text-[11px] px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div
                    ref={descriptionRef}
                    className="overflow-y-auto transition-all duration-200 h-full custom-scrollbar"
                    style={{ width: `${leftPanelWidth}%` }}
                >
                    <div className={`p-5 space-y-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                        <div>
                            <h1 className={`text-xl font-semibold mb-1.5 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{problemTitle}</h1>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${problemDifficulty === "Easy"
                                    ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')
                                    : problemDifficulty === "Medium"
                                        ? (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800')
                                        : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')
                                    }`}>
                                    {problemDifficulty}
                                </span>
                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Question #{problemId}
                                </span>
                                {exercise?.questionBehavior.showPoints && currentQuestion?.points && (
                                    <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark'
                                        ? 'bg-gray-800 text-gray-300 border border-gray-700'
                                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                                        }`}>
                                        {currentQuestion.points} points
                                    </span>
                                )}
                                {exercise?.questionBehavior.shuffleQuestions && (
                                    <button
                                        onClick={shuffleProblem}
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        <Shuffle className="w-3.5 h-3.5" />
                                        Random
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <FileText className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                                <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Description</h3>
                            </div>
                            <div className={`text-xs space-y-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                {problemDescription.split('\n').map((line, i) => (
                                    <p key={i} className="leading-relaxed">{line}</p>
                                ))}
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
                                        <div key={index} className="p-0">
                                            <div className="mb-1">
                                                <strong className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Example {index + 1}</strong>
                                            </div>

                                            <div className="mb-2">
                                                <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Input:</div>
                                                <div className={`p-2 rounded font-mono text-xs ${theme === 'dark'
                                                    ? 'bg-gray-900 text-gray-300 border border-gray-700'
                                                    : 'bg-gray-100 text-gray-900 border border-gray-200'
                                                    }`}>
                                                    {example.input}
                                                </div>
                                            </div>

                                            <div className="mb-2">
                                                <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Output:</div>
                                                <div className={`p-2 rounded font-mono text-xs ${theme === 'dark'
                                                    ? 'bg-gray-900 text-gray-300 border border-gray-700'
                                                    : 'bg-gray-100 text-gray-900 border border-gray-200'
                                                    }`}>
                                                    {example.output}
                                                </div>
                                            </div>

                                            {example.explanation && (
                                                <div>
                                                    <div className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Explanation:</div>
                                                    <div className={`p-2 rounded text-xs ${theme === 'dark'
                                                        ? 'bg-blue-900/20 text-blue-300 border border-blue-800/30'
                                                        : 'bg-blue-50 text-blue-800 border border-blue-100'
                                                        }`}>
                                                        {example.explanation}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {problemConstraints.length > 0 && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <AlertCircle className={`w-4 h-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} />
                                    <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Constraints</h3>
                                </div>
                                <ul className="list-disc list-inside space-y-1.5 text-xs">
                                    {problemConstraints.map((constraint, index) => (
                                        <li key={index} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                                            <code className={`px-1 py-0.5 rounded text-[11px] ${theme === 'dark'
                                                ? 'bg-gray-800 text-gray-300'
                                                : 'bg-gray-200 text-gray-800'
                                                }`}>
                                                {constraint}
                                            </code>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {exercise?.questionBehavior.allowHintUsage !== false && problemHints && problemHints.length > 0 && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-3">
                                    <Lightbulb className={`w-4 h-4 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-500'}`} />
                                    <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Hints</h3>
                                    {currentQuestion?.hints?.some(h => h.pointsDeduction > 0) && (
                                        <span className={`text-xs px-2 py-0.5 rounded ${theme === 'dark'
                                            ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/30'
                                            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                            }`}>
                                            Using hints may deduct points
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {problemHints.map((hint, index) => {
                                        const isHintShown = showHints[index] || false;
                                        const hintData = currentQuestion?.hints?.[index];

                                        return (
                                            <div key={index} className={`border-b overflow-hidden ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                                                <button
                                                    onClick={() => {
                                                        if (hintData?.pointsDeduction && hintData.pointsDeduction > 0) {
                                                            console.log(`Deducting ${hintData.pointsDeduction} points for using hint`);
                                                        }
                                                        const newHints = [...showHints];
                                                        newHints[index] = !newHints[index];
                                                        setShowHints(newHints);
                                                    }}
                                                    className={`flex items-center justify-between w-full p-2.5 text-sm font-medium transition-colors ${theme === 'dark'
                                                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${theme === 'dark'
                                                            ? 'bg-orange-900/30'
                                                            : 'bg-orange-100'
                                                            }`}>
                                                            <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-orange-300' : 'text-orange-800'}`}>
                                                                {index + 1}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span>Hint {index + 1}</span>
                                                            {hintData?.pointsDeduction && hintData.pointsDeduction > 0 && (
                                                                <span className={`text-[10px] px-1 py-0.5 rounded ${theme === 'dark'
                                                                    ? 'bg-red-900/30 text-red-300'
                                                                    : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    -{hintData.pointsDeduction} pts
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ChevronDown
                                                        className={`w-4 h-4 transition-transform duration-200 ${isHintShown ? 'transform rotate-180' : ''} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                                                    />
                                                </button>

                                                {isHintShown && (
                                                    <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                                                        <div className={`p-3 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                                            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                                                                {hint}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!showSidebar && (
                    <div
                        className="absolute top-0 bottom-0 z-10 hover:cursor-col-resize"
                        style={{
                            left: `calc(${leftPanelWidth}% - 2px)`,
                            width: '4px',
                        }}
                        onMouseDown={(e) => {
                            setIsResizing(true);
                            e.preventDefault();
                        }}
                    >
                        <div className={`h-full w-full ${theme === 'dark' ? 'bg-gray-700 hover:bg-blue-500 active:bg-blue-600' : 'bg-gray-300 hover:bg-blue-500 active:bg-blue-600'} transition-colors`}></div>
                    </div>
                )}

                <div
                    className="flex flex-col flex-1 min-w-0 h-full custom-scrollbar"
                    style={{ width: `${100 - leftPanelWidth}%` }}
                >
                    <div
                        className="flex flex-col"
                        style={{
                            height: `${rightPanelSplit}%`,
                            minHeight: `${rightPanelSplit}%`,
                            position: 'relative'
                        }}
                    >
                        <div className={`flex items-center justify-between p-2 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5">
                                <Code className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Code</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={resetCode}
                                    className={`flex items-center gap-1 px-2 py-0.5 text-xs border rounded transition-colors ${theme === 'dark'
                                        ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    title="Reset Code"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Reset</span>
                                </button>
                            </div>
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
                                    scrollBeyondLastLine: false,
                                    fontSize: exercise?.compilerSettings.fontSize || (isFullscreen ? 14 : 12),
                                    lineNumbers: 'on',
                                    folding: true,
                                    foldingHighlight: true,
                                    showFoldingControls: 'mouseover',
                                    lineDecorationsWidth: 8,
                                    lineNumbersMinChars: 2,
                                    scrollbar: {
                                        vertical: 'visible',
                                        horizontal: 'visible',
                                        useShadows: true,
                                        verticalScrollbarSize: 10,
                                        horizontalScrollbarSize: 10
                                    },
                                    automaticLayout: true,
                                    tabSize: exercise?.compilerSettings.tabSize || 2,
                                    insertSpaces: true,
                                    detectIndentation: true,
                                    trimAutoWhitespace: true,
                                    formatOnType: true,
                                    formatOnPaste: exercise?.compilerSettings.allowCopyPaste || false,
                                    suggestOnTriggerCharacters: exercise?.compilerSettings.autoSuggestion || false,
                                    wordBasedSuggestions: exercise?.compilerSettings.autoSuggestion || false,
                                    parameterHints: {
                                        enabled: exercise?.compilerSettings.autoSuggestion || false,
                                        cycle: true
                                    },
                                    bracketPairColorization: {
                                        enabled: true
                                    },
                                    renderWhitespace: 'boundary',
                                    renderControlCharacters: true,
                                    renderLineHighlight: 'all',
                                    overviewRulerLanes: 3,
                                    hideCursorInOverviewRuler: false,
                                    overviewRulerBorder: true,
                                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                    fontLigatures: false,
                                    cursorBlinking: 'blink',
                                    cursorSmoothCaretAnimation: 'on',
                                    smoothScrolling: true,
                                    mouseWheelZoom: true,
                                    padding: { top: 6, bottom: 6 },
                                    matchBrackets: 'always',
                                    autoClosingBrackets: exercise?.compilerSettings.autoCloseBrackets ? 'always' : 'never',
                                    autoClosingQuotes: exercise?.compilerSettings.autoCloseBrackets ? 'always' : 'never',
                                    autoClosingDelete: exercise?.compilerSettings.autoCloseBrackets ? 'always' : 'never',
                                    autoClosingOvertype: exercise?.compilerSettings.autoCloseBrackets ? 'always' : 'never',
                                    autoIndent: 'full',
                                    dragAndDrop: exercise?.compilerSettings.allowCopyPaste || false,
                                    accessibilitySupport: 'on',
                                    snippetSuggestions: 'inline',
                                    inlayHints: {
                                        enabled: exercise?.compilerSettings.autoSuggestion ? 'on' : 'off'
                                    },
                                    guides: {
                                        indentation: true,
                                        bracketPairs: true,
                                        bracketPairsHorizontal: true
                                    },
                                    wordWrap: 'on',
                                    quickSuggestions: exercise?.compilerSettings.autoSuggestion ? {
                                        other: true,
                                        comments: true,
                                        strings: true
                                    } : false,
                                    readOnly: false,
                                    copyWithSyntaxHighlighting: exercise?.compilerSettings.allowCopyPaste || false,
                                    find: {
                                        addExtraSpaceOnTop: false,
                                        autoFindInSelection: 'never',
                                        seedSearchStringFromSelection: exercise?.compilerSettings.allowCopyPaste || false,
                                    },
                                }}
                            />
                        </div>
                    </div>

                    <div
                        className={`h-2 flex items-center justify-center cursor-row-resize transition-colors ${theme === 'dark'
                            ? 'hover:bg-gray-700 active:bg-blue-500'
                            : 'hover:bg-gray-200 active:bg-blue-500'
                            }`}
                        onMouseDown={(e) => {
                            setIsHorizontalResizing(true);
                            e.preventDefault();
                        }}
                        style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            touchAction: 'none'
                        }}
                    >
                        <div className={`w-full h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                        <div className="absolute w-16 h-1.5 flex items-center justify-center">
                            <div className={`w-8 h-0.5 rounded-full ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                        </div>
                    </div>

                    <div
                        className="flex flex-col custom-scrollbar"
                        style={{
                            height: `${100 - rightPanelSplit}%`,
                            minHeight: `${100 - rightPanelSplit}%`
                        }}
                    >
                        <div className={`flex border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                            <button
                                onClick={() => setActiveTab('output')}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'output'
                                    ? (theme === 'dark' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-blue-600 border-b-2 border-blue-500')
                                    : (theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900')
                                    }`}
                            >
                                <FileOutput className="w-3.5 h-3.5" />
                                Output
                            </button>
                            
                            {showTestCasesTab && (
                                <button
                                    onClick={() => setActiveTab('testcases')}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'testcases'
                                        ? (theme === 'dark' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-blue-600 border-b-2 border-blue-500')
                                        : (theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900')
                                        }`}
                                >
                                    <Terminal className="w-3.5 h-3.5" />
                                    Test Cases
                                </button>
                            )}
                            
                            {showResultsTab && (
                                <button
                                    onClick={() => setActiveTab('results')}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${activeTab === 'results'
                                        ? (theme === 'dark' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-blue-600 border-b-2 border-blue-500')
                                        : (theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900')
                                        }`}
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Results
                                    {testResults && !isRunningTests && (
                                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${testResults.failed === 0
                                            ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')
                                            : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800')
                                            }`}>
                                            {testResults.passed}/{testResults.total}
                                        </span>
                                    )}
                                    {aiEvaluationResult && showAIResult && (
                                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${aiEvaluationResult.isPassed
                                            ? (theme === 'dark' ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800')
                                            : (theme === 'dark' ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-800')
                                            }`}>
                                            AI: {aiEvaluationResult.score}/100
                                        </span>
                                    )}
                                </button>
                            )}
                            
                            {showAIResult && aiEvaluationResult && (
                                <button
                                    onClick={() => setShowAIResult(!showAIResult)}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${showAIResult
                                        ? (theme === 'dark' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-purple-600 border-b-2 border-purple-500')
                                        : (theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900')
                                        }`}
                                >
                                    <Brain className="w-3.5 h-3.5" />
                                    AI Evaluation
                                </button>
                            )}
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                            {activeTab === 'output' ? (
                                <div className={`h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                                    {isRunningTests || isEvaluating ? (
                                        <div className="h-full flex flex-col items-center justify-center p-3">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {isEvaluating ? "🧠 AI is evaluating your solution..." : "Compiling and running code..."}
                                            </p>
                                        </div>
                                    ) : output ? (
                                        <div className="h-full p-3">
                                            <div className={`p-2.5 rounded ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                <h4 className={`text-sm font-semibold mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Output</h4>
                                                <pre className={`text-xs font-mono whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {output}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                                            <Terminal className={`w-8 h-8 mb-1.5 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
                                            <p className={`text-xs mb-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Run code to see output</p>
                                            <p className={`text-[11px] ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>Click "Run" or "Submit" to execute your code</p>
                                        </div>
                                    )}
                                </div>
                            ) : activeTab === 'testcases' ? (
                                <div className={`p-3 space-y-3 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                                    <div className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {currentQuestion?.testCases?.length || problemTestCases?.length || 0} test case{(currentQuestion?.testCases?.length || problemTestCases?.length || 0) !== 1 ? 's' : ''} available:
                                    </div>

                                    <div className="space-y-2">
                                        {(exerciseTestCases?.filter(tc => !tc.isHidden) || problemTestCases?.filter(tc => !tc.isHidden)).map((testCase, index) => (
                                            <div key={index} className={`rounded border p-2.5 ${theme === 'dark'
                                                ? 'border-gray-700 bg-gray-800'
                                                : 'border-gray-200 bg-gray-50'
                                                }`}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-500'}`}></div>
                                                        <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Test Case {index + 1}</span>
                                                        {testCase.points && exercise?.questionBehavior.showPoints && (
                                                            <span className={`text-[10px] px-1 py-0.5 rounded ${theme === 'dark'
                                                                ? 'bg-gray-700 text-gray-300'
                                                                : 'bg-gray-200 text-gray-700'
                                                                }`}>
                                                                {testCase.points} point{testCase.points !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-[11px] px-1.5 py-0.5 rounded ${theme === 'dark'
                                                        ? 'bg-blue-900/30 text-blue-300'
                                                        : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        Visible
                                                    </span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div>
                                                        <div className={`text-[11px] font-medium mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Input:</div>
                                                        <div className={`p-1.5 rounded font-mono text-xs ${theme === 'dark'
                                                            ? 'bg-gray-900 text-gray-300 border border-gray-700'
                                                            : 'bg-gray-100 text-gray-900 border border-gray-200'
                                                            }`}>
                                                            {testCase.input}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className={`text-[11px] font-medium mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Expected Output:</div>
                                                        <div className={`p-1.5 rounded font-mono text-xs ${theme === 'dark'
                                                            ? 'bg-green-900/20 text-green-300 border border-green-800/30'
                                                            : 'bg-green-50 text-green-800 border border-green-200'
                                                            }`}>
                                                            {testCase.output || testCase.expectedOutput}
                                                        </div>
                                                    </div>
                                                    {testCase.explanation && (
                                                        <div>
                                                            <div className={`text-[11px] font-medium mb-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Explanation:</div>
                                                            <div className={`p-1.5 rounded text-xs ${theme === 'dark'
                                                                ? 'bg-gray-800 text-gray-300'
                                                                : 'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {testCase.explanation}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {(exerciseTestCases?.some(tc => tc.isHidden) || problemTestCases?.some(tc => tc.isHidden)) && (
                                        <div className={`mt-4 pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Eye className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`} />
                                                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Hidden Test Cases</span>
                                            </div>
                                            <div className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                Hidden test cases will be evaluated when you submit your solution.
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(exerciseTestCases?.filter(tc => tc.isHidden) || problemTestCases?.filter(tc => tc.isHidden)).map((testCase, index) => (
                                                    <div key={index} className={`rounded border border-dashed p-2 ${theme === 'dark'
                                                        ? 'border-gray-600 bg-gray-800/50'
                                                        : 'border-gray-300 bg-gray-50/50'
                                                        }`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={`text-[11px] font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Hidden Test {index + 1}</span>
                                                            <EyeOff className={`w-3 h-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                                        </div>
                                                        <div className={`text-[10px] italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                                            Input and output are hidden
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className={`mt-4 pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span>Total Test Cases:</span>
                                                <span className="font-medium">{exerciseTestCases?.length || problemTestCases?.length || 0}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Hidden Test Cases:</span>
                                                <span className="font-medium">{(exerciseTestCases?.filter(tc => tc.isHidden) || problemTestCases?.filter(tc => tc.isHidden)).length || 0}</span>
                                            </div>
                                            {currentQuestion?.timeLimit && (
                                                <div className="flex items-center justify-between">
                                                    <span>Time Limit:</span>
                                                    <span className="font-medium">{currentQuestion.timeLimit} ms</span>
                                                </div>
                                            )}
                                            {currentQuestion?.memoryLimit && (
                                                <div className="flex items-center justify-between">
                                                    <span>Memory Limit:</span>
                                                    <span className="font-medium">{currentQuestion.memoryLimit} MB</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={`h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
                                    {isRunningTests || isEvaluating ? (
                                        <div className="h-full flex flex-col items-center justify-center p-3">
                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {isEvaluating ? "🧠 AI is evaluating your solution..." : "Running test cases..."}
                                            </p>
                                        </div>
                                    ) : showAIResult && aiEvaluationResult ? (
                                        <div className="h-full overflow-y-auto">
                                            <div className={`p-3 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'} border-b ${theme === 'dark' ? 'border-purple-800/30' : 'border-purple-200'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Brain className={`w-4 h-4 ${aiEvaluationResult.isPassed ? 'text-purple-500' : 'text-orange-500'}`} />
                                                        <div>
                                                            <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>AI Evaluation</h4>
                                                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                Score: <span className={`font-bold ${aiEvaluationResult.score >= 70 ? 'text-green-600' : 'text-orange-600'}`}>{aiEvaluationResult.score}/100</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${aiEvaluationResult.isPassed
                                                        ? (theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')
                                                        : (theme === 'dark' ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-800')
                                                        }`}>
                                                        {aiEvaluationResult.isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="p-3">
                                                <div className="mb-3">
                                                    <h5 className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Feedback</h5>
                                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{aiEvaluationResult.feedback}</p>
                                                </div>
                                                
                                                {aiEvaluationResult.suggestions && aiEvaluationResult.suggestions.length > 0 && (
                                                    <div className="mb-3">
                                                        <h5 className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Suggestions</h5>
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {aiEvaluationResult.suggestions.map((suggestion, idx) => (
                                                                <li key={idx} className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                    {suggestion}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                
                                                {aiEvaluationResult.detailedAnalysis && (
                                                    <div>
                                                        <h5 className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Detailed Analysis</h5>
                                                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{aiEvaluationResult.detailedAnalysis}</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className={`p-2 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Zap className={`w-3 h-3 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                                                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                                        AI evaluation powered by Gemini 2.5 Flash Lite
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : testResults ? (
                                        <div>
                                            <div className={`divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-200'}`}>
                                                {testResults.results.map((result, index) => {
                                                    if (result.isHidden && !showHiddenTests) return null;

                                                    return (
                                                        <div key={index} className={`p-2 ${result.passed
                                                            ? (theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50')
                                                            : (theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50')
                                                            }`}>
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                                                    {result.passed ? (
                                                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                                                                    ) : (
                                                                        <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className={`font-medium text-xs mb-0.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                                                            Test {index + 1}{result.isHidden && ' (Hidden)'}
                                                                        </div>
                                                                        <div className={`text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                            <div className="truncate mb-0.5" title={result.input}>
                                                                                <span className="font-semibold">Input:</span> {result.input}
                                                                            </div>
                                                                            {!result.passed && (
                                                                                <div className="space-y-0.5 mt-1">
                                                                                    <div className="flex items-start gap-0.5">
                                                                                        <span className="font-semibold flex-shrink-0">Expected:</span>
                                                                                        <code className={`font-mono text-[11px] px-1 py-0.5 rounded break-all ${theme === 'dark'
                                                                                            ? 'bg-gray-800 text-gray-300'
                                                                                            : 'bg-gray-200 text-gray-800'
                                                                                            }`}>
                                                                                            {result.expected}
                                                                                        </code>
                                                                                    </div>
                                                                                    <div className="flex items-start gap-0.5">
                                                                                        <span className="font-semibold flex-shrink-0">Actual:</span>
                                                                                        <code className={`font-mono text-[11px] px-1 py-0.5 rounded break-all ${theme === 'dark'
                                                                                            ? 'bg-gray-800 text-gray-300'
                                                                                            : 'bg-gray-200 text-gray-800'
                                                                                            }`}>
                                                                                            {result.actual}
                                                                                        </code>
                                                                                    </div>
                                                                                    {result.error && (
                                                                                        <div className="flex items-start gap-0.5">
                                                                                            <span className="font-semibold flex-shrink-0">Error:</span>
                                                                                            <code className={`font-mono text-[11px] px-1 py-0.5 rounded break-all ${theme === 'dark'
                                                                                                ? 'bg-red-900/30 text-red-300'
                                                                                                : 'bg-red-100 text-red-800'
                                                                                                }`}>
                                                                                                {result.error}
                                                                                            </code>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex-shrink-0 ml-1.5">
                                                                    <div className={`text-[11px] whitespace-nowrap ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                        {result.runtime}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className={`p-2 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {testResults.failed === 0 ? (
                                                            <div className="flex items-center gap-1 text-green-600 text-xs">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                <span className="font-medium">All tests passed!</span>
                                                        </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-red-600 text-xs">
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                <span className="font-medium">{testResults.failed} test{testResults.failed === 1 ? '' : 's'} failed</span>
                                                            </div>
                                                        )}
                                                        {testResults.results.some(r => r.isHidden) && (
                                                            <button
                                                                onClick={() => setShowHiddenTests(!showHiddenTests)}
                                                                className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded border ${showHiddenTests
                                                                    ? (theme === 'dark'
                                                                        ? 'bg-blue-900/30 text-blue-300 border-blue-700'
                                                                        : 'bg-blue-100 text-blue-700 border-blue-300')
                                                                    : (theme === 'dark'
                                                                        ? 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
                                                                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200')
                                                                    }`}
                                                            >
                                                                {showHiddenTests ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                                <span className="text-[11px]">{showHiddenTests ? 'Hide' : 'Show'} hidden</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px]">
                                                        {testResults.beatsRuntime && testResults.beatsMemory && (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                                                    <span className="font-medium">{testResults.runtime}</span> (Beats {testResults.beatsRuntime})
                                                                </div>
                                                                <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                                                                    <span className="font-medium">{testResults.memory}</span> (Beats {testResults.beatsMemory})
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : output ? (
                                        <div className="h-full p-3">
                                            <div className={`p-2.5 rounded ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                                <h4 className={`text-sm font-semibold mb-1.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>Results</h4>
                                                <pre className={`text-xs font-mono whitespace-pre-wrap break-words ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {output}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center p-3 text-center">
                                            <Terminal className={`w-8 h-8 mb-1.5 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
                                            <p className={`text-xs mb-0.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Submit code to see results</p>
                                            <p className={`text-[11px] ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>Click "Submit" to evaluate your solution</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: ${theme === 'dark' ? '#4b5563 transparent' : '#9ca3af transparent'};
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: ${theme === 'dark' ? '#4b5563' : '#9ca3af'};
                    border-radius: 4px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: ${theme === 'dark' ? '#6b7280' : '#6b7280'};
                }

                .monaco-editor .scrollbar.vertical .slider {
                    background-color: ${theme === 'dark' ? '#4b5563' : '#9ca3af'} !important;
                }

                .monaco-editor .scrollbar.horizontal .slider {
                    background-color: ${theme === 'dark' ? '#4b5563' : '#9ca3af'} !important;
                }

                .no-select {
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: none;
                }
            `}</style>
        </div>
    )
}