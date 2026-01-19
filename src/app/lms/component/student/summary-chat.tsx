"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
    X, Sparkles, Send, Bot, BookOpen, Copy, Check, Loader2, Minimize2, Maximize2, File, FileText, ChevronRight, ChevronDown,
    Download,
    Bookmark,
    Share2,
    RefreshCw,
    CheckCircle,
    MousePointer,
    Layers,
    ChevronUp,

    Upload
} from "lucide-react"
import { createNote } from "@/apiServices/notesPanelService"; // Adjust path as needed
import SummaryTutorial from './SummaryTutorial' // Adjust path as needed
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'

interface SummaryChatProps {
    isOpen: boolean
    onClose: () => void
    context: {
        topicTitle?: string
        fileName?: string
        fileType?: string
        isDocumentView?: boolean
        hierarchy?: string[]
        // Add these new properties
        pdfUrl?: string
        isPDF?: boolean
    }
}

interface Message {
    id: string
    content: string
    role: "user" | "assistant"
    timestamp: Date
    isStreaming?: boolean
}

// Add this interface at the top with other interfaces
interface MessageActionsProps {
    message: Message;
    onCopy: () => void;
    onDownload: () => void;
    onSaveToNotes: () => void;
    onRegenerate: () => void;
    onShare: () => void;
    onLike: () => void;
    isLiked: boolean;
    isCopied: boolean;
    position: 'top' | 'bottom';
}
// Add these types at the top (after interface definitions)
interface CourseItem {
    _id: string;
    title: string;
    subModules?: CourseItem[];
    topics?: CourseItem[];
    subTopics?: CourseItem[];
    children?: CourseItem[];
    type?: string;
}

interface NavigationStep {
    level: number;
    items: CourseItem[];
    selectedId?: string;
    label: string;
}


type SummaryLevel = "module" | "submodule" | "topic" | "subtopic" | "auto"

// Gemini API configuration
const GEMINI_API_KEY = "AIzaSyDZ9horfrJ0KvOkx_aHhTpIIvqjBoSPpJg"
// Change this from the regular generateContent to streamGenerateContent
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`
// Helper function to identify welcome/instruction messages
const isWelcomeMessage = (content: string): boolean => {
    const welcomePatterns = [
        "I'm ready to help you summarize",
        "Please select what you'd like me to summarize",
        "I can help you summarize",
        "Click the button below to generate",
        "select what you'd like to summarize",
        "AI is ready to generate summaries",
        "Select a course item first"
    ];

    return welcomePatterns.some(pattern =>
        content.toLowerCase().includes(pattern.toLowerCase())
    );
};


export default function SummaryChat({ isOpen, onClose, context }: SummaryChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showHierarchySelector, setShowHierarchySelector] = useState(true)
    const [selectedHierarchyLevel, setSelectedHierarchyLevel] = useState<string | null>(null)
    const [copiedSummary, setCopiedSummary] = useState(false)
    const [showCopyModal, setShowCopyModal] = useState(false)
    const [summaryToCopy, setSummaryToCopy] = useState("")
    const [copyTitle, setCopyTitle] = useState("")
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [selectedModuleItem, setSelectedModuleItem] = useState<string | null>(null);
    const [modalMessages, setModalMessages] = useState<Message[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [courseData, setCourseData] = useState<any>(null);
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [expandedSubModules, setExpandedSubModules] = useState<Set<string>>(new Set());
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
    const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
    const [selectedItemPath, setSelectedItemPath] = useState<CourseItem[]>([]);
    const [selectableItems, setSelectableItems] = useState<CourseItem[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]); // ← THIS IS THE MISSING ONE
    const [showSelectionPopup, setShowSelectionPopup] = useState(false);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
    const [showSelectedItems, setShowSelectedItems] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [isMinimized, setIsisMinimized] = useState(false);
    const [hasDeclinedTopicSummary, setHasDeclinedTopicSummary] = useState(false);
    const [showUpArrow, setShowUpArrow] = useState(false);
    const [hasScrollableContent, setHasScrollableContent] = useState(false);

    // Add these new states:
    const [copiedMessageId, setCopiedMessageId] = useState(null); // Track which message was copied
    const [likedMessages, setLikedMessages] = useState(new Set()); // Track liked messages
    // Replace your existing scrollToBottom function with this enhanced version

    const modalMessagesEndRef = useRef<HTMLDivElement>(null);

    // Add these for main chat upload
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    // Add these states near your other modal states

    const [modalUploadedFile, setModalUploadedFile] = useState<File | null>(null);


    const [showTutorial, setShowTutorial] = useState(false)
    const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false)
    const [firstTimeOpen, setFirstTimeOpen] = useState(true)
    const [tutorialStep, setTutorialStep] = useState(0)

    // Add this near your other state declarations
    const [showTopicConfirmation, setShowTopicConfirmation] = useState(false);
    const [pendingTopicToSummarize, setPendingTopicToSummarize] = useState<{
        topic: string;
        hierarchy: string[];
        level: SummaryLevel;
    } | null>(null);


    // Add this state near other state declarations
    const [userTopicResponse, setUserTopicResponse] = useState<"yes" | "no" | null>(null);

    // Add this helper function at the top of your component
    const generateUniqueId = () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };
    // Auto-start tutorial on first open
    useEffect(() => {
        if (isOpen && !hasCompletedTutorial) {
            // Check localStorage for tutorial completion
            const tutorialCompleted = localStorage.getItem('summaryTutorialCompleted')
            if (!tutorialCompleted) {
                // Delay to ensure DOM is loaded
                setTimeout(() => {
                    setShowTutorial(true)
                }, 2000)
            }
        }
    }, [isOpen, hasCompletedTutorial])
    // Add tutorial completion handler
    // Add this to the useEffect that handles showModuleModal
    useEffect(() => {
        if (showModuleModal && courseData?.modules) {
            // Reset tutorial progress when modal opens
            setTutorialStep(0);

            // Start with module selection
            const moduleStep: NavigationStep = {
                level: 0,
                items: courseData.modules.map((m: any) => ({
                    ...m,
                    type: 'module'
                })),
                label: "Select Module"
            };
            setNavigationSteps([moduleStep]);
            setSelectedItemPath([]);
            setSelectedTopics([]);
            setShowSelectionPopup(false);
        }
    }, [showModuleModal, courseData]);

    // Update tutorial completion handler
    const handleTutorialComplete = () => {
        setShowTutorial(false)
        setHasCompletedTutorial(true)
        localStorage.setItem('summaryTutorialCompleted', 'true')

        try {
            const userPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}')
            userPrefs.summaryTutorialCompleted = true
            localStorage.setItem('userPreferences', JSON.stringify(userPrefs))
        } catch (error) {
            console.error('Error saving user preferences:', error)
        }
    }



    // Add this to the useEffect that handles showModuleModal
    useEffect(() => {
        if (showModuleModal && courseData?.modules) {
            // Reset tutorial progress when modal opens
            setTutorialStep(0);

            // Start with module selection
            const moduleStep: NavigationStep = {
                level: 0,
                items: courseData.modules.map((m: any) => ({
                    ...m,
                    type: 'module'
                })),
                label: "Select Module"
            };
            setNavigationSteps([moduleStep]);
            setSelectedItemPath([]);
            setSelectedTopics([]);
            setShowSelectionPopup(false);
        }
    }, [showModuleModal, courseData]);
    // Update MessageActions component for right-aligned layout
    // Update MessageActions component for top-right corner positioning
    // Update MessageActions component for proper Tailwind styling



    const MessageActions = ({
        message,
        onCopy,
        onDownload,
        onSaveToNotes,
        onRegenerate,
        onShare,
        onLike,
        isLiked,
        isCopied,
        position
    }: MessageActionsProps) => {
        return (
            <div className={`flex items-center gap-1 ${position === 'top'
                ? 'absolute -top-8 right-0'
                : 'mt-2 justify-end'}`}>

                {/* Copy Button */}
                <button
                    onClick={onCopy}
                    className={`p-1.5 rounded-full transition-colors ${isCopied
                        ? "text-green-600 hover:text-green-800 hover:bg-green-50"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                        }`}
                    title={isCopied ? "Copied!" : "Copy message"}
                >
                    {isCopied ? (
                        <Check className="w-3.5 h-3.5" />
                    ) : (
                        <Copy className="w-3.5 h-3.5" />
                    )}
                </button>

                {/* Download Button */}
                <button
                    onClick={onDownload}
                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    title="Download as text file"
                >
                    <Download className="w-3.5 h-3.5" />
                </button>

                {/* Save to Notes Button */}
                <button
                    onClick={onSaveToNotes}
                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    title="Save to notes"
                >
                    <Bookmark className="w-3.5 h-3.5" />
                </button>

                {/* Regenerate Button */}
                <button
                    onClick={onRegenerate}
                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    title="Regenerate response"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Share Button */}
                <button
                    onClick={onShare}
                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                    title="Share message"
                >
                    <Share2 className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    };
    const SummaryLoadingOverlay = ({
        isVisible,
        title = "Generating Summary",
        subtitle = "Processing content...",
        itemCount = 0
    }) => {
        if (!isVisible) return null;

        return (
            <div className="fixed inset-0 bg-white/90 z-[105] flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 border border-gray-200">
                    <div className="text-center">
                        <div className="relative inline-block mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
                                <div className="relative">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                        <Sparkles className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            </div>

                            {itemCount > 0 && (
                                <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-xs font-bold text-white">{itemCount}</span>
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>

                        <p className="text-gray-600 mb-6">
                            {subtitle}
                            {itemCount > 0 && ` (${itemCount} items)`}
                        </p>

                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-3/4"></div>
                        </div>

                        <div className="flex justify-center space-x-1">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                                    style={{ animationDelay: `${i * 0.2}s` }}
                                ></div>
                            ))}
                        </div>

                        <p className="text-sm text-gray-500 mt-6">
                            Please wait...
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    // Add this helper function
    const generateFileSummary = async (
        fileName: string,
        fileType: string,
        content: string,
        destination: 'modal' | 'main' = 'main',
        fileUrl?: string
    ) => {
        const isForMain = destination === 'main';

        try {
            const documentType = fileType === 'pdf' ? 'PDF' :
                fileType === 'ppt' ? 'PRESENTATION' :
                    fileType === 'video' ? 'VIDEO' :
                        fileType === 'text' ? 'TEXT' :
                            fileType === 'document' ? 'DOCUMENT' : 'FILE';

            // Create prompt
            const prompt = `As an expert educational AI assistant, create a comprehensive summary of the following ${documentType} file:

FILE: ${fileName}
CONTENT LENGTH: ${content.length} characters
FILE TYPE: ${fileType.toUpperCase()}

CONTENT TO SUMMARIZE:
${content.substring(0, 4000)}${content.length > 4000 ? '...' : ''}

Please provide a detailed, point-wise summary with:
• Main topics and key concepts covered
• Important definitions and terminology
• Practical applications and examples
• Key takeaways and learning points
• Study recommendations and best practices
${fileType === 'video' ? '• Timestamps for key sections (if available)\n• Important year/date/month references and chronological context' : ''}

