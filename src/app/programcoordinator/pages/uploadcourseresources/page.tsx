"use client"

import { useMemo } from "react"
import React, { useState, useRef, useCallback, useEffect } from "react"
import {
    ChevronRight,
    ChevronDown,
    ChevronLeft,
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
    SquareMenu,
    Menu,
    SquareChevronRight,
    ExternalLink,
    TypeIcon,
} from "lucide-react"
import { Icon } from 'lucide-react';

import dynamic from "next/dynamic";
import 'react-quill/dist/quill.snow.css';
import { useQuery } from "@tanstack/react-query"
import { courseDataApi, entityApi, type CourseStructureData, type Module, type SubModule, type Topic, type SubTopic } from "@/apiServices/coursesData"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import { showErrorToast, showSuccessToast } from "@/components/ui/toastUtils";
import PDFViewer from "../../components/pdfView"
import VideoViewer from "../../components/videosViewer"
import ZipViewer from "../../components/zipViewer";
import PPTViewer from "../../components/pptView";

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
    folderPath?: string // Add this if not already there
    // Additional optional properties used throughout the file
    isReference?: boolean | string
    isVideo?: boolean
    originalFileName?: string
    description?: string
    accessLevel?: string
    availableResolutions?: string[]
}

interface FolderItem {
    id: string
    name: string
    type: "folder"
    parentId: string | null
    children: (FolderItem | UploadedFile)[]
    tabType: "I_Do" | "weDo" | "youDo"
    subcategory: string
    files?: UploadedFile[]
    subfolders?: FolderItem[]
    tags?: Tag[]
    folderPath?: string // Add this if not already there
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
    const [isResourcesModalLoading, setIsResourcesModalLoading] = useState(false);

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
  const fileUrl = file.url || '';
  
  if (fileType.includes("url") || fileType.includes("link") || fileName.includes("http")) {
    const url = typeof fileUrl === 'string' ? fileUrl : (fileUrl as any)?.base;
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
  
   // Validate file URL before opening
  if (!fileUrl || fileUrl.includes('blob:') || fileUrl.includes('temp/')) {
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

    const uploadDropdownRef = useRef<HTMLDivElement>(null);

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
            })),
            weDo: courseData.We_Do.map((item: string, index: number) => ({
                key: item.toLowerCase().replace(/\s+/g, "_"),
                label: item,
                icon: <Users size={14} />,
            })),
            youDo: courseData.You_Do.map((item: string, index: number) => ({
                key: item.toLowerCase().replace(/\s+/g, "_"),
                label: item,
                icon: <HelpCircle size={14} />,
            })),
        }
    }, [courseStructureResponse])

    const fileTypes = useMemo(() => {
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
            Video: {
                key: "video",
                label: "Video",
                icon: <Video size={22} />,
                color: "#3b82f6",
                tooltip: "Upload video files or embed video content",
                accept:
                    "video/*,.mp4,.avi,.mov,.mkv,.webm,.ogg,.flv,.wmv,.m4v,.3gp,.mpg,.mpeg,.ts,.mts,.m2ts,.vob,.ogv,.qt,.rm,.rmvb,.asf,.amv,.divx,.mxf",
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
        const dynamicTypes = courseStructureResponse?.data?.resourcesType
            ?.filter((type: string) => {
                const normalizedType = type.trim().toUpperCase();
                return normalizedType !== 'FOLDER' && normalizedType !== 'ZIP' && normalizedType !== 'REFERENCE';
            })
            .map((type: string) => {
                const normalizedType = type.trim().toUpperCase();

                if (baseConfigMap[normalizedType]) {
                    return baseConfigMap[normalizedType];
                }

                return {
                    key: type.toLowerCase().replace(/\s+/g, "_"),
                    label: type,
                    icon: <FileText size={16} />,
                    accept: "*",
                    color: "#6b7280",
                };
            }) || [];

        return [
            baseConfigMap.FOLDER,
            ...dynamicTypes,     
            baseConfigMap.ZIP,
            baseConfigMap.REFERENCE,
        ];
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
            } else if (file.fileUrl && file.fileUrl.base) {
                fileUrl = file.fileUrl.base; 
            } else if (file.fileUrl && typeof file.fileUrl === 'object') {
                fileUrl = Object.values(file.fileUrl).join('');
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
                isReference: isReference // Make sure this is set
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
    // If caller did not provide backendData, we cannot safely fetch node-level data using courseDataApi
    // because courseDataApi.getById returns react-query options. To avoid runtime/typing issues, require
    // callers to pass backendData when available. If not provided, bail out early.
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
                                    })) || []
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

                    // Process root files
