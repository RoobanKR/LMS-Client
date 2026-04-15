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
  MessageCircle,
  Loader,
  AlertCircle
} from "lucide-react"
import AIPanel from "./ai-panel"
import NotesPanel from "./notes-panel"
import SummaryChat from "./summary-chat"
import AIChat from "./ai-chat"

interface PPTViewerProps {
  isOpen: boolean
  onClose: () => void
  pptUrl: string
  title?: string
  onNotesClick?: () => void
  showNotesPanel?: boolean
  onNotesStateChange?: (isOpen: boolean) => void
  hierarchy?: string[]
  currentItemTitle?: string
}

export default function PPTViewer({
  isOpen,
  onClose,
  pptUrl,
  title = "Presentation",
  onNotesClick,
  showNotesPanel = false,
  onNotesStateChange,
  hierarchy = [],
  currentItemTitle = "",
}: PPTViewerProps) {
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
  const [showAISubmenu, setShowAISubmenu] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isResizingRef = useRef(false)
  const [shouldLoadSavedNote, setShouldLoadSavedNote] = useState(false);
  
  // Check if URL is a direct PPT/PPTX file
  const isDirectPPT = pptUrl.toLowerCase().match(/\.(ppt|pptx|pps|ppsx)$/);
  
  // Build the embed URL - use Google Docs Viewer as fallback when Office Online fails
  const getViewerUrl = () => {
    if (isDirectPPT) {
      // Try Office Online first
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pptUrl)}`
    }
    return pptUrl
  }
  
  // Fallback to Google Docs Viewer if Office Online fails
  const getGoogleViewerUrl = () => {
    return `https://docs.google.com/gview?url=${encodeURIComponent(pptUrl)}&embedded=true`
  }
  
  const [viewerUrl, setViewerUrl] = useState(getViewerUrl())
  const [useGoogleViewer, setUseGoogleViewer] = useState(false)

  const handleNotesClick = () => {
    const newNotesOpenState = !notesOpen;
    setNotesOpen(newNotesOpenState);
    setAiOpen(false);
    onNotesClick?.();
    onNotesStateChange?.(newNotesOpenState);
  }

  const handleClose = () => {
    setNotesOpen(false);
    setAiOpen(false);
    setSummaryOpen(false);
    setShowAISubmenu(false);
    onNotesStateChange?.(false);
    onClose();
  };

  const handleAIClick = () => {
    setAiOpen(!aiOpen)
    setNotesOpen(false)
    onNotesStateChange?.(false)
  }

  const handleNotesPanelClose = () => {
    setNotesOpen(false);
    onNotesStateChange?.(false);
  };

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

  const handleSplitPreset = (position: number) => {
    setSplitPosition(position);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25))
  }

  const handleZoomTo = (level: number) => {
    setZoom(level)
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

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

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pptUrl
    link.download = title || 'presentation.pptx'
    link.click()
  }

  const handlePrint = () => {
    window.print();
  }

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  const handleAISubmenuClick = (type: 'summary' | 'chat') => {
    if (type === 'summary') {
      setSummaryOpen(true)
      setAiOpen(false)
    } else {
      setAiOpen(true)
      setSummaryOpen(false)
    }
    setShowAISubmenu(false)
    onNotesStateChange?.(false)
  }

  const handleAIClose = () => {
    setAiOpen(false);
  }

  const handleSummaryClose = () => {
    setSummaryOpen(false);
  }

  const handleMenuClick = () => {
    setSidebarOpen(prev => !prev);
    setNotesOpen(false);
    setAiOpen(false);
    setSummaryOpen(false);
    setShowAISubmenu(false);
    onNotesStateChange?.(false);
  };

  const switchToGoogleViewer = () => {
    setUseGoogleViewer(true)
    setViewerUrl(getGoogleViewerUrl())
    setIsLoading(true)
    setLoadError(null)
  }

  // Handle iframe load events
  const handleIframeLoad = () => {
    setIsLoading(false)
    setLoadError(null)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    if (!useGoogleViewer && isDirectPPT) {
      setLoadError("Office Online viewer failed to load. Switch to Google Docs Viewer?")
    } else {
      setLoadError("Unable to load presentation. Please try downloading the file.")
    }
  }

  useEffect(() => {
    const handleForceOpenNotes = () => {
      console.log('Force opening notes panel');
      setNotesOpen(true);
      setAiOpen(false);
      setSummaryOpen(false);
      setShowAISubmenu(false);
      setSidebarOpen(false);
      onNotesStateChange?.(true);
      
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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // Reset viewer when pptUrl changes
  useEffect(() => {
    setViewerUrl(getViewerUrl())
    setUseGoogleViewer(false)
    setIsLoading(true)
    setLoadError(null)
    setCurrentPage(1)
  }, [pptUrl])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gray-900 flex flex-col"
    >
      {/* Top Navigation Bar */}
      <div
        className="w-full flex items-center justify-between bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-200/80 px-4 py-3"
        style={{ height: '60px', zIndex: 60 }}
      >
        <div className="flex items-center gap-3 truncate">
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-300 shadow-sm hover:bg-gray-50 hover:text-gray-700 transition-all cursor-pointer flex-shrink-0"
            title="Back"
          >
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

          <div className="flex items-center gap-2 text-gray-800 font-semibold truncate">
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm truncate">{title}</span>
            {isDirectPPT && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {useGoogleViewer ? "Google Viewer" : "Office Viewer"}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
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
              <span className="text-sm font-medium">AI</span>
              <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm border-2 border-white">
                New
              </span>
            </button>

            {showAISubmenu && (
              <div
                className="absolute top-full left-1/2 transform -translate-x-1/2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                onMouseEnter={() => setShowAISubmenu(true)}
                onMouseLeave={() => setShowAISubmenu(false)}
              >
                <button
                  onClick={() => handleAISubmenuClick('summary')}
                  className="w-full justify-start h-9 px-3 rounded-none transition-all duration-200 hover:bg-purple-50 text-gray-700 hover:text-purple-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Summary</span>
                </button>
                <button
                  onClick={() => handleAISubmenuClick('chat')}
                  className="w-full justify-start h-9 px-3 rounded-none transition-all duration-200 hover:bg-purple-50 text-gray-700 hover:text-purple-700 flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Chat</span>
                </button>
              </div>
            )}
          </div>

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
        <div
          className="flex items-center justify-center bg-gray-100 transition-all duration-200 relative"
          style={{
            width: notesOpen ? `${splitPosition}%` : '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10">
              <Loader className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-gray-600">Loading presentation...</p>
            </div>
          )}

          {/* Error Message with Fallback Option */}
          {loadError && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10 p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-gray-700 mb-2">{loadError}</p>
              {!useGoogleViewer && isDirectPPT && (
                <button
                  onClick={switchToGoogleViewer}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Switch to Google Docs Viewer
                </button>
              )}
              <button
                onClick={handleDownload}
                className="mt-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Download File Instead
              </button>
            </div>
          )}

          <div
            style={{
              transform: `rotate(${rotation}deg) scale(${zoom})`,
              transition: 'transform 0.25s ease',
              transformOrigin: 'center center',
              width: '100%',
              height: '100%',
              opacity: isLoading || loadError ? 0 : 1,
            }}
          >
            <iframe
              ref={iframeRef}
              src={viewerUrl}
              title={title}
              className="w-full h-full border-none"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              allow="fullscreen"
            />
          </div>
        </div>

        {/* Resize Handle */}
        {notesOpen && (
          <div
            className="w-2 bg-gray-300 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize transition-colors duration-200 flex items-center justify-center relative"
            onMouseDown={handleResizeStart}
            style={{ zIndex: 40 }}
          >
            <div className="flex flex-col gap-1">
              <div className="w-1 h-3 bg-gray-500 rounded" />
              <div className="w-1 h-3 bg-gray-500 rounded" />
              <div className="w-1 h-3 bg-gray-500 rounded" />
            </div>
          </div>
        )}

        {/* Notes Panel */}
        {notesOpen && (
          <div
            className="bg-white transition-all duration-200 overflow-hidden"
            style={{ width: `${100 - splitPosition}%` }}
          >
            <NotesPanel
              isOpen={true}
              onClose={handleNotesPanelClose}
              isDraggable={false}
              initialNoteData={shouldLoadSavedNote ? localStorage.getItem('lastCreatedNote') : null}
            />
          </div>
        )}
      </div>

      {/* Sidebar Menu */}
      {sidebarOpen && (
        <div
          className="fixed top-0 right-0 h-full w-80 bg-white/95 backdrop-blur-lg shadow-2xl z-50 p-6 border-l border-gray-200 overflow-y-auto"
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
              <h2 className="text-base font-semibold text-gray-800">Presentation Control</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">Adjust view, zoom & layout options</p>
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
                <span className="text-sm text-gray-700">PPT/Notes Split</span>
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

          <div className="mt-6 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">
              Viewer Options
            </h3>
            
            {isDirectPPT && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Current Viewer:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setUseGoogleViewer(false)
                      setViewerUrl(getViewerUrl())
                      setIsLoading(true)
                      setLoadError(null)
                    }}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg transition-all ${!useGoogleViewer ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Office Online
                  </button>
                  <button
                    onClick={() => {
                      setUseGoogleViewer(true)
                      setViewerUrl(getGoogleViewerUrl())
                      setIsLoading(true)
                      setLoadError(null)
                    }}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg transition-all ${useGoogleViewer ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Google Docs
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 w-full">
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

      <AIChat
        isOpen={aiOpen}
        onClose={handleAIClose}
        context={{
          topicTitle: currentItemTitle || title,
          fileName: title,
          fileType: "ppt",
          isDocumentView: true,
          hierarchy: hierarchy.length > 0 ? hierarchy : [title],
          fileUrl: pptUrl,
          isPDF: false,
        }}
      />

      <SummaryChat
        isOpen={summaryOpen}
        onClose={handleSummaryClose}
        context={{
          topicTitle: currentItemTitle || title,
          fileName: title,
          fileType: "ppt",
          isDocumentView: true,
          hierarchy: hierarchy.length > 0 ? hierarchy : [title],
          pdfUrl: pptUrl,
          isPDF: false,
        }}
      />
    </div>
  )
}