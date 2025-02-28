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
  // Video elements references
  const topVideoRef = useRef<HTMLVideoElement>(null);
  const bottomVideoRef = useRef<HTMLVideoElement>(null);
  
  // Track which video is on top
  const [topVideoActive, setTopVideoActive] = useState(true);
  
  // Track loaded state
  const hasInitialized = useRef<boolean>(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [bottomVideoReady, setBottomVideoReady] = useState(false);
  
  // Keep track of current and next sources
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(videoFilename);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Initial video setup
  useEffect(() => {
    if (topVideoRef.current && !hasInitialized.current && isAudioEnabled) {
      hasInitialized.current = true;
      console.log('[AvatarDisplay] Initializing video for first time');
      
      if (videoFilename) {
        topVideoRef.current.src = `../../videos/${videoFilename}`;
        topVideoRef.current.load();
        topVideoRef.current.play().catch(e => 
          console.error('[AvatarDisplay] Autoplay failed:', e)
        );
        setCurrentSrc(videoFilename);
      }
    }
    
    return () => {
      if (topVideoRef.current) {
        topVideoRef.current.pause();
      }
      if (bottomVideoRef.current) {
        bottomVideoRef.current.pause();
      }
      hasInitialized.current = false;
    };
  }, [isAudioEnabled, videoFilename]);

  // Handle video source changes
  useEffect(() => {
    // Skip on initial render, if no audio enabled, or if same video
    if (!isAudioEnabled || !videoFilename || videoFilename === currentSrc || isTransitioning) {
      return;
    }
    
    console.log(`[AvatarDisplay] Video changing from ${currentSrc} to ${videoFilename}`);
    setIsTransitioning(true);
    
    // Determine which video element is currently hidden (bottom) to use for the new video
    const currentTopVideo = topVideoActive ? topVideoRef.current : bottomVideoRef.current;
    const currentBottomVideo = topVideoActive ? bottomVideoRef.current : topVideoRef.current;
    
    if (currentBottomVideo && currentTopVideo) {
      // Set up the bottom video with the new source
      currentBottomVideo.src = `../../videos/${videoFilename}`;
      currentBottomVideo.load();
      setBottomVideoReady(false); // Reset ready state
      
      // When bottom video is loaded, play it and prepare for crossfade
      currentBottomVideo.onloadeddata = () => {
        console.log('[AvatarDisplay] New video loaded and ready for crossfade');
        
        // Start playing the bottom video (will be invisible initially)
        currentBottomVideo.play().catch(e => {
          console.error('[AvatarDisplay] Bottom video playback failed:', e);
        });
        
        // Mark the bottom video as ready for transition
        setBottomVideoReady(true);
      };
    }
  }, [videoFilename, currentSrc, isAudioEnabled, topVideoActive, isTransitioning]);
  
  // Perform the actual crossfade when bottom video is ready
  useEffect(() => {
    if (bottomVideoReady && isTransitioning && videoFilename) {
      console.log('[AvatarDisplay] Starting crossfade transition');
      
      // Flip which video is considered "on top" visually
      setTopVideoActive(!topVideoActive);
      
      // After transition completes, update current source and reset flags
      setTimeout(() => {
        setCurrentSrc(videoFilename);
        setIsTransitioning(false);
        setBottomVideoReady(false);
        console.log('[AvatarDisplay] Crossfade complete, source updated to:', videoFilename);
      }, 500); // Duration of css transition 
    }
  }, [bottomVideoReady, isTransitioning, videoFilename, topVideoActive]);

  // Preload next video when available
  useEffect(() => {
    if (nextVideoFilename && !isTransitioning) {
      console.log(`[AvatarDisplay] Preloading next video: ${nextVideoFilename}`);
      
      // Preload using a dedicated element that won't be displayed
      const preloadVideo = document.createElement('video');
      preloadVideo.style.display = 'none';
      preloadVideo.preload = 'auto';
      preloadVideo.src = `../../videos/${nextVideoFilename}`;
      preloadVideo.load();
      
      // Clean up the preload element when done
      preloadVideo.onloadeddata = () => {
        console.log(`[AvatarDisplay] Successfully preloaded: ${nextVideoFilename}`);
        document.body.removeChild(preloadVideo);
      };
      
      document.body.appendChild(preloadVideo);
    }
  }, [nextVideoFilename, isTransitioning]);

  // Handle video loaded callback for the initially visible video
  useEffect(() => {
    if (isVideoLoaded && onVideoLoaded) {
      onVideoLoaded();
    }
  }, [isVideoLoaded, onVideoLoaded]);

  console.log('[AvatarDisplay] Rendering with props:', { 
    videoFilename, 
    nextVideoFilename, 
    isAudioEnabled,
    isVideoLoaded,
    topVideoActive,
    isTransitioning
  });

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
      {/* Top video layer */}
      <video
        ref={topVideoRef}
        className="w-full h-full absolute inset-0 transition-opacity duration-300"
        style={{ opacity: topVideoActive ? 1 : 0, zIndex: 10 }}
        autoPlay={isAudioEnabled}
        playsInline
        muted={false}
        onLoadedData={() => {
          console.log('[AvatarDisplay] Top video loaded successfully');
          if (topVideoActive) {
            setIsVideoLoaded(true);
          }
        }}
      />
      
      {/* Bottom video layer (for crossfade) */}
      <video
        ref={bottomVideoRef}
        className="w-full h-full absolute inset-0 transition-opacity duration-300"
        style={{ opacity: topVideoActive ? 0 : 1, zIndex: 5 }}
        playsInline
        muted={false}
        onLoadedData={() => {
          console.log('[AvatarDisplay] Bottom video loaded successfully');
          if (!topVideoActive) {
            setIsVideoLoaded(true);
          }
        }}
      />
    </Card>
  );
}