// In the root files processing section, ensure URL files are handled correctly:
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
        })) || []
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
            setActiveSubcategory(subcategories[activeTab][0]?.key || "");
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
                                    isReference:file.isReference,
                                    folderId: null, // Root level files
                                    tags: file.tags?.map((tag: any) => ({
                                        tagName: tag.tagName || tag.name || '',
                                        tagColor: tag.tagColor || tag.color || '#3B82F6'
                                    })) || [] // Add tag objects
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
        const findFolderById = (folders: FolderItem[], id: string): FolderItem | null => {
            for (const folder of folders) {
                if (folder.id === id) return folder;
                if (folder.subfolders) {
                    const found = findFolderById(folder.subfolders, id);
                    if (found) return found;
                }
            }
            return null;
        };
        const folder = findFolderById(folders, folderId);
        if (!folder) {
            console.error('Folder not found:', folderId);
            return;
        }
        const fullPath = folder.folderPath ? folder.folderPath.split('/') : [folder.name];
        updateNavigationState({
            currentFolderId: folderId,
            currentFolderPath: fullPath,
        });
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
                        children: folder.children.filter(item => {
                            if ('url' in item) return item.id !== fileId;
                            return true;
                        }),
                        subfolders: (folder.subfolders || []).map(removeFileFromFolder)
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
    // Add any missing optional properties with default values
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
  [selectedNode, selectedFileType, fileTypes, getCurrentNavigationState, refreshContentData, getCurrentFolderContents],
);

