"use client"

import { useState, useRef, useEffect } from "react"
import {
  X,
  Download,
  FileText,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Printer,
  Bookmark,
  Share,
  Maximize,
  Minimize,
  Settings,
  Menu,
  Eye,
  MessageCircle
} from "lucide-react"
import AIPanel from "./ai-panel"
import NotesPanel from "./notes-panel"
import SummaryChat from "./summary-chat"
import AIChat from "./ai-chat" // Replace with your actual AI chat component

interface PDFViewerProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  title?: string
  onNotesClick?: () => void
  showNotesPanel?: boolean
  onNotesStateChange?: (isOpen: boolean) => void // Add this for state sync

  hierarchy?: string[]
  currentItemTitle?: string
}

export default function PDFViewer({
  isOpen,
  onClose,
  pdfUrl,
  title = "PDF Document",
  onNotesClick,
  showNotesPanel = false,
  onNotesStateChange, // Add this prop
    hierarchy = [],
  currentItemTitle = "",
}: PDFViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [aiOpen, setAiOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fitMode, setFitMode] = useState<"fit-width" | "fit-height" | "auto">("fit-width")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [splitPosition, setSplitPosition] = useState(60)
  const [notesOpen, setNotesOpen] = useState(false)
  // Add these state variables
  const [showAISubmenu, setShowAISubmenu] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isResizingRef = useRef(false)
// Add state to track saved note
const [savedNoteData, setSavedNoteData] = useState<any>(null);
const [shouldLoadSavedNote, setShouldLoadSavedNote] = useState(false);
  // Sync with parent state when showNotesPanel prop changes
const handleNotesClick = () => {
  const newNotesOpenState = !notesOpen;
  setNotesOpen(newNotesOpenState);
  setAiOpen(false);
  setSummaryOpen(false);
  setShowAISubmenu(false);

  // Always notify parent of state change
  onNotesClick?.();
  onNotesStateChange?.(newNotesOpenState);
  
  // Check for saved summary note when opening notes
  if (newNotesOpenState) {
    const savedNote = localStorage.getItem('lastCreatedNote');
    if (savedNote) {
      setShouldLoadSavedNote(true);
      setTimeout(() => {
        setShouldLoadSavedNote(false);
      }, 500);
    }
  }
}

// Update handleClose to properly clean up:
const handleClose = () => {
  // Clean up all states
  setNotesOpen(false);
  setAiOpen(false);
  setSummaryOpen(false);
  setShowAISubmenu(false);
  
  // Notify parent that notes are closed
  onNotesStateChange?.(false);
  
  // Call the original onClose
  onClose();
};
  const handleAIClick = () => {
    setAiOpen(!aiOpen)
    setNotesOpen(false)
    onNotesStateChange?.(false)
  }


  // Add these handlers
  const handleAISubmenuClick = (type: 'summary' | 'chat') => {
    if (type === 'summary') {
      setSummaryOpen(true)
      setAiOpen(false)
    } else {
      setAiOpen(true)
      setSummaryOpen(false)
    }
    setShowAISubmenu(false)
    // setNotesOpen(false)
    // onNotesStateChange?.(false)
  }

  // Update the menu handler
  const handleMenuClick = () => {
    setSidebarOpen(prev => !prev);
    setNotesOpen(false);
    setAiOpen(false);
    setSummaryOpen(false);
    setShowAISubmenu(false);
    onNotesStateChange?.(false);
  };
  // Add close handlers for AI and Summary panels
  const handleAIClose = () => {
    setAiOpen(false);
  }

  const handleSummaryClose = () => {
    setSummaryOpen(false);
  }
  // Handle NotesPanel close with state sync
  const handleNotesPanelClose = () => {
    setNotesOpen(false);
    onNotesStateChange?.(false);
  };

  // Resize handlers for split screen
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isResizingRef.current = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizingRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Apply constraints
    const clampedPosition = Math.max(30, Math.min(70, newPosition));
    setSplitPosition(clampedPosition);
  };

  const handleResizeEnd = () => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // Quick split position presets
  const handleSplitPreset = (position: number) => {
    setSplitPosition(position);
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25))
  }

  const handleZoomTo = (level: number) => {
    setZoom(level)
  }

  // Rotation controls
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  // Fullscreen
  const handleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
      setIsFullscreen(!isFullscreen)
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  // Download
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = title || 'document.pdf'
    link.click()
  }

  // Print
  const handlePrint = () => {
    window.print();
  }

  // Page navigation
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }
// Add this useEffect near your other useEffects in PDFViewer
useEffect(() => {
  const handleForceOpenNotes = () => {
    console.log('Force opening notes panel in PDF viewer');
    
    // Open notes panel
    setNotesOpen(true);
    setAiOpen(false);
    setSummaryOpen(false);
    setShowAISubmenu(false);
    
    // Notify parent
    onNotesStateChange?.(true);
    
    // Check for saved note
    const savedNote = localStorage.getItem('lastCreatedNote');
    if (savedNote) {
      setShouldLoadSavedNote(true);
      setTimeout(() => {
        setShouldLoadSavedNote(false);
      }, 500);
    }
  };

  window.addEventListener('force-open-notes-in-viewer', handleForceOpenNotes);

  return () => {
    window.removeEventListener('force-open-notes-in-viewer', handleForceOpenNotes);
  };
}, [onNotesStateChange]);
  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gray-900 flex flex-col"
    >
      {/* Top Navigation Bar */}
      {/* Top Navigation Bar */}
    <div
  className="w-full flex items-center justify-between bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-200/80 px-4 py-3"
  style={{ height: '60px', zIndex: 60 }}
