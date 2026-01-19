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
  Download,
  Wifi,
  WifiOff,
  Monitor,
} from "lucide-react"

interface VideoItem {
  id: string
  title: string
  duration?: string
  thumbnail?: string
  fileUrl: string | { [resolution: string]: string }
  availableResolutions?: string[]
  isVideo?: boolean
  fileName: string
}

interface VideoViewerProps {
  fileUrl: string | { 
    [resolution: string]: string 
  }
  fileName: string
  onClose: () => void
  availableResolutions?: string[]
  isVideo?: boolean
  // New props for video playlist
  allVideos?: VideoItem[]
  currentVideoIndex?: number
  onVideoChange?: (index: number) => void
}

interface VideoQuality {
  label: string
  value: string
  url: string
  bitrate?: number
}

export default function VideoViewer({ 
  fileUrl, 
  fileName, 
  onClose, 
  availableResolutions = [],
  isVideo = true,
  // New props with defaults
  allVideos = [],
  currentVideoIndex = 0,
  onVideoChange = () => {}
}: VideoViewerProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [currentResolution, setCurrentResolution] = useState<string>("")
  const [availableQualities, setAvailableQualities] = useState<VideoQuality[]>([])
  const [isSwitchingQuality, setIsSwitchingQuality] = useState(false)
  const [networkSpeed, setNetworkSpeed] = useState<number>(0)
  const [autoQuality, setAutoQuality] = useState(true)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [videoError, setVideoError] = useState<string>("")
  const [videoListOpen, setVideoListOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  // Playlist state
  const [currentVideoIndexState, setCurrentVideoIndexState] = useState(currentVideoIndex)
  const [videoPlaylist, setVideoPlaylist] = useState<VideoItem[]>(allVideos)

  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const networkTestRef = useRef<NodeJS.Timeout | null>(null)
  const playPromiseRef = useRef<Promise<void> | null>(null)

  // Get current video from playlist
  const getCurrentVideo = (): VideoItem => {
    if (videoPlaylist.length > 0 && currentVideoIndexState < videoPlaylist.length) {
      return videoPlaylist[currentVideoIndexState]
    }
    
    // Fallback to original props if no playlist
    return {
      id: 'default',
      title: fileName,
      fileUrl: fileUrl,
      availableResolutions: availableResolutions,
      isVideo: isVideo,
      fileName: fileName
    }
  }

  const currentVideo = getCurrentVideo()

  // Update when external props change
  useEffect(() => {
    setVideoPlaylist(allVideos)
    setCurrentVideoIndexState(currentVideoIndex)
  }, [allVideos, currentVideoIndex])

  // Filter out "base" resolution and normalize video URLs
  const filterOutBaseResolution = (resolutions: string[]): string[] => {
    return resolutions.filter(res => res !== 'base' && res !== 'source')
  }

  // Get the highest available resolution (excluding base)
  const getHighestResolution = (resolutions: string[]): string => {
    const filtered = filterOutBaseResolution(resolutions)
    if (filtered.length === 0) return ''

    // Sort by resolution quality (highest first)
    const resolutionOrder = ['4k', '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p']
    
    return filtered.sort((a, b) => {
      const aIndex = resolutionOrder.indexOf(a.toLowerCase())
      const bIndex = resolutionOrder.indexOf(b.toLowerCase())
      return aIndex - bIndex // Lower index means higher quality
    })[0] // Return the highest quality
  }

  // Normalize video URLs and extract available qualities for current video (excluding base)
  useEffect(() => {
    const extractQualities = () => {
      const qualities: VideoQuality[] = []
      
      console.log('VideoViewer - Processing fileUrl:', currentVideo.fileUrl)
      console.log('VideoViewer - Available resolutions:', currentVideo.availableResolutions)
      
      const fileUrl = currentVideo.fileUrl
      
      // Case 1: fileUrl is an object with multiple resolutions
      if (typeof fileUrl === 'object' && fileUrl !== null && !Array.isArray(fileUrl)) {
        Object.entries(fileUrl).forEach(([resolution, url]) => {
          // FILTER OUT "base" resolution - only show actual quality options
          if (resolution !== 'base' && typeof url === 'string' && url.startsWith('http')) {
            qualities.push({
              label: resolution.toUpperCase(),
              value: resolution,
              url: url
            })
          }
        })
      }
      
      // Case 2: Use availableResolutions prop if provided (filter out base)
      if (currentVideo.availableResolutions && currentVideo.availableResolutions.length > 0 && qualities.length === 0) {
        const filteredResolutions = filterOutBaseResolution(currentVideo.availableResolutions)
        filteredResolutions.forEach(resolution => {
          qualities.push({
            label: resolution.toUpperCase(),
            value: resolution,
            url: typeof fileUrl === 'string' ? fileUrl : '' // Fallback to main URL
          })
        })
      }
      
      // Case 3: Single URL - create a default quality (only if no other qualities found)
      if (qualities.length === 0 && typeof fileUrl === 'string' && fileUrl.startsWith('http')) {
        // Try to detect resolution from filename or create default
        const detectedResolution = detectResolutionFromFileName(currentVideo.fileName) || 'SD'
        qualities.push({
          label: detectedResolution,
          value: 'source',
          url: fileUrl
        })
      }
      
      // Sort qualities by resolution (highest first)
      if (qualities.length > 1) {
        qualities.sort((a, b) => {
          const order = ['4K', '2160P', '1440P', '1080P', '720P', '480P', '360P', '240P', '144P', 'SD', 'SOURCE']
          const aIndex = order.indexOf(a.label.toUpperCase())
          const bIndex = order.indexOf(b.label.toUpperCase())
          return aIndex - bIndex
        })
      }
      
      console.log('VideoViewer - Final qualities (base filtered out):', qualities)
      setAvailableQualities(qualities)
      
      // Set initial resolution - use highest available quality
      if (qualities.length > 0 && !currentResolution) {
        const highestQuality = qualities[0] // Already sorted highest first
        setCurrentResolution(highestQuality.value)
        console.log('VideoViewer - Setting initial resolution to:', highestQuality.value)
      }
    }

    extractQualities()
  }, [currentVideo.fileUrl, currentVideo.availableResolutions, currentVideo.fileName])

  // Helper function to detect resolution from filename
  const detectResolutionFromFileName = (filename: string): string | null => {
    const resolutionPatterns = [
      /(\d{3,4})[pP]/,
      /[_\-\s](\d{3,4})[xX](\d{3,4})/,
      /[_\-\s]([48]k|[24]k|hd|fullhd|uhd)/i
    ]
    
    for (const pattern of resolutionPatterns) {
      const match = filename.match(pattern)
      if (match) {
        if (match[1] === '4k' || match[1] === '2160') return '4K'
        if (match[1] === '2k' || match[1] === '1440') return '1440P'
        if (match[1] === '1080') return '1080P'
        if (match[1] === '720') return '720P'
        if (match[1] === '480') return '480P'
        if (match[1] === '360') return '360P'
        if (match[1] === '240') return '240P'
      }
    }
    
    return null
  }

  // Network speed detection
  useEffect(() => {
    const measureNetworkSpeed = async () => {
      if (!autoQuality || availableQualities.length <= 1) return
      
      const testUrl = 'https://www.gstatic.com/gpso/static/img/favicon.ico?' + Date.now()
      const startTime = Date.now()
      
      try {
        const response = await fetch(testUrl, { method: 'HEAD' })
        const endTime = Date.now()
        const duration = (endTime - startTime) / 1000
        const speed = (Number(response.headers.get('content-length')) || 10000) / duration // bytes per second
        
        setNetworkSpeed(speed)
        
        // Auto-switch quality based on network speed
        let recommendedQuality = availableQualities[0].value // Highest quality
        
        if (speed < 100000) { // < 100 KB/s
          recommendedQuality = availableQualities.find(q => q.label.includes('240P'))?.value || 
                             availableQualities[availableQualities.length - 1].value
        } else if (speed < 500000) { // < 500 KB/s
          recommendedQuality = availableQualities.find(q => q.label.includes('360P'))?.value || 
                             availableQualities[Math.floor(availableQualities.length * 0.6)].value
        } else if (speed < 1000000) { // < 1 MB/s
          recommendedQuality = availableQualities.find(q => q.label.includes('480P'))?.value || 
                             availableQualities[Math.floor(availableQualities.length * 0.4)].value
        } else if (speed < 2000000) { // < 2 MB/s
          recommendedQuality = availableQualities.find(q => q.label.includes('720P'))?.value || 
                             availableQualities[Math.floor(availableQualities.length * 0.2)].value
        }
        
        if (recommendedQuality && recommendedQuality !== currentResolution && !isSwitchingQuality) {
          switchQuality(recommendedQuality)
        }
      } catch (error) {
        console.warn('Network speed test failed:', error)
      }
    }

    // Test network speed every 30 seconds when auto quality is enabled
    if (autoQuality && availableQualities.length > 1) {
      networkTestRef.current = setInterval(measureNetworkSpeed, 30000)
      measureNetworkSpeed() // Initial test
    }

    return () => {
      if (networkTestRef.current) {
        clearInterval(networkTestRef.current)
      }
    }
  }, [autoQuality, availableQualities, currentResolution, isSwitchingQuality])

  // Get current video URL based on selected resolution
  const getCurrentVideoUrl = (): string => {
    const fileUrl = currentVideo.fileUrl
    
    if (typeof fileUrl === 'string') {
      return fileUrl
    }
    
    if (typeof fileUrl === 'object' && currentResolution && fileUrl[currentResolution]) {
      return fileUrl[currentResolution]
    }
    
    // If selected resolution not found, try to use base as fallback
    if (typeof fileUrl === 'object' && fileUrl.base) {
      console.log('VideoViewer - Using base resolution as fallback')
      return fileUrl.base
    }
    
    // Final fallback: return the first available URL or the fileUrl string
    const firstQuality = availableQualities[0]
    if (firstQuality && firstQuality.url) {
      return firstQuality.url
    }
    
    return typeof fileUrl === 'string' ? fileUrl : ''
  }

  // Format network speed
  const formatNetworkSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1000) {
      return `${bytesPerSecond} B/s`
    } else if (bytesPerSecond < 1000000) {
      return `${(bytesPerSecond / 1000).toFixed(1)} KB/s`
    } else {
      return `${(bytesPerSecond / 1000000).toFixed(1)} MB/s`
    }
  }

  // Playlist navigation
  const handleNextVideo = () => {
    if (currentVideoIndexState < videoPlaylist.length - 1) {
      const newIndex = currentVideoIndexState + 1
      setCurrentVideoIndexState(newIndex)
      onVideoChange(newIndex)
      resetPlayer()
    }
  }

  const handlePrevVideo = () => {
    if (currentVideoIndexState > 0) {
      const newIndex = currentVideoIndexState - 1
      setCurrentVideoIndexState(newIndex)
      onVideoChange(newIndex)
      resetPlayer()
    }
  }

  const handleVideoSelect = (index: number) => {
    setCurrentVideoIndexState(index)
    onVideoChange(index)
    resetPlayer()
    setVideoListOpen(false)
  }

  const resetPlayer = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      setCurrentTime(0)
      setIsPlaying(false)
    }
  }

  // Safe play function with error handling
  const safePlay = async (): Promise<boolean> => {
    if (!videoRef.current) return false

    try {
      // Clear any existing play promise
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {}) // Ignore any previous errors
      }

      // Pause first to reset any pending operations
      videoRef.current.pause()

      // Wait a small amount of time to ensure the video is ready
      await new Promise(resolve => setTimeout(resolve, 100))

      // Create new play promise
      playPromiseRef.current = videoRef.current.play()
      await playPromiseRef.current
      
      setIsPlaying(true)
      return true
    } catch (error) {
      console.warn('Play failed:', error)
      setIsPlaying(false)
      return false
    }
  }

  // Safe pause function
  const safePause = () => {
    if (!videoRef.current) return

    try {
      videoRef.current.pause()
      setIsPlaying(false)
      
      // Clear any pending play promise
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {})
        playPromiseRef.current = null
      }
    } catch (error) {
      console.warn('Pause failed:', error)
    }
  }

  // Switch video quality - maintains current playback position
