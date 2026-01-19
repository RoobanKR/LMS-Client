"use client"

import { useState, useRef, useEffect } from "react"
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  FileText,
  Sparkles,
  RotateCcw,
  RotateCw,
  ListVideo,
  Menu,
  MessageCircle,
} from "lucide-react"
import AIPanel from "./ai-panel"
import NotesPanel from "./notes-panel"
import SummaryChat from "./summary-chat"
import AIChat from "./ai-chat"

interface VideoPlayerProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title?: string
  hasPrev?: boolean
  hasNext?: boolean
  onPrev?: () => void
  onNext?: () => void
  videoList?: Array<{
    id: string
    title: string
    duration: string
    thumbnail?: string
  }>
  onNotesClick?: () => void
  showNotesPanel?: boolean
  onNotesStateChange?: (isOpen: boolean) => void


  // ADD THESE:
  hierarchy?: string[]
  currentItemTitle?: string
}

// Helper function to detect if URL is a streaming service
const isStreamingUrl = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be') ||
    lowerUrl.includes('vimeo.com') ||
    lowerUrl.includes('dailymotion.com') ||
    lowerUrl.includes('twitch.tv') ||
    lowerUrl.includes('wistia.com');
};

// Helper function to get YouTube embed URL
const getYouTubeEmbedUrl = (url: string): string => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[7].length === 11) ? match[7] : null;

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }

  // If not a standard YouTube URL, try to use as is
  return url;
};

// Helper function to get Vimeo embed URL
const getVimeoEmbedUrl = (url: string): string => {
  const regExp = /(?:vimeo\.com\/)(?:channels\/|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|)(\d+)(?:$|\/|\?)/;
  const match = url.match(regExp);
  const videoId = match ? match[1] : null;

  if (videoId) {
    return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
  }

  return url;
};

