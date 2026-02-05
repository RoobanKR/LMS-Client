"use client"

import { useMemo } from "react"
import React, { useState, useRef, useCallback, useEffect } from "react"
import {
    ChevronRight,
    ChevronDown,
    ChevronLeft,
    File,
    Upload,
    FileText,
    Video,
    Archive,
    Trash2,
    Eye,
    Download,
    BookOpen,
    Users,
    Target,
    Brain,
    HelpCircle,
    GripVertical,
    Settings,
    X,
    Plus,
    Presentation,
    RefreshCw,
    FolderPlus,
    Folder,
    Edit2,
    Link,
    FileArchive,
    Link2,
    BookPlus,
    Tag,
    FolderOpen,
    Lock,
    LockKeyhole,
    Globe,
    CheckCircle,
    AlertCircle,
    EyeOff,
    Loader2,
    AlertTriangle,
    Search,
    SquareChevronRight,
    ExternalLink,
    MoreVertical,
    Home,
    Filter,
    ChevronUp,
    FolderTree,
    ArrowUp,
    Book,
    BookA,
    BookCopy,
    ClipboardList,
    List,

} from "lucide-react"
import { Icon } from 'lucide-react';
import dynamic from "next/dynamic";
import 'react-quill/dist/quill.snow.css';
import { useQuery } from "@tanstack/react-query"
import { courseDataApi, entityApi, type CourseStructureData, type Module, type SubModule, type Topic, type SubTopic, updateFileSettingsInComponent } from "@/apiServices/coursesData"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import { showErrorToast, showSuccessToast } from "@/components/ui/toastUtils";
import PDFViewer from "../../../component/pdfView"
import VideoViewer from "../../../component/videosViewer"
import ZipViewer from "../../../component/zipViewer";
import PPTViewer from "../../../component/pptView";
import RichTextDisplay from "@/app/lms/component/RichTextDisplay";
import ProblemSolving from "../../../component/ProblemSolving";
import { Navbar } from "../../../component/navbar";

interface CourseNode {
    id: string
    name: string
    type: "course" | "module" | "submodule" | "topic" | "subtopic"
    children?: CourseNode[]
    level: number
    originalData?: any
}
interface Tag {
    tagName: string;
    tagColor: string;
}
interface UploadedFile {
    id: string
    name: string
    type?: string
    size?: number
    url?: string
    uploadedAt?: Date
    subcategory: string
    folderId: string | null
    progress?: number
    status?: "preparing" | "uploading" | "ready" | "submitting" | "completed" | "error"
    tags?: Tag[]
    folderPath?: string
    isReference?: boolean | string
    isVideo?: boolean
    originalFileName?: string
    description?: string
    accessLevel?: string
    availableResolutions?: string[]
    // Add fileSettings
    fileSettings?: {
        showToStudents: boolean
        allowDownload: boolean
        lastModified?: Date
    }
}

interface FolderItem {
    id: string
    name: string
    type: "folder"
    parentId: string | null
    children: (FolderItem | UploadedFile)[] // Make sure this is always an array
    tabType: "I_Do" | "weDo" | "youDo"
    subcategory: string
    files?: UploadedFile[]
    subfolders?: FolderItem[]
    tags?: Tag[]
    folderPath?: string
}

interface SubcategoryData {
    [key: string]: (UploadedFile | FolderItem)[]
}

interface ContentData {
    I_Do: SubcategoryData
    weDo: SubcategoryData
    youDo: SubcategoryData
    [key: string]: SubcategoryData
}

interface VideoItem {
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    availableResolutions: string[];
    isVideo: boolean;
}

