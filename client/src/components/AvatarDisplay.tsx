import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  videoFilename?: string;
  nextVideoFilename?: string; // Add next video to preload
  isAudioEnabled: boolean;
  onVideoLoaded?: () => void; // Callback when video is loaded
}

export function AvatarDisplay({ 
  videoFilename, 
  nextVideoFilename,
  isAudioEnabled, 
  onVideoLoaded 
}: AvatarDisplayProps) {
  // Current video and next video references
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  
  // Track loaded states
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isNextVideoLoaded, setIsNextVideoLoaded] = useState(false);
  
  // Track if a transition is in progress
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Track the current active video source
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(videoFilename);
  
  // Debug the transition state
  console.log('[AvatarDisplay] Rendering with props:', { 
    videoFilename, 
    nextVideoFilename,
    isAudioEnabled,
    isVideoLoaded,
    isNextVideoLoaded,
    isTransitioning,
    currentSrc
  });
  
  // Set up initial video when audio is enabled
  useEffect(() => {
    if (!isAudioEnabled || !videoFilename) return;
    
    console.log('[AvatarDisplay] Audio enabled, setting up initial video');
    
    if (videoRef.current) {
      // Don't reload if src is already set correctly
      if (videoRef.current.src !== "" && videoRef.current.src.includes(videoFilename)) {
        console.log('[AvatarDisplay] Initial video already set correctly');
        return;
      }
      
      // Set the initial video source
      console.log(`[AvatarDisplay] Loading initial video: ${videoFilename}`);
      videoRef.current.src = `../../videos/${videoFilename}`;
      videoRef.current.load();
      
      // Store as current source
      setCurrentSrc(videoFilename);
    }
    
    // Cleanup function
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (nextVideoRef.current) {
        nextVideoRef.current.pause();
      }
    };
  }, [isAudioEnabled, videoFilename]);
  
  // Handle play when initial video is loaded
  useEffect(() => {
    if (!isAudioEnabled || !videoRef.current) return;
    
    const handleVideoLoaded = () => {
      console.log('[AvatarDisplay] Initial video loaded, playing');
      videoRef.current?.play().catch(e => {
        console.error('[AvatarDisplay] Initial video play failed', e);
      });
      setIsVideoLoaded(true);
    };
    
    // Add the event listener
    videoRef.current.addEventListener('loadeddata', handleVideoLoaded);
    
    // Remove event listener on cleanup
    return () => {
      videoRef.current?.removeEventListener('loadeddata', handleVideoLoaded);
    };
  }, [isAudioEnabled]);
  
  // Handle video source changes from props
  useEffect(() => {
    // Skip initial mount or if not enabled or if same video or during transition
    if (!isAudioEnabled || !videoFilename || videoFilename === currentSrc || isTransitioning) {
      return;
    }
    
    console.log(`[AvatarDisplay] Video changing from ${currentSrc} to ${videoFilename}`);
    setIsTransitioning(true);
    
    // Reset next video loaded state
    setIsNextVideoLoaded(false);
    
    // Load the new video in the next video element
    if (nextVideoRef.current) {
      nextVideoRef.current.src = `../../videos/${videoFilename}`;
      nextVideoRef.current.load();
    }
  }, [videoFilename, currentSrc, isAudioEnabled, isTransitioning]);
  
  // Handle next video loaded event
  useEffect(() => {
    if (!nextVideoRef.current || !isTransitioning) return;
    
    const handleNextVideoLoaded = () => {
      console.log('[AvatarDisplay] Next video loaded, starting playback');
      nextVideoRef.current?.play().catch(e => {
        console.error('[AvatarDisplay] Next video play failed', e);
      });
      setIsNextVideoLoaded(true);
    };
    
    // Add the event listener
    nextVideoRef.current.addEventListener('loadeddata', handleNextVideoLoaded);
    
    // Remove event listener on cleanup
    return () => {
      nextVideoRef.current?.removeEventListener('loadeddata', handleNextVideoLoaded);
    };
  }, [isTransitioning]);
  
  // Perform the actual swap when next video is loaded
  useEffect(() => {
    if (!isNextVideoLoaded || !isTransitioning || !videoFilename) return;
    
    console.log('[AvatarDisplay] Performing video swap');
    
    // Swap the videos by showing next and hiding current
    if (videoRef.current) {
      videoRef.current.style.opacity = '0';
    }
    if (nextVideoRef.current) {
      nextVideoRef.current.style.opacity = '1';
    }
    
    // After the transition animation completes, swap the video elements
    const swapTimeout = setTimeout(() => {
      if (!videoRef.current || !nextVideoRef.current) return;
      
      // Swap the src attributes between the two video elements
      const tempSrc = videoRef.current.src;
      videoRef.current.src = nextVideoRef.current.src;
      videoRef.current.load();
      
      // Play the current video
      videoRef.current.play().catch(e => {
        console.error('[AvatarDisplay] Video play failed after swap', e);
      });
      
      // Hide the next video element
      nextVideoRef.current.style.opacity = '0';
      
      // Update current source
      setCurrentSrc(videoFilename);
      
      // Reset transition state
      setIsTransitioning(false);
      setIsNextVideoLoaded(false);
      
      console.log('[AvatarDisplay] Video swap complete');
    }, 500); // Duration of transition animation
    
    return () => {
      clearTimeout(swapTimeout);
    };
  }, [isNextVideoLoaded, isTransitioning, videoFilename]);
  
  // Preload next video when available
  useEffect(() => {
    if (!nextVideoFilename || isTransitioning) return;
    
    console.log(`[AvatarDisplay] Preloading next video: ${nextVideoFilename}`);
    
    const preloadVideo = document.createElement('video');
    preloadVideo.style.display = 'none';
    preloadVideo.preload = 'auto';
    preloadVideo.src = `../../videos/${nextVideoFilename}`;
    preloadVideo.load();
    
    preloadVideo.onloadeddata = () => {
      console.log(`[AvatarDisplay] Successfully preloaded: ${nextVideoFilename}`);
      document.body.removeChild(preloadVideo);
    };
    
    document.body.appendChild(preloadVideo);
    
    return () => {
      if (document.body.contains(preloadVideo)) {
        document.body.removeChild(preloadVideo);
      }
    };
  }, [nextVideoFilename, isTransitioning]);
  
  // Notify parent when video is loaded
  useEffect(() => {
    if (isVideoLoaded && onVideoLoaded) {
      onVideoLoaded();
    }
  }, [isVideoLoaded, onVideoLoaded]);
  
  if (!videoFilename) {
    return <Skeleton className="w-full aspect-video rounded-lg" />;
  }
  
  if (!isAudioEnabled) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <p className="text-white">Please enable audio to watch the video</p>
      </Card>
    );
  }
  
  return (
    <Card className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
      {/* Current video (normally visible) */}
      <video
        ref={videoRef}
        className="w-full h-full absolute inset-0 transition-opacity duration-500 z-10"
        style={{ opacity: 1 }}
        playsInline
        muted={false}
        preload="auto"
      />
      
      {/* Next video (hidden until transition) */}
      <video
        ref={nextVideoRef}
        className="w-full h-full absolute inset-0 transition-opacity duration-500 z-5"
        style={{ opacity: 0 }}
        playsInline
        muted={false}
        preload="auto"
      />
    </Card>
  );
}