const handleFileSelection = (files: FileList | null) => {
    if (files && files.length > 0) {
        const newFileNames: Record<string, string> = {}
        const newDisplayNames: Record<string, string> = {}
        
        if (updateFileId && Object.keys(fileNames).length > 0) {
            const existingFileName = Object.keys(fileNames)[0];
            Array.from(files).forEach(file => {
                newFileNames[file.name] = existingFileName; // Default to existing name
                newDisplayNames[file.name] = existingFileName; // Default display name
            });
        } else {
            Array.from(files).forEach(file => {
                // For reference files, show "Reference" as default display name
                const displayName = selectedFileType === "reference" ? "Reference" : file.name;
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
    id: `${Date.now()}-${index}`,
    name: newDisplayNames[file.name] || file.name,
    progress: 0,
    status: 'preparing' as const,
    subcategory: activeSubcategory, // Required property
    folderId: getCurrentNavigationState().currentFolderId, // Required property
    // Add other required properties with defaults
    type: file.type || "unknown",
    size: file.size,
    url: "",
    uploadedAt: new Date(),
    // Optional properties with defaults
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
    setFileNames({
        [file.name]: file.name
    });
    setUploadDescription(file?.description || ''); 
    setUploadTags(file?.tags || []); 
    setUploadAccessLevel(file?.accessLevel || 'private');
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
// In your renderHierarchy function, replace the search results section with:
if (searchQuery.trim()) {
  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">
          Search Results ({searchResults.length})
        </span>
        {isSearching && (
          <Loader2 size={14} className="text-blue-500 animate-spin" />
        )}
      </div>
      
      {searchResults.length === 0 && !isSearching ? (
        <div className="text-center py-4 text-gray-500 text-xs">
          No results found for "{searchQuery}"
        </div>
      ) : (
        <div className="space-y-1">
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
  )
}
  // Original hierarchy rendering for when not searching
  const filteredNodes = nodes.reduce((acc: CourseNode[], node) => {
    if (node.type === "course" && node.children) {
      return [...acc, ...node.children];
    }
    return [...acc, node];
  }, []);

  return filteredNodes.map((node) => (
    <div
      key={node.id}
      style={{ marginLeft: `${(node.level - 1) * 12}px` }}
    >
      <div
        className={`flex items-start px-2 py-1 cursor-pointer rounded mb-[1px] transition-all duration-200 
          ${selectedNode?.id === node.id
            ? "bg-emerald-50 border border-emerald-500"
            : "bg-transparent border border-transparent hover:bg-gray-50"
          }
          ${!node.children || node.children.length === 0
            ? "cursor-pointer"
            : "cursor-default"
          }`}
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
          className="flex-shrink-0 w-[18px] mr-[6px] flex items-center justify-center mt-[2px]"
        >
          {node.children && node.children.length > 0 ? (
            expandedNodes.has(node.id) ? (
              <ChevronDown size={14} className="text-gray-500" />
            ) : (
              <ChevronRight size={14} className="text-gray-500" />
            )
          ) : (
            <div className="w-[12px]" />
          )}
        </div>
        <div className="flex items-start flex-1 gap-2">
          <div
            className={`flex-shrink-0 w-[20px] h-[20px] rounded-[4px] flex items-center justify-center
              ${node.type === "course"
                ? "bg-blue-500"
                : node.type === "module"
                  ? "bg-emerald-500"
                  : node.type === "submodule"
                    ? "bg-amber-500"
                    : node.type === "topic"
                      ? "bg-violet-500"
                      : "bg-red-500"
              }`}
          >
            {node.type === "course" && (
              <BookOpen size={11} className="text-white" />
            )}
            {node.type === "module" && (
              <Users size={11} className="text-white" />
            )}
            {node.type === "submodule" && (
              <Target size={11} className="text-white" />
            )}
            {(node.type === "topic" || node.type === "subtopic") && (
              <FileText size={11} className="text-white" />
            )}
          </div>
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between w-full flex-wrap">
              <span
                className={`text-[12px] text-gray-800 break-words leading-snug
                  ${node.type === "course"
                    ? "font-semibold"
                    : node.type === "module"
                      ? "font-medium"
                      : !node.children || node.children.length === 0
                        ? "font-medium"
                        : "font-normal"
                  }
                  ${!node.children || node.children.length === 0
                    ? "opacity-60"
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
        expandedNodes.has(node.id) &&
        renderHierarchy(node.children)}
    </div>
  ));
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
              className={`text-gray-500 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
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


const renderFileList = (
    folders: FolderItem[],
    files: UploadedFile[],
    tabType: "I_Do" | "weDo" | "youDo",
    subcategory: string
) => {
    const handleFolderClick = (folderId: string, folderName: string) => {
        navigateToFolder(folderId, folderName);
    };
    
    return (
        <div className="flex flex-col gap-1.5">
            {/* --- Folders --- */}
            {folders.map((folder) => (
                <div
                    key={folder.id}
                    onClick={() => handleFolderClick(folder.id, folder.name)}
                    className="flex items-center px-3 py-2.5 rounded-lg cursor-pointer
                 bg-slate-50 border border-slate-200 hover:border-sky-300 
                 hover:bg-slate-100 transition-all duration-200 shadow-sm"
                >
                    <div className="flex items-center flex-1 gap-2">
                        <Folder size={16} className="text-sky-500" />
                        <div>
                            <div className="text-xs font-semibold text-gray-800 leading-tight">
                                {folder.name}
                            </div>
                            <div className="text-[10px] text-gray-500">
                                {getFolderItemCount(folder.id)} items
                                {folder.subfolders?.length
                                    ? ` • ${folder.subfolders.length} subfolders`
                                    : ""}
                            </div>
                        </div>
                    </div>
                   {folder.tags && folder.tags.length > 0 && (
    <div className="flex flex-wrap items-center gap-1.5 mr-2">
        {folder.tags.map((tag, index) => (
            <div
                key={index}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border bg-white hover:bg-slate-50 transition"
                style={{
                    borderColor: tag.tagColor || "#94a3b8",
                    backgroundColor: `${tag.tagColor}10`,
                }}
            >
                <Tag size={11} style={{ color: tag.tagColor }} />
                <span
                    className="text-[10px] font-medium"
                    style={{ color: tag.tagColor }}
                >
                    {tag.tagName || "No tag"}
                </span>
            </div>
        ))}
    </div>
)}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                editFolder(folder);
                            }}
                            title="Edit folder"
                            className="p-1 rounded-sm cursor-pointer hover:bg-gray-100"
                        >
                            <Edit2 size={12} className="text-gray-500" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick("folder", folder, folder.name);
                            }}
                            title="Delete folder"
                            className="p-1 rounded-sm cursor-pointer bg-red-500 hover:bg-red-600 text-white flex items-center"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            ))}

            {/* --- Files --- */}
            {files.map((file) => {
                // Check if file is a reference file - handle both boolean true and string "true"
                const isReferenceFile = file.isReference === true || file.isReference === "true";
                
                return (
                    <div
                        key={file.id}
                        className="flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center flex-1 gap-2">
    {/* File Icon */}
    {getFileIcon(file.type || '', file.name, isReferenceFile)}
    
    <div className="flex-1">
        <div className="text-xs font-semibold text-gray-800 leading-tight">
            {file.name}
        </div>
        <div className="text-[10px] text-gray-500">
            {(file.type?.includes("url") || file.type?.includes("link")) 
                ? `External Link • ${file.uploadedAt?.toLocaleDateString() || 'Unknown date'}`
                : `${formatFileSize(file.size || 0)} • ${file.uploadedAt?.toLocaleDateString() || 'Unknown date'}`
            }
        </div>
    </div>
</div>

                        {/* Reference Badge - Show for reference files */}
                        {file.isReference && (
                            <div className="flex items-center gap-1.5 mr-2">
                                <div
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full border bg-white shadow-sm"
                                    style={{
                                        borderColor: "#8b5cf6",
                                        backgroundColor: "#8b5cf610",
                                    }}
                                >
                                    <BookOpen size={11} style={{ color: "#8b5cf6" }} />
                                    <span
                                        className="text-[10px] font-medium"
                                        style={{ color: "#8b5cf6" }}
                                    >
                                        Reference Guide
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Tags display */}
                      {file.tags && file.tags.length > 0 && (
    <div className="flex flex-wrap items-center gap-1.5 mr-2">
        {file.tags.map((tag, index) => (
            <div
                key={index}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border hover:bg-slate-50 transition"
                style={{
                    borderColor: tag.tagColor || "#3B82F6",
                    backgroundColor: `${tag.tagColor}10`,
                }}
            >
                <Tag size={11} style={{ color: tag.tagColor }} />
                <span
                    className="text-[10px] font-medium"
                    style={{ color: tag.tagColor }}
                >
                    {tag.tagName}
                </span>
            </div>
        ))}
    </div>
)}

                        {/* Action buttons */}
                       <div className="flex items-center gap-1">
    <button
        className="p-1 rounded-sm cursor-pointer bg-blue-500 text-white hover:bg-blue-600 flex items-center"
        onClick={() => {
            // Safely handle optional properties
            const fileType = file.type || '';
            const fileName = file.name || '';
            const fileUrl = file.url || '';
            
            // Handle URL/Link files - open in new tab
            if (fileType.includes("url") || fileType.includes("link")) {
                const url = typeof fileUrl === 'string' ? fileUrl : (fileUrl as any)?.base;
                if (url && url.startsWith('http')) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                } else {
                    alert('Invalid URL: ' + url);
                }
                return;
            }
            // Handle reference files
            else if (isReferenceFile) {
                if (fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
                    setCurrentPDFUrl(fileUrl);
                    setCurrentPDFName("Reference Material");
                    setShowPDFViewer(true);
                } else {
                    window.open(fileUrl, "_blank");
                }
                return;
            }
            // Handle PDF files
            else if (fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
                setCurrentPDFUrl(fileUrl);
                setCurrentPDFName(fileName);
                setShowPDFViewer(true);
                return;
            } 
            // Handle PPT files
            else if (
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
            else if (
                fileType.includes("video") ||
                fileName.match(/\.(mp4|avi|mov|mkv|webm|ogg|flv|wmv|m4v|3gp|mpg|mpeg)$/i)
            ) {
                handleVideoClick(file, tabType, subcategory);
                return;
            }
            // Handle ZIP files
            else if (
                fileType.includes("zip") ||
                fileName.toLowerCase().endsWith(".zip") ||
                fileType.includes("archive") ||
                fileName.match(/\.(zip|rar|7z|tar|gz)$/i)
            ) {
                setCurrentZipUrl(fileUrl);
                setCurrentZipName(fileName);
                setShowZipViewer(true);
                return;
            }
            // Handle other files - download or open
            else {
                window.open(fileUrl, "_blank");
            }
        }}
        title={file.type?.includes("url") || file.type?.includes("link") ? "Open link" : "Preview file"}
    >
        {isReferenceFile ? (
            <BookOpen size={12} />
        ) : file.type?.includes("url") || file.type?.includes("link") ? (
            <ExternalLink size={12} />
        ) : (
            <Eye size={12} />
        )}
    </button>            
    
    {/* Only show download button for non-URL files */}
    {!(file.type?.includes("url") || file.type?.includes("link")) && (
        <button
            className="p-1 rounded-sm cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600 flex items-center"
            onClick={() => {
                const fileUrl = file.url || '';
                const fileName = file.name || '';
                const a = document.createElement("a");
                a.href = fileUrl;
                a.download = fileName;
                a.click();
            }}
            title="Download file"
        >
            <Download size={12} />
        </button>
    )}
    
    <button
        className="p-1 rounded-sm cursor-pointer bg-amber-500 text-white hover:bg-amber-600 flex items-center"
        onClick={() => initiateFileUpdate(file, tabType, subcategory)}
        title="Update file"
    >
        <RefreshCw size={12} />
    </button>
    <button
        className="p-1 rounded-sm cursor-pointer bg-red-500 text-white hover:bg-red-600 flex items-center"
        onClick={() => handleDeleteClick("file", file, file.name || 'Unknown file')}
        title="Delete file"
    >
        <Trash2 size={12} />
    </button>
</div>
                    </div>
                );
            })}
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
  setFolderUrl('');
  setUrlFileName('');
  setUrlFileType('url/link');
  setIsButtonLoading(false); // Add this to reset loading state
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
        if (!selectedNode) return []
        const findPath = (nodes: CourseNode[], targetId: string, path: CourseNode[] = []): CourseNode[] | null => {
            for (const node of nodes) {
                const currentPath = [...path, node]
                if (node.id === targetId) {
                    return currentPath
                }
                if (node.children) {
                    const result = findPath(node.children, targetId, currentPath)
                    if (result) return result
                }
            }
            return null
        }
        const fullPath = findPath(courseData, selectedNode.id) || []
        return fullPath.filter((node) => node.type !== "course")
    }

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
        const videos: VideoItem[] = []
        if (!node.originalData?.pedagogy) return videos
        const pedagogy = node.originalData.pedagogy
        const extractVideosFromSection = (sectionData: any, sectionName: string) => {
            if (!sectionData) return
            Object.entries(sectionData).forEach(([subcategoryKey, subcategoryData]: [string, any]) => {
                if (subcategoryData?.files) {
                    subcategoryData.files.forEach((file: any) => {
                        if (file.isVideo || file.fileType?.includes('video')) {
                            videos.push({
                                id: file._id || `${Date.now()}-${Math.random()}`,
                                title: file.fileName,
                                fileName: file.fileName,
                                fileUrl: file.fileUrl,
                                availableResolutions: file.availableResolutions || [],
                                isVideo: true
                            })
                        }
                    })
                }
                if (subcategoryData?.folders) {
                    const checkFolderForVideos = (folder: any) => {
                        if (folder.files) {
                            folder.files.forEach((file: any) => {
                                if (file.isVideo || file.fileType?.includes('video')) {
                                    videos.push({
                                        id: file._id || `${Date.now()}-${Math.random()}`,
                                        title: file.fileName,
                                        fileName: file.fileName,
                                        fileUrl: file.fileUrl,
                                        availableResolutions: file.availableResolutions || [],
                                        isVideo: true
                                    })
                                }
                            })
                        }
                        if (folder.subfolders) {
                            folder.subfolders.forEach(checkFolderForVideos)
                        }
                    }
                    subcategoryData.folders.forEach(checkFolderForVideos)
                }
            })
        }
        extractVideosFromSection(pedagogy.I_Do, 'I_Do')
        extractVideosFromSection(pedagogy.We_Do, 'We_Do')
        extractVideosFromSection(pedagogy.You_Do, 'You_Do')
        return videos
    }
    const handleVideoClick = (file: UploadedFile, tabType: "I_Do" | "weDo" | "youDo", subcategory: string) => {
        if (!selectedNode) return
        const allVideos = extractAllVideosFromNode(selectedNode)
        const currentVideoIndex = allVideos.findIndex(video =>
            video.id === file.id || video.fileName === file.name
        )
        setCurrentVideoUrl(file.url || "")
        setCurrentVideoName(file.name)
        setCurrentVideoResolutions(file.availableResolutions || [])
        setShowVideoViewer(true)
        setVideoPlaylist(allVideos)
        setCurrentVideoIndex(currentVideoIndex >= 0 ? currentVideoIndex : 0)
    }



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
    return (
        <div
            style={{
                backgroundColor: "#ffffffff",
                fontFamily: "system-ui, -apple-system, sans-serif",
            }}
            className="h-screen flex flex-col overflow-hidden"
        >
            <style>
                {`
  .thin-scrollbar::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  .thin-scrollbar::-webkit-scrollbar-track {
    
    border-radius: 2.5px;
  }
  .thin-scrollbar::-webkit-scrollbar-thumb {
      border-radius: 2.5px;
    transition: all 0.3s ease;
    background: linear-gradient(to bottom, #dadadaff, #dadadaff);
  }
`}
            </style>
            <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2.5 shadow-sm">
                {/* Left side - Logo, Title and Breadcrumbs */}
                <div className="flex items-center gap-6">
                    {/* Logo and Title */}
                    <div className="flex items-center gap-3">
                        {/* Enhanced Logo */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl 
            bg-gradient-to-br from-blue-600 to-blue-700 ">
                            <BookOpen size={18} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">
                                {courseStructureResponse?.data?.courseName || "Course Structure"}
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5 max-w-md">
                                {courseStructureResponse?.data?.courseDescription ||
                                    "Manage course content using the I Do, We Do, You Do framework"}
                            </p>
                        </div>
                    </div>
{/* Breadcrumbs - Enhanced with navigation */}
<div className="flex items-center gap-1.5 text-xs text-gray-600">
  <button
    onClick={() => {
      // Navigate to dashboard page
      window.location.href = '/programcoordinator/pages/dashboardprogramcoordinator'; // Adjust path as needed
    }}
    className="cursor-pointer hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1"
  >
    <span>Dashboard</span>
  </button>
  <ChevronRight size={14} className="text-gray-400" />
  <button
    onClick={() => {
      // Navigate to courses page
      window.location.href = '/programcoordinator/pages/courses'; // Adjust path as needed
    }}
    className="cursor-pointer hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-gray-50 flex items-center gap-1"
  >
    <span>Course Structure</span>
  </button>
  <ChevronRight size={14} className="text-gray-400" />
  <span className="text-blue-700 font-semibold px-2 py-1 rounded bg-blue-50 border border-blue-200">
    {courseStructureResponse?.data?.courseName || "Program Coordinator"}
  </span>
</div>
                </div>
            </div>
            <div className="flex overflow-hidden h-full relative" >
                {/* Sidebar - Enhanced */}
                <div className="relative border-r border-gray-200 bg-white overflow-hidden" style={{ width: `${sidebarWidth}px`, boxShadow: "2px 0 4px rgba(0,0,0,0.02)" }}>
                    {/* Sidebar Header - Only show when not minimized */}
                    {sidebarWidth > 60 && (
                        <div style={{ padding: "16px" }}>
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
                                        fontWeight: "700",
                                        color: "#111827",
                                    }}
                                >
                                    Course Hierarchy
                                </h2>
                            </div>
                            <p
                                style={{
                                    margin: "0 0 8px 0",
                                    fontSize: "11px",
                                    color: "#6b7280",
                                }}
                            >
                                Select a {deepestLevelType} to manage content
                            </p>
                            {/* 🔍 Search Input Field */}
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
                    {sidebarWidth > 60 && (
                        <div
                            data-no-scrollbar
                            onWheel={(e) => (e.currentTarget.scrollTop += e.deltaY)}
                            className="overflow-auto thin-scrollbar"
                            style={{ height: "calc(100% - 70px)" }}
                        >
                            {renderHierarchy(courseData)}
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
                                className="flex items-center justify-center w-8 h-8 cursor-pointer bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                                title="Collapse sidebar"
                            >
                                <ChevronLeft size={14} className="text-gray-600" />
                            </button>
                        </div>
                    )}
                    {sidebarWidth === 60 && (
                        <div className="flex flex-col items-center py-4 space-y-4">
                            <SquareChevronRight size={18} onClick={() => setSidebarWidth(300)} className="text-gray-700 cursor-pointer" />
                            <BookOpen size={18} className="text-gray-500" />
                            <Search size={18} className="text-gray-500" />

                        </div>
                    )}
                </div>

                {/* Main Panel */}
                <div className=" flex-1 bg-gray-50 overflow-hidden relative">
                    {selectedNode ? (
                        <div className="flex  flex-col h-full overflow-hidden">
                            {/* Breadcrumb Header - Improved Styling */}
                            <div className="border-b border-gray-200 bg-white px-3 py-2" >
                                <div className="flex flex-wrap items-center gap-2">
                                    {generateBreadcrumbs(selectedNode).map((breadcrumb, index, array) => (
                                        <React.Fragment key={breadcrumb.id}>
                                            <button
                                                className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition-all ${index === array.length - 1
                                                    ? "cursor-pointer border border-blue-200 bg-blue-50 font-semibold text-blue-700"
                                                    : breadcrumb.type === deepestLevelType
                                                        ? "cursor-pointer border border-transparent text-gray-600 hover:bg-gray-100 hover:border-gray-200"
                                                        : "cursor-pointer text-gray-400 border border-transparent"
                                                    }`}
                                                onClick={() => {
                                                    if (index !== array.length - 1 && breadcrumb.type === deepestLevelType) {
                                                        selectNode(breadcrumb);
                                                    }
                                                }}
                                                title={breadcrumb.name}
                                            >
                                                <span
                                                    className={`flex h-5 w-5 items-center justify-center rounded-md text-white ${breadcrumb.type === "course"
                                                        ? "bg-blue-500"
                                                        : breadcrumb.type === "module"
                                                            ? "bg-emerald-500"
                                                            : breadcrumb.type === "submodule"
                                                                ? "bg-amber-500"
                                                                : breadcrumb.type === "topic"
                                                                    ? "bg-violet-500"
                                                                    : "bg-red-500"
                                                        }`}
                                                >
                                                    {breadcrumb.type === "course" && <BookOpen size={10} />}
                                                    {breadcrumb.type === "module" && <Users size={10} />}
                                                    {breadcrumb.type === "submodule" && <Target size={10} />}
                                                    {(breadcrumb.type === "topic" || breadcrumb.type === "subtopic") && <FileText size={10} />}
                                                </span>
                                                {/* Display first two words + ellipsis */}
                                                <span
                                                    style={{
                                                        fontSize: "12px",
                                                        fontWeight: index === array.length - 1 ? "600" : "500",
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        maxWidth: "120px",
                                                    }}
                                                >
                                                    {(() => {
                                                        const words = breadcrumb.name.split(" ");
                                                        return words.length > 2 ? `${words.slice(0, 2).join(" ")}...` : breadcrumb.name;
                                                    })()}
                                                </span>
                                            </button>
                                            {index < array.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white border-b border-gray-200 p-5">
                                <h2 className="text-sm font-bold text-gray-500">{selectedNode.name}</h2>
                            </div>
                            {/* Tabs - Enhanced Design */}
                            <div className="bg-white border-b border-gray-200 px-6 flex items-center justify-between">
                                <div style={{ display: "flex", gap: "4px" }}>
                                    {[
                                        {
                                            key: "I_Do",
                                            label: "I Do",
                                            color: "#f97316",
                                            bgColor: "#fef3c7",
                                            icon: <Target size={14} />,
                                        },
                                        {
                                            key: "weDo",
                                            label: "We Do",
                                            color: "#f97316",
                                            bgColor: "#dbeafe",
                                            icon: <Users size={14} />,
                                        },
                                        {
                                            key: "youDo",
                                            label: "You Do",
                                            color: "#f97316",
                                            bgColor: "#d1fae5",
                                            icon: <BookOpen size={14} />,
                                        },
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            style={{
                                                padding: "10px 15px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                transition: "all 0.2s ease",
                                                cursor: "pointer",
                                                border: "none",
                                                color: activeTab === tab.key ? tab.color : "#6b7280",
                                                borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : "3px solid transparent",
                                                borderRadius: "0",
                                            }}
                                            onClick={() => {
                                                setActiveTab(tab.key as any)
                                                setActiveSubcategory(subcategories[tab.key as keyof typeof subcategories][0]?.key || "")
                                                updateNavigationState({ currentFolderPath: [], currentFolderId: null })
                                            }}
                                        >
                                            <span style={{ color: activeTab === tab.key ? tab.color : "#9ca3af" }}>
                                                {tab.icon}
                                            </span>
                                            {tab.label}
                                            {contentData[selectedNode.id] &&
                                                Object.values(contentData[selectedNode.id][tab.key as keyof ContentData]).some(
                                                    (subcatData) => subcatData.length > 0,
                                                ) && (
                                                    <span
                                                        style={{
                                                            backgroundColor: tab.color,
                                                            color: "white",
                                                            borderRadius: "10px",
                                                            padding: "2px 8px",
                                                            fontSize: "10px",
                                                            fontWeight: "700",
                                                            minWidth: "20px",
                                                            textAlign: "center",
                                                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                                        }}
                                                    >
                                                        {Object.values(contentData[selectedNode.id][tab.key as keyof ContentData]).reduce(
                                                            (total, subcatData) => total + subcatData.length,
                                                            0,
                                                        )}
                                                    </span>
                                                )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-50 border-b border-gray-200 px-6 py-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-2">
                                      {subcategories[activeTab]?.map((subcat: { key: string; label: string; icon: React.ReactNode }) => (
    <button
        key={subcat.key}
        className={`px-4 py-2 text-xs cursor-pointer font-semibold flex items-center gap-2 rounded-lg border transition-all duration-200 ${activeSubcategory === subcat.key
            ? "bg-white text-gray-800 border-gray-300 shadow-sm"
            : "bg-transparent text-gray-500 border-transparent hover:bg-white/50"
            }`}
        onClick={() => {
            setActiveSubcategory(subcat.key)
            updateNavigationState({ currentFolderPath: [], currentFolderId: null })
        }}
    >
        {subcat.icon}
        {subcat.label}
        {contentData[selectedNode.id] &&
            contentData[selectedNode.id][activeTab][subcat.key]?.length > 0 && (
                <span className="bg-emerald-500 text-white rounded-full px-2 py-0.5 text-[10px] font-bold min-w-[18px] text-center">
                    {contentData[selectedNode.id][activeTab][subcat.key].length}
                </span>
            )}
    </button>
))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="px-4 py-2 bg-blue-500 text-white border-none rounded-lg cursor-pointer text-xs font-semibold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-sm"
                                            onClick={handleResourcesModalOpen}
                                        >
                                            <Plus size={14} />
                                            Resources
                                        </button>
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
                                                    <div className="flex-1 overflow-auto thin-scrollbar">
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
                                    </div>
                                </div>
                                {(() => {
                                    const currentState = getCurrentNavigationState();
                                    return (
                                        currentState.currentFolderPath.length > 0 && (
                                            <div className="flex items-center gap-2 text-xs mt-3 bg-white rounded-lg px-3 py-2 border border-gray-200">
                                                <button
                                                    onClick={navigateUp}
                                                    className="p-1.5 bg-gray-100 rounded-md flex items-center hover:bg-gray-200 transition-colors"
                                                    title="Go up one level"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <span className="text-gray-500 font-medium">Location:</span>
                                                {currentState.currentFolderPath.map((folder, index) => (
                                                    <React.Fragment key={index}>
                                                        {index > 0 && <ChevronRight size={12} className="text-gray-300" />}
                                                        <span className="text-blue-600 font-semibold">{folder}</span>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        )
                                    );
                                })()}
                            </div>
                            <div className="flex-1 px-6 pt-2 overflow-auto thin-scrollbar flex flex-col">
                                {(() => {
                                    const { folders: currentFolders, files: currentFiles } = getCurrentFolderContents()
                                    const hasContent = currentFolders.length > 0 || currentFiles.length > 0
                                    return hasContent ? (
                                        <div className="mb-4 ">
                                            <h3 className="text-sm font-bold text-gray-800 mb-3">
                                                {subcategories[activeTab]?.find((s: { key: string; }) => s.key === activeSubcategory)?.label} Content
                                                {getCurrentNavigationState().currentFolderPath.length > 0 &&
                                                    ` in "${getCurrentNavigationState().currentFolderPath[getCurrentNavigationState().currentFolderPath.length - 1]}"`}
                                                <span className="ml-2 text-gray-500 font-normal">({currentFolders.length + currentFiles.length} items)</span>
                                            </h3>
                                            <div
                                                data-no-scrollbar
                                                className=" pr-2"
                                            >
                                                {renderFileList(currentFolders, currentFiles, activeTab, activeSubcategory)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center p-12 text-gray-500 flex-1 flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-gray-200">
                                            <div style={{
                                                width: "80px",
                                                height: "80px",
                                                backgroundColor: "#f3f4f6",
                                                borderRadius: "50%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginBottom: "16px"
                                            }}>
                                                <FileText size={40} className="text-gray-400" />
                                            </div>
                                            <p className="text-sm font-semibold mb-2 text-gray-700">
                                                No {subcategories[activeTab]?.find((s: { key: string; }) => s.key === activeSubcategory)?.label} content yet
                                                {getCurrentNavigationState().currentFolderPath.length > 0 &&
                                                    ` in "${getCurrentNavigationState().currentFolderPath[getCurrentNavigationState().currentFolderPath.length - 1]}"`}
                                            </p>
                                            <p className="text-xs text-gray-500 m-0">Use the upload button above to add files or create folders</p>
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <div style={{
                                width: "96px",
                                height: "96px",
                                backgroundColor: "#eff6ff",
                                borderRadius: "24px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "20px",
                                boxShadow: "0 4px 6px rgba(59, 130, 246, 0.1)"
                            }}>
                                <BookOpen size={48} className="text-blue-500" />
                            </div>
                            <h3 className="text-lg font-bold mb-2 text-gray-800">Select a Course Element</h3>
                            <p className="text-sm text-center max-w-sm m-0 text-gray-600">
                                Choose an item from the course hierarchy to start managing content using the I Do, We Do, You Do framework
                            </p>
                        </div>
                    )}
                </div>
            </div>

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
                <label className="block text-xs font-semibold text-gray-700 mb-2">Enter URL</label>
                <div className="space-y-3">
                    <input
                        type="url"
                        value={folderUrl}
                        onChange={(e) => setFolderUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white"
                    />
                    <p className="text-xs text-gray-500">
                        Enter a valid URL to link external resources
                    </p>
                </div>
            </>
        ) : (
            <>
                {/* File Name Input Field - Add this section */}
{selectedFiles.length > 0 && (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-2">
      File Name{selectedFiles.length > 1 ? 's' : ''}
    </label>
    <div className="space-y-2">
      {selectedFiles.map((file, index) => (
        <div key={file.name} className="flex items-center gap-2">
          <input
            type="text"
            value={fileDisplayNames[file.name] || (selectedFileType === "reference" ? "Reference Material" : file.name)}
            onChange={(e) => {
              const newDisplayNames = { ...fileDisplayNames }
              newDisplayNames[file.name] = e.target.value
              setFileDisplayNames(newDisplayNames)
              
              // Also update the uploading files display
              setUploadingFiles(prev => prev.map(uploadFile => 
                uploadFile.name === file.name 
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
        : "You can customize the file name before uploading"
      }
    </p>
  </div>
)}
                <div className="mt-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">File Upload</label>
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
                                ? "Drop new file to update the existing file"
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
                                        {/* Show the display name instead of original file name */}
                                        <span className="text-[11px] text-gray-800 flex-1">
                                            {(file.type && file.type.includes("reference")) ? "Reference" : file.name}
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
                                            ✓ Ready to submit - Click Submit button
                                        </div>
                                    )}
                                    {file.status === "submitting" && (
                                        <div className="text-[10px] text-orange-600 mt-1 font-medium animate-pulse">
                                            Submitting to server...
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
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
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
                                    <div className="px-3 pb-3 mt-2">
                                        {/* Permissions Section */}
                                        {/* Show to Students Toggle */}
                                        <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg ">
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
    checked={selectedDocumentId ? (documentSettings[selectedDocumentId]?.studentShow || false) : false}
    onChange={(e) => {
        if (!selectedDocumentId) return; // Guard clause
        
        setDocumentSettings((prev) => ({
            ...prev,
            [selectedDocumentId]: {
                ...prev[selectedDocumentId],
                studentShow: e.target.checked,
                downloadAllow: e.target.checked ? prev[selectedDocumentId]?.downloadAllow || false : false,
            },
        }))
    }}
/>
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </label>
                                        {/* Allow Download Toggle */}
                                        <label className="flex items-center justify-between mt-2 p-3 border border-gray-200 rounded-lg ">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-white rounded border border-gray-200">
                                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
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
    checked={selectedDocumentId ? (documentSettings[selectedDocumentId]?.downloadAllow || false) : false}
    onChange={(e) => {
        if (!selectedDocumentId) return; // Guard clause
        
        setDocumentSettings((prev) => ({
            ...prev,
            [selectedDocumentId]: {
                ...prev[selectedDocumentId],
                downloadAllow: e.target.checked,
            },
        }))
    }}
    disabled={selectedDocumentId ? !documentSettings[selectedDocumentId]?.studentShow : true}
/>
                                               <div 
    className={`w-11 h-6 rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
        isDisabled 
            ? "bg-gray-100 cursor-not-allowed" 
            : "bg-gray-200 peer-checked:bg-blue-600"
    }`}
></div>
                                            </label>
                                        </label>
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

  // Convert urlData to FormData
  const formData = new FormData();
  Object.entries(urlData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value.toString());
    }
  });

  const response = await entityApi.updateEntity(
    selectedNode.type as "module" | "submodule" | "topic" | "subtopic",
    selectedNode.id,
    formData // Pass FormData instead of plain object
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
        // Existing file upload logic
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
        {selectedFileType === 'url' ? 'Adding URL...' : 'Submitting...'}
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
                                    <Folder className="w-5 h-5 text-blue-600" />
                                </div>
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
                                                            className="w-7 h-7 rounded-lg cursor-pointer border border-gray-300"/>
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
                                                            className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"/>
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
                        // Update current video data when changing videos
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
            
            {showDeleteConfirm && deleteTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div
                        className="bg-white/95 backdrop-blur-sm rounded-lg p-6 w-80 border border-gray-200 shadow-xl"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <Trash2 size={20} className="text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 m-0">Delete {deleteTarget.type}</h3>
                                <p className="text-sm text-gray-600 m-0">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-6">
                            Are you sure you want to delete "{deleteTarget.name}"?
                            {deleteTarget.type === "folder" && " All files inside this folder will also be deleted."}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    setDeleteTarget(null)
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border-none cursor-pointer">
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 border-none cursor-pointer">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}