>
  {/* Left section with Back/Close button and Title */}
  <div className="flex items-center gap-3 truncate">
    {/* Back/Close Button - Moved to left corner with left arrow icon */}
    <button
      onClick={handleClose}
      className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-300 shadow-sm hover:bg-gray-50 hover:text-gray-700 transition-all cursor-pointer flex-shrink-0"
      title="Back"
    >
      {/* Left arrow icon - you can use ChevronLeft, ArrowLeft, or similar */}
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 19l-7-7 7-7" 
        />
      </svg>
    </button>

    {/* Title with document icon */}
    <div className="flex items-center gap-2 text-gray-800 font-semibold truncate">
      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <span className="text-sm truncate">{title}</span>
    </div>
  </div>

  {/* Right section with action buttons */}
  <div className="flex items-center gap-2">
    {/* Notes Button */}
    <button
      onClick={handleNotesClick}
      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-all duration-300 cursor-pointer whitespace-nowrap border
        ${notesOpen
          ? 'bg-blue-500 text-white shadow-md border-blue-600'
          : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-gray-300 shadow-sm'
        }`}
    >
      <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
      <span className="text-xs sm:text-sm truncate">Notes</span>
    </button>

    {/* AI Assistant with Submenu */}
    <div
      className="relative"
      onMouseEnter={() => setShowAISubmenu(true)}
      onMouseLeave={() => setShowAISubmenu(false)}
    >
      <button
        className={`h-10 px-3 rounded-lg transition-all duration-200 flex items-center gap-2 relative border
          ${(aiOpen || summaryOpen)
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md border-purple-600'
            : 'bg-white text-gray-700 hover:bg-purple-50 hover:text-purple-700 border-gray-300 shadow-sm hover:border-purple-300'
          }`}
        title="AI Assistant"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">
          AI
        </span>
        <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm border-2 border-white">
          New
        </span>
      </button>

      {/* AI Submenu - Centered below AI button */}
      {showAISubmenu && (
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          onMouseEnter={() => setShowAISubmenu(true)}
          onMouseLeave={() => setShowAISubmenu(false)}
        >
          <button
            onClick={() => handleAISubmenuClick('summary')}
            className="w-full justify-start h-9 px-3 rounded-none transition-all duration-200 hover:bg-purple-50 text-gray-700 hover:text-purple-700 flex items-center gap-2"
            title="AI Summary"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Summary</span>
          </button>
          <button
            onClick={() => handleAISubmenuClick('chat')}
            className="w-full justify-start h-9 px-3 rounded-none transition-all duration-200 hover:bg-purple-50 text-gray-700 hover:text-purple-700 flex items-center gap-2"
            title="AI Chat"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Chat</span>
          </button>
        </div>
      )}
    </div>

    {/* Menu Button */}
    <button
      onClick={handleMenuClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-gray-50 transition-all cursor-pointer border border-gray-300 shadow-sm"
    >
      <Menu className="w-4 h-4" />
      <span className="text-sm">Menu</span>
    </button>
  </div>
</div>

      {/* Main Content Area with Split Screen */}
      <div className="flex-1 flex bg-white" style={{ height: 'calc(100vh - 60px)' }}>
        {/* PDF Viewer Area - Adjusts based on notes visibility */}
        <div
          className="flex items-center justify-center bg-gray-100 transition-all duration-200"
          style={{
            width: notesOpen ? `${splitPosition}%` : '100%',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              transform: `rotate(${rotation}deg) scale(${zoom})`,
              transition: 'transform 0.25s ease',
              transformOrigin: 'center center',
            }}
            className="w-full h-full"
          >
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title={title}
              className="w-full h-full border-none"
              onLoad={() => setTotalPages(50)}
              onError={(e) => {
                console.error("PDF loading error:", e);
                window.open(pdfUrl, '_blank');
              }}
            />
          </div>
        </div>

        {/* Resize Handle - Only show when notes are open */}
        {notesOpen && (
          <div
            className="w-2 bg-gray-300 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize transition-colors duration-200 flex items-center justify-center relative"
            onMouseDown={handleResizeStart}
            style={{
              zIndex: 40
            }}
          >
            <div className="flex flex-col gap-1">
              <div className="w-1 h-3 bg-gray-500 rounded" />
              <div className="w-1 h-3 bg-gray-500 rounded" />
              <div className="w-1 h-3 bg-gray-500 rounded" />
            </div>
          </div>
        )}
 {notesOpen && (
  <div
    className="bg-white transition-all duration-200 overflow-hidden"
    style={{
      width: `${100 - splitPosition}%`,
    }}
  >
    <NotesPanel
      isOpen={true}
      onClose={() => {
        setNotesOpen(false);
        onNotesStateChange?.(false);
      }}
      isDraggable={false}
      // Pass initial note data for all viewers
      initialNoteData={shouldLoadSavedNote ? localStorage.getItem('lastCreatedNote') : null}
    />
  </div>
)}
      </div>

      {/* Sidebar Menu */}
      {sidebarOpen && (
        <div
          className="fixed top-0 right-0 h-full w-80 bg-white/95 backdrop-blur-lg shadow-2xl z-50 p-6 border-l border-gray-200"
          style={{ marginTop: '60px', height: 'calc(100vh - 60px)' }}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 shadow-md hover:bg-gray-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>

          <div className="mt-3 mb-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <Settings className="w-5 h-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800">
                PDF Control
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Adjust view, zoom & layout options
            </p>
          </div>

          <div className="mt-8 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">
              View Control
            </h3>

            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-3 w-full shadow-sm border border-gray-200">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.25}
                className="p-2 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-40 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>

              <div className="flex items-center gap-2">
                {[0.5, 1, 1.5, 2].map((z) => (
                  <button
                    key={z}
                    onClick={() => handleZoomTo(z)}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-all cursor-pointer ${zoom === z
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white hover:bg-blue-500 hover:text-white border border-gray-200'
                      }`}
                  >
                    {z * 100}%
                  </button>
                ))}
              </div>

              <button
                onClick={handleZoomIn}
                disabled={zoom >= 5}
                className="p-2 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-40 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Rotation Control */}
            <div className="mt-4 flex items-center justify-center">
              <button
                onClick={handleRotate}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
                title="Rotate"
              >
                <RotateCcw className="w-4 h-4 text-gray-700" />
                <span className="text-sm text-gray-700">Rotate</span>
              </button>
            </div>
          </div>

          <div className="mt-6 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">
              Layout
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">PDF/Notes Split</span>
                <span className="text-sm font-semibold text-blue-600">
                  {Math.round(splitPosition)}/{Math.round(100 - splitPosition)}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-white/60 rounded-xl p-2">
                <button
                  onClick={() => handleSplitPreset(70)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all cursor-pointer ${splitPosition === 70
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  70/30
                </button>
                <button
                  onClick={() => handleSplitPreset(60)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all cursor-pointer ${splitPosition === 60
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  60/40
                </button>
                <button
                  onClick={() => handleSplitPreset(50)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all cursor-pointer ${splitPosition === 50
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  50/50
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">
              File Options
            </h3>

            <div className="flex items-center gap-4 bg-white/60 rounded-2xl p-3 shadow-inner">
              <button
                onClick={handleDownload}
                className="p-3 rounded-xl hover:bg-blue-100 transition-all cursor-pointer"
                title="Download"
              >
                <Download className="w-5 h-5 text-gray-700" />
              </button>

              <button
                onClick={handlePrint}
                className="p-3 rounded-xl hover:bg-blue-100 transition-all cursor-pointer"
                title="Print"
              >
                <Printer className="w-5 h-5 text-gray-700" />
              </button>

              <button
                onClick={handleFullscreen}
                className="p-3 rounded-xl hover:bg-blue-100 transition-all cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-gray-700" />
                ) : (
                  <Maximize className="w-5 h-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Panel - Replace with your actual AI chat component */}
<AIChat
  isOpen={aiOpen}
  onClose={handleAIClose}
  fileUrl={pdfUrl}
  fileType="pdf"
  title={title}
  context={{
    topicTitle: currentItemTitle || title,
    fileName: title,
    fileType: "pdf",
    isDocumentView: true,
    hierarchy: hierarchy.length > 0 ? hierarchy : [title],
    pdfUrl: pdfUrl,
    isPDF: true,
  }}
/>

      <SummaryChat
        isOpen={summaryOpen}
        onClose={handleSummaryClose}
        context={{
          topicTitle: currentItemTitle || title,
          fileName: title,
          fileType: "pdf",
          isDocumentView: true,
          hierarchy: hierarchy.length > 0 ? hierarchy : [title], // Use provided hierarchy or fallback
          pdfUrl: pdfUrl, // Pass PDF URL for content analysis
          isPDF: true,
        }}
      />
    </div>


  )
}