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
  const [currentResolution, setCurrentResolution] = useState<string>("base")
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

  // Extract and normalize video qualities from current video data
  useEffect(() => {
    const extractQualities = () => {
      const qualities: VideoQuality[] = []
      
      console.log('Processing video data:', {
        fileUrl: currentVideo.fileUrl,
        availableResolutions: currentVideo.availableResolutions,
        fileName: currentVideo.fileName
      })
      
      const videoData = currentVideo.fileUrl
      
      // Case 1: fileUrl is an object with multiple resolution URLs
      if (typeof videoData === 'object' && videoData !== null && !Array.isArray(videoData)) {
        Object.entries(videoData).forEach(([resolution, url]) => {
          // Include ALL resolutions including 'base'
          if (typeof url === 'string' && url.trim() !== '') {
            const label = resolution === 'base' ? 'BASE' : resolution.toUpperCase()
            qualities.push({
              label: label,
              value: resolution,
              url: url
            })
          }
        })
      }
      
      // Case 2: Use availableResolutions prop with base URL pattern
      if (currentVideo.availableResolutions && currentVideo.availableResolutions.length > 0) {
        // If we already have qualities from the object, use those
        if (qualities.length === 0) {
          currentVideo.availableResolutions.forEach(resolution => {
            if (resolution && resolution.trim() !== '') {
              const label = resolution === 'base' ? 'BASE' : resolution.toUpperCase()
              qualities.push({
                label: label,
                value: resolution,
                url: typeof videoData === 'string' ? videoData : ''
              })
            }
          })
        }
      }
      
      // Case 3: Single URL - create default quality
      if (qualities.length === 0 && typeof videoData === 'string' && videoData.trim() !== '') {
        qualities.push({
          label: 'BASE',
          value: 'base',
          url: videoData
        })
      }
      
      // Sort qualities by resolution (base first, then increasing quality)
      if (qualities.length > 1) {
        qualities.sort((a, b) => {
          // Define order: base is first, then increasing quality
          const order = ['BASE', '144P', '240P', '360P', '480P', '720P', '1080P', '1440P', '2160P', '4K', 'SOURCE']
          
          const aLabel = a.label.toUpperCase()
          const bLabel = b.label.toUpperCase()
          
          const aIndex = order.indexOf(aLabel)
          const bIndex = order.indexOf(bLabel)
          
          // If both are in predefined order
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex
          }
          
          // If only one is in order
          if (aIndex !== -1) return -1
          if (bIndex !== -1) return 1
          
          // Neither in order, sort alphabetically
          return aLabel.localeCompare(bLabel)
        })
      }
      
      console.log('Available qualities:', qualities)
      setAvailableQualities(qualities)
      
      // Set initial resolution - prefer 'base' for faster loading
      if (qualities.length > 0) {
        const baseQuality = qualities.find(q => q.value === 'base')
        const initialQuality = baseQuality || qualities[0]
        
        if (currentResolution !== initialQuality.value) {
          setCurrentResolution(initialQuality.value)
          console.log('Setting initial resolution to:', initialQuality.value, initialQuality.label)
        }
      }
    }

    extractQualities()
  }, [currentVideo.fileUrl, currentVideo.availableResolutions, currentVideo.fileName, currentVideoIndexState])

  // Get current video URL based on selected resolution
  const getCurrentVideoUrl = (): string => {
    const videoData = currentVideo.fileUrl
    
    // If it's a single string URL
    if (typeof videoData === 'string') {
      return videoData
    }
    
    // If it's an object with resolution URLs
    if (typeof videoData === 'object') {
      // Try the current resolution first
      if (currentResolution && videoData[currentResolution]) {
        return videoData[currentResolution]
      }
      
      // Try base as fallback
      if (videoData.base) {
        console.log('Using base resolution as fallback')
        return videoData.base
      }
      
      // Try any available URL
      const firstKey = Object.keys(videoData)[0]
      if (firstKey && videoData[firstKey]) {
        return videoData[firstKey]
      }
    }
    
    // Find URL from available qualities
    const currentQuality = availableQualities.find(q => q.value === currentResolution)
    if (currentQuality && currentQuality.url) {
      return currentQuality.url
    }
    
    // Final fallback
    if (availableQualities.length > 0 && availableQualities[0].url) {
      return availableQualities[0].url
    }
    
    return ''
  }

  // Network speed detection and auto-quality switching
  useEffect(() => {
    const measureNetworkSpeed = async () => {
      if (!autoQuality || availableQualities.length <= 1) return
      
      try {
        const testUrl = 'https://www.gstatic.com/gpso/static/img/favicon.ico?' + Date.now()
        const startTime = performance.now()
        
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          cache: 'no-cache'
        })
        
        const endTime = performance.now()
        const durationMs = endTime - startTime
        
        // Calculate speed in bytes per second
        const contentLength = Number(response.headers.get('content-length')) || 10000
        const speed = (contentLength / durationMs) * 1000
        
        setNetworkSpeed(speed)
        console.log(`Network speed: ${formatNetworkSpeed(speed)}`)
        
        // Auto-switch quality based on network speed
        let recommendedQuality = 'base' // Default to base for poor network
        
        if (speed > 2000000) { // > 2 MB/s
          // Try to get highest available quality (excluding base)
          const highQualities = availableQualities
            .filter(q => q.value !== 'base')
            .sort((a, b) => {
              // Sort by resolution quality
              const order = ['240p', '360p', '480p', '720p', '1080p', '1440p', '2160p', '4k']
              return order.indexOf(b.value) - order.indexOf(a.value)
            })
          recommendedQuality = highQualities[0]?.value || 'base'
        } else if (speed > 1000000) { // > 1 MB/s
          recommendedQuality = availableQualities.find(q => q.value === '1080p')?.value || 
                              availableQualities.find(q => q.value === '720p')?.value || 'base'
        } else if (speed > 500000) { // > 500 KB/s
          recommendedQuality = availableQualities.find(q => q.value === '720p')?.value || 
                              availableQualities.find(q => q.value === '480p')?.value || 'base'
        } else if (speed > 200000) { // > 200 KB/s
          recommendedQuality = availableQualities.find(q => q.value === '480p')?.value || 
                              availableQualities.find(q => q.value === '360p')?.value || 'base'
        } else if (speed > 100000) { // > 100 KB/s
          recommendedQuality = availableQualities.find(q => q.value === '360p')?.value || 
                              availableQualities.find(q => q.value === '240p')?.value || 'base'
        } else if (speed > 50000) { // > 50 KB/s
          recommendedQuality = availableQualities.find(q => q.value === '240p')?.value || 'base'
        }
        // < 50 KB/s stays as 'base'
        
        // Ensure the recommended quality exists
        const qualityExists = availableQualities.some(q => q.value === recommendedQuality)
        if (!qualityExists) {
          recommendedQuality = 'base'
        }
        
        // Switch quality if different from current and not already switching
        if (recommendedQuality && recommendedQuality !== currentResolution && !isSwitchingQuality) {
          console.log(`Auto-quality: Switching to ${recommendedQuality}`)
          await switchQuality(recommendedQuality)
        }
        
      } catch (error) {
        console.warn('Network speed test failed:', error)
        // On network error, ensure we're on base quality
        if (currentResolution !== 'base' && !isSwitchingQuality) {
          console.log('Network error detected, switching to base quality')
          switchQuality('base')
        }
      }
    }

    // Test network speed periodically when auto quality is enabled
    if (autoQuality && availableQualities.length > 1) {
      const interval = 30000 // 30 seconds
      networkTestRef.current = setInterval(measureNetworkSpeed, interval)
      
      // Initial test after a short delay
      const initialDelay = setTimeout(measureNetworkSpeed, 2000)
      
      return () => {
        if (networkTestRef.current) clearInterval(networkTestRef.current)
        clearTimeout(initialDelay)
      }
    }
  }, [autoQuality, availableQualities, currentResolution, isSwitchingQuality])

  // Switch video quality
  const switchQuality = async (newResolution: string) => {
    if (newResolution === currentResolution || !videoRef.current) return
    
    setIsSwitchingQuality(true)
    setShowQualityMenu(false)
    setVideoError("")
    
    try {
      // Store current state
      const currentTime = videoRef.current.currentTime
      const wasPlaying = !videoRef.current.paused
      const currentVolume = videoRef.current.volume
      const currentMuted = videoRef.current.muted
      
      // Find new quality
      const newQuality = availableQualities.find(q => q.value === newResolution)
      if (!newQuality) {
        throw new Error(`Quality ${newResolution} not found`)
      }
      
      console.log(`Switching quality: ${currentResolution} -> ${newResolution} at ${currentTime.toFixed(2)}s`)
      
      // Store current source for fallback
      const previousSrc = videoRef.current.src
      const previousTime = videoRef.current.currentTime
      
      // Pause current playback
      safePause()
      
      // Set new source
      videoRef.current.src = newQuality.url
      
      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          reject(new Error('Video element not found'))
          return
        }
        
        const handleLoadedMetadata = () => {
          cleanup()
          console.log(`New quality loaded: ${newQuality.label}`)
          resolve()
        }
        
        const handleError = () => {
          cleanup()
          reject(new Error(`Failed to load ${newQuality.label}`))
        }
        
        const cleanup = () => {
          videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata)
          videoRef.current?.removeEventListener('error', handleError)
        }
        
        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
        videoRef.current.addEventListener('error', handleError, { once: true })
        
        setTimeout(() => {
          cleanup()
          reject(new Error('Quality switch timeout'))
        }, 15000)
      })
      
      // Restore playback position
      videoRef.current.currentTime = currentTime
      
      // Restore volume
      videoRef.current.volume = currentVolume
      videoRef.current.muted = currentMuted
      
      // Update state
      setCurrentResolution(newResolution)
      
      // Resume playback if it was playing
      if (wasPlaying) {
        await new Promise(resolve => setTimeout(resolve, 100))
        await safePlay()
      }
      
      console.log(`Quality switched successfully to ${newQuality.label}`)
      
    } catch (error) {
      console.error('Failed to switch quality:', error)
      setVideoError(`Failed to switch to ${newResolution}`)
      
      // Try to restore previous source
      if (videoRef.current) {
        videoRef.current.src = previousSrc
        videoRef.current.currentTime = previousTime
        videoRef.current.load()
      }
    } finally {
      setIsSwitchingQuality(false)
    }
  }

  // Format network speed
  const formatNetworkSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1000) {
      return `${bytesPerSecond.toFixed(0)} B/s`
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

  // Safe play function
  const safePlay = async (): Promise<boolean> => {
    if (!videoRef.current) return false

    try {
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {})
      }

      videoRef.current.pause()
      await new Promise(resolve => setTimeout(resolve, 100))

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
      
      if (playPromiseRef.current) {
        playPromiseRef.current.catch(() => {})
        playPromiseRef.current = null
      }
    } catch (error) {
      console.warn('Pause failed:', error)
    }
  }

  // Video controls
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
      setVideoError("")
      
      if (!isSwitchingQuality) {
        setCurrentTime(videoRef.current.currentTime)
      }
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
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
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.src = ''
      videoRef.current.load()
    }
    
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {})
      playPromiseRef.current = null
    }
    
    setIsOpen(false)
    onClose()
  }

  // Panel handlers
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

  // Controls visibility
  useEffect(() => {
    setShowControls(true)
    
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
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      if (networkTestRef.current) clearInterval(networkTestRef.current)
      
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
  const currentQualityLabel = currentQuality?.label || 'BASE'
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

        {/* Controls Overlay */}
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
                    {autoQuality && <span className="text-green-400 ml-1">AUTO</span>}
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

            {/* Center Play/Pause Button */}
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

                  {/* Quality Selector */}
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
                          {autoQuality && <span className="text-xs text-green-400 ml-1">AUTO</span>}
                          <span className="text-xs ml-1">▼</span>
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
                              disabled={isSwitchingQuality}
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