export default function DynamicLMSCoordinator() {
    const searchParams = useSearchParams()
    const courseId = searchParams.get("courseId")

    const { data: courseStructureResponse, isLoading, error } = useQuery(courseDataApi.getById(courseId || ""))

    const getDeepestLevelType = (courseData: CourseStructureData): string => {
        for (const module of courseData.modules) {
            for (const topic of module.topics) {
                if (topic.subTopics && topic.subTopics.length > 0) {
                    return "subtopic"
                }
            }
            for (const subModule of module.subModules) {
                for (const topic of subModule.topics) {
                    if (topic.subTopics && topic.subTopics.length > 0) {
                        return "subtopic"
                    }
                }
            }
        }

        for (const module of courseData.modules) {
            if (module.topics && module.topics.length > 0) {
                return "topic"
            }
            for (const subModule of module.subModules) {
                if (subModule.topics && subModule.topics.length > 0) {
                    return "topic"
                }
            }
        }

        for (const module of courseData.modules) {
            if (module.subModules && module.subModules.length > 0) {
                return "submodule"
            }
        }
        return "module"
    }

    const transformToCourseNodes = (courseData: CourseStructureData): CourseNode[] => {
        const courseNode: CourseNode = {
            id: courseData._id,
            name: courseData.courseName,
            type: "course",
            level: 0,
            originalData: courseData,
            children: courseData.modules.map((module: Module, moduleIndex: number) => ({
                id: module._id,
                name: module.title,
                type: "module" as const,
                level: 1,
                originalData: module,
                children: [
                    ...module.topics.map((topic: Topic, topicIndex: number) => ({
                        id: topic._id,
                        name: topic.title,
                        type: "topic" as const,
                        level: 2,
                        originalData: topic,
                        children: topic.subTopics.map((subTopic: SubTopic, subTopicIndex: number) => ({
                            id: subTopic._id,
                            name: subTopic.title,
                            type: "subtopic" as const,
                            level: 3,
                            originalData: subTopic,
                        })),
                    })),
                    ...module.subModules.map((subModule: SubModule, subModuleIndex: number) => ({
                        id: subModule._id,
                        name: subModule.title,
                        type: "submodule" as const,
                        level: 2,
                        originalData: subModule,
                        children: subModule.topics.map((topic: Topic, topicIndex: number) => ({
                            id: topic._id,
                            name: topic.title,
                            type: "topic" as const,
                            level: 3,
                            originalData: topic,
                            children: topic.subTopics.map((subTopic: SubTopic, subTopicIndex: number) => ({
                                id: subTopic._id,
                                name: subTopic.title,
                                type: "subtopic" as const,
                                level: 4,
                                originalData: subTopic,
                            })),
                        })),
                    })),
                ],
            })),
        }
        return [courseNode]
    }

    const [courseData, setCourseData] = useState<CourseNode[]>([])
    const [deepestLevelType, setDeepestLevelType] = useState<string>("subtopic")

    useEffect(() => {
        if (courseStructureResponse?.data) {
            const transformedData = transformToCourseNodes(courseStructureResponse.data)
            setCourseData(transformedData)
            const deepest = getDeepestLevelType(courseStructureResponse.data)
            setDeepestLevelType(deepest)
            setExpandedNodes(new Set([courseStructureResponse.data._id]))
        }
    }, [courseStructureResponse])

    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
    const [selectedNode, setSelectedNode] = useState<CourseNode | null>(null)
    const [activeTab, setActiveTab] = useState<"I_Do" | "weDo" | "youDo">("I_Do")
    // Convert frontend tab keys to backend tab keys used by the API
    const toBackendTab = (tab: "I_Do" | "weDo" | "youDo"): "I_Do" | "We_Do" | "You_Do" => {
        if (tab === "weDo") return "We_Do";
        if (tab === "youDo") return "You_Do";
        return "I_Do";
    }
    const [activeSubcategory, setActiveSubcategory] = useState<string>("")
    const [contentData, setContentData] = useState<Record<string, ContentData>>({})
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
    const [sidebarWidth, setSidebarWidth] = useState(280)
    const [isResizing, setIsResizing] = useState(false)
    const [showUploadDropdown, setShowUploadDropdown] = useState(false)
    const [showResourcesModal, setShowResourcesModal] = useState(false)
    const [text, setText] = useState(''); // State for Editor content
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [selectedFileType, setSelectedFileType] = useState<string>("")
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
    const [documentSettings, setDocumentSettings] = useState<{
        [key: string]: { studentShow: boolean; downloadAllow: boolean }
    }>({})
    const [uploadingFiles, setUploadingFiles] = useState<UploadedFile[]>([])
    const Editor = dynamic(() => import("primereact/editor").then(mod => mod.Editor), { ssr: false });
    const [showPDFViewer, setShowPDFViewer] = React.useState(false)
    const [currentPDFUrl, setCurrentPDFUrl] = React.useState("")
    const [currentPDFName, setCurrentPDFName] = React.useState("")
    const [showVideoViewer, setShowVideoViewer] = React.useState(false)
    const [currentVideoUrl, setCurrentVideoUrl] = React.useState("")
    const [currentVideoName, setCurrentVideoName] = React.useState("")
    const [updateFileId, setUpdateFileId] = useState<string | null>(null)
    const [updateFileType, setUpdateFileType] = useState<string>("")
    const [updateTabType, setUpdateTabType] = useState<"I_Do" | "weDo" | "youDo">("I_Do")
    const [updateSubcategory, setUpdateSubcategory] = useState<string>("")
    const [folders, setFolders] = useState<FolderItem[]>([])
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")
    const [isButtonLoading, setIsButtonLoading] = useState(false);
    const [expandedUploadSection, setExpandedUploadSection] = useState<string | null>("description");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [tagColor, setTagColor] = useState('');
    const [expandedSection, setExpandedSection] = useState<string | null>('folderName');
    const [folderTags, setFolderTags] = useState<Tag[]>([]);
    const [currentTag, setCurrentTag] = useState('');
    const [accessLevel, setAccessLevel] = useState('private');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [folderUrl, setFolderUrl] = useState('')
    const [urlFileName, setUrlFileName] = useState('')
    const [urlFileType, setUrlFileType] = useState('url/link')
    const [currentVideoResolutions, setCurrentVideoResolutions] = useState<string[]>([]);
    const [videoPlaylist, setVideoPlaylist] = useState<VideoItem[]>([])
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
    // Add this to your existing state declarations
    const [activeComponent, setActiveComponent] = useState<string | null>(null);
    const [isResourcesModalLoading, setIsResourcesModalLoading] = useState(false);
    const [breadcrumbs, setBreadcrumbs] = useState<Array<{ label: string; path?: string }>>([]);
    const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
    // Add this with your other state declarations
    const [questionBanks, setQuestionBanks] = useState<any[]>([]);
    // First, add this state to track the new question bank being created
    const [selectedQuestionBank, setSelectedQuestionBank] = useState<any>(null);


    // Change to:
    const [newQuestionBank, setNewQuestionBank] = useState({
        name: '',
        description: '',
        tags: [] as string[],
        // accessLevel removed
        settings: {
            allowDuplicates: false,
            maxQuestionsPerQuiz: 20,
            randomization: true,
            showHints: true,
            showExplanation: true,
            timeLimit: 30
        }
    });

    // Updated filter state - removed dateModified and changed fileType to array for checkboxes
    const [activeFilters, setActiveFilters] = useState({
        fileTypes: [] as string[], // Changed to array for multiple selections
        searchFilter: ''
    });


    useEffect(() => {
        // When tab changes, update component visibility
        if (activeTab === "weDo" && activeSubcategory) {
            // Find the subcategory component
            const currentSubcat = subcategories.weDo.find(sub => sub.key === activeSubcategory);
            if (currentSubcat?.component) {
                setActiveComponent(currentSubcat.component);
            } else {
                setActiveComponent("Practical"); // Default for weDo
            }
        } else {
            setActiveComponent(null);
        }
    }, [activeTab, activeSubcategory]);
    useEffect(() => {
        if (courseStructureResponse?.data && selectedNode) {
            // Generate the full breadcrumb path including the selected node
            const fullBreadcrumbs = [
                { label: "Dashboard", path: "/lms/pages/admindashboard" },
                { label: "Courses", path: "/lms/pages/coursestructure" },
                { label: courseStructureResponse.data.courseName }
            ];

            // Add the hierarchy path for the selected node
            const nodeHierarchy = generateBreadcrumbs(selectedNode);
            fullBreadcrumbs.push(...nodeHierarchy.map(node => ({
                label: node.name,
                path: undefined // No path for intermediate nodes
            })));

            setBreadcrumbs(fullBreadcrumbs);
        } else if (courseStructureResponse?.data) {
            // Basic breadcrumbs when no node is selected
            setBreadcrumbs([
                { label: "Dashboard", path: "/lms/pages/admindashboard" },
                { label: "Courses", path: "/lms/pages/coursestructure" },
                { label: courseStructureResponse.data.courseName }
            ]);
        }
    }, [courseStructureResponse, selectedNode]);

    const addTag = async (tagName: string, tagColor: string = '#3B82F6') => {
        if (tagName && !folderTags.some(tag => tag.tagName === tagName)) {
            setLoading(true);
            setSuccess(false);
            await new Promise((res) => setTimeout(res, 800));
            setFolderTags([...folderTags, { tagName, tagColor }]);
            setCurrentTag('');
            setLoading(false);
            setSuccess(true);
        }
    };
    const removeTag = (index: number) => {
        setFolderTags(folderTags.filter((_, i) => i !== index));
    };
    const [folderNavigationState, setFolderNavigationState] = useState<{
        [key: string]: {
            currentFolderPath: string[]
            currentFolderId: string | null
        }
    }>({})
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null)
    const [editFolderName, setEditFolderName] = useState("")
    const [showFolderSettings, setShowFolderSettings] = useState(false)
    const [selectedFolderForSettings, setSelectedFolderForSettings] = useState<FolderItem | null>(null)
    const [hideStudentSettings, setHideStudentSettings] = useState<{ [key: string]: boolean }>({})
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ type: "folder" | "file"; item: any; name: string } | null>(null)
    const [fileNames, setFileNames] = useState<Record<string, string>>({})
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadModalRef = useRef<HTMLDivElement>(null)
    const progressContainerRef = useRef<HTMLDivElement>(null)
    const [uploadDescription, setUploadDescription] = useState('')
    const [uploadTags, setUploadTags] = useState<Tag[]>([])
    const [uploadCurrentTag, setUploadCurrentTag] = useState('')
    const [uploadTagColor, setUploadTagColor] = useState('#3B82F6')
    const [uploadAccessLevel, setUploadAccessLevel] = useState('private')
    const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<CourseNode[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showZipViewer, setShowZipViewer] = useState(false)
    const [currentZipUrl, setCurrentZipUrl] = useState("")
    const [currentZipName, setCurrentZipName] = useState("")
    const [showPPTViewer, setShowPPTViewer] = useState(false)
    const [currentPPTUrl, setCurrentPPTUrl] = useState("")
    const [currentPPTName, setCurrentPPTName] = useState("")
    const [fileDisplayNames, setFileDisplayNames] = useState<Record<string, string>>({})
    const isDisabled = !selectedDocumentId || !documentSettings[selectedDocumentId]?.studentShow;


    const handleFileClick = (file: UploadedFile, tabType: "I_Do" | "weDo" | "youDo", subcategory: string) => {
        // Handle URL/Link files - check both type and name for URL indicators
        const fileType = file.type || '';
        const fileName = file.name || '';

        // Safely handle fileUrl which can be string or object
        let fileUrl = '';
        if (typeof file.url === 'string') {
            fileUrl = file.url;
        } else if (
            file.url &&
            typeof file.url === 'object' &&
            'base' in file.url &&
            typeof (file.url as any).base === 'string'
        ) {
            // Use a safe any-cast after confirming the property exists
            fileUrl = (file.url as any).base;
        } else if (file.url) {
            // Fallback: convert to string if it's some other type
            try {
                // Prefer a 'base' field if present, otherwise stringify the value
                fileUrl = String((file.url as any)?.base ?? file.url);
            } catch {
                fileUrl = String(file.url);
            }
        }

        if (fileType.includes("url") || fileType.includes("link") || fileName.includes("http")) {
            const url = fileUrl;
            if (url && url.startsWith('http')) {
                window.open(url, '_blank', 'noopener,noreferrer');
            } else {
                alert('Invalid URL: ' + url);
            }
            return;
        }

        // Handle reference files - check both boolean true and string "true"
        const isReferenceFile = file.isReference === true || file.isReference === "true";
        if (isReferenceFile) {
            // For reference files, you can either download or preview based on file type
            if (fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
                setCurrentPDFUrl(fileUrl);
                setCurrentPDFName("Reference Guide");
                setShowPDFViewer(true);
            } else {
                // For other reference files, download or open in new tab
                window.open(fileUrl, "_blank");
            }
            return;
        }

        // Validate file URL before opening - use safe string check
        if (!fileUrl || (typeof fileUrl === 'string' && (fileUrl.includes('blob:') || fileUrl.includes('temp/')))) {
            alert('File URL is not valid or has expired. Please re-upload the file.');
            return;
        }

        // Handle PDF files
        if (fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
            setCurrentPDFUrl(fileUrl);
            setCurrentPDFName(fileName);
            setShowPDFViewer(true);
            return;
        }

        // Handle PPT/PPTX files
        if (
            fileType.includes("ppt") ||
            fileType.includes("powerpoint") ||
            fileType.includes("presentation") ||
            fileName.toLowerCase().endsWith(".ppt") ||
            fileName.toLowerCase().endsWith(".pptx")
        ) {
            setCurrentPPTUrl(fileUrl);
            setCurrentPPTName(fileName);
            setShowPPTViewer(true);
            return;
        }

        // Handle video files
        if (
            fileType.includes("video") ||
            fileName.match(/\.(mp4|avi|mov|mkv|webm|ogg|flv|wmv|m4v|3gp|mpg|mpeg)$/i)
        ) {
            handleVideoClick(file, tabType, subcategory);
            return;
        }

        // Handle ZIP files
        if (
            fileType.includes("zip") ||
            fileName.toLowerCase().endsWith(".zip") ||
            fileType.includes("archive") ||
            fileName.match(/\.(zip|rar|7z|tar|gz)$/i)
        ) {
            // Verify the URL is accessible
            fetch(fileUrl, { method: 'HEAD' })
                .then(response => {
                    if (response.ok) {
                        setCurrentZipUrl(fileUrl);
                        setCurrentZipName(fileName);
                        setShowZipViewer(true);
                    } else {
                        alert('ZIP file is not accessible. It may have been moved or deleted.');
                    }
                })
                .catch(() => {
                    alert('Failed to access ZIP file. Please check your connection and try again.');
                });
            return;
        }

        // For other files, open in new tab
        window.open(fileUrl, "_blank");
    }


    const componentMap: { [key: string]: React.ComponentType<any> } = {
        "Practical": ProblemSolving,
        // Add more mappings as needed
    };

    const uploadDropdownRef = useRef<HTMLDivElement>(null);
    const resolveComponentForSubcategory = (subcategoryName: string): string | null => {
        const name = subcategoryName.toLowerCase();

        // Define patterns that map to ProblemSolving component
        const problemSolvingPatterns = [
            'problem',
            'coding',
            'programming',
            'algorithm',
            'exercise',
            'practice',
            'solve',
            'code',
            'challenge',
            'leetcode',
            'hackerrank',
            'codewars'
        ];

        // Check if the subcategory name contains any of our patterns
        if (problemSolvingPatterns.some(pattern => name.includes(pattern))) {
            return 'problem_solving';
        }

        return null;
    };

    // First, update your subcategories configuration to be more explicit:
    const subcategories = useMemo(() => {
        if (!courseStructureResponse?.data) {
            return {
                I_Do: [],
                weDo: [],
                youDo: [],
            }
        }
        const courseData = courseStructureResponse.data

        return {
            I_Do: courseData.I_Do.map((item: string, index: number) => ({
                key: item.toLowerCase().replace(/\s+/g, "_"),
                label: item,
                icon: <Brain size={14} />,
                component: null,
            })),
            weDo: courseData.We_Do.map((item: string, index: number) => {
                const key = item.toLowerCase().replace(/\s+/g, "_");
                return {
                    key: key,
                    label: item,
                    icon: <Users size={14} />,
                    component: key === "project_development" ? null : "Practical", // Only Practical for non-project development
                };
            }),
            youDo: courseData.You_Do.map((item: string, index: number) => ({
                key: item.toLowerCase().replace(/\s+/g, "_"),
                label: item,
                icon: <HelpCircle size={14} />,
                component: null,
            })),
        }
    }, [courseStructureResponse])

    const renderQuestionBanksTable = () => {
        const questionBanksData = questionBanks.length > 0
            ? questionBanks
            : courseStructureResponse?.data?.questionBanks
            || selectedNode?.originalData?.questionBanks
            || [];

        if (questionBanksData.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                    <BookOpen size={40} className="text-gray-300 mb-3" />
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                        No Question Banks Found
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 max-w-xs">
                        Create a question bank to get started.
                    </p>
                    <button
                        onClick={() => setShowQuestionBankModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                    >
                        <BookPlus size={16} />
                        Create Question Bank
                    </button>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-[18px] font-medium text-gray-800">Problem Sets</h2>
                        <p className="text-[12px] text-gray-600 mt-1">
                            Manage and organize your problem sets efficiently
                        </p>
                    </div>
                    <button
                        onClick={() => setShowQuestionBankModal(true)}
                        className="px-2 py-2 bg-indigo-600 text-white text-[12px] font-medium rounded-sm hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                    >
                        <BookPlus size={13} />
                        New Question Bank
                    </button>
                </div>

                {/* Two-column layout - 2:8 ratio */}
                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Left side - Problem Sets Table (2 columns) */}
                    <div className="w-1/5 min-w-[200px] max-w-[300px]">
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full">
                            <div className="border-b border-gray-200 px-4 py-3">
                                <h3 className="text-sm font-semibold text-gray-900">Problem Sets</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {questionBanksData.length} sets available
                                </p>
                            </div>

                            <div className="overflow-y-auto flex-1">
                                {questionBanksData.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                       // In the question banks list rendering section
                                        {questionBanksData.map((bank, index) => {
                                            const questionCount = bank.questions?.length || 0;
                                            const isSelected = selectedQuestionBank?.id === bank.id; // Add this line

                                            return (
                                                <div
                                                    key={bank.id || index}
                                                    className={`p-2 rounded text-xs cursor-pointer transition-colors ${isSelected
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                    onClick={() => {
                                                        handleQuestionBankSelect(bank); // Call the handler
                                                        console.log('Selected bank:', bank.name);
                                                    }}
                                                >
                                                    {/* Icon and Count */}
                                                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-10">
                                                        <div className="p-2 bg-indigo-100 rounded-lg">
                                                            <List size={14} className="text-indigo-600" />
                                                        </div>
                                                        <span className="text-[10px] font-medium text-gray-600 mt-1">
                                                            {questionCount}
                                                        </span>
                                                    </div>

                                                    {/* Name and Details */}
                                                    <div className="flex-1 min-w-0 ml-3">
                                                        <span className="font-medium text-gray-900 text-sm block truncate">
                                                            {bank.name || `Set ${index + 1}`}
                                                        </span>
                                                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                            {bank.description || 'No description'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-sm p-4">
                                        No question banks available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right side - Problem Solving Component (8 columns) */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-lg border border-gray-200 h-full overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                        <BookOpen size={16} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900">
                                            Problem Solving Workspace
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Solve problems from the selected set
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                    >
                                        <Settings size={12} />
                                        Settings
                                    </button>
                                    <button
                                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                                    >
                                        <RefreshCw size={12} />
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto">
                                {(() => {
                                    // Get the currently selected question bank (for demo, use first one)
                                    const currentBank = questionBanksData[0];
                                    const questionCount = currentBank?.questions?.length || 0;

                                    if (questionCount === 0) {
                                        // Empty state when no questions
                                        return (
                                            <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                                <div className="relative mb-4">
                                                    <ClipboardList size={60} className="text-gray-300" />
                                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                                        <span className="text-xs font-bold text-red-600">0</span>
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                    No Questions Found
                                                </h3>
                                                <p className="text-gray-600 text-sm mb-6 max-w-md">
                                                    This problem set is empty. Add questions to start problem-solving activities.
                                                </p>
                                                <div className="flex gap-3">
                                                    <button
                                                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                        onClick={() => {
                                                            console.log('Browse Templates clicked (UI only)');
                                                        }}
                                                    >
                                                        <BookCopy size={16} />
                                                        Browse Templates
                                                    </button>
                                                    <button
                                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                                                        onClick={() => {
                                                            console.log('Add Question clicked (UI only)');
                                                            // You would add actual functionality here
                                                        }}
                                                    >
                                                        <Plus size={16} />
                                                        Add Question
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-6">
                                                    UI Preview - Add question functionality not implemented
                                                </p>
                                            </div>
                                        );
                                    }

                                    // Render the ProblemSolving component when questions exist
                                    return (
                                        <div className="p-6">
                                            <div className="mb-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-semibold text-gray-900">
                                                        Current Problem Set: <span className="text-indigo-600">{currentBank.name}</span>
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">
                                                            {questionCount} {questionCount === 1 ? 'question' : 'questions'} available
                                                        </span>
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                                                    <div
                                                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: '30%' }} // Example: 30% completed
                                                    ></div>
                                                </div>
                                            </div>

                                            <ProblemSolving
                                                questionBank={currentBank}
                                                onQuestionSubmit={(result) => {
                                                    console.log('Question submitted:', result);
                                                    // Handle submission logic here
                                                }}
                                                onQuestionComplete={(questionId) => {
                                                    console.log('Question completed:', questionId);
                                                    // Handle completion logic here
                                                }}
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderActiveComponent = () => {
        // SPECIAL CASE: For "Project Development" in weDo tab
        if (activeComponent === "Practical" && activeSubcategory === "project_development") {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                    <div className="text-gray-400 text-sm">
                        <FolderTree size={40} className="mx-auto mb-3 opacity-50" />
                        <p>Project Development Area</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Use the "Add Resource" button to add project materials
                        </p>
                    </div>
                </div>
            );
        }

        // For other Practical components in weDo tab
        if (activeComponent === "Practical" && activeTab === "weDo") {
            // Check if we have any question banks created
            const hasQuestionBanks = questionBanks.length > 0 ||
                (courseStructureResponse?.data?.questionBanks?.length ?? 0) > 0 ||
                (selectedNode?.originalData?.questionBanks?.length ?? 0) > 0;

            if (hasQuestionBanks && questionBanks.length > 0) {
                // Render Question Banks Table
                return renderQuestionBanksTable();
            } else if (hasQuestionBanks && questionBanks.length === 0) {
                // If banks exist elsewhere but not in local state
                return (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <BookOpen size={40} className="text-gray-300 mb-3" />
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                            Question Banks Available
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 max-w-xs">
                            Question banks exist but need to be loaded.
                        </p>
                        <button
                            onClick={() => {
                                // Add logic to fetch question banks
                                console.log("Fetch question banks");
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                        >
                            <RefreshCw size={16} />
                            Load Question Banks
                        </button>
                    </div>
                );
            } else {
                // If no question bank, show a message
                return (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <BookOpen size={40} className="text-gray-300 mb-3" />
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                            No Question Bank Available
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 max-w-xs">
                            Add questions to the question bank to enable problem-solving activities.
                        </p>
                        <button
                            onClick={() => setShowQuestionBankModal(true)}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                        >
                            <BookPlus size={16} />
                            Create Question Bank
                        </button>
                    </div>
                );
            }
        }

        // Default: Show files/folders view
        return null;
    };
    const fileTypes = useMemo(() => {
        const essentialTypes = ['FOLDER', 'ZIP', 'URL', 'REFERENCE'];
        const baseConfigMap: { [key: string]: any } = {
            FOLDER: {
                key: "folder",
                label: "New Folder",
                icon: <FolderPlus size={22} />,
                color: "#22c55e",
                tooltip: "Create a new folder to organize your resources"
            },
            PPT: {
                key: "ppt",
                label: "PPT",
                icon: <FileText size={22} />,
                color: "#f97316",
                tooltip: "Upload PowerPoint presentation files",
                accept: ".ppt,.pptx",
            },
            PDF: {
                key: "pdf",
                label: "PDF",
                icon: <FileText size={22} />,
                color: "#ef4444",
                tooltip: "Upload PDF documents and files",
                accept: ".pdf",
            },
            VIDEO: {
                key: "video",
                label: "Video",
                icon: <Video size={22} />,
                color: "#3b82f6",
                tooltip: "Upload video files or embed video content",
                accept: "video/*,.mp4,.avi,.mov,.mkv,.webm,.ogg,.flv,.wmv,.m4v,.3gp,.mpg,.mpeg,.ts,.mts,.m2ts,.vob,.ogv,.qt,.rm,.rmvb,.asf,.amv,.divx,.mxf",
            },
            ZIP: {
                key: "zip",
                label: "ZIP File",
                icon: <FileArchive size={22} />,
                color: "#a855f7",
                tooltip: "Upload compressed ZIP archive files",
                accept: ".zip,.rar,.7z,.tar,.gz",
            },
            URL: {
                key: "url",
                label: "URL",
                icon: <Link2 size={22} />,
                color: "#10b981",
                tooltip: "Add external web links and URLs",
                accept: "url",
            },
            REFERENCE: {
                key: "reference",
                label: "REFERENCE",
                icon: <BookOpen size={22} />,
                color: "#8b5cf6",
                tooltip: "Upload reference materials - files will be stored as 'Reference'",
                accept: "*",
            },
        };

        // Start with essential types
        const resultTypes = essentialTypes.map(type => baseConfigMap[type]);

        // Add dynamic types from API if available
        if (courseStructureResponse?.data?.resourcesType) {
            courseStructureResponse.data.resourcesType.forEach((type: string) => {
                const normalizedType = type.trim().toUpperCase();

                // Skip if already included in essential types
                if (essentialTypes.includes(normalizedType)) return;

                // Use base config if available, otherwise create dynamic type
                if (baseConfigMap[normalizedType]) {
                    resultTypes.push(baseConfigMap[normalizedType]);
                } else {
                    resultTypes.push({
                        key: type.toLowerCase().replace(/\s+/g, "_"),
                        label: type,
                        icon: <FileText size={22} />,
                        color: "#6b7280",
                        tooltip: `Upload ${type} files`,
                        accept: "*",
                    });
                }
            });
        }

        return resultTypes;
    }, [courseStructureResponse?.data?.resourcesType]);

    const toggleNode = (nodeId: string) => {
        const newExpanded = new Set(expandedNodes)
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId)
        } else {
            newExpanded.add(nodeId)
        }
        setExpandedNodes(newExpanded)
    }

    const getFilteredItems = (folders: FolderItem[], files: UploadedFile[]) => {
        const currentState = getCurrentNavigationState();
        const isInFolder = currentState.currentFolderId !== null;

        let filteredFolders = [...folders];
        let filteredFiles = [...files];

        // Apply search filter
        if (activeFilters.searchFilter) {
            const searchTerm = activeFilters.searchFilter.toLowerCase();

            const filterFolderContents = (folder: FolderItem): FolderItem => {
                const filteredSubfolders = (folder.subfolders || []).map(filterFolderContents);
                const filteredFolderFiles = (folder.files || []).filter(file =>
                    file.name.toLowerCase().includes(searchTerm)
                );

                return {
                    ...folder,
                    subfolders: filteredSubfolders,
                    files: filteredFolderFiles,
                    children: [...filteredSubfolders, ...filteredFolderFiles]
                };
            };

            if (isInFolder) {
                // Inside folder - filter both subfolders and files
                filteredFolders = filteredFolders.map(filterFolderContents);
                filteredFiles = filteredFiles.filter(file =>
                    file.name.toLowerCase().includes(searchTerm)
                );
            } else {
                // Root level - filter folders and files
                filteredFolders = filteredFolders.map(filterFolderContents);
                filteredFiles = filteredFiles.filter(file =>
                    file.name.toLowerCase().includes(searchTerm)
                );
            }
        }

        // Apply file type filters - if no file types selected, show all
        if (activeFilters.fileTypes.length > 0) {
            const filterByFileType = (items: (FolderItem | UploadedFile)[]): (FolderItem | UploadedFile)[] => {
                return items.filter(item => {
                    if ('type' in item && item.type === 'folder') {
                        // It's a folder - recursively filter its contents
                        const folder = item as FolderItem;
                        const filteredSubfolders = filterByFileType(folder.subfolders || []) as FolderItem[];
                        const filteredFiles = filterByFileType(folder.files || []) as UploadedFile[];

                        // Keep folder if it has any filtered content OR if folders are selected in filter
                        const hasFilteredContent = filteredSubfolders.length > 0 || filteredFiles.length > 0;
                        const foldersSelected = activeFilters.fileTypes.includes('folder');

                        if (hasFilteredContent || foldersSelected) {
                            return {
                                ...folder,
                                subfolders: filteredSubfolders,
                                files: filteredFiles,
                                children: [...filteredSubfolders, ...filteredFiles]
                            };
                        }
                        return false;
                    } else {
                        // It's a file - check file type
                        const file = item as UploadedFile;
                        const fileType = file.type?.toLowerCase() || '';
                        const fileName = file.name?.toLowerCase() || '';

                        return activeFilters.fileTypes.some(selectedType => {
                            switch (selectedType) {
                                case 'url':
                                    return fileType.includes('url') || fileType.includes('link') || fileName.includes('http');
                                case 'reference':
                                    return file.isReference === true || file.isReference === "true" || fileType.includes('reference');
                                case 'pdf':
                                    return fileType.includes('pdf') || fileName.endsWith('.pdf');
                                case 'ppt':
                                    return fileType.includes('ppt') || fileType.includes('powerpoint') ||
                                        fileName.endsWith('.ppt') || fileName.endsWith('.pptx');
                                case 'video':
                                    return fileType.includes('video') ||
                                        fileName.match(/\.(mp4|avi|mov|mkv|webm|ogg|flv|wmv|m4v|3gp|mpg|mpeg)$/i);
                                case 'zip':
                                    return fileType.includes('zip') || fileType.includes('archive') ||
                                        fileName.endsWith('.zip') || fileName.match(/\.(zip|rar|7z|tar|gz)$/i);
                                case 'folder':
                                    // Files should not match folder filter
                                    return false;
                                default:
                                    return fileType.includes(selectedType);
                            }
                        });
                    }
                });
            };

            if (isInFolder) {
                // Inside folder - filter both subfolders and files
                const allItems = [...filteredFolders, ...filteredFiles];
                const filteredItems = filterByFileType(allItems);

                filteredFolders = filteredItems.filter(item =>
                    'type' in item && item.type === 'folder'
                ) as FolderItem[];
                filteredFiles = filteredItems.filter(item =>
                    'url' in item
                ) as UploadedFile[];
            } else {
                // Root level - filter both folders and files
                const allItems = [...filteredFolders, ...filteredFiles];
                const filteredItems = filterByFileType(allItems);

                filteredFolders = filteredItems.filter(item =>
                    'type' in item && item.type === 'folder'
                ) as FolderItem[];
                filteredFiles = filteredItems.filter(item =>
                    'url' in item
                ) as UploadedFile[];
            }
        }

        return { folders: filteredFolders, files: filteredFiles };
    };
    // Add this function to initialize documentSettings from loaded files
    const initializeDocumentSettings = () => {
        if (!selectedNode || !contentData[selectedNode.id]) return;

        const settings: Record<string, { studentShow: boolean; downloadAllow: boolean }> = {};

        const extractSettingsFromItems = (items: (FolderItem | UploadedFile)[]) => {
            items.forEach(item => {
                if ('url' in item) {
                    // It's an UploadedFile
                    const file = item as UploadedFile;
                    if (file.id && file.fileSettings) {
                        // CRITICAL: Use the actual values from database, do NOT default to true
                        settings[file.id] = {
                            studentShow: file.fileSettings.showToStudents, // Use whatever value is in DB
                            downloadAllow: file.fileSettings.allowDownload, // Use whatever value is in DB
                        };
                    }
                } else if ('type' in item && item.type === 'folder') {
                    // It's a FolderItem - check its files and subfolders
                    const folder = item as FolderItem;
                    if (folder.files) {
                        folder.files.forEach(file => {
                            if (file.id && file.fileSettings) {
                                settings[file.id] = {
                                    studentShow: file.fileSettings.showToStudents,
                                    downloadAllow: file.fileSettings.allowDownload,
                                };
                            }
                        });
                    }
                    if (folder.subfolders) {
                        extractSettingsFromItems(folder.subfolders);
                    }
                }
            });
        };

        // Check all tabs and subcategories
        Object.values(contentData[selectedNode.id]).forEach(tabData => {
            Object.values(tabData).forEach(items => {
                extractSettingsFromItems(items);
            });
        });

        return settings;
    };

    useEffect(() => {
        if (selectedNode && contentData[selectedNode.id]) {
            console.log('🔍 Checking file settings from database:', {
                nodeId: selectedNode.id,
                nodeName: selectedNode.name,
                contentData: contentData[selectedNode.id]
            });

            // Debug: Log all files and their settings
            Object.entries(contentData[selectedNode.id]).forEach(([tabKey, tabData]) => {
                Object.entries(tabData).forEach(([subcatKey, items]) => {
                    items.forEach(item => {
                        if ('url' in item && item.fileSettings) {
                            console.log('📄 File with settings:', {
                                fileName: item.name,
                                fileId: item.id,
                                showToStudents: item.fileSettings.showToStudents,
                                allowDownload: item.fileSettings.allowDownload,
                                tab: tabKey,
                                subcategory: subcatKey
                            });
                        }
                    });
                });
            });
        }
    }, [selectedNode, contentData]);
    const processBackendFolders = (
        backendFolders: any[],
        parentId: string | null = null,
        tabType: "I_Do" | "weDo" | "youDo",
        subcategory: string,
        currentPath: string[] = []
    ): { folders: FolderItem[], allFiles: UploadedFile[] } => {
        const folderItems: FolderItem[] = [];
        const allFiles: UploadedFile[] = [];
        (backendFolders || []).forEach(folder => {
            const folderId = folder._id || `folder-${Date.now()}-${Math.random()}`;
            const folderPath = [...currentPath, folder.name];
            const folderFiles: UploadedFile[] = (folder.files || []).map((file: any) => {
                let fileUrl = '';
                if (typeof file.fileUrl === 'string') {
                    fileUrl = file.fileUrl;
                } else if (
                    file.fileUrl &&
                    typeof file.fileUrl === 'object' &&
                    'base' in file.fileUrl &&
                    typeof (file.fileUrl as any).base === 'string'
                ) {
                    fileUrl = (file.fileUrl as any).base;
                } else if (file.fileUrl && typeof file.fileUrl === 'object') {
                    try {
                        fileUrl = Object.values(file.fileUrl).join('');
                    } catch {
                        fileUrl = String(file.fileUrl);
                    }
                }

                // Ensure isReference is properly handled
                const isReference = file.isReference === true || file.isReference === "true";

                return {
                    id: file._id || `${Date.now()}-${Math.random()}`,
                    name: file.fileName,
                    type: file.fileType,
                    size: typeof file.size === "string" ? Number.parseInt(file.size) : file.size,
                    url: fileUrl,
                    uploadedAt: new Date(file.uploadedAt || Date.now()),
                    subcategory: subcategory,
                    folderId: folderId,
                    folderPath: folderPath.join('/'),
                    isReference: isReference,
                    // ✅ Ensure fileSettings are included with correct values
                    fileSettings: file.fileSettings ? {
                        showToStudents: file.fileSettings.showToStudents, // No default
                        allowDownload: file.fileSettings.allowDownload, // No default
                        lastModified: file.fileSettings.lastModified ? new Date(file.fileSettings.lastModified) : undefined
                    } : undefined // Don't create default settings if they don't exist
                };
            });
            const subfolderResult = processBackendFolders(
                folder.subfolders || [],
                folderId,
                tabType,
                subcategory,
                folderPath
            );
            const folderItem: FolderItem = {
                id: folderId,
                name: folder.name,
                type: "folder",
                parentId: parentId,
                children: [...subfolderResult.folders, ...folderFiles, ...subfolderResult.allFiles],
                tabType: tabType,
                subcategory: subcategory,
                files: folderFiles,
                subfolders: subfolderResult.folders,
                folderPath: folderPath.join('/')
            };
            folderItems.push(folderItem);
            allFiles.push(...folderFiles, ...subfolderResult.allFiles);
        });
        return { folders: folderItems, allFiles: allFiles };
    };

    const refreshContentData = async (node: CourseNode, backendData?: any) => {
        if (!backendData) {
            console.warn("refreshContentData called without backendData for node:", node.id);
            return;
        }

        if (backendData?.pedagogy) {
            const pedagogy = backendData.pedagogy;

            const processPedagogySection = (backendTabType: "I_Do" | "We_Do" | "You_Do", frontendTabType: "I_Do" | "weDo" | "youDo") => {
                if (!pedagogy[backendTabType]) return {};
                const sectionData: SubcategoryData = {};

                Object.keys(pedagogy[backendTabType]).forEach(subcategoryKey => {
                    const subcategoryData = pedagogy[backendTabType][subcategoryKey];
                    if (subcategoryData) {
                        const frontendKey = subcategoryKey.toLowerCase().replace(/\s+/g, "_");

                        // Process folders recursively
                        const processFoldersForUI = (folders: any[], parentId: string | null = null, currentPath: string[] = []): (FolderItem | UploadedFile)[] => {
                            const result: (FolderItem | UploadedFile)[] = [];

                            (folders || []).forEach(folder => {
                                const folderId = folder._id || `folder-${Date.now()}-${Math.random()}`;
                                const folderPath = [...currentPath, folder.name];
                                const fullFolderPath = folderPath.join('/');

                                // Process files in this folder
                                const folderFiles: UploadedFile[] = (folder.files || []).map((file: any) => {
                                    // Handle URL files differently
                                    let fileUrl = '';
                                    if (file.fileType?.includes("url") || file.fileType?.includes("link")) {
                                        fileUrl = typeof file.fileUrl === 'string' ? file.fileUrl : (file.fileUrl as any)?.base || '';
                                    } else {
                                        fileUrl = typeof file.fileUrl === 'string' ? file.fileUrl : (file.fileUrl as any)?.base || '';
                                    }

                                    return {
                                        id: file._id || `${Date.now()}-${Math.random()}`,
                                        name: file.fileName,
                                        type: file.fileType,
                                        size: typeof file.size === "string" ? Number.parseInt(file.size) : file.size || 0,
                                        url: fileUrl,
                                        uploadedAt: new Date(file.uploadedAt || Date.now()),
                                        subcategory: subcategoryKey,
                                        folderId: folderId,
                                        folderPath: fullFolderPath,
                                        tags: file.tags?.map((tag: any) => ({
                                            tagName: tag.tagName || tag.name || '',
                                            tagColor: tag.tagColor || tag.color || '#3B82F6'
                                        })) || [],
                                        fileSettings: file.fileSettings ? {
                                            showToStudents: file.fileSettings.showToStudents,
                                            allowDownload: file.fileSettings.allowDownload,
                                            lastModified: file.fileSettings.lastModified ? new Date(file.fileSettings.lastModified) : undefined
                                        } : undefined
                                    };
                                });

                                // Process subfolders
                                const subfolders = processFoldersForUI(folder.subfolders || [], folderId, folderPath);

                                const folderItem: FolderItem = {
                                    id: folderId,
                                    name: folder.name,
                                    type: "folder" as const,
                                    parentId: parentId,
                                    children: [...subfolders, ...folderFiles],
                                    tabType: frontendTabType,
                                    subcategory: subcategoryKey,
                                    files: folderFiles,
                                    subfolders: subfolders as FolderItem[],
                                    folderPath: fullFolderPath,
                                    tags: folder.tags || [],
                                };

                                result.push(folderItem);
                                result.push(...folderFiles);
                            });

                            return result;
                        };

                        const rootFiles: UploadedFile[] = (subcategoryData.files || []).map((file: any) => {
                            let fileUrl = '';
                            let fileType = file.fileType;

                            // Detect URL files
                            if (file.fileType?.includes("url") || file.fileType?.includes("link") ||
                                file.fileName?.includes("http") ||
                                (typeof file.fileUrl === 'string' && file.fileUrl.includes("http"))) {
                                fileType = "url/link";
                                fileUrl = typeof file.fileUrl === 'string' ? file.fileUrl : (file.fileUrl as any)?.base || '';
                            } else {
                                fileUrl = typeof file.fileUrl === 'string' ? file.fileUrl : (file.fileUrl as any)?.base || '';
                            }

                            return {
                                id: file._id || `${Date.now()}-${Math.random()}`,
                                name: file.fileName,
                                type: fileType,
                                size: typeof file.size === "string" ? Number.parseInt(file.size) : file.size || 0,
                                url: fileUrl,
                                uploadedAt: new Date(file.uploadedAt || Date.now()),
                                subcategory: subcategoryKey,
                                folderId: null,
                                tags: file.tags?.map((tag: any) => ({
                                    tagName: tag.tagName || tag.name || '',
                                    tagColor: tag.tagColor || tag.color || '#3B82F6'
                                })) || [],
                                fileSettings: file.fileSettings ? {
                                    showToStudents: file.fileSettings.showToStudents !== undefined ? file.fileSettings.showToStudents : true,
                                    allowDownload: file.fileSettings.allowDownload !== undefined ? file.fileSettings.allowDownload : true,
                                    lastModified: file.fileSettings.lastModified ? new Date(file.fileSettings.lastModified) : undefined
                                } : undefined
                            };
                        });

                        // Process folders
                        const uiFolders = processFoldersForUI(subcategoryData.folders || []);

                        // Combine all items
                        sectionData[frontendKey] = [...uiFolders, ...rootFiles];
                    }
                });
                return sectionData;
            };

            const updatedContentData: ContentData = {
                I_Do: processPedagogySection("I_Do", "I_Do"),
                weDo: processPedagogySection("We_Do", "weDo"),
                youDo: processPedagogySection("You_Do", "youDo"),
            };

            // Update state immediately
            setContentData(prev => ({
                ...prev,
                [node.id]: updatedContentData
            }));

            // Extract and update folders state
            const allFolders: FolderItem[] = [];
            const collectAllFolders = (items: (FolderItem | UploadedFile)[]) => {
                items.forEach(item => {
                    if ('type' in item && item.type === "folder") {
                        allFolders.push(item as FolderItem);
                        if ((item as FolderItem).children) {
                            collectAllFolders((item as FolderItem).children);
                        }
                    }
                });
            };

            Object.values(updatedContentData).forEach(tabData => {
                Object.values(tabData).forEach(items => {
                    collectAllFolders(items);
                });
            });

            // Update folders state
            setFolders(allFolders);
        }
    };

    const forceContentUpdate = (nodeId: string, tabType: string, subcategory: string, newItems: (FolderItem | UploadedFile)[]) => {
        setContentData(prev => {
            const newData = { ...prev };
            if (!newData[nodeId]) {
                newData[nodeId] = {
                    I_Do: {},
                    weDo: {},
                    youDo: {},
                };
            }

            const currentTabData = newData[nodeId][tabType as keyof ContentData];
            if (!currentTabData[subcategory]) {
                currentTabData[subcategory] = [];
            }

            // Add new items while avoiding duplicates
            const existingIds = new Set(currentTabData[subcategory].map(item => item.id));
            const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));

            currentTabData[subcategory] = [...currentTabData[subcategory], ...uniqueNewItems];

            return newData;
        });
    };
    // Add this function near your other utility functions
    const handleResourcesModalOpen = async () => {
        setIsResourcesModalLoading(true);
        setShowResourcesModal(true);

        // Force refresh current node data if selected
        if (selectedNode) {
            try {
                await refreshContentData(selectedNode);
            } catch (error) {
                console.error("Failed to refresh content data:", error);
            } finally {
                setIsResourcesModalLoading(false);
            }
        } else {
            setIsResourcesModalLoading(false);
        }
    };
    const selectNode = async (node: CourseNode) => {
        if (!node.children || node.children.length === 0) {
            setSelectedNode(node);
            updateNavigationState({ currentFolderPath: [], currentFolderId: null });

            // Set default active tab to "I_Do" (teacher lead)
            const defaultTab: "I_Do" | "weDo" | "youDo" = "I_Do";
            setActiveTab(defaultTab);

            // Get the first subcategory for the active tab
            const firstSubcategory = subcategories[defaultTab][0]?.key || "";
            setActiveSubcategory(firstSubcategory);

            // Set active component based on tab
            if (defaultTab === "weDo") {
                setActiveComponent("Practical");
            } else {
                setActiveComponent(null);
            }

            // Initialize content data if needed
            if (!contentData[node.id]) {
                const iDoData: SubcategoryData = {};
                const weDoData: SubcategoryData = {};
                const youDoData: SubcategoryData = {};

                subcategories.I_Do.forEach((subcat: any) => {
                    iDoData[subcat.key] = [];
                });
                subcategories.weDo.forEach((subcat: any) => {
                    weDoData[subcat.key] = [];
                });
                subcategories.youDo.forEach((subcat: any) => {
                    youDoData[subcat.key] = [];
                });

                if (node.originalData?.pedagogy) {
                    const pedagogy = node.originalData.pedagogy;
                    const processPedagogyData = (pedagogyData: any, tabKey: "I_Do" | "We_Do" | "You_Do") => {
                        Object.keys(pedagogyData).forEach((subcategoryKey) => {
                            const subcategoryData = pedagogyData[subcategoryKey];
                            if (subcategoryData) {
                                const frontendKey = subcategoryKey.toLowerCase().replace(/\s+/g, "_");
                                const frontendTabType = tabKey === "We_Do" ? "weDo" : tabKey === "You_Do" ? "youDo" : "I_Do";

                                const folderResult = processBackendFolders(
                                    subcategoryData.folders || [],
                                    null,
                                    frontendTabType,
                                    subcategoryKey
                                );

                                const rootFiles: UploadedFile[] = (subcategoryData.files || []).map((file: any) => ({
                                    id: file._id || `${Date.now()}-${Math.random()}`,
                                    name: file.fileName,
                                    type: file.fileType,
                                    size: typeof file.size === "string" ? Number.parseInt(file.size) : file.size,
                                    url: file.fileUrl,
                                    uploadedAt: new Date(file.uploadedAt || Date.now()),
                                    subcategory: subcategoryKey,
                                    folderId: null, // Root level files
                                    tags: file.tags?.map((tag: any) => ({
                                        tagName: tag.tagName || tag.name || '',
                                        tagColor: tag.tagColor || tag.color || '#3B82F6'
                                    })) || []
                                }));

                                const allItems = [...folderResult.folders, ...folderResult.allFiles, ...rootFiles];
                                const targetData = tabKey === "We_Do" ? weDoData : tabKey === "You_Do" ? youDoData : iDoData;

                                if (targetData[frontendKey] !== undefined) {
                                    targetData[frontendKey] = allItems;
                                }

                                setFolders(prev => {
                                    const filtered = prev.filter(f =>
                                        !(f.tabType === frontendTabType && f.subcategory === subcategoryKey)
                                    );
                                    return [...filtered, ...folderResult.folders];
                                });
                            }
                        });
                    };

                    if (pedagogy.I_Do) processPedagogyData(pedagogy.I_Do, "I_Do");
                    if (pedagogy.We_Do) processPedagogyData(pedagogy.We_Do, "We_Do");
                    if (pedagogy.You_Do) processPedagogyData(pedagogy.You_Do, "You_Do");
                }

                setContentData((prev) => ({
                    ...prev,
                    [node.id]: {
                        I_Do: iDoData,
                        weDo: weDoData,
                        youDo: youDoData,
                    },
                }));
            }

            // Refresh content data from backend
            await refreshContentData(node);
        }
    };
    const getCurrentNavigationState = useCallback(() => {
        const key = `${activeTab}-${activeSubcategory}`
        return folderNavigationState[key] || { currentFolderPath: [], currentFolderId: null }
    }, [activeTab, activeSubcategory, folderNavigationState])

    const updateNavigationState = (updates: Partial<{ currentFolderPath: string[]; currentFolderId: string | null }>) => {
        const key = `${activeTab}-${activeSubcategory}`
        setFolderNavigationState((prev) => ({
            ...prev,
            [key]: {
                ...getCurrentNavigationState(),
                ...updates,
            },
        }
        ))
    }
    // Add this useEffect to reset filters when location changes
    useEffect(() => {
        setActiveFilters({ fileTypes: [], searchFilter: '' });
    }, [activeTab, activeSubcategory, getCurrentNavigationState().currentFolderId]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]);


    const createFolder = async () => {
        if (!newFolderName.trim() || !selectedNode) return;
        try {
            const currentState = getCurrentNavigationState();
            setIsButtonLoading(true);
            const tempFolderId = `temp-folder-${Date.now()}`;
            const newFolder: FolderItem = {
                id: tempFolderId,
                name: newFolderName.trim(),
                type: "folder",
                parentId: currentState.currentFolderId,
                children: [],
                tabType: activeTab,
                subcategory: activeSubcategory,
                files: [],
                subfolders: [],
                tags: folderTags
            };

            // Immediately update UI state
            setFolders(prev => [...prev, newFolder]);

            // Update contentData immediately
            setContentData(prevData => {
                const updatedData = { ...prevData };
                if (!updatedData[selectedNode.id]) {
                    updatedData[selectedNode.id] = {
                        I_Do: {},
                        weDo: {},
                        youDo: {},
                    };
                }
                const currentTabData = updatedData[selectedNode.id][activeTab];
                if (!currentTabData[activeSubcategory]) {
                    currentTabData[activeSubcategory] = [];
                }
                currentTabData[activeSubcategory] = [...currentTabData[activeSubcategory], newFolder];
                return updatedData;
            });

            const folderData = {
                tabType: toBackendTab(activeTab),
                subcategory: activeSubcategory,
                folderName: newFolderName.trim(),
                folderPath: currentState.currentFolderPath.join("/"),
                courses: selectedNode.originalData?.courses || "",
                topicId: selectedNode.originalData?.topicId || "",
                index: selectedNode.originalData?.index || 0,
                title: selectedNode.originalData?.title || "",
                description: selectedNode.originalData?.description || "",
                duration: selectedNode.originalData?.duration || "",
                level: selectedNode.originalData?.level || "",
                action: "createFolder",
                tags: folderTags.map(tag => ({
                    tagName: tag.tagName,
                    tagColor: tag.tagColor
                }))
            };

            const response = await entityApi.createFolder(
                selectedNode.type as "module" | "submodule" | "topic" | "subtopic",
                selectedNode.id,
                folderData
            );

            // Force complete refresh of the node data
            if (selectedNode) await refreshContentData(selectedNode, response.data);

            // Reset all states
            setNewFolderName("");
            setShowCreateFolderModal(false);
            setFolderTags([]);
            setEditingFolder(null);

            // Force UI update
            setTimeout(() => {
                setFolders(prev => [...prev]);
            }, 100);

            showSuccessToast("Folder created successfully!");

        } catch (error) {
            showErrorToast("Failed to create folder")
            console.error("❌ Failed to create folder:", error);

            // Remove temporary folder from UI on error
            setFolders(prev => prev.filter(f => !f.id.startsWith('temp-folder-')));

            // Reset content data on error
            setContentData(prev => {
                const newData = { ...prev };
                if (newData[selectedNode.id]) {
                    delete newData[selectedNode.id];
                }
                return newData;
            });

            // Force refresh to get correct state
            if (selectedNode) {
                if (selectedNode) await refreshContentData(selectedNode);
            }
        } finally {
            setIsButtonLoading(false);
        }
    };
    const navigateToFolder = (folderId: string, folderName: string) => {
        const currentState = getCurrentNavigationState();

        // Enhanced findFolderById that searches through contentData structure
        const findFolderById = (items: (FolderItem | UploadedFile)[], id: string): FolderItem | null => {
            for (const item of items) {
                if ('type' in item && item.type === 'folder') {
                    const folder = item as FolderItem;
                    if (folder.id === id) return folder;

                    // Search in subfolders
                    if (folder.subfolders && folder.subfolders.length > 0) {
                        const found = findFolderById(folder.subfolders, id);
                        if (found) return found;
                    }

                    // Search in children
                    if (folder.children && folder.children.length > 0) {
                        const found = findFolderById(folder.children, id);
                        if (found) return found;
                    }
                }
            }
            return null;
        };

        // Use a variable visible in this outer scope to capture any found folder
        let foundFolder: FolderItem | null = null;

        // First try to find in current content data
        if (selectedNode) {
            const currentTabData = contentData[selectedNode.id]?.[activeTab] || {};
            const currentSubcategoryData = currentTabData[activeSubcategory] || [];

            foundFolder = findFolderById(currentSubcategoryData, folderId);
            if (foundFolder) {
                const fullPath = foundFolder.folderPath ? foundFolder.folderPath.split('/') : [foundFolder.name];
                updateNavigationState({
                    currentFolderId: folderId,
                    currentFolderPath: fullPath,
                });
                return;
            }
        }

        // Fallback: search in folders state (for backward compatibility)
        const findInFoldersState = (folders: FolderItem[], id: string): FolderItem | null => {
            for (const folder of folders) {
                if (folder.id === id) return folder;
                if (folder.subfolders) {
                    const found = findInFoldersState(folder.subfolders, id);
                    if (found) return found;
                }
            }
            return null;
        };

        const folderFromState = findInFoldersState(folders, folderId);
        if (folderFromState) {
            const fullPath = folderFromState.folderPath ? folderFromState.folderPath.split('/') : [folderFromState.name];
            updateNavigationState({
                currentFolderId: folderId,
                currentFolderPath: fullPath,
            });
            return;
        }

        if (!foundFolder && !folderFromState) {
            console.error('Folder not found:', folderId);
            showErrorToast(`Folder "${folderName}" not found. It may have been deleted.`);
            // Reset navigation to root
            updateNavigationState({
                currentFolderPath: [],
                currentFolderId: null,
            });
            return;
        }
    };

    const navigateUp = () => {
        const currentState = getCurrentNavigationState();
        if (currentState.currentFolderPath.length > 0) {
            const newPath = [...currentState.currentFolderPath];
            const removedFolderName = newPath.pop();
            let newFolderId: string | null = null;
            if (newPath.length > 0) {
                const findFolderByPath = (folders: FolderItem[], path: string[]): FolderItem | null => {
                    if (path.length === 0) return null;
                    const [current, ...rest] = path;
                    const folder = folders.find(f =>
                        f.name === current
                    );

                    if (!folder) return null;
                    if (rest.length === 0) return folder;
                    return findFolderByPath(folder.subfolders || [], rest);
                };
                const parentFolder = findFolderByPath(
                    folders.filter(f => f.parentId === null && f.tabType === activeTab && f.subcategory === activeSubcategory),
                    newPath
                );
                if (parentFolder) {
                    newFolderId = parentFolder.id;
                }
            } else {
                newFolderId = null; // Back to root
            }
            updateNavigationState({
                currentFolderPath: newPath,
                currentFolderId: newFolderId,
            });
        }
    };

    const getCurrentFolderContents = () => {
        if (!selectedNode) return { folders: [], files: [] };
        const currentState = getCurrentNavigationState();
        const currentTabData = contentData[selectedNode.id]?.[activeTab] || {};
        const currentSubcategoryData = currentTabData[activeSubcategory] || [];
        if (!currentState.currentFolderId) {
            const foldersInRoot = currentSubcategoryData.filter(
                (item): item is FolderItem => (item as FolderItem).type === "folder" && !(item as FolderItem).parentId
            );
            const filesInRoot = currentSubcategoryData.filter(
                (item): item is UploadedFile => "url" in item && !item.folderId
            );

            return { folders: foldersInRoot, files: filesInRoot };
        }
        const findFolderContents = (folders: FolderItem[], targetId: string): { folders: FolderItem[], files: UploadedFile[] } => {
            for (const folder of folders) {
                if (folder.id === targetId) {
                    const subfolders = folder.subfolders || [];
                    const files = folder.files || [];
                    return { folders: subfolders, files };
                }

                if (folder.subfolders && folder.subfolders.length > 0) {
                    const result = findFolderContents(folder.subfolders, targetId);
                    if (result.folders.length > 0 || result.files.length > 0) {
                        return result;
                    }
                }
            }
            return { folders: [], files: [] };
        };

        const rootFolders = currentSubcategoryData.filter(
            (item): item is FolderItem => (item as FolderItem).type === "folder" && !(item as FolderItem).parentId
        );
        return findFolderContents(rootFolders, currentState.currentFolderId);
    };

    const getFolderItemCount = (folderId: string) => {
        if (!selectedNode) return 0;
        const countItemsInFolder = (folders: FolderItem[], targetId: string): number => {
            for (const folder of folders) {
                if (folder.id === targetId) {
                    const fileCount = folder.files?.length || 0;
                    const subfolderCount = folder.subfolders?.length || 0;
                    let subfolderItems = 0;
                    if (folder.subfolders) {
                        subfolderItems = folder.subfolders.reduce((total, subfolder) =>
                            total + countItemsInFolder([subfolder], subfolder.id), 0
                        );
                    }

                    return fileCount + subfolderCount + subfolderItems;
                }

                if (folder.subfolders) {
                    const count = countItemsInFolder(folder.subfolders, targetId);
                    if (count > 0) return count;
                }
            }
            return 0;
        };

        const currentTabData = contentData[selectedNode.id]?.[activeTab] || {};
        const currentSubcategoryData = currentTabData[activeSubcategory] || [];
        const rootFolders = currentSubcategoryData.filter(
            (item): item is FolderItem => (item as FolderItem).type === "folder" && !(item as FolderItem).parentId
        );

        return countItemsInFolder(rootFolders, folderId);
    };

    const editFolder = (folder: FolderItem) => {
        setEditingFolder(folder);
        setEditFolderName(folder.name);
        if (folder.tags) {
            setFolderTags(folder.tags);
        } else {
            setFolderTags([]); // Ensure tags are reset if no tags
        }
        setShowCreateFolderModal(true);
    }
    const saveEditFolder = async () => {
        if (!editingFolder || !editFolderName.trim()) return;
        try {
            const currentState = getCurrentNavigationState();
            const folderData = {
                tabType: toBackendTab(activeTab),
                subcategory: activeSubcategory,
                folderName: editFolderName.trim(),
                folderPath: currentState.currentFolderPath.join('/'),
                originalFolderName: editingFolder.name,
                courses: selectedNode?.originalData?.courses || "",
                topicId: selectedNode?.originalData?.topicId || "",
                index: selectedNode?.originalData?.index || 0,
                title: selectedNode?.originalData?.title || "",
                description: selectedNode?.originalData?.description || "",
                duration: selectedNode?.originalData?.duration || "",
                level: selectedNode?.originalData?.level || "",
                action: "updateFolder",
            };
            const updatedFolder = {
                ...editingFolder,
                name: editFolderName.trim(),
                folderPath: editingFolder.folderPath ?
                    editingFolder.folderPath.replace(new RegExp(`${editingFolder.name}$`), editFolderName.trim()) :
                    editFolderName.trim()
            };
            const updateFolderRecursively = (folders: FolderItem[]): FolderItem[] => {
                return folders.map(folder => {
                    if (folder.id === editingFolder.id) {
                        return updatedFolder;
                    }
                    if (folder.subfolders && folder.subfolders.length > 0) {
                        return {
                            ...folder,
                            subfolders: updateFolderRecursively(folder.subfolders)
                        };
                    }
                    return folder;
                });
            };

            setFolders(prev => updateFolderRecursively(prev));
            setContentData(prevData => {
                const updatedData = { ...prevData };
                if (selectedNode && updatedData[selectedNode.id]) {
                    Object.keys(updatedData[selectedNode.id]).forEach(tabKey => {
                        Object.keys(updatedData[selectedNode.id][tabKey]).forEach(subcatKey => {
                            updatedData[selectedNode.id][tabKey][subcatKey] =
                                updatedData[selectedNode.id][tabKey][subcatKey].map(item => {
                                    if ('type' in item && item.type === 'folder') {
                                        const updateFolderInItems = (folder: FolderItem): FolderItem => {
                                            if (folder.id === editingFolder.id) {
                                                return updatedFolder;
                                            }
                                            if (folder.subfolders && folder.subfolders.length > 0) {
                                                return {
                                                    ...folder,
                                                    subfolders: folder.subfolders.map(updateFolderInItems),
                                                    children: folder.children.map(child =>
                                                        ('type' in child && (child as FolderItem).type === 'folder') ?
                                                            updateFolderInItems(child as FolderItem) : child
                                                    )
                                                };
                                            }
                                            return folder;
                                        };

                                        return updateFolderInItems(item as FolderItem);
                                    }
                                    return item;
                                });
                        });
                    });
                }
                return updatedData;
            });
            const currentNavState = getCurrentNavigationState();
            if (currentNavState.currentFolderId === editingFolder.id) {
                const newPath = [...currentNavState.currentFolderPath];
                if (newPath.length > 0) {
                    newPath[newPath.length - 1] = editFolderName.trim();
                    updateNavigationState({
                        currentFolderPath: newPath,
                    });
                }
            }
            setFolderNavigationState(prev => {
                const updatedState = { ...prev };
                Object.keys(updatedState).forEach(key => {
                    const state = updatedState[key];
                    const updatedPath = state.currentFolderPath.map(folderName =>
                        folderName === editingFolder.name ? editFolderName.trim() : folderName
                    );
                    updatedState[key] = {
                        ...state,
                        currentFolderPath: updatedPath,
                    };
                });
                return updatedState;
            });
            setShowCreateFolderModal(false);
            setEditingFolder(null);
            setEditFolderName("");
            setFolderTags([]); // Reset tags
            const response = await entityApi.updateFolder(
                selectedNode?.type as "module" | "submodule" | "topic" | "subtopic",
                selectedNode?.id!,
                folderData
            );
            if (response.data) {
                setTimeout(async () => {
                    if (selectedNode) await refreshContentData(selectedNode, response.data);
                }, 500);
            }
            showSuccessToast("Updated successfully with immediate UI update");
        } catch (error) {
            showErrorToast("Failed to update folder");
            alert("Failed to update folder. Please try again.");
            if (selectedNode) await refreshContentData(selectedNode);
        }
    };

    const deleteFolder = async (folder: FolderItem) => {
        if (!selectedNode) return;
        try {
            const getFullFolderPath = (folderItem: FolderItem): string => {
                if (!folderItem.folderPath) {
                    const findFolderPath = (folders: FolderItem[], targetId: string, currentPath: string[] = []): string[] | null => {
                        for (const f of folders) {
                            const newPath = [...currentPath, f.name];
                            if (f.id === targetId) {
                                return newPath;
                            }
                            if (f.subfolders && f.subfolders.length > 0) {
                                const result = findFolderPath(f.subfolders, targetId, newPath);
                                if (result) return result;
                            }
                        }
                        return null;
                    };
                    const rootFolders = folders.filter(f => !f.parentId && f.tabType === activeTab && f.subcategory === activeSubcategory);
                    const fullPath = findFolderPath(rootFolders, folderItem.id) || [folderItem.name];
                    return fullPath.join('/');
                }
                return folderItem.folderPath;
            };
            const fullFolderPath = getFullFolderPath(folder);
            const pathParts = fullFolderPath.split('/').filter(p => p);
            const folderName = pathParts.pop(); // Remove the last element and use it as the folderName
            const parentFolderPath = pathParts.join('/'); // The rest is the parent folder path
            const folderData = {
                tabType: toBackendTab(activeTab),
                subcategory: activeSubcategory,
                folderName: folderName,
                folderPath: parentFolderPath,
                courses: selectedNode?.originalData?.courses || "",
                topicId: selectedNode?.originalData?.topicId || "",
                index: selectedNode?.originalData?.index || 0,
                title: selectedNode?.originalData?.title || "",
                description: selectedNode?.originalData?.description || "",
                duration: selectedNode?.originalData?.duration || "",
                level: selectedNode?.originalData?.level || "",
                action: "deleteFolder",
            };
            const collectAllFolderIds = (folderItem: FolderItem): string[] => {
                const folderIds: string[] = [folderItem.id];
                if (folderItem.subfolders) {
                    folderItem.subfolders.forEach(subfolder => {
                        folderIds.push(...collectAllFolderIds(subfolder));
                    });
                }
                return folderIds;
            };
            const collectAllFileIds = (folderItem: FolderItem): string[] => {
                const fileIds: string[] = [];
                if (folderItem.files) {
                    fileIds.push(...folderItem.files.map(f => f.id));
                }
                if (folderItem.subfolders) {
                    folderItem.subfolders.forEach(subfolder => {
                        fileIds.push(...collectAllFileIds(subfolder));
                    });
                }
                return fileIds;
            };

            const folderIdsToRemove = collectAllFolderIds(folder);
            const fileIdsToRemove = collectAllFileIds(folder);
            setContentData((prevData) => {
                const updatedData = { ...prevData };
                if (updatedData[selectedNode.id] && updatedData[selectedNode.id][activeTab]) {
                    const removeFoldersFromItems = (items: (FolderItem | UploadedFile)[]): (FolderItem | UploadedFile)[] => {
                        return items.filter(item => {
                            // Check if it's a FolderItem using type guard
                            if (isFolderItem(item)) {
                                if (folderIdsToRemove.includes(item.id)) {
                                    return false;
                                }
                                // Recursively clean subfolders - now TypeScript knows item is FolderItem
                                if (item.subfolders) {
                                    item.subfolders = removeFoldersFromItems(item.subfolders) as FolderItem[];
                                }
                                if (item.children) {
                                    item.children = removeFoldersFromItems(item.children);
                                }
                            }
                            // Check if it's an UploadedFile
                            if ('url' in item && fileIdsToRemove.includes(item.id)) {
                                return false;
                            }
                            return true;
                        });
                    };
                    updatedData[selectedNode.id][activeTab][activeSubcategory] =
                        removeFoldersFromItems(updatedData[selectedNode.id][activeTab][activeSubcategory]);
                }
                return updatedData;
            });

            // Add this type guard function to properly identify FolderItem
            const isFolderItem = (item: FolderItem | UploadedFile): item is FolderItem => {
                return (item as FolderItem).type === 'folder';
            };
            setFolders(prev => prev.filter((f) => !folderIdsToRemove.includes(f.id)));
            const currentState = getCurrentNavigationState();
            if (folderIdsToRemove.includes(currentState.currentFolderId || '')) {
                navigateUp();
            }
            const response = await entityApi.deleteFolder(
                selectedNode?.type as "module" | "submodule" | "topic" | "subtopic",
                selectedNode?.id!,
                {
                    ...folderData,
                    folderName: folderName || "" // Provide fallback empty string
                }
            );
            setTimeout(async () => {
                await refreshContentData(selectedNode);
            }, 500);


        } catch (error) {
            console.error("❌ Failed to delete folder:", error);
            if (axios.isAxiosError(error)) {
                console.error('📡 API Error details:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message,
                    config: {
                        url: error.config?.url,
                        method: error.config?.method,
                        data: error.config?.data
                    }
                });
                if (error.response?.status === 404) {
                    alert("Folder not found on server. It may have already been deleted.");
                } else {
                    alert(`Delete failed: ${error.response?.data?.message || error.message}`);
                }
            } else {
                alert("Failed to delete folder. Please try again.");
            }
            await refreshContentData(selectedNode);
        }
    };

    const deleteFile = async (fileId: string) => {
        if (!selectedNode) return;

        try {
            const fileData = {
                tabType: toBackendTab(activeTab),
                subcategory: activeSubcategory,
                folderPath: getCurrentNavigationState().currentFolderPath.join('/'),
                courses: selectedNode?.originalData?.courses || "",
                topicId: selectedNode?.originalData?.topicId || "",
                index: selectedNode?.originalData?.index || 0,
                title: selectedNode?.originalData?.title || "",
                description: selectedNode?.originalData?.description || "",
                duration: selectedNode?.originalData?.duration || "",
                level: selectedNode?.originalData?.level || "",
                action: "deleteFile",
                updateFileId: fileId,
            };
            setContentData((prevData) => {
                const updatedData = { ...prevData };
                if (updatedData[selectedNode.id] && updatedData[selectedNode.id][activeTab]) {
                    const removeFileFromItems = (items: (FolderItem | UploadedFile)[]): (FolderItem | UploadedFile)[] => {
                        return items.map(item => {
                            if ('type' in item && item.type === 'folder') {
                                const folderItem = item as FolderItem;
                                const updatedFiles = (folderItem.files || []).filter(f => f.id !== fileId);
                                const updatedChildren = removeFileFromItems(folderItem.children || []);
                                const updatedSubfolders = folderItem.subfolders ? removeFileFromItems(folderItem.subfolders) as FolderItem[] : [];
                                return {
                                    ...folderItem,
                                    files: updatedFiles,
                                    children: updatedChildren,
                                    subfolders: updatedSubfolders
                                };
                            }
                            return item;
                        }).filter(item => {
                            if ('url' in item && item.id === fileId) {
                                return false;
                            }
                            return true;
                        });
                    };
                    updatedData[selectedNode.id][activeTab][activeSubcategory] =
                        removeFileFromItems(updatedData[selectedNode.id][activeTab][activeSubcategory]);
                }
                return updatedData;
            });

            setFolders(prev => {
                const removeFileFromFolder = (folder: FolderItem): FolderItem => {
                    return {
                        ...folder,
                        files: (folder.files || []).filter(f => f.id !== fileId),
                        children: (folder.children || []).filter(item => { // Add null check here
                            if ('url' in item) return item.id !== fileId;
                            return true;
                        }),
                        subfolders: (folder.subfolders || []).map(removeFileFromFolder) // Add null check here too
                    };

                };
                return prev.map(removeFileFromFolder);
            });
            await entityApi.deleteFile(
                selectedNode?.type as "module" | "submodule" | "topic" | "subtopic",
                selectedNode?.id!,
                fileData
            );
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
        } catch (error) {
            console.error("❌ Failed to delete file:", error);
            alert("Failed to delete file. Please try again.");
            await refreshContentData(selectedNode);
        }
    }




    const handleFileUpload = useCallback(
        async (
            files: FileList | null,
            tabType: "I_Do" | "weDo" | "youDo",
            subcategory: string,
            isUpdate = false,
            updateFileId: string | null = null,
        ) => {
            if (!files || !selectedNode) return;

            const isReferenceUpload = selectedFileType === "reference";

            const selectedType = fileTypes.find((type) => type.key === selectedFileType);
            if (selectedType && selectedType.accept !== "*") {
                const acceptedExtensions = selectedType.accept.split(",").map((ext: string) => ext.trim());
                const validFiles = Array.from(files).filter((file) => {
                    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
                    const fileType = file.type.toLowerCase();
                    const matchesExtension = acceptedExtensions.some((ext: string) => {
                        if (ext === "video/*") {
                            return fileType.startsWith("video/") ||
                                fileExtension.match(/\.(mp4|avi|mov|mkv|webm|ogg|flv|wmv|m4v|3gp|mpg|mpeg|ts|mts|m2ts|vob|ogv|qt|rm|rmvb|asf|amv|divx|mxf)$/);
                        }
                        return ext.includes(fileExtension);
                    });
                    return matchesExtension;
                });

                if (validFiles.length !== files.length) {
                    alert(`Please select only ${selectedType.label} files`);
                    return;
                }
            }

            const filesArray = Array.from(files);
            const currentState = getCurrentNavigationState();
            const currentContents = getCurrentFolderContents();
            const existingFileNames = new Set(currentContents.files.map(f => f.name));
            const filesToUpload = filesArray.filter(file => {
                if (existingFileNames.has(file.name) && !isUpdate) {
                    return false;
                }
                return true;
            });

            if (filesToUpload.length === 0 && !isUpdate) {
                alert("All selected files already exist in this location");
                return;
            }

            // When creating uploading files, ensure type has a default value
            // In handleFileUpload function, update the newUploadingFiles creation:
            // Update the newUploadingFiles creation to match the UploadedFile interface exactly
            const newUploadingFiles: UploadedFile[] = filesToUpload.map((file) => {
                const isVideoFile = file.type.startsWith("video/") ||
                    Boolean(file.name.match(/\.(mp4|avi|mov|mkv|webm|ogg|flv|wmv|m4v|3gp|mpg|mpeg|ts|mts|m2ts|vob|ogv|qt|rm|rmvb|asf|amv|divx|mxf)$/i));

                const isReferenceFile = selectedFileType === "reference";

                return {
                    id: `${Date.now()}-${Math.random()}`,
                    name: isReferenceFile ? "Reference Material" : file.name,
                    type: isReferenceFile ? "reference" : (isVideoFile ? "video/mp4" : file.type || "unknown"),
                    size: file.size,
                    url: "",
                    uploadedAt: new Date(),
                    subcategory: subcategory,
                    folderId: currentState.currentFolderId,
                    progress: 0,
                    status: "uploading" as const,
                    isVideo: Boolean(isVideoFile),
                    isReference: isReferenceFile,
                    availableResolutions: isVideoFile ? ["source"] : [],
                    originalFileName: isReferenceFile ? file.name : undefined,
                    // Add any missing optional properties with defaults
                    tags: [],
                    folderPath: currentState.currentFolderPath.join('/'),
                    description: "",
                    accessLevel: "private"
                };
            });

            setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

            setTimeout(() => {
                if (progressContainerRef.current) {
                    progressContainerRef.current.scrollTop = progressContainerRef.current.scrollHeight;
                }
            }, 100);

            const formData = new FormData();
            if (selectedNode.originalData) {
                formData.append("courses", selectedNode.originalData.courses || "");
                formData.append("topicId", selectedNode.originalData.topicId || "");
                formData.append("index", selectedNode.originalData.index?.toString() || "0");
                formData.append("title", selectedNode.originalData.title || "");
                formData.append("description", selectedNode.originalData.description || "");
                formData.append("duration", selectedNode.originalData.duration || "");
                formData.append("level", selectedNode.originalData.level || "");
            }

            if (selectedFileType) {
                formData.append("selectedFileType", selectedFileType);
            }

            const fileId = updateFileId || 'temp'; // Use actual file ID if updating
            const fileSettings = documentSettings[fileId];

            if (fileSettings) {
                formData.append("showToStudents", fileSettings.studentShow.toString());
                formData.append("allowDownload", fileSettings.downloadAllow.toString());
            } else {
                // Default settings if not specified
                formData.append("showToStudents", "true"); // Default: visible to students
                formData.append("allowDownload", "true"); // Default: allow download
            }
            // Add tags if any
            if (folderTags.length > 0) {
                formData.append("tags", JSON.stringify(folderTags.map(tag => ({
                    tagName: tag.tagName,
                    tagColor: tag.tagColor
                }))));
            }

            // Append files
            filesToUpload.forEach((file) => {
                formData.append("files", file);
            });

            const currentPedagogy = selectedNode.originalData?.pedagogy || {
                I_Do: {},
                We_Do: {},
                You_Do: {},
            };
            const backendTabType = tabType === "weDo" ? "We_Do" : tabType === "youDo" ? "You_Do" : "I_Do";
            if (!currentPedagogy[backendTabType]) {
                currentPedagogy[backendTabType] = {};
            }
            if (!currentPedagogy[backendTabType][subcategory]) {
                currentPedagogy[backendTabType][subcategory] = {
                    description: "",
                    files: [],
                    folders: [],
                };
            }

            formData.append("pedagogy", JSON.stringify(currentPedagogy));
            formData.append("tabType", backendTabType);
            formData.append("subcategory", subcategory);

            const folderPathStr = currentState.currentFolderPath.join("/");
            if (folderPathStr) {
                formData.append("folderPath", folderPathStr);
            }

            formData.append("isUpdate", isUpdate.toString());
            if (isUpdate && updateFileId) {
                formData.append("updateFileId", updateFileId);
            }

            try {
                const response = await entityApi.updateEntity(
                    selectedNode.type as "module" | "submodule" | "topic" | "subtopic",
                    selectedNode.id,
                    formData,
                );

                if (response.data) {
                    // Update progress to 100% and mark as completed
                    setUploadingFiles((prev) =>
                        prev.map((f) => (f.status === "uploading" ? { ...f, status: "completed", progress: 100 } : f)),
                    );

                    // Force immediate content refresh
                    if (selectedNode) await refreshContentData(selectedNode, response.data);

                    // Clear uploading files after a short delay
                    setTimeout(() => {
                        setUploadingFiles((prev) => prev.filter((f) => f.status !== "completed"));
                        resetUploadModalStates();
                        showSuccessToast("Upload completed successfully!");
                    }, 500);

                } else {
                    // Fallback: refresh from server
                    await refreshContentData(selectedNode);
                    setUploadingFiles((prev) =>
                        prev.map((f) => (f.status === "uploading" ? { ...f, status: "completed", progress: 100 } : f)),
                    );

                    setTimeout(() => {
                        resetUploadModalStates();
                        showSuccessToast("Upload completed!");
                    }, 500);
                }
            } catch (error) {
                console.error("❌ Failed to upload files:", error);
                setUploadingFiles((prev) =>
                    prev.map((f) => (f.status === "uploading" ? { ...f, status: "error" } : f))
                );
                setIsButtonLoading(false);

                if (axios.isAxiosError(error)) {
                    const errorMessage = error.response?.data?.message || error.message;
                    console.error('📡 API Error details:', {
                        status: error.response?.status,
                        data: error.response?.data,
                        message: errorMessage
                    });
                    alert(`Upload failed: ${errorMessage}`);
                } else {
                    console.error('💥 Unexpected error:', error);
                    alert("Failed to upload files. Please try again.");
                }

                // Clear error files after a delay
                setTimeout(() => {
                    setUploadingFiles((prev) => prev.filter((f) => f.status !== "error"));
                }, 3000);
            }
        },
        [selectedNode, selectedFileType, fileTypes, getCurrentNavigationState, refreshContentData, getCurrentFolderContents, documentSettings],);



    const handleUpdateFileSettings = async (fileId: string, settings: { studentShow: boolean; downloadAllow: boolean }) => {
        if (!selectedNode) return;

        try {
            const currentState = getCurrentNavigationState();

            // Update in backend
            await updateFileSettingsInComponent(
                selectedNode.type as "module" | "submodule" | "topic" | "subtopic",
                selectedNode.id,
                {
                    tabType: toBackendTab(activeTab),
                    subcategory: activeSubcategory,
                    fileId: fileId,
                    studentShow: settings.studentShow,
                    downloadAllow: settings.downloadAllow,
                    folderPath: currentState.currentFolderPath.join('/'),
                    originalData: selectedNode.originalData
                }
            );

            // Update local state
            setDocumentSettings(prev => ({
                ...prev,
                [fileId]: settings
            }));

            // Also update the file in contentData to reflect changes immediately
            setContentData(prev => {
                const newData = { ...prev };
                if (newData[selectedNode.id]?.[activeTab]?.[activeSubcategory]) {
                    const updateFileInItems = (items: (FolderItem | UploadedFile)[]): (FolderItem | UploadedFile)[] => {
                        return items.map(item => {
                            if ('url' in item && item.id === fileId) {
                                return {
                                    ...item,
                                    fileSettings: {
                                        showToStudents: settings.studentShow,
                                        allowDownload: settings.downloadAllow,
                                        lastModified: new Date()
                                    }
                                };
                            }
                            if ('type' in item && item.type === 'folder') {
                                return {
                                    ...item,
                                    files: item.files?.map(f =>
                                        f.id === fileId
                                            ? {
                                                ...f, fileSettings: {
                                                    showToStudents: settings.studentShow,
                                                    allowDownload: settings.downloadAllow,
                                                    lastModified: new Date()
                                                }
                                            }
                                            : f
                                    ),
                                    subfolders: updateFileInItems(item.subfolders || []) as FolderItem[]
                                };
                            }
                            return item;
                        });
                    };

                    newData[selectedNode.id][activeTab][activeSubcategory] =
                        updateFileInItems(newData[selectedNode.id][activeTab][activeSubcategory]);
                }
                return newData;
            });

            showSuccessToast("File settings updated successfully!");
        } catch (error) {
            console.error("Failed to update file settings:", error);
            showErrorToast("Failed to update file settings");
        }
    };
    const handleFileSelection = (files: FileList | null) => {
        if (files && files.length > 0) {
            const newFileNames: Record<string, string> = {}
            const newDisplayNames: Record<string, string> = {}

            if (updateFileId) {
                // For update mode, use the updateFileId as key
                Array.from(files).forEach(file => {
                    const fileId = updateFileId; // Use the update file ID
                    newFileNames[fileId] = file.name;
                    // For update, show "Choose new file" or keep original name in display
                    newDisplayNames[fileId] = `New file: ${file.name}`;
                });
            } else {
                // For new uploads, use file names as keys
                Array.from(files).forEach(file => {
                    const displayName = selectedFileType === "reference" ? "Reference Material" : file.name;
                    newFileNames[file.name] = file.name;
                    newDisplayNames[file.name] = displayName;
                });
            }

            setFileNames(newFileNames)
            setFileDisplayNames(newDisplayNames)
            setSelectedFiles(Array.from(files))

            if (updateFileId && files.length > 1) {
                alert("Please select only one file for update")
                setSelectedFiles([])
                return
            }

            const uploadingFilesData: UploadedFile[] = Array.from(files).map((file, index) => ({
                id: updateFileId || `${Date.now()}-${index}`, // Use updateFileId if available
                name: updateFileId ? `Updating: ${file.name}` : newDisplayNames[file.name] || file.name,
                progress: 0,
                status: 'preparing' as const,
                subcategory: activeSubcategory,
                folderId: getCurrentNavigationState().currentFolderId,
                type: file.type || "unknown",
                size: file.size,
                url: "",
                uploadedAt: new Date(),
                tags: [],
                folderPath: getCurrentNavigationState().currentFolderPath.join('/'),
                isReference: selectedFileType === "reference",
                isVideo: file.type.startsWith("video/"),
                originalFileName: file.name,
                description: "",
                accessLevel: "private",
                availableResolutions: []
            }))

            setUploadingFiles(uploadingFilesData)

            uploadingFilesData.forEach((fileData, index) => {
                let progress = 0
                const interval = setInterval(() => {
                    progress += 10
                    if (progress < 100) {
                        setUploadingFiles(prev => prev.map(f =>
                            f.id === fileData.id
                                ? { ...f, progress, status: 'uploading' }
                                : f
                        ))
                    } else {
                        clearInterval(interval)
                        setUploadingFiles(prev => prev.map(f =>
                            f.id === fileData.id
                                ? { ...f, progress: 100, status: 'ready' }
                                : f
                        ))
                    }
                }, 100)
            })
        }
    }

    const handleFileUpdate = useCallback(
        async (files: FileList | null) => {
            if (!files || !selectedNode || !updateFileId) return;
            if (files.length !== 1) {
                alert("Please select exactly one file for update")
                return
            }
            const file = files[0]
            const selectedType = fileTypes.find((type) => type.key === updateFileType);
            const newUploadingFiles = [{
                id: `${Date.now()}-${Math.random()}`,
                name: updateFileType === "reference" ? "Reference" : file.name, // Show "Reference" for reference files
                type: file.type,
                size: file.size,
                url: "",
                uploadedAt: new Date(),
                subcategory: updateSubcategory,
                folderId: getCurrentNavigationState().currentFolderId,
                progress: 0,
                status: "uploading" as const,
            }];
            setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);
            const formData = new FormData();
            if (selectedNode.originalData) {
                formData.append("courses", selectedNode.originalData.courses || "");
                formData.append("topicId", selectedNode.originalData.topicId || "");
                formData.append("index", selectedNode.originalData.index?.toString() || "0");
                formData.append("title", selectedNode.originalData.title || "");
                formData.append("description", selectedNode.originalData.description || "");
                formData.append("duration", selectedNode.originalData.duration || "");
                formData.append("level", selectedNode.originalData.level || "");
            }
            formData.append("files", file);
            const backendTabType = updateTabType === "weDo" ? "We_Do" : updateTabType === "youDo" ? "You_Do" : "I_Do";
            formData.append("tabType", backendTabType);
            formData.append("subcategory", updateSubcategory);
            formData.append("isUpdate", "true");
            formData.append("updateFileId", updateFileId);
            const fileId = updateFileId || 'temp';
            const fileSettings = documentSettings[fileId] || { studentShow: true, downloadAllow: true };

            formData.append("showToStudents", fileSettings.studentShow.toString());
            formData.append("allowDownload", fileSettings.downloadAllow.toString());
            const folderPathStr = (getCurrentNavigationState().currentFolderPath || []).join("/");
            if (folderPathStr) {
                formData.append("folderPath", folderPathStr);
            }
            try {
                const response = await entityApi.updateEntity(
                    selectedNode.type as "module" | "submodule" | "topic" | "subtopic",
                    selectedNode.id,
                    formData,
                );
                setContentData(prev => {
                    const newData = { ...prev };
                    delete newData[selectedNode.id];
                    return newData;
                });
                setTimeout(async () => {
                    if (selectedNode) await refreshContentData(selectedNode, response.data);
                    setUploadingFiles((prev) =>
                        prev.map((f) => (f.status === "uploading" ? { ...f, status: "completed", progress: 100 } : f)),
                    );
                    setUploadingFiles((prev) => prev.filter((f) => f.status !== "completed"));
                    setUploadProgress({});
                    setShowUploadModal(false);
                    setUpdateFileId(null);
                    setUpdateFileType("");
                    setSelectedFileType("");
                    setFileNames({});
                    setSelectedFiles([]);
                    setIsButtonLoading(false);
                }, 200);
                showSuccessToast("Created Successfully!")
            } catch (error) {
                setIsButtonLoading(false);
                console.error("Failed to update file:", error);
                setUploadingFiles((prev) => prev.map((f) => (f.status === "uploading" ? { ...f, status: "error" } : f)));
                if (axios.isAxiosError(error)) {
                    alert(`Update failed: ${error.response?.data?.message || error.message}`);
                } else {
                    alert("Failed to update file. Please try again.");
                }
            }
        },
        [selectedNode, updateFileId, updateTabType, updateSubcategory, fileTypes, getCurrentNavigationState, refreshContentData],
    );
    const initiateFileUpdate = (file: UploadedFile, tabType: "I_Do" | "weDo" | "youDo", subcategory: string) => {
        setUpdateFileId(file.id);

        // Safely handle potentially undefined file.type
        const fileType = file.type || '';
        const foundFileType = fileTypes?.find((type) => fileType.includes(type.key))?.key || "";

        setUpdateFileType(foundFileType);
        setUpdateTabType(tabType);
        setUpdateSubcategory(subcategory);
        setShowUploadModal(true);
        setSelectedFileType(foundFileType);

        // Preserve original file information for display
        setFileNames({
            [file.id]: file.name
        });

        // Set display name to show original file name
        setFileDisplayNames({
            [file.id]: file.name
        });

        // Set description and tags from original file
        setUploadDescription(file?.description || '');
        setUploadTags(file?.tags || []);
        setUploadAccessLevel(file?.accessLevel || 'private');

        // ✅ CRITICAL FIX: Read EXACT values from database
        if (file.id && file.fileSettings) {
            // Use database values exactly as they are
            setDocumentSettings(prev => ({
                ...prev,
                [file.id]: {
                    studentShow: file.fileSettings?.showToStudents ?? true,
                    downloadAllow: file.fileSettings?.allowDownload ?? true
                }
            }));

            console.log('📁 Loading file settings from DB:', {
                fileId: file.id,
                fileName: file.name,
                fileSettings: file.fileSettings,
                showToStudents: file.fileSettings?.showToStudents,
                allowDownload: file.fileSettings?.allowDownload
            });
        }
        // Set description and tags from original file
        setUploadDescription(file?.description || '');
        setUploadTags(file?.tags || []);
        setUploadAccessLevel(file?.accessLevel || 'private');

        // ✅ CRITICAL FIX: Set documentSettings from file.fileSettings with correct defaults
        if (file.id) {
            // Use database values if they exist, otherwise use defaults
            const dbShowToStudents = file.fileSettings?.showToStudents;
            const dbAllowDownload = file.fileSettings?.allowDownload;

            console.log('📁 Loading file settings from DB:', {
                fileId: file.id,
                fileName: file.name,
                fileSettings: file.fileSettings,
                dbShowToStudents,
                dbAllowDownload
            });

            setDocumentSettings(prev => ({
                ...prev,
                [file.id]: {
                    studentShow: dbShowToStudents !== undefined ? dbShowToStudents : true, // Default to true if not set
                    downloadAllow: dbAllowDownload !== undefined ? dbAllowDownload : true  // Default to true if not set
                }
            }));
        }

        // NEW: Pre-populate URL data if it's a URL file
        if (foundFileType === 'url' || fileType.includes('url') || fileType.includes('link')) {
            // Safely extract the URL
            let existingUrl = '';
            if (typeof file.url === 'string') {
                existingUrl = file.url;
            } else if (file.url && typeof file.url === 'object' && 'base' in file.url) {
                existingUrl = (file.url as any).base || '';
            } else if (file.url) {
                existingUrl = String(file.url);
            }

            setFolderUrl(existingUrl);
            setUrlFileName(file.name || 'URL Resource');
            setUrlFileType(file.type || 'url/link');
        } else {
            // Reset URL fields for non-URL files
            setFolderUrl('');
            setUrlFileName('');
            setUrlFileType('url/link');
        }

        // Clear any previously selected files
        setSelectedFiles([]);

        // Clear any uploading files
        setUploadingFiles([]);
    };


    const handleCreateQuestionBank = async () => {
        if (!newQuestionBank.name.trim()) {
            alert("Please enter a question bank name");
            return;
        }

        try {
            setIsButtonLoading(true);

            const now = new Date(); // Get current date and time

            // Create the complete question bank object with createdAt
            const questionBankData = {
                id: `qb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: newQuestionBank.name.trim(),
                description: newQuestionBank.description.trim(),
                courseId: courseId || '',
                createdBy: 'current_user_id', // Replace with actual user ID
                questions: [],
                categories: [],
                accessLevel: newQuestionBank.accessLevel,
                sharedWith: [],
                settings: newQuestionBank.settings,
                createdAt: now.toISOString(), // Full timestamp with date and time
                metadata: {
                    tags: newQuestionBank.tags,
                    createdAt: now.toISOString(), // Also add to metadata
                    updatedAt: now.toISOString()
                }
            };

            // ADD TO ARRAY instead of replacing
            setQuestionBanks(prev => [...prev, questionBankData]);

            // Show success and close modal
            showSuccessToast("Question bank created successfully!");
            setShowQuestionBankModal(false);

            // Reset form
            setNewQuestionBank({
                name: '',
                description: '',
                tags: [],
                accessLevel: 'private',
                settings: {
                    allowDuplicates: false,
                    maxQuestionsPerQuiz: 20,
                    randomization: true,
                    showHints: true,
                    showExplanation: true,
                    timeLimit: 30
                }
            });

        } catch (error) {
            console.error("Failed to create question bank:", error);
            showErrorToast("Failed to create question bank");
        } finally {
            setIsButtonLoading(false);
        }
    };






    useEffect(() => {
        console.log('📊 Document Settings State:', {
            totalSettings: Object.keys(documentSettings).length,
            settings: documentSettings,
            currentFileId: updateFileId,
            currentFileSettings: documentSettings[updateFileId || 'temp']
        });
    }, [documentSettings, updateFileId]);


    // Add this useEffect to fetch question banks
    useEffect(() => {
        const fetchQuestionBanks = async () => {
            if (selectedNode && activeTab === "weDo") {
                try {
                    // Replace with your actual API call
                    // const response = await questionBankApi.getByNode(selectedNode.id);
                    // setQuestionBank(response.data || []);
                } catch (error) {
                    console.error("Failed to fetch question banks:", error);
                }
            }
        };

        if (selectedNode && activeTab === "weDo") {
            fetchQuestionBanks();
        }
    }, [selectedNode?.id, activeTab]);


    const handleQuestionBankSelect = (bank: any) => {
        setSelectedQuestionBank(bank);

        // If we have a selected node, you can fetch the questions for this bank
        if (selectedNode && bank.id) {
            // You can add API call here later
            console.log('Selected question bank:', bank);
        }
    };



    const getFileIcon = (type: string, fileName?: string, isReference?: boolean) => {
        const lowerType = type.toLowerCase();
        const lowerFileName = fileName?.toLowerCase() || '';

        // Check for URL/Link files first
        if (lowerType.includes("url") || lowerType.includes("link") || lowerFileName.startsWith("http")) {
            return <Link2 style={{ color: "#10b981" }} size={16} />;
        }

        // Check for reference files - handle both boolean true and string "true"
        const isReferenceFile = isReference === true || String(isReference).toLowerCase() === "true";
        if (isReferenceFile || lowerType.includes("reference") || lowerFileName.includes("reference")) {
            return <BookOpen style={{ color: "#8b5cf6" }} size={16} />;
        }

        // Check file extensions for better detection
        const fileExtension = lowerFileName.split('.').pop();

        if (fileExtension === 'pdf' || lowerType.includes("pdf")) {
            return <FileText style={{ color: "#ef4444" }} size={16} />;
        }

        // PPT/PPTX files
        if (fileExtension === 'ppt' || fileExtension === 'pptx' ||
            lowerType.includes("powerpoint") || lowerType.includes("presentation")) {
            return <Presentation style={{ color: "#d97706" }} size={16} />;
        }

        const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'ogg', 'flv', 'wmv', 'm4v', '3gp', 'mpg', 'mpeg'];
        if (videoExtensions.includes(fileExtension || '') || lowerType.includes("video")) {
            return <Video style={{ color: "#8b5cf6" }} size={16} />;
        }

        const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz'];
        if (archiveExtensions.includes(fileExtension || '') || lowerType.includes("zip") || lowerType.includes("archive")) {
            return <Archive style={{ color: "#f59e0b" }} size={16} />;
        }

        return <FileText style={{ color: "#6b7280" }} size={16} />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };
    const renderHierarchy = (nodes: CourseNode[]) => {
        // Search results section - adjusted for sidebar
        if (searchQuery.trim()) {
            return (
                <div className="px-2 py-1">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 font-montserrat">
                            Search Results ({searchResults.length})
                        </span>
                        {isSearching && (
                            <Loader2 size={12} className="text-blue-500 animate-spin" />
                        )}
                    </div>

                    {searchResults.length === 0 && !isSearching ? (
                        <div className="text-center py-3 text-gray-400 text-xs font-montserrat">
                            No results found for "{searchQuery}"
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {searchResults.map((node) => (
                                <SearchResultNode
                                    key={node.id}
                                    node={node}
                                    onSelect={selectNode}
                                    isSelected={selectedNode?.id === node.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // Original hierarchy rendering - optimized for sidebar
        const filteredNodes = nodes.reduce((acc: CourseNode[], node) => {
            if (node.type === "course" && node.children) {
                return [...acc, ...node.children];
            }
            return [...acc, node];
        }, []);

        return filteredNodes.map((node, index) => {
            const isLastChild = index === filteredNodes.length - 1;
            const isParent = node.children && node.children.length > 0;
            const isExpanded = expandedNodes.has(node.id);

            return (
                <div key={node.id} className="relative group">
                    {/* Clean border-left approach like second example */}
                    {node.level > 1 && (
                        <div className={`
                        absolute top-0 bottom-0 left-[9px] w-[1px] bg-gray-200
                        ${isLastChild ? 'h-[18px]' : ''}
                    `}>
                            {/* Horizontal connector line */}
                            <div className="absolute top-[10px] left-0 w-[8px] h-[1px] bg-gray-200"></div>
                        </div>
                    )}

                    {/* Parent connection to children */}
                    {isParent && isExpanded && (
                        <div className="absolute top-[18px] bottom-0 left-[9px] w-[1px] bg-gray-200 z-0"></div>
                    )}

                    <div
                        className={`flex items-start px-2 py-1 cursor-pointer rounded mb-[1px] transition-all duration-200 relative
                        ${selectedNode?.id === node.id
                                ? "bg-blue-50 border-l-2 border-blue-500 ml-[-1px]"
                                : "bg-transparent border-l-2 border-transparent hover:bg-gray-50"
                            }
                        ${!node.children || node.children.length === 0
                                ? "cursor-pointer"
                                : "cursor-default"
                            }`}
                        style={{
                            marginLeft: `${(node.level - 1) * 12}px`,
                            borderLeftStyle: selectedNode?.id === node.id ? 'solid' : 'solid',
                            borderLeftWidth: selectedNode?.id === node.id ? '2px' : '2px',
                            borderLeftColor: selectedNode?.id === node.id ? '#3b82f6' : 'transparent'
                        }}
                        onClick={() => {
                            if (node.children && node.children.length > 0) {
                                toggleNode(node.id);
                            }
                            if (!node.children || node.children.length === 0) {
                                selectNode(node);
                            }
                        }}
                        onMouseEnter={(e) => {
                            if (
                                selectedNode?.id !== node.id &&
                                (!node.children || node.children.length === 0)
                            ) {
                                e.currentTarget.style.backgroundColor = "#f9fafb";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (
                                selectedNode?.id !== node.id &&
                                (!node.children || node.children.length === 0)
                            ) {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }
                        }}
                    >
                        <div
                            className="flex-shrink-0 w-[16px] mr-[5px] flex items-center justify-center mt-[1px] relative z-10"
                        >
                            {node.children && node.children.length > 0 ? (
                                expandedNodes.has(node.id) ? (
                                    <ChevronDown size={12} className="text-gray-500" />
                                ) : (
                                    <ChevronRight size={12} className="text-gray-500" />
                                )
                            ) : (
                                <div className="w-[10px]" />
                            )}
                        </div>
                        <div className="flex items-start flex-1 gap-2">
                            <div
                                className={`flex-shrink-0 flex items-center justify-center relative z-10
                                ${node.level === 1
                                        ? "w-[18px] h-[18px]"
                                        : node.level === 2
                                            ? "w-[16px] h-[16px]"
                                            : "w-[14px] h-[14px]"
                                    }`}
                            >
                                <div className={`
                                ${node.level === 1
                                        ? "bg-blue-500"
                                        : node.level === 2
                                            ? "bg-blue-400"
                                            : "bg-blue-300"
                                    } 
                                ${node.level === 1
                                        ? "w-[16px] h-[16px]"
                                        : node.level === 2
                                            ? "w-[14px] h-[14px]"
                                            : "w-[12px] h-[12px]"
                                    }
                                rounded-[3px] flex items-center justify-center
                            `}>
                                    {node.type === "module" && (
                                        <BookOpen
                                            size={node.level === 1 ? 9 : node.level === 2 ? 8 : 7}
                                            className="text-white"
                                        />
                                    )}
                                    {node.type === "submodule" && (
                                        <FolderOpen
                                            size={node.level === 1 ? 9 : node.level === 2 ? 8 : 7}
                                            className="text-white"
                                        />
                                    )}
                                    {node.type === "topic" && (
                                        <FileText
                                            size={node.level === 1 ? 9 : node.level === 2 ? 8 : 7}
                                            className="text-white"
                                        />
                                    )}
                                    {node.type === "subtopic" && (
                                        <File
                                            size={node.level === 1 ? 9 : node.level === 2 ? 8 : 7}
                                            className="text-white"
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col w-full">
                                <div className="flex items-center justify-between w-full flex-wrap">
                                    <span
                                        className={`
                                        break-words leading-snug font-montserrat
                                        ${node.level === 1
                                                ? "text-[13px] font-medium text-gray-800"
                                                : node.level === 2
                                                    ? "text-[12px] font-normal text-gray-700"
                                                    : "text-[11px] font-normal text-gray-600"
                                            }
                                        ${!node.children || node.children.length === 0
                                                ? "opacity-90"
                                                : ""
                                            }`}
                                    >
                                        {node.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {node.children &&
                        expandedNodes.has(node.id) && (
                            <div className="ml-6 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                                {renderHierarchy(node.children)}
                            </div>
                        )}
                </div>
            );
        });
    };

    const SearchResultNode: React.FC<{
        node: CourseNode;
        onSelect: (node: CourseNode) => void;
        isSelected: boolean;
    }> = ({ node, onSelect, isSelected }) => {
        const [isExpanded, setIsExpanded] = useState(false)
        const hasChildren = node.children && node.children.length > 0

        const getNodeTypeLabel = (type: string) => {
            switch (type) {
                case "module": return "Module";
                case "submodule": return "Submodule";
                case "topic": return "Topic";
                case "subtopic": return "Subtopic";
                default: return type;
            }
        };

        const getTypeColor = (type: string) => {
            switch (type) {
                case "module": return "bg-emerald-500";
                case "submodule": return "bg-amber-500";
                case "topic": return "bg-violet-500";
                case "subtopic": return "bg-red-500";
                default: return "bg-gray-500";
            }
        };

        const getTypeIcon = (type: string) => {
            switch (type) {
                case "module": return <Users size={12} className="text-white" />;
                case "submodule": return <Target size={12} className="text-white" />;
                case "topic": return <FileText size={12} className="text-white" />;
                case "subtopic": return <FileText size={12} className="text-white" />;
                default: return <FileText size={12} className="text-white" />;
            }
        };

        return (
            <div className="mb-1">
                <div
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200
          ${isSelected
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-white border border-gray-200 hover:bg-gray-50"
                        }`}
                    onClick={() => onSelect(node)}
                >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mr-2 ${getTypeColor(node.type)}`}>
                        {getTypeIcon(node.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">
                            {node.name}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                            <span className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">
                                {getNodeTypeLabel(node.type)}
                            </span>
                            {node.originalData?.description && (
                                <span className="truncate flex-1">{node.originalData.description}</span>
                            )}
                        </div>
                    </div>

                    {/* Expand/collapse button for nodes with children */}
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsExpanded(!isExpanded)
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                            <ChevronDown
                                size={14}
                                className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                                    }`}
                            />
                        </button>
                    )}
                </div>

                {/* Render children if expanded */}
                {hasChildren && isExpanded && (
                    <div className="ml-6 mt-1 border-l border-gray-200 pl-2">
                        {node.children!.map((child) => (
                            <SearchResultNode
                                key={child.id}
                                node={child}
                                onSelect={onSelect}
                                isSelected={selectedNode?.id === child.id}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };


    // Replace these state declarations
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);


    // Replace the toggleActionsDropdown function with this:
    const toggleActionsDropdown = (id: string) => {
        setOpenDropdown(openDropdown === id ? null : id);
    };

    // Replace the checkDropdownOpen function with this:
    const checkDropdownOpen = (id: string) => {
        return openDropdown === id;
    };

    // Replace the closeAllDropdowns function with this:
    const closeAllDropdowns = () => {
        setOpenDropdown(null);
    };

    // Update the click outside listener to use the consolidated state:
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!(event.target as Element).closest('.dropdown-container')) {
                closeAllDropdowns();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    const renderFileList = (
        folders: FolderItem[],
        files: UploadedFile[],
        tabType: "I_Do" | "weDo" | "youDo",
        subcategory: string
    ) => {
        const handleFolderClick = (folderId: string, folderName: string) => {
            navigateToFolder(folderId, folderName);
        };

        // Function to calculate dropdown position
        const calculateDropdownPosition = (buttonElement: HTMLElement) => {
            const buttonRect = buttonElement.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Dropdown dimensions (approximate)
            const dropdownWidth = 192; // min-w-48 = 12rem = 192px
            const dropdownHeight = 160; // Approximate height for 4 items

            const position = {
                top: 0,
                left: 0,
                bottom: 'auto',
                right: 'auto'
            };

            // Check if there's enough space below the button
            if (buttonRect.bottom + dropdownHeight <= viewportHeight - 10) {
                // Position below the button
                position.top = buttonRect.bottom + 5;
            } else {
                // Position above the button
                position.top = buttonRect.top - dropdownHeight - 5;
            }

            // Check if there's enough space to the right of the button
            if (buttonRect.left + dropdownWidth <= viewportWidth - 10) {
                // Position to the right (aligned with button left)
                position.left = buttonRect.left;
            } else {
                // Position to the left (aligned with button right)
                position.left = buttonRect.right - dropdownWidth;
            }

            return position;
        };

        // Function to handle dropdown toggle with position calculation
        const handleToggleDropdown = (id: string, event: React.MouseEvent) => {
            event.stopPropagation();
            toggleActionsDropdown(id);

            // Use setTimeout to ensure the dropdown is rendered before positioning
            setTimeout(() => {
                const dropdownElement = document.querySelector(`[data-dropdown-id="${id}"]`) as HTMLElement;
                const buttonElement = event.currentTarget as HTMLElement;

                if (dropdownElement && buttonElement) {
                    const position = calculateDropdownPosition(buttonElement);

                    dropdownElement.style.top = `${position.top}px`;
                    dropdownElement.style.left = `${position.left}px`;
                    dropdownElement.style.bottom = position.bottom;
                    dropdownElement.style.right = position.right;
                }
            }, 0);
        };

        return (
            <div>
                {/* Compact Table Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-700 sticky top-0 bg-white z-10">                <div className="col-span-6 flex items-center">
                    <span style={{ fontSize: '12px', fontFamily: "Segoe UI, Tahoma, Arial, sans-serif" }}>Name</span>
                </div>
                    <div className="col-span-2" style={{ fontSize: '12px' }}>Created</div>
                    <div className="col-span-2" style={{ fontSize: '12px' }}>Size</div>
                    <div className="col-span-2 text-center" style={{ fontSize: '12px' }}>Actions</div>
                </div>

                {/* Folders */}
                {folders.map((folder) => (
                    <div
                        key={folder.id}
                        onClick={() => handleFolderClick(folder.id, folder.name)}
                        className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors duration-150 relative overflow-visible"
                    >
                        {/* Name Column */}
                        <div className="col-span-6 flex items-center gap-2">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                <img
                                    src="/active-images/folder.png"
                                    alt="Folder"
                                    className="w-5 h-5 flex-shrink-0"
                                />
                                <span
                                    className="font-small truncate"
                                    style={{
                                        fontSize: '13px',
                                        fontFamily: "Segoe UI, Tahoma, Arial, sans-serif",
                                        color: "#242424",
                                    }}
                                    title={folder.name}
                                >
                                    {folder.name}
                                </span>
                            </div>

                            {/* Tags - Compact */}
                            {folder.tags && folder.tags.length > 0 && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {folder.tags.slice(0, 1).map((tag, index) => (
                                        <div
                                            key={index}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border"
                                            style={{
                                                borderColor: tag.tagColor || '#94a3b8',
                                                backgroundColor: `${tag.tagColor}10`,
                                            }}
                                        >
                                            <Tag size={8} style={{ color: tag.tagColor }} />
                                            <span style={{ color: tag.tagColor, fontSize: '11px' }}>
                                                {tag.tagName}
                                            </span>
                                        </div>
                                    ))}
                                    {folder.tags.length > 1 && (
                                        <span className="text-xs text-gray-400 ml-0.5" style={{ fontSize: '11px' }}>
                                            +{folder.tags.length - 1}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Created At Column */}
                        <div className="col-span-2 flex items-center text-gray-500" style={{ fontSize: '12px' }}>
                            {new Date().toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                            })}
                        </div>

                        {/* File Size Column */}
                        <div className="col-span-2 flex items-center text-gray-500" style={{ fontSize: '12px' }}>
                            {getFolderItemCount(folder.id)} items
                        </div>

                        {/* Actions Column - DYNAMIC DROPDOWN */}
                        <div className="col-span-2 flex items-center justify-center dropdown-container">
                            <div className="relative overflow-visible"> {/* Added overflow-visible */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleActionsDropdown(`folder-${folder.id}`);
                                    }}
                                    className="p-1.5 hover:bg-gray-100 rounded transition-colors border border-transparent hover:border-gray-300"
                                    title="Actions"
                                >
                                    <MoreVertical size={16} className="text-gray-600" />
                                </button>

                                {/* Dropdown Menu */}
                                {checkDropdownOpen(`folder-${folder.id}`) && (
                                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 overflow-visible"> {/* Added overflow-visible */}
                                        <div className="py-1">
                                            {/* Edit Folder */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    editFolder(folder);
                                                    closeAllDropdowns();
                                                }}
                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                                <Edit2 size={14} className="text-gray-600" />
                                                Edit Folder
                                            </button>

                                            {/* Delete Folder */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick("folder", folder, folder.name);
                                                    closeAllDropdowns();
                                                }}
                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={14} className="text-red-500" />
                                                Delete Folder
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Files */}
                {files.map((file) => {
                    const isReferenceFile = file.isReference === true || file.isReference === "true";
                    const isUrlFile = file.type?.includes("url") || file.type?.includes("link");

                    return (
                        <div
                            key={file.id}
                            className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 relative overflow-visible"
                        >
                            {/* Name Column */}
                            <div className="col-span-6 flex items-center gap-2 min-w-0">
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                    {/* File Icon */}
                                    <div className="flex-shrink-0">
                                        {getFileIcon(file.type || '', file.name, isReferenceFile)}
                                    </div>

                                    {/* File Name and Type - Compact */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <span
                                                className="text-gray-900 truncate"
                                                style={{
                                                    fontSize: '13px',
                                                    fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif'
                                                }}
                                                title={file.name}
                                            >
                                                {file.name}
                                            </span>

                                            {isReferenceFile && (
                                                <span
                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium border flex-shrink-0"
                                                    style={{
                                                        borderColor: "#8b5cf6",
                                                        backgroundColor: "#8b5cf610",
                                                        color: "#8b5cf6",
                                                        fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif'
                                                    }}
                                                >
                                                    <BookOpen size={8} />
                                                    Ref
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 truncate" style={{ fontSize: '11px' }}>
                                            {isUrlFile ? 'Link' :
                                                file.type?.includes("pdf") ? 'PDF' :
                                                    file.type?.includes("video") ? 'Video' :
                                                        file.type?.includes("zip") ? 'Archive' : 'File'}
                                        </span>
                                    </div>
                                </div>

                                {/* Tags - Compact */}
                                {file.tags && file.tags.length > 0 && (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {file.tags.slice(0, 1).map((tag, index) => (
                                            <div
                                                key={index}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border"
                                                style={{
                                                    borderColor: tag.tagColor || '#3B82F6',
                                                    backgroundColor: `${tag.tagColor}10`,
                                                }}
                                            >
                                                <Tag size={8} style={{ color: tag.tagColor }} />
                                                <span style={{ color: tag.tagColor, fontSize: '11px' }}>
                                                    {tag.tagName}
                                                </span>
                                            </div>
                                        ))}
                                        {file.tags.length > 1 && (
                                            <span className="text-xs text-gray-400 ml-0.5" style={{ fontSize: '11px' }}>
                                                +{file.tags.length - 1}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Created At Column */}
                            <div className="col-span-2 flex items-center text-gray-500" style={{ fontSize: '12px' }}>
                                {file.uploadedAt ?
                                    new Date(file.uploadedAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })
                                    : '-'
                                }
                            </div>

                            {/* File Size Column */}
                            <div className="col-span-2 flex items-center text-gray-500" style={{ fontSize: '12px' }}>
                                {file.size ? formatFileSize(file.size) : '-'}
                            </div>

                            {/* Actions Column - DYNAMIC DROPDOWN */}
                            <div className="col-span-2 flex items-center justify-center dropdown-container">
                                <div className="relative overflow-visible"> {/* Added overflow-visible */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleActionsDropdown(`file-${file.id}`);
                                        }}
                                        className="p-1.5 hover:bg-gray-100 rounded transition-colors border border-transparent hover:border-gray-300"
                                        title="Actions"
                                    >
                                        <MoreVertical size={16} className="text-gray-600" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {checkDropdownOpen(`file-${file.id}`) && (
                                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 overflow-visible"> {/* Added overflow-visible */}
                                            <div className="py-1">
                                                {/* Preview/Open Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFileClick(file, tabType, subcategory);
                                                        closeAllDropdowns();
                                                    }}
                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                >
                                                    {isReferenceFile ? (
                                                        <BookOpen size={14} className="text-purple-500" />
                                                    ) : isUrlFile ? (
                                                        <ExternalLink size={14} className="text-green-500" />
                                                    ) : (
                                                        <Eye size={14} className="text-blue-500" />
                                                    )}
                                                    {isReferenceFile ? "View Reference" :
                                                        isUrlFile ? "Open Link" : "Preview File"}
                                                </button>

                                                {/* Download Button - Only for non-URL files */}
                                                {!isUrlFile && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const fileUrl = file.url || '';
                                                            const fileName = file.name || '';
                                                            const a = document.createElement("a");
                                                            a.href = fileUrl;
                                                            a.download = fileName;
                                                            a.click();
                                                            closeAllDropdowns();
                                                        }}
                                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <Download size={14} className="text-green-500" />
                                                        Download File
                                                    </button>
                                                )}

                                                {/* Update Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        initiateFileUpdate(file, tabType, subcategory);
                                                        closeAllDropdowns();
                                                    }}
                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                >
                                                    <RefreshCw size={14} className="text-amber-500" />
                                                    Update File
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick("file", file, file.name || 'Unknown file');
                                                        closeAllDropdowns();
                                                    }}
                                                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={14} className="text-red-500" />
                                                    Delete File
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty State - Compact */}
                {folders.length === 0 && files.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                        <FileText size={32} className="mx-auto text-gray-300 mb-1" />
                        <p className="text-sm font-medium" style={{ fontSize: '13px' }}>No files or folders</p>
                        <p className="text-xs" style={{ fontSize: '11px' }}>Upload files or create folders to get started</p>
                    </div>
                )}
            </div>
        );
    };
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true)
        e.preventDefault()
    }
    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing) return
        const newWidth = e.clientX

        if (newWidth >= 200 && newWidth <= 500) {
            setSidebarWidth(newWidth)
        }
    }
    const addUploadTag = async (tagName: string, tagColor: string) => {
        if (tagName.trim()) {
            setLoading(true);
            setSuccess(false);
            await new Promise((res) => setTimeout(res, 800));
            setUploadTags([...uploadTags, { tagName, tagColor }])
            setLoading(false);
            setSuccess(true);
        }
    }

    const removeUploadTag = (index: number) => {
        setUploadTags(uploadTags.filter((_, i) => i !== index))
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(event.target as Node)) {
                setIsUploadDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const resetUploadModalStates = () => {
        setShowUploadModal(false);
        setSelectedFileType("");
        setUploadingFiles([]);
        setUpdateFileId(null);
        setFileNames({});
        setSelectedFiles([]);
        setUploadDescription('');
        setUploadTags([]);
        setUploadCurrentTag('');
        setUploadTagColor('#3B82F6');
        setUploadAccessLevel('private');
        setIsUploadDropdownOpen(false);
        setFolderUrl(''); // Reset URL
        setUrlFileName(''); // Reset URL file name
        setUrlFileType('url/link'); // Reset URL file type
        setIsButtonLoading(false);
        setText(''); // Reset editor content
    };
    const handleMouseUp = () => {
        setIsResizing(false)
    }
    useEffect(() => {
        if (selectedNode) {
            const forceRefreshData = async () => {
                if (selectedNode) await refreshContentData(selectedNode);
            };
            forceRefreshData();
        }
    }, [selectedNode?.id]);
    useEffect(() => {
        if (isResizing) {
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
            return () => {
                document.removeEventListener("mousemove", handleMouseMove)
                document.removeEventListener("mouseup", handleMouseUp)
            }
        }
    }, [isResizing])

    const generateBreadcrumbs = (selectedNode: CourseNode | null): CourseNode[] => {
        if (!selectedNode) return [];

        const findPath = (nodes: CourseNode[], targetId: string, path: CourseNode[] = []): CourseNode[] | null => {
            for (const node of nodes) {
                const currentPath = [...path, node];
                if (node.id === targetId) {
                    return currentPath;
                }
                if (node.children) {
                    const result = findPath(node.children, targetId, currentPath);
                    if (result) return result;
                }
            }
            return null;
        };

        const fullPath = findPath(courseData, selectedNode.id) || [];

        // Filter out the course node since we handle it separately
        return fullPath.filter(node => node.type !== "course");
    };




    const findNodePath = (nodes: CourseNode[], targetId: string, path: string[] = []): string[] | null => {
        for (const node of nodes) {
            const currentPath = [...path, node.name];

            if (node.id === targetId) {
                return currentPath;
            }

            if (node.children && node.children.length > 0) {
                const result = findNodePath(node.children, targetId, currentPath);
                if (result) return result;
            }
        }
        return null;
    };

    const handleDeleteClick = (type: "folder" | "file", item: any, name: string) => {
        setDeleteTarget({ type, item, name })
        setShowDeleteConfirm(true)
    }

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === "folder") {
                await deleteFolder(deleteTarget.item);
            } else {
                await deleteFile(deleteTarget.item.id);
                if (updateFileId) {
                    resetUploadModalStates();
                }
            }
            showSuccessToast(`${deleteTarget.type === 'file' ? 'File' : 'Folder'} deleted successfully`);
        } catch (error) {
            console.error("Delete operation failed:", error);
        } finally {
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
        }
    };
    const extractAllVideosFromNode = (node: CourseNode): VideoItem[] => {
        const videos: VideoItem[] = [];
        if (!node.originalData?.pedagogy) return videos;

        const pedagogy = node.originalData.pedagogy;

        const extractVideosFromSection = (sectionData: any, sectionName: string) => {
            if (!sectionData) return;

            Object.entries(sectionData).forEach(([subcategoryKey, subcategoryData]: [string, any]) => {
                if (subcategoryData?.files) {
                    subcategoryData.files.forEach((file: any) => {
                        if (file.isVideo || file.fileType?.includes('video')) {
                            // Safely handle fileUrl
                            let fileUrl = '';
                            if (typeof file.fileUrl === 'string') {
                                fileUrl = file.fileUrl;
                            } else if (file.fileUrl && typeof file.fileUrl === 'object' && file.fileUrl.base) {
                                fileUrl = file.fileUrl.base;
                            } else if (file.fileUrl) {
                                fileUrl = String(file.fileUrl);
                            }

                            videos.push({
                                id: file._id || `${Date.now()}-${Math.random()}`,
                                title: file.fileName,
                                fileName: file.fileName,
                                fileUrl: fileUrl,
                                availableResolutions: file.availableResolutions || [],
                                isVideo: true
                            });
                        }
                    });
                }

                if (subcategoryData?.folders) {
                    const checkFolderForVideos = (folder: any) => {
                        if (folder.files) {
                            folder.files.forEach((file: any) => {
                                if (file.isVideo || file.fileType?.includes('video')) {
                                    // Safely handle fileUrl
                                    let fileUrl = '';
                                    if (typeof file.fileUrl === 'string') {
                                        fileUrl = file.fileUrl;
                                    } else if (file.fileUrl && typeof file.fileUrl === 'object' && file.fileUrl.base) {
                                        fileUrl = file.fileUrl.base;
                                    } else if (file.fileUrl) {
                                        fileUrl = String(file.fileUrl);
                                    }

                                    videos.push({
                                        id: file._id || `${Date.now()}-${Math.random()}`,
                                        title: file.fileName,
                                        fileName: file.fileName,
                                        fileUrl: fileUrl,
                                        availableResolutions: file.availableResolutions || [],
                                        isVideo: true
                                    });
                                }
                            });
                        }
                        if (folder.subfolders) {
                            folder.subfolders.forEach(checkFolderForVideos);
                        }
                    };
                    subcategoryData.folders.forEach(checkFolderForVideos);
                }
            });
        };

        extractVideosFromSection(pedagogy.I_Do, 'I_Do');
        extractVideosFromSection(pedagogy.We_Do, 'We_Do');
        extractVideosFromSection(pedagogy.You_Do, 'You_Do');

        return videos;
    };
    const handleVideoClick = (file: UploadedFile, tabType: "I_Do" | "weDo" | "youDo", subcategory: string) => {
        if (!selectedNode) return;

        // Safely handle fileUrl which can be string or object
        let fileUrl = '';

        if (typeof file.url === 'string') {
            fileUrl = file.url;
        } else if (file.url && typeof file.url === 'object') {
            // Use type assertion to tell TypeScript this is an object that might have a base property
            const urlObj = file.url as any;
            if (urlObj.base && typeof urlObj.base === 'string') {
                fileUrl = urlObj.base;
            } else {
                // If it's an object but no base property, try to stringify it
                fileUrl = String(file.url);
            }
        } else if (file.url) {
            fileUrl = String(file.url);
        }

        const allVideos = extractAllVideosFromNode(selectedNode);
        const currentVideoIndex = allVideos.findIndex(video =>
            video.id === file.id || video.fileName === file.name
        );

        setCurrentVideoUrl(fileUrl);
        setCurrentVideoName(file.name);
        setCurrentVideoResolutions(file.availableResolutions || []);
        setShowVideoViewer(true);
        setVideoPlaylist(allVideos);
        setCurrentVideoIndex(currentVideoIndex >= 0 ? currentVideoIndex : 0);
    };



    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-4xl mb-4">❌</div>
                    <p className="text-red-600 text-sm font-medium">Error loading course structure</p>
                    <p className="text-slate-500 text-xs mt-2">Please try again later</p>
                </div>
            </div>
        )
    }
    const searchCourseStructure = useCallback((query: string, nodes: CourseNode[]): CourseNode[] => {
        if (!query.trim()) return []

        const results: CourseNode[] = []
        const lowerQuery = query.toLowerCase()

        const searchNodes = (nodeList: CourseNode[]) => {
            for (const node of nodeList) {
                // Check if current node matches search
                const nodeMatches = node.name.toLowerCase().includes(lowerQuery)

                if (nodeMatches) {
                    // Add the matching node and all its children
                    results.push(node)

                    // If this node has children and is expanded (or we want to show children in search),
                    // add all children to results
                    if (node.children && node.children.length > 0) {
                        // Add all children of matching nodes
                        node.children.forEach(child => {
                            if (!results.some(r => r.id === child.id)) {
                                results.push(child)
                            }
                        })
                    }
                } else {
                    // If node doesn't match but has children, search recursively
                    if (node.children && node.children.length > 0) {
                        searchNodes(node.children)
                    }
                }
            }
        }

        searchNodes(nodes)
        return results
    }, [])
    // Add this useEffect to handle search
    useEffect(() => {
        if (searchQuery.trim()) {
            setIsSearching(true)
            const results = searchCourseStructure(searchQuery, courseData)
            setSearchResults(results)
            setIsSearching(false)
        } else {
            setSearchResults([])
        }
    }, [searchQuery, courseData, searchCourseStructure])



    // Then in your subcategories configuration:



    useEffect(() => {
        if (selectedNode) {
            const refreshData = async () => {
                await refreshContentData(selectedNode);
            };
            refreshData();
        }
    }, [selectedNode?.id, activeTab, activeSubcategory]);
    if (!courseId) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-amber-500 text-4xl mb-4">⚠️</div>
                    <p className="text-amber-600 text-sm font-medium">No course ID provided</p>
                    <p className="text-slate-500 text-xs mt-2">Please select a course first</p>
                </div>
            </div>
        )
    }
    const extractFileNameFromUrl = (url: string) => {
        try {
            const decoded = decodeURIComponent(url);
            const fileName = decoded.split('/').pop()?.split('?')[0]; // Use optional chaining
            return fileName || "external_link";
        } catch {
            return "external_link";
        }
    };

    const FilterSection = () => {
        // Get available file types based on ACTUAL uploaded files in current location
        const getAvailableFileTypes = useMemo(() => {
            if (!selectedNode) return [];

            const currentTabData = contentData[selectedNode.id]?.[activeTab] || {};
            const currentSubcategoryData = currentTabData[activeSubcategory] || [];
            const currentState = getCurrentNavigationState();
            const isInFolder = currentState.currentFolderId !== null;

            // Type guard to narrow union items to FolderItem
            const isFolderItem = (item: FolderItem | UploadedFile): item is FolderItem => {
                return (item as FolderItem).type === 'folder';
            };

            // Recursive function to extract file types from folder structure
            const extractFileTypesFromItems = (items: (FolderItem | UploadedFile)[]): string[] => {
                const types: string[] = [];

                items.forEach(item => {
                    if (isFolderItem(item)) {
                        // Add folder type and recursively check contents
                        types.push('folder');
                        if (item.subfolders && item.subfolders.length > 0) {
                            types.push(...extractFileTypesFromItems(item.subfolders));
                        }
                        if (item.files && item.files.length > 0) {
                            types.push(...extractFileTypesFromItems(item.files));
                        }
                    } else {
                        // It's a file - determine the type
                        const file = item as UploadedFile;

                        // Handle URL files
                        if (file.type?.includes("url") || file.type?.includes("link") ||
                            file.name?.includes("http")) {
                            types.push('url');
                        }
                        // Handle reference files
                        else if (file.isReference === true || file.isReference === "true" ||
                            file.type?.includes("reference")) {
                            types.push('reference');
                        }
                        // Handle PDF files
                        else if (file.type?.includes("pdf") || file.name?.toLowerCase().endsWith(".pdf")) {
                            types.push('pdf');
                        }
                        // Handle PPT files
                        else if (file.type?.includes("ppt") || file.type?.includes("powerpoint") ||
                            file.name?.toLowerCase().endsWith(".ppt") ||
                            file.name?.toLowerCase().endsWith(".pptx")) {
                            types.push('ppt');
                        }
                        // Handle video files
                        else if (file.type?.includes("video") ||
                            file.name?.match(/\.(mp4|avi|mov|mkv|webm|ogg|flv|wmv|m4v|3gp|mpg|mpeg)$/i)) {
                            types.push('video');
                        }
                        // Handle ZIP files
                        else if (file.type?.includes("zip") || file.type?.includes("archive") ||
                            file.name?.toLowerCase().endsWith(".zip") ||
                            file.name?.match(/\.(zip|rar|7z|tar|gz)$/i)) {
                            types.push('zip');
                        }
                        // For other files, use the type key if it matches fileTypes
                        else if (file.type) {
                            const matchedType = fileTypes.find(ft =>
                                file.type?.includes(ft.key) || ft.key === file.type
                            );
                            if (matchedType) {
                                types.push(matchedType.key);
                            }
                        }
                    }
                });

                return types;
            };

            // Get current folder contents
            const { folders: currentFolders, files: currentFiles } = getCurrentFolderContents();

            // Extract types from current location (including nested content)
            let allFileTypes: string[] = [];

            if (isInFolder) {
                // Inside folder - show both folders and files that exist here (including nested)
                allFileTypes = extractFileTypesFromItems([...currentFolders, ...currentFiles]);
            } else {
                // Root level - show folders and files
                allFileTypes = extractFileTypesFromItems([...currentFolders, ...currentFiles]);
            }

            // Remove duplicates and return unique types
            const uniqueTypes = [...new Set(allFileTypes)];

            // Create options for available types with dark color icons
            const baseOptions = uniqueTypes.includes('folder') ? [
                {
                    value: 'folder',
                    label: 'Folders',
                    icon: <Folder size={14} className="text-amber-600" />,
                    color: '#b45309'
                }
            ] : [];

            const dynamicOptions = uniqueTypes
                .filter(type => type !== 'folder')
                .map(type => {
                    const fileTypeConfig = fileTypes.find(ft => ft.key === type);

                    // Tailwind dark color classes mapping
                    const darkColorClasses: { [key: string]: { icon: string, color: string } } = {
                        pdf: { icon: "text-red-600", color: "#dc2626" },
                        ppt: { icon: "text-orange-500", color: "#ea580c" },
                        video: { icon: "text-violet-500", color: "#7c3aed" },
                        zip: { icon: "text-amber-500", color: "#d97706" },
                        url: { icon: "text-emerald-500", color: "#059669" },
                        reference: { icon: "text-gray-500", color: "#4b5563" },
                        word: { icon: "text-blue-600", color: "#1d4ed8" },
                        excel: { icon: "text-green-600", color: "#15803d" },
                    };

                    const colorConfig = darkColorClasses[type] || { icon: "text-gray-600", color: "#374151" };

                    return {
                        value: type,
                        label: fileTypeConfig?.label || type.charAt(0).toUpperCase() + type.slice(1),
                        icon: fileTypeConfig ?
                            React.cloneElement(fileTypeConfig.icon, {
                                size: 14,
                                className: colorConfig.icon
                            }) :
                            <FileText size={14} className="text-gray-600" />,
                        color: colorConfig.color
                    };
                });

            return [...baseOptions, ...dynamicOptions];
        }, [selectedNode, contentData, activeTab, activeSubcategory, fileTypes, getCurrentNavigationState, getCurrentFolderContents]);

        const [showMoreFilters, setShowMoreFilters] = useState(false);
        const [searchInput, setSearchInput] = useState('');

        const handleFileTypeToggle = (fileType: string) => {
            setActiveFilters(prev => ({
                ...prev,
                fileTypes: prev.fileTypes.includes(fileType)
                    ? prev.fileTypes.filter(type => type !== fileType)
                    : [...prev.fileTypes, fileType]
            }));
        };

        const handleSelectAll = () => {
            const availableTypes = getAvailableFileTypes.map(option => option.value);
            setActiveFilters(prev => ({
                ...prev,
                fileTypes: prev.fileTypes.length === availableTypes.length ? [] : availableTypes
            }));
        };

        const clearAllFilters = () => {
            setActiveFilters({ fileTypes: [], searchFilter: '' });
            setSearchInput('');
        };

        // Handle input change without applying filter
        const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setSearchInput(value);
            // Don't update activeFilters here - wait for Enter key
        };

        // Handle form submit (when user presses Enter)
        const handleSearchSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            // Apply the filter only when Enter is pressed
            setActiveFilters(prev => ({ ...prev, searchFilter: searchInput }));
        };

        // Clear search input and filter
        const handleClearSearch = () => {
            setSearchInput('');
            setActiveFilters(prev => ({ ...prev, searchFilter: '' }));
        };

        // Handle more filters toggle
        const handleMoreFiltersToggle = () => {
            setShowMoreFilters(!showMoreFilters);
        };

        // Close dropdown when clicking outside
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                const dropdown = document.getElementById('more-filters-dropdown');
                const button = document.getElementById('more-filters-button');

                if (dropdown && button && !dropdown.contains(event.target as Node) && !button.contains(event.target as Node)) {
                    setShowMoreFilters(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [showMoreFilters]);

        const availableTypes = getAvailableFileTypes.map(option => option.value);
        const isAllSelected = availableTypes.length > 0 && activeFilters.fileTypes.length === availableTypes.length;
        const hasActiveFilters = activeFilters.fileTypes.length > 0 || activeFilters.searchFilter;

        // Get main filters (first 4) and more filters (rest)
        const mainFilters = getAvailableFileTypes.slice(0, 4);
        const moreFilters = getAvailableFileTypes.slice(4);

        return (
            <div className="bg-white px-1 py-2">
                {/* Main Filter Row */}
                <div className="flex items-center gap-2">
                    {/* All Files Filter */}
                    <button
                        onClick={handleSelectAll}
                        className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
            ${isAllSelected
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                            }
          `}
                    >
                        <span>All</span>
                    </button>

                    {/* Main Filters (first 4) */}
                    {mainFilters.map((option) => {
                        const isSelected = activeFilters.fileTypes.includes(option.value);

                        return (
                            <button
                                key={option.value}
                                onClick={() => handleFileTypeToggle(option.value)}
                                className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${isSelected
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                                    }
              `}
                            >
                                {option.icon}
                                <span>{option.label}</span>
                            </button>
                        );
                    })}

                    {/* More Filters Button */}
                    {moreFilters.length > 0 && (
                        <div className="relative">
                            <button
                                id="more-filters-button"
                                onClick={handleMoreFiltersToggle}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                <ChevronDown
                                    size={12}
                                    className={`transition-transform duration-200 ${showMoreFilters ? 'rotate-180' : ''
                                        }`}
                                />
                                <span>More</span>
                            </button>

                            {/* More Filters Dropdown */}
                            {showMoreFilters && (
                                <div
                                    id="more-filters-dropdown"
                                    className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-10 animate-in fade-in duration-200"
                                >
                                    <div className="p-2">
                                        <div className="space-y-1">
                                            {moreFilters.map((option) => {
                                                const isSelected = activeFilters.fileTypes.includes(option.value);

                                                return (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            handleFileTypeToggle(option.value);
                                                        }}
                                                        className={`
                            w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors
                            ${isSelected
                                                                ? "bg-blue-50 text-blue-700"
                                                                : "text-gray-600 hover:bg-gray-50"
                                                            }
                          `}
                                                    >
                                                        <div className="flex items-center justify-center w-4">
                                                            {option.icon}
                                                        </div>
                                                        <span className="flex-1 text-left">{option.label}</span>
                                                        {isSelected && (
                                                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Search Input */}
                    <div className="flex-1 max-w-xs ml-auto">
                        <form onSubmit={handleSearchSubmit}>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={searchInput}
                                    onChange={handleSearchChange}
                                    className="w-full pl-9 pr-8 py-1.5 rounded-lg text-xs border border-gray-300 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                />
                                {searchInput && (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1 transition-colors whitespace-nowrap px-2 py-1.5 hover:bg-gray-100 rounded-lg"
                        >
                            <X size={14} />
                            Clear
                        </button>
                    )}
                </div>

                {/* Active Filter Chips */}
                {hasActiveFilters && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {/* Search Filter Chip */}
                        {activeFilters.searchFilter && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700">
                                <Search size={12} />
                                <span>"{activeFilters.searchFilter}"</span>
                                <button
                                    onClick={handleClearSearch}
                                    className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        {/* File Type Filter Chips */}
                        {activeFilters.fileTypes.map((type) => {
                            const option = getAvailableFileTypes.find(opt => opt.value === type);
                            return (
                                <div
                                    key={type}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700"
                                >
                                    {option?.icon}
                                    <span>{option?.label || type}</span>
                                    <button
                                        onClick={() => handleFileTypeToggle(type)}
                                        className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Add this function to get character count including HTML
    const getContentLength = (html: string) => {
        if (!html) return 0;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent?.length || 0;
    };

    // Update the truncateDescription function to be more reliable
    const truncateDescription = (description: string, maxLength: number = 150) => {
        if (!description) return 'No description';

        // Remove HTML tags for character counting
        const plainText = description.replace(/<[^>]*>/g, '');

        if (plainText.length <= maxLength) return description;

        // Find the last space within the maxLength to avoid cutting words
        const truncated = plainText.substr(0, maxLength);
        const lastSpaceIndex = truncated.lastIndexOf(' ');

        const finalText = lastSpaceIndex > 0
            ? truncated.substr(0, lastSpaceIndex)
            : truncated;

        return finalText + '...';
    };

    return (
        <>
            <div className="h-screen flex flex-col">
                <Navbar />

                <div className="h-screen flex flex-col overflow-hidden bg-white" style={{ fontFamily: "Segoe UI, Tahoma, Arial, sans-serif" }}>
                    {/* Global Styles */}
                    <style jsx global>{`
  /* Import Google Fonts */
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
  
  /* Apply fonts globally */
  * {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  h1, h2, h3, h4, h5, h6, 
  .heading, 
  [class*="heading-"], 
  [class*="title"] {
    font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 600;
  }

  /* Your existing utility classes */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .file-grid-item {
    transition: all 0.2s ease-in-out;
  }
  
  .file-grid-item:hover {
    transform: translateY(-2px);
  }

  .thin-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .thin-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .thin-scrollbar::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }

  .thin-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`}</style>

                    {/* Main Layout Container */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar */}
                        <div className="relative border-r border-gray-200 bg-white flex flex-col" style={{ width: `${sidebarWidth}px`, boxShadow: "2px 0 4px rgba(0,0,0,0.02)" }}>
                            {/* Sidebar Header - Only show when not minimized */}
                            {sidebarWidth > 60 && (
                                <div style={{ padding: "16px", flexShrink: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                                        <BookOpen
                                            style={{
                                                color: "#111827",
                                                width: "16px",
                                                height: "16px",
                                                marginRight: "6px"
                                            }}
                                        />
                                        <h2
                                            style={{
                                                margin: "0 0 4px 0",
                                                fontSize: "14px",
                                                fontWeight: "500",
                                                color: "#111827",
                                            }}
                                        >
                                            {courseStructureResponse?.data?.courseName || "Course Structure"}
                                        </h2>
                                    </div>
                                    {/* <div
                                        style={{
                                            margin: "0 0 8px 0",
                                            fontSize: "13px",
                                            color: "#6b7280",
                                            lineHeight: "1.4",
                                        }}
                                    >
                                        {courseStructureResponse?.data?.courseDescription && (
                                            <div className="mb-3">
                                                <div className={`text-xs text-gray-600 ${!isDescriptionExpanded ? 'line-clamp-2' : ''}`}>
                                                    <RichTextDisplay
                                                        content={courseStructureResponse.data.courseDescription}
                                                        className="min-h-0 text-xs leading-relaxed"
                                                    />
                                                </div>

                                                {getContentLength(courseStructureResponse.data.courseDescription) > 200 && (
                                                    <button
                                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-2 transition-colors flex items-center gap-1"
                                                    >
                                                        {isDescriptionExpanded ? (
                                                            <>
                                                                <ChevronUp size={12} />
                                                                Show Less
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown size={12} />
                                                                Show More
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div> */}

                                    <div style={{ position: "relative" }}>
                                        <Search
                                            style={{
                                                color: "#9ca3af",
                                                width: "16px",
                                                height: "16px",
                                                position: "absolute",
                                                top: "50%",
                                                left: "10px",
                                                transform: "translateY(-50%)",
                                            }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Search modules, topics, subtopics..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "6px 10px 6px 32px",
                                                fontSize: "12px",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "8px",
                                                outline: "none",
                                                backgroundColor: "#f9fafb",
                                            }}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                style={{
                                                    position: "absolute",
                                                    right: "8px",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "#9ca3af",
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Scrollable Content Area */}
                            {sidebarWidth > 60 && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="flex-1 overflow-y-auto thin-scrollbar">
                                        {renderHierarchy(courseData)}
                                    </div>
                                </div>
                            )}

                            {/* Grip handle - does toggle action */}
                            <div
                                className={`absolute right-0 h-full top-0 flex w-3 cursor-col-resize items-center justify-center transition-all ${isResizing ? "bg-gray-300" : "hover:bg-gray-300"
                                    }`}
                                onMouseDown={handleMouseDown}
                                onClick={(e) => {
                                    if (!isResizing) {
                                        setSidebarWidth(sidebarWidth === 60 ? 300 : 60);
                                    }
                                }}
                            >
                                <GripVertical size={14} className="text-gray-400" />
                            </div>

                            {sidebarWidth > 60 && (
                                <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-30">
                                    <button
                                        onClick={() => setSidebarWidth(60)}
                                        className="flex items-center justify-center w-8 h-8 cursor-pointer bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-all shadow-sm"
                                        title="Collapse sidebar"
                                    >
                                        <ChevronLeft size={14} className="text-gray-600" />
                                    </button>

                                </div>
                            )}

                            {sidebarWidth === 60 && (
                                <div className="flex flex-col items-center py-4 space-y-4 flex-1 justify-center">
                                    <SquareChevronRight
                                        size={18}
                                        onClick={() => setSidebarWidth(300)}
                                        className="text-gray-700 cursor-pointer"
                                    />
                                    <BookOpen size={18} className="text-gray-500" />
                                    <Search size={18} className="text-gray-500" />
                                </div>
                            )}
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
                            {/* Breadcrumbs */}
                            <div className="bg-white border-b border-gray-200 px-4 py-3">
                                <div className="flex items-center gap-1 text-xs">
                                    {breadcrumbs.map((crumb, index) => (
                                        <div key={index} className="flex items-center gap-1">
                                            {index > 0 && (
                                                <ChevronRight
                                                    size={10}
                                                    className="text-gray-300 mx-0.5"
                                                />
                                            )}

                                            {crumb.path ? (
                                                <a
                                                    href={crumb.path}
                                                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded transition-colors duration-150 flex items-center gap-1.5"
                                                >
                                                    {index === 0 && <Home size={10} className="text-gray-400" />}
                                                    {index === 1 && <BookOpen size={10} className="text-gray-400" />}
                                                    <span className="font-medium">{crumb.label}</span>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 py-1">
                                                    {index === 2 && <BookOpen size={10} className="text-gray-500" />}
                                                    {index === 3 && <Folder size={10} className="text-gray-500" />}
                                                    {index === 4 && <FileText size={10} className="text-gray-500" />}
                                                    {index === 5 && <File size={10} className="text-gray-500" />}

                                                    <span className={`font-semibold ${index === breadcrumbs.length - 1
                                                        ? 'text-gray-900'
                                                        : 'text-gray-700'
                                                        }`}>
                                                        {crumb.label}
                                                    </span>

                                                    {index === breadcrumbs.length - 1 && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-1"></div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
{/* Main Content */}
<div className="flex-1 flex flex-col overflow-hidden">
  {selectedNode ? (
    <>
      <div className="bg-white border-b border-gray-200 px-4 py-1.5">
        {/* Fixed height container for top row with massive margin */}
        <div className="flex items-start gap-2 mb-8">
          {/* Category Tabs with fixed height wrapper */}
          <div className="flex gap-1 flex-1">
            {["I_Do", "weDo", "youDo"].map((tabKey) => {
              const tab = {
                "I_Do": { label: "I Do", color: "bg-blue-500", icon: <Target size={14} /> },
                "weDo": { label: "We Do", color: "bg-blue-500", icon: <Users size={14} /> },
                "youDo": { label: "You Do", color: "bg-blue-500", icon: <BookOpen size={14} /> }
              }[tabKey];

              return (
                <div key={tabKey} className="flex-1 relative">
                  {/* Category button with fixed height */}
                  <button
                    onClick={() => {
                      setActiveTab(tabKey as any);
                      const firstSubcat = subcategories[tabKey as keyof typeof subcategories][0]?.key || "";
                      setActiveSubcategory(firstSubcat);
                      updateNavigationState({ currentFolderPath: [], currentFolderId: null });
                      if (tabKey === "weDo") setActiveComponent("Practical");
                      else setActiveComponent(null);
                    }}
                    className={`w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border h-[34px] ${activeTab === tabKey
                      ? `${tab.color} text-white border-transparent`
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>

                  {/* Activity tabs positioned below with HUGE space */}
                  {activeTab === tabKey && subcategories[tabKey]?.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 flex gap-0.5 z-10">
                      {subcategories[tabKey]?.map((subcat) => (
                        <button
                          key={subcat.key}
                          onClick={() => {
                            setActiveSubcategory(subcat.key);
                            updateNavigationState({ currentFolderPath: [], currentFolderId: null });
                            if (subcat.component) setActiveComponent(subcat.component);
                            else setActiveComponent(null);
                          }}
                          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded border ${activeSubcategory === subcat.key
                            ? "bg-blue-50 text-blue-700 border-blue-300"
                            : "text-gray-600 border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-1 justify-center truncate">
                            {subcat.icon}
                            <span className="truncate">{subcat.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* REMOVED: Add Button from top section entirely */}
          {/* Empty div to maintain layout spacing */}
          <div className="flex-shrink-0 h-[34px] w-0"></div>
        </div>

        {/* Breadcrumb - MASSIVE top margin */}
        {(() => {
          const currentState = getCurrentNavigationState();
          return currentState.currentFolderPath.length > 0 && (
            <div className="flex items-center gap-2 text-xs mt-20">
              <button
                onClick={navigateUp}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Go up"
              >
                <ArrowUp size={12} />
              </button>
              <div className="flex items-center gap-1">
                {currentState.currentFolderPath.map((folder, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <ChevronRight size={10} className="text-gray-400" />}
                    <span className={`px-1.5 py-1 rounded ${index === currentState.currentFolderPath.length - 1
                      ? "bg-gray-100 font-medium"
                      : "text-gray-600"
                      }`}>
                      {folder}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white px-2">
        {(() => {
          // Check if we should show the ProblemSolving workspace
          if (activeTab === "weDo" && activeComponent === "Practical") {
            // For "project_development" subcategory, show different content
            if (activeSubcategory === "project_development") {
              return (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                  <div className="text-gray-400 text-sm">
                    <FolderTree size={40} className="mx-auto mb-3 opacity-50" />
                    <p>Project Development Area</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Use the "Add Resource" button to add project materials
                    </p>
                  </div>
                </div>
              );
            }

            // Get question banks data
            const questionBanksData = questionBanks.length > 0
              ? questionBanks
              : courseStructureResponse?.data?.questionBanks
              || selectedNode?.originalData?.questionBanks
              || [];

            return (
              <div className="h-full flex gap-3">
                {/* Right side - Full Problem Solving Component */}
                <div className="flex-1 min-w-0 h-full">
                  <ProblemSolving
                    courseId={courseId || ""}
                    courseName={courseStructureResponse?.data?.courseName}
                    selectedNode={selectedNode}
                    initialQuestionBanks={questionBanksData}
                  />
                </div>
              </div>
            );
          }

          // Default: Show files/folders view for other tabs
          const { folders: currentFolders, files: currentFiles } = getCurrentFolderContents()
          const { folders: filteredFolders, files: filteredFiles } = getFilteredItems(currentFolders, currentFiles);
          const hasContent = filteredFolders.length > 0 || filteredFiles.length > 0

          return hasContent ? (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Filter Section with Add Resource button for I Do */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <FilterSection />
                </div>
                {/* Add Resource button for I Do tab only */}
                {activeTab === "I_Do" && (
                  <button
                    onClick={handleResourcesModalOpen}
                    className="ml-3 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-semibold flex items-center gap-1 hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <Plus size={12} />
                    Add Resource
                  </button>
                )}
              </div>

              {/* Files/Folders List */}
              <div className="flex-1 overflow-y-auto">
                {renderFileList(filteredFolders, filteredFiles, activeTab, activeSubcategory)}
              </div>
            </div>
          ) : (
            /* Empty State for files/folders - Show Add Resource button only for I Do */
            <div className="flex flex-col items-center justify-center py-8 text-center h-full">
              <FileText size={40} className="text-gray-300 mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {activeFilters.fileTypes.length > 0 || activeFilters.searchFilter
                  ? 'No items found'
                  : 'No content yet'
                }
              </h3>
              <p className="text-gray-600 text-sm mb-4 max-w-xs">
                {activeFilters.fileTypes.length > 0 || activeFilters.searchFilter
                  ? 'Try adjusting your filters to see more results.'
                  : 'Start by adding resources to organize your content.'
                }
              </p>
              {/* Only show Add Resource button for I Do tab */}
              {activeTab === "I_Do" && (
                <button
                  onClick={handleResourcesModalOpen}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-semibold flex items-center gap-1 hover:bg-blue-700 transition-colors"
                >
                  <Plus size={12} />
                  Add Resource
                </button>
              )}
            </div>
          )
        })()}
      </div>
    </>
  ) : (
    /* Empty Selection State */
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-200">
          <BookOpen size={20} className="text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Select Content</h3>
        <p className="text-gray-600 text-sm mb-4">
          Choose a course element from the sidebar to manage content and resources.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200">
            <div className="w-1.5 h-1.5 bg-blue-400  rounded-full"></div>
            I Do
          </div>
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            We Do
          </div>
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200">
            <div className="w-1.5 h-1.5 bg-blue-400  rounded-full"></div>
            You Do
          </div>
        </div>
      </div>
    </div>
  )}
</div>
                        </div>
                    </div>

                    {/* Modals */}
                    {showResourcesModal && (
                        <div
                            onClick={() => setShowResourcesModal(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-200">
                            <div
                                className="bg-white rounded-2xl p-6 mx-4 shadow-2xl border border-gray-100 transform transition-transform duration-200 scale-100 w-[600px] max-h-[80vh] overflow-hidden flex flex-col"
                            >
                                <div
                                    className="flex items-center justify-between mb-4 border-b pb-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-50 rounded-xl">
                                            <BookPlus className="text-blue-600" size={22} />
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-800 tracking-tight">
                                            Add Resource
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setShowResourcesModal(false)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-150"
                                    >
                                        <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                                    </button>
                                </div>
                                {fileTypes && fileTypes.length > 0 && (
                                    <p className="text-sm text-gray-600 mb-4">
                                        Select the type of resource you want to add to your course.
                                    </p>
                                )}
                                <div className="flex-1 ">
                                    {fileTypes && fileTypes.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-4 mt-4">
                                            {fileTypes?.map((item, index) => (
                                                <div
                                                    key={`${item.key}-${index}`}
                                                    className="relative animate-in slide-in-from-bottom-4 duration-500"
                                                    style={{ animationDelay: `${index * 100}ms` }}
                                                >
                                                    <button
                                                        className="flex flex-col cursor-pointer items-center justify-center gap-2 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300  hover:shadow-lg transition-all text-sm text-gray-700 font-medium w-full  group"
                                                        onClick={() => {
                                                            if (item.key.includes("folder")) {
                                                                setShowCreateFolderModal(true);
                                                            } else {
                                                                setSelectedFileType(item.key);
                                                                setShowUploadModal(true);
                                                            }
                                                        }}
                                                    >
                                                        <span className="text-2xl" style={{ color: item.color }}>
                                                            {item.icon}
                                                        </span>
                                                        <span>{item.label}</span>
                                                        <div className="absolute bottom-2 right-2">
                                                            <svg
                                                                className="w-4 h-4 text-gray-400 hover:text-blue-500 cursor-pointer info-icon"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                                onMouseEnter={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    const tooltip = document.getElementById(`tooltip-${item.key}-${index}`);
                                                                    if (tooltip) {
                                                                        tooltip.style.display = 'block';
                                                                        tooltip.style.position = 'fixed';
                                                                        tooltip.style.top = `${rect.top - 40}px`;
                                                                        tooltip.style.left = `${rect.left + rect.width / 2}px`;
                                                                        tooltip.style.transform = 'translateX(-50%)';
                                                                        tooltip.style.zIndex = '60';
                                                                    }
                                                                }}
                                                                onMouseLeave={() => {
                                                                    const tooltip = document.getElementById(`tooltip-${item.key}-${index}`);
                                                                    if (tooltip) {
                                                                        tooltip.style.display = 'none';
                                                                    }
                                                                }}
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center gap-2 p-4">
                                            <AlertCircle className="w-12 h-12 text-gray-400" />
                                            <p className="text-gray-500 font-medium text-lg">
                                                No resources available
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="absolute pointer-events-none">
                                {fileTypes?.map((item, index) => (
                                    <div
                                        key={`tooltip-${item.key}-${index}`}
                                        id={`tooltip-${item.key}-${index}`}
                                        className="hidden bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg"
                                        style={{
                                            display: 'none',
                                            position: 'fixed',
                                            zIndex: 60,
                                            pointerEvents: 'none'
                                        }}
                                    >
                                        {item.tooltip}
                                        <div
                                            className="absolute top-full left-1/2 transform -translate-x-1/2"
                                            style={{
                                                width: 0,
                                                height: 0,
                                                borderLeft: '5px solid transparent',
                                                borderRight: '5px solid transparent',
                                                borderTop: '5px solid #111827'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upload Modal */}
                    {showUploadModal && (
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-200"
                            onClick={(e) => {
                                e.preventDefault()
                            }}
                        >
                            <div
                                ref={uploadModalRef}
                                className={`bg-white rounded-xl p-4 mx-4 shadow-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative ${isButtonLoading ? 'opacity-60 pointer-events-none' : ''
                                    }`}
                                onClick={(e) => e.stopPropagation()}
                                style={{ minHeight: '500px' }}
                            >
                                {isButtonLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg
                                                className="w-8 h-8 text-green-500 animate-spin"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                ></path>
                                            </svg>
                                            <span className="text-sm text-gray-600 font-medium">
                                                {selectedFileType === 'url' ? 'Adding URL...' : 'Uploading Files...'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {/* Compact Header */}
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            {React.cloneElement(fileTypes.find((t) => t.key === selectedFileType)?.icon || <FileText />, {
                                                size: 20,
                                                className: "text-blue-600"
                                            })}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                <span className="text-2xl">{updateFileId ? "U" : "U"}</span>pload{" "}
                                                <span className="text-2xl">{updateFileId ? "F" : "F"}</span>ile
                                                {updateFileId ? "s" : "s"}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {getCurrentNavigationState().currentFolderPath.length > 0
                                                    ? `To "${getCurrentNavigationState().currentFolderPath[getCurrentNavigationState().currentFolderPath.length - 1]}"`
                                                    : "Add files with metadata"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={resetUploadModalStates}
                                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer duration-150"
                                    >
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                                {/* Main Content - Compact Scrollable Area */}
                                <div className="flex-1 overflow-y-auto thin-scrollbar space-y-3 pr-2 -mr-2">
                                    {/* File Details Section */}
                                    <div className="border border-gray-200 bg-white">
                                        <button
                                            className="flex cursor-pointer items-center justify-between w-full p-3 text-left hover:bg-gray-200 bg-gray-100 transition-colors duration-150"
                                            onClick={() => setExpandedUploadSection(expandedUploadSection === 'description' ? '' : 'description')}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-100 rounded-lg">
                                                    <FileText className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">File Details</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">Add file details and upload</p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedUploadSection === 'description' ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {expandedUploadSection === 'description' && (
                                            <div className="px-3 pb-3 space-y-4">
                                                {selectedFileType === 'url' ? (
                                                    <>
                                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                            {updateFileId ? 'Update URL' : 'Enter URL'}
                                                        </label>
                                                        <div className="space-y-3">
                                                            <input
                                                                type="url"
                                                                value={folderUrl}
                                                                onChange={(e) => setFolderUrl(e.target.value)}
                                                                placeholder="https://example.com"
                                                                className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white"
                                                            />
                                                            {updateFileId && (
                                                                <p className="text-xs text-blue-600">
                                                                    Editing existing URL. Update the URL above and click "Update URL".
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-gray-500">
                                                                {updateFileId
                                                                    ? "Update the URL to change the linked resource"
                                                                    : "Enter a valid URL to link external resources"
                                                                }
                                                            </p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* File Name Input Field - Updated for update mode */}
                                                        {selectedFiles.length > 0 && (
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                                    {updateFileId ? 'New File' : `File Name${selectedFiles.length > 1 ? 's' : ''}`}
                                                                </label>

                                                                {updateFileId && (
                                                                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                                        <p className="text-xs text-blue-700 font-medium">
                                                                            Updating existing file: <span className="font-bold">{fileDisplayNames[updateFileId]}</span>
                                                                        </p>
                                                                        <p className="text-xs text-blue-600 mt-1">
                                                                            Selected file will replace the current one
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                <div className="space-y-2">
                                                                    {selectedFiles.map((file, index) => (
                                                                        <div key={updateFileId ? updateFileId : file.name} className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={fileDisplayNames[updateFileId || file.name] || file.name}
                                                                                onChange={(e) => {
                                                                                    const newDisplayNames = { ...fileDisplayNames }
                                                                                    const key = updateFileId || file.name;
                                                                                    newDisplayNames[key] = e.target.value
                                                                                    setFileDisplayNames(newDisplayNames)

                                                                                    setUploadingFiles(prev => prev.map(uploadFile =>
                                                                                        uploadFile.id === (updateFileId || uploadFile.id)
                                                                                            ? { ...uploadFile, name: e.target.value }
                                                                                            : uploadFile
                                                                                    ))
                                                                                }}
                                                                                placeholder="Enter file name..."
                                                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white"
                                                                            />
                                                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                                                .{file.name.split('.').pop()}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <p className="text-xs text-gray-500 mt-2">
                                                                    {selectedFileType === "reference"
                                                                        ? "This will be displayed as 'Reference Material' to students"
                                                                        : updateFileId
                                                                            ? "New file will replace the existing file"
                                                                            : "You can customize the file name before uploading"
                                                                    }
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Show existing file info when no new file is selected for update */}
                                                        {updateFileId && selectedFiles.length === 0 && (
                                                            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                                <p className="text-xs text-gray-700 font-medium">
                                                                    Current file: <span className="font-bold">{fileDisplayNames[updateFileId]}</span>
                                                                </p>
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    Select a new file to replace the existing one
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="mt-2">
                                                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                                {updateFileId ? 'Select New File' : 'File Upload'}
                                                            </label>
                                                            <div
                                                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50/50 cursor-pointer transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/30"
                                                                onClick={() => fileInputRef.current?.click()}
                                                                onDragOver={(e) => {
                                                                    e.preventDefault()
                                                                    e.currentTarget.classList.add("border-green-500", "bg-green-50/50")
                                                                }}
                                                                onDragLeave={(e) => {
                                                                    e.preventDefault()
                                                                    e.currentTarget.classList.remove("border-green-500", "bg-green-50/50")
                                                                }}
                                                                onDrop={(e) => {
                                                                    e.preventDefault()
                                                                    e.currentTarget.classList.remove("border-green-500", "bg-green-50/50")
                                                                    const files = e.dataTransfer.files
                                                                    if (files.length > 0) {
                                                                        handleFileSelection(files)
                                                                    }
                                                                }}
                                                            >
                                                                <div className="mb-2" style={{ color: fileTypes.find((t) => t.key === selectedFileType)?.color }}>
                                                                    {React.cloneElement(fileTypes.find((t) => t.key === selectedFileType)?.icon || <FileText />, {
                                                                        size: 32,
                                                                    })}
                                                                </div>
                                                                <h4 className="text-sm font-semibold text-gray-800 mb-1">
                                                                    {updateFileId
                                                                        ? `Drop new file to replace "${fileDisplayNames[updateFileId]}"`
                                                                        : `Drop ${fileTypes.find((t) => t.key === selectedFileType)?.label} files here`}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 mb-2">or click to browse your computer</p>
                                                                <p className="text-[10px] text-gray-400">
                                                                    Accepted formats: {fileTypes.find((t) => t.key === selectedFileType)?.accept}
                                                                </p>

                                                                <input
                                                                    ref={fileInputRef}
                                                                    type="file"
                                                                    multiple={!updateFileId}
                                                                    accept={fileTypes.find((t) => t.key === selectedFileType)?.accept}
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const files = e.target.files
                                                                        if (files && files.length > 0) {
                                                                            handleFileSelection(files)
                                                                        }
                                                                    }}
                                                                />
                                                            </div>

                                                            {uploadingFiles.length > 0 && (
                                                                <div className="mt-3">
                                                                    <h4 className="text-xs font-semibold text-gray-800 mb-2">
                                                                        {updateFileId ? "Selected File:" : `Selected Files (${selectedFiles.length}):`}
                                                                    </h4>
                                                                    {uploadingFiles.map((file) => (
                                                                        <div
                                                                            key={file.id}
                                                                            className="bg-white p-2.5 rounded-md mb-2 border border-gray-200 animate-slideIn"
                                                                        >
                                                                            <div className="flex items-center mb-1.5">
                                                                                <Upload size={12} className="text-gray-500 mr-1.5" />
                                                                                <span className="text-[11px] text-gray-800 flex-1">
                                                                                    {updateFileId ? `Replacement for: ${fileDisplayNames[updateFileId]}` : file.name}
                                                                                </span>
                                                                                <span className="text-[10px] text-gray-500">{file.progress}%</span>
                                                                            </div>
                                                                            <div className="w-full h-1 bg-gray-200 rounded overflow-hidden">
                                                                                <div
                                                                                    className={`h-full transition-all duration-200 ${file.status === "error"
                                                                                        ? "bg-red-500"
                                                                                        : file.status === "completed"
                                                                                            ? "bg-green-500"
                                                                                            : file.status === "ready"
                                                                                                ? "bg-blue-500"
                                                                                                : file.status === "submitting"
                                                                                                    ? "bg-orange-500 animate-pulse"
                                                                                                    : "bg-blue-500"
                                                                                        }`}
                                                                                    style={{ width: `${file.progress}%` }}
                                                                                />
                                                                            </div>
                                                                            {file.status === "ready" && (
                                                                                <div className="text-[10px] text-blue-600 mt-1 font-medium">
                                                                                    ✓ Ready to submit - Click Update File button
                                                                                </div>
                                                                            )}
                                                                            {file.status === "submitting" && (
                                                                                <div className="text-[10px] text-orange-600 mt-1 font-medium animate-pulse">
                                                                                    Updating file...
                                                                                </div>
                                                                            )}
                                                                            {file.status === "completed" && (
                                                                                <div className="text-[10px] text-green-500 mt-1">
                                                                                    {updateFileId ? "Update completed" : "Upload completed"}
                                                                                </div>
                                                                            )}
                                                                            {file.status === "error" && (
                                                                                <div className="text-[10px] text-red-500 mt-1">
                                                                                    {updateFileId ? "Update failed" : "Upload failed"}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                                File Description
                                                            </label>
                                                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                                                <Editor value={text} onTextChange={(e) => setText("")} style={{ height: '220px' }} />
                                                            </div>
                                                            <input type="hidden" name="uploadDescription" value={uploadDescription} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                    {/* Tags Section */}
                                    <div className="border border-gray-200 bg-white">
                                        <button
                                            className="flex items-center cursor-pointer justify-between w-full p-3 text-left hover:bg-gray-200 bg-gray-100 transition-colors duration-150"
                                            onClick={() => setExpandedUploadSection(expandedUploadSection === 'tags' ? null : 'tags')}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 rounded-lg">
                                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">Tags</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {uploadTags.length > 0 ? `${uploadTags.length} tag(s) added` : "Add tags to organize"}
                                                    </p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedUploadSection === 'tags' ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {expandedUploadSection === 'tags' && (
                                            <div className="px-3 pb-3 space-y-4">
                                                {/* Tag Input */}
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="grid grid-cols-12 gap-2 items-end mt-2">
                                                        <div className="col-span-7">
                                                            <label className="block text-xs font-semibold text-gray-700 mb-2">Tag Name</label>
                                                            <input
                                                                type="text"
                                                                value={uploadCurrentTag}
                                                                onChange={(e) => setUploadCurrentTag(e.target.value)}
                                                                placeholder="Enter tag name..."
                                                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                                                            />
                                                        </div>
                                                        <div className="col-span-4">
                                                            <label className="text-xs font-semibold text-gray-700 mb-2">Tag Color</label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="color"
                                                                    value={uploadTagColor}
                                                                    onChange={(e) => setUploadTagColor(e.target.value)}
                                                                    className="w-7 h-7 rounded-lg cursor-pointer border border-gray-300"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={uploadTagColor}
                                                                    onChange={(e) => setUploadTagColor(e.target.value)}
                                                                    placeholder="#000000"
                                                                    className="flex-1 px-2 py-2 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-span-3 flex items-end">
                                                            <button
                                                                onClick={() => {
                                                                    if (uploadCurrentTag.trim()) {
                                                                        addUploadTag(uploadCurrentTag.trim(), uploadTagColor);
                                                                        setUploadCurrentTag('');
                                                                        setUploadTagColor('#3B82F6');
                                                                    }
                                                                }}
                                                                disabled={!uploadCurrentTag.trim()}
                                                                className={`
                                                relative w-28 h-6 rounded-lg flex items-center border transition-all duration-300
                                                ${uploadCurrentTag.trim()
                                                                        ? 'cursor-pointer border-green-500 bg-green-500 group hover:bg-green-600'
                                                                        : 'cursor-not-allowed border-gray-300 bg-gray-300'}
                                            `}
                                                            >
                                                                <span className={`text-white font-semibold ml-4 transform transition-all duration-300 text-xs ${uploadCurrentTag.trim() ? 'group-hover:translate-x-20' : ''}`}>
                                                                    Add Tag
                                                                </span>
                                                                <span className={`absolute right-0 h-full w-10 rounded-lg flex items-center justify-center transition-all duration-300 ${uploadCurrentTag.trim() ? 'bg-green-500 group-hover:w-full transform group-hover:translate-x-0' : 'bg-gray-400 w-10'}`}>
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                                        <line x1="12" y1="5" x2="12" y2="19" />
                                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                                    </svg>
                                                                </span>
                                                            </button>
                                                            <div className="flex items-center ml-2 justify-center">
                                                                {loading && (
                                                                    <svg
                                                                        className="w-4 h-4 text-green-500 animate-spin"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <circle
                                                                            className="opacity-25"
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="10"
                                                                            stroke="currentColor"
                                                                            strokeWidth="4"
                                                                        ></circle>
                                                                        <path
                                                                            className="opacity-75"
                                                                            fill="currentColor"
                                                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                                        ></path>
                                                                    </svg>
                                                                )}
                                                                {success && !loading && (
                                                                    <svg
                                                                        className="w-4 h-4 text-green-600 animate-scaleFade"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2.5"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Tags Display */}
                                                {uploadTags.length > 0 && (
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                            Added Tags ({uploadTags.length})
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {uploadTags.map((tag, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-sm"
                                                                    style={{
                                                                        borderColor: tag.tagColor || '#3B82F6',
                                                                        backgroundColor: `${tag.tagColor || '#3B82F6'}15`,
                                                                        color: tag.tagColor || '#3B82F6'
                                                                    }}
                                                                >
                                                                    <span>{tag.tagName}</span>
                                                                    <button
                                                                        onClick={() => removeUploadTag(index)}
                                                                        className="p-0.5 hover:bg-black/10 rounded-full transition-colors"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {/* Access Restrictions Section */}
                                    <div className="border border-gray-200 bg-white">
                                        <button
                                            className="flex items-center cursor-pointer justify-between w-full p-3 text-left hover:bg-gray-200 bg-gray-100 transition-colors duration-150"
                                            onClick={() => setExpandedUploadSection(expandedUploadSection === 'access' ? null : 'access')}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-100 rounded-lg">
                                                    <LockKeyhole className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">Access Restrictions</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {uploadAccessLevel === 'private' && 'Only you can access'}
                                                        {uploadAccessLevel === 'team' && 'Visible to your team'}
                                                        {uploadAccessLevel === 'public' && 'Anyone with link'}
                                                    </p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedUploadSection === 'access' ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {expandedUploadSection === 'access' && (
                                            <div className="px-3 pb-3 mt-2">
                                                <div className="space-y-2">
                                                    {[
                                                        { value: 'private', icon: Lock, label: 'Private', description: 'Only you can access' },
                                                        { value: 'team', icon: Users, label: 'Team', description: 'Visible to your team' },
                                                        { value: 'public', icon: Globe, label: 'Public', description: 'Anyone with link' }
                                                    ].map(({ value, icon: Icon, label, description }) => (
                                                        <label
                                                            key={value}
                                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${uploadAccessLevel === value
                                                                ? 'bg-purple-50 border-purple-200'
                                                                : 'border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="uploadAccessLevel"
                                                                value={value}
                                                                checked={uploadAccessLevel === value}
                                                                onChange={(e) => setUploadAccessLevel(e.target.value)}
                                                                className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                                            />
                                                            <Icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-medium text-gray-900">{label}</div>
                                                                <div className="text-[10px] text-gray-500 mt-0.5">{description}</div>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Settings Section */}
                                    <div className="border border-gray-200 bg-white">
                                        <button
                                            className="flex items-center cursor-pointer justify-between w-full p-3 text-left hover:bg-gray-200 bg-gray-100 transition-colors duration-150"
                                            onClick={() => setExpandedUploadSection(expandedUploadSection === 'settings' ? null : 'settings')}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <Settings className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">File Settings</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">Configure file options</p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedUploadSection === 'settings' ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {expandedUploadSection === 'settings' && (
                                            <div className="px-3 pb-3 mt-2 space-y-3">
                                                {/* Show to Students Toggle */}
                                                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 bg-white rounded border border-gray-200">
                                                            <Eye className="w-4 h-4 text-gray-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-900">Show to students</p>
                                                            <p className="text-[10px] text-gray-500">Make document visible to students</p>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={documentSettings[updateFileId || 'temp']?.studentShow ?? true}
                                                            onChange={(e) => {
                                                                const fileId = updateFileId || 'temp';
                                                                const currentSettings = documentSettings[fileId] || {
                                                                    studentShow: true,
                                                                    downloadAllow: true
                                                                };
                                                                const newSettings = {
                                                                    studentShow: e.target.checked,
                                                                    downloadAllow: currentSettings.downloadAllow
                                                                };

                                                                // Update local state immediately
                                                                setDocumentSettings(prev => ({
                                                                    ...prev,
                                                                    [fileId]: newSettings
                                                                }));

                                                                // If it's an existing file (not temp), update in backend
                                                                if (updateFileId && updateFileId !== 'temp') {
                                                                    handleUpdateFileSettings(updateFileId, newSettings);
                                                                }
                                                            }}
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>

                                                {/* Allow Download Toggle */}
                                                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 bg-white rounded border border-gray-200">
                                                            <Download className="w-4 h-4 text-gray-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-900">Allow download</p>
                                                            <p className="text-[10px] text-gray-500">Students can download this file</p>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={documentSettings[updateFileId || 'temp']?.downloadAllow ?? true}
                                                            onChange={(e) => {
                                                                const fileId = updateFileId || 'temp';
                                                                const currentSettings = documentSettings[fileId] || {
                                                                    studentShow: true,
                                                                    downloadAllow: true
                                                                };
                                                                const newSettings = {
                                                                    studentShow: currentSettings.studentShow,
                                                                    downloadAllow: e.target.checked
                                                                };

                                                                // Update local state immediately
                                                                setDocumentSettings(prev => ({
                                                                    ...prev,
                                                                    [fileId]: newSettings
                                                                }));

                                                                // If it's an existing file (not temp), update in backend
                                                                if (updateFileId && updateFileId !== 'temp') {
                                                                    handleUpdateFileSettings(updateFileId, newSettings);
                                                                }
                                                            }}
                                                            disabled={!documentSettings[updateFileId || 'temp']?.studentShow}
                                                        />
                                                        <div className={`
                        w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 
                        peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] 
                        after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 
                        after:border after:rounded-full after:h-5 after:w-5 after:transition-all
                        ${!documentSettings[updateFileId || 'temp']?.studentShow
                                                                ? "bg-gray-100 cursor-not-allowed"
                                                                : (documentSettings[updateFileId || 'temp']?.downloadAllow ?? true)
                                                                    ? "bg-blue-600"
                                                                    : "bg-gray-200"
                                                            }
                    `}></div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Action Buttons - Fixed at bottom */}
                                <div className="flex justify-end gap-3 pt-1">
                                    <button
                                        onClick={async () => {
                                            setIsButtonLoading(true);

                                            if (selectedFileType === 'url') {
                                                if (!folderUrl.trim()) {
                                                    alert("Please enter a valid URL");
                                                    setIsButtonLoading(false);
                                                    return;
                                                }

                                                // Prepare URL data for submission
                                                const urlData = {
                                                    fileUrl: folderUrl,
                                                    fileName: urlFileName || extractFileNameFromUrl(folderUrl),
                                                    fileType: urlFileType,
                                                    tabType: toBackendTab(activeTab),
                                                    subcategory: activeSubcategory,
                                                    folderPath: getCurrentNavigationState().currentFolderPath.join('/'),
                                                    courses: selectedNode?.originalData?.courses || "",
                                                    topicId: selectedNode?.originalData?.topicId || "",
                                                    index: selectedNode?.originalData?.index || 0,
                                                    title: selectedNode?.originalData?.title || "",
                                                    description: selectedNode?.originalData?.description || "",
                                                    duration: selectedNode?.originalData?.duration || "",
                                                    level: selectedNode?.originalData?.level || "",
                                                    isUpdate: updateFileId ? "true" : "false",
                                                    ...(updateFileId && { updateFileId }),
                                                    showToStudents: documentSettings[updateFileId || 'temp']?.studentShow ?? true,
                                                    allowDownload: documentSettings[updateFileId || 'temp']?.downloadAllow ?? true,
                                                };

                                                // In the URL upload section of your action button, replace the success handling with:
                                                try {
                                                    // Check if selectedNode exists
                                                    if (!selectedNode) {
                                                        alert("No node selected");
                                                        return;
                                                    }

                                                    // Create proper UploadedFile objects
                                                    const uploadingFile: UploadedFile = {
                                                        id: `url-${Date.now()}`,
                                                        name: 'URL Resource',
                                                        progress: 0,
                                                        status: 'submitting',
                                                        subcategory: activeSubcategory,
                                                        folderId: getCurrentNavigationState().currentFolderId,
                                                        type: 'url/link',
                                                        size: 0,
                                                        url: folderUrl,
                                                        uploadedAt: new Date(),
                                                        tags: [],
                                                        folderPath: getCurrentNavigationState().currentFolderPath.join('/'),
                                                        isReference: false,
                                                        isVideo: false,
                                                        originalFileName: 'URL Resource',
                                                        description: '',
                                                        accessLevel: 'private',
                                                        availableResolutions: []
                                                    };

                                                    setUploadingFiles([uploadingFile]);

                                                    // Convert to FormData
                                                    const formData = new FormData();
                                                    Object.entries(urlData).forEach(([key, value]) => {
                                                        if (value !== undefined && value !== null) {
                                                            formData.append(key, value.toString());
                                                        }
                                                    });

                                                    // Send request
                                                    const response = await entityApi.updateEntity(
                                                        selectedNode.type as "module" | "submodule" | "topic" | "subtopic",
                                                        selectedNode.id,
                                                        formData
                                                    );
                                                    // Update progress with proper UploadedFile object
                                                    const completedFile: UploadedFile = {
                                                        ...uploadingFile,
                                                        progress: 100,
                                                        status: 'completed'
                                                    };

                                                    setUploadingFiles([completedFile]);

                                                    // Refresh content data
                                                    setContentData(prev => {
                                                        const newData = { ...prev };
                                                        delete newData[selectedNode.id];
                                                        return newData;
                                                    });

                                                    await refreshContentData(selectedNode, response.data);

                                                    // Close modal after short delay
                                                    setTimeout(() => {
                                                        resetUploadModalStates();
                                                        showSuccessToast("URL link added successfully!");
                                                    }, 800);

                                                } catch (error) {
                                                    console.error("Failed to add URL:", error);
                                                    showErrorToast("Failed to add URL link");
                                                    setUploadingFiles([]);
                                                    setIsButtonLoading(false);
                                                } finally {
                                                    setIsButtonLoading(false);
                                                }

                                            } else {
                                                // File upload logic
                                                const allReady = uploadingFiles.every(f => f.status === 'ready');
                                                if (!allReady) {
                                                    alert("Please wait for files to be processed");
                                                    setIsButtonLoading(false);
                                                    return;
                                                }

                                                setUploadingFiles(prev =>
                                                    prev.map(f => ({ ...f, status: 'submitting' }))
                                                );

                                                const renamedFiles = selectedFiles.map(file => {
                                                    const displayName = fileDisplayNames[file.name] || file.name;
                                                    const finalName = selectedFileType === "reference" ? "Reference Material" : displayName;

                                                    // Preserve file extension
                                                    const originalExtension = file.name.split('.').pop();
                                                    const fileNameWithExtension = finalName.includes('.') ? finalName : `${finalName}.${originalExtension}`;

                                                    return fileNameWithExtension !== file.name
                                                        ? new File([file], fileNameWithExtension, { type: file.type })
                                                        : file;
                                                });

                                                const dataTransfer = new DataTransfer();
                                                renamedFiles.forEach(file => dataTransfer.items.add(file));

                                                if (updateFileId) {
                                                    await handleFileUpdate(dataTransfer.files);
                                                } else {
                                                    // ✅ This now correctly calls handleFileUpload which uses updateEntity API
                                                    await handleFileUpload(
                                                        dataTransfer.files,
                                                        activeTab,
                                                        activeSubcategory
                                                    );
                                                }
                                                setIsButtonLoading(false);
                                            }
                                        }}
                                        disabled={
                                            selectedFileType === 'url'
                                                ? !folderUrl.trim() || uploadingFiles.some(f => f.status === 'submitting')
                                                : uploadingFiles.length === 0 ||
                                                uploadingFiles.some(f => f.status !== 'ready') ||
                                                uploadingFiles.some(f => f.status === 'submitting')
                                        }
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                                    >
                                        {uploadingFiles.some(f => f.status === 'submitting') ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                </svg>
                                                {updateFileId ? 'Updating...' : selectedFileType === 'url' ? 'Adding URL...' : 'Uploading...'}
                                            </>
                                        ) : (
                                            <>
                                                {selectedFileType === 'url' ? (
                                                    <>
                                                        <Link2 size={16} />
                                                        {updateFileId ? 'Update URL' : 'Add URL'}
                                                    </>
                                                ) : updateFileId ? (
                                                    <>
                                                        <RefreshCw size={16} />
                                                        Update File
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={16} />
                                                        Upload Files
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </button>

                                </div>
                            </div>
                        </div>
                    )
                    }
                    {showCreateFolderModal && (
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-200"
                            onClick={(e) => {
                                e.preventDefault()

                            }}
                        >
                            <div
                                className={`bg-white rounded-xl p-4 mx-4 shadow-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative ${isButtonLoading ? 'opacity-60 pointer-events-none' : ''
                                    }`} onClick={(e) => e.stopPropagation()}
                                style={{ minHeight: '500px' }} >
                                {isButtonLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                                        <div className="flex flex-col items-center gap-3">
                                            <svg
                                                className="w-8 h-8 text-green-500 animate-spin"
                                                fill="none"
                                                viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                            </svg>
                                            <span className="text-sm text-gray-600 font-medium">
                                                {selectedFileType === 'url' ? 'Adding URL...' : 'Uploading Files...'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {/* Compact Header - Dynamic based on mode */}
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <img
                                                src="/active-images/folder.png"
                                                alt="Create Folder"
                                                className="w-7 h-7"
                                            />                                </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {editingFolder ? (
                                                    <>
                                                        <span className="text-2xl">E</span>dit{" "}
                                                        <span className="text-2xl">F</span>older
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-2xl">C</span>reate{" "}
                                                        <span className="text-2xl">N</span>ew{" "}
                                                        <span className="text-2xl">F</span>older
                                                    </>
                                                )}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {editingFolder ? "Update your folder details" : "Organize your files efficiently"}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowCreateFolderModal(false);
                                            setEditingFolder(null);
                                            setEditFolderName("");
                                            setNewFolderName("");
                                            setFolderTags([]);
                                        }}
                                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer duration-150"
                                    >
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>

                                {/* Main Content - Compact Scrollable Area */}
                                <div className="flex-1 overflow-y-auto thin-scrollbar space-y-3 pr-2 -mr-2">
                                    {/* Folder Details Section */}
                                    <div className="border border-gray-200 bg-white">
                                        <button
                                            className="flex cursor-pointer items-center justify-between w-full p-3 text-left hover:bg-gray-200 bg-gray-100 transition-colors duration-150"
                                            onClick={() => setExpandedSection(expandedSection === 'folderName' ? null : 'folderName')} >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">Folder Details <span className="text-red-500">*</span></h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">Required information</p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedSection === 'folderName' ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {expandedSection === 'folderName' && (
                                            <div className="px-3 pb-3 space-y-4 ">
                                                {/* Folder Name */}
                                                <div>
                                                    <label className="block mt-2 text-xs font-semibold text-gray-700 mb-2">
                                                        Folder Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editingFolder ? editFolderName : newFolderName}
                                                        onChange={(e) => editingFolder ? setEditFolderName(e.target.value) : setNewFolderName(e.target.value)}
                                                        placeholder="Enter folder name..."
                                                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white"
                                                        onKeyPress={(e) => e.key === 'Enter' && (editingFolder ? saveEditFolder() : createFolder())}
                                                        autoFocus />
                                                </div>
                                                {/* Folder Description - Only show for create mode or if editing folder has description */}
                                                {!editingFolder && (
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 mb-2">Folder Description</label>
                                                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                                                            <Editor value={text} onTextChange={(e) => setText(e.htmlValue || "")} style={{ height: '220px' }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {/* Tags Section - Show for both create and edit */}
                                    <div className="border border-gray-200 bg-white">
                                        <button
                                            className="flex items-center cursor-pointer justify-between w-full p-3 text-left hover:bg-gray-200 bg-gray-100 transition-colors duration-150"
                                            onClick={() => setExpandedSection(expandedSection === 'tags' ? null : 'tags')} >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-green-100 rounded-lg">
                                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">Tags</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {folderTags.length > 0 ? `${folderTags.length} tag(s) added` : "Add tags to organize"}
                                                    </p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedSection === 'tags' ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {expandedSection === 'tags' && (
                                            <div className="px-3 pb-3 space-y-4">
                                                {/* Tag Input */}
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="grid grid-cols-12 gap-2 items-end mt-2">
                                                        <div className="col-span-7">
                                                            <label className="block text-xs font-semibold text-gray-700 mb-2">Tag Name</label>
                                                            <input
                                                                type="text"
                                                                value={currentTag}
                                                                onChange={(e) => setCurrentTag(e.target.value)}
                                                                placeholder="Enter tag name..."
                                                                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none bg-white" />
                                                        </div>

                                                        <div className="col-span-4">
                                                            <label className="text-xs font-medium text-gray-700 mb-1.5 block">Tag Color :</label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="color"
                                                                    value={tagColor}
                                                                    onChange={(e) => setTagColor(e.target.value)}
                                                                    className="w-7 h-7 rounded-lg cursor-pointer border border-gray-300" />
                                                                <input
                                                                    type="text"
                                                                    value={tagColor}
                                                                    onChange={(e) => setTagColor(e.target.value)}
                                                                    placeholder="#000000"
                                                                    className="flex-1 px-2 py-2 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white" />
                                                            </div>
                                                        </div>
                                                        <div className="col-span-3 flex items-end">
                                                            <button
                                                                onClick={() => {
                                                                    if (currentTag.trim()) {
                                                                        addTag(currentTag.trim(), tagColor);
                                                                        setCurrentTag('');
                                                                        setTagColor('');
                                                                    }
                                                                }}
                                                                disabled={!currentTag.trim()}
                                                                className={`
                        relative w-28 h-6 rounded-lg flex items-center border transition-all duration-300
                        ${currentTag.trim()
                                                                        ? 'cursor-pointer border-green-500 bg-green-500 group hover:bg-green-600'
                                                                        : 'cursor-not-allowed border-gray-300 bg-gray-300'}
                      `}>
                                                                <span
                                                                    className={`
                          text-white font-semibold ml-4 transform transition-all duration-300 text-xs
                          ${currentTag.trim() ? 'group-hover:translate-x-20' : ''}
                        `} >
                                                                    Add Tag
                                                                </span>
                                                                <span
                                                                    className={`
                          absolute right-0 h-full w-10 rounded-lg flex items-center justify-center transition-all duration-300
                          ${currentTag.trim() ? 'bg-green-500 group-hover:w-full transform group-hover:translate-x-0' : 'bg-gray-400 w-10'}
                        `} >
                                                                    <svg
                                                                        className="w-4 h-4 text-white"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        viewBox="0 0 24 24">
                                                                        <line x1="12" y1="5" x2="12" y2="19" />
                                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                                    </svg>
                                                                </span>
                                                            </button>
                                                            {/* Loading */}
                                                            <div className="flex items-center ml-2 justify-center">
                                                                {loading && (
                                                                    <svg
                                                                        className="w-4 h-4 text-green-500 animate-spin"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24">
                                                                        <circle
                                                                            className="opacity-25"
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="10"
                                                                            stroke="currentColor"
                                                                            strokeWidth="4" ></circle>
                                                                        <path
                                                                            className="opacity-75"
                                                                            fill="currentColor"
                                                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                                    </svg>
                                                                )}

                                                                {success && !loading && (
                                                                    <svg
                                                                        className="w-4 h-4 text-green-600 animate-scaleFade"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2.5"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        viewBox="0 0 24 24" >
                                                                        <path d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Tags Display */}
                                                {folderTags.length > 0 && (
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                            Added Tags ({folderTags.length})
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {folderTags.map((tag, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 hover:shadow-sm"
                                                                    style={{
                                                                        borderColor: tag.tagColor || '#3B82F6',
                                                                        backgroundColor: `${tag.tagColor || '#3B82F6'}15`,
                                                                        color: tag.tagColor || '#3B82F6'
                                                                    }}>
                                                                    <span>{tag.tagName}</span>
                                                                    <button
                                                                        onClick={() => removeTag(index)}
                                                                        className="p-0.5 hover:bg-black/10 rounded-full transition-colors">
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Access Restrictions - Only show for create mode */}
                                    {!editingFolder && (
                                        <div className="border border-gray-200 bg-white">
                                            <button
                                                className="flex items-center cursor-pointer justify-between w-full p-3 text-left hover:bg-gray-200 bg-gray-100 transition-colors duration-150"
                                                onClick={() => setExpandedSection(expandedSection === 'access' ? null : 'access')}>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-purple-100 rounded-lg">
                                                        <LockKeyhole className="w-4 h-4 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900">Access Restrictions</h4>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            {accessLevel === 'private' && 'Only you can access'}
                                                            {accessLevel === 'team' && 'Visible to your team'}
                                                            {accessLevel === 'public' && 'Anyone with link'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <svg
                                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedSection === 'access' ? 'rotate-180' : ''
                                                        }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24" >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {expandedSection === 'access' && (
                                                <div className="px-3 pb-3 mt-2">
                                                    <div className="space-y-2">
                                                        {[
                                                            { value: 'private', icon: Lock, label: 'Private', description: 'Only you can access' },
                                                            { value: 'team', icon: Users, label: 'Team', description: 'Visible to your team' },
                                                            { value: 'public', icon: Globe, label: 'Public', description: 'Anyone with link' }
                                                        ].map(({ value, icon: Icon, label, description }) => (
                                                            <label
                                                                key={value}
                                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${accessLevel === value
                                                                    ? 'bg-purple-50 border-purple-200'
                                                                    : 'border-gray-200 hover:bg-gray-50'
                                                                    }`} >
                                                                <input
                                                                    type="radio"
                                                                    name="accessLevel"
                                                                    value={value}
                                                                    checked={accessLevel === value}
                                                                    onChange={(e) => setAccessLevel(e.target.value)}
                                                                    className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500" />
                                                                <Icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-medium text-gray-900">{label}</div>
                                                                    <div className="text-[10px] text-gray-500 mt-0.5">{description}</div>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Folder Settings */}
                                    <div className="border border-gray-200 bg-white">
                                        <button
                                            className="flex items-center cursor-pointer justify-between w-full p-3 text-left hover:bg-gray-200 bg-gray-100 transition-colors duration-150"
                                            onClick={() => setExpandedSection(expandedSection === 'settings' ? null : 'settings')}>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900">Folder Settings</h4>
                                                    <p className="text-xs text-gray-500 mt-0.5">Configure folder options</p>
                                                </div>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedSection === 'settings' ? 'rotate-180' : ''
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {expandedSection === 'settings' && (
                                            <div className="px-3 pb-3 mt-2">
                                                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-gray-100 rounded-lg">
                                                            <EyeOff className="w-4 h-4 text-gray-600" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-medium text-gray-900">Hide from students</div>
                                                            <div className="text-[10px] text-gray-500 mt-0.5">Students won't see this folder</div>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={hideStudentSettings[selectedFolderForSettings?.id || ""] || false}
                                                        onChange={(e) => {
                                                            const folderId = selectedFolderForSettings?.id || ""
                                                            setHideStudentSettings((prev) => ({
                                                                ...prev,
                                                                [folderId]: e.target.checked,
                                                            }))
                                                        }}
                                                        className="w-4 h-4 cursor-pointer text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Action Buttons - Fixed at bottom */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={async () => {
                                            setIsButtonLoading(true);
                                            if (editingFolder) {
                                                await saveEditFolder();
                                            } else {
                                                await createFolder();
                                            }
                                            setIsButtonLoading(false);
                                        }}
                                        disabled={(editingFolder ? !editFolderName.trim() : !newFolderName.trim()) || isButtonLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 justify-center"
                                    >
                                        {isButtonLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                                                {editingFolder ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            <>
                                                <Folder className="w-4 h-4" />
                                                {editingFolder ? 'Update Folder' : 'Create Folder'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showUploadDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowUploadDropdown(false)} />}

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && deleteTarget && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 w-80 border border-gray-200 shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                        <Trash2 size={20} className="text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Delete {deleteTarget.type}</h3>
                                        <p className="text-sm text-gray-600">This action cannot be undone</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 mb-6">
                                    Are you sure you want to delete "{deleteTarget.name}"?
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmDelete}
                                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File Viewers */}
                    {showPDFViewer && (
                        <PDFViewer
                            fileUrl={currentPDFUrl}
                            fileName={currentPDFName}
                            onClose={() => {
                                setShowPDFViewer(false)
                                setCurrentPDFUrl("")
                                setCurrentPDFName("")
                            }}
                        />
                    )}

                    {showPPTViewer && (
                        <PPTViewer
                            isOpen={showPPTViewer}
                            onClose={() => {
                                setShowPPTViewer(false)
                                setCurrentPPTUrl("")
                                setCurrentPPTName("")
                            }}
                            pptUrl={currentPPTUrl}
                            title={currentPPTName}
                        />
                    )}

                    {showZipViewer && (
                        <ZipViewer
                            fileUrl={currentZipUrl}
                            fileName={currentZipName}
                            onClose={() => {
                                setShowZipViewer(false)
                                setCurrentZipUrl("")
                                setCurrentZipName("")
                            }}
                        />
                    )}

                    {showVideoViewer && (
                        <VideoViewer
                            fileUrl={currentVideoUrl}
                            fileName={currentVideoName}
                            availableResolutions={currentVideoResolutions}
                            isVideo={true}
                            allVideos={videoPlaylist}
                            currentVideoIndex={currentVideoIndex}
                            onVideoChange={(index) => {
                                setCurrentVideoIndex(index)
                                const video = videoPlaylist[index]
                                setCurrentVideoUrl(typeof video.fileUrl === 'string' ? video.fileUrl : '')
                                setCurrentVideoName(video.fileName)
                                setCurrentVideoResolutions(video.availableResolutions || [])
                            }}
                            onClose={() => {
                                setShowVideoViewer(false)
                                setCurrentVideoUrl("")
                                setCurrentVideoName("")
                                setCurrentVideoResolutions([])
                                setVideoPlaylist([])
                                setCurrentVideoIndex(0)
                            }}
                        />
                    )}


                    {/* Question Bank Modal - Professional Compact */}
                    {showQuestionBankModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
                                {/* Header */}
                                <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800">Create Question Bank</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">Organize your questions efficiently</p>
                                        </div>
                                        <button
                                            onClick={() => setShowQuestionBankModal(false)}
                                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Form */}
                                <div className="px-5 py-4 space-y-4">
                                    {/* Name Input */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={newQuestionBank.name}
                                                onChange={(e) => {
                                                    const value = e.target.value.slice(0, 50);
                                                    setNewQuestionBank(prev => ({ ...prev, name: value }));
                                                }}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                placeholder="Enter name"
                                                autoFocus
                                            />
                                            {newQuestionBank.name.trim() && (
                                                <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2">
                                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description Input */}
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Description
                                        </label>
                                        <textarea
                                            value={newQuestionBank.description}
                                            onChange={(e) => {
                                                const value = e.target.value.slice(0, 150);
                                                setNewQuestionBank(prev => ({ ...prev, description: value }));
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                            rows={2}
                                            placeholder="Brief description (optional)"
                                        />
                                    </div>


                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => setShowQuestionBankModal(false)}
                                            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreateQuestionBank}
                                            disabled={isButtonLoading || !newQuestionBank.name.trim()}
                                            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition flex items-center justify-center ${!newQuestionBank.name.trim()
                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                                                }`}
                                        >
                                            {isButtonLoading ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Creating...
                                                </>
                                            ) : (
                                                'Create'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div >

        </>
    )
}