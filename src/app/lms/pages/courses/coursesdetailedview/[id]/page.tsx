"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  Play,
  GraduationCap,
  User,
  Presentation,
  Folder,
  Clock,
  Eye,
  Sun,
  Moon,
  File,
  Video,
  Loader2,
  ArrowLeft,
  Sparkles,
  Target,
  DollarSign as Collaboration,
  Rocket,
  CheckCircle2,
  BarChart3,
  Menu,
  Search,
  Bell,
  Settings,
  X,
  Link,
  Archive,
  Code,
  Cpu,
  FlaskConical,
  Home,
  ChevronLeft,
  Check,
  ChevronRightIcon,
  Maximize2,
  Minimize2,
  Send,
  Bot,
  ChevronUp,
  Download,
  ExternalLink,
} from "lucide-react"
import VideoPlayer from "../../../../component/student/video-player"
import PDFViewer from "../../../../component/student/pdf-viewer"
import PPTViewer from "../../../../component/student/ppt-viewer"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import React from "react"
import NotesPanel from "../../../../component/student/notes-panel"
import AIPanel from "../../../../component/student/ai-panel"
import JSZip from 'jszip'
import ZipViewer from "../../../../component/student/zipViewer"
import CodeEditor from "../../../../component/student/code-editor"
import Exercises from "../../../../component/student/exercises"
import { useTheme } from "next-themes"
import { StudentNavbar } from "@/app/lms/component/student/student-navbar"
import AIChat from "@/app/lms/component/student/ai-chat"
import SummaryChat from "@/app/lms/component/student/summary-chat"
import DBQueryEditor from "@/app/lms/component/student/db-queryEditor"

// ==============================
// Type Definitions
// ==============================

interface PedagogyLink {
  _id?: string;
  name: string;
  url: string;
  uploadedAt?: string;
}

interface PedagogyFile {
  _id?: string;
  fileName: string;
  fileType: string;
  size: string;
  uploadedAt?: string;
  fileUrl: string | { base?: string;[key: string]: string | undefined };
  isReference?: boolean;
  isVideo?: boolean;
  isArchive?: boolean;
  availableResolutions?: string[];
  // NEW: File settings from backend
  fileSettings?: {
    showToStudents: boolean;
    allowDownload: boolean;
    lastModified?: string;
  };
  tags?: Array<{
    tagName: string;
    tagColor: string;
  }>;
}

interface PedagogyFolder {
  _id?: string;
  name: string;
  files: PedagogyFile[];
  subfolders?: PedagogyFolder[];
  uploadedAt?: string;
  tags?: Array<{
    tagName: string;
    tagColor: string;
  }>;
}

interface PedagogyItem {
  description?: string;
  files?: PedagogyFile[];
  folders?: PedagogyFolder[];
  links?: PedagogyLink[];
  _id?: string;
}

interface Pedagogy {
  I_Do?: Record<string, PedagogyItem> | string[];
  We_Do?: Record<string, PedagogyItem> | string[];
  You_Do?: Record<string, PedagogyItem> | string[];
  _id?: string;
}

interface SubTopic {
  _id: string;
  title: string;
  description: string;
  duration?: string;
  level?: string;
  subTopics?: SubTopic[];
  pedagogy?: Pedagogy;
}

interface Topic {
  _id: string;
  title: string;
  description: string;
  duration?: string;
  level?: string;
  subTopics?: SubTopic[];
  pedagogy?: Pedagogy;
}

interface SubModule {
  _id: string;
  title: string;
  description: string;
  topics?: Topic[];
  pedagogy?: Pedagogy;
}

interface Module {
  _id: string;
  title: string;
  description: string;
  subModules?: SubModule[];
  topics?: Topic[];
  pedagogy?: Pedagogy;
}

interface CourseData {
  _id: string;
  courseName: string;
  courseDescription: string;
  courseHierarchy?: string[];
  I_Do?: string[];
  We_Do?: string[];
  You_Do?: string[];
  modules?: Module[];
}

type ResourceType = "video" | "pdf" | "ppt" | "zip" | "link" | "reference";

interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  fileUrl?: string | { base?: string };
  isReference?: boolean;
  externalUrl?: string;
  fileSize?: string;
  uploadedAt?: string;
  children?: Resource[];
  duration?: string;
  fileName?: string;
  isZip?: boolean;
  zipContents?: Resource[];
  blobUrl?: string;
  originalFolder?: string;
  folderName?: string;
  isFolder?: boolean;
  folderContents?: Resource[];
  folderType?: "similar" | "mixed";
  // NEW: File settings from backend
  fileSettings?: {
    showToStudents: boolean;
    allowDownload: boolean;
    lastModified?: string;
  };
  isVideo?: boolean;
  isArchive?: boolean;
  availableResolutions?: string[];
}

interface PedagogySubItem {
  key: string;
  name: string;
  description: string;
  files: PedagogyFile[];
  folders?: PedagogyFolder[];
  links?: PedagogyLink[];
}

type LearningElementType = "i-do" | "we-do" | "you-do";

interface LearningElement {
  id: string;
  title: string;
  type: LearningElementType;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgGradient: string;
  subItems: PedagogySubItem[];
}

type SelectedItemType = "module" | "submodule" | "topic" | "subtopic";

interface SelectedItem {
  id: string;
  title: string;
  type: SelectedItemType;
  hierarchy: string[];
  pedagogy?: Pedagogy;
}

// ==============================
// Sorting Types
// ==============================

type SortField = "name" | "size" | "date";
type SortDirection = "asc" | "desc";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// ==============================
// Helper Functions
// ==============================

const getLinkUrlForTooltip = (resource: Resource): string => {
  if (resource.externalUrl) return resource.externalUrl;
  if (typeof resource.fileUrl === 'object' && resource.fileUrl?.base) return resource.fileUrl.base;
  if (typeof resource.fileUrl === 'string') return resource.fileUrl;
  return 'No URL available';
};

const getFileType = (
  fileUrl: string | { base?: string;[key: string]: string | undefined },
  fileType: string
): ResourceType => {
  const urlString = typeof fileUrl === 'string' ? fileUrl : fileUrl.base || '';

  if (fileType?.includes("url/link") || fileType?.includes("link")) {
    return "link";
  }

  if (fileType?.includes("zip") ||
    fileType?.includes("application/zip") ||
    fileType?.includes("application/x-zip") ||
    fileType?.includes("application/x-zip-compressed") ||
    urlString?.toLowerCase().includes(".zip")) {
    return "zip";
  }

  if (fileType?.includes("pdf")) return "pdf";

  if (
    fileType?.includes("powerpoint") ||
    fileType?.includes("presentation") ||
    urlString?.toLowerCase().includes(".ppt") ||
    urlString?.toLowerCase().includes(".pptx")
  ) return "ppt";

  if (
    fileType?.includes("video") ||
    urlString?.toLowerCase().includes(".mp4") ||
    urlString?.toLowerCase().includes(".mov") ||
    urlString?.toLowerCase().includes(".avi") ||
    urlString?.toLowerCase().includes(".wmv")
  ) return "video";

  if (fileType?.includes("application") || fileType?.includes("document")) {
    return "pdf";
  }

  return "link";
};

const getFileUrlString = (fileUrl?: string | { base?: string }): string =>
  typeof fileUrl === "string" ? fileUrl : fileUrl?.base || "";

const detectUrlType = (url: string): "video" | "ppt" | "pdf" | "external" => {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv|m4v|3gp|ogv)$/) ||
    lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be') ||
    lowerUrl.includes('vimeo.com') ||
    lowerUrl.includes('dailymotion.com') ||
    lowerUrl.includes('twitch.tv') ||
    lowerUrl.includes('wistia.com')) {
    return "video";
  }

  if (lowerUrl.match(/\.(ppt|pptx|pps|ppsx|pot|potx)$/) ||
    lowerUrl.includes('slideshare.net') ||
    lowerUrl.includes('speakerdeck.com') ||
    lowerUrl.includes('prezi.com') ||
    lowerUrl.includes('google.com/presentation')) {
    return "ppt";
  }

  if (lowerUrl.match(/\.(pdf)$/) ||
    lowerUrl.includes('docs.google.com/document') ||
    lowerUrl.includes('drive.google.com/file') && lowerUrl.includes('/view')) {
    return "pdf";
  }

  return "external";
};

const getFileUrl = (
  fileUrl: string | { base?: string;[key: string]: string | undefined }
): string => {
  if (typeof fileUrl === 'string') return fileUrl;

  if ((fileUrl as any).url) return (fileUrl as any).url;
  if ((fileUrl as any)['720p']) return (fileUrl as any)['720p'];
  if ((fileUrl as any)['480p']) return (fileUrl as any)['480p'];
  if ((fileUrl as any)['360p']) return (fileUrl as any)['360p'];
  if ((fileUrl as any)['240p']) return (fileUrl as any)['240p'];
  if (fileUrl.base) return fileUrl.base;

  return '';
};

const getFileDuration = (file: PedagogyFile): string => {
  const sizeNum = parseInt(file.size || "0");

  if (file.fileType?.includes("url/link") || file.fileType?.includes("link")) {
    return "Link";
  }

  if (file.fileType?.includes("pdf")) return `${Math.ceil(sizeNum / 100000)} pages`;
  if (file.fileType?.includes("powerpoint") || file.fileType?.includes("presentation"))
    return `${Math.ceil(sizeNum / 50000)} slides`;
  return `${Math.ceil(sizeNum / 5000000)}:00`;
};

