"use client"

import { useState, useRef, useEffect } from "react"
import {
  X,
  Download,
  FileText,
  Sparkles,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Printer,
  Bookmark,
  Share,
  Maximize,
  Minimize,
  Settings,
  Play,
  Pause,
  Square,
  ExternalLink,
  Layers,
  BookOpen,
  Menu,
  Eye,
  Fullscreen,
} from "lucide-react"
import AIPanel from "./ai-panel"
import NotesPanel from "./notes-panel"

interface PPTViewerProps {
  isOpen: boolean
  onClose: () => void
  pptUrl: string
  title?: string
}

export default function PPTViewer({
  isOpen,
  onClose,
  pptUrl,
  title = "Presentation",
}: PPTViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [currentSlide, setCurrentSlide] = useState(1)
  const [totalSlides, setTotalSlides] = useState(1)
  const [notesOpen, setNotesOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fitMode, setFitMode] = useState<"fit-width" | "fit-height" | "auto">("fit-width")
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
const presentationTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)


  // const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pptUrl)}`;
// Replace the viewerUrl line with:
const isDirectPPT = pptUrl.toLowerCase().match(/\.(ppt|pptx|pps|ppsx)$/);
const viewerUrl = isDirectPPT 
  ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pptUrl)}`
  : pptUrl;
  // Panel handlers
  const handleNotesClick = () => {
    setNotesOpen(!notesOpen)
    setAiOpen(false)
  }

  const handleAIClick = () => {
    setAiOpen(!aiOpen)
    setNotesOpen(false)
  }


  // Function to handle menu click
  const handleMenuClick = () => {
    setSidebarOpen(prev => !prev); // toggle sidebar
    setNotesOpen(false);           // close notes
    setAiOpen(false);              // close AI panel
  };

  // Zoom and view controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleZoomTo = (level: number) => {
    setZoom(level)
  }

  const handleFitWidth = () => {
    setFitMode("fit-width")
    setZoom(1)
  }

  const handleFitHeight = () => {
    setFitMode("fit-height")
    setZoom(1)
  }

  const handleAutoFit = () => {
    setFitMode("auto")
    setZoom(1)
  }

  // Slide navigation
  const handlePreviousSlide = () => {
    setCurrentSlide(prev => Math.max(1, prev - 1))
    // In a real implementation, you would control the PPT viewer
  }

  const handleNextSlide = () => {
    setCurrentSlide(prev => Math.min(totalSlides, prev + 1))
    // In a real implementation, you would control the PPT viewer
  }

  const handleSlideInput = (slide: number) => {
    setCurrentSlide(Math.max(1, Math.min(totalSlides, slide)))
  }

  // Presentation mode
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      // Start presentation mode
      startPresentationMode()
    } else {
      // Stop presentation mode
      stopPresentationMode()
    }
  }

  const startPresentationMode = () => {
    // In a real implementation, this would enter full presentation mode
    console.log("Starting presentation mode")
  }

  const stopPresentationMode = () => {
    // In a real implementation, this would exit presentation mode
    console.log("Stopping presentation mode")
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


  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print()
    }
  }


  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pptUrl
    link.download = title || 'presentation.pptx'
    link.click()
  }



  // Reset when PPT changes
  useEffect(() => {
    setZoom(1)
    setCurrentSlide(1)
    setNotesOpen(false)
    setAiOpen(false)
    setIsPlaying(false)
  }, [pptUrl])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      if (presentationTimerRef.current) {
        clearTimeout(presentationTimerRef.current)
      }
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          if (notesOpen || aiOpen || showThumbnails || showOutline) {
            setNotesOpen(false)
            setAiOpen(false)
            setShowThumbnails(false)
            setShowOutline(false)
          } else if (isPlaying) {
            handlePlayPause()
          } else if (isFullscreen) {
            handleFullscreen()
          } else {
            onClose()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlePreviousSlide()
          break
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          handleNextSlide()
          break
        case '+':
        case '=':
          e.preventDefault()
          handleZoomIn()
          break
        case '-':
          e.preventDefault()
          handleZoomOut()
          break
        case '0':
          e.preventDefault()
          handleZoomTo(1)
          break
        case 'f':
        case 'F':
          e.preventDefault()
          handleFullscreen()
          break
        case 'p':
        case 'P':
          e.preventDefault()
          handlePlayPause()
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, notesOpen, aiOpen, showThumbnails, showOutline, isFullscreen, isPlaying])

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gray-900 flex"
    >
      {/* Side Panels */}
      {/* {showThumbnails && (
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-semibold">Slides</h3>
            <button
              onClick={() => setShowThumbnails(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {Array.from({ length: totalSlides }, (_, i) => (
              <div
                key={i + 1}
                className="p-2 mb-2 border border-gray-600 rounded cursor-pointer hover:bg-gray-700"
                onClick={() => handleSlideInput(i + 1)}
              >
                <div className="bg-gray-600 h-24 rounded flex items-center justify-center mb-2">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-white text-xs text-center">Slide {i + 1}</p>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {showOutline && (
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-semibold">Outline</h3>
            <button
              onClick={() => setShowOutline(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 text-white text-sm">
            <div className="p-2 hover:bg-gray-700 rounded cursor-pointer">Introduction</div>
            <div className="p-2 hover:bg-gray-700 rounded cursor-pointer">Agenda</div>
            <div className="p-2 hover:bg-gray-700 rounded cursor-pointer">Key Points</div>
            <div className="p-2 hover:bg-gray-700 rounded cursor-pointer">Conclusion</div>
          </div>
        </div>
      )}

      {/* Main Presentation Area */}
      <div className="flex flex-col h-screen bg-gray-800 relative">
        <div
          id="top-nav"
          className="w-full flex flex-wrap items-center justify-between fixed top-0 left-0 right-0 z-50
     bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200
     transition-all duration-300 hover:shadow-xl px-3 sm:px-5 py-2 sm:py-3"
          style={{ height: '60px' }}
        >
          {/* Left: Close + File Title */}
          <div className="flex items-center gap-2 sm:gap-4 truncate">
            <button
              onClick={onClose}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
        bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium
        shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm truncate max-w-[70px] sm:max-w-[120px]">Close</span>
            </button>

            <div className="flex items-center gap-1 sm:gap-2 text-gray-800 font-semibold truncate max-w-[100px] sm:max-w-xs">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">{title}</span>
            </div>
          </div>

          {/* Right: Notes, AI, Menu */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-3 mt-2 sm:mt-0">

            {/* Notes Button */}
            <button
              onClick={handleNotesClick}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-all duration-300 cursor-pointer whitespace-nowrap
        ${notesOpen
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 shadow-sm'
                }`}
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm truncate">Notes</span>
            </button>

            {/* AI Button */}
            <button
              onClick={handleAIClick}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium transition-all duration-300 cursor-pointer whitespace-nowrap
        ${aiOpen
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700 shadow-sm'
                }`}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm truncate">AI</span>
            </button>

            {/* Menu Button */}
            <button
              onClick={handleMenuClick}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-black shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer whitespace-nowrap"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm truncate">Menu</span>
            </button>
          </div>
        </div>




        {/* Frame section (below nav) */}
        <div
          className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 transition-all duration-500"
          style={{
            marginTop: '60px', // push below navbar
            overflowX: 'hidden', // fixes right border clipping
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transition: 'transform 0.25s ease',
              transformOrigin: 'center center',
            }}
            className="rounded-2xl overflow-hidden shadow-2xl border border-gray-300 hover:shadow-[0_0_40px_rgba(0,0,0,0.15)] transition-all duration-500 w-screen"
          >
            <iframe
              ref={iframeRef}
              src={viewerUrl}
              title={title}
              className="bg-white border-none rounded-2xl"
              style={{
                width: '100vw', // full width of viewport
                height: 'calc(100vh - 60px)', // below navbar
                border: 'none',
                display: 'block',
              }}
              onLoad={() => setTotalSlides(20)}
            />
          </div>
        </div>


      </div>


      {sidebarOpen && (
        <div
          className="fixed top-0 right-0 h-full w-100 bg-white/80 backdrop-blur-lg text-gray-900 shadow-2xl z-50 p-6 border-l border-gray-200 transition-all duration-500 ease-in-out"
        >
          {/* Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 shadow-md hover:bg-gray-100 hover:scale-110 transition-all cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
          {/* Sidebar Header */}
          <div className="mt-3 mb-6 text-center select-none">
            <div className="flex items-center justify-center gap-2">
              <Settings className="w-5 h-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800 tracking-wide">
                Presentation Control
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Adjust view, zoom & file options
            </p>
          </div>

          {/* Zoom Controls */}
          <div className="mt-8 w-full">
            <h3 className="font-semibold tracking-wide mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1 select-none">
              View Control
            </h3>

            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-3 w-full shadow-sm border border-gray-200">
              {/* Zoom Out */}
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 rounded-lg hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-40 cursor-pointer flex-shrink-0"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>

              {/* Preset Zoom Buttons */}
              <div className="flex items-center justify-evenly flex-grow mx-3 min-w-0">
                {[0.75, 1, 1.5].map((z) => (
                  <button
                    key={z}
                    onClick={() => handleZoomTo(z)}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-all duration-300 cursor-pointer flex-shrink-0 whitespace-nowrap ${zoom === z
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md scale-105'
                      : 'bg-white hover:bg-blue-500 hover:text-white border border-gray-200'
                      }`}
                  >
                    {z * 100}%
                  </button>
                ))}
              </div>

              {/* Zoom In */}
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-2 rounded-lg hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-40 cursor-pointer flex-shrink-0"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>

              {/* Current Zoom Label */}
              <span className="text-gray-800 text-sm font-semibold px-3 ml-2 whitespace-nowrap select-none bg-white rounded-md shadow-inner border border-gray-200 flex-shrink-0">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          {/* File Options */}
          <div className="mt-10 w-full">
            <h3 className="font-semibold tracking-wide mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1 select-none">
              File Options
            </h3>

            <div className="flex items-center gap-4 flex-wrap bg-white/60 rounded-2xl p-3 shadow-inner hover:shadow-lg transition-all duration-300">
              <button
                onClick={handlePrint}
                className="p-3 rounded-xl hover:bg-blue-100 active:scale-95 transition-all shadow-sm cursor-pointer"
                title="Print"
              >
                <Printer className="w-5 h-5 text-gray-700 cursor-pointer" />
              </button>

              <button
                onClick={handleDownload}
                className="p-3 rounded-xl hover:bg-blue-100 active:scale-95 transition-all shadow-sm cursor-pointer"
                title="Download"
              >
                <Download className="w-5 h-5 text-gray-700 cursor-pointer" />
              </button>

              <button
                onClick={handleFullscreen}
                className="p-3 rounded-xl hover:bg-blue-100 active:scale-95 transition-all shadow-sm cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-gray-700 cursor-pointer" />
                ) : (
                  <Maximize className="w-5 h-5 text-gray-700 cursor-pointer" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* External Components */}


      <AIPanel
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
      />


      <NotesPanel
        isOpen={notesOpen}
        onClose={() => setNotesOpen(false)}
      />

    </div>
  )
}