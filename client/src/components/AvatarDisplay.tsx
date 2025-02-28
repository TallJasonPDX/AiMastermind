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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | undefined>(videoFilename);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const [secondaryVideoOpacity, setSecondaryVideoOpacity] = useState(0);
  
  // Initial video setup
  useEffect(() => {
    if (primaryVideoRef.current && !hasInitialized.current && isAudioEnabled) {
      hasInitialized.current = true;
      console.log('[AvatarDisplay] Initializing video for first time');
      primaryVideoRef.current.play().catch(e => 
        console.error('[AvatarDisplay] Autoplay failed:', e)
      );
    }
    
    return () => {
      if (primaryVideoRef.current) {
        primaryVideoRef.current.pause();
        primaryVideoRef.current.currentTime = 0;
      }
      if (secondaryVideoRef.current) {
        secondaryVideoRef.current.pause();
        secondaryVideoRef.current.currentTime = 0;
      }
      hasInitialized.current = false;
    };
  }, [isAudioEnabled]);

  // Handle video filename changes with immediate swap
  useEffect(() => {
    // Skip on initial render or if no audio enabled
    if (!isAudioEnabled || !videoFilename || activeVideoSrc === videoFilename) {
      return;
    }
    
    console.log(`[AvatarDisplay] Video source changing to: ${videoFilename}`);
    
    // Start transition process
    setIsTransitioning(true);
    
    // Set the new video as the secondary video
    if (secondaryVideoRef.current) {
      secondaryVideoRef.current.src = `../../videos/${videoFilename}`;
      secondaryVideoRef.current.load();
      
      // Once the secondary video is loaded, do the immediate swap
      secondaryVideoRef.current.onloadeddata = () => {
        console.log('[AvatarDisplay] Secondary video loaded, performing immediate swap');
        
        // Play the secondary video
        secondaryVideoRef.current?.play().catch(e => 
          console.error('[AvatarDisplay] Secondary video autoplay failed:', e)
        );
        
        // Immediately swap visibility
        setVideoOpacity(0); // Hide primary video
        setSecondaryVideoOpacity(1); // Show secondary video
        
        // Immediately update the primary video
        if (primaryVideoRef.current) {
          // Set the new active source
          setActiveVideoSrc(videoFilename);
          
          // Reset the primary video with the new source
          primaryVideoRef.current.src = `../../videos/${videoFilename}`;
          primaryVideoRef.current.load();
          primaryVideoRef.current.play().catch(e => 
            console.error('[AvatarDisplay] New primary video autoplay failed:', e)
          );
          
          // Reset opacities
          setVideoOpacity(1);
          setSecondaryVideoOpacity(0);
          
          // End transition state
          setIsTransitioning(false);
          
          console.log('[AvatarDisplay] Video swap complete');
        }
      };
    }
  }, [videoFilename, isAudioEnabled, activeVideoSrc]);

  // Preload next video when available
  useEffect(() => {
    if (nextVideoFilename && !isTransitioning) {
      console.log(`[AvatarDisplay] Preloading next video: ${nextVideoFilename}`);
      
      // Create a temp element just for preloading
      const tempVideo = document.createElement('video');
      tempVideo.style.display = 'none';
      tempVideo.preload = 'auto';
      tempVideo.src = `../../videos/${nextVideoFilename}`;
      tempVideo.load();
      
      // Remove the element after preloading
      tempVideo.onloadeddata = () => {
        console.log(`[AvatarDisplay] Successfully preloaded video: ${nextVideoFilename}`);
        document.body.removeChild(tempVideo);
      };
      
      // Add to DOM temporarily
      document.body.appendChild(tempVideo);
    }
  }, [nextVideoFilename, isTransitioning]);

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
        autoPlay
        playsInline
        src={`../../videos/${activeVideoSrc}`}
        onError={(e) => console.error('[AvatarDisplay] Primary video loading error:', e)}
        onLoadStart={() => console.log('[AvatarDisplay] Primary video loading started')}
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