// Switch video quality - maintains current playback position
const switchQuality = async (newResolution: string) => {
  if (newResolution === currentResolution || !videoRef.current) return
  
  setIsSwitchingQuality(true)
  setShowQualityMenu(false)
  setVideoError("")
  
  // Store current state to restore after quality switch
  const currentTime = videoRef.current.currentTime
  const wasPlaying = !videoRef.current.paused
  const currentVolume = videoRef.current.volume
  const currentMuted = videoRef.current.muted
  
  // Find new quality URL
  const newQuality = availableQualities.find(q => q.value === newResolution)
  if (!newQuality) {
    setIsSwitchingQuality(false)
    return
  }
  
  // Declare previousSrc and previousCurrentTime outside try-catch for scope
  let previousSrc: string = ""
  let previousCurrentTime: number = 0

  try {
    // Pause current video but keep the time position
    safePause()
    
    // Store the current source and time to have fallback options
    previousSrc = videoRef.current.src
    previousCurrentTime = videoRef.current.currentTime
    
    // Wait a bit to ensure clean state
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Switch to new quality - set the source first
    videoRef.current.src = newQuality.url
    
    // Set the current time immediately after setting source
    videoRef.current.currentTime = currentTime
    
    // Restore volume settings
    videoRef.current.volume = currentVolume
    videoRef.current.muted = currentMuted
    
    // Load the new source
    videoRef.current.load()
    
    // Wait for the video to be ready to play at the specified time
    await new Promise((resolve, reject) => {
      if (!videoRef.current) return reject(new Error('No video element'))
      
      const onLoadedData = () => {
        cleanup()
        console.log('Video loaded at time:', currentTime)
        resolve(true)
      }
      
      const onCanPlayThrough = () => {
        cleanup()
        console.log('Video can play through at time:', currentTime)
        resolve(true)
      }
      
      const onError = (e: Event) => {
        cleanup()
        console.error('Video loading error:', e)
        reject(new Error('Failed to load video at specified time'))
      }
      
      const onAbort = () => {
        cleanup()
        reject(new Error('Video loading aborted'))
      }
      
      const cleanup = () => {
        videoRef.current?.removeEventListener('loadeddata', onLoadedData)
        videoRef.current?.removeEventListener('canplaythrough', onCanPlayThrough)
        videoRef.current?.removeEventListener('error', onError)
        videoRef.current?.removeEventListener('abort', onAbort)
      }
      
      // Set up event listeners
      videoRef.current.addEventListener('loadeddata', onLoadedData, { once: true })
      videoRef.current.addEventListener('canplaythrough', onCanPlayThrough, { once: true })
      videoRef.current.addEventListener('error', onError, { once: true })
      videoRef.current.addEventListener('abort', onAbort, { once: true })
      
      // Timeout after 15 seconds
      setTimeout(() => {
        cleanup()
        reject(new Error('Timeout loading video at specified time'))
      }, 15000)
    })
    
    // Update the current resolution state
    setCurrentResolution(newResolution)
    
    // Resume playback if it was playing - continues from same position
    if (wasPlaying) {
      // Wait a bit more to ensure everything is ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Set the time again to ensure it's correct after loading
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime
      }
      
      // Attempt to play
      const playSuccess = await safePlay()
      
      if (!playSuccess) {
        console.warn('Auto-play after quality switch failed, but video is ready')
      }
    } else {
      // If not playing, still ensure we're at the right time
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime
      }
    }
    
    console.log(`Successfully switched to ${newQuality.label} at ${formatTime(currentTime)}`)
    
  } catch (error) {
    console.error('Failed to switch quality:', error)
    const errorMsg = typeof error === "object" && error !== null && "message" in error 
      ? (error as { message: string }).message 
      : String(error)
    
    setVideoError(`Failed to switch to ${newQuality.label}: ${errorMsg}`)
    
    // Try to restore previous state if possible
    if (videoRef.current) {
      try {
        videoRef.current.src = previousSrc
        videoRef.current.currentTime = previousCurrentTime
        videoRef.current.load()
        console.log('Restored previous video source after quality switch failure')
      } catch (restoreError) {
        console.error('Failed to restore previous video source:', restoreError)
      }
    }
  } finally {
    setIsSwitchingQuality(false)
  }
}

  // Video event handlers
  const handlePlayPause = async () => {
    if (!videoRef.current) return

    if (isPlaying) {
      safePause()
    } else {
      await safePlay()
    }
  }

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value
      setVolume(value)
      setIsMuted(value === 0)
    }
  }

  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
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
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

