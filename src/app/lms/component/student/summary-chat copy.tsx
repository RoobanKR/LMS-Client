"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
    X, Sparkles, Send, Bot, Copy, Check, Loader2, Minimize2, Maximize2, File, FileText, ChevronRight, ChevronDown,
    Download, Bookmark, Share2, RefreshCw, CheckCircle, MousePointer, Layers, ChevronUp, Upload, BookOpen
} from "lucide-react"
import { createNote } from "@/apiServices/notesPanelService";
import SummaryTutorial from './SummaryTutorial'
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

const BACKEND_API_URL = "http://localhost:5533";

export default function SummaryChat({ isOpen, onClose, context }: SummaryChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
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
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [showSelectionPopup, setShowSelectionPopup] = useState(false);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
    const [showSelectedItems, setShowSelectedItems] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [hasDeclinedTopicSummary, setHasDeclinedTopicSummary] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [modalUploadedFile, setModalUploadedFile] = useState<any>(null);
    const [showTutorial, setShowTutorial] = useState(false)
    const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false)
    const [firstTimeOpen, setFirstTimeOpen] = useState(true)
    const [tutorialStep, setTutorialStep] = useState(0)
    const [showTopicConfirmation, setShowTopicConfirmation] = useState(false);
    const [pendingTopicToSummarize, setPendingTopicToSummarize] = useState<{
        topic: string;
        hierarchy: string[];
        level: string;
    } | null>(null);
    const [userTopicResponse, setUserTopicResponse] = useState<"yes" | "no" | null>(null);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [likedMessages, setLikedMessages] = useState(new Set());

    const modalMessagesEndRef = useRef<HTMLDivElement>(null);

    // Generate unique ID
    const generateUniqueId = () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    // Check if message is system/status
    const isSystemOrStatusMessage = (content: string): boolean => {
        const systemPatterns = [
            "✅ Successfully extracted", "📄 Extracting content", "Extracting content from",
            "Successfully extracted", "Loading course structure", "Generating course summary",
            "AI is thinking", "Generating summary...", "🔄 Starting summary generation...",
            "📥 Extracting content", "✅ Extracted", "🤖 Generating AI summary", "Processing content..."
        ];

        return systemPatterns.some(pattern => content.toLowerCase().includes(pattern.toLowerCase())) || 
               content.includes("I'm ready to help you summarize");
    };

    // Check if welcome message
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


    // Add this function for streaming file summary
const generateFileSummaryStreaming = async (fileName: string, fileType: string, content: string, destination: 'modal' | 'main' = 'main') => {
    const isForMain = destination === 'main';
    
    // Create a streaming message
    const streamingMessageId = generateUniqueId();
    const streamingMessage: Message = {
        id: streamingMessageId,
        content: "Generating summary...",
        role: "assistant",
        timestamp: new Date(),
        isStreaming: true
    };

    if (isForMain) {
        setMessages(prev => [...prev, streamingMessage]);
    } else {
        setModalMessages(prev => [...prev, streamingMessage]);
    }

    try {
        // Use streaming endpoint
        const response = await fetch(`${BACKEND_API_URL}/api/gemini/generate-summary-stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: content,
                context: {
                    title: fileName,
                    type: fileType
                },
                fileData: {
                    fileName: fileName,
                    fileType: fileType
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Streaming request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                
                                if (data.type === 'chunk' && data.content) {
                                    fullResponse += data.content;
                                    
                                    // Update streaming message
                                    const updateMessage: Message = {
                                        id: streamingMessageId,
                                        content: fullResponse,
                                        role: "assistant",
                                        timestamp: new Date(),
                                        isStreaming: true
                                    };

                                    if (isForMain) {
                                        setMessages(prev => 
                                            prev.map(msg => 
                                                msg.id === streamingMessageId ? updateMessage : msg
                                            )
                                        );
                                    } else {
                                        setModalMessages(prev => 
                                            prev.map(msg => 
                                                msg.id === streamingMessageId ? updateMessage : msg
                                            )
                                        );
                                    }
                                }
                                
                                if (data.type === 'complete') {
                                    // Finalize message
                                    const finalMessage: Message = {
                                        id: streamingMessageId,
                                        content: fullResponse,
                                        role: "assistant",
                                        timestamp: new Date(),
                                        isStreaming: false
                                    };

                                    if (isForMain) {
                                        setMessages(prev => 
                                            prev.map(msg => 
                                                msg.id === streamingMessageId ? finalMessage : msg
                                            )
                                        );
                                        setSelectedHierarchyLevel(`Uploaded: ${fileName}`);
                                    } else {
                                        setModalMessages(prev => 
                                            prev.map(msg => 
                                                msg.id === streamingMessageId ? finalMessage : msg
                                            )
                                        );
                                    }
                                }
                                
                                if (data.type === 'error') {
                                    throw new Error(data.error);
                                }
                            } catch (parseError) {
                                console.error('Error parsing SSE data:', parseError);
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }
        }

    } catch (error) {
        console.error('Streaming error:', error);
        
        const errorMessage: Message = {
            id: generateUniqueId(),
            content: `❌ Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
            role: "assistant",
            timestamp: new Date(),
            isStreaming: false
        };

        // Remove streaming message and add error
        if (isForMain) {
            setMessages(prev => 
                prev.filter(msg => msg.id !== streamingMessageId).concat(errorMessage)
            );
        } else {
            setModalMessages(prev => 
                prev.filter(msg => msg.id !== streamingMessageId).concat(errorMessage)
            );
        }
    }
};

