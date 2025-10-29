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
  Clock,
  ListVideo,
  FileText,
  Sparkles,
  RotateCcw,
  RotateCw,
} from "lucide-react"
import AIPanel from "./ai-panel"
import NotesPanel from "./notes-panel"

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
  onPrev = () => {},
  onNext = () => {},
  videoList = [],
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
  
  // Separate panel states
  const [videoListOpen, setVideoListOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
const controlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

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

  // Simple panel handlers
  const handleVideoListClick = () => {
    setVideoListOpen(!videoListOpen)
  }

  const handleNotesClick = () => {
    setNotesOpen(!notesOpen)
  }

  const handleAIClick = () => {
    setAiOpen(!aiOpen)
  }

  const handleCloseVideoList = () => {
    setVideoListOpen(false)
  }

  const handleClosePlayer = () => {
    onClose()
  }

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
          if (videoListOpen || notesOpen || aiOpen) {
            setVideoListOpen(false)
            setNotesOpen(false)
            setAiOpen(false)
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
  }, [isOpen, isPlaying, currentTime, duration, videoListOpen, notesOpen, aiOpen, isFullscreen, isStreaming])

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
    setVideoListOpen(false)
    setNotesOpen(false)
    setAiOpen(false)
  }, [videoUrl])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Main Video Area - Full screen always */}
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
            {/* Top Bar - Always show */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
              <button
                onClick={handleClosePlayer}
                className="flex items-center gap-2 text-white hover:bg-white/20 p-2 rounded transition-colors"
              >
                <X className="w-5 h-5" />
                <span className="text-sm">Close</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNotesClick}
                  className={`flex items-center gap-2 p-2 rounded transition-colors ${
                    notesOpen ? 'bg-blue-600 text-white' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Notes</span>
                </button>

                <button
                  onClick={handleAIClick}
                  className={`flex items-center gap-2 p-2 rounded transition-colors ${
                    aiOpen ? 'bg-purple-600 text-white' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">AI</span>
                </button>

                <button
                  onClick={handleVideoListClick}
                  className={`flex items-center gap-2 p-2 rounded transition-colors ${
                    videoListOpen ? 'bg-green-600 text-white' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <ListVideo className="w-4 h-4" />
                  <span className="text-sm">Videos ({videoList.length})</span>
                </button>
              </div>
            </div>

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

        {/* Top Bar for Streaming Videos */}
        {isStreaming && showControls && (
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
            <button
              onClick={handleClosePlayer}
              className="flex items-center gap-2 text-white hover:bg-white/20 p-2 rounded transition-colors"
            >
              <X className="w-5 h-5" />
              <span className="text-sm">Close</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleNotesClick}
                className={`flex items-center gap-2 p-2 rounded transition-colors ${
                  notesOpen ? 'bg-blue-600 text-white' : 'text-white hover:bg-white/20'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">Notes</span>
              </button>

              <button
                onClick={handleAIClick}
                className={`flex items-center gap-2 p-2 rounded transition-colors ${
                  aiOpen ? 'bg-purple-600 text-white' : 'text-white hover:bg-white/20'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">AI</span>
              </button>

              <button
                onClick={handleVideoListClick}
                className={`flex items-center gap-2 p-2 rounded transition-colors ${
                  videoListOpen ? 'bg-green-600 text-white' : 'text-white hover:bg-white/20'
                }`}
              >
                <ListVideo className="w-4 h-4" />
                <span className="text-sm">Videos ({videoList.length})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Video List Panel - Overlay on top of video */}
      {videoListOpen && (
        <div className="absolute top-20 right-4 w-80 h-[calc(100vh-160px)] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg z-50 flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-semibold">Video Playlist</h3>
            <button
              onClick={handleCloseVideoList}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {videoList.map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors mb-2"
              >
                <div className="w-16 h-12 bg-gray-700 rounded flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{video.title}</p>
                  <p className="text-gray-400 text-xs">{video.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Components - They will overlay on top of video */}
      <NotesPanel 
        isOpen={notesOpen} 
        onClose={() => setNotesOpen(false)}
      />
      
      <AIPanel 
        isOpen={aiOpen} 
        onClose={() => setAiOpen(false)}
      />
    </div>
  )
}