Format with clear headings, bullet points, and proper spacing for easy reading.`;

            // Show generating message
            if (isForMain) {
                const generatingMessage: Message = {
                    id: generateUniqueId(),
                    content: `🤖 Generating AI summary for "${fileName}"...`,
                    role: "assistant",
                    timestamp: new Date(),
                };
                setMessages(prev => {
                    // Keep only the latest message
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg?.content.includes("Generating AI summary")) {
                        return prev;
                    }
                    return [...prev, generatingMessage];
                });
            }

            // Call Gemini API
            const summary = await callGeminiSummaryAPI(prompt);

            // Create summary message
            const summaryMessage: Message = {
                id: generateUniqueId(),
                content: summary,
                role: "assistant",
                timestamp: new Date(),
            };

            if (isForMain) {
                // Add to main messages and update hierarchy
                setMessages(prev => {
                    // Remove processing messages
                    const filtered = prev.filter(msg =>
                        !msg.content.includes("Uploading") &&
                        !msg.content.includes("Extracting") &&
                        !msg.content.includes("Generating AI summary")
                    );
                    return [...filtered, summaryMessage];
                });

                // Update selected hierarchy level
                setSelectedHierarchyLevel(`Uploaded: ${fileName}`);

            } else {
                // Add to modal messages
                const userMessage: Message = {
                    id: generateUniqueId(),
                    content: `Generate summary for uploaded file: ${fileName}`,
                    role: "user",
                    timestamp: new Date(),
                };
                setModalMessages(prev => [...prev, userMessage, summaryMessage]);
            }

        } catch (error) {
            console.error('Error generating file summary:', error);

            const errorMessage: Message = {
                id: generateUniqueId(),
                content: "❌ Failed to generate summary. Please try again.",
                role: "assistant",
                timestamp: new Date(),
            };

            if (isForMain) {
                setMessages(prev => [...prev, errorMessage]);
            } else {
                setModalMessages(prev => [...prev, errorMessage]);
            }
        }
    };



    // Create this as a separate component outside your main component
    const MainChatFloatingNavigation = ({ messages }: { messages: Message[] }) => {
        const [showUpArrow, setShowUpArrow] = useState(false);
        const [hasScrollableContent, setHasScrollableContent] = useState(false);
        const [isVisible, setIsVisible] = useState(false);
        const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

        const findChatContainer = useCallback((): HTMLElement | null => {
            // Try multiple selectors - prioritize the main chat container
            const mainChatSelector = document.querySelector('.flex-1.overflow-y-auto.space-y-4.bg-white');
            if (mainChatSelector) return mainChatSelector as HTMLElement;

            // Fallback to any overflow-y-auto container that's likely the chat
            const containers = document.querySelectorAll('.overflow-y-auto');
            for (const container of containers) {
                if (container.classList.contains('space-y-4') || container.querySelector('.mb-10')) {
                    return container as HTMLElement;
                }
            }

            return null;
        }, []);

        const checkScrollableContent = useCallback(() => {
            const container = findChatContainer();

            if (!container) {
                console.log('Chat container not found, trying again...');
                setHasScrollableContent(false);
                setIsVisible(false);
                return;
            }

            // Check if container has scrollable content
            const isScrollable = container.scrollHeight > container.clientHeight + 50;
            setHasScrollableContent(isScrollable);

            // Update arrow direction
            if (isScrollable) {
                const { scrollTop, scrollHeight, clientHeight } = container;
                const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
                setShowUpArrow(isAtBottom);

                // Always show if we have messages and scrollable content
                if (messages.length > 0) {
                    setIsVisible(true);
                }
            } else {
                setIsVisible(false);
            }
        }, [findChatContainer, messages.length]);

        // Handle click to scroll
        const handleClick = useCallback(() => {
            const container = findChatContainer();
            if (!container) return;

            if (showUpArrow) {
                // Scroll to top
                container.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                // Scroll to bottom
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, [findChatContainer, showUpArrow]);

        // Setup scroll listener and periodic checks
        useEffect(() => {
            const container = findChatContainer();

            if (!container) {
                // Try to find container after a delay
                const timer = setTimeout(() => {
                    checkScrollableContent();
                }, 1000);
                return () => clearTimeout(timer);
            }

            const handleScroll = () => {
                if (hasScrollableContent) {
                    const { scrollTop, scrollHeight, clientHeight } = container;
                    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
                    setShowUpArrow(isAtBottom);
                }
            };

            // Add scroll listener
            container.addEventListener('scroll', handleScroll);

            // Setup periodic check for content changes
            checkIntervalRef.current = setInterval(checkScrollableContent, 1000);

            // Initial check
            checkScrollableContent();

            return () => {
                container.removeEventListener('scroll', handleScroll);
                if (checkIntervalRef.current) {
                    clearInterval(checkIntervalRef.current);
                }
            };
        }, [findChatContainer, hasScrollableContent, checkScrollableContent]);

        // Also check when messages change
        useEffect(() => {
            // Debounce the check when messages change
            const timer = setTimeout(() => {
                checkScrollableContent();
            }, 500);

            return () => clearTimeout(timer);
        }, [messages, checkScrollableContent]);

        // Check on window resize
        useEffect(() => {
            const handleResize = () => {
                checkScrollableContent();
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, [checkScrollableContent]);

        // Always show when we have messages and container is scrollable
        if (!isVisible || messages.length === 0) {
            return null;
        }

        return (
            <div className="fixed bottom-26 right-4 z-[9999] animate-fade-in">
                <div
                    className="w-12 h-12 bg-white rounded-full shadow-2xl border-2 border-blue-200 flex items-center justify-center cursor-pointer hover:shadow-3xl hover:scale-110 transition-all duration-300 text-gray-800 hover:text-blue-600 hover:border-blue-500 active:scale-95 group"
                    onClick={handleClick}
                    title={showUpArrow ? "Scroll to top" : "Scroll to bottom"}
                    style={{
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                        backdropFilter: 'blur(8px)',
                        background: 'rgba(255, 255, 255, 0.95)'
                    }}
                >
                    <div className="relative">
                        {showUpArrow ? (
                            <ChevronUp className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        ) : (
                            <ChevronDown className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        )}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                    </div>
                </div>
            </div>
        );
    };

    // Then in your main component, update the render line to:
    // Add this component after MessageActions
    // Update the FloatingNavigation component
    // Update FloatingNavigation component to work from inside
    const FloatingNavigation = () => {
        const [showUpArrow, setShowUpArrow] = useState(false);
        const [hasScrollableContent, setHasScrollableContent] = useState(false);

        useEffect(() => {
            // 更可靠地查找模态消息容器
            const modalContent = document.querySelector('.flex-1.overflow-y-auto.p-4.px-6');

            if (!modalContent) {
                console.log('Modal content container not found');
                return;
            }

            console.log('Modal content found, scrollHeight:', modalContent.scrollHeight, 'clientHeight:', modalContent.clientHeight);

            const checkScrollable = () => {
                const hasScroll = modalContent.scrollHeight > modalContent.clientHeight + 10; // 添加容差
                console.log('Has scrollable content:', hasScroll);
                setHasScrollableContent(hasScroll);

                if (hasScroll) {
                    const { scrollTop, scrollHeight, clientHeight } = modalContent;
                    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
                    console.log('Is at bottom:', isAtBottom);
                    setShowUpArrow(isAtBottom);
                }
            };

            // 初始检查
            checkScrollable();

            const handleScroll = () => {
                if (hasScrollableContent) {
                    const { scrollTop, scrollHeight, clientHeight } = modalContent;
                    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
                    setShowUpArrow(isAtBottom);
                }
            };

            modalContent.addEventListener('scroll', handleScroll);

            // 监听内容变化
            const observer = new MutationObserver(() => {
                setTimeout(checkScrollable, 100); // 延迟确保DOM更新
            });

            observer.observe(modalContent, {
                childList: true,
                subtree: true,
                characterData: true
            });

            // 窗口大小变化时重新检查
            window.addEventListener('resize', checkScrollable);

            return () => {
                modalContent.removeEventListener('scroll', handleScroll);
                observer.disconnect();
                window.removeEventListener('resize', checkScrollable);
            };
        }, [hasScrollableContent]);

        const handleClick = () => {
            if (!hasScrollableContent) return;

            const modalContent = document.querySelector('.flex-1.overflow-y-auto.p-4.px-6');
            if (!modalContent) return;

            if (showUpArrow) {
                modalContent.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                modalContent.scrollTo({
                    top: modalContent.scrollHeight,
                    behavior: 'smooth'
                });
            }
        };

        // 不要渲染如果没有滚动内容或模态中没有消息
        if (!hasScrollableContent || modalMessages.length <= 1) {
            console.log('Not rendering FloatingNavigation:', {
                hasScrollableContent,
                messageCount: modalMessages.length
            });
            return null;
        }

        console.log('Rendering FloatingNavigation with arrow:', showUpArrow ? 'up' : 'down');

        return (
            <div className="fixed bottom-24 right-12 z-[120]"> {/* 增加 z-index 和调整位置 */}
                <div
                    className="w-10 h-10 bg-white rounded-full  border border-gray-300 flex items-center justify-center cursor-pointer hover:shadow-2xl hover:scale-110 transition-all duration-300 text-gray-800 hover:text-gray-900 hover:border-blue-400 active:scale-95"
                    onClick={handleClick}
                    title={showUpArrow ? "Scroll to top" : "Scroll to bottom"}
                    style={{
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <div className="relative">
                        {showUpArrow ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full opacity-0 hover:opacity-30 transition-opacity duration-300"></div>
                    </div>
                </div>
            </div>
        );
    };
    // Add this function near your other scroll function
    // Update your scrollModalToBottom function:
    const scrollModalToBottom = () => {
        setTimeout(() => {
            modalMessagesEndRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest" // Changed from "end" to "nearest" for better smoothness
            });
        }, 1500); // Reduced delay for faster response
    }



    // Add this useEffect to automatically scroll when new messages arrive
    useEffect(() => {
        // Scroll to bottom when messages change
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        }
    }, [messages]);



    // Add this useEffect after your existing scroll useEffect
    useEffect(() => {
        if (modalMessages.length > 0) {
            scrollModalToBottom();
        }
    }, [modalMessages]);
    const isSystemOrStatusMessage = (content: string): boolean => {
        const systemPatterns = [
            "✅ Successfully extracted",
            "📄 Extracting content from",
            "Extracting content from",
            "Successfully extracted",
            "Loading course structure",
            "Generating course summary",
            "AI is thinking",
            "Generating summary...",
            "🔄 Starting summary generation...",
            "📥 Extracting content from",
            "✅ Extracted",
            "🤖 Generating AI summary...",
            "Processing content..."
        ];

        return systemPatterns.some(pattern =>
            content.toLowerCase().includes(pattern.toLowerCase())
        ) || isWelcomeMessage(content);
    };







    // Add useEffect to show tutorial on first open
    useEffect(() => {
        if (isOpen && firstTimeOpen && !hasCompletedTutorial) {
            // Check if tutorial was shown before
            const tutorialShown = localStorage.getItem('summaryTutorialShown')
            if (!tutorialShown) {
                setTimeout(() => {
                    setShowTutorial(true)
                }, 1000) // Delay to ensure DOM is ready
            }
            setFirstTimeOpen(false)
        }
    }, [isOpen, firstTimeOpen, hasCompletedTutorial])


    // Initialize navigation when modal opens
    useEffect(() => {
        if (showModuleModal && courseData?.modules) {
            // Start with module selection
            const moduleStep: NavigationStep = {
                level: 0,
                items: courseData.modules.map((m: any) => ({
                    ...m,
                    type: 'module'
                })),
                label: "Select Module"
            };
            setNavigationSteps([moduleStep]);
            setSelectedItemPath([]);
            setSelectedTopics([]);
        }
    }, [showModuleModal, courseData]);




    // Add this near your other state variables
    const [availableTopic, setAvailableTopic] = useState<{
        topic: string;
        hierarchy: string[];
        level: SummaryLevel;
    } | null>(null);

    // Update the useEffect that watches for context changes:
    // Replace the useEffect that watches for context changes with this:
    useEffect(() => {
        console.log("Summary Chat Context changed:", context);

        // Only run when chat is open
        if (isOpen) {
            // Get the current topic from context
            let currentTopic = '';
            let topicHierarchy: string[] = [];

            if (context.hierarchy && context.hierarchy.length > 0) {
                currentTopic = context.hierarchy[context.hierarchy.length - 1];
                topicHierarchy = context.hierarchy;
            } else if (context.topicTitle) {
                currentTopic = context.topicTitle;
                topicHierarchy = [context.topicTitle];
            }

            // If we have a topic
            if (currentTopic) {
                // Check if we're already showing this exact topic prompt
                const isSameTopicPrompt = messages.some(msg =>
                    msg.role === "assistant" &&
                    msg.content.includes(`I can help with: ${currentTopic}`)
                );

                // Only show new prompt if not already showing
                if (!isSameTopicPrompt) {
                    // Clear messages to show fresh prompt
                    setMessages([]);

                    // Store for confirmation
                    setPendingTopicToSummarize({
                        topic: currentTopic,
                        hierarchy: topicHierarchy,
                        level: topicHierarchy.length > 1 ? "auto" : "topic"
                    });

                    // Reset user response for new topic
                    setUserTopicResponse(null);

                    // Show the prompt message
                    const promptMessage: Message = {
                        id: generateUniqueId(),
                        content: `I can help with: ${currentTopic}\n\nSummarize this topic?`,
                        role: "assistant",
                        timestamp: new Date(),
                        isStreaming: false
                    };

                    setMessages([promptMessage]);

                    // IMPORTANT: Don't auto-generate here, wait for user to click "Generate"
                    // Only generate if user previously said "yes"
                    if (userTopicResponse === "yes") {
                        handleConfirmTopicSummary();
                    }
                }

            } else {
                // Clear messages for generic welcome
                setMessages([]);
                setUserTopicResponse(null);

                // Generic welcome if no topic
                const welcomeMessage: Message = {
                    id: generateUniqueId(),
                    content: "I'm ready to help you summarize learning content! Select an option above to get started.",
                    role: "assistant",
                    timestamp: new Date(),
                    isStreaming: false
                };
                setMessages([welcomeMessage]);
            }
        }
    }, [isOpen, context, userTopicResponse]); // Add userTopicResponse to dependencies


    //         if (selectedTopics.length === 0) return;

    //         setModalLoading(true);

    //         // Get all leaf items
    //         const allLeafItems = getAllLeafItems();
    //         const selectedItems = allLeafItems.filter(item =>
    //             selectedTopics.includes(item._id)
    //         );

    //         const itemTitles = selectedItems.map(item => item.title);

    //         // Build hierarchy path - FIX: Get path from selected items
    //         let hierarchyPath = "course content";
    //         if (selectedItemPath.length > 0) {
    //             hierarchyPath = selectedItemPath.map(item => item.title).join(' → ');
    //         }

    //         // Create prompt (your existing prompt logic here...)
    //         const prompt = `As an expert educational AI assistant, create a comprehensive summary of the following learning content:

    // HIERARCHY CONTEXT:
    // ${hierarchyPath}

    // ITEMS TO SUMMARIZE (${selectedItems.length} items):
    // ${itemTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')}

    // // ... rest of your prompt
    // `;

    //         try {
    //             const summary = await callGeminiSummaryAPI(prompt);

    //             // FIX: Create proper user message with correct count
    //             const userMessage: Message = {
    //                 id: generateUniqueId(),
    //                 content: `Summarize ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} from ${hierarchyPath}`,
    //                 role: "user",
    //                 timestamp: new Date(),
    //             };

    //             const assistantMessage: Message = {
    //                 id: (Date.now() + 1).toString(),
    //                 content: summary,
    //                 role: "assistant",
    //                 timestamp: new Date(),
    //             };

    //             setModalMessages([userMessage, assistantMessage]);
    //         } catch (error) {
    //             console.error('Error generating summary:', error);

    //             const errorMessage: Message = {
    //                 id: generateUniqueId(),
    //                 content: "I apologize, but I encountered an error while generating the summary. Please try again.",
    //                 role: "assistant",
    //                 timestamp: new Date(),
    //             };

    //             setModalMessages([errorMessage]);
    //         } finally {
    //             setModalLoading(false);
    //         }
    //     };
    // Add these functions near your other handler functions
    const handleConfirmTopicSummary = async () => {
        try {
            // Set loading state immediately
            setIsLoading(true);
            setIsGeneratingSummary(true);

            // Clear any existing messages except the initial prompt
            setMessages(prev => {
                const initialPrompt = prev.find(msg =>
                    msg.role === "assistant" &&
                    (msg.content.includes("I can help with:") ||
                        msg.content.includes("Summarize this topic?"))
                );

                // Keep only the initial prompt
                return initialPrompt ? [initialPrompt] : prev;
            });

            // Create user message
            const userMessage: Message = {
                id: generateUniqueId(),
                content: userTopicResponse === "yes" ? "Regenerate summary" : "Generate summary",
                role: "user",
                timestamp: new Date(),
                isStreaming: false
            };

            setMessages(prev => [...prev, userMessage]);

            // Use pendingTopicToSummarize OR availableTopic
            const topicToSummarize = pendingTopicToSummarize || availableTopic;

            if (!topicToSummarize) {
                // If no topic, show error
                const errorMessage: Message = {
                    id: generateUniqueId(),
                    content: "Unable to regenerate summary. Please try again.",
                    role: "assistant",
                    timestamp: new Date(),
                    isStreaming: false
                };
                setMessages(prev => [...prev, errorMessage]);
                return;
            }

            // Set user response to "yes" (for UI state)
            setUserTopicResponse("yes");

            // Generate summary using the topic info
            const summaryRequest = generateSummaryRequest(
                topicToSummarize.hierarchy,
                topicToSummarize.level,
                context.pdfUrl,
                context.fileType
            );

            // Call auto summary
            await handleAutoSummary(
                summaryRequest,
                context.pdfUrl,
                context.fileType
            );

        } catch (error) {
            console.error('Error in handleConfirmTopicSummary:', error);

            // Show error message
            const errorMessage: Message = {
                id: generateUniqueId(),
                content: "Failed to generate summary. Please try again.",
                role: "assistant",
                timestamp: new Date(),
                isStreaming: false
            };

            setMessages(prev => [...prev, errorMessage]);

        } finally {
            // ALWAYS reset loading states
            setIsLoading(false);
            setIsGeneratingSummary(false);
        }
    };


    const handleDynamicSummarize = async () => {
        if (selectedTopics.length === 0 && !modalUploadedFile) return;

        setModalLoading(true);

        let combinedPrompt = "";
        let hierarchyPath = "";

        if (selectedTopics.length > 0) {
            const allLeafItems = getAllLeafItems();
            const selectedItems = allLeafItems.filter(item =>
                selectedTopics.includes(item._id)
            );

            const itemTitles = selectedItems.map(item => item.title);

            hierarchyPath = "course content";
            if (selectedItemPath.length > 0) {
                hierarchyPath = selectedItemPath.map(item => item.title).join(' → ');
            }

            const coursePrompt = `As an expert educational AI assistant, create a comprehensive summary of the following learning content:

HIERARCHY CONTEXT:
${hierarchyPath}

ITEMS TO SUMMARIZE (${selectedTopics.length} items):
${itemTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')}

Please provide a comprehensive, point-wise summary with:
• Clear organization and proper headings
• Key concepts and learning objectives
• Important definitions and terminology
• Practical applications and examples
• Study recommendations and best practices
• Common challenges and how to overcome them

Format with proper spacing between sections for easy reading.`;

            combinedPrompt += coursePrompt;
        }

        if (modalUploadedFile) {
            const fileType = modalUploadedFile.type === 'pdf' ? 'PDF' :
                modalUploadedFile.type === 'ppt' ? 'PPT' :
                    modalUploadedFile.type === 'video' ? 'Video' :
                        modalUploadedFile.type === 'text' ? 'Text' :
                            modalUploadedFile.type === 'document' ? 'Document' : 'File';

            let fileContent = modalUploadedFile.extractedContent ||
                `[Content could not be extracted from ${modalUploadedFile.name}]`;

            const filePrompt = `
        
📁 **UPLOADED ${fileType.toUpperCase()} FILE: ${modalUploadedFile.name}**

FILE DETAILS:
• File Size: ${(modalUploadedFile.size / 1024 / 1024).toFixed(1)} MB
• Content Length: ${fileContent.length} characters
• File Type: ${fileType}

CONTENT TO SUMMARIZE:
${fileContent.substring(0, 4000)}${fileContent.length > 4000 ? '...' : ''}

Please analyze and summarize this uploaded file with:
• Main topics and key concepts covered
• Important information and data points
• Key takeaways and insights
${selectedTopics.length > 0 ? '• Connections to the selected course content' : ''}
• Recommended next steps for study
• Important dates, figures, or statistics mentioned

Format with clear headings and bullet points.`;

            combinedPrompt += filePrompt;
        }

        const loadingMessage: Message = {
            id: generateUniqueId() + "-loading",
            content: `🔄 Starting summary generation...`,
            role: "assistant",
            timestamp: new Date(),
        };
        setModalMessages(prev => [...prev, loadingMessage]);

        setTimeout(() => {
            modalMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);

        try {
            const processingMessage: Message = {
                id: generateUniqueId() + "-processing",
                content: `🤖 Processing content and generating AI summary...`,
                role: "assistant",
                timestamp: new Date(),
            };
            setModalMessages(prev => {
                const filtered = prev.filter(msg => !msg.id.includes("-loading"));
                return [...filtered, processingMessage];
            });

            const summary = await callGeminiSummaryAPI(combinedPrompt);

            setModalMessages(prev => prev.filter(msg =>
                !msg.id.includes("-loading") &&
                !msg.id.includes("-processing")
            ));

            // TUTORIAL TRACKING: Mark step 3 as completed
            setTutorialStep(3);

            let userMessageContent = "";
            if (selectedTopics.length > 0 && modalUploadedFile) {
                userMessageContent = `Generate combined summary for ${selectedTopics.length} course items and uploaded file: ${modalUploadedFile.name}`;
            } else if (selectedTopics.length > 0) {
                userMessageContent = `Generate summary for ${selectedTopics.length} course items`;
            } else {
                userMessageContent = `Generate summary for uploaded file: ${modalUploadedFile?.name}`;
            }

            const userMessage: Message = {
                id: generateUniqueId(),
                content: userMessageContent,
                role: "user",
                timestamp: new Date(),
            };

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: summary,
                role: "assistant",
                timestamp: new Date(),
            };

            setModalMessages(prev => [...prev, userMessage, assistantMessage]);

            setTimeout(() => {
                modalMessagesEndRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "end"
                });
            }, 300);

        } catch (error) {
            console.error('Error generating summary:', error);

            setModalMessages(prev => prev.filter(msg =>
                !msg.id.includes("-loading") &&
                !msg.id.includes("-processing")
            ));

            const errorMessage: Message = {
                id: generateUniqueId(),
                content: "I apologize, but I encountered an error while generating the summary. Please try again.",
                role: "assistant",
                timestamp: new Date(),
            };

            setModalMessages(prev => [...prev, errorMessage]);

            setTimeout(() => {
                modalMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 200);

        } finally {
            setModalLoading(false);
        }
    };
    // Fetch complete course data when modal opens
    useEffect(() => {
        if (showModuleModal && !courseData) {
            const fetchCourseData = async () => {
                try {
                    const courseId = window.location.pathname.split('/').pop(); // Get course ID from URL
                    const response = await fetch(`https://lms-client-jade-three.vercel.app/getAll/courses-data/${courseId}`);
                    const data = await response.json();
                    setCourseData(data.data || data);

                    // Auto-expand first module
                    if (data.data?.modules?.[0]?._id) {
                        setExpandedModules(new Set([data.data.modules[0]._id]));
                    }
                } catch (error) {
                    console.error('Error fetching course data:', error);
                }
            };
            fetchCourseData();
        }
    }, [showModuleModal]);
    // Add this useEffect to watch for context changes and prompt for new summaries
    useEffect(() => {
        // Skip if there's already a pending topic or we're in the middle of something
        if (!isOpen || showTopicConfirmation || isLoading || pendingTopicToSummarize) return;

        // Check if we have a valid topic in context
        const currentTopic = context.topicTitle ||
            (context.hierarchy && context.hierarchy.length > 0 ?
                context.hierarchy[context.hierarchy.length - 1] : null);

        if (currentTopic && messages.length > 0) {
            // Check if the topic is different from what we last showed
            const lastTopicMessage = messages.find(msg =>
                msg.role === "assistant" &&
                msg.content.includes("I can help with:")
            );

            // Also check if we're not already showing a prompt for this exact topic
            const isSameTopic = lastTopicMessage && lastTopicMessage.content.includes(currentTopic);

            if (!lastTopicMessage || !isSameTopic) {
                // Show confirmation for the new topic with consistent format
                const confirmationMessage: Message = {
                    id: generateUniqueId(),
                    content: `I can help with: ${currentTopic}\n\nSummarize this topic?`,
                    role: "assistant",
                    timestamp: new Date(),
                    isStreaming: false
                };

                setMessages(prev => [...prev, confirmationMessage]);

                setPendingTopicToSummarize({
                    topic: currentTopic,
                    hierarchy: context.hierarchy || [currentTopic],
                    level: context.hierarchy ? "auto" : "topic"
                });
                setShowTopicConfirmation(true);
            }
        }
    }, [context, isOpen, messages, showTopicConfirmation, isLoading, pendingTopicToSummarize]);
    // Function to call Gemini API for summary generation
    // Function to call Gemini API for summary generation
    // Replace the existing callGeminiSummaryAPI function with this streaming version
    const callGeminiSummaryAPI = async (prompt: string, messageId?: string): Promise<string> => {
        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            if (!reader) {
                throw new Error('No response body reader available');
            }

            // 创建或获取消息ID
            const targetMessageId = messageId || generateUniqueId();

            // 如果是新消息，先添加一个空的消息占位符
            if (!messageId) {
                const streamingMessage: Message = {
                    id: targetMessageId,
                    content: "", // 初始为空
                    role: "assistant",
                    timestamp: new Date(),
                    isStreaming: true
                };
                setMessages(prev => [...prev, streamingMessage]);
            }

            try {
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    // 解码并添加到缓冲区
                    buffer += decoder.decode(value, { stream: true });

                    // 按行分割并处理SSE格式
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // 保留不完整的行

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);

                            // 跳过空行和结束标记
                            if (data.trim() === '' || data.trim() === '[DONE]') {
                                continue;
                            }

                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                                    const textChunk = parsed.candidates[0].content.parts[0].text;
                                    fullResponse += textChunk;

                                    // ✅ 实时更新消息内容（真正的流式更新）
                                    setMessages(prev => {
                                        return prev.map(msg => {
                                            if (msg.id === targetMessageId) {
                                                return {
                                                    ...msg,
                                                    content: fullResponse,
                                                    isStreaming: true
                                                };
                                            }
                                            return msg;
                                        });
                                    });
                                }
                            } catch (e) {
                                // 忽略JSON解析错误
                                console.debug('Failed to parse SSE chunk:', e);
                            }
                        }
                    }
                }

                // 处理缓冲区中剩余的数据
                if (buffer.trim()) {
                    const lines = buffer.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data.trim() && data.trim() !== '[DONE]') {
                                try {
                                    const parsed = JSON.parse(data);
                                    if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                                        const textChunk = parsed.candidates[0].content.parts[0].text;
                                        fullResponse += textChunk;
                                    }
                                } catch (e) {
                                    console.debug('Failed to parse final chunk:', e);
                                }
                            }
                        }
                    }
                }

            } finally {
                reader.releaseLock();
            }

            // 清理格式
            fullResponse = fullResponse
                .replace(/\*\*\*/g, '')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/^\*+$/gm, '')
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .trim();

            // ✅ 流式结束后更新消息状态
            setMessages(prev => {
                return prev.map(msg => {
                    if (msg.id === targetMessageId) {
                        return {
                            ...msg,
                            content: fullResponse,
                            isStreaming: false,
                            timestamp: new Date()
                        };
                    }
                    return msg;
                });
            });

            return fullResponse;
        } catch (error) {
            console.error('Error calling Gemini API:', error);

            // 如果出错，显示错误消息
            const errorMessage: Message = {
                id: messageId || generateUniqueId(),
                content: "I apologize, but I encountered an error while generating the summary. Please try again later.",
                role: "assistant",
                timestamp: new Date(),
                isStreaming: false
            };

            setMessages(prev => {
                // 移除正在流式处理的消息（如果存在）
                const filtered = prev.filter(msg =>
                    !(msg.id === messageId && msg.isStreaming)
                );
                return [...filtered, errorMessage];
            });

            return `I apologize, but I encountered an error while generating the summary. Please try again later.`;
        }
    };

    // Add this useEffect after your existing useEffects
    useEffect(() => {
        const handleCloseSummary = () => {
            if (isOpen) onClose()
        }

        // Listen for close event from AI chat
        window.addEventListener('close-summary-chat', handleCloseSummary)

        return () => {
            window.removeEventListener('close-summary-chat', handleCloseSummary)
        }
    }, [isOpen, onClose])

    // Add this useEffect
    useEffect(() => {
        if (isOpen) {
            // Close AI chat when summary chat opens
            const event = new CustomEvent('close-ai-chat')
            window.dispatchEvent(event)
        }
    }, [isOpen])
    // Auto-generate summary request when component opens with context
    // Auto-generate summary request when component opens with context
    // Auto-generate summary request when component opens with context
    // Replace the entire useEffect that watches for context changes with this:
    useEffect(() => {
        console.log("Summary Chat Context changed:", context);

        // Skip if user has declined topic summary for this session
        if (hasDeclinedTopicSummary) return;

        // Only run when chat is open and we have a new context
        if (isOpen) {
            // Get the current topic from context
            let currentTopic = '';
            let topicHierarchy: string[] = [];

            if (context.hierarchy && context.hierarchy.length > 0) {
                currentTopic = context.hierarchy[context.hierarchy.length - 1];
                topicHierarchy = context.hierarchy;
            } else if (context.topicTitle) {
                currentTopic = context.topicTitle;
                topicHierarchy = [context.topicTitle];
            }

            // If we have a topic and it's different from what we showed before
            if (currentTopic) {
                // Check if we're already showing this topic
                const isAlreadyShowingTopic = messages.some(msg =>
                    msg.role === "assistant" &&
                    msg.content.includes(`I can help with: ${currentTopic}`)
                );

                if (!isAlreadyShowingTopic && !showTopicConfirmation) {
                    // Clear all existing messages first
                    setMessages([]);

                    // Reset states
                    setPendingTopicToSummarize(null);
                    setShowTopicConfirmation(false);

                    // Use consistent format for ALL topics
                    const welcomeMessage: Message = {
                        id: generateUniqueId(),
                        content: `I can help with: ${currentTopic}\n\nSummarize this topic?`,
                        role: "assistant",
                        timestamp: new Date(),
                        isStreaming: false
                    }

                    setMessages([welcomeMessage]);

                    // Store for confirmation
                    setPendingTopicToSummarize({
                        topic: currentTopic,
                        hierarchy: topicHierarchy,
                        level: topicHierarchy.length > 1 ? "auto" : "topic"
                    });
                    setShowTopicConfirmation(true);
                }

            } else {
                // Clear messages for generic welcome
                setMessages([]);

                // Generic welcome if no topic
                const welcomeMessage: Message = {
                    id: generateUniqueId(),
                    content: "I'm ready to help you summarize learning content! Select an option above to get started.",
                    role: "assistant",
                    timestamp: new Date(),
                    isStreaming: false
                }
                setMessages([welcomeMessage])
            }
        }
    }, [isOpen, context, hasDeclinedTopicSummary])
    // Enhanced function to extract content from PDF, PPT, and Video files
  const extractFileContent = async (fileUrl: string, fileType: string, title: string): Promise<string> => {
    try {
        const BACKEND_API_URL = "https://lms-client-jade-three.vercel.app";

        console.log(`Extracting ${fileType} content from: ${fileUrl}`);

        // Use the NEW unified endpoint - it now works with PDFs
        let response = await fetch(`${BACKEND_API_URL}/api/extract-doc/extract-file-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrl: fileUrl,
                fileType: fileType || 'pdf'
            })
        });

        let data = await response.json();

        if (!response.ok || !data.success) {
            console.error('Primary extraction failed:', data.error);
            
            // Fallback to PDF-specific endpoint for PDF files
            if (fileType === 'pdf' || fileType === 'application/pdf') {
                console.log('Trying PDF-specific endpoint...');
                response = await fetch(`${BACKEND_API_URL}/api/extract-doc/extract-pdf-text`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ pdfUrl: fileUrl })
                });
                
                data = await response.json();
                
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'PDF extraction failed');
                }
            } else {
                throw new Error(data.error || `${fileType} extraction failed`);
            }
        }

        console.log(`✅ Extraction successful. Text length: ${data.text?.length || 0} chars`);
        
        // Return text based on the response structure
        return data.text || data.extractedText || "No content extracted";
        
    } catch (error) {
        console.error('Error extracting file content:', error);
        throw new Error(`Failed to extract ${fileType} content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

    // Get all leaf items from current selection
    const getAllLeafItems = (): CourseItem[] => {
        const items: CourseItem[] = [];

        // If selectedTopics is empty, return empty array
        if (selectedTopics.length === 0) {
            return items;
        }

        // Helper function to find item by ID in the entire course structure
        const findItemById = (id: string, itemsList: CourseItem[]): CourseItem | null => {
            for (const item of itemsList) {
                if (item._id === id) {
                    return item;
                }

                // Check children recursively
                let found = null;
                if (item.subModules) {
                    found = findItemById(id, item.subModules);
                    if (found) return found;
                }
                if (item.topics) {
                    found = findItemById(id, item.topics);
                    if (found) return found;
                }
                if (item.subTopics) {
                    found = findItemById(id, item.subTopics);
                    if (found) return found;
                }
                if (item.children) {
                    found = findItemById(id, item.children);
                    if (found) return found;
                }
            }
            return null;
        };

        // Find each selected item in the course data
        selectedTopics.forEach(topicId => {
            const item = findItemById(topicId, courseData?.modules || []);
            if (item) {
                items.push(item);
            }
        });

        return items;
    };

    // Get items at current navigation level


    // Initialize navigation when modal opens
    useEffect(() => {
        if (showModuleModal && courseData?.modules) {
            // Start with module selection
            const moduleStep: NavigationStep = {
                level: 0,
                items: courseData.modules.map((m: any) => ({
                    ...m,
                    type: 'module'
                })),
                label: "Select Module"
            };
            setNavigationSteps([moduleStep]);
            setSelectedItemPath([]);
            setSelectedTopics([]);
            setShowSelectionPopup(false);
        }
    }, [showModuleModal, courseData]);
    // Helper function to get item title by ID
    const getItemTitleById = (itemId: string): string => {
        if (!courseData?.modules) return "AI Summary";

        // Search through modules
        for (const module of courseData.modules) {
            if (module._id === itemId) return module.title;

            // Search sub-modules
            if (module.subModules) {
                for (const subModule of module.subModules) {
                    if (subModule._id === itemId) return subModule.title;

                    // Search topics
                    if (subModule.topics) {
                        for (const topic of subModule.topics) {
                            if (topic._id === itemId) return topic.title;

                            // Search sub-topics
                            if (topic.subTopics) {
                                for (const subTopic of topic.subTopics) {
                                    if (subTopic._id === itemId) return subTopic.title;
                                }
                            }
                        }
                    }
                }
            }

            // Search direct topics (if no sub-modules)
            if (module.topics) {
                for (const topic of module.topics) {
                    if (topic._id === itemId) return topic.title;

                    // Search sub-topics for direct topics
                    if (topic.subTopics) {
                        for (const subTopic of topic.subTopics) {
                            if (subTopic._id === itemId) return subTopic.title;
                        }
                    }
                }
            }
        }

        return "AI Summary";
    };
    const generateSummaryRequest = (hierarchy: string[], level: SummaryLevel, fileUrl?: string, fileType?: string): string => {
        if (hierarchy.length === 0 && !fileUrl) {
            return "Please provide a comprehensive point-wise summary of the current course content with clear sections and proper spacing.";
        }

        let targetLevel = level;
        if (level === "auto") {
            targetLevel = hierarchy.length === 1 ? "module" :
                hierarchy.length === 2 ? "submodule" :
                    hierarchy.length === 3 ? "topic" : "subtopic"
        }

        const currentItem = hierarchy[hierarchy.length - 1] || "Current Document";
        const levels = hierarchy.map((item, index) => {
            const levelNames = ["Module", "Sub-module", "Topic", "Sub-topic"]
            return `${levelNames[index] || "Item"}: ${item}`
        }).join("\n")

        let request = "";

        // Enhanced file context with video-specific instructions
        let fileContext = '';
        if (fileUrl) {
            if (fileType === 'video') {
                fileContext = `
  
🎬 **VIDEO CONTENT TO SUMMARIZE:**
[Video transcript will be extracted and included here]

SPECIAL VIDEO ANALYSIS INSTRUCTIONS:
• Include timestamps for key topics and important moments
• Note the video duration and pacing
• Highlight visual demonstrations or examples mentioned
• Capture speaker's emphasis and tone where relevant
• Identify main segments and transitions
• Extract any specific years, dates, timeframes, or historical context mentioned
• Note important chronological information and temporal references
• Capture all date-related information including months, years, specific dates
• Include any historical timelines or chronological sequences mentioned
• Note important time periods, eras, or temporal context
`;
            } else {
                fileContext = `
  
📄 **${fileType?.toUpperCase() || 'DOCUMENT'} CONTENT TO SUMMARIZE:**
[Content will be extracted from ${fileType || 'document'} and included here]
`;
            }
        }

        switch (targetLevel) {
            case "module":
                request = `As an expert educational AI assistant, create a comprehensive MODULE-LEVEL summary for:

${levels}
${fileContext}

Please provide a CLEAR, POINT-WISE summary with proper spacing and organization:

📖 **MODULE OVERVIEW**
• Overall scope and learning objectives
• How this module fits in the course
• Expected learning outcomes

🎯 **MAIN TOPICS COVERED**
• List and briefly describe each major topic
• Explain the logical flow between topics
• Highlight key focus areas${fileType === 'video' ? '\n• Include approximate timestamps for major topics' : ''}

💡 **CORE CONCEPTS**
• Fundamental principles and theories
• Important definitions and terminology
• Key formulas or methodologies${fileType === 'video' ? '\n• Note any specific years, dates, months, or historical timeframes mentioned' : ''}

🛠️ **SKILLS & COMPETENCIES**
• Practical skills students will develop
• Analytical and problem-solving abilities
• Assessment criteria and expectations

📚 **LEARNING RESOURCES**
• Recommended study materials
• Additional reading suggestions
• Practice exercise types

🚀 **STUDY STRATEGIES**
• Effective approaches for this module
• Time allocation recommendations
• Common pitfalls to avoid${fileType === 'video' ? '\n• Video watching strategies and note-taking tips' : ''}

${fileType === 'video' ? `⏱️ **VIDEO SPECIFICS**
• Total duration and pacing information
• Key moments with approximate timestamps
• Visual demonstrations worth noting
• Speaker's teaching style and emphasis
• Important year/date/month references mentioned
• Chronological sequences and historical context
• Temporal markers and time-related information` : ''}

Use clear headings, bullet points, and proper spacing between sections. Make it comprehensive yet easy to scan and understand.`
                break;

            case "submodule":
                request = `As an expert educational AI assistant, create a comprehensive SUB-MODULE-LEVEL summary for:

${levels}
${fileContext}

Please provide a CLEAR, POINT-WISE summary with proper spacing:

📖 **SUB-MODULE OVERVIEW**
• Specific learning objectives
• Connection to parent module
• Scope and boundaries

🎯 **DETAILED CONTENT BREAKDOWN**
• Specific topics and subtopics covered
• Step-by-step learning progression
• Key focus areas${fileType === 'video' ? '\n• Timestamps for each major section' : ''}

💡 **KEY CONCEPTS EXPLAINED**
• Detailed explanations of core concepts
• Important terminology with definitions
• Fundamental principles and rules${fileType === 'video' ? '\n• Specific years, dates, months, and historical context mentioned' : ''}

🛠️ **PRACTICAL APPLICATIONS**
• Real-world examples and use cases
• Hands-on exercises and activities
• Problem-solving approaches

📊 **ASSESSMENT FOCUS**
• What will be tested or evaluated
• Important formulas or methods to remember
• Common question types

🚀 **LEARNING TIPS**
• Effective study methods for this content
• Memory aids and techniques
• Time management suggestions${fileType === 'video' ? '\n• Optimal video playback speeds for different sections' : ''}

${fileType === 'video' ? `🎥 **VIDEO ANALYSIS**
• Segment breakdown with time markers
• Important visual elements
• Key demonstrations and examples
• Pacing and difficulty level
• Chronological information and date references
• Year/month/date specifics mentioned
• Historical timelines and temporal sequences
• Important time periods and eras discussed` : ''}

Use clear organization with headings and proper spacing between points.`
                break;

            case "topic":
                request = `As an expert educational AI assistant, create a comprehensive TOPIC-LEVEL summary for:

${levels}
${fileContext}

Please provide a CLEAR, POINT-WISE summary with proper spacing:

📖 **TOPIC INTRODUCTION**
• Brief overview and importance
• Learning objectives
• Real-world relevance${fileType === 'video' ? '\n• Video segment timing and duration' : ''}

🎯 **MAIN CONCEPTS**
• Core ideas and principles
• Key definitions and terminology
• Fundamental theories${fileType === 'video' ? '\n• Historical dates, years, months, timeframes, and chronological context mentioned' : ''}

💡 **DETAILED EXPLANATIONS**
• Step-by-step processes
• Important formulas or calculations
• Methodologies and approaches${fileType === 'video' ? '\n• Timestamped key explanations' : ''}

🛠️ **PRACTICAL EXAMPLES**
• Worked examples with explanations
• Real-world application scenarios
• Common use cases${fileType === 'video' ? '\n• Visual demonstrations with approximate times' : ''}

📝 **KEY POINTS TO REMEMBER**
• Must-know information
• Critical formulas or rules
• Common misconceptions${fileType === 'video' ? '\n• Important year/date/month references and time-specific information' : ''}

🔍 **PRACTICE OPPORTUNITIES**
• Suggested exercises
• Self-assessment questions
• Application challenges

${fileType === 'video' ? `⏰ **TIMELINE & CHRONOLOGY**
• Key moments with approximate timestamps
• Important year and date references mentioned
• Specific months and time periods discussed
• Historical context and temporal sequences
• Pacing and segment durations
• Recommended review points for important dates
• Chronological markers and timeline information
• Era-specific references and timeframes` : ''}

Use clear headings and proper spacing. Make it easy to study from.`
                break;

            case "subtopic":
                request = `As an expert educational AI assistant, create a detailed SUB-TOPIC-LEVEL summary for:

${levels}
${fileContext}

Please provide a FOCUSED, POINT-WISE summary with proper spacing:

🎯 **FOCUS AREA**
• Specific concept or skill covered
• Learning objectives
• Practical importance${fileType === 'video' ? '\n• Video segment timing' : ''}

💡 **CORE CONTENT**
• Detailed explanation of the concept
• Step-by-step procedures
• Important rules or principles${fileType === 'video' ? '\n• Year/date/month-specific information and chronological context' : ''}

🛠️ **APPLICATION GUIDES**
• How to apply the knowledge
• Worked examples
• Common scenarios${fileType === 'video' ? '\n• Demonstration timestamps' : ''}

📝 **KEY TAKEAWAYS**
• Essential points to remember
• Critical information
• Quick reference points${fileType === 'video' ? '\n• Important dates, years, months, and temporal references mentioned' : ''}

🔍 **PRACTICE EXERCISES**
• Immediate application opportunities
• Self-check questions
• Skill-building activities

${fileType === 'video' ? `📅 **YEAR, DATE & MONTH REFERENCES**
• Specific years mentioned with context
• Important dates and chronological markers
• Month references and seasonal context
• Key timestamps for important content
• Duration of key explanations
• Historical timeframes and periods discussed
• Recommended replay points for date/year/month information
• Temporal sequences and chronological order
• Era-specific information and time periods` : ''}

Keep it concise but comprehensive with clear organization.`
                break;

            default:
                request = `As an expert educational AI assistant, create a comprehensive summary for:

${levels}
${fileContext}

Please provide a CLEAR, POINT-WISE summary with:

• Key concepts and learning objectives
• Main takeaways and insights
• Practical applications
• Study recommendations
• Important terminology${fileType === 'video' ? '\n• Timestamps for key sections\n• Video duration and pacing notes\n• Important year and date references mentioned\n• Chronological context and historical timeframes\n• Month references and temporal information\n• Specific dates and time periods discussed' : ''}

${fileType === 'video' ? `🎬 **VIDEO-SPECIFIC ELEMENTS:**
- Include approximate timestamps throughout
- Note important visual demonstrations
- Capture year/date/month references and historical context
- Highlight pacing and segment durations
- Extract chronological sequences and temporal information
- Include all time-related references and markers
- Note specific months, seasons, and time periods mentioned
- Capture era-specific information and historical timelines` : ''}

Use proper spacing and organization for easy reading.`
        }

        return request
    }
  const handleAutoSummary = async (request: string, fileUrl?: string, fileType?: string) => {
    setIsLoading(true);
    setIsGeneratingSummary(true);
    setInput("");

    // Clear messages except initial prompt
    setMessages(prev => {
        const initialPrompt = prev.find(msg =>
            msg.role === "assistant" &&
            (msg.content.includes("I can help with:") || msg.content.includes("Would you like me to summarize"))
        );
        return initialPrompt ? [initialPrompt] : [];
    });

    const userMessage: Message = {
        id: generateUniqueId(),
        content: "Generate a comprehensive summary",
        role: "user",
        timestamp: new Date(),
        isStreaming: false
    };

    setMessages(prev => [...prev, userMessage]);

    try {
        let finalRequest = request;
        let extractedContent = "";

        if (fileUrl && (context.isDocumentView || context.isPDF || context.fileType)) {
            try {
                const fileTypeName = context.fileType === 'video' ? 'Video' :
                    context.fileType === 'ppt' ? 'Presentation' : 
                    context.fileType === 'pdf' ? 'PDF' : 'Document';

                const extractingMessage: Message = {
                    id: generateUniqueId(),
                    content: `📥 Extracting content from ${fileTypeName}...`,
                    role: "assistant",
                    timestamp: new Date(),
                    isStreaming: false
                };
                setMessages(prev => [...prev, extractingMessage]);

                // Extract content from the file
                extractedContent = await extractFileContent(
                    fileUrl, 
                    context.fileType || 'pdf', 
                    context.fileName || 'Document'
                );

                const processingMessage: Message = {
                    id: generateUniqueId(),
                    content: `✅ Extracted ${extractedContent.length} characters. Processing content...`,
                    role: "assistant",
                    timestamp: new Date(),
                    isStreaming: false
                };
                setMessages(prev => {
                    const filtered = prev.filter(msg =>
                        msg.id !== extractingMessage.id &&
                        !msg.content.includes("Starting summary generation")
                    );
                    return [...filtered, processingMessage];
                });

                // Add extracted content to the request
                finalRequest = request + `\n\n📄 **${fileTypeName.toUpperCase()} CONTENT TO SUMMARIZE:**\n${extractedContent.substring(0, 3000)}${extractedContent.length > 3000 ? '...' : ''}\n\nPlease provide a comprehensive summary.`;
                
            } catch (extractionError) {
                console.error('File content extraction failed:', extractionError);
                // Continue with original request even if extraction fails
                finalRequest = request + "\n\nNote: Could not extract file content. Please provide a general summary based on the document title.";
            }
        }

        // Call Gemini API to generate summary
        await callGeminiSummaryAPI(finalRequest);

        // Clean up intermediate messages
        setMessages(prev => prev.filter(msg =>
            !msg.content.includes("Starting summary") &&
            !msg.content.includes("Extracting content") &&
            !msg.content.includes("Processing content") &&
            !msg.content.includes("Generating AI summary") &&
            !msg.content.includes("Successfully extracted")
        ));

    } catch (error) {
        console.error('Error generating AI summary:', error);

        setMessages(prev => prev.filter(msg =>
            !msg.content.includes("Starting summary") &&
            !msg.content.includes("Extracting content") &&
            !msg.content.includes("Processing content") &&
            !msg.content.includes("Generating AI summary") &&
            !msg.content.includes("Successfully extracted")
        ));

        const errorMessage: Message = {
            id: generateUniqueId(),
            content: "I apologize, but I encountered an error while generating the summary. Please try again later.",
            role: "assistant",
            timestamp: new Date(),
            isStreaming: false
        };

        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
        setIsGeneratingSummary(false);
    }
};
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: generateUniqueId(),
            content: input,
            role: "user",
            timestamp: new Date(),
            isStreaming: false
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // 准备上下文
            let contextPrompt = "";

            if (context.hierarchy && context.hierarchy.length > 0) {
                const currentItem = context.hierarchy[context.hierarchy.length - 1];
                contextPrompt = `Follow-up question about: ${currentItem}\n\nUser Question: ${input}\n\nPlease provide a helpful, educational response.`;
            } else if (context.topicTitle) {
                contextPrompt = `Follow-up question about: ${context.topicTitle}\n\nUser Question: ${input}\n\nProvide an educational response.`;
            } else {
                contextPrompt = `User Question: ${input}\n\nProvide helpful educational guidance.`;
            }

            // ✅ 直接调用流式API，不需要创建占位符
            await callGeminiSummaryAPI(contextPrompt);

        } catch (error) {
            console.error('Error in AI conversation:', error);

            const errorMessage: Message = {
                id: generateUniqueId(),
                content: "I apologize, but I encountered an error while processing your request. Please try again later.",
                role: "assistant",
                timestamp: new Date(),
                isStreaming: false
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen)
    }

    // Add this function after your existing helper functions
    const handleModalSend = async (question: string) => {
        if (!question.trim()) return;

        const userMessage: Message = {
            id: generateUniqueId(),
            content: question,
            role: "user",
            timestamp: new Date(),
        };

        setModalMessages(prev => [...prev, userMessage]);
        setModalLoading(true);

        try {
            // Prepare context based on the selected module item
            let contextPrompt = "";

            if (selectedModuleItem) {
                const itemTitle = getItemTitleById(selectedModuleItem);

                // Get the last AI summary to provide context
                const lastAIMessage = modalMessages
                    .filter(msg => msg.role === "assistant" && !isSystemOrStatusMessage(msg.content))
                    .pop();

                contextPrompt = `Follow-up question about: ${itemTitle}
            
User's Question: ${question}

${lastAIMessage ? `Previous Summary Context:
${lastAIMessage.content.substring(0, 1000)}...` : ''}

Please provide a helpful, educational response with:
• Clear point-wise explanations
• Proper spacing and organization
• Practical examples if relevant
• Easy-to-understand language

Focus on clarity and educational value. Address the specific question directly.`;
            } else {
                contextPrompt = `User Question: ${question}
            
Provide helpful educational guidance with:
• Well-organized points
• Clear explanations
• Practical advice
• Proper formatting`;
            }

            // Call Gemini API for the response
            const aiResponse = await callGeminiSummaryAPI(contextPrompt);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: aiResponse,
                role: "assistant",
                timestamp: new Date(),
            };

            setModalMessages(prev => [...prev, assistantMessage]);

        } catch (error) {
            console.error('Error in modal AI conversation:', error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: "I apologize, but I encountered an error while processing your question. Please try again later.",
                role: "assistant",
                timestamp: new Date(),
            };

            setModalMessages(prev => [...prev, errorMessage]);
        } finally {
            setModalLoading(false);
        }
    };





    // Add this function after your other handler functions
    const handleMainChatFileUpload = async (file: File) => {
    setIsUploading(true);

    // Clear any existing messages
    setMessages([]);

    try {
        // Show initial loading message
        const loadingMessage: Message = {
            id: generateUniqueId(),
            content: `📤 Uploading "${file.name}"...`,
            role: "assistant",
            timestamp: new Date(),
        };
        setMessages([loadingMessage]);

        // Step 1: Upload file to get extracted content
        const formData = new FormData();
        formData.append('file', file);

        const BACKEND_API_URL = "https://lms-client-jade-three.vercel.app";

        const uploadResponse = await fetch(`${BACKEND_API_URL}/api/extract-doc/upload-file`, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error('File upload failed');
        }

        const uploadData = await uploadResponse.json();

        if (!uploadData.success || !uploadData.data?.extractedText) {
            throw new Error(uploadData.error || 'Failed to extract content from file');
        }

        const { fileName, fileType, extractedText } = uploadData.data;

        console.log(`File processed: ${fileName}, Type: ${fileType}, Content length: ${extractedText.length}`);

        // Show content extracted message
        const extractedMessage: Message = {
            id: generateUniqueId(),
            content: `✅ Successfully extracted ${extractedText.length} characters from "${fileName}"`,
            role: "assistant",
            timestamp: new Date(),
        };
        
        // Update messages - keep only this message
        setMessages([extractedMessage]);

        // Step 3: Generate summary using the existing generateFileSummary function
        await generateFileSummary(
            fileName,
            fileType,
            extractedText,
            'main'  // Destination is main chat
        );

    } catch (error) {
        console.error('File processing failed:', error);

        const errorMessage: Message = {
            id: generateUniqueId(),
            content: `❌ ${error instanceof Error ? error.message : 'File processing failed'}`,
            role: "assistant",
            timestamp: new Date(),
        };
        setMessages([errorMessage]);

    } finally {
        setIsUploading(false);
    }
};
    // Helper function to generate summary for uploaded file in main chat
    const generateFileSummaryForMainChat = async (
        fileName: string,
        fileType: string,
        extractedContent: string,
        fileUrl?: string
    ) => {
        try {
            const documentType = fileType === 'pdf' ? 'PDF' :
                fileType === 'ppt' ? 'PRESENTATION' :
                    fileType === 'video' ? 'VIDEO' :
                        fileType === 'text' ? 'TEXT' :
                            fileType === 'document' ? 'DOCUMENT' : 'FILE';

            const prompt = `As an expert educational AI assistant, create a comprehensive summary of the following ${documentType} file:

FILE: ${fileName}
CONTENT LENGTH: ${extractedContent.length} characters
FILE TYPE: ${fileType.toUpperCase()}

CONTENT TO SUMMARIZE:
${extractedContent.substring(0, 4000)}${extractedContent.length > 4000 ? '...' : ''}

Please provide a detailed, point-wise summary with:
• Main topics and key concepts covered
• Important definitions and terminology
• Practical applications and examples
• Key takeaways and learning points
• Study recommendations and best practices
${fileType === 'video' ? '• Timestamps for key sections (if available)\n• Important year/date/month references and chronological context' : ''}

Format with clear headings, bullet points, and proper spacing for easy reading.`;

            // Show generating message
            const generatingMessage: Message = {
                id: generateUniqueId(),
                content: `🤖 Generating AI summary for "${fileName}"...`,
                role: "assistant",
                timestamp: new Date(),
            };

            // Clear previous messages and show only the generating message
            setMessages([generatingMessage]);

            // Call Gemini API
            const summary = await callGeminiSummaryAPI(prompt);

            // Create summary message
            const summaryMessage: Message = {
                id: generateUniqueId(),
                content: summary,
                role: "assistant",
                timestamp: new Date(),
            };

            // Replace the generating message with the actual summary
            setMessages([summaryMessage]);

            // Update selected hierarchy level
            setSelectedHierarchyLevel(`Uploaded: ${fileName}`);

        } catch (error) {
            console.error('Error generating file summary:', error);

            const errorMessage: Message = {
                id: generateUniqueId(),
                content: "❌ Failed to generate summary. Please try again.",
                role: "assistant",
                timestamp: new Date(),
            };

            setMessages([errorMessage]);
        }
    };
    const renderHierarchyButtons = () => {


        const renderModuleModal = () => {
            if (!showModuleModal) return null;

            const getAllItemsForLevel = (levelIndex: number): CourseItem[] => {
                if (!courseData?.modules) return [];

                const items: CourseItem[] = [];

                if (levelIndex === 0) {
                    courseData.modules.forEach(module => {
                        items.push({
                            ...module,
                            type: 'module'
                        });
                    });
                } else if (levelIndex === 1) {
                    courseData.modules.forEach(module => {
                        if (module.subModules) {
                            module.subModules.forEach(subModule => {
                                items.push({
                                    ...subModule,
                                    type: 'submodule',
                                    parentModuleId: module._id,
                                    parentModuleTitle: module.title
                                });
                            });
                        }
                    });
                } else if (levelIndex === 2) {
                    courseData.modules.forEach(module => {
                        if (module.subModules) {
                            module.subModules.forEach(subModule => {
                                if (subModule.topics) {
                                    subModule.topics.forEach(topic => {
                                        items.push({
                                            ...topic,
                                            type: 'topic',
                                            parentModuleId: module._id,
                                            parentModuleTitle: module.title,
                                            parentSubModuleId: subModule._id,
                                            parentSubModuleTitle: subModule.title
                                        });
                                    });
                                }
                            });
                        }

                        if (module.topics) {
                            module.topics.forEach(topic => {
                                items.push({
                                    ...topic,
                                    type: 'topic',
                                    parentModuleId: module._id,
                                    parentModuleTitle: module.title
                                });
                            });
                        }
                    });
                } else if (levelIndex === 3) {
                    courseData.modules.forEach(module => {
                        if (module.subModules) {
                            module.subModules.forEach(subModule => {
                                if (subModule.topics) {
                                    subModule.topics.forEach(topic => {
                                        if (topic.subTopics) {
                                            topic.subTopics.forEach(subTopic => {
                                                items.push({
                                                    ...subTopic,
                                                    type: 'subtopic',
                                                    parentModuleId: module._id,
                                                    parentModuleTitle: module.title,
                                                    parentSubModuleId: subModule._id,
                                                    parentSubModuleTitle: subModule.title,
                                                    parentTopicId: topic._id,
                                                    parentTopicTitle: topic.title
                                                });
                                            });
                                        }
                                    });
                                }
                            });
                        }

                        if (module.topics) {
                            module.topics.forEach(topic => {
                                if (topic.subTopics) {
                                    topic.subTopics.forEach(subTopic => {
                                        items.push({
                                            ...subTopic,
                                            type: 'subtopic',
                                            parentModuleId: module._id,
                                            parentModuleTitle: module.title,
                                            parentTopicId: topic._id,
                                            parentTopicTitle: topic.title
                                        });
                                    });
                                }
                            });
                        }
                    });
                }

                return items;
            };

            const getAllChildrenForItem = (itemId: string): string[] => {
                const childrenIds: string[] = [];

                if (!courseData?.modules) return childrenIds;

                const collectAllChildren = (item: CourseItem) => {
                    if (item.subModules) {
                        item.subModules.forEach(subModule => {
                            childrenIds.push(subModule._id);
                            collectAllChildren(subModule);
                        });
                    }

                    if (item.topics) {
                        item.topics.forEach(topic => {
                            childrenIds.push(topic._id);
                            collectAllChildren(topic);
                        });
                    }

                    if (item.subTopics) {
                        item.subTopics.forEach(subTopic => {
                            childrenIds.push(subTopic._id);
                        });
                    }

                    if (item.children) {
                        item.children.forEach(child => {
                            childrenIds.push(child._id);
                            collectAllChildren(child);
                        });
                    }
                };

                const findItemAndCollectChildren = (items: CourseItem[]): boolean => {
                    for (const item of items) {
                        if (item._id === itemId) {
                            collectAllChildren(item);
                            return true;
                        }

                        let found = false;

                        if (item.subModules) {
                            found = findItemAndCollectChildren(item.subModules);
                            if (found) return true;
                        }

                        if (item.topics) {
                            found = findItemAndCollectChildren(item.topics);
                            if (found) return true;
                        }

                        if (item.subTopics) {
                            found = findItemAndCollectChildren(item.subTopics);
                            if (found) return true;
                        }

                        if (item.children) {
                            found = findItemAndCollectChildren(item.children);
                            if (found) return true;
                        }
                    }
                    return false;
                };

                findItemAndCollectChildren(courseData.modules);
                return childrenIds;
            };

            const getFilteredItemsForLevel = (levelIndex: number): CourseItem[] => {
                const allItems = getAllItemsForLevel(levelIndex);

                if (levelIndex === 0) {
                    return allItems;
                }

                if (levelIndex === 2) {
                    const selectedModules = getAllItemsForLevel(0)
                        .filter(module => selectedTopics.includes(module._id));

                    if (selectedModules.length === 0) {
                        return allItems;
                    }

                    return allItems.filter(topic => {
                        return selectedModules.some(module => {
                            if (module.topics?.some(t => t._id === topic._id)) {
                                return true;
                            }

                            if (module.subModules) {
                                return module.subModules.some(subModule =>
                                    subModule.topics?.some(t => t._id === topic._id)
                                );
                            }

                            return false;
                        });
                    });
                }

                if (levelIndex === 3) {
                    const selectedTopicsList = getAllItemsForLevel(2)
                        .filter(topic => selectedTopics.includes(topic._id));

                    if (selectedTopicsList.length === 0) {
                        return allItems;
                    }

                    return allItems.filter(subTopic => {
                        return selectedTopicsList.some(topic =>
                            topic.subTopics?.some(st => st._id === subTopic._id)
                        );
                    });
                }

                return allItems;
            };

            const getAvailableLevels = () => {
                const levels = [
                    { name: "Module", index: 0 },
                    { name: "Sub-module", index: 1 },
                    { name: "Topic", index: 2 },
                    { name: "Sub-topic", index: 3 }
                ];

                return levels.filter(level => {
                    const items = getFilteredItemsForLevel(level.index);

                    if (level.index === 2) {
                        const hasSelectedModules = getAllItemsForLevel(0)
                            .some(module => selectedTopics.includes(module._id));
                        return items.length > 0 && hasSelectedModules;
                    }

                    if (level.index === 3) {
                        const hasSelectedTopics = getAllItemsForLevel(2)
                            .some(topic => selectedTopics.includes(topic._id));
                        return items.length > 0 && hasSelectedTopics;
                    }

                    return items.length > 0;
                });
            };

            const availableLevels = getAvailableLevels();

            const isAllSelectedInLevel = (levelIndex: number): boolean => {
                const items = getFilteredItemsForLevel(levelIndex);
                if (items.length === 0) return false;
                return items.every(item => selectedTopics.includes(item._id));
            };

            const getSelectedCountInLevel = (levelIndex: number): number => {
                const items = getFilteredItemsForLevel(levelIndex);
                return items.filter(item => selectedTopics.includes(item._id)).length;
            };

            const handleItemSelect = (item: CourseItem, isSelected: boolean) => {
                if (isSelected) {
                    setSelectedTopics(prev => prev.filter(id => id !== item._id));
                } else {
                    const newSelection = [...selectedTopics, item._id];

                    const childIds = getAllChildrenForItem(item._id);
                    childIds.forEach(childId => {
                        if (!newSelection.includes(childId)) {
                            newSelection.push(childId);
                        }
                    });

                    setSelectedTopics(newSelection);
                }
            };

            const handleSelectAllInLevel = (levelIndex: number) => {
                const items = getFilteredItemsForLevel(levelIndex);

                if (isAllSelectedInLevel(levelIndex)) {
                    const itemsToDeselect: string[] = [];
                    items.forEach(item => {
                        itemsToDeselect.push(item._id);
                        const childIds = getAllChildrenForItem(item._id);
                        itemsToDeselect.push(...childIds);
                    });

                    setSelectedTopics(prev => prev.filter(id => !itemsToDeselect.includes(id)));
                } else {
                    const newSelection = [...selectedTopics];
                    items.forEach(item => {
                        if (!newSelection.includes(item._id)) {
                            newSelection.push(item._id);
                        }

                        const childIds = getAllChildrenForItem(item._id);
                        childIds.forEach(childId => {
                            if (!newSelection.includes(childId)) {
                                newSelection.push(childId);
                            }
                        });
                    });
                    setSelectedTopics(newSelection);
                }
            };
            const LevelDropdown = ({ levelName, levelIndex }: { levelName: string, levelIndex: number }) => {
                const [searchQuery, setSearchQuery] = useState("");

                const items = getFilteredItemsForLevel(levelIndex);
                const selectedCount = getSelectedCountInLevel(levelIndex);
                const allSelected = isAllSelectedInLevel(levelIndex);
                const isOpen = openDropdownIndex === levelIndex;

                const filteredItems = searchQuery
                    ? items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    : items;

                if (items.length === 0) {
                    return null;
                }

                const getLevelLabel = () => {
                    switch (levelName) {
                        case "Module": return "Modules";
                        case "Sub-module": return "Sub-modules";
                        case "Topic": return "Topics";
                        case "Sub-topic": return "Sub-topics";
                        default: return `${levelName}s`;
                    }
                };

                return (
                    <div className="relative">
                        <div
                            className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px] cursor-pointer flex items-center justify-between hover:border-blue-400 transition-colors h-10"
                            onClick={() => {
                                setOpenDropdownIndex(isOpen ? null : levelIndex);
                                setSearchQuery("");
                            }}
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                    {allSelected ? (
                                        <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    ) : selectedCount > 0 ? (
                                        <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded-sm flex items-center justify-center">
                                            <span className="text-[9px] font-bold text-blue-600">{selectedCount}</span>
                                        </div>
                                    ) : (
                                        <div className="w-4 h-4 border border-gray-400 rounded-sm"></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex flex-col justify-center h-full">
                                        <span className="font-medium text-gray-700 truncate block text-[11px] leading-tight">
                                            {getLevelLabel()}
                                        </span>
                                        <span className="text-[9px] truncate block leading-tight">
                                            {selectedCount === 0 ?
                                                <span className="text-gray-400">No items selected</span> :
                                                <span className="text-gray-500">{selectedCount} selected</span>
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-[300px] flex flex-col">
                                <div className="sticky top-0 p-2 border-b border-gray-200 bg-gray-50 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-semibold text-gray-800">{getLevelLabel()}</span>
                                            <span className="text-[10px] text-gray-500 ml-1">({items.length})</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdownIndex(null);
                                                setSearchQuery("");
                                            }}
                                            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded ml-1 flex-shrink-0"
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={`Search ${levelName.toLowerCase()}s...`}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <label
                                    className="flex items-center gap-2 p-2 border-b border-gray-200 hover:bg-blue-50 cursor-pointer bg-blue-50/50 h-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectAllInLevel(levelIndex);
                                    }}
                                >
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={() => { }}
                                            className="sr-only peer"
                                        />
                                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all duration-150
                  ${allSelected
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'border-gray-400 bg-white hover:border-blue-500'
                                            }`}
                                        >
                                            {allSelected && (
                                                <Check className="w-2.5 h-2.5 text-white" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-xs font-bold text-blue-700">
                                            Select All
                                        </span>
                                    </div>
                                    {allSelected && (
                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                    )}
                                </label>

                                <div className="flex-1 overflow-y-auto">
                                    {filteredItems.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-xs">
                                            No items found matching "{searchQuery}"
                                        </div>
                                    ) : (
                                        filteredItems.map((item) => {
                                            const isSelected = selectedTopics.includes(item._id);

                                            let parentInfo = "";
                                            if (item.type === 'submodule' && item.parentModuleTitle) {
                                                parentInfo = `from ${item.parentModuleTitle}`;
                                            } else if (item.type === 'topic') {
                                                if (item.parentSubModuleTitle) {
                                                    parentInfo = `${item.parentSubModuleTitle} → ${item.parentModuleTitle}`;
                                                } else if (item.parentModuleTitle) {
                                                    parentInfo = `from ${item.parentModuleTitle}`;
                                                }
                                            } else if (item.type === 'subtopic') {
                                                if (item.parentTopicTitle) {
                                                    parentInfo = `${item.parentTopicTitle} → ${item.parentModuleTitle}`;
                                                }
                                            }

                                            return (
                                                <label
                                                    key={item._id}
                                                    className="flex items-start gap-2 p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 group min-h-9"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleItemSelect(item, isSelected);
                                                    }}
                                                >
                                                    <div className="relative flex items-start pt-0.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => { }}
                                                            className="sr-only peer"
                                                        />
                                                        <div className={`w-3.5 h-3.5 border-2 rounded flex items-center justify-center transition-all duration-150
                        ${isSelected
                                                                ? 'bg-blue-500 border-blue-500'
                                                                : 'border-gray-300 bg-white group-hover:border-blue-400'
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <Check className="w-2 h-2 text-white" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-xs text-gray-800 truncate block">{item.title}</span>
                                                        {parentInfo && (
                                                            <span className="text-[10px] text-gray-500 truncate block mt-0.5">
                                                                {parentInfo}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isSelected && (
                                                        <Check className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                                                    )}
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            };
            const buildSelectedItemsTree = () => {
                if (!courseData?.modules) return [];

                const tree: Array<{
                    item: CourseItem,
                    type: string,
                    children: Array<any>,
                    level: number
                }> = [];

                const selectedModules = getAllItemsForLevel(0)
                    .filter(module => selectedTopics.includes(module._id));

                selectedModules.forEach(module => {
                    const moduleNode = {
                        item: module,
                        type: 'module',
                        children: [],
                        level: 0
                    };

                    const selectedSubModules = getAllItemsForLevel(1)
                        .filter(subModule =>
                            selectedTopics.includes(subModule._id) &&
                            subModule.parentModuleId === module._id
                        );

                    selectedSubModules.forEach(subModule => {
                        const subModuleNode = {
                            item: subModule,
                            type: 'submodule',
                            children: [],
                            level: 1
                        };

                        const selectedTopicsUnderSubModule = getAllItemsForLevel(2)
                            .filter(topic =>
                                selectedTopics.includes(topic._id) &&
                                topic.parentSubModuleId === subModule._id
                            );

                        selectedTopicsUnderSubModule.forEach(topic => {
                            const topicNode = {
                                item: topic,
                                type: 'topic',
                                children: [],
                                level: 2
                            };

                            const selectedSubTopics = getAllItemsForLevel(3)
                                .filter(subTopic =>
                                    selectedTopics.includes(subTopic._id) &&
                                    subTopic.parentTopicId === topic._id
                                );

                            selectedSubTopics.forEach(subTopic => {
                                topicNode.children.push({
                                    item: subTopic,
                                    type: 'subtopic',
                                    children: [],
                                    level: 3
                                });
                            });

                            subModuleNode.children.push(topicNode);
                        });

                        moduleNode.children.push(subModuleNode);
                    });

                    const selectedTopicsUnderModule = getAllItemsForLevel(2)
                        .filter(topic =>
                            selectedTopics.includes(topic._id) &&
                            topic.parentModuleId === module._id &&
                            !topic.parentSubModuleId
                        );

                    selectedTopicsUnderModule.forEach(topic => {
                        const topicNode = {
                            item: topic,
                            type: 'topic',
                            children: [],
                            level: 2
                        };

                        const selectedSubTopics = getAllItemsForLevel(3)
                            .filter(subTopic =>
                                selectedTopics.includes(subTopic._id) &&
                                subTopic.parentTopicId === topic._id
                            );

                        selectedSubTopics.forEach(subTopic => {
                            topicNode.children.push({
                                item: subTopic,
                                type: 'subtopic',
                                children: [],
                                level: 3
                            });
                        });

                        moduleNode.children.push(topicNode);
                    });

                    tree.push(moduleNode);
                });

                return tree;
            };

            const selectedItemsTree = buildSelectedItemsTree();

            return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-1">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[76rem] h-[95vh] flex flex-col m-1">

                        <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-white">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-gray-900 text-sm">Course Summary</span>

                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowTutorial(true)}
                                    className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                    title="Show tutorial"
                                >
                                    <span className="w-4 h-4 flex items-center justify-center">?</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowModuleModal(false);
                                        setModalMessages([]);
                                        setNavigationSteps([]);
                                        setSelectedItemPath([]);
                                        setSelectedTopics([]);
                                        setOpenDropdownIndex(null);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-semibold text-gray-700">Choose Content to Summarize</h3>
                                        {selectedTopics.length > 0 && (
                                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                {selectedTopics.length} selected
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {selectedTopics.length > 0 && (
                                            <button
                                                onClick={() => setSelectedTopics([])}
                                                className="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                            >
                                                Clear All
                                            </button>
                                        )}


                                    </div>
                                </div>


                                <div className="flex flex-wrap gap-2 mt-2">
                                    {availableLevels.length > 0 ? (
                                        availableLevels.map(level => (
                                            <div
                                                key={level.index}
                                                data-tutorial="module-dropdown"
                                                className="relative"
                                            >
                                                <LevelDropdown
                                                    levelName={level.name}
                                                    levelIndex={level.index}
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full text-center py-2">
                                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
                                                <MousePointer className="w-3 h-3 text-blue-500" />
                                                <span className="text-blue-700">Select modules to begin</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <button
                                            data-tutorial="generate-button"
                                            onClick={handleDynamicSummarize}
                                            disabled={modalLoading || selectedTopics.length === 0} // Remove modalUploadedFile check
                                            className={`px-4 py-3 text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-out flex items-center gap-2 
        ${selectedTopics.length > 0
                                                    ? 'bg-gradient-to-r from-[#6ECBFF] to-[#3BA9FF] text-white hover:from-[#7BD7FF] hover:to-[#4EB7FF]'
                                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Generate Summary
                                        </button>
                                    </div>
                                </div>

                                {selectedTopics.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowSelectedItems(!showSelectedItems);
                                                }}
                                                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                                            >
                                                {showSelectedItems ? (
                                                    <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                    <ChevronRight className="w-3 h-3" />
                                                )}
                                                <span>Selected Items ({selectedTopics.length})</span>
                                            </button>
                                        </div>
                                        {showSelectedItems && (
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between mb-2 px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                                                            <Layers className="w-3 h-3 text-blue-600" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-800">
                                                            Selected ({selectedTopics.length})
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowSelectedItems(false);
                                                        }}
                                                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                                                    >
                                                        Hide
                                                    </button>
                                                </div>

                                                <div className="max-h-68 overflow-y-auto p-3 bg-white rounded-lg border border-gray-200">
                                                    {selectedItemsTree.length === 0 ? (
                                                        <div className="text-center py-4">
                                                            <div className="w-8 h-8 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                                                                <Layers className="w-4 h-4 text-gray-400" />
                                                            </div>
                                                            <p className="text-xs text-gray-500">Select items to see hierarchy</p>
                                                        </div>
                                                    ) : (
                                                        <div className="relative">
                                                            <div className="absolute left-[13px] top-0 bottom-0 w-px bg-gray-300" />

                                                            <div className="space-y-1.5 pl-5">
                                                                {selectedItemsTree.map((moduleNode, moduleIndex) => (
                                                                    <div key={moduleNode.item._id} className="relative">
                                                                        <div className="relative group">
                                                                            <div className="absolute -left-[14px] top-1/2 w-[14px] h-px bg-gray-300" />

                                                                            <div className="absolute -left-[15px] top-1/2 w-[8px] h-[8px] bg-blue-500 rounded-full transform -translate-y-1/2 z-10" />

                                                                            <div className="flex items-center justify-between pl-4 pr-2 py-1.5 bg-blue-50/70 rounded border border-blue-200 w-full group-hover:border-blue-300 transition-colors">
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                    <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                                                                                        <BookOpen className="w-2.5 h-2.5 text-white" />
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <span className="text-xs font-semibold text-blue-800 truncate block">
                                                                                            {moduleNode.item.title}
                                                                                        </span>
                                                                                        <div className="flex items-center gap-1 mt-0.5">
                                                                                            <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                                                                                Module
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedTopics(prev => prev.filter(id => id !== moduleNode.item._id));
                                                                                    }}
                                                                                    className="w-5 h-5 flex items-center justify-center text-blue-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                                                    title="Remove module"
                                                                                >
                                                                                    <X className="w-2.5 h-2.5" />
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {moduleNode.children.length > 0 && (
                                                                            <div className="ml-3 mt-1.5 space-y-1.5 relative">
                                                                                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-300" />

                                                                                {moduleNode.children.map((childNode, childIndex) => (
                                                                                    <div key={childNode.item._id} className="relative group/child pl-4">
                                                                                        <div className="absolute -left-[8px] top-1/2 w-[8px] h-px bg-gray-300" />

                                                                                        <div className="absolute -left-[9px] top-1/2 w-[6px] h-[6px] bg-green-500 rounded-full transform -translate-y-1/2 z-10" />

                                                                                        <div className="flex items-center justify-between pl-4 pr-2 py-1.5 bg-white rounded border border-gray-200 w-full group-hover/child:border-blue-200 transition-colors">
                                                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${childNode.type === 'submodule' ? 'bg-green-100' : 'bg-orange-100'}`}>
                                                                                                    {childNode.type === 'submodule' ? (
                                                                                                        <FileText className="w-2 h-2 text-green-600" />
                                                                                                    ) : (
                                                                                                        <File className="w-2 h-2 text-orange-600" />
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <span className="text-xs font-medium text-gray-800 truncate block">
                                                                                                        {childNode.item.title}
                                                                                                    </span>
                                                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${childNode.type === 'submodule' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                                                                                                            {childNode.type === 'submodule' ? 'Sub-module' : 'Topic'}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setSelectedTopics(prev => prev.filter(id => id !== childNode.item._id));
                                                                                                }}
                                                                                                className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover/child:opacity-100"
                                                                                                title={`Remove ${childNode.type}`}
                                                                                            >
                                                                                                <X className="w-2 h-2" />
                                                                                            </button>
                                                                                        </div>

                                                                                        {childNode.children.length > 0 && (
                                                                                            <div className="ml-3 mt-1.5 space-y-1 relative">
                                                                                                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-300" />

                                                                                                {childNode.children.map((subTopicNode, subIndex) => (
                                                                                                    <div key={subTopicNode.item._id} className="relative group/subtopic pl-4">
                                                                                                        <div className="absolute -left-[8px] top-1/2 w-[8px] h-px bg-gray-300" />

                                                                                                        <div className="absolute -left-[9px] top-1/2 w-[4px] h-[4px] bg-gray-500 rounded-full transform -translate-y-1/2 z-10" />

                                                                                                        <div className="flex items-center justify-between pl-4 pr-1.5 py-1 bg-gray-50 rounded border border-gray-150 w-full group-hover/subtopic:border-blue-100 transition-colors">
                                                                                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                                                                <div className="w-3 h-3 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                                                                                                    <File className="w-1.5 h-1.5 text-gray-600" />
                                                                                                                </div>
                                                                                                                <span className="text-xs text-gray-700 truncate">
                                                                                                                    {subTopicNode.item.title}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <button
                                                                                                                onClick={(e) => {
                                                                                                                    e.stopPropagation();
                                                                                                                    setSelectedTopics(prev => prev.filter(id => id !== subTopicNode.item._id));
                                                                                                                }}
                                                                                                                className="w-3.5 h-3.5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover/subtopic:opacity-100"
                                                                                                                title="Remove sub-topic"
                                                                                                            >
                                                                                                                <X className="w-1.5 h-1.5" />
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 px-6 relative">
                                {modalMessages.length === 0 && !modalLoading && (
                                    <div className="h-full flex flex-col items-center justify-center p-8">
                                        {selectedTopics.length === 0 ? (
                                            <div className="text-center max-w-md">
                                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Sparkles className="w-10 h-10 text-blue-400" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-700 mb-3">Generate Course Summary</h3>
                                                <p className="text-sm text-gray-500 leading-relaxed">
                                                    Select modules, topics, or sub-topics from the dropdowns above to create a comprehensive AI summary.
                                                    <br /><br />
                                                    Or <span className="text-blue-500 font-medium">upload a file</span> from the top-right corner to include additional content.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-center max-w-md">
                                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <Sparkles className="w-10 h-10 text-blue-400" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Ready to Generate!</h3>
                                                <p className="text-sm text-gray-500 mb-4">
                                                    {selectedTopics.length > 0 && modalUploadedFile ? (
                                                        <>You've selected {selectedTopics.length} course items and uploaded 1 file.</>
                                                    ) : selectedTopics.length > 0 ? (
                                                        <>You've selected {selectedTopics.length} items for summarization.</>
                                                    ) : (
                                                        <>You've uploaded a file for summarization.</>
                                                    )}
                                                </p>
                                                <div className="flex justify-center">
                                                    <button
                                                        onClick={handleDynamicSummarize}
                                                        disabled={modalLoading}
                                                        className="px-6 py-3 text-sm font-semibold bg-gradient-to-r from-[#64B5F6] to-[#42a5f5] text-white rounded-lg hover:from-[#42a5f5] hover:to-[#2196F3] shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        <Sparkles className="w-4 h-4" />
                                                        Generate Summary
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {modalMessages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`relative ${message.role === "user" ? "text-right" : ""}`}
                                    >
                                        <div
                                            className={`inline-block relative mt-5 ${message.role === "user"
                                                ? "bg-[#e9e9e980] text-dark rounded-2xl rounded-br-none"
                                                : "bg-white-50 text-dark rounded-2xl rounded-bl-none"
                                                }`}
                                        >
                                            {/* Only show action buttons for non-system, non-status AI messages */}
                                            {message.role === "assistant" &&
                                                !isSystemOrStatusMessage(message.content) && (
                                                    <div className="absolute -top-8 right-0 flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleCopyMessage(message.content, message.id)}
                                                            className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${copiedMessageId === message.id ? 'text-green-500' : 'text-gray-500 hover:text-gray-700'}`}
                                                            title="Copy"
                                                        >
                                                            {copiedMessageId === message.id ? (
                                                                <Check className="w-4 h-4" />
                                                            ) : (
                                                                <Copy className="w-4 h-4" />
                                                            )}
                                                        </button>

                                                        <button
                                                            onClick={() => handleDownloadMessage(message.content, "Summary")}
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                            title="Download"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => handleSaveToNotes(message.content, "Summary")}
                                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                            title="Save to notes"
                                                        >
                                                            <Bookmark className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}

                                            <div className="px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
                                                {message.content}
                                            </div>

                                            {/* Only show bottom action bar for non-system, non-status AI messages */}
                                            {message.role === "assistant" &&
                                                !isSystemOrStatusMessage(message.content) && (
                                                    <div className="px-4 pb-3 pt-4 border-t border-gray-100 flex items-center justify-between mt-4">

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleCopyMessage(message.content, message.id)}
                                                                className={`p-1.5 hover:bg-gray-100 rounded-full ${copiedMessageId === message.id ? 'text-green-500' : 'text-gray-500 hover:text-gray-700'}`}
                                                                title="Copy"
                                                            >
                                                                {copiedMessageId === message.id ? (
                                                                    <Check className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>

                                                            <button
                                                                onClick={() => handleDownloadMessage(message.content, "Summary")}
                                                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                                                title="Download"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>

                                                            <button
                                                                onClick={() => handleSaveToNotes(message.content, "Summary")}
                                                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                                                title="Save to notes"
                                                            >
                                                                <Bookmark className="w-3.5 h-3.5" />
                                                            </button>

                                                            <button
                                                                onClick={() => handleRegenerateMessage(message.id)}
                                                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                                                                title="Regenerate"
                                                            >
                                                                <RefreshCw className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                ))}

                                {modalMessages.length > 1 && <FloatingNavigation />}

                                <div ref={modalMessagesEndRef} id="modal-messages-end" />

                                {modalLoading && (
                                    <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[115] flex items-center justify-center">
                                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 border border-gray-200">
                                            <div className="text-center">
                                                <div className="relative inline-block mb-6">
                                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center">
                                                        <div className="relative">
                                                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                                            <Sparkles className="w-6 h-6 text-blue-400 absolute -top-2 -right-2 animate-pulse" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute -top-3 -right-3">
                                                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
                                                            <span className="text-sm font-bold text-white">
                                                                {selectedTopics.length > 0 ? selectedTopics.length : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-bold text-gray-800 mb-3">🚀 Generating Summary</h3>
                                                <p className="text-gray-600 mb-6">
                                                    {selectedTopics.length > 0 ? (
                                                        <>Processing {selectedTopics.length} selected item{selectedTopics.length !== 1 ? 's' : ''}</>
                                                    ) : (
                                                        <>Processing content</>
                                                    )}
                                                </p>

                                                <div className="w-72 h-3 bg-gray-200 rounded-full overflow-hidden mb-6 mx-auto">
                                                    <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full relative">
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2 animate-[shimmer_2s_infinite]"></div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-left max-w-xs mx-auto">
                                                    {selectedTopics.length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                                <Check className="w-3 h-3 text-green-600" />
                                                            </div>
                                                            <span className="text-sm text-gray-700">
                                                                {selectedTopics.length} course item{selectedTopics.length !== 1 ? 's' : ''} selected
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                            <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                                                        </div>
                                                        <span className="text-sm text-gray-700">Processing content</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                                        </div>
                                                        <span className="text-sm text-gray-500">Generating AI summary</span>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-500 mt-6">
                                                    Please wait while we analyze the content...
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-200 p-2 bg-white">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ask AI about the summary..."
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                const input = e.target as HTMLInputElement;
                                                if (input.value.trim()) {
                                                    handleModalSend(input.value.trim());
                                                    input.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.querySelector('input[placeholder*="Ask AI"]') as HTMLInputElement;
                                            if (input && input.value.trim()) {
                                                handleModalSend(input.value.trim());
                                                input.value = '';
                                            }
                                        }}
                                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm hover:shadow transition-all duration-200"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {openDropdownIndex !== null && (
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenDropdownIndex(null)}
                            />
                        )}
                    </div>
                </div>
            );
        };
        // Add this import at the top if not already
        // import { Info, MousePointer } from "lucide-react"
        return (
            <>
                <div className={`${isFullscreen ? 'p-4' : 'p-3'} border-b border-gray-100`}>
                    <div className={`${isFullscreen ? 'max-w-6xl mx-8' : ''}`}>
                        {/* Title - Minimal */}
                        <div className="mb-2">
                            <span className="text-sm text-gray-600">
                                Summarize content:
                            </span>
                        </div>

                        {/* Buttons Container - Minimal */}
                        <div className="flex flex-wrap gap-2">
                            {(context.isPDF || context.fileType === 'ppt' || context.fileType === 'video') && (
                                <button
                                    onClick={async () => {
                                        setSelectedHierarchyLevel("Current Document");
                                        const documentType = context.isPDF ? 'PDF' :
                                            context.fileType === 'ppt' ? 'PRESENTATION' :
                                                context.fileType === 'video' ? 'VIDEO' : 'DOCUMENT';
                                        const summaryRequest = `Please provide a comprehensive summary of this ${documentType} document: "${context.fileName || 'Document'}"\n\nFocus on:\n• Main topics and key concepts covered\n• Important definitions and terminology\n• Practical applications and examples\n• Key takeaways and learning points\n• Study recommendations\n\nFormat with clear headings and bullet points for easy reading.`;
                                        handleAutoSummary(summaryRequest, context.pdfUrl, context.fileType);
                                    }}
                                    className={`px-3 py-2 rounded-lg border transition-all duration-150 flex items-center gap-2 group cursor-pointer ${selectedHierarchyLevel === "Current Document"
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                                        }`}
                                >
                                    <FileText className={`w-3.5 h-3.5 ${selectedHierarchyLevel === "Current Document" ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'
                                        }`} />
                                    <span className="text-xs font-medium">Document</span>
                                </button>
                            )}

                            <button
                                onClick={() => setShowModuleModal(true)}
                                className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 transition-all duration-150 flex items-center gap-2 group cursor-pointer"
                            >
                                <BookOpen className="w-3.5 h-3.5 text-gray-500 group-hover:text-green-600" />
                                <span className="text-xs font-medium">Course</span>
                            </button>

                            <button
                                onClick={() => {
                                    const fileInput = document.createElement('input');
                                    fileInput.type = 'file';
                                    fileInput.accept = ".pdf,.ppt,.pptx,.mp4,.avi,.mov,.txt,.doc,.docx";
                                    fileInput.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) {
                                            handleMainChatFileUpload(file);
                                        }
                                    };
                                    fileInput.click();
                                }}
                                disabled={isUploading || isLoading}
                                className={`px-3 py-2 rounded-lg border transition-all duration-150 flex items-center gap-2 group cursor-pointer ${isUploading || isLoading
                                    ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50'
                                    }`}
                                title="Upload file for summarization"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                                        <span className="text-xs font-medium">Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-600" />
                                        <span className="text-xs font-medium">Upload</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Selected item indicator - Minimal */}
                        {/* {selectedHierarchyLevel && (
                            <div className="mt-2 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                <span className="text-xs text-gray-600">
                                    Summarizing: <span className="font-medium">{selectedHierarchyLevel}</span>
                                </span>
                            </div>
                        )} */}
                    </div>
                </div>

                {/* Module Selection Modal */}
                {renderModuleModal()}
            </>
        );
    };
    // Remove the showHierarchySelector state and all its usages since we don't need it anymore
    // Remove this line: const [showHierarchySelector, setShowHierarchySelector] = useState(true)

    // Update clearChat function to remove setShowHierarchySelector
    const clearChat = () => {
        setMessages([])
        setSelectedHierarchyLevel(null)
        setInput("")
        setUserTopicResponse(null) // Reset user response

        // Show welcome message again
        const welcomeMessage: Message = {
            id: generateUniqueId(),
            content: "I'm ready to help you summarize learning content! Ask me anything or select an item above to summarize.",
            role: "assistant",
            timestamp: new Date(),
            isStreaming: false
        }
        setMessages([welcomeMessage])
    }

    // Remove the renderNewSummaryButton function since we don't need it anymore
    // The hierarchy selector is always visible now
    // Copy message to clipboard
    const handleCopyMessage = async (content: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageId(messageId);

            // Reset copied indicator after 2 seconds
            setTimeout(() => {
                setCopiedMessageId(null);
            }, 2000);

            console.log('Message copied to clipboard');
        } catch (err) {
            console.error('Failed to copy message: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        }
    };

    // Download message as text file
    const handleDownloadMessage = (content: string, title: string = "AI Summary") => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Save message to notes
    const handleSaveToNotes = (content: string, title: string = "AI Summary") => {
        setSummaryToCopy(content);
        setCopyTitle(title);
        setShowCopyModal(true);
    };


    // Regenerate message
    const handleRegenerateMessage = (messageId: string) => {
        // Find the message to regenerate
        const messageToRegenerate = messages.find(msg => msg.id === messageId);

        if (messageToRegenerate && selectedHierarchyLevel) {
            // Remove the current message
            setMessages(prev => prev.filter(msg => msg.id !== messageId));

            // Re-trigger summary generation based on context
            if (context.hierarchy && context.hierarchy.length > 0) {
                const levelPath = context.hierarchy;
                const summaryRequest = generateSummaryRequest(levelPath, "auto", context.pdfUrl, context.fileType);
                handleAutoSummary(summaryRequest, context.pdfUrl, context.fileType);
            }
        }
    };


    // Function to handle copying summary to notes
    const handleCopyToNotes = (content: string) => {
        setSummaryToCopy(content)
        setCopyTitle(selectedHierarchyLevel || context.topicTitle || "AI Summary")
        setShowCopyModal(true)
    }

    // Function to save to notes
    const saveToNotes = async () => {
        if (!copyTitle.trim() || !summaryToCopy.trim()) return;

        try {
            const token = localStorage.getItem('smartcliff_token');

            if (!token) {
                alert('Please log in to save notes');
                return;
            }

            const noteData = {
                title: copyTitle,
                content: summaryToCopy,
                tags: ['ai-summary'],
                isPinned: false,
                color: "#ffffff"
            };

            // Use the same service function as notes panel
            const createdNote = await createNote(noteData, token); // Get the created note

            // Show confirmation
            setCopiedSummary(true);
            setShowCopyModal(false);

            // 🔥 CRITICAL: Store the created note ID in localStorage
            localStorage.setItem('lastCreatedNoteId', createdNote._id);

            // Also store the complete note data for immediate access
            localStorage.setItem('lastCreatedNote', JSON.stringify(createdNote));

            // Dispatch events to notify all components
            window.dispatchEvent(new CustomEvent('notesDataUpdated', {
                detail: {
                    action: 'created',
                    noteTitle: copyTitle,
                    timestamp: new Date().toISOString(),
                    noteId: createdNote._id // Include note ID in event
                }
            }));

            // Also trigger React Query invalidation
            window.dispatchEvent(new CustomEvent('refreshNotes'));

            setTimeout(() => setCopiedSummary(false), 3000);

        } catch (error: any) {
            console.error('Error saving note:', error);
            alert(`Failed to save note: ${error.message}`);
        }
    };

    if (!isOpen) return null

    return (
        <div className={`fixed bg-white border-l border-gray-200 shadow-xl z-[100] flex flex-col ${isFullscreen
            ? "inset-0 z-[100]"
            : "inset-y-0 right-0 w-96"
            }`}>
            {/* Header - Clean design */}
            {/* Header - Clean design */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-gray-800">AI Summary</h3>
                        <p className="text-xs text-gray-500">Generate summaries of your content</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={clearChat}
                        className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                        title="New summary"
                    >
                        New
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-4 h-4" />
                        ) : (
                            <Maximize2 className="w-4 h-4" />
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Hierarchy Selection Buttons */}
            {renderHierarchyButtons()}

            {/* Messages Container - Main area for displaying chat messages */}
            <div className={`flex-1 overflow-y-auto space-y-4 bg-white  ${isFullscreen ? 'px-12' : 'px-4 '
                }`} style={{ minHeight: '200px' }}>                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`relative ${message.role === "user" ? "text-right" : ""}`}
                    >
                        {/* ============================================= */}
                        {/* AI MESSAGE WITH YES/NO PROMPT (BOLD TOPIC TEXT) */}
                        {/* This section handles AI messages that ask for Yes/No confirmation */}
                        {/* ============================================= */}

                        {message.role === "assistant" &&
                            (message.content.includes("Would you like me to summarize") ||
                                message.content.includes("Summarize this topic?")) && (
                                <div className={`inline-block relative mt-5 ${isFullscreen ? "lg:w-1/4" : "lg:w-3/4"}`}>
                                    {/* Message bubble container */}
                                    <div className="bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl shadow-sm px-4 py-3 text-sm whitespace-pre-wrap">
                                        {/* Message content */}
                                        <div className="mb-3">
                                            {message.content.split('\n').map((line, index) => {
                                                if (line.includes('**')) {
                                                    const boldMatch = line.match(/\*\*(.*?)\*\*/);
                                                    const beforeBold = line.split('**')[0];
                                                    const boldText = boldMatch ? boldMatch[1] : '';
                                                    const afterBold = line.split('**')[2] || '';

                                                    return (
                                                        <p key={index} className="mb-2">
                                                            {beforeBold}
                                                            <span className="font-bold text-gray-900">{boldText}</span>
                                                            {afterBold}
                                                        </p>
                                                    );
                                                }
                                                return <p key={index} className={index > 0 ? "mt-2" : ""}>{line}</p>;
                                            })}
                                        </div>

                                        {/* Generate Button */}
                                        <div className="mt-4 border-t border-gray-100">
                                            <div className="flex flex-col items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        setIsLoading(true);
                                                        // Generate summary for the current topic
                                                        if (pendingTopicToSummarize) {
                                                            const summaryRequest = generateSummaryRequest(
                                                                pendingTopicToSummarize.hierarchy,
                                                                pendingTopicToSummarize.level,
                                                                context.pdfUrl,
                                                                context.fileType
                                                            );
                                                            handleAutoSummary(
                                                                summaryRequest,
                                                                context.pdfUrl,
                                                                context.fileType
                                                            );
                                                        }
                                                    }}
                                                    disabled={isLoading}
                                                    className={`px-4 py-2 min-w-[140px] rounded-lg flex items-center justify-center gap-2
                                text-sm font-medium transition-all duration-200 border cursor-pointer
                                ${isLoading
                                                            ? "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
                                                            : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                                                        }`}
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <div className="w-4 h-4 border-[2px] border-current border-t-transparent rounded-full animate-spin"></div>
                                                            <span>Generating...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="w-4 h-4" />
                                                            <span>Generate Summary</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {message.role === "user" &&
                            message.content === "Yes, summarize it" && (
                                <div className="inline-block relative mt-5 ml-auto">
                                    <div className={`rounded-lg px-4 py-2 text-sm ${userTopicResponse === "yes" ? "bg-green-50 text-green-700 border border-green-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                                        <div className="flex items-center gap-2">
                                            {userTopicResponse === "yes" ? (
                                                <RefreshCw className="w-3 h-3" />
                                            ) : (
                                                <Check className="w-3 h-3" />
                                            )}
                                            <span>{userTopicResponse === "yes" ? "Regenerate summary" : "Generate summary"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        {/* ============================================= */}
                        {/* REGULAR AI MESSAGE (SUMMARY OR OTHER RESPONSES) */}
                        {/* This handles all other AI messages (not Yes/No prompts) */}
                        {/* ============================================= */}
                        {message.role === "assistant" &&
                            !message.content.includes("Would you like me to summarize") &&
                            !message.content.includes("Summarize this topic?") &&
                            !message.isStreaming && (
                                <div className="inline-block relative mt-8">
                                    {/* Only show action buttons for non-system, non-status AI messages */}
                                    {!isWelcomeMessage(message.content) &&
                                        !isSystemOrStatusMessage(message.content) && (
                                            <div className="absolute -top-8 right-0 flex items-center gap-2 mb-4">
                                                <button
                                                    onClick={() => handleCopyMessage(message.content, message.id)}
                                                    className={`p-1.5 hover:bg-gray-100 rounded-full transition-colors ${copiedMessageId === message.id
                                                        ? 'text-green-500 bg-gray-100'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                    title={copiedMessageId === message.id ? "Copied!" : "Copy message"}
                                                >
                                                    {copiedMessageId === message.id ? (
                                                        <Check className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>

                                                <button
                                                    onClick={() => handleDownloadMessage(message.content, selectedHierarchyLevel || "AI Summary")}
                                                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                    title="Download as text file"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </button>

                                                <button
                                                    onClick={() => handleSaveToNotes(message.content, selectedHierarchyLevel || "AI Summary")}
                                                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                    title="Save to notes"
                                                >
                                                    <Bookmark className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}

                                    {/* AI MESSAGE BUBBLE */}
                                    <div className="bg-white text-gray-800 px-4 py-3 text-sm whitespace-pre-wrap">
                                        {message.content}
                                    </div>

                                    {/* Only show bottom action bar for non-system, non-status AI messages */}
                                    {!isWelcomeMessage(message.content) &&
                                        !isSystemOrStatusMessage(message.content) && (
                                            <div className="flex items-center justify-between mt-3">
                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                    <span>
                                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {message.wordCount && (
                                                        <>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                            <span>{message.wordCount} words</span>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleCopyMessage(message.content, message.id)}
                                                        className={`p-1.5 hover:bg-gray-100 rounded-full transition-colors ${copiedMessageId === message.id
                                                            ? 'text-green-500'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                            }`}
                                                        title="Copy message"
                                                    >
                                                        {copiedMessageId === message.id ? (
                                                            <Check className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={() => handleDownloadMessage(message.content, selectedHierarchyLevel || "AI Summary")}
                                                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleSaveToNotes(message.content, selectedHierarchyLevel || "AI Summary")}
                                                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                        title="Save to notes"
                                                    >
                                                        <Bookmark className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleRegenerateMessage(message.id)}
                                                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                        title="Regenerate response"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            )}

                        {/* ============================================= */}
                        {/* REGULAR USER MESSAGE (NOT YES/NO RESPONSES) */}
                        {/* Handles all user messages except Yes/No responses */}
                        {/* ============================================= */}
                        {message.role === "user" &&
                            !message.isStreaming &&
                            message.content !== "Yes, summarize it" &&
                            message.content !== "No, not now" && (
                                <div
                                    className={`inline-block relative mt-5 ml-auto ${isFullscreen ? "w-auto" : "w-3/4"
                                        }`}
                                >
                                    {/* User message bubble - Light blue-gray background */}
                                    <div className="bg-[#e9e9e980] text-dark rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm">
                                        {message.content}
                                    </div>

                                </div>
                            )}

                        {/* ============================================= */}
                        {/* STREAMING MESSAGE - AI IS TYPING */}
                        {/* Shows animated typing indicator when AI is generating response */}
                        {/* ============================================= */}
                        {message.isStreaming && (
                            <div className={`inline-block relative mt-5 ${isFullscreen ? "lg:w-1/4" : "lg:w-3/4"}`}>
                                <div className="bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl shadow-sm px-4 py-3 text-sm whitespace-pre-wrap">
                                    {/* Show content as it streams */}
                                    <span>{message.content || ""}</span>
                                    {/* Show typing cursor when there's content */}
                                    {message.content && (
                                        <span className="ml-0.5 w-2 h-4 bg-blue-500 animate-pulse inline-block align-middle rounded"></span>
                                    )}
                                </div>
                                {/* "AI is typing..." indicator - only show when content is empty */}
                                {!message.content && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                        </div>
                                        <span className="text-xs text-gray-500">AI is thinking...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* ============================================= */}
                {/* LOADING INDICATOR WHEN AI IS PROCESSING */}
                {/* Shows when AI is generating a response (not streaming) */}
                {/* ============================================= */}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="sticky top-4 z-10 mb-6">
                        <div className="flex gap-3">
                            {/* AI avatar/icon */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        {/* Spinner animation */}
                                        <div className="relative">
                                            <div className="w-5 h-5">
                                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            {/* Loading text - changes based on context */}
                                            <p className="text-sm font-medium text-gray-700 mb-1">
                                                {isGeneratingSummary
                                                    ? "Generating your summary..."
                                                    : "AI is thinking..."}
                                            </p>
                                            {/* Progress bar for summary generation */}
                                            {isGeneratingSummary && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse w-1/2"></div>
                                                    </div>
                                                    <span className="text-xs text-gray-500">Processing...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================= */}
                {/* SCROLL ANCHOR - AUTO-SCROLL TO BOTTOM */}
                {/* Invisible element at bottom for auto-scrolling */}
                {/* ============================================= */}
                {/* Add this line: */}
                {isOpen && !showModuleModal && !showCopyModal && <MainChatFloatingNavigation messages={messages} />}

                {/* SCROLL ANCHOR - AUTO-SCROLL TO BOTTOM */}
                <div ref={messagesEndRef} />            </div>
            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask AI about the summary..."
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-12 bg-white transition-colors"
                            disabled={isLoading}
                        />
                        {!input.trim() && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Sparkles className="w-4 h-4 text-gray-400" />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Send</span>
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Ask AI for detailed explanations or clarifications
                </p>
            </div>

            {/* Save to Notes Modal */}
            {showCopyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120]">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 border border-gray-200 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                                    <Copy className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Save to Notes</h3>
                                    <p className="text-xs text-gray-500 mt-1">Save your AI summary</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCopyModal(false)}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Note title *
                                </label>
                                <input
                                    type="text"
                                    value={copyTitle}
                                    onChange={(e) => setCopyTitle(e.target.value)}
                                    maxLength={50}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                    placeholder="Enter note title..."
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-2 text-right">
                                    {copyTitle.length}/50 characters
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Bot className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-medium text-gray-700">Preview</span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {summaryToCopy.length} characters
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    {summaryToCopy}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setShowCopyModal(false)}
                                className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all border border-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveToNotes}
                                disabled={!copyTitle.trim()}
                                className="px-4 py-2.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
                            >
                                <Check className="w-4 h-4" />
                                Save Note
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {copiedSummary && (
                <div className="fixed top-4 right-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-4 rounded-xl shadow-2xl z-[130] max-w-sm animate-in slide-in-from-right border border-white/20">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">Note Saved Successfully!</p>
                            <p className="text-sm opacity-90 mt-1">
                                Your summary has been added to notes.
                            </p>
                            <button
                                onClick={() => {
                                    onClose();
                                    setCopiedSummary(false);
                                    window.dispatchEvent(new CustomEvent('force-open-notes-in-viewer'));
                                    window.dispatchEvent(new CustomEvent('open-notes-panel'));
                                    const noteId = localStorage.getItem('lastCreatedNoteId');
                                    if (noteId) {
                                        window.dispatchEvent(new CustomEvent('notes-data-updated', {
                                            detail: {
                                                action: 'created',
                                                noteId: noteId
                                            }
                                        }));
                                    }
                                    window.dispatchEvent(new CustomEvent('refreshNotes'));
                                }}
                                className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 w-full justify-center"
                            >
                                <FileText className="w-4 h-4" />
                                Open Notes Panel
                            </button>
                        </div>
                        <button
                            onClick={() => setCopiedSummary(false)}
                            className="w-6 h-6 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {
                showTutorial && showModuleModal && (
                    <SummaryTutorial
                        isOpen={showTutorial}
                        hasGeneratedFirstSummary={tutorialStep >= 3}
                        hasUploadedFile={tutorialStep >= 4}
                        onComplete={handleTutorialComplete}
                    />
                )
            }
        </div>
    )
}