// Update the handleMainChatFileUpload function to use streaming:
// Update the handleMainChatFileUpload function to use streaming:
const handleMainChatFileUpload = async (file: File) => {
    setIsUploading(true);
    
    // Clear messages and show initial message
    const initialMessage: Message = {
        id: generateUniqueId(),
        content: `📤 Uploading "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)...`,
        role: "assistant",
        timestamp: new Date(),
    };
    setMessages([initialMessage]);

    try {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch(`${BACKEND_API_URL}/api/extract-doc/upload-file`, {
            method: 'POST',
            body: formData
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok || !uploadData.success || !uploadData.data?.filePath) {
            throw new Error(uploadData.error || 'Failed to upload file');
        }

        const { filePath, fileType, fileName } = uploadData.data;

        // Update message to show extraction
        const extractingMessage: Message = {
            id: generateUniqueId(),
            content: `📄 Extracting content from "${fileName}"...`,
            role: "assistant",
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, extractingMessage]);

        // Extract content
        const extractResponse = await fetch(`${BACKEND_API_URL}/api/extract-doc/process-uploaded-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, fileType, fileName })
        });

        const extractData = await extractResponse.json();

        if (!extractData.success) {
            throw new Error(extractData.error || 'Content extraction failed');
        }

        // Clear extraction message and start streaming
        setMessages(prev => prev.filter(msg => !msg.content.includes("Extracting content")));
        
        // CORRECTED: Use the streaming function properly
        await generateFileSummaryStreaming(
            fileName, 
            fileType, 
            extractData.text || "No content extracted", 
            'main'
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


    // Backend API calls
    const callBackendSummaryAPI = async (content: string, contextData: any = {}) => {
        try {
            const response = await fetch(`${BACKEND_API_URL}/api/gemini/generate-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    context: {
                        title: contextData.title || context.topicTitle || "Summary",
                        type: contextData.type || context.fileType || "general"
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.summary) {
                return data.summary;
            } else {
                throw new Error(data.error || 'Invalid response format');
            }
        } catch (error) {
            console.error('Error calling backend API:', error);
            return `I apologize, but I encountered an error while generating the summary. Please try again later.`;
        }
    };

    // Generate file summary
    const generateFileSummary = async (fileName: string, fileType: string, content: string, destination: 'modal' | 'main' = 'main') => {
        const isForMain = destination === 'main';

        try {
            // Call backend for summary
            const summary = await callBackendSummaryAPI(content, {
                title: fileName,
                type: fileType
            });

            const summaryMessage: Message = {
                id: generateUniqueId(),
                content: summary,
                role: "assistant",
                timestamp: new Date(),
            };

            if (isForMain) {
                setMessages(prev => {
                    const filtered = prev.filter(msg =>
                        !msg.content.includes("Uploading") &&
                        !msg.content.includes("Extracting") &&
                        !msg.content.includes("Generating AI summary")
                    );
                    return [...filtered, summaryMessage];
                });
                setSelectedHierarchyLevel(`Uploaded: ${fileName}`);
            } else {
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

    // Handle dynamic summarize
    const handleDynamicSummarize = async () => {
        if (selectedTopics.length === 0 && !modalUploadedFile) return;

        setModalLoading(true);

        // Get all selected items
        const allLeafItems = getAllLeafItems();
        const selectedItems = allLeafItems.filter(item => selectedTopics.includes(item._id));
        const itemTitles = selectedItems.map(item => item.title);
        const hierarchyPath = selectedItemPath.length > 0 ? 
            selectedItemPath.map(item => item.title).join(' → ') : "course content";

        // Prepare content for backend
        let contentToSummarize = "";
        
        if (selectedTopics.length > 0) {
            contentToSummarize += `COURSE CONTENT:\nHierarchy: ${hierarchyPath}\n`;
            contentToSummarize += `Items (${selectedItems.length}):\n${itemTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')}\n\n`;
        }

        if (modalUploadedFile?.extractedContent) {
            contentToSummarize += `UPLOADED FILE: ${modalUploadedFile.name}\n`;
            contentToSummarize += `Content: ${modalUploadedFile.extractedContent.substring(0, 3000)}${modalUploadedFile.extractedContent.length > 3000 ? '...' : ''}\n`;
        }

        // Show loading message
        const loadingMessage: Message = {
            id: generateUniqueId() + "-loading",
            content: `🔄 Starting summary generation...`,
            role: "assistant",
            timestamp: new Date(),
        };
        setModalMessages(prev => [...prev, loadingMessage]);

        try {
            // Call backend API
            const summary = await callBackendSummaryAPI(contentToSummarize, {
                title: `${selectedItems.length} course items` + (modalUploadedFile ? ` + ${modalUploadedFile.name}` : ''),
                type: "combined"
            });

            // Clear loading messages
            setModalMessages(prev => prev.filter(msg => !msg.id.includes("-loading")));

            // Create messages
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

        } catch (error) {
            console.error('Error generating summary:', error);
            
            setModalMessages(prev => prev.filter(msg => !msg.id.includes("-loading")));
            
            const errorMessage: Message = {
                id: generateUniqueId(),
                content: "I apologize, but I encountered an error while generating the summary. Please try again.",
                role: "assistant",
                timestamp: new Date(),
            };

            setModalMessages(prev => [...prev, errorMessage]);
        } finally {
            setModalLoading(false);
        }
    };

    // Handle auto summary
    const handleAutoSummary = async (request: string, fileUrl?: string, fileType?: string) => {
        setIsLoading(true);
        setIsGeneratingSummary(true);
        setInput("");

        // Clear messages and show initial
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

        const loadingMessage: Message = {
            id: (Date.now() + 0.1).toString(),
            content: "🔄 Starting summary generation...",
            role: "assistant",
            timestamp: new Date(),
            isStreaming: false
        };
        setMessages(prev => [...prev, loadingMessage]);

        try {
            let extractedContent = "";

            // Extract file content if needed
            if (fileUrl && context.isDocumentView) {
                try {
                    const fileTypeName = context.fileType === 'video' ? 'Video' :
                        context.fileType === 'ppt' ? 'Presentation' : 'PDF';

                    const extractingMessage: Message = {
                        id: (Date.now() + 0.5).toString(),
                        content: `📥 Extracting content from ${fileTypeName}...`,
                        role: "assistant",
                        timestamp: new Date(),
                        isStreaming: false
                    };
                    setMessages(prev => [...prev, extractingMessage]);

                    // Use backend extraction
                    extractedContent = await extractFileContent(fileUrl, context.fileType || 'pdf', context.fileName || 'Document');

                    const processingMessage: Message = {
                        id: (Date.now() + 0.7).toString(),
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

                } catch (extractionError) {
                    console.error('File content extraction failed:', extractionError);
                }
            }

            // Combine request with extracted content
            let finalContent = request;
            if (extractedContent) {
                finalContent += `\n\nEXTRACTED CONTENT:\n${extractedContent.substring(0, 3000)}${extractedContent.length > 3000 ? '...' : ''}`;
            }

            // Call backend for summary
            const aiSummary = await callBackendSummaryAPI(finalContent, {
                title: context.topicTitle || context.fileName || "Document",
                type: context.fileType || "general"
            });

            // Clear processing messages
            setMessages(prev => prev.filter(msg =>
                !msg.content.includes("Starting summary") &&
                !msg.content.includes("Extracting content") &&
                !msg.content.includes("Processing content") &&
                !msg.content.includes("Generating AI summary") &&
                !msg.content.includes("Successfully extracted")
            ));

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: aiSummary,
                role: "assistant",
                timestamp: new Date(),
                isStreaming: false
            };

            setMessages(prev => [...prev, assistantMessage]);

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
                id: (Date.now() + 1).toString(),
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

    // Extract file content using backend
    const extractFileContent = async (fileUrl: string, fileType: string, title: string): Promise<string> => {
        try {
            if (fileType === 'video') {
                const response = await fetch(`${BACKEND_API_URL}/api/video/extract-audio`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoUrl: fileUrl, title: title })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || `Video processing failed`);
                }
                return data.transcription?.transcript || "No transcript available";
            }

            // For documents
            const endpoint = fileType === 'ppt' ? '/api/extract-doc/extract-file-text' : '/api/extract-doc/extract-pdf-text';
            const body = fileType === 'ppt' ? { fileUrl, fileType: 'ppt' } : { pdfUrl: fileUrl };

            const response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || `${fileType} extraction failed`);
            }

            return data.text || `No content extracted from ${fileType}`;

        } catch (error) {
            console.error('Error extracting file content:', error);
            throw new Error(`Failed to extract ${fileType} content`);
        }
    };

  

    // Handle send message
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
            // Call backend for response
            const aiResponse = await callBackendSummaryAPI(input, {
                title: context.topicTitle || "Follow-up",
                type: "conversation"
            });

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: aiResponse,
                role: "assistant",
                timestamp: new Date(),
                isStreaming: false
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (error) {
            console.error('Error in AI conversation:', error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
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

    // Handle modal send
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
            const aiResponse = await callBackendSummaryAPI(question, {
                title: "Follow-up question",
                type: "conversation"
            });

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

    // Get all leaf items
    const getAllLeafItems = (): CourseItem[] => {
        const items: CourseItem[] = [];
        if (selectedTopics.length === 0 || !courseData?.modules) return items;

        const findItemById = (id: string, itemsList: CourseItem[]): CourseItem | null => {
            for (const item of itemsList) {
                if (item._id === id) return item;
                let found = null;
                if (item.subModules) found = findItemById(id, item.subModules);
                if (found) return found;
                if (item.topics) found = findItemById(id, item.topics);
                if (found) return found;
                if (item.subTopics) found = findItemById(id, item.subTopics);
                if (found) return found;
                if (item.children) found = findItemById(id, item.children);
                if (found) return found;
            }
            return null;
        };

        selectedTopics.forEach(topicId => {
            const item = findItemById(topicId, courseData.modules || []);
            if (item) items.push(item);
        });

        return items;
    };

    // Copy message
    const handleCopyMessage = async (content: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Download message
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

    // Save to notes
    const handleSaveToNotes = (content: string, title: string = "AI Summary") => {
        setSummaryToCopy(content);
        setCopyTitle(title);
        setShowCopyModal(true);
    };

    // Regenerate message
    const handleRegenerateMessage = (messageId: string) => {
        const messageToRegenerate = messages.find(msg => msg.id === messageId);
        if (messageToRegenerate && selectedHierarchyLevel) {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
            // Re-trigger based on context
            if (context.hierarchy && context.hierarchy.length > 0) {
                const summaryRequest = `Summarize: ${context.hierarchy.join(' → ')}`;
                handleAutoSummary(summaryRequest, context.pdfUrl, context.fileType);
            }
        }
    };

    // Save to notes function
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

            const createdNote = await createNote(noteData, token);
            setCopiedSummary(true);
            setShowCopyModal(false);
            localStorage.setItem('lastCreatedNoteId', createdNote._id);
            localStorage.setItem('lastCreatedNote', JSON.stringify(createdNote));

            window.dispatchEvent(new CustomEvent('notesDataUpdated', {
                detail: { action: 'created', noteTitle: copyTitle, noteId: createdNote._id }
            }));
            window.dispatchEvent(new CustomEvent('refreshNotes'));

            setTimeout(() => setCopiedSummary(false), 3000);

        } catch (error: any) {
            console.error('Error saving note:', error);
            alert(`Failed to save note: ${error.message}`);
        }
    };

    // Clear chat
    const clearChat = () => {
        setMessages([])
        setSelectedHierarchyLevel(null)
        setInput("")
        setUserTopicResponse(null)

        const welcomeMessage: Message = {
            id: generateUniqueId(),
            content: "I'm ready to help you summarize learning content! Ask me anything or select an item above to summarize.",
            role: "assistant",
            timestamp: new Date(),
            isStreaming: false
        }
        setMessages([welcomeMessage])
    }

    // Toggle fullscreen
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen)
    }

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Tutorial completion
    const handleTutorialComplete = () => {
        setShowTutorial(false)
        setHasCompletedTutorial(true)
        localStorage.setItem('summaryTutorialCompleted', 'true')
    }

    // Context effect
    useEffect(() => {
        if (isOpen && !hasDeclinedTopicSummary) {
            let currentTopic = '';
            let topicHierarchy: string[] = [];

            if (context.hierarchy && context.hierarchy.length > 0) {
                currentTopic = context.hierarchy[context.hierarchy.length - 1];
                topicHierarchy = context.hierarchy;
            } else if (context.topicTitle) {
                currentTopic = context.topicTitle;
                topicHierarchy = [context.topicTitle];
            }

            if (currentTopic) {
                const isAlreadyShowingTopic = messages.some(msg =>
                    msg.role === "assistant" && msg.content.includes(`I can help with: ${currentTopic}`)
                );

                if (!isAlreadyShowingTopic && !showTopicConfirmation) {
                    setMessages([]);
                    setPendingTopicToSummarize(null);
                    setShowTopicConfirmation(false);

                    const welcomeMessage: Message = {
                        id: generateUniqueId(),
                        content: `I can help with: ${currentTopic}\n\nSummarize this topic?`,
                        role: "assistant",
                        timestamp: new Date(),
                        isStreaming: false
                    }

                    setMessages([welcomeMessage]);
                    setPendingTopicToSummarize({
                        topic: currentTopic,
                        hierarchy: topicHierarchy,
                        level: topicHierarchy.length > 1 ? "auto" : "topic"
                    });
                    setShowTopicConfirmation(true);
                }

            } else {
                setMessages([]);
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

    // Auto-scroll effect
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [messages]);

    // Fetch course data
    useEffect(() => {
        if (showModuleModal && !courseData) {
            const fetchCourseData = async () => {
                try {
                    const courseId = window.location.pathname.split('/').pop();
                    const response = await fetch(`${BACKEND_API_URL}/getAll/courses-data/${courseId}`);
                    const data = await response.json();
                    setCourseData(data.data || data);
                } catch (error) {
                    console.error('Error fetching course data:', error);
                }
            };
            fetchCourseData();
        }
    }, [showModuleModal]);

    // Module modal effect
    useEffect(() => {
        if (showModuleModal && courseData?.modules) {
            const moduleStep: NavigationStep = {
                level: 0,
                items: courseData.modules.map((m: any) => ({ ...m, type: 'module' })),
                label: "Select Module"
            };
            setNavigationSteps([moduleStep]);
            setSelectedItemPath([]);
            setSelectedTopics([]);
            setShowSelectionPopup(false);
        }
    }, [showModuleModal, courseData]);

    if (!isOpen) return null

 // Module Modal Component - Fixed back to left-right layout
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
                    {/* TOP SECTION - Selection Controls */}
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
                                    disabled={modalLoading || selectedTopics.length === 0}
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
                                            {buildSelectedItemsTree().length === 0 ? (
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
                                                        {buildSelectedItemsTree().map((moduleNode, moduleIndex) => (
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

                    {/* BOTTOM SECTION - Messages */}
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
                    </div>

                    {/* Input at bottom */}
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
            </div>
        </div>
    );
};

    // Hierarchy buttons
    const renderHierarchyButtons = () => (
        <div className={`${isFullscreen ? 'p-4' : 'p-3'} border-b border-gray-100`}>
            <div className={`${isFullscreen ? 'max-w-6xl mx-8' : ''}`}>
                <div className="mb-2">
                    <span className="text-sm text-gray-600">Summarize content:</span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(context.isPDF || context.fileType === 'ppt' || context.fileType === 'video') && (
                        <button
                            onClick={async () => {
                                setSelectedHierarchyLevel("Current Document");
                                const summaryRequest = `Please summarize this document: "${context.fileName || 'Document'}"`;
                                handleAutoSummary(summaryRequest, context.pdfUrl, context.fileType);
                            }}
                            className={`px-3 py-2 rounded-lg border transition-all duration-150 flex items-center gap-2 group cursor-pointer ${selectedHierarchyLevel === "Current Document" ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}
                        >
                            <FileText className={`w-3.5 h-3.5 ${selectedHierarchyLevel === "Current Document" ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}`} />
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
                                if (file) handleMainChatFileUpload(file);
                            };
                            fileInput.click();
                        }}
                        disabled={isUploading || isLoading}
                        className={`px-3 py-2 rounded-lg border transition-all duration-150 flex items-center gap-2 group cursor-pointer ${isUploading || isLoading ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed' : 'border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50'}`}
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
            </div>
        </div>
    );

    return (
        <div className={`fixed bg-white border-l border-gray-200 shadow-xl z-[100] flex flex-col ${isFullscreen ? "inset-0 z-[100]" : "inset-y-0 right-0 w-96"}`}>
            {/* Header */}
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
                    <button onClick={clearChat} className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200" title="New summary">New</button>
                    <button onClick={toggleFullscreen} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600" title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"><X className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Hierarchy Buttons */}
            {renderHierarchyButtons()}

            {/* Messages Container */}
            <div className={`flex-1 overflow-y-auto space-y-4 bg-white ${isFullscreen ? 'px-12' : 'px-4 '}`} style={{ minHeight: '200px' }}>
                {messages.map((message) => (
                    <div key={message.id} className={`relative ${message.role === "user" ? "text-right" : ""}`}>
                        
                        {/* AI Message with Yes/No Prompt */}
                        {message.role === "assistant" && message.content.includes("Summarize this topic?") && (
                            <div className={`inline-block relative mt-5 ${isFullscreen ? "lg:w-1/4" : "lg:w-3/4"}`}>
                                <div className="bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl shadow-sm px-4 py-3 text-sm whitespace-pre-wrap">
                                    <div className="mb-3">
                                        {message.content.split('\n').map((line, index) => (
                                            <p key={index} className={index > 0 ? "mt-2" : ""}>{line}</p>
                                        ))}
                                    </div>
                                    <div className="mt-4 border-t border-gray-100">
                                        <div className="flex flex-col items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    setIsLoading(true);
                                                    if (pendingTopicToSummarize) {
                                                        const summaryRequest = `Summarize: ${pendingTopicToSummarize.hierarchy.join(' → ')}`;
                                                        handleAutoSummary(summaryRequest, context.pdfUrl, context.fileType);
                                                    }
                                                }}
                                                disabled={isLoading}
                                                className={`px-4 py-2 min-w-[140px] rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 border cursor-pointer ${isLoading ? "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"}`}
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

                        {/* Regular AI Message */}
                        {message.role === "assistant" && !message.content.includes("Summarize this topic?") && !message.isStreaming && (
                            <div className="inline-block relative mt-8">
                                {!isSystemOrStatusMessage(message.content) && !isWelcomeMessage(message.content) && (
                                    <div className="absolute -top-8 right-0 flex items-center gap-2 mb-4">
                                        <button onClick={() => handleCopyMessage(message.content, message.id)} className={`p-1.5 hover:bg-gray-100 rounded-full transition-colors ${copiedMessageId === message.id ? 'text-green-500 bg-gray-100' : 'text-gray-500 hover:text-gray-700'}`} title={copiedMessageId === message.id ? "Copied!" : "Copy message"}>
                                            {copiedMessageId === message.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                        <button onClick={() => handleDownloadMessage(message.content, selectedHierarchyLevel || "AI Summary")} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="Download">
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleSaveToNotes(message.content, selectedHierarchyLevel || "AI Summary")} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors" title="Save to notes">
                                            <Bookmark className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                                <div className="bg-white text-gray-800 px-4 py-3 text-sm whitespace-pre-wrap">
                                    {message.content}
                                </div>
                                {!isSystemOrStatusMessage(message.content) && !isWelcomeMessage(message.content) && (
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="text-xs text-gray-500">
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleCopyMessage(message.content, message.id)} className={`p-1.5 hover:bg-gray-100 rounded-full ${copiedMessageId === message.id ? 'text-green-500' : 'text-gray-500 hover:text-gray-700'}`} title="Copy">
                                                {copiedMessageId === message.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => handleDownloadMessage(message.content, selectedHierarchyLevel || "AI Summary")} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full" title="Download">
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleSaveToNotes(message.content, selectedHierarchyLevel || "AI Summary")} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full" title="Save to notes">
                                                <Bookmark className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleRegenerateMessage(message.id)} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full" title="Regenerate">
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User Message */}
                        {message.role === "user" && !message.isStreaming && message.content !== "Yes, summarize it" && message.content !== "No, not now" && (
                            <div className={`inline-block relative mt-5 ml-auto ${isFullscreen ? "w-auto" : "w-3/4"}`}>
                                <div className="bg-[#e9e9e980] text-dark rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm">
                                    {message.content}
                                </div>
                            </div>
                        )}

                        {/* Streaming Message */}
                        {message.isStreaming && (
                            <div className={`inline-block relative mt-5 ${isFullscreen ? "lg:w-1/4" : "lg:w-3/4"}`}>
                                <div className="bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl shadow-sm px-4 py-3 text-sm whitespace-pre-wrap">
                                    <span>{message.content}</span>
                                    <span className="ml-0.5 w-2 h-4 bg-blue-500 animate-pulse inline-block align-middle rounded"></span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">AI is typing...</div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="sticky top-4 z-10 mb-6">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-5 h-5">
                                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-700 mb-1">
                                                {isGeneratingSummary ? "Generating your summary..." : "AI is thinking..."}
                                            </p>
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

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Ask AI about the summary..." className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-12 bg-white transition-colors" disabled={isLoading} />
                        {!input.trim() && <div className="absolute right-3 top-1/2 transform -translate-y-1/2"><Sparkles className="w-4 h-4 text-gray-400" /></div>}
                    </div>
                    <button onClick={handleSend} disabled={!input.trim() || isLoading} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow">
                        {isLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Send className="w-4 h-4" />}
                        <span className="hidden sm:inline">Send</span>
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Ask AI for detailed explanations or clarifications</p>
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
                            <button onClick={() => setShowCopyModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">×</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Note title *</label>
                                <input type="text" value={copyTitle} onChange={(e) => setCopyTitle(e.target.value)} maxLength={50} className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm" placeholder="Enter note title..." autoFocus />
                                <p className="text-xs text-gray-500 mt-2 text-right">{copyTitle.length}/50 characters</p>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Bot className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-medium text-gray-700">Preview</span>
                                    </div>
                                    <span className="text-xs text-gray-500">{summaryToCopy.length} characters</span>
                                </div>
                                <div className="text-sm text-gray-600 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    {summaryToCopy}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
                            <button onClick={() => setShowCopyModal(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all border border-gray-300">Cancel</button>
                            <button onClick={saveToNotes} disabled={!copyTitle.trim()} className="px-4 py-2.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium">
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
                            <p className="text-sm opacity-90 mt-1">Your summary has been added to notes.</p>
                            <button
                                onClick={() => {
                                    onClose();
                                    setCopiedSummary(false);
                                    window.dispatchEvent(new CustomEvent('force-open-notes-in-viewer'));
                                    window.dispatchEvent(new CustomEvent('open-notes-panel'));
                                    const noteId = localStorage.getItem('lastCreatedNoteId');
                                    if (noteId) window.dispatchEvent(new CustomEvent('notes-data-updated', { detail: { action: 'created', noteId: noteId } }));
                                    window.dispatchEvent(new CustomEvent('refreshNotes'));
                                }}
                                className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 w-full justify-center"
                            >
                                <FileText className="w-4 h-4" />
                                Open Notes Panel
                            </button>
                        </div>
                        <button onClick={() => setCopiedSummary(false)} className="w-6 h-6 flex items-center justify-center text-white/70 hover:text-white transition-colors">×</button>
                    </div>
                </div>
            )}

            {/* Module Modal */}
            {renderModuleModal()}

            {/* Tutorial */}
            {showTutorial && showModuleModal && (
                <SummaryTutorial
                    isOpen={showTutorial}
                    hasGeneratedFirstSummary={tutorialStep >= 3}
                    hasUploadedFile={tutorialStep >= 4}
                    onComplete={handleTutorialComplete}
                />
            )}
        </div>
    )
}