export default function VideoPlayer({
  isOpen,
  onClose,
  videoUrl,
  title = "Video",
  hasPrev = false,
  hasNext = false,
  onPrev = () => { },
  onNext = () => { },
  videoList = [],
  onNotesClick,
  showNotesPanel = false,
  onNotesStateChange,

  hierarchy = [],
  currentItemTitle = "",
}: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [embedUrl, setEmbedUrl] = useState("")


  // Add these state variables to video-player.tsx
  const [showAISubmenu, setShowAISubmenu] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  // Split screen states like PDF/PPT viewers
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [splitPosition, setSplitPosition] = useState(60)
  const isResizingRef = useRef(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Sync with parent state when showNotesPanel prop changes
  useEffect(() => {
    setNotesOpen(showNotesPanel)
  }, [showNotesPanel])

  // Check if URL is streaming and set up embed URL
  useEffect(() => {
    const streaming = isStreamingUrl(videoUrl);
    setIsStreaming(streaming);

    if (streaming) {
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        setEmbedUrl(getYouTubeEmbedUrl(videoUrl));
      } else if (videoUrl.includes('vimeo.com')) {
        setEmbedUrl(getVimeoEmbedUrl(videoUrl));
      } else {
        setEmbedUrl(videoUrl);
      }
    }
  }, [videoUrl])

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


// Update handleNotesClick to only notify parent:
const handleNotesClick = () => {
  const newNotesOpenState = !notesOpen;
  
  // Clean up other states locally
  setAiOpen(false);
  setSidebarOpen(false);
  setSummaryOpen(false);
  setShowAISubmenu(false);

  // Let parent handle the notes state
  onNotesClick?.();
  onNotesStateChange?.(newNotesOpenState);
}

// Update handleNotesPanelClose:
const handleNotesPanelClose = () => {
  // Only notify parent, don't set local state
  onNotesStateChange?.(false);
};

// Update handleClose to properly clean up:
const handleClose = () => {
  // Clean up all local states
  setSidebarOpen(false);
  setAiOpen(false);
  setSummaryOpen(false);
  setShowAISubmenu(false);
  
  // Notify parent that notes should be closed
  onNotesStateChange?.(false);
  
  // Call the original onClose
  onClose();
};


  const handleAIClick = () => {
    setAiOpen(!aiOpen)
    setNotesOpen(false)
    setSidebarOpen(false)
    onNotesStateChange?.(false)
  }



  // Format time helper
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Video event handlers - only for direct video files
  const handlePlayPause = () => {
    if (isStreaming) return; // Cannot control streaming videos

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSeek = (time: number) => {
    if (isStreaming) return; // Cannot control streaming videos

    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (value: number) => {
    if (isStreaming) return; // Cannot control streaming videos

    if (videoRef.current) {
      videoRef.current.volume = value
      setVolume(value)
      setIsMuted(value === 0)
    }
  }

  const handleToggleMute = () => {
    if (isStreaming) return; // Cannot control streaming videos

    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    if (isStreaming) return; // Cannot control streaming videos

    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  const handleFullscreen = async () => {
    if (!playerRef.current) return

    try {
      if (!isFullscreen) {
        await playerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
      setIsFullscreen(!isFullscreen)
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  const handleTimeUpdate = () => {
    if (isStreaming) return; // Cannot get time updates from streaming

    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (isStreaming) return; // Cannot get metadata from streaming

    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleEnded = () => {
    if (isStreaming) return; // Cannot detect end from streaming

    setIsPlaying(false)
    if (hasNext) {
      onNext()
    }
  }


  // Add these handlers after other handler functions
  const handleAISubmenuClick = (type: 'summary' | 'chat') => {
    if (type === 'summary') {
      setSummaryOpen(true)
      setAiOpen(false)
    } else {
      setAiOpen(true)
      // setSummaryOpen(false)
    }
    setShowAISubmenu(false)
    setNotesOpen(false)
    onNotesStateChange?.(false)
  }

  const handleAIClose = () => {
    setAiOpen(false);
  }

  const handleSummaryClose = () => {
    setSummaryOpen(false);
  }

  // Update menu handler to close all panels
  const handleMenuClick = () => {
    setSidebarOpen(prev => !prev);
    setNotesOpen(false);
    setAiOpen(false);
    setSummaryOpen(false);
    setShowAISubmenu(false);
    onNotesStateChange?.(false);
  };

  // Controls visibility
  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isStreaming) setShowControls(false)
    }, 3000)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case ' ':
        case 'k':
          if (!isStreaming) {
            e.preventDefault()
            handlePlayPause()
          }
          break
        case 'f':
          e.preventDefault()
          handleFullscreen()
          break
        case 'm':
          if (!isStreaming) {
            e.preventDefault()
            handleToggleMute()
          }
          break
        case 'ArrowLeft':
          if (!isStreaming) {
            e.preventDefault()
            handleSeek(Math.max(0, currentTime - 10))
          }
          break
        case 'ArrowRight':
          if (!isStreaming) {
            e.preventDefault()
            handleSeek(Math.min(duration, currentTime + 10))
          }
          break
        case 'Escape':
          e.preventDefault()
          if (sidebarOpen || notesOpen || aiOpen) {
            setSidebarOpen(false)
            setNotesOpen(false)
            setAiOpen(false)
            onNotesStateChange?.(false);
          } else if (isFullscreen) {
            handleFullscreen()
          } else {
            onClose()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, isPlaying, currentTime, duration, sidebarOpen, notesOpen, aiOpen, isFullscreen, isStreaming])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Reset when video changes
  useEffect(() => {
    setSidebarOpen(false)
    setNotesOpen(false)
    setAiOpen(false)
    onNotesStateChange?.(false);
  }, [videoUrl])

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    };
  }, []);

  if (!isOpen) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-gray-900 flex flex-col"
    >
  {/* Top Navigation Bar - Same as PDF/PPT viewers */}
<div
  className="w-full flex items-center justify-between bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-200/80 px-4 py-3"
  style={{ height: '60px', zIndex: 60 }}
>
  {/* Left section with Back button and Title */}
  <div className="flex items-center gap-3 truncate">
    {/* Back/Close Button - Left arrow icon */}
    <button
      onClick={handleClose}
      className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-300 shadow-sm hover:bg-gray-50 hover:text-gray-700 transition-all cursor-pointer flex-shrink-0"
      title="Back"
    >
      {/* Left arrow icon */}
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

    {/* AI Assistant with Submenu - LIKE PDF VIEWER */}
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
    
    {/* Removed the X close button from right side */}
  </div>
</div>

      {/* Main Content Area with Split Screen - Same as PDF/PPT viewers */}
      <div className="flex-1 flex bg-white" style={{ height: 'calc(100vh - 60px)' }}>
        {/* Video Player Area - Adjusts based on notes visibility */}
        <div
          className="flex items-center justify-center bg-black transition-all duration-200 relative"
          style={{
            width: notesOpen ? `${splitPosition}%` : '100%',
            overflow: 'hidden',
          }}
        >
          <div
            ref={playerRef}
            className="w-full h-full relative"
            onClick={showControlsTemporarily}
          >
            {/* Streaming Video (YouTube, Vimeo, etc.) */}
            {isStreaming ? (
              <iframe
                ref={iframeRef}
                src={embedUrl}
                title={title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                frameBorder="0"
              />
            ) : (
              /* Direct Video File */
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isStreaming) handlePlayPause()
                }}
              />
            )}

            {/* Controls Overlay - Only show for direct video files */}
            {showControls && !isStreaming && (
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Center Play/Pause Button */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={handlePlayPause}
                      className="bg-black/50 hover:bg-black/70 text-white rounded-full p-4 transition-all transform hover:scale-110"
                    >
                      <Play className="w-12 h-12 ml-1" />
                    </button>
                  </div>
                )}

                {/* Bottom Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
                  {/* Progress Bar */}
                  <div className="relative group">
                    <div className="h-1 bg-gray-600 rounded-full cursor-pointer">
                      <div
                        className="h-full bg-red-600 rounded-full relative"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
                    />
                  </div>

                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handlePlayPause}
                        className="text-white hover:bg-white/20 p-2 rounded transition-colors"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>

                      <button
                        onClick={onPrev}
                        disabled={!hasPrev}
                        className="text-white hover:bg-white/20 p-2 rounded transition-colors disabled:opacity-30"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                      <button
                        onClick={onNext}
                        disabled={!hasNext}
                        className="text-white hover:bg-white/20 p-2 rounded transition-colors disabled:opacity-30"
                      >
                        <RotateCw className="w-5 h-5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleToggleMute}
                          className="text-white hover:bg-white/20 p-2 rounded transition-colors"
                        >
                          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-20 accent-white"
                        />
                      </div>

                      <div className="text-white text-sm font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <select
                        value={playbackRate}
                        onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                        className="bg-black/80 text-white border border-gray-600 rounded px-2 py-1 text-sm"
                      >
                        <option value={0.25}>0.25x</option>
                        <option value={0.5}>0.5x</option>
                        <option value={0.75}>0.75x</option>
                        <option value={1}>1x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2}>2x</option>
                      </select>

                      <button className="text-white hover:bg-white/20 p-2 rounded transition-colors">
                        <Settings className="w-5 h-5" />
                      </button>

                      <button
                        onClick={handleFullscreen}
                        className="text-white hover:bg-white/20 p-2 rounded transition-colors"
                      >
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

        {/* Notes Panel Area - Only show when notes are open */}
       {notesOpen && (
  <div
    className="bg-white transition-all duration-200 overflow-hidden"
    style={{
      width: `${100 - splitPosition}%`,
    }}
  >
    <NotesPanel
      isOpen={true}
      onClose={handleNotesPanelClose}
      isDraggable={false}
      // Pass initial note data like PDF viewer
      initialNoteData={localStorage.getItem('lastCreatedNote')}
    />
  </div>
)}
      </div>

      {/* Sidebar Menu - Same as PDF/PPT viewers */}
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
                Video Control
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Adjust playback, speed & layout options
            </p>
          </div>

          <div className="mt-8 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">
              Playback Control
            </h3>

            <div className="space-y-4">
              {/* Playback Speed */}
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Playback Speed</label>
                <select
                  value={playbackRate}
                  onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isStreaming}
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>Normal (1x)</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>

              {/* Volume Control */}
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                  disabled={isStreaming}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">
              Layout
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Video/Notes Split</span>
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
              Navigation
            </h3>

            <div className="flex items-center justify-between bg-white/60 rounded-2xl p-3 shadow-inner">
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-30 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm">Previous</span>
              </button>

              <button
                onClick={onNext}
                disabled={!hasNext}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-30 cursor-pointer"
              >
                <span className="text-sm">Next</span>
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">
              Display
            </h3>

            <div className="flex items-center justify-center bg-white/60 rounded-2xl p-3 shadow-inner">
              <button
                onClick={handleFullscreen}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all cursor-pointer"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                <span className="text-sm">{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
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
    fileType: "video",
    isDocumentView: true,
    hierarchy: hierarchy.length > 0 ? hierarchy : [title],
    fileUrl: videoUrl,
    isPDF: false,
  }}
/>

      {/* Summary Chat Panel */}
      <SummaryChat
        isOpen={summaryOpen}
        onClose={handleSummaryClose}
        context={{
          topicTitle: currentItemTitle || title, // ✅ Use currentItemTitle if available
          fileName: title,
          fileType: "video",
          isDocumentView: true,
          hierarchy: hierarchy.length > 0 ? hierarchy : [title], // ✅ Use actual hierarchy
          pdfUrl: videoUrl,
          isPDF: false,
        }}
      />
    </div>
  )
}