const handleLoadedMetadata = () => {
  if (videoRef.current) {
    setDuration(videoRef.current.duration)
    setVideoError("") // Clear any previous errors
    
    // If we're switching quality, don't reset the current time
    // The current time is managed by the quality switch function
    if (!isSwitchingQuality && videoRef.current.currentTime !== currentTime) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }
}
  const handleEnded = () => {
    setIsPlaying(false)
    // Auto-play next video if available
    if (currentVideoIndexState < videoPlaylist.length - 1) {
      setTimeout(() => {
        handleNextVideo()
      }, 2000)
    }
  }

  const handleWaiting = () => {
    setBuffering(true)
  }

  const handleCanPlay = () => {
    setBuffering(false)
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

  const handleError = (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video error:', event)
    setBuffering(false)
    setIsPlaying(false)
    
    const video = event.target as HTMLVideoElement
    let errorMessage = 'Unknown video error'
    
    if (video.error) {
      switch (video.error.code) {
        case video.error.MEDIA_ERR_ABORTED:
          errorMessage = 'Video playback was aborted'
          break
        case video.error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading video'
          break
        case video.error.MEDIA_ERR_DECODE:
          errorMessage = 'Video format not supported or corrupted'
          break
        case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported'
          break
      }
    }
    
    setVideoError(errorMessage)
  }

  const handleClosePlayer = () => {
    // Clean up video element
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.src = ''
      videoRef.current.load()
    }
    
    // Clear any pending promises
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {})
      playPromiseRef.current = null
    }
    
    setIsOpen(false)
    onClose()
  }

  // Controls visibility - ALWAYS show controls initially
  useEffect(() => {
    setShowControls(true)
    
    // Hide controls after 3 seconds if playing
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying])

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          handlePlayPause()
          break
        case 'f':
          e.preventDefault()
          handleFullscreen()
          break
        case 'm':
          e.preventDefault()
          handleToggleMute()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.ctrlKey) {
            handlePrevVideo()
          } else {
            handleSeek(Math.max(0, currentTime - 10))
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.ctrlKey) {
            handleNextVideo()
          } else {
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
            handleClosePlayer()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isOpen, isPlaying, currentTime, duration, videoListOpen, notesOpen, aiOpen, isFullscreen])

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
      if (networkTestRef.current) {
        clearInterval(networkTestRef.current)
      }
      
      // Clean up video on unmount
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.src = ''
        videoRef.current.load()
      }
      
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {})
      }
    }
  }, [])

  if (!isOpen) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const currentVideoUrl = getCurrentVideoUrl()
  const currentQuality = availableQualities.find(q => q.value === currentResolution)
  const currentQualityLabel = currentQuality?.label || 'SD'
  const hasMultipleQualities = availableQualities.length > 1
  const hasMultipleVideos = videoPlaylist.length > 1
  const canGoNext = currentVideoIndexState < videoPlaylist.length - 1
  const canGoPrev = currentVideoIndexState > 0

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div 
        ref={playerRef}
        className="w-full h-full relative"
        onMouseMove={showControlsTemporarily}
      >
        {currentVideoUrl && !videoError ? (
          <>
<video
  ref={videoRef}
  src={currentVideoUrl}
  className="w-full h-full object-contain"
  onTimeUpdate={handleTimeUpdate}
  onLoadedMetadata={handleLoadedMetadata}
  onLoadedData={() => console.log('Video data loaded at:', videoRef.current?.currentTime)}
  onEnded={handleEnded}
  onWaiting={handleWaiting}
  onCanPlay={handleCanPlay}
  onError={handleError}
  preload="metadata"
/>            
            {/* Buffering Spinner */}
            {buffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
              </div>
            )}
            
            {/* Quality Switching Indicator */}
            {isSwitchingQuality && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <div className="text-sm">Switching to {currentQualityLabel}...</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">❌</div>
              <h3 className="text-lg font-semibold mb-2">
                {videoError ? 'Video Error' : 'Unable to Load Video'}
              </h3>
              <p className="text-sm mb-4 max-w-md">
                {videoError || 'The video URL is not available.'}
              </p>
              <button
                onClick={handleClosePlayer}
                className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        )}

        {/* Controls Overlay - Always show when showControls is true */}
        {showControls && currentVideoUrl && !videoError && (
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-20"
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-30">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClosePlayer}
                  className="flex items-center gap-2 text-white hover:bg-white/20 p-2 rounded transition-colors z-40"
                >
                  <X className="w-5 h-5" />
                  <span className="text-sm">Close</span>
                </button>
                
                <div className="text-white text-sm font-medium truncate max-w-md" title={currentVideo.fileName}>
                  {currentVideo.fileName}
                </div>

                {/* Video counter */}
                {hasMultipleVideos && (
                  <div className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                    {currentVideoIndexState + 1} / {videoPlaylist.length}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Network Speed Indicator */}
                {networkSpeed > 0 && (
                  <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded">
                    <Wifi className="w-3 h-3" />
                    {formatNetworkSpeed(networkSpeed)}
                  </div>
                )}

                <button
                  onClick={handleNotesClick}
                  className={`flex items-center gap-2 p-2 rounded transition-colors z-40 ${
                    notesOpen ? 'bg-blue-600 text-white' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Notes</span>
                </button>

                <button
                  onClick={handleAIClick}
                  className={`flex items-center gap-2 p-2 rounded transition-colors z-40 ${
                    aiOpen ? 'bg-purple-600 text-white' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">AI</span>
                </button>

                <button
                  onClick={handleVideoListClick}
                  className={`flex items-center gap-2 p-2 rounded transition-colors z-40 ${
                    videoListOpen ? 'bg-green-600 text-white' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <ListVideo className="w-4 h-4" />
                  <span className="text-sm">Videos ({videoPlaylist.length})</span>
                </button>
              </div>
            </div>

            {/* Center Play/Pause Button - Show when paused or loading */}
            {(!isPlaying || buffering) && currentVideoUrl && (
              <div 
                className="absolute inset-0 flex items-center justify-center z-30"
                onClick={handlePlayPause}
              >
                <button
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full p-6 transition-all transform hover:scale-110"
                  disabled={buffering || isSwitchingQuality}
                >
                  {buffering ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  ) : (
                    <Play className="w-16 h-16 ml-2" />
                  )}
                </button>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3 z-30">
              {/* Progress Bar */}
              <div className="relative group">
                <div className="h-2 bg-gray-600 rounded-full cursor-pointer">
                  <div
                    className="h-full bg-red-600 rounded-full relative transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-4 opacity-0 cursor-pointer"
                  disabled={buffering || isSwitchingQuality}
                />
                <div className="flex justify-between text-white text-xs mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Previous Video Button */}
                  {hasMultipleVideos && (
                    <button
                      onClick={handlePrevVideo}
                      disabled={!canGoPrev}
                      className={`text-white p-2 rounded transition-colors z-40 ${
                        canGoPrev ? 'hover:bg-white/20' : 'opacity-50 cursor-not-allowed'
                      }`}
                      title="Previous Video (Ctrl+Left)"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}

                  <button
                    onClick={handlePlayPause}
                    className="text-white hover:bg-white/20 p-3 rounded-full transition-colors bg-black/50 z-40"
                    disabled={buffering || isSwitchingQuality}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </button>

                  {/* Next Video Button */}
                  {hasMultipleVideos && (
                    <button
                      onClick={handleNextVideo}
                      disabled={!canGoNext}
                      className={`text-white p-2 rounded transition-colors z-40 ${
                        canGoNext ? 'hover:bg-white/20' : 'opacity-50 cursor-not-allowed'
                      }`}
                      title="Next Video (Ctrl+Right)"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleMute}
                      className="text-white hover:bg-white/20 p-2 rounded transition-colors z-40"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : volume < 0.5 ? (
                        <Volume2 className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <div className="w-24 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full accent-white"
                      />
                    </div>
                  </div>

                  <div className="text-white text-sm font-mono bg-black/50 px-2 py-1 rounded">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Playback Rate */}
                  <div className="relative">
                    <select
                      value={playbackRate}
                      onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                      className="bg-black/80 text-white border border-gray-600 rounded px-3 py-1 text-sm appearance-none cursor-pointer z-40"
                      disabled={buffering || isSwitchingQuality}
                    >
                      <option value={0.25}>0.25x</option>
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>Normal</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>

                  {/* Quality Selector - NOW WITHOUT BASE RESOLUTION */}
                  <div className="relative">
                    <button
                      onClick={() => hasMultipleQualities && setShowQualityMenu(!showQualityMenu)}
                      className={`flex items-center gap-2 text-white p-2 rounded transition-colors z-40 ${
                        hasMultipleQualities ? 'hover:bg-white/20 cursor-pointer' : 'cursor-default'
                      }`}
                      disabled={isSwitchingQuality}
                    >
                      <Monitor className="w-5 h-5" />
                      <span className="text-sm">{currentQualityLabel}</span>
                      {hasMultipleQualities && (
                        <>
                          {autoQuality && <span className="text-xs text-green-400">AUTO</span>}
                          <span className="text-xs">▼</span>
                        </>
                      )}
                    </button>

                    {showQualityMenu && hasMultipleQualities && (
                      <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg z-50">
                        <div className="p-2 border-b border-gray-700">
                          <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoQuality}
                              onChange={(e) => setAutoQuality(e.target.checked)}
                              className="rounded bg-gray-700 border-gray-600"
                            />
                            <Wifi className="w-4 h-4" />
                            Auto Quality
                          </label>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {availableQualities.map((quality) => (
                            <button
                              key={quality.value}
                              onClick={() => switchQuality(quality.value)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${
                                currentResolution === quality.value 
                                  ? 'bg-blue-600 text-white' 
                                  : 'text-white'
                              } ${autoQuality ? 'opacity-70' : ''}`}
                              disabled={autoQuality || isSwitchingQuality}
                            >
                              <div className="flex items-center justify-between">
                                <span>{quality.label}</span>
                                {currentResolution === quality.value && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleFullscreen}
                    className="text-white hover:bg-white/20 p-2 rounded transition-colors z-40"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Playlist Sidebar */}
        {videoListOpen && (
          <div className="absolute top-20 right-4 w-80 h-[calc(100vh-160px)] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg z-40 flex flex-col">
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
              {videoPlaylist.map((video, index) => (
                <div
                  key={video.id}
                  onClick={() => handleVideoSelect(index)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                    index === currentVideoIndexState 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <div className="w-16 h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                    {index === currentVideoIndexState && isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{video.fileName}</p>
                    <p className="text-xs opacity-75">
                      {index === currentVideoIndexState ? 'Now Playing' : `Video ${index + 1}`}
                    </p>
                  </div>
                  {index === currentVideoIndexState && (
                    <div className="w-2 h-2 bg-white rounded-full flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes Panel */}
        {notesOpen && (
          <div className="absolute top-20 left-4 w-80 h-[calc(100vh-160px)] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg z-40 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Notes</h3>
              <button
                onClick={() => setNotesOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4">
              <textarea
                className="w-full h-full bg-gray-800 text-white rounded p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add your notes here..."
              />
            </div>
          </div>
        )}

        {/* AI Panel */}
        {aiOpen && (
          <div className="absolute top-20 left-4 w-80 h-[calc(100vh-160px)] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg z-40 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">AI Assistant</h3>
              <button
                onClick={() => setAiOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4">
              <div className="text-gray-400 text-sm">
                AI features coming soon...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to format time
function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "0:00"
  
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}