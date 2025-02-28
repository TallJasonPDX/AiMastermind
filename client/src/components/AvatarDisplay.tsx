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
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const hasInitialized = useRef<boolean>(false);
  const initialVideoLoaded = useRef<boolean>(false);
  const preloadCache = useRef<Set<string>>(new Set());
  
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | undefined>(videoFilename);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const [secondaryVideoOpacity, setSecondaryVideoOpacity] = useState(0);
  
  // Set up initial video on first render
  useEffect(() => {
    // Only run this once on initial mount
    if (!initialVideoLoaded.current && primaryVideoRef.current && videoFilename) {
      initialVideoLoaded.current = true;
      console.log('[AvatarDisplay] Setting up initial video source:', videoFilename);
      
      // Set the initial video source without loading/playing yet 
      // (will play when audio is enabled)
      setActiveVideoSrc(videoFilename);
      
      // Add to preload cache to prevent duplicated preloading
      if (videoFilename) preloadCache.current.add(videoFilename);
    }
    
    // Cleanup when component unmounts
    return () => {
      if (primaryVideoRef.current) {
        primaryVideoRef.current.pause();
        primaryVideoRef.current.src = '';
      }
      if (secondaryVideoRef.current) {
        secondaryVideoRef.current.pause();
        secondaryVideoRef.current.src = '';
      }
    };
  }, [videoFilename]);

  // Handle playing the video when audio is enabled
  useEffect(() => {
    if (isAudioEnabled && primaryVideoRef.current && !hasInitialized.current && activeVideoSrc) {
      hasInitialized.current = true;
      console.log('[AvatarDisplay] Audio enabled, playing video for first time');
      
      // Play the primary video now that audio is enabled
      primaryVideoRef.current.play().catch(e => 
        console.error('[AvatarDisplay] Autoplay failed:', e)
      );
    }
  }, [isAudioEnabled, activeVideoSrc]);

  // Handle video filename changes with crossfade transition
  useEffect(() => {
    // Skip on initial render, if no audio enabled, or if it's the same video
    if (!videoFilename || !isAudioEnabled || videoFilename === activeVideoSrc || isTransitioning) {
      return;
    }
    
    console.log(`[AvatarDisplay] Video source changing to: ${videoFilename}`);
    
    // Start transition process
    setIsTransitioning(true);
    
    // Set the new video as the secondary video
    if (secondaryVideoRef.current) {
      // Only set source if we don't already have this video loaded
      secondaryVideoRef.current.src = `../../videos/${videoFilename}`;
      secondaryVideoRef.current.load();
      
      // Once the secondary video is loaded, start the crossfade
      secondaryVideoRef.current.onloadeddata = () => {
        console.log('[AvatarDisplay] Secondary video loaded, starting crossfade');
        
        // Play the secondary video
        secondaryVideoRef.current?.play().catch(e => 
          console.error('[AvatarDisplay] Secondary video autoplay failed:', e)
        );
        
        // Start crossfade animation
        // Fade out primary video
        setVideoOpacity(0);
        // Fade in secondary video
        setSecondaryVideoOpacity(1);
        
        // After transition completes, make secondary the new primary
        setTimeout(() => {
          // Set the new active source
          setActiveVideoSrc(videoFilename);
          
          // End transition state
          setIsTransitioning(false);
          
          // Reset opacities for next transition
          setVideoOpacity(1);
          setSecondaryVideoOpacity(0);
          
          console.log('[AvatarDisplay] Crossfade complete, videos swapped');
        }, 500); // Duration of crossfade
      };
    }
  }, [videoFilename, isAudioEnabled, activeVideoSrc, isTransitioning]);

  // Preload next video when available
  useEffect(() => {
    if (!nextVideoFilename || isTransitioning || !isAudioEnabled) {
      return;
    }
    
    // Check if we've already preloaded this video
    if (preloadCache.current.has(nextVideoFilename)) {
      console.log(`[AvatarDisplay] Video already preloaded: ${nextVideoFilename}`);
      return;
    }
    
    console.log(`[AvatarDisplay] Preloading next video: ${nextVideoFilename}`);
    preloadCache.current.add(nextVideoFilename);
    
    // Use fetch to preload the video instead of creating a video element
    fetch(`../../videos/${nextVideoFilename}`)
      .then(response => {
        if (response.ok) {
          console.log(`[AvatarDisplay] Successfully preloaded: ${nextVideoFilename}`);
        } else {
          console.error(`[AvatarDisplay] Failed to preload: ${nextVideoFilename}`);
        }
      })
      .catch(error => {
        console.error(`[AvatarDisplay] Error preloading: ${nextVideoFilename}`, error);
      });
  }, [nextVideoFilename, isTransitioning, isAudioEnabled]);

  // Handle video loaded callback
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
      {/* Primary video */}
      <video
        ref={primaryVideoRef}
        className="w-full h-full absolute inset-0 transition-opacity duration-500"
        style={{ opacity: videoOpacity }}
        autoPlay={isAudioEnabled}
        playsInline
        src={`../../videos/${activeVideoSrc}`}
        onError={(e) => console.error('[AvatarDisplay] Primary video loading error:', e)}
        onLoadedData={() => {
          console.log('[AvatarDisplay] Primary video loaded successfully');
          setIsVideoLoaded(true);
        }}
      />
      
      {/* Secondary video for crossfade transitions */}
      <video
        ref={secondaryVideoRef}
        className="w-full h-full absolute inset-0 transition-opacity duration-500"
        style={{ opacity: secondaryVideoOpacity }}
        playsInline
      />
    </Card>
  );
}