const formatSubItemName = (key: string): string => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const calculateModuleDuration = (module: Module): string => {
  let totalMinutes = 0;

  if (module.subModules) {
    module.subModules.forEach((subModule) => {
      if (subModule.topics) {
        subModule.topics.forEach((topic) => {
          if (topic.duration) {
            const duration = topic.duration;
            const hoursMatch = duration.match(/(\d+)h/);
            const minutesMatch = duration.match(/(\d+)m/);
            totalMinutes +=
              (hoursMatch ? parseInt(hoursMatch[1]) * 60 : 0) +
              (minutesMatch ? parseInt(minutesMatch[1]) : 0);
          }

          if (topic.subTopics) {
            topic.subTopics.forEach((subTopic) => {
              if (subTopic.duration) {
                const duration = subTopic.duration;
                const hoursMatch = duration.match(/(\d+)h/);
                const minutesMatch = duration.match(/(\d+)m/);
                totalMinutes +=
                  (hoursMatch ? parseInt(hoursMatch[1]) * 60 : 0) +
                  (minutesMatch ? parseInt(minutesMatch[1]) : 0);
              }
            });
          }
        });
      }
    });
  }

  if (module.topics) {
    module.topics.forEach((topic) => {
      if (topic.duration) {
        const duration = topic.duration;
        const hoursMatch = duration.match(/(\d+)h/);
        const minutesMatch = duration.match(/(\d+)m/);
        totalMinutes +=
          (hoursMatch ? parseInt(hoursMatch[1]) * 60 : 0) + (minutesMatch ? parseInt(minutesMatch[1]) : 0);
      }
    });
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

const hasChildItems = (item: Module | SubModule | Topic | SubTopic): boolean => {
  if ('subModules' in item && item.subModules && item.subModules.length > 0) return true;
  if ('topics' in item && item.topics && item.topics.length > 0) return true;
  if ('subTopics' in item && item.subTopics && item.subTopics.length > 0) return true;
  return false;
};

const hasPedagogyData = (item: Module | SubModule | Topic | SubTopic): boolean => {
  return !!(item.pedagogy && (
    (item.pedagogy.I_Do && (Array.isArray(item.pedagogy.I_Do) ? item.pedagogy.I_Do.length > 0 : Object.keys(item.pedagogy.I_Do).length > 0)) ||
    (item.pedagogy.We_Do && (Array.isArray(item.pedagogy.We_Do) ? item.pedagogy.We_Do.length > 0 : Object.keys(item.pedagogy.We_Do).length > 0)) ||
    (item.pedagogy.You_Do && (Array.isArray(item.pedagogy.You_Do) ? item.pedagogy.You_Do.length > 0 : Object.keys(item.pedagogy.You_Do).length > 0))
  ));
};

const shouldShowArrow = (item: Module | SubModule | Topic | SubTopic): boolean => {
  return hasChildItems(item);
};

// ==============================
// NEW: Download Helper Functions - UPDATED
// ==============================

// Function to check if download should be shown
const shouldShowDownload = (resource: Resource): boolean => {
  // Only show download for reference files
  if (!resource.isReference) {
    return false;
  }

  // Check if file has fileSettings and allowDownload is true
  if (resource.fileSettings) {
    return resource.fileSettings.allowDownload === true;
  }

  // If no fileSettings, default to true for reference files
  return true;
};

// Function to download a file
const downloadFile = async (resource: Resource, fileName?: string) => {
  try {
    let downloadUrl = '';

    // Get the URL based on resource type
    if (resource.externalUrl) {
      downloadUrl = resource.externalUrl;
    } else if (resource.fileUrl) {
      if (typeof resource.fileUrl === 'object' && resource.fileUrl.base) {
        downloadUrl = resource.fileUrl.base;
      } else if (typeof resource.fileUrl === 'string') {
        downloadUrl = resource.fileUrl;
      }
    }

    if (!downloadUrl) {
      console.error('No download URL available');
      return;
    }

    // For external URLs, open in new tab
    if (resource.type === 'link' || resource.type === 'reference') {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // For direct file downloads
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || resource.title || resource.fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Download error:', error);
    // Fallback: open in new tab
    let fallbackUrl = '';
    if (resource.externalUrl) {
      fallbackUrl = resource.externalUrl;
    } else if (resource.fileUrl) {
      if (typeof resource.fileUrl === 'object' && resource.fileUrl.base) {
        fallbackUrl = resource.fileUrl.base;
      } else if (typeof resource.fileUrl === 'string') {
        fallbackUrl = resource.fileUrl;
      }
    }

    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    }
  }
};

// Function to check if resource should be shown to students
const isResourceVisible = (resource: Resource): boolean => {
  // Default to true if no fileSettings exist
  if (!resource.fileSettings) return true;

  return resource.fileSettings.showToStudents !== false;
};

// ==============================
// Empty State Components
// ==============================

const EmptyState = ({
  icon: Icon = File,
  title,
  description
}: {
  icon?: React.ComponentType<any>;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Icon className="w-8 h-8 mb-2 text-gray-400" />
    <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
    <p className="text-xs text-gray-600 max-w-md">{description}</p>
  </div>
);

const ActivityEmptyState = () => (
  <div className="flex flex-col items-center justify-center py-6 text-center">
    <File className="w-6 h-6 mb-1 text-gray-400" />
    <h4 className="text-xs font-medium text-gray-900 mb-1">No Resources Available</h4>
    <p className="text-xs text-gray-600">
      This activity doesn't contain any resources yet.
    </p>
  </div>
);

// ==============================
// Sidebar Toggle Component
// ==============================

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  position?: "fixed" | "absolute";
}
const SidebarToggle = ({ isOpen, onToggle, position = "absolute" }: SidebarToggleProps) => {
  const baseClasses = "z-50 bg-white border border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 flex items-center justify-center text-gray-700 cursor-pointer";
  const positionClasses = position === "fixed"
    ? "fixed left-4 top-1/2 transform -translate-y-1/2"
    : "absolute -right-4 top-1/2 transform -translate-y-1/2";

  return (
    <button
      onClick={onToggle}
      className={`w-8 h-8 ${baseClasses} ${positionClasses}`}
    >
      {isOpen ? (
        <ChevronLeft className="w-3 h-3 text-gray-700" />
      ) : (
        <ChevronRightIcon className="w-3 h-3 text-gray-700" />
      )}
    </button>
  );
};

// ==============================
// Resource Item Component with Download - UPDATED
// ==============================

interface ResourceItemProps {
  resource: Resource;
  index: number;
  onClick: (resource: Resource) => void;
  onDownload?: (resource: Resource, e: React.MouseEvent) => void;
}

const ResourceItem = ({ resource, index, onClick, onDownload }: ResourceItemProps) => {
  const [showDownloadTooltip, setShowDownloadTooltip] = useState(false);

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the main onClick
    if (onDownload && shouldShowDownload(resource)) {
      onDownload(resource, e);
    }
  };

  // Don't render if resource shouldn't be visible to students
  if (!isResourceVisible(resource)) {
    return null;
  }

  const renderResourceIcon = (type: ResourceType, isFolder?: boolean) => {
    if (isFolder) {
      return <Folder className="w-4 h-4 text-blue-500" />;
    }

    switch (type) {
      case "video":
        return <Video className="w-4 h-4 text-red-500" />;
      case "ppt":
        return <Presentation className="w-4 h-4 text-orange-500" />;
      case "pdf":
        return <FileText className="w-4 h-4 text-red-600" />;
      case "zip":
        return <Archive className="w-4 h-4 text-green-500" />;
      case "link":
        return <Link className="w-4 h-4 text-purple-500" />;
      case "reference":
        return <FileText className="w-4 h-4 text-gray-500" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Empty';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Empty';
    }
  };

  // Check if download button should be shown
  const showDownloadButton = shouldShowDownload(resource);

  return (
    <div
      onClick={() => onClick(resource)}
      className={`flex items-center px-4 py-3 cursor-pointer transition-all duration-200 group border-b border-gray-50 last:border-b-0 hover:bg-blue-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
        }`}
      title={resource.type === "link" ? getLinkUrlForTooltip(resource) : undefined}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 group-hover:scale-110 transition-transform duration-200">
          {renderResourceIcon(resource.type, resource.isFolder)}
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs group-hover:text-gray-900 truncate font-medium ${resource.type === "link" ? "text-gray-700" : "text-gray-900"
              }`}>
              {resource.title}
              {resource.isFolder && (
                <span className="ml-2 text-xs text-gray-500">({resource.folderContents?.length || 0} items)</span>
              )}
            </span>
            {resource.isReference && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 font-medium rounded shadow-sm border border-gray-300">
                Reference
              </span>
            )}
          </div>
          {resource.originalFolder && !resource.isFolder && (
            <span className="text-xs text-gray-500 truncate">
              From: {resource.originalFolder}
            </span>
          )}
        </div>

        {/* Download button - ONLY for reference files with allowDownload: true */}
        {!resource.isFolder && showDownloadButton && (
          <div className="relative">
            <button
              onClick={handleDownloadClick}
              onMouseEnter={() => setShowDownloadTooltip(true)}
              onMouseLeave={() => setShowDownloadTooltip(false)}
              className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors duration-200 text-blue-600 hover:text-blue-700 flex items-center justify-center"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {showDownloadTooltip && (
              <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                Download {resource.fileName || resource.title}
              </div>
            )}
          </div>
        )}

        {/* No download icon for non-reference files or reference files without download permission */}
        {!resource.isFolder && !showDownloadButton && resource.isReference && (
          <div className="relative">
            <span
              className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed flex items-center justify-center"
              title="Download not available for this file"
            >
              <Download className="w-3.5 h-3.5" />
            </span>
          </div>
        )}
      </div>

      <span className="w-16 text-xs text-gray-600 truncate font-medium">
        {resource.isFolder ? resource.fileSize : resource.fileSize || "-"}
      </span>

      <span className="w-20 text-xs text-gray-600 truncate">
        {formatDate(resource.uploadedAt || "")}
      </span>
    </div>
  );
};

// ==============================
// Main Component
// ==============================
export default function LMSPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { resolvedTheme } = useTheme()
  const courseId = params?.id as string;
  const theme = searchParams.get("theme") as "light" | "dark" | null;

  // --- PERSISTENCE HELPERS START ---
  const saveToStorage = (key: string, value: string) => {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
  };

  const getFromStorage = (key: string) => {
    if (typeof window !== 'undefined') return localStorage.getItem(key);
    return null;
  };
  // --- PERSISTENCE HELPERS END ---

  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  // --- INITIALIZE METHOD/ACTIVITY FROM STORAGE ---
  const [selectedMethod, setSelectedMethod] = useState<string>(() => getFromStorage('lms_student_selected_method') || "");
  const [selectedActivity, setSelectedActivity] = useState<string>(() => getFromStorage('lms_student_selected_activity') || "");
  // ---------------------------------------------

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedSubModules, setExpandedSubModules] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSubTopics, setExpandedSubTopics] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [hoveredCategory, setHoveredCategory] = useState<string>("");
  const [currentHierarchy, setCurrentHierarchy] = useState<string[]>([])
  const [breadcrumbCollapsed, setBreadcrumbCollapsed] = useState(false);
  const [activeViewer, setActiveViewer] = useState<{
    type: "video" | "pdf" | "ppt" | "zip" | null;
    resource: Resource | null;
  }>({ type: null, resource: null });

  const [currentFolder, setCurrentFolder] = useState<Resource | null>(null);
  const [folderPath, setFolderPath] = useState<Resource[]>([]);
  const [extractingZip, setExtractingZip] = useState<string | null>(null);

  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType | "all">("pdf");
  const [selectedDocTypes, setSelectedDocTypes] = useState<Set<ResourceType>>(new Set());
  const [selectedFolderDocTypes, setSelectedFolderDocTypes] = useState<Set<ResourceType>>(new Set());
  const [userSelectedResourceType, setUserSelectedResourceType] = useState<boolean>(false);

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "name",
    direction: "asc"
  });

  // NEW: State for exercises
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [exercisesList, setExercisesList] = useState<any[]>([]);
  const [showExercisesList, setShowExercisesList] = useState(true);
  // Inside LMSPage function
  const [isLoading, setIsLoading] = useState(true); // Default to true
  const closeAllViewers = () => {
    setActiveViewer({ type: null, resource: null });
  };

  const openViewer = (type: "video" | "pdf" | "ppt" | "zip", resource: Resource) => {
    setActiveViewer({ type, resource });
  };

  // Add this with your other useEffect hooks
  useEffect(() => {
    const handleOpenNotesPanel = () => {
      setShowNotesPanel(true);
    };

    window.addEventListener('open-notes-panel', handleOpenNotesPanel);

    return () => {
      window.removeEventListener('open-notes-panel', handleOpenNotesPanel);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // NEW: Effect to load exercises when activity changes

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [selectedItem]);

  // --- SAVE METHOD/ACTIVITY CHANGES ---
  useEffect(() => {
    if (selectedMethod) saveToStorage('lms_student_selected_method', selectedMethod);
  }, [selectedMethod]);

  useEffect(() => {
    if (selectedActivity) saveToStorage('lms_student_selected_activity', selectedActivity);
  }, [selectedActivity]);
  // ------------------------------------

  // Fetch course data
  // Fetch course data
  useEffect(() => {
    const fetchCourseData = async () => {
      // console.log("Starting fetch for courseId:", courseId);

      if (!courseId) {
        setError("No course ID found in URL. Please check the URL and try again.");
        setIsLoading(false); // Stop loading on error
        return;
      }

      try {
        const url = `http://localhost:5533/getAll/courses-data/${courseId}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          throw new Error("Invalid JSON response from server");
        }

        const courseInfo = data.data || data;

        if (!courseInfo) {
          throw new Error("No course data found in response");
        }

        setCourseData(courseInfo);

        // CHECK FOR RESTORE SETTINGS
        // If we don't have a stored node ID, we can stop loading now.
        // If we DO have one, keep loading true so the restore effect can run without flashing content.
        const storedNodeId = getFromStorage('lms_student_selected_node_id');
        if (!storedNodeId) {
          setIsLoading(false);

          // Only auto-expand first module if NOT restoring
          if (courseInfo.modules && courseInfo.modules.length > 0) {
            setExpandedModules(new Set([courseInfo.modules[0]._id]));
          }
        }
        // If storedNodeId exists, we leave isLoading = true. 
        // The restore useEffect will handle setting it to false.

      } catch (err) {
        console.error("Fetch error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        setIsLoading(false); // Stop loading on error
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);
  // --- HANDLE ITEM SELECT (MODIFIED FOR PERSISTENCE) ---
  const handleItemSelect = useCallback((
    itemId: string,
    itemTitle: string,
    itemType: SelectedItemType,
    hierarchyIds: string[], // This contains IDs
    pedagogy?: Pedagogy,
  ) => {
    // SAVE TO STORAGE
    saveToStorage('lms_student_selected_node_id', itemId);

    const hierarchyTitles: string[] = [];

    const findTitleById = (id: string): string => {
      // Need access to current courseData here. 
      // If courseData is stale in closure, consider refactoring or using refs. 
      // Assuming courseData is available in scope.
      if (!courseData?.modules) return "Unknown";

      for (const module of courseData.modules) {
        if (module._id === id) return module.title;
        if (module.subModules) {
          for (const subModule of module.subModules) {
            if (subModule._id === id) return subModule.title;
            if (subModule.topics) {
              for (const topic of subModule.topics) {
                if (topic._id === id) return topic.title;
                if (topic.subTopics) {
                  for (const subTopic of topic.subTopics) {
                    if (subTopic._id === id) return subTopic.title;
                  }
                }
              }
            }
          }
        }
        if (module.topics) {
          for (const topic of module.topics) {
            if (topic._id === id) return topic.title;
            if (topic.subTopics) {
              for (const subTopic of topic.subTopics) {
                if (subTopic._id === id) return subTopic.title;
              }
            }
          }
        }
      }
      return "Unknown";
    };

    hierarchyIds.forEach(id => {
      hierarchyTitles.push(findTitleById(id));
    });

    setSelectedItem({
      id: itemId,
      title: itemTitle,
      type: itemType,
      hierarchy: hierarchyIds,
      pedagogy,
    });

    setCurrentHierarchy(hierarchyTitles);

    setCurrentFolder(null);
    setFolderPath([]);
    closeAllViewers();
    setSelectedDocTypes(new Set());
    setSelectedFolderDocTypes(new Set());
    setUserSelectedResourceType(false);
    setSelectedDocTypes(new Set());
    setSelectedFolderDocTypes(new Set());
    // Reset sort config when selecting new item
    setSortConfig({
      field: "name",
      direction: "asc"
    });
  }, [courseData]);
  // ----------------------------------------------------

  // --- AUTO RESTORE SELECTION ---
  // --- AUTO RESTORE SELECTION ---
  useEffect(() => {
    // Only run this if we have course data
    if (courseData?.modules) {

      // If we already have a selected item, we don't need to restore (and we aren't loading)
      if (selectedItem) {
        setIsLoading(false);
        return;
      }

      const storedNodeId = getFromStorage('lms_student_selected_node_id');

      if (storedNodeId) {
        console.log("Restoring selection for node:", storedNodeId);

        // Define the recursive finder
        const findAndRestore = (modules: Module[]) => {
          for (const module of modules) {
            // Module
            if (module._id === storedNodeId) {
              handleItemSelect(module._id, module.title, "module", [module._id], module.pedagogy);
              setExpandedModules(prev => new Set(prev).add(module._id));
              return true;
            }
            // SubModules
            if (module.subModules) {
              for (const sm of module.subModules) {
                if (sm._id === storedNodeId) {
                  handleItemSelect(sm._id, sm.title, "submodule", [module._id, sm._id], sm.pedagogy);
                  setExpandedModules(prev => new Set(prev).add(module._id));
                  setExpandedSubModules(prev => new Set(prev).add(sm._id));
                  return true;
                }
                if (sm.topics) {
                  for (const t of sm.topics) {
                    if (t._id === storedNodeId) {
                      handleItemSelect(t._id, t.title, "topic", [module._id, sm._id, t._id], t.pedagogy);
                      setExpandedModules(prev => new Set(prev).add(module._id));
                      setExpandedSubModules(prev => new Set(prev).add(sm._id));
                      setExpandedTopics(prev => new Set(prev).add(t._id));
                      return true;
                    }
                    if (t.subTopics) {
                      for (const st of t.subTopics) {
                        if (st._id === storedNodeId) {
                          handleItemSelect(st._id, st.title, "subtopic", [module._id, sm._id, t._id, st._id], st.pedagogy);
                          setExpandedModules(prev => new Set(prev).add(module._id));
                          setExpandedSubModules(prev => new Set(prev).add(sm._id));
                          setExpandedTopics(prev => new Set(prev).add(t._id));
                          return true;
                        }
                      }
                    }
                  }
                }
              }
            }
            // Direct Topics
            if (module.topics) {
              for (const t of module.topics) {
                if (t._id === storedNodeId) {
                  handleItemSelect(t._id, t.title, "topic", [module._id, t._id], t.pedagogy);
                  setExpandedModules(prev => new Set(prev).add(module._id));
                  setExpandedTopics(prev => new Set(prev).add(t._id));
                  return true;
                }
                if (t.subTopics) {
                  for (const st of t.subTopics) {
                    if (st._id === storedNodeId) {
                      handleItemSelect(st._id, st.title, "subtopic", [module._id, t._id, st._id], st.pedagogy);
                      setExpandedModules(prev => new Set(prev).add(module._id));
                      setExpandedTopics(prev => new Set(prev).add(t._id));
                      return true;
                    }
                  }
                }
              }
            }
          }
          return false;
        };

        // Execute Restore
        findAndRestore(courseData.modules);
      }

      // Whether we found the item or not, we are done "loading"
      setIsLoading(false);
    }
  }, [courseData, handleItemSelect, selectedItem]);
  // Close all viewers when navigating to new item
  useEffect(() => {
    if (selectedItem) {
      closeAllViewers();
    }
  }, [selectedItem]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Empty';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Empty';
    }
  };



  // ==============================
  // Helper Functions - UPDATED
  // ==============================

  // New: Function to format file size properly
  const formatFileSize = (sizeStr: string): string => {
    if (!sizeStr || sizeStr === "-") return "-";

    try {
      const sizeNum = parseInt(sizeStr);

      // If size is in bytes, convert to KB/MB
      if (sizeNum < 1024) {
        return `${sizeNum} B`;
      } else if (sizeNum < 1024 * 1024) {
        // Less than 1 MB, show in KB
        return `${(sizeNum / 1024).toFixed(1)} KB`;
      } else {
        // 1 MB or more, show in MB
        return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`;
      }
    } catch (error) {
      return "-";
    }
  };


  const parseFileSize = (sizeStr: string): number => {
    if (!sizeStr || sizeStr === "-") return 0;

    const size = sizeStr.toLowerCase();
    if (size.includes("kb")) {
      return parseFloat(size) * 1024;
    } else if (size.includes("mb")) {
      return parseFloat(size) * 1024 * 1024;
    } else if (size.includes("gb")) {
      return parseFloat(size) * 1024 * 1024 * 1024;
    } else if (size.includes("items")) {
      return parseInt(size) || 0;
    } else if (size.includes("b") && !size.includes("kb") && !size.includes("mb") && !size.includes("gb")) {
      // Handle bytes
      return parseFloat(size) || 0;
    }

    return parseFloat(size) || 0;
  };

  const parseDate = (dateStr: string): Date => {
    if (!dateStr || dateStr === "Empty") return new Date(0);

    try {
      return new Date(dateStr);
    } catch (error) {
      return new Date(0);
    }
  };

  // Sort function
  const sortResources = (resources: Resource[]): Resource[] => {
    const { field, direction } = sortConfig;

    return [...resources].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (field) {
        case "name":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;

        case "size":
          aValue = parseFileSize(a.fileSize || "-");
          bValue = parseFileSize(b.fileSize || "-");
          break;

        case "date":
          aValue = parseDate(a.uploadedAt || "");
          bValue = parseDate(b.uploadedAt || "");
          break;

        default:
          return 0;
      }

      let comparison = 0;

      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return direction === "asc" ? comparison : -comparison;
    });
  };

  const handleSortClick = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const getSortIndicator = (field: SortField) => {
    if (sortConfig.field !== field) {
      return (
        <div className="flex flex-col ml-1">
          <ChevronUp className="w-2 h-2 text-gray-300" />
          <ChevronDown className="w-2 h-2 -mt-1 text-gray-300" />
        </div>
      );
    }

    return sortConfig.direction === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-600 ml-1" />
      : <ChevronDown className="w-3 h-3 text-blue-600 ml-1" />;
  };

  const extractAllFilesFromFolders = (folders: PedagogyFolder[]): Resource[] => {
    const allResources: Resource[] = [];

    const processFolder = (folder: PedagogyFolder, parentFolderName?: string) => {
      // Process files in current folder
      folder.files?.forEach(file => {
        const fileType = getFileType(file.fileUrl, file.fileType);
        const resource: Resource = {
          id: file._id || `file-${file.fileName}-${Math.random().toString(36).substr(2, 5)}`,
          title: file.fileName || "Untitled",
          type: file.isReference ? "reference" : fileType,
          duration: getFileDuration(file),
          fileName: file.fileName,
          // UPDATED: Use formatFileSize instead of hardcoded MB
          fileSize: formatFileSize(file.size),
          uploadedAt: file.uploadedAt,
          isReference: file.isReference || false,
          originalFolder: parentFolderName || folder.name,
          folderName: folder.name,
          // Include file settings from backend
          fileSettings: file.fileSettings,
          isVideo: file.isVideo,
          isArchive: file.isArchive,
          availableResolutions: file.availableResolutions,
        };

        if (fileType === "link") {
          resource.externalUrl = getFileUrl(file.fileUrl);
        } else {
          resource.fileUrl = getFileUrl(file.fileUrl);
        }

        allResources.push(resource);
      });

      // Recursively process subfolders
      folder.subfolders?.forEach(subfolder => {
        processFolder(subfolder, folder.name);
      });
    };

    folders.forEach(folder => {
      processFolder(folder);
    });

    return allResources;
  };


  const categorizeFolderContents = (folders: PedagogyFolder[]): {
    similarType: ResourceType | null;
    resources: Resource[];
    folderRepresentations: Resource[];
  } => {
    const allFiles = extractAllFilesFromFolders(folders);
    const folderRepresentations: Resource[] = [];

    if (allFiles.length === 0) {
      return { similarType: null, resources: [], folderRepresentations: [] };
    }

    const folderMap = new Map<string, Resource[]>();
    allFiles.forEach(file => {
      const folderName = file.folderName || 'Unknown Folder';
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
      }
      folderMap.get(folderName)!.push(file);
    });

    // Check if all files in each folder are of the same type (excluding reference files)
    folderMap.forEach((files, folderName) => {
      const nonReferenceFiles = files.filter(file => !file.isReference && isResourceVisible(file));

      if (nonReferenceFiles.length > 0) {
        const firstType = nonReferenceFiles[0].type;
        const allSameType = nonReferenceFiles.every(file => file.type === firstType);

        if (allSameType) {
          // Similar-type folder - goes to specific tab
          folderRepresentations.push({
            id: `folder-${folderName}-${Math.random().toString(36).substr(2, 5)}`,
            title: folderName,
            type: firstType,
            isFolder: true,
            folderType: "similar",
            folderContents: files.filter(isResourceVisible),
            fileSize: `${files.length} items`,
            uploadedAt: files[0]?.uploadedAt,
          });
        } else {
          // Mixed-type folder - goes to reference tab
          folderRepresentations.push({
            id: `folder-${folderName}-${Math.random().toString(36).substr(2, 5)}`,
            title: folderName,
            type: "reference",
            isFolder: true,
            folderType: "mixed",
            folderContents: files.filter(isResourceVisible),
            fileSize: `${files.length} items`,
            uploadedAt: files[0]?.uploadedAt,
          });
        }
      } else {
        // Only reference files - goes to reference tab
        const visibleFiles = files.filter(isResourceVisible);
        if (visibleFiles.length > 0) {
          folderRepresentations.push({
            id: `folder-${folderName}-${Math.random().toString(36).substr(2, 5)}`,
            title: folderName,
            type: "reference",
            isFolder: true,
            folderType: "mixed",
            folderContents: visibleFiles,
            fileSize: `${visibleFiles.length} items`,
            uploadedAt: visibleFiles[0]?.uploadedAt,
          });
        }
      }
    });

    const nonReferenceFiles = allFiles.filter(file => !file.isReference && isResourceVisible(file));
    let similarType: ResourceType | null = null;

    if (nonReferenceFiles.length > 0) {
      const firstType = nonReferenceFiles[0].type;
      const allSameType = nonReferenceFiles.every(file => file.type === firstType);

      if (allSameType) {
        similarType = firstType;
      }
    }

    return {
      similarType,
      resources: allFiles.filter(isResourceVisible),
      folderRepresentations
    };
  };

  // Get available resource types for current activity
  // Get available resource types for current activity
  const getAvailableResourceTypes = (): ResourceType[] => {
    // Safety check for selected activity data
    if (!selectedActivityData) return [];

    // CHECK FOR EXERCISES (I Do, We Do, or You Do)
    // If exercises exist, we return an empty array [] to hide the resource tabs 
    // and let the Exercise/CodeEditor UI take over.
    if (selectedMethod && selectedActivity) {
      const exercises = getExercisesForActivity();
      if (exercises && exercises.length > 0) {
        return [];
      }
    }

    const availableTypes = new Set<ResourceType>();

    // Process direct files - FILTER BY VISIBILITY
    const directFiles = selectedActivityData.files || [];
    directFiles.forEach(file => {
      // Check if file should be shown to students
      const shouldShow = !file.fileSettings || file.fileSettings.showToStudents !== false;
      if (!shouldShow) return;

      const fileType = getFileType(file.fileUrl, file.fileType);
      if (file.isReference) {
        availableTypes.add("reference");
      } else {
        availableTypes.add(fileType);
      }
    });

    // Process folders
    if (selectedActivityData.folders && selectedActivityData.folders.length > 0) {
      const categorized = categorizeFolderContents(selectedActivityData.folders);

      // Add types from similar-type folders
      categorized.folderRepresentations.forEach(folder => {
        if (folder.folderType === "similar") {
          availableTypes.add(folder.type);
        } else {
          availableTypes.add("reference");
        }
      });
    }

    // Process links
    if (selectedActivityData.links && selectedActivityData.links.length > 0) {
      availableTypes.add("link");
    }

    // Convert Set to Array and sort in desired order
    const orderedTypes: ResourceType[] = ["pdf", "ppt", "video", "zip", "link", "reference"];
    return orderedTypes.filter(type => availableTypes.has(type));
  };
  const learningElements = (): LearningElement[] => {
    const coursePedagogy = {
      I_Do: courseData?.I_Do,
      We_Do: courseData?.We_Do,
      You_Do: courseData?.You_Do
    };

    if (!coursePedagogy || (!coursePedagogy.I_Do && !coursePedagogy.We_Do && !coursePedagogy.You_Do)) return [];

    const createLearningElement = (
      type: LearningElementType,
      pedagogyData: Record<string, PedagogyItem> | string[] | undefined,
    ): LearningElement => {
      const subItems: PedagogySubItem[] = [];

      if (pedagogyData) {
        if (Array.isArray(pedagogyData)) {
          // This is for I_Do, You_Do which are arrays
          pedagogyData.forEach((item, index) => {
            const key = typeof item === 'string' ? item.toLowerCase().replace(/\s+/g, '_') : `item_${index}`;
            const name = typeof item === 'string' ? item : `Activity ${index + 1}`;

            let activityResources: PedagogySubItem = {
              key,
              name,
              description: `Resources for ${name}`,
              files: [],
              folders: [],
              links: [],
            };

            if (selectedItem?.pedagogy) {
              const pedagogyKey = type === 'i-do' ? 'I_Do' : type === 'we-do' ? 'We_Do' : 'You_Do';
              const topicPedagogy = selectedItem.pedagogy[pedagogyKey];

              if (topicPedagogy && typeof topicPedagogy === 'object' && !Array.isArray(topicPedagogy)) {
                // Look for matching activity in topic pedagogy
                const activityKey = Object.keys(topicPedagogy).find(activityKey => {
                  const normalizedTopicKey = activityKey.toLowerCase();
                  const normalizedItemKey = key.toLowerCase();
                  return normalizedTopicKey === normalizedItemKey;
                });

                if (activityKey) {
                  const activityData = topicPedagogy[activityKey];
                  if (activityData && typeof activityData === 'object') {
                    // Check if it has files property (regular activity)
                    if (activityData.files || activityData.folders || activityData.links) {
                      activityResources = {
                        key,
                        name,
                        description: activityData.description || `Resources for ${name}`,
                        files: activityData.files || [],
                        folders: activityData.folders || [],
                        links: activityData.links || [],
                      };
                    }
                    // Note: If it's an array of exercises, we don't modify activityResources
                    // because exercises are handled separately in getExercisesForActivity()
                  }
                }
              }
            }

            subItems.push(activityResources);
          });
        } else if (typeof pedagogyData === 'object') {
          // This is for We_Do which should be an object with activity keys
          // But courseData?.We_Do is an array ["Practical", "Project Development"]
          // So we need to handle this differently

          // If We_Do is an array, create activities from it
          if (type === 'we-do' && Array.isArray(courseData?.We_Do)) {
            courseData.We_Do.forEach((activityName: string) => {
              const key = activityName.toLowerCase().replace(/\s+/g, '_');
              const name = activityName;

              subItems.push({
                key,
                name,
                description: `Resources for ${name}`,
                files: [],
                folders: [],
                links: [],
              });
            });
          } else {
            // Fallback for other object types
            Object.entries(pedagogyData).forEach(([key, item]) => {
              if (item) {
                subItems.push({
                  key,
                  name: formatSubItemName(key),
                  description: item.description || "",
                  files: item.files || [],
                  folders: item.folders || [],
                  links: item.links || [],
                });
              }
            });
          }
        }
      }

      const configs = {
        "i-do": {
          title: "I Do",
          description: "Teacher-led instruction and demonstrations",
          icon: Target,
          color: "#22CE88",
          bgGradient: "linear-gradient(135deg, #22CE88 0%, #1DB777 100%)",
        },
        "we-do": {
          title: "We Do",
          description: "Collaborative exercises and guided practice",
          icon: Collaboration,
          color: "#22CE88",
          bgGradient: "linear-gradient(135deg, #22CE88 0%, #1DB777 100%)",
        },
        "you-do": {
          title: "You Do",
          description: "Independent practice and application",
          icon: Rocket,
          color: "#22CE88",
          bgGradient: "linear-gradient(135deg, #22CE88 0%, #1DB777 100%)",
        },
      };

      const config = configs[type];

      return {
        id: type,
        title: config.title,
        type,
        description: config.description,
        icon: config.icon,
        color: config.color,
        bgGradient: config.bgGradient,
        subItems,
      };
    };

    return [
      createLearningElement("i-do", coursePedagogy.I_Do),
      createLearningElement("we-do", coursePedagogy.We_Do),
      createLearningElement("you-do", coursePedagogy.You_Do),
    ];
  };
  // NEW: Function to handle exercise selection
  // Find this function in your LMSPage component
  // Find your handleExerciseSelect function and update it:
  // Find your handleExerciseSelect function and update it:
  // Find the handleExerciseSelect function
  // NEW: Function to handle exercise selection
  // NEW: Function to handle exercise selection with Lock Verification
  const handleExerciseSelect = async (exercise: any) => {
    console.log("🎯 SELECTED EXERCISE:", {
      exercise,
      selectedItem: selectedItem?.id,
      courseId: courseId
    });

    // 1. Map the selectedMethod to DB format
    const methodMap: Record<string, string> = {
      'i-do': 'I_Do',
      'we-do': 'We_Do',
      'you-do': 'You_Do'
    };
    const categoryParam = methodMap[selectedMethod] || 'We_Do';
    const currentSubcategory = selectedActivity || "practical";
    const mainCourseId = params?.id as string || courseId;
    const currentExerciseId = exercise.exerciseInformation?.exerciseId || exercise._id;

    // --- VERIFY LOCK STATUS BEFORE PROCEEDING ---
    try {
      // You might need to import axios if not already imported, or use fetch
      // Assuming axios is imported as 'axios'
      // If using fetch: const response = await fetch(...)

      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';

      // Call the status endpoint we just created
      // CORRECT
      const response = await fetch(
        `http://localhost:5533/exercise/status?courseId=${mainCourseId}&exerciseId=${currentExerciseId}&category=${categoryParam}&subcategory=${currentSubcategory}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (result.success && result.data.isLocked) {
        // BLOCKED: Show error and stop
        // You'll need to import toast from 'react-toastify' or your notification system
        // alert("This exercise is locked.") or toast.error(...)
        alert("⛔ Access Denied: You have already completed or been terminated from this exercise.");
        return; // <--- STOP HERE
      }

    } catch (error) {
      console.error("Failed to verify exercise status:", error);
      // Optional: decide if you want to block on network error or allow
      // return; 
    }
    // -------------------------------------------

    // Check if it is a Frontend module
    if (exercise.programmingSettings?.selectedModule === 'Frontend') {

      const exerciseToStore = {
        ...exercise,
        questions: exercise.questions || [],
        courseId: mainCourseId,
        context: {
          courseId: mainCourseId,
          nodeId: selectedItem?.id,
          nodeTitle: selectedItem?.title,
          method: selectedMethod,
          activity: selectedActivity
        },
        storedAt: new Date().toISOString()
      };

      console.log("💾 Storing exercise with courseId:", exerciseToStore.courseId);

      localStorage.setItem('currentFrontendExercise', JSON.stringify(exerciseToStore));

      const query = new URLSearchParams({
        courseId: exerciseToStore.courseId,
        exerciseId: currentExerciseId || '',
        exerciseName: exercise.exerciseInformation?.exerciseName || exercise.title || 'Frontend Exercise',
        subcategory: currentSubcategory,
        category: categoryParam,
        hasQuestions: (exercise.questions && exercise.questions.length > 0) ? 'true' : 'false',
        questionCount: (exercise.questions?.length || 0).toString()
      }).toString();

      router.push(`/lms/pages/courses/coursesdetailedview/frontend?${query}`);

    } else {
      setSelectedExercise(exercise);
      setShowExercisesList(false);
    }
  };
  // NEW: Function to go back to exercises list
  const handleBackToExercises = () => {
    setSelectedExercise(null);
    setShowExercisesList(true);
  };

  // NEW: Get exercises for current activity - FIXED VERSION
  // NEW: Get exercises for current activity - SIMPLIFIED VERSION
  // NEW: Get exercises for current activity - UPDATED VERSION
  // FIXED VERSION: Get exercises for current activity
  // const getExercisesForActivity = (): any[] => {
  //   if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) {
  //     return [];
  //   }

  //   try {
  //     // Only check for We_Do exercises
  //     if (selectedMethod !== "we-do") return [];

  //     const weDoData = selectedItem.pedagogy.We_Do;
  //     if (!weDoData || typeof weDoData !== 'object') return [];

  //     // Try to find the activity by key
  //     const normalizedActivity = selectedActivity.toLowerCase().replace(/\s+/g, '_');

  //     // Check for exact match first
  //     let activityData = weDoData[normalizedActivity];

  //     // If not found, try to find by partial match
  //     if (!activityData) {
  //       const activityKey = Object.keys(weDoData).find(key => {
  //         const normalizedKey = key.toLowerCase();
  //         return normalizedKey.includes(normalizedActivity) ||
  //           normalizedActivity.includes(normalizedKey);
  //       });

  //       if (activityKey) {
  //         activityData = weDoData[activityKey];
  //       }
  //     }

  //     // Return if we found an array of exercises
  //     if (Array.isArray(activityData) && activityData.length > 0) {
  //       return activityData;
  //     }

  //     return [];
  //   } catch (error) {
  //     console.error('Error getting exercises:', error);
  //     return [];
  //   }
  // };
  // Find this function and replace it
  // UPDATED: getExercisesForActivity
  // FIXED: Correctly map UI method to Data key and retrieve exercises
  const getExercisesForActivity = (): any[] => {
    // 1. Basic Safety Checks
    if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) {
      return [];
    }

    try {
      // 2. Map the UI 'selectedMethod' (e.g., "we-do", "you-do") to the Data Keys in MongoDB
      const methodKeyMap: Record<string, "I_Do" | "We_Do" | "You_Do"> = {
        "i-do": "I_Do",
        "we-do": "We_Do",
        "you-do": "You_Do"
      };

      const targetDataKey = methodKeyMap[selectedMethod];
      if (!targetDataKey) return [];

      // 3. Get the specific data bucket (e.g., pedagogy.You_Do)
      const categoryData = selectedItem.pedagogy[targetDataKey];

      // If the category is empty or undefined, return empty
      if (!categoryData || typeof categoryData !== 'object') return [];

      // 4. Normalize keys for matching (UI: "Assessments" -> DB: "assesments")
      const normalize = (str: string) => str.trim().toLowerCase().replace(/\s+/g, '_');
      const targetActivityKey = normalize(selectedActivity);

      // 5. Look for the exercises
      // A. Direct check (if keys match perfectly)
      if (Array.isArray((categoryData as any)[targetActivityKey])) {
        return (categoryData as any)[targetActivityKey];
      }

      // B. Fuzzy check (iterate keys to find a match)
      const foundKey = Object.keys(categoryData).find(k => normalize(k) === targetActivityKey);

      if (foundKey) {
        const data = (categoryData as any)[foundKey];
        // Ensure it's an array (exercises list) and not a single object
        if (Array.isArray(data)) {
          return data;
        }
      }

      return [];
    } catch (error) {
      console.error('Error fetching exercises for activity:', error);
      return [];
    }
  };
  // NEW: Effect to load exercises when activity changes
  // Find this useEffect (approx line 1508) and update it
  useEffect(() => {
    // UPDATED: Check if any method and activity are selected
    if (selectedMethod && selectedActivity) {
      const exercises = getExercisesForActivity();
      setExercisesList(exercises);

      // If there are exercises, show the exercises list
      if (exercises.length > 0) {
        setShowExercisesList(true);
        setSelectedExercise(null);
      } else {
        setShowExercisesList(false);
        setSelectedExercise(null);
      }
    } else {
      setExercisesList([]);
      setShowExercisesList(false);
      setSelectedExercise(null);
    }
  }, [selectedMethod, selectedActivity, selectedItem]);
  const toggleModule = (moduleId: string) => {
    const next = new Set(expandedModules);
    next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
    setExpandedModules(next);
  };

  const toggleSubModule = (subModuleId: string) => {
    const next = new Set(expandedSubModules);
    next.has(subModuleId) ? next.delete(subModuleId) : next.add(subModuleId);
    setExpandedSubModules(next);
  };

  const toggleTopic = (topicId: string) => {
    const next = new Set(expandedTopics);
    next.has(topicId) ? next.delete(topicId) : next.add(topicId);
    setExpandedTopics(next);
  };

  const toggleSubTopic = (subTopicId: string) => {
    const next = new Set(expandedSubTopics);
    next.has(subTopicId) ? next.delete(subTopicId) : next.add(subTopicId);
    setExpandedSubTopics(next);
  };

  // NEW: Function to get unique document types from mixed folders in reference tab
  const getUniqueDocTypesFromMixedFolders = (resources: Resource[]): ResourceType[] => {
    const docTypes = new Set<ResourceType>();
    resources.forEach(resource => {
      if (resource.isFolder && resource.folderType === "mixed" && resource.folderContents) {
        resource.folderContents.forEach(file => {
          if (!file.isReference) {
            docTypes.add(file.type);
          }
        });
      } else if (!resource.isFolder && !resource.isReference) {
        docTypes.add(resource.type);
      }
    });
    return Array.from(docTypes).sort();
  };

  // NEW: Function to get unique document types from current folder contents
  const getUniqueDocTypesFromFolder = (folder: Resource): ResourceType[] => {
    const docTypes = new Set<ResourceType>();
    if (folder.folderContents) {
      folder.folderContents.forEach(file => {
        if (!file.isReference) {
          docTypes.add(file.type);
        }
      });
    }
    return Array.from(docTypes).sort();
  };

  // NEW: Function to toggle document type selection
  const toggleDocTypeSelection = (docType: ResourceType) => {
    const next = new Set(selectedDocTypes);
    if (next.has(docType)) {
      next.delete(docType);
    } else {
      next.add(docType);
    }
    setSelectedDocTypes(next);
  };

  // NEW: Function to toggle folder document type selection
  const toggleFolderDocTypeSelection = (docType: ResourceType) => {
    const next = new Set(selectedFolderDocTypes);
    if (next.has(docType)) {
      next.delete(docType);
    } else {
      next.add(docType);
    }
    setSelectedFolderDocTypes(next);
  };

  // UPDATED: Modified getResourcesByType to handle folder categorization correctly
  // UPDATED: Modified getResourcesByType to handle folder categorization correctly
  const getResourcesByType = (
    type: ResourceType
  ): Resource[] => {
    if (!selectedMethod || !selectedActivity) return [];

    const elements = learningElements();
    const method = elements.find(el => el.id === selectedMethod);
    if (!method) return [];

    const activity = method.subItems.find(item => item.key === selectedActivity);
    if (!activity) return [];

    // Process direct files - FILTER BY VISIBILITY
    const directFiles: Resource[] = (activity.files || [])
      .filter(file => {
        // Check if file should be shown to students
        const shouldShow = !file.fileSettings || file.fileSettings.showToStudents !== false;
        if (!shouldShow) return false;

        if (type === "reference") {
          return file.isReference === true;
        } else {
          const fileType = getFileType(file.fileUrl, file.fileType);
          return fileType === type && !file.isReference;
        }
      })
      .map(file => {
        const fileType = getFileType(file.fileUrl, file.fileType);
        const resource: Resource = {
          id: file._id || `file-${file.fileName}-${Math.random().toString(36).substr(2, 5)}`,
          title: file.fileName || "Untitled",
          type: file.isReference ? "reference" : fileType,
          duration: getFileDuration(file),
          fileName: file.fileName,
          // UPDATED: Use formatFileSize instead of hardcoded MB
          fileSize: formatFileSize(file.size),
          uploadedAt: file.uploadedAt,
          isReference: file.isReference || false,
          // Include file settings from backend
          fileSettings: file.fileSettings,
          isVideo: file.isVideo,
          isArchive: file.isArchive,
          availableResolutions: file.availableResolutions,
        };

        if (fileType === "link") {
          resource.externalUrl = getFileUrl(file.fileUrl);
        } else {
          resource.fileUrl = getFileUrl(file.fileUrl);
        }

        return resource;
      });

    // Process folders
    let folderRepresentations: Resource[] = [];

    if (activity.folders && activity.folders.length > 0) {
      const categorized = categorizeFolderContents(activity.folders);

      if (type === "reference") {
        // For reference tab, show mixed-type folders and reference files
        folderRepresentations = categorized.folderRepresentations.filter(
          folder => folder.folderType === "mixed"
        );
      } else {
        // For specific tabs, show similar-type folders of that type
        folderRepresentations = categorized.folderRepresentations.filter(
          folder => folder.folderType === "similar" && folder.type === type
        );
      }
    }

    // Process links from activity.links array
    const linksFromArray: Resource[] = (activity.links || [])
      .filter(link => type === "link")
      .map(link => ({
        id: link._id || `link-${link.name}-${Math.random().toString(36).substr(2, 5)}`,
        title: link.name,
        type: "link",
        externalUrl: link.url,
        uploadedAt: link.uploadedAt,
        fileSettings: { showToStudents: true, allowDownload: true } // Default for links
      }));

    // Combine all resources based on type
    if (type === "link") {
      return [...directFiles.filter(f => f.type === "link"), ...linksFromArray];
    }

    // For non-reference types, return files + similar-type folder representations
    if (type !== "reference") {
      return [...directFiles, ...folderRepresentations];
    }

    // For reference type, apply document type filtering
    let referenceResources = [...directFiles, ...folderRepresentations];

    // Apply document type filtering if any types are selected
    if (selectedDocTypes.size > 0) {
      referenceResources = referenceResources.filter(resource => {
        if (resource.isFolder && resource.folderType === "mixed" && resource.folderContents) {
          // For mixed folders, check if any file matches selected types
          return resource.folderContents.some(file =>
            selectedDocTypes.has(file.type)
          );
        } else if (!resource.isFolder) {
          // For individual files, check if type matches selected types
          return selectedDocTypes.has(resource.type);
        }
        return true;
      });
    }

    return referenceResources;
  };

  // Get all resources for current context
  const getAllResources = (): Resource[] => {
    const allResources: Resource[] = [];

    const availableTypes = getAvailableResourceTypes();
    availableTypes.forEach(type => {
      const resources = getResourcesByType(type);
      allResources.push(...resources);
    });

    return allResources;
  };

  // Get filtered resources based on selected resource type
  const getFilteredResources = (): Resource[] => {
    const allResources = getAllResources();

    if (selectedResourceType === "all") {
      return allResources;
    }

    return allResources.filter(resource => resource.type === selectedResourceType);
  };

  // Get selected activity data
  const selectedActivityData = selectedMethod && selectedActivity
    ? learningElements()
      .find(el => el.id === selectedMethod)
      ?.subItems.find(item => item.key === selectedActivity)
    : null;

  // NEW: Function to handle folder navigation
  const handleFolderNavigation = (folder: Resource) => {
    setCurrentFolder(folder);
    setFolderPath(prev => [...prev, folder]);
    setSelectedFolderDocTypes(new Set()); // Reset folder filters when entering folder
    // Reset sort config when entering folder
    setSortConfig({
      field: "name",
      direction: "asc"
    });
  };
  // Add this useEffect to debug when activities change:
  useEffect(() => {
    console.log('=== DEBUG INFO ===');
    console.log('selectedMethod:', selectedMethod);
    console.log('selectedActivity:', selectedActivity);
    console.log('selectedItem:', selectedItem);

    if (selectedMethod && selectedActivity && selectedItem?.pedagogy) {
      console.log('Pedagogy keys:', Object.keys(selectedItem.pedagogy));

      if (selectedMethod === 'we-do') {
        console.log('We_Do data:', selectedItem.pedagogy.We_Do);
        console.log('We_Do keys (if object):', selectedItem.pedagogy.We_Do ? Object.keys(selectedItem.pedagogy.We_Do) : 'N/A');
      }
      if (selectedMethod === 'you-do') {
        console.log('We_Do data:', selectedItem.pedagogy.You_Do);
        console.log('We_Do keys (if object):', selectedItem.pedagogy.You_Do ? Object.keys(selectedItem.pedagogy.You_Do) : 'N/A');
      }
      const exercises = getExercisesForActivity();
      console.log('Exercises found:', exercises.length, exercises);
    }
  }, [selectedMethod, selectedActivity, selectedItem]);
  // Auto-select first available resource type when activity changes
  useEffect(() => {
    if (!selectedActivityData) return;

    const availableTypes = getAvailableResourceTypes();
    if (availableTypes.length === 0) return;

    // Define the priority order
    const priorityOrder: ResourceType[] = ["pdf", "ppt", "video", "zip", "link", "reference"];

    // Find the first available type in priority order
    const defaultType = priorityOrder.find(type => availableTypes.includes(type));

    if (defaultType && !userSelectedResourceType) {
      setSelectedResourceType(defaultType);
    }
  }, [selectedActivityData, userSelectedResourceType]);

  // Add this useEffect with your other useEffect hooks
  // useEffect(() => {
  //   setUserSelectedResourceType(false);
  // }, [selectedActivity]);

  // Auto-select first available resource type when activity changes
  useEffect(() => {
    if (selectedMethod && selectedActivity) {
      // Calculate activity data inside the useEffect
      const elements = learningElements();
      const method = elements.find(el => el.id === selectedMethod);
      const currentActivityData = method?.subItems.find(item => item.key === selectedActivity);

      if (!currentActivityData) return;

      const availableTypes = getAvailableResourceTypes();
      if (availableTypes.length === 0) return;

      // Define the priority order
      const priorityOrder: ResourceType[] = ["pdf", "ppt", "video", "zip", "link", "reference"];

      // Find the first available type in priority order
      const defaultType = priorityOrder.find(type => availableTypes.includes(type));

      if (defaultType && !userSelectedResourceType) {
        setSelectedResourceType(defaultType);
      }
    } else {
      // Clear resource type when no activity is selected
      setSelectedResourceType("pdf");
    }
  }, [selectedMethod, selectedActivity, userSelectedResourceType]);


  // ==============================
  // renderHierarchy Function - MOVED INSIDE COMPONENT
  // ==============================

  const renderHierarchy = () => {
    if (!courseData?.modules) return null;

    return (
      <div className="space-y-1">
        {courseData.modules.map((module) => {
          const moduleHasChildren = shouldShowArrow(module);
          const moduleHasPedagogy = hasPedagogyData(module);
          const isModuleSelected = selectedItem?.id === module._id;
          const isModuleExpanded = expandedModules.has(module._id);

          return (
            <div key={module._id} className="group">
              {/* Module header */}
              <div
                onClick={() => toggleModule(module._id)}
                className={`flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200 ${isModuleSelected
                  ? "bg-[#0000FF] text-white border-l-2 border-[#0000FF]"
                  : "hover:bg-gray-50 border-l-2 border-transparent"
                  }`}
              >
                <div className="w-4 h-4 flex items-center justify-center mr-2">
                  {moduleHasChildren ? (
                    isModuleExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-500 group-hover:text-gray-700 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-gray-700 transition-transform duration-200" />
                    )
                  ) : (
                    <div className="w-3 h-3" />
                  )}
                </div>

                <BookOpen
                  className={`w-3 h-3 mr-2 flex-shrink-0 ${isModuleSelected
                    ? "text-white"
                    : "text-gray-500 group-hover:text-gray-700"
                    }`}
                />

                <span
                  className={`text-xs font-medium flex-1 truncate ${isModuleSelected ? "text-white" : "text-gray-900"
                    }`}
                >
                  {module.title}
                </span>

                {moduleHasPedagogy && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isModuleSelected ? "bg-white" : "bg-gray-400"
                      }`}
                  />
                )}
              </div>

              {/* Smooth expand/collapse for module children */}
              {moduleHasChildren && (
                <div
                  className={`
                  overflow-hidden
                  transition-all duration-300 ease-in-out
                  ${isModuleExpanded
                      ? "max-h-[5000px] opacity-100 translate-y-0"
                      : "max-h-0 opacity-0 -translate-y-2"
                    }
                `}
                >
                  <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-2">
                    {module.subModules?.map((subModule) => {
                      const subModuleHasChildren = shouldShowArrow(subModule);
                      const subModuleHasPedagogy = hasPedagogyData(subModule);
                      const isSubModuleSelected = selectedItem?.id === subModule._id;
                      const isSubModuleExpanded = expandedSubModules.has(subModule._id);

                      return (
                        <div key={subModule._id} className="group/sub">
                          {/* Submodule header */}
                          <div
                            onClick={() => toggleSubModule(subModule._id)}
                            className={`flex items-center p-2 rounded-lg cursor-pointer transition-all duration-200 ${isSubModuleSelected
                              ? "bg-[#0000FF] text-white border-l-2 border-[#0000FF]"
                              : "hover:bg-gray-50 border-l-2 border-transparent"
                              }`}
                          >
                            <div className="w-4 h-4 flex items-center justify-center mr-2">
                              {subModuleHasChildren ? (
                                isSubModuleExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-gray-500 group-hover/sub:text-gray-700 transition-transform duration-200" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-gray-500 group-hover/sub:text-gray-700 transition-transform duration-200" />
                                )
                              ) : (
                                <div className="w-3 h-3" />
                              )}
                            </div>

                            <FileText
                              className={`w-3 h-3 mr-2 flex-shrink-0 ${isSubModuleSelected
                                ? "text-white"
                                : "text-gray-500 group-hover/sub:text-gray-700"
                                }`}
                            />

                            <span
                              className={`text-xs flex-1 truncate ${isSubModuleSelected ? "text-white" : "text-gray-800"
                                }`}
                            >
                              {subModule.title}
                            </span>

                            {subModuleHasPedagogy && (
                              <div
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSubModuleSelected ? "bg-white" : "bg-gray-400"
                                  }`}
                              />
                            )}
                          </div>

                          {/* Smooth expand/collapse for submodule topics */}
                          {subModuleHasChildren && (
                            <div
                              className={`
                              overflow-hidden
                              transition-all duration-250 ease-in-out
                              ${isSubModuleExpanded
                                  ? "max-h-[4000px] opacity-100 translate-y-0"
                                  : "max-h-0 opacity-0 -translate-y-1"
                                }
                            `}
                            >
                              {isSubModuleExpanded && subModule.topics && (
                                <div className="ml-4 mt-1 space-y-0.5 border-l border-gray-200 pl-2">
                                  {subModule.topics.map((topic) => {
                                    const topicHasChildren = shouldShowArrow(topic);
                                    const isTopicSelected = selectedItem?.id === topic._id;
                                    const isTopicExpanded = expandedTopics.has(topic._id);

                                    return (
                                      <div key={topic._id} className="group/topic">
                                        {/* Topic header */}
                                        <div className="flex items-center">
                                          <div
                                            onClick={() => {
                                              if (topicHasChildren) {
                                                toggleTopic(topic._id);
                                              } else {
                                                handleItemSelect(
                                                  topic._id,
                                                  topic.title,
                                                  "topic",
                                                  [
                                                    module._id,
                                                    subModule._id,
                                                    topic._id,
                                                  ],
                                                  topic.pedagogy
                                                );
                                              }
                                            }}
                                            className={`flex items-center flex-1 p-1.5 rounded-lg cursor-pointer transition-all duration-200 ${isTopicSelected
                                              ? "bg-[#0000FF] text-white border-l-2 border-[#0000FF]"
                                              : "hover:bg-gray-50 border-l-2 border-transparent"
                                              }`}
                                          >
                                            {topicHasChildren && (
                                              <div className="w-4 h-4 flex items-center justify-center mr-1">
                                                {isTopicExpanded ? (
                                                  <ChevronDown className="w-2.5 h-2.5 text-gray-500 transition-transform duration-200" />
                                                ) : (
                                                  <ChevronRight className="w-2.5 h-2.5 text-gray-500 transition-transform duration-200" />
                                                )}
                                              </div>
                                            )}
                                            {!topicHasChildren && (
                                              <div className="w-4 h-4 mr-1" />
                                            )}

                                            <File
                                              className={`w-2.5 h-2.5 mr-2 flex-shrink-0 ${isTopicSelected
                                                ? "text-white"
                                                : "text-gray-500 group-hover/topic:text-gray-700"
                                                }`}
                                            />

                                            <span
                                              className={`text-xs flex-1 truncate ${isTopicSelected
                                                ? "text-white"
                                                : "text-gray-700"
                                                }`}
                                            >
                                              {topic.title}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Smooth expand/collapse for subtopics */}
                                        {topicHasChildren && (
                                          <div
                                            className={`
                                            overflow-hidden
                                            transition-all duration-200 ease-in-out
                                            ${isTopicExpanded
                                                ? "max-h-[2000px] opacity-100 translate-y-0"
                                                : "max-h-0 opacity-0 -translate-y-1"
                                              }
                                          `}
                                          >
                                            {isTopicExpanded && topic.subTopics && (
                                              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                                                {topic.subTopics.map((subtopic) => {
                                                  const isSubTopicSelected =
                                                    selectedItem?.id === subtopic._id;

                                                  return (
                                                    <div
                                                      key={subtopic._id}
                                                      onClick={() =>
                                                        handleItemSelect(
                                                          subtopic._id,
                                                          subtopic.title,
                                                          "subtopic",
                                                          [
                                                            module._id,
                                                            subModule._id,
                                                            topic._id,
                                                            subtopic._id,
                                                          ],
                                                          subtopic.pedagogy
                                                        )
                                                      }
                                                      className={`flex items-center p-1.5 rounded-lg cursor-pointer transition-all duration-200 ${isSubTopicSelected
                                                        ? "bg-[#0000FF] text-white border-l-2 border-[#0000FF]"
                                                        : "hover:bg-gray-50 border-l-2 border-transparent"
                                                        }`}
                                                    >
                                                      <File
                                                        className={`w-2 h-2 mr-2 flex-shrink-0 ${isSubTopicSelected
                                                          ? "text-white"
                                                          : "text-gray-500 hover:text-gray-700"
                                                          }`}
                                                      />

                                                      <span
                                                        className={`text-xs flex-1 truncate ${isSubTopicSelected
                                                          ? "text-white"
                                                          : "text-gray-600"
                                                          }`}
                                                      >
                                                        {subtopic.title}
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* For modules without subModules but with topics */}
                    {(!module.subModules || module.subModules.length === 0) &&
                      module.topics && (
                        <div className="space-y-1">
                          {module.topics.map((topic) => {
                            const topicHasChildren = shouldShowArrow(topic);
                            const isTopicSelected = selectedItem?.id === topic._id;
                            const isTopicExpanded = expandedTopics.has(topic._id);

                            return (
                              <div key={topic._id} className="group/topic">
                                <div className="flex items-center">
                                  {/* Topic row - make entire row clickable for expansion */}
                                  <div
                                    onClick={() => {
                                      if (topicHasChildren) {
                                        toggleTopic(topic._id);
                                      } else {
                                        // Only select if there are no children
                                        handleItemSelect(
                                          topic._id,
                                          topic.title,
                                          "topic",
                                          [module._id, topic._id],
                                          topic.pedagogy
                                        );
                                      }
                                    }}
                                    className={`flex items-center flex-1 p-1.5 rounded-lg cursor-pointer transition-all duration-200 ${isTopicSelected
                                      ? "bg-[#0000FF] text-white border-l-2 border-[#0000FF]"
                                      : "hover:bg-gray-50 border-l-2 border-transparent"
                                      }`}
                                  >
                                    {/* Arrow indicator for topics with children */}
                                    {topicHasChildren && (
                                      <div className="w-4 h-4 flex items-center justify-center mr-1">
                                        {isTopicExpanded ? (
                                          <ChevronDown className="w-2.5 h-2.5 text-gray-500 transition-transform duration-200" />
                                        ) : (
                                          <ChevronRight className="w-2.5 h-2.5 text-gray-500 transition-transform duration-200" />
                                        )}
                                      </div>
                                    )}
                                    {!topicHasChildren && (
                                      <div className="w-4 h-4 mr-1" />
                                    )}

                                    <File
                                      className={`w-2.5 h-2.5 mr-2 flex-shrink-0 ${isTopicSelected
                                        ? "text-white"
                                        : "text-gray-500 group-hover/topic:text-gray-700"
                                        }`}
                                    />

                                    <span
                                      className={`text-xs flex-1 truncate ${isTopicSelected
                                        ? "text-white"
                                        : "text-gray-700"
                                        }`}
                                    >
                                      {topic.title}
                                    </span>
                                  </div>
                                </div>

                                {/* Smooth expand/collapse for subtopics (module-level topics) */}
                                {topicHasChildren && (
                                  <div
                                    className={`
                                    overflow-hidden
                                    transition-all duration-200 ease-in-out
                                    ${isTopicExpanded
                                        ? "max-h-[2000px] opacity-100 translate-y-0"
                                        : "max-h-0 opacity-0 -translate-y-1"
                                      }
                                  `}
                                  >
                                    {isTopicExpanded && topic.subTopics && (
                                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                                        {topic.subTopics.map((subtopic) => {
                                          const isSubTopicSelected =
                                            selectedItem?.id === subtopic._id;

                                          return (
                                            <div
                                              key={subtopic._id}
                                              onClick={() =>
                                                handleItemSelect(
                                                  subtopic._id,
                                                  subtopic.title,
                                                  "subtopic",
                                                  [
                                                    module._id,
                                                    topic._id,
                                                    subtopic._id,
                                                  ],
                                                  subtopic.pedagogy
                                                )
                                              }
                                              className={`flex items-center p-1.5 rounded-lg cursor-pointer transition-all duration-200 ${isSubTopicSelected
                                                ? "bg-[#0000FF] text-white border-l-2 border-[#0000FF]"
                                                : "hover:bg-gray-50 border-l-2 border-transparent"
                                                }`}
                                            >
                                              <File
                                                className={`w-2 h-2 mr-2 flex-shrink-0 ${isSubTopicSelected
                                                  ? "text-white"
                                                  : "text-gray-500 hover:text-gray-700"
                                                  }`}
                                              />

                                              <span
                                                className={`text-xs flex-1 truncate ${isSubTopicSelected
                                                  ? "text-white"
                                                  : "text-gray-600"
                                                  }`}
                                              >
                                                {subtopic.title}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBreadcrumb = () => {
    if (!courseData) return null;

    const breadcrumbItems: Array<{
      title: string;
      icon: React.ComponentType<any>;
      onClick: (() => void) | null;
    }> = [];


    // 1. All Courses link
    breadcrumbItems.push({
      title: "All Courses",
      icon: BookOpen,
      onClick: () => {
        router.push('/lms/pages/courses');
      },
    });

    // 2. Current Course link
    breadcrumbItems.push({
      title: courseData.courseName,
      icon: GraduationCap,
      onClick: () => {
        // CLEAR PERSISTENCE
        localStorage.removeItem('lms_student_selected_node_id');
        localStorage.removeItem('lms_student_selected_method');
        localStorage.removeItem('lms_student_selected_activity');

        setSelectedItem(null);
        setSelectedMethod("");
        setSelectedActivity("");
        setCurrentFolder(null);
        setFolderPath([]);
        closeAllViewers();
      },
    });

    // 3. Dynamic hierarchy items (Module, SubModule, Topic, SubTopic)
    if (selectedItem) {
      let currentModule: Module | null = null;
      let currentSubModule: SubModule | null = null;
      let currentTopic: Topic | null = null;
      let currentSubTopic: SubTopic | null = null;

      outerLoop: for (const module of courseData.modules || []) {
        if (selectedItem.hierarchy.includes(module._id)) {
          currentModule = module;
          breadcrumbItems.push({
            title: module.title,
            icon: BookOpen,
            onClick: () => {
              setExpandedModules(new Set([module._id]));
              setExpandedSubModules(new Set());
              setExpandedTopics(new Set());
              setExpandedSubTopics(new Set());
              setSelectedItem(null);
              setSelectedMethod("");
              setSelectedActivity("");
              setCurrentFolder(null);
              setFolderPath([]);
              closeAllViewers();
            },
          });
        }

        if (module.subModules) {
          for (const subModule of module.subModules) {
            if (selectedItem.hierarchy.includes(subModule._id)) {
              currentSubModule = subModule;
              breadcrumbItems.push({
                title: subModule.title,
                icon: FileText,
                onClick: () => {
                  setExpandedModules(new Set([module._id]));
                  setExpandedSubModules(new Set([subModule._id]));
                  setExpandedTopics(new Set());
                  setExpandedSubTopics(new Set());
                  setSelectedItem(null);
                  setSelectedMethod("");
                  setSelectedActivity("");
                  setCurrentFolder(null);
                  setFolderPath([]);
                  closeAllViewers();
                },
              });
            }

            if (subModule.topics) {
              for (const topic of subModule.topics) {
                if (selectedItem.hierarchy.includes(topic._id)) {
                  currentTopic = topic;
                  breadcrumbItems.push({
                    title: topic.title,
                    icon: File,
                    onClick:
                      selectedItem.type === "subtopic"
                        ? () => {
                          setExpandedModules(new Set([module._id]));
                          setExpandedSubModules(new Set([subModule._id]));
                          setExpandedTopics(new Set([topic._id]));
                          setExpandedSubTopics(new Set());
                          setSelectedItem(null);
                          setSelectedMethod("");
                          setSelectedActivity("");
                          setCurrentFolder(null);
                          setFolderPath([]);
                          closeAllViewers();
                        }
                        : null,
                  });

                  if (selectedItem.type === "subtopic" && topic.subTopics) {
                    for (const subtopic of topic.subTopics) {
                      if (subtopic._id === selectedItem.id) {
                        currentSubTopic = subtopic;
                        breadcrumbItems.push({
                          title: subtopic.title,
                          icon: File,
                          onClick: null,
                        });
                        break outerLoop;
                      }
                    }
                  } else {
                    break outerLoop;
                  }
                }
              }
            }
          }
        }

        // Handle Topic/SubTopic directly under Module
        if (module.topics) {
          for (const topic of module.topics) {
            if (topic._id === selectedItem.id) {
              currentTopic = topic;
              breadcrumbItems.push({
                title: topic.title,
                icon: File,
                onClick: null,
              });
              break outerLoop;
            }

            if (topic.subTopics) {
              for (const subtopic of topic.subTopics) {
                if (subtopic._id === selectedItem.id) {
                  currentSubTopic = subtopic;
                  breadcrumbItems.push({
                    title: topic.title,
                    icon: File,
                    onClick: () => {
                      setExpandedModules(new Set([module._id]));
                      setExpandedTopics(new Set([topic._id]));
                      setExpandedSubTopics(new Set());
                      setSelectedItem(null);
                      setSelectedMethod("");
                      setSelectedActivity("");
                      setCurrentFolder(null);
                      setFolderPath([]);
                      closeAllViewers();
                    },
                  });
                  breadcrumbItems.push({
                    title: subtopic.title,
                    icon: File,
                    onClick: null,
                  });
                  break outerLoop;
                }
              }
            }
          }
        }

        if (module._id === selectedItem.id) {
          break;
        }
      }
    }

    return (
      <div className={`transition-all duration-300 ${breadcrumbCollapsed ? 'mb-0' : 'mb-4'}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <nav className="flex-1 flex items-center gap-1 text-xs px-1 overflow-x-auto" aria-label="Breadcrumb">
            {/* Home Link - Always the starting point */}
            {/* Home Link - Always the starting point */}
            <div
              className="flex items-center gap-1 px-3 py-1 text-gray-700 hover:text-black cursor-pointer rounded-full transition-all duration-200 bg-white hover:bg-gray-100 shadow-sm flex-shrink-0 hover:scale-105 active:scale-95"
              onClick={() => {
                // 1. Clear persistence
                localStorage.removeItem('lms_student_selected_node_id');
                localStorage.removeItem('lms_student_selected_method');
                localStorage.removeItem('lms_student_selected_activity');

                // 2. Reset local state
                setSelectedItem(null);
                setSelectedMethod("");
                setSelectedActivity("");
                setCurrentFolder(null);
                setFolderPath([]);
                closeAllViewers();

                // 3. Navigate to Student Dashboard
                router.push('/lms/pages/studentdashboard');
              }}
            >
              <Home className="w-3 h-3 text-blue-500 transition-transform duration-200 group-hover:rotate-12" />
              <span className="text-xs font-medium">Dashboard</span>
            </div>
            {/* Dynamic Breadcrumb Items */}
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={index}>
                {/* Separator */}
                <ChevronRight className="w-3 h-3 text-gray-400 mx-1 flex-shrink-0 transition-opacity duration-200" />

                {/* Breadcrumb Item */}
                <div
                  className={`flex items-center gap-1 px-3 py-1 transition-all duration-200 rounded-full border border-transparent flex-shrink-0 hover:scale-105 active:scale-95 ${index === breadcrumbItems.length - 1
                    ? "text-white font-semibold bg-blue-600 shadow-md"
                    : item.onClick
                      ? "text-gray-600 hover:text-blue-600 cursor-pointer hover:bg-blue-50 border-gray-200 hover:border-blue-200"
                      : "text-gray-500 bg-gray-100 border-gray-200"
                    }`}
                  onClick={item.onClick || undefined}
                >
                  {/* Only show icon for non-active items, or if the active item has an icon */}
                  {index !== breadcrumbItems.length - 1 && <item.icon className="w-3 h-3 transition-transform duration-200" />}
                  {index === breadcrumbItems.length - 1 && <item.icon className="w-3 h-3 text-white" />}

                  <span className="text-xs">{item.title}</span>
                </div>
              </React.Fragment>
            ))}
          </nav>

          {/* REMOVED: Collapse Button - Now moved to CodeEditor header */}
        </div>
      </div>
    );
  };
  // Get resource type display name
  const getResourceTypeDisplayName = (type: ResourceType | "all"): string => {
    const typeMap: Record<ResourceType | "all", string> = {
      "all": "All",
      "video": "Videos",
      "pdf": "PDFs",
      "ppt": "Slides",
      "zip": "ZIPs",
      "link": "Links",
      "reference": "Reference"
    };
    return typeMap[type] || type;
  };

  // Get resource type icon with colors
  const getResourceTypeIcon = (type: ResourceType | "all") => {
    if (type === "all") return File;
    if (type === "video") return Video;
    if (type === "pdf") return FileText;
    if (type === "ppt") return Presentation;
    if (type === "zip") return Archive;
    if (type === "link") return Link;
    return FileText;
  };

  // Check if we should show code editor
  const shouldShowCodeEditor = selectedMethod === "we-do" && selectedActivity && selectedActivity.toLowerCase().includes('practical');

  // Get filtered resources for display
  const resourcesToDisplay = getFilteredResources();

  // Get unique document types for filtering in reference tab
  const referenceResources = getResourcesByType("reference");
  const uniqueDocTypes = getUniqueDocTypesFromMixedFolders(referenceResources);

  // Get unique document types for current folder
  const folderDocTypes = currentFolder ? getUniqueDocTypesFromFolder(currentFolder) : [];

  // Auto-select first available resource type when activity changes
  useEffect(() => {
    if (!selectedActivityData) return;

    const availableTypes = getAvailableResourceTypes();
    if (availableTypes.length === 0) return;

    // Define the priority order
    const priorityOrder: ResourceType[] = ["pdf", "ppt", "video", "zip", "link", "reference"];

    // Find the first available type in priority order
    const defaultType = priorityOrder.find(type => availableTypes.includes(type));

    if (defaultType && !userSelectedResourceType) {
      setSelectedResourceType(defaultType);
    }
  }, [selectedActivityData, userSelectedResourceType]);

  // Add this useEffect with your other useEffect hooks
  // useEffect(() => {
  //   setUserSelectedResourceType(false);
  // }, [selectedActivity]);

  // Auto-select first available resource type when activity changes
  useEffect(() => {
    if (selectedMethod && selectedActivity) {
      // Calculate activity data inside the useEffect
      const elements = learningElements();
      const method = elements.find(el => el.id === selectedMethod);
      const currentActivityData = method?.subItems.find(item => item.key === selectedActivity);

      if (!currentActivityData) return;

      const availableTypes = getAvailableResourceTypes();
      if (availableTypes.length === 0) return;

      // Define the priority order
      const priorityOrder: ResourceType[] = ["pdf", "ppt", "video", "zip", "link", "reference"];

      // Find the first available type in priority order
      const defaultType = priorityOrder.find(type => availableTypes.includes(type));

      if (defaultType && !userSelectedResourceType) {
        setSelectedResourceType(defaultType);
      }
    } else {
      // Clear resource type when no activity is selected
      setSelectedResourceType("pdf");
    }
  }, [selectedMethod, selectedActivity, userSelectedResourceType]);
  // NEW: Function to handle back navigation from folder
  const handleFolderBack = () => {
    if (folderPath.length === 0) {
      setCurrentFolder(null);
      return;
    }

    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);

    if (newPath.length === 0) {
      setCurrentFolder(null);
    } else {
      setCurrentFolder(newPath[newPath.length - 1]);
    }
  };

  // NEW: Function to get filtered folder contents
  const getFilteredFolderContents = (): Resource[] => {
    if (!currentFolder || !currentFolder.folderContents) return [];

    let contents = [...currentFolder.folderContents];

    // Apply document type filtering if any types are selected
    if (selectedFolderDocTypes.size > 0) {
      contents = contents.filter(resource =>
        selectedFolderDocTypes.has(resource.type)
      );
    }

    return contents;
  };

  // UPDATED: Function to handle resource click with download option
  const handleResourceClick = async (resource: Resource) => {
    closeAllViewers();

    // Handle folder clicks - expand to show contents
    if (resource.isFolder && resource.folderContents) {
      handleFolderNavigation(resource);
      return;
    }

    // For reference files, check their actual file type and open in appropriate viewer
    if (resource.isReference) {
      const actualFileType = getFileType(resource.fileUrl || '', resource.fileName || '');

      if (actualFileType === "video") {
        openViewer("video", resource);
      } else if (actualFileType === "ppt") {
        openViewer("ppt", resource);
      } else if (actualFileType === "pdf") {
        openViewer("pdf", resource);
      } else if (actualFileType === "zip") {
        openViewer("zip", resource);
      } else {
        // For other reference files, open in new tab
        let downloadUrl = resource.externalUrl;

        if (!downloadUrl && resource.fileUrl) {
          if (typeof resource.fileUrl === 'object' && resource.fileUrl.base) {
            downloadUrl = resource.fileUrl.base;
          } else if (typeof resource.fileUrl === 'string') {
            downloadUrl = resource.fileUrl;
          }
        }

        if (downloadUrl) {
          window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        }
      }
      return;
    }

    // Existing non-reference file handling
    if (resource.type === "video") {
      openViewer("video", resource);
    } else if (resource.type === "ppt") {
      openViewer("ppt", resource);
    } else if (resource.type === "pdf") {
      openViewer("pdf", resource);
    } else if (resource.type === "zip") {
      openViewer("zip", resource);
    } else if (resource.type === "link") {
      let linkUrl = resource.externalUrl;

      if (!linkUrl && resource.fileUrl) {
        if (typeof resource.fileUrl === 'object' && resource.fileUrl.base) {
          linkUrl = resource.fileUrl.base;
        } else if (typeof resource.fileUrl === 'string') {
          linkUrl = resource.fileUrl;
        }
      }

      if (linkUrl) {
        const urlType = detectUrlType(linkUrl);

        switch (urlType) {
          case "video":
            openViewer("video", { ...resource, fileUrl: linkUrl, type: "video" });
            break;
          case "ppt":
            openViewer("ppt", { ...resource, fileUrl: linkUrl, type: "ppt" });
            break;
          case "pdf":
            openViewer("pdf", { ...resource, fileUrl: linkUrl, type: "pdf" });
            break;
          case "external":
          default:
            window.open(linkUrl, '_blank', 'noopener,noreferrer');
            break;
        }
      }
    }
  };

  // NEW: Function to handle download click - UPDATED
  const handleDownloadClick = async (resource: Resource, e: React.MouseEvent) => {
    e.stopPropagation();

    // Only allow download for reference files
    if (!resource.isReference) {
      console.log('Download only available for reference files');
      return;
    }

    // Check if download is allowed
    if (resource.fileSettings && resource.fileSettings.allowDownload === false) {
      console.log('Download not allowed for this file');
      return;
    }

    try {
      await downloadFile(resource);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // UPDATED: Color-coded resource icons
  const renderResourceIcon = (type: ResourceType, isFolder?: boolean) => {
    if (isFolder) {
      return <Folder className="w-3 h-3 text-blue-500" />;
    }

    switch (type) {
      case "video":
        return <Video className="w-3 h-3 text-red-500" />;
      case "ppt":
        return <Presentation className="w-3 h-3 text-orange-500" />;
      case "pdf":
        return <FileText className="w-3 h-3 text-red-600" />;
      case "zip":
        return <Archive className="w-3 h-3 text-green-500" />;
      case "link":
        return <Link className="w-3 h-3 text-purple-500" />;
      case "reference":
        return <FileText className="w-3 h-3 text-gray-500" />;
      default:
        return <File className="w-3 h-3 text-gray-400" />;
    }
  };

  // Show error state if needed
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center bg-white p-6 rounded-lg shadow-sm border border-gray-200 max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <File className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-sm font-semibold text-red-600 mb-1">Error Loading Course</h2>
          <p className="text-xs text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        {/* <p className="text-sm font-medium text-gray-500">Restoring your session...</p> */}
      </div>
    );
  }
  return (
    <div className=" bg-white text-black overflow-hidden mt-[72px]">
      <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
     
    body, #__next, .lms-page-wrapper,
    p, span, div, input, textarea, select, button,
    .ant-input, .ant-select, .ant-btn, .ant-form-item,
    .ant-table, .ant-dropdown, .ant-menu-item,
    .ant-tabs-tab, .ant-modal-content,
    .student-navbar-wrapper, .student-navbar-wrapper * {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-optical-sizing: auto;
      font-weight: 400;
      font-style: normal;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
     
    h1, h2, h3, h4, h5, h6,
    .heading, .title, .subtitle, .card-title,
    .section-title, .page-title, .dashboard-title,
    .ant-typography, .ant-modal-title, .ant-card-head-title,
    .ant-steps-item-title, .ant-result-title,
    .ant-alert-message, .ant-notification-notice-message,
    .stat-number, .metric-value, .highlight-text,
    .nav-brand, .logo-text,
    .navbar-brand, .student-navbar-wrapper .logo-text,
    .student-navbar-wrapper .nav-title,
    .student-navbar-wrapper h1,
    .student-navbar-wrapper h2,
    .student-navbar-wrapper h3,
    .student-navbar-wrapper .section-title {
      font-family: "Poppins", -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
     
    h1, .page-title {
      font-weight: 700;
      letter-spacing: -0.02em;
    }
     
    h2, .section-title {
      font-weight: 600;
    }
     
    h3, h4, .card-title {
      font-weight: 500;
    }
     
    .ant-btn-primary, .ant-btn-lg,
    .btn-primary, .btn-cta, .action-button,
    .student-navbar-wrapper .btn-primary,
    .student-navbar-wrapper .ant-btn-primary,
    .student-navbar-wrapper .action-button,
    .student-navbar-wrapper .cta-button {
      font-family: "Poppins", sans-serif !important;
      font-weight: 500 !important;
      letter-spacing: 0.02em;
    }
     
    .user-name, .profile-name,
    .student-navbar-wrapper .user-name,
    .student-navbar-wrapper .profile-name {
      font-family: "Poppins", sans-serif;
      font-weight: 500;
    }
     
    .student-navbar-wrapper .nav-link,
    .student-navbar-wrapper .menu-item {
      font-family: "Inter", sans-serif;
      font-weight: 500;
    }
     
    .font-light {
      font-weight: 300;
    }
     
    .font-normal {
      font-weight: 400;
    }
     
    .font-medium {
      font-weight: 500;
    }
     
    .font-semibold {
      font-weight: 600;
    }
     
    .font-bold {
      font-weight: 700;
    }
     
    .font-inter {
      font-family: "Inter", sans-serif;
    }
     
    .font-poppins {
      font-family: "Poppins", sans-serif;
    }
  `}</style>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-xl`}>
        <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between bg-white">
          <div>
            <h1 className="text-sm font-bold text-black">
              {courseData?.courseName || "Course Content"}
            </h1>
            {courseData?.courseDescription && (
              <p className="text-xs mt-1 text-gray-600 line-clamp-2">
                {courseData.courseDescription}
              </p>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors shadow-sm flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="h-[calc(100vh-140px)] overflow-y-auto p-3 bg-white">
          <div className="mb-3">
            <h3 className="text-xs font-semibold text-black mb-2 px-2">Course Structure</h3>
            {renderHierarchy()}
          </div>
        </div>
      </div>

      <StudentNavbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
        onNotesClick={() => setShowNotesPanel((v) => !v)}
        onAIClick={() => setShowAIChat((v) => !v)}
        onSummaryClick={() => setShowSummary((v) => !v)}
      />

      <div className="flex h-[calc(100vh-65px)] overflow-hidden">
        {/* Desktop Sidebar */}
        <div className={`relative ${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 hidden lg:block`}>
          {sidebarOpen && (
            <div className="w-64 flex-col h-full flex bg-white border-r border-gray-200 shadow-sm relative">
              <SidebarToggle
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(false)}
                position="absolute"
              />

              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search course..."
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span>{courseData?.modules?.length || 0} modules</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Self-paced</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-3 px-1 uppercase tracking-wide">
                  Course Content
                </h3>
                {renderHierarchy()}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Sidebar Toggle When Closed */}
        {!sidebarOpen && (
          <SidebarToggle
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(true)}
            position="fixed"
          />
        )}

        {/* Main Content Area Container */}
        <div className="flex-1 flex min-h-0 overflow-hidden ">
          {/* Left Panel: The main course/topic content view */}
          <div className="flex-1 p-4 flex flex-col overflow-hidden min-h-0">
            {!selectedItem ? (
              /* --- Course Overview View --- */
              <div>
                <div className={`transition-all duration-300 ease-in-out ${breadcrumbCollapsed ? 'max-h-0 opacity-0 overflow-hidden mb-0' : 'max-h-96 opacity-100 mb-4'}`}>
                  {!breadcrumbCollapsed && renderBreadcrumb()}
                </div>
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#64B5F6] to-[#1976D2] rounded-full flex items-center justify-center mx-auto mb-6 shadow-md hover:shadow-lg transition-all duration-300 group hover:scale-105">
                    <BookOpen className="w-8 h-8 text-white group-hover:rotate-3 transition-transform duration-300" />
                  </div>

                  <h2 className="text-2xl font-semibold text-gray-900 mb-4 tracking-tight">
                    Welcome to <span className="text-[#1976D2] font-medium">{courseData?.courseName}</span>
                  </h2>

                  <div className="max-w-xl mx-auto mb-10 px-4">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {courseData?.description || 'Master new skills at your own pace'}
                    </p>
                  </div>

                  <div className="flex justify-center gap-4 mb-8">
                    <div className="text-center p-3 w-auto bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-[#64B5F6]/30 group min-w-[100px]">
                      <div className="text-xl font-semibold text-gray-900 mb-1 group-hover:text-[#1976D2] transition-colors duration-300">
                        {courseData?.modules?.length || 0}
                      </div>
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Modules</div>
                      <div className="mt-2">
                        <div className="w-4 h-0.5 bg-gray-200 mx-auto group-hover:w-6 group-hover:bg-gradient-to-r group-hover:from-[#64B5F6] group-hover:to-[#1976D2] transition-all duration-300"></div>
                      </div>
                    </div>

                    <div className="text-center p-3 w-auto bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-[#64B5F6]/30 group min-w-[100px]">
                      <div className="text-xl font-semibold text-gray-900 mb-1 group-hover:text-[#1976D2] transition-colors duration-300">
                        {courseData?.modules?.reduce((acc, module) =>
                          acc + (module.topics?.length || 0) +
                          (module.subModules?.reduce((subAcc, sub) =>
                            subAcc + (sub.topics?.length || 0), 0) || 0), 0) || 0
                        }
                      </div>
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Topics</div>
                      <div className="mt-2">
                        <div className="w-4 h-0.5 bg-gray-200 mx-auto group-hover:w-6 group-hover:bg-gradient-to-r group-hover:from-[#64B5F6] group-hover:to-[#1976D2] transition-all duration-300"></div>
                      </div>
                    </div>

                    <div className="text-center p-3 w-auto bg-gradient-to-br from-[#64B5F6]/5 to-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-[#64B5F6]/20 group min-w-[100px]">
                      <div className="text-lg font-semibold text-[#1976D2] mb-1 group-hover:tracking-wide transition-all duration-300">
                        Self-paced
                      </div>
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Learning</div>
                      <div className="mt-2">
                        <div className="w-4 h-0.5 bg-[#64B5F6]/30 mx-auto group-hover:w-6 group-hover:bg-[#64B5F6] transition-all duration-300"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* --- Content/Activity Viewer View --- */
              <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Breadcrumb with smooth animation */}
                <div className={`transition-all duration-300 ease-in-out ${breadcrumbCollapsed ? 'max-h-0 opacity-0 overflow-hidden mb-0' : 'max-h-96 opacity-100'}`}>
                  {!breadcrumbCollapsed && renderBreadcrumb()}
                </div>

                {/* Category Section with smooth animation */}
                <div className={`transition-all duration-300 ease-in-out ${breadcrumbCollapsed ? 'max-h-0 opacity-0 overflow-hidden mb-0' : 'max-h-96 opacity-100 mb-6'}`}>
                  {!breadcrumbCollapsed && learningElements().length > 0 && (
                    <div className="mx-2">
                      <div className="flex flex-col md:flex-row gap-4 items-start md:gap-3">
                        {learningElements().map((element) => {
                          const isSelected = selectedMethod === element.id;
                          const isHovered = hoveredCategory === element.id;
                          const hasSubItems = element.subItems.length > 0;
                          const subItemsCount = element.subItems.length;

                          return (
                            <div
                              key={element.id}
                              className="group w-full md:w-1/3 transition-all duration-300 rounded-lg bg-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
                              onMouseEnter={() => {
                                if (hasSubItems) {
                                  setHoveredCategory(element.id);
                                }
                              }}
                              onMouseLeave={() => {
                                if (hoveredCategory === element.id) {
                                  setHoveredCategory("");
                                }
                              }}
                            >
                              <button
                                onClick={() => {
                                  if (selectedMethod === element.id) {
                                    // If clicking the same category, toggle activity visibility
                                    if (selectedActivity) {
                                      setSelectedActivity("");
                                    }
                                    return;
                                  }
                                  setSelectedMethod(element.id);
                                  setSelectedActivity("");
                                  setUserSelectedResourceType(false);
                                  setHoveredCategory(""); // Clear hover state when selecting
                                }}
                                className={`
                  flex items-center justify-center py-2 px-3 w-full rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95
                  ${isSelected
                                    ? 'bg-[#0000FF] text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                                  }
                `}
                                aria-pressed={isSelected}
                              >
                                <element.icon className="w-3.5 h-3.5 mr-1.5 transition-transform duration-200 group-hover:rotate-3" />
                                <span className="whitespace-nowrap">{element.title}</span>
                              </button>

                              {/* Activity sub-items - Show when hovered OR when no activity is selected in this category */}
                              {hasSubItems && (isHovered || (!selectedActivity && isSelected)) && (
                                <div
                                  className={`
                    overflow-hidden transition-all duration-500 ease-in-out
                    transition-[max-height,opacity] duration-500 ease-in-out
                    ${(isHovered || (!selectedActivity && isSelected)) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
                  `}
                                >
                                  <div className="p-2 ">
                                    <div className="flex flex-wrap gap-1">
                                      {element.subItems.map((activity) => (
                                        <button
                                          key={activity.key}
                                          onClick={() => {
                                            setSelectedActivity(activity.key);
                                            setUserSelectedResourceType(false);
                                            setHoveredCategory(""); // Clear hover state after selecting activity

                                            // If clicking on a hovered category (not selected), also select the category
                                            if (!isSelected) {
                                              setSelectedMethod(element.id);
                                            }
                                          }}
                                          onMouseEnter={() => {
                                            // Keep the hover state when mouse enters activity buttons
                                            setHoveredCategory(element.id);
                                          }}
                                          className={`
                            ${subItemsCount === 1 ? 'w-full' : ''}
                            ${subItemsCount === 2 ? 'w-[calc(50%-0.125rem)]' : ''}
                            ${subItemsCount >= 3 ? 'w-[calc(33.33%-0.2rem)]' : ''}
                            
                            text-center px-1.5 py-1 text-xs font-medium rounded transition-all duration-150 cursor-pointer whitespace-nowrap 
                            hover:scale-[1.03] active:scale-95 transform transition-transform
                            ${selectedActivity === activity.key
                                              ? 'bg-[#0000FF] text-white shadow-xs'
                                              : 'bg-gray-200 text-gray-800 hover:bg-gray-300 hover:text-gray-900'
                                            }
                          `}
                                          aria-pressed={selectedActivity === activity.key}
                                        >
                                          <span className="truncate block">{activity.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {selectedMethod && selectedActivity && learningElements().find(el => el.id === selectedMethod)?.subItems.length === 0 && (
                  <div className={`${breadcrumbCollapsed ? 'mt-0' : 'mt-4'} mb-4`}>
                    <EmptyState
                      icon={File}
                      title="No Activities Available"
                      description={`There are no activities configured for the ${selectedMethod === 'i-do' ? 'I Do' : selectedMethod === 'we-do' ? 'We Do' : 'You Do'} method in this content item.`}
                    />
                  </div>
                )}


                {currentFolder && (
                  <div className="mb-3 bg-white border border-gray-200 rounded-lg shadow-sm p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleFolderBack}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                          <ChevronLeft className="w-3 h-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
                          Back
                        </button>
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <Folder className="w-4 h-4 text-blue-500 transition-transform duration-200 group-hover:rotate-3" />
                          {currentFolder.title}
                        </h3>
                      </div>
                      <div className="text-xs text-gray-500">
                        {getFilteredFolderContents().length} items
                      </div>
                    </div>

                    {folderDocTypes.length > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Filter by Document Type:</h4>
                        <div className="flex flex-wrap gap-2">
                          {folderDocTypes.map((docType) => (
                            <button
                              key={docType}
                              onClick={() => toggleFolderDocTypeSelection(docType)}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 border hover:scale-105 active:scale-95 ${selectedFolderDocTypes.has(docType)
                                ? "bg-[#64B5F6] text-white border-[#42a5f5]"
                                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                                }`}
                            >
                              {selectedFolderDocTypes.has(docType) && (
                                <Check className="w-3 h-3 transition-transform duration-200" />
                              )}
                              {getResourceTypeDisplayName(docType)}
                            </button>
                          ))}
                          {selectedFolderDocTypes.size > 0 && (
                            <button
                              onClick={() => setSelectedFolderDocTypes(new Set())}
                              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition-all duration-200 hover:scale-105"
                            >
                              Clear All
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {selectedMethod && selectedActivity && !currentFolder && (
                  <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                    {(() => {
                      // CHANGED: Removed the specific check for "we-do".
                      // Now it checks for exercises regardless of the method (I Do, We Do, You Do).
                      const exercises = getExercisesForActivity();

                      if (exercises.length > 0) {
                        // Show CodeEditor if exercise is selected
                        if (selectedExercise) {
                          return (
                            <div className="h-full flex flex-col">
                              {/* --- HEADER START --- */}
                              <div className="flex items-center justify-between py-3 bg-white">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedExercise(null);
                                      setShowExercisesList(true);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all duration-200"
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                    Back to Exercises
                                  </button>
                                  <div className="flex items-center gap-1.5">
                                    <Code className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium">
                                      {selectedExercise.exerciseInformation.exerciseName}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${selectedExercise.exerciseInformation.exerciseLevel === "beginner"
                                      ? "bg-green-100 text-green-800"
                                      : selectedExercise.exerciseInformation.exerciseLevel === "medium"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                      }`}
                                  >
                                    {selectedExercise.exerciseInformation.exerciseLevel}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ID: {selectedExercise.exerciseInformation.exerciseId}
                                  </span>
                                </div>
                              </div>
                              {/* --- HEADER END --- */}

                              {/* --- EDITOR CONTENT --- */}
                              <div className="flex-1 overflow-hidden">
                                {selectedExercise?.programmingSettings?.selectedModule === 'Core Programming' && (
                                  <CodeEditor
                                    exercise={selectedExercise}
                                    theme={resolvedTheme as "light" | "dark"}
                                    breadcrumbCollapsed={breadcrumbCollapsed}
                                    onBreadcrumbCollapseToggle={() =>
                                      setBreadcrumbCollapsed(!breadcrumbCollapsed)
                                    }
                                    courseId={courseId}
                                    nodeId={selectedItem?.id || ""}
                                    nodeName={selectedItem?.title || ""}
                                    nodeType={selectedItem?.type || ""}
                                    subcategory={selectedActivity}
                                    category={
                                      selectedMethod === 'i-do'
                                        ? "I_Do"
                                        : selectedMethod === 'we-do'
                                          ? "We_Do"
                                          : "You_Do"
                                    }
                                    onBack={() => {
                                      setSelectedExercise(null);
                                      setShowExercisesList(true);
                                    }}
                                    onCloseExercise={() => {
                                      setSelectedExercise(null);
                                      setShowExercisesList(true);
                                    }}
                                  />
                                )}

                                {selectedExercise?.programmingSettings?.selectedModule === 'Database' && (
                                  <DBQueryEditor
                                    exercise={selectedExercise}
                                    theme={resolvedTheme as "light" | "dark"}
                                    courseId={courseId}
                                    nodeId={selectedItem?.id || ""}
                                    nodeName={selectedItem?.title || ""}
                                    nodeType={selectedItem?.type || ""}
                                    subcategory={selectedActivity}
                                    category={
                                      selectedMethod === 'i-do'
                                        ? "I_Do"
                                        : selectedMethod === 'we-do'
                                          ? "We_Do"
                                          : "You_Do"
                                    }
                                    onBack={() => {
                                      setSelectedExercise(null);
                                      setShowExercisesList(true);
                                    }}
                                    onCloseExercise={() => {
                                      setSelectedExercise(null);
                                      setShowExercisesList(true);
                                    }}
                                  />
                                )}
                              </div>

                            </div>
                          );
                        }

                        // Show exercises list
                        // Show exercises list
                        return (
                          <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
                            <div className="flex-1 overflow-y-auto">
                              <div className="">
                                <Exercises
                                  exercises={exercises}
                                  onExerciseSelect={handleExerciseSelect}
                                  // Pass the formatted method to control Security Settings visibility
                                  method={selectedMethod === 'i-do' ? 'I_Do' : selectedMethod === 'you-do' ? 'You_Do' : 'We_Do'}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // --- FALLBACK TO STANDARD RESOURCES (PDF, Video, etc.) ---

                      // For non-exercise activities, show resources
                      const availableTypes = getAvailableResourceTypes();

                      if (availableTypes.length === 0) {
                        return (
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex items-center justify-center">
                            <div className="text-center p-6">
                              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <File className="w-6 h-6 text-gray-600" />
                              </div>
                              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                                {exercises.length === 0 && selectedMethod === "we-do" ? "No exercises available" : "No resources available"}
                              </h3>
                              <p className="text-xs text-gray-600">
                                This activity doesn't contain any resources.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      // Show resource type tabs and resources
                      return (
                        <div className="flex flex-col h-full">
                          <div className="mb-3">
                            <div className="flex space-x-1 bg-white border border-gray-200 p-1 rounded-lg shadow-sm overflow-x-auto">
                              {["pdf", "ppt", "video", "zip", "link", "reference"].map((type) => {
                                const resourceType = type as ResourceType;
                                if (!availableTypes.includes(resourceType)) return null;

                                const IconComponent = getResourceTypeIcon(resourceType);
                                const resourcesOfType = getResourcesByType(resourceType);
                                const count = resourcesOfType.length;

                                const iconColors = {
                                  pdf: "text-red-500",
                                  ppt: "text-orange-500",
                                  video: "text-purple-500",
                                  zip: "text-yellow-500",
                                  link: "text-green-500",
                                  reference: "text-indigo-500"
                                };

                                const iconColor = iconColors[resourceType];
                                const isSelected = selectedResourceType === resourceType ||
                                  (!userSelectedResourceType && resourceType === availableTypes[0]);

                                return (
                                  <button
                                    key={resourceType}
                                    onClick={() => {
                                      setSelectedResourceType(resourceType);
                                      setUserSelectedResourceType(true);
                                    }}
                                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all duration-200 whitespace-nowrap group hover:scale-105 active:scale-95 ${isSelected
                                      ? "bg-[#0000FF] text-white shadow-md border border-[#0000FF]"
                                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
                                      }`}
                                  >
                                    <IconComponent
                                      className={`w-3 h-3 transition-transform duration-200 group-hover:rotate-3 ${isSelected
                                        ? "text-white"
                                        : iconColor
                                        }`}
                                    />
                                    {getResourceTypeDisplayName(resourceType)}
                                    <span
                                      className={`px-1 py-0.5 rounded text-xs font-semibold transition-all duration-200 ${isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                      {count}
                                    </span>
                                  </button>
                                );
                              })}

                              <button
                                onClick={() => {
                                  setSelectedResourceType("all");
                                  setUserSelectedResourceType(true);
                                }}
                                className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all duration-200 whitespace-nowrap group hover:scale-105 active:scale-95 ${selectedResourceType === "all"
                                  ? "bg-[#0000FF] text-white shadow-md border border-[#0000FF]"
                                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
                                  }`}
                              >
                                <File className={`w-3 h-3 transition-transform duration-200 group-hover:rotate-3 ${selectedResourceType === "all" ? "text-white" : "text-blue-500"}`} />
                                All
                                <span
                                  className={`px-1 py-0.5 rounded text-xs font-semibold transition-all duration-200 ${selectedResourceType === "all"
                                    ? "bg-white/20 text-white"
                                    : "bg-gray-100 text-gray-700"
                                    }`}
                                >
                                  {getAllResources().length}
                                </span>
                              </button>
                            </div>
                          </div>

                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 overflow-hidden">
                            <div className="h-full flex flex-col">
                              {/* Reference type filtering */}
                              {selectedResourceType === "reference" && uniqueDocTypes.length > 0 && (
                                <div className="p-3 border-b border-gray-200 bg-gray-50">
                                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Filter by Document Type:</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {uniqueDocTypes.map((docType) => (
                                      <button
                                        key={docType}
                                        onClick={() => toggleDocTypeSelection(docType)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 border hover:scale-105 active:scale-95 ${selectedDocTypes.has(docType)
                                          ? "bg-[#0000FF] text-white border-[#0000FF]"
                                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                                          }`}
                                      >
                                        {selectedDocTypes.has(docType) && (
                                          <Check className="w-3 h-3 transition-transform duration-200" />
                                        )}
                                        {getResourceTypeDisplayName(docType)}
                                      </button>
                                    ))}
                                    {selectedDocTypes.size > 0 && (
                                      <button
                                        onClick={() => setSelectedDocTypes(new Set())}
                                        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition-all duration-200 hover:scale-105"
                                      >
                                        Clear All
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Resources table */}
                              {!extractingZip && resourcesToDisplay.length > 0 && (
                                <div className="flex-1 overflow-y-auto">
                                  {/* Table Header */}
                                  <div className="flex px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
                                    <button
                                      onClick={() => handleSortClick("name")}
                                      className={`flex items-center gap-1 flex-1 text-left group px-2 py-1 rounded transition-all duration-200 font-semibold hover:bg-gray-50`}
                                    >
                                      <span className="text-xs font-medium">Name</span>
                                      {getSortIndicator("name")}
                                    </button>

                                    <button
                                      onClick={() => handleSortClick("size")}
                                      className={`flex items-center gap-1 w-16 text-left group px-2 py-1 rounded transition-all duration-200 font-semibold hover:bg-gray-50`}
                                    >
                                      <span className="text-xs font-medium">Size</span>
                                      {getSortIndicator("size")}
                                    </button>

                                    <button
                                      onClick={() => handleSortClick("date")}
                                      className={`flex items-center gap-1 w-20 text-left group px-2 py-1 rounded transition-all duration-200 font-semibold hover:bg-gray-50`}
                                    >
                                      <span className="text-xs font-medium">Date</span>
                                      {getSortIndicator("date")}
                                    </button>
                                  </div>

                                  {/* Sorted Resources */}
                                  {sortResources(resourcesToDisplay).map((resource, index) => (
                                    <ResourceItem
                                      key={resource.id}
                                      resource={resource}
                                      index={index}
                                      onClick={handleResourceClick}
                                      onDownload={handleDownloadClick}
                                    />
                                  ))}
                                </div>
                              )}

                              {resourcesToDisplay.length === 0 && (
                                <div className="flex-1 flex items-center justify-center p-6">
                                  <div className="text-center">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <File className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700 mb-1">No matching resources</p>
                                    <p className="text-xs text-gray-600">
                                      Try adjusting your filter settings
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {currentFolder && (
                  <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                    {getFilteredFolderContents().length > 0 ? (
                      <div className="flex-1 bg-white overflow-y-auto min-h-0 border border-gray-200 rounded-lg shadow-sm">
                        {/* Table Header with Sortable Columns */}
                        <div className="flex px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
                          {/* Name Column */}
                          <button
                            onClick={() => handleSortClick("name")}
                            className={`flex items-center gap-1 flex-1 text-left group px-2 py-1 rounded transition-all duration-200 ${sortConfig.field === "name"
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"}`}
                          >
                            <span className="text-xs font-medium">Name</span>
                            {getSortIndicator("name")}
                          </button>

                          {/* Size Column */}
                          <button
                            onClick={() => handleSortClick("size")}
                            className={`flex items-center gap-1 w-16 text-left group px-2 py-1 rounded transition-all duration-200 ${sortConfig.field === "size"
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-gray-700 hover:text-blue-600 hover:bg-blue-50"}`}
                          >
                            <span className="text-xs font-medium">Size</span>
                            {getSortIndicator("size")}
                          </button>

                          {/* Date Column */}
                          <button
                            onClick={() => handleSortClick("date")}
                            className={`flex items-center gap-1 w-20 text-left group px-2 py-1 rounded transition-all duration-200 ${sortConfig.field === "date"
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-gray700 hover:text-blue-600 hover:bg-blue-50"}`}
                          >
                            <span className="text-xs font-medium">Date</span>
                            {getSortIndicator("date")}
                          </button>
                        </div>

                        {/* Sorted Folder Contents */}
                        {sortResources(getFilteredFolderContents()).map((resource, index) => (
                          <ResourceItem
                            key={resource.id}
                            resource={resource}
                            index={index}
                            onClick={handleResourceClick}
                            onDownload={handleDownloadClick}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center py-8 bg-white rounded-lg border border-gray-200 shadow-sm w-full max-w-md">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <File className="w-6 h-6 text-gray-600" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 mb-1">No matching files</p>
                          <p className="text-xs text-gray-600">
                            {selectedFolderDocTypes.size > 0
                              ? "Try adjusting your filter settings"
                              : "This folder is empty"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Show "Select an Activity" when category is selected but no activity is chosen */}
                {selectedMethod && !selectedActivity && !shouldShowCodeEditor && !currentFolder && learningElements().length > 0 && (
                  <div className="mb-4 flex-1 flex items-center justify-center">
                    <div className="text-center bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-md">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <File className="w-6 h-6 text-gray-600" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">
                        Select an Activity
                      </h3>
                      <p className="text-xs text-gray-600">
                        {`Choose an activity in the ${selectedMethod === 'i-do' ? 'I Do' : selectedMethod === 'we-do' ? 'We Do' : 'You Do'} category to view resources`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Show initial selection prompt when nothing is selected */}
                {!selectedMethod && !selectedActivity && !shouldShowCodeEditor && !currentFolder && learningElements().length > 0 && (
                  <div className="mb-4 flex-1 flex items-center justify-center">
                    <div className="text-center bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-md">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Target className="w-6 h-6 text-gray-600" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">
                        Select a Learning Method
                      </h3>
                      <p className="text-xs text-gray-600">
                        Choose a learning method (I Do, We Do, or You Do) to begin
                      </p>
                    </div>
                  </div>
                )}

                {learningElements().length === 0 && selectedItem && !currentFolder && (
                  <div className="mb-4 flex-1 flex items-center justify-center">
                    <div className="text-center bg-white p-6 rounded-lg border border-gray-200 shadow-sm max-w-md">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <File className="w-6 h-6 text-gray-600" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">
                        No Learning Methods Available
                      </h3>
                      <p className="text-xs text-gray-600">
                        This topic doesn't have any learning methods configured yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes Panel */}
          {showNotesPanel && (
            <NotesPanel
              isOpen={showNotesPanel}
              onClose={() => {
                setShowNotesPanel(false);
              }}
              isDraggable={true}
              defaultPosition={{ x: window.innerWidth - 400, y: 100 }}
            />
          )}

          {/* AI Panel */}
          <AIPanel
            isOpen={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            fileUrl={activeViewer.resource?.fileUrl || ""}
            title={activeViewer.resource?.title || selectedItem?.title || ""}
            fileType={
              activeViewer.type === 'video' ? 'video' :
                activeViewer.type === 'ppt' ? 'ppt' :
                  activeViewer.type === 'pdf' ? 'pdf' : 'pdf'
            }
            courseContext={
              !activeViewer.resource && selectedItem ? {
                topicTitle: selectedItem.title,
                isDocumentView: false
              } : undefined
            }
          />
        </div>
      </div>

      {/* Single Resource Viewer */}
      {activeViewer.type === "zip" && activeViewer.resource && (
        <ZipViewer
          fileUrl={getFileUrl(activeViewer.resource.fileUrl || "")}
          fileName={activeViewer.resource.title}
          onClose={closeAllViewers}
          isOpen={true}
        />
      )}
      {activeViewer.type === "video" && activeViewer.resource && (
        <VideoPlayer
          isOpen={true}
          onClose={closeAllViewers}
          videoUrl={getFileUrlString(activeViewer.resource.fileUrl)}
          title={activeViewer.resource.title}
          onNotesClick={() => setShowNotesPanel(true)}
          onNotesStateChange={(isOpen) => setShowNotesPanel(isOpen)}
          showNotesPanel={showNotesPanel}
          hierarchy={currentHierarchy}
          currentItemTitle={selectedItem?.title}
        />
      )}
      {activeViewer.type === "ppt" && activeViewer.resource && (
        <PPTViewer
          isOpen={true}
          onClose={closeAllViewers}
          pptUrl={getFileUrlString(activeViewer.resource.fileUrl)}
          title={activeViewer.resource.title}
          onNotesClick={() => setShowNotesPanel(true)}
          onNotesStateChange={(isOpen) => setShowNotesPanel(isOpen)}
          showNotesPanel={showNotesPanel}
          hierarchy={currentHierarchy}
          currentItemTitle={selectedItem?.title}
        />
      )}
      {activeViewer.type === "pdf" && activeViewer.resource && (
        <PDFViewer
          isOpen={true}
          onClose={closeAllViewers}
          pdfUrl={getFileUrlString(activeViewer.resource.fileUrl)}
          title={activeViewer.resource.title}
          onNotesClick={() => setShowNotesPanel(true)}
          onNotesStateChange={(isOpen) => setShowNotesPanel(isOpen)}
          showNotesPanel={showNotesPanel}
          hierarchy={currentHierarchy}
          currentItemTitle={selectedItem?.title}
        />
      )}

      <AIChat
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        context={{
          topicTitle: selectedItem?.title,
          fileName: activeViewer.resource?.title,
          fileType: activeViewer.type,
          isDocumentView: !!activeViewer.resource
        }}
      />

      <SummaryChat
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        context={{
          topicTitle: selectedItem?.title,
          fileName: activeViewer.resource?.title,
          fileType: activeViewer.type,
          isDocumentView: !!activeViewer.resource,
          hierarchy: currentHierarchy
        }}
      />
    </div>
  );
}