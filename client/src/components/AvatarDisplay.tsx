import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  videoFilename?: string;
  isAudioEnabled: boolean;
}

export function AvatarDisplay({ videoFilename, isAudioEnabled }: AvatarDisplayProps) {
  const currentVideoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const hasInitialized = useRef<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [nextSrc, setNextSrc] = useState<string | null>(null);
  const [isNextVideoReady, setIsNextVideoReady] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Set up the next video when videoFilename changes
  useEffect(() => {
    if (!videoFilename || !isAudioEnabled) return;
    
    const newSrc = `../../videos/${videoFilename}`;
    
    if (!currentSrc) {
      // First video load
      setCurrentSrc(newSrc);
    } else if (newSrc !== currentSrc && newSrc !== nextSrc) {
      // New video requested, prepare it in the background
      console.log('[AvatarDisplay] Preparing next video:', videoFilename);
      setNextSrc(newSrc);
      setIsNextVideoReady(false);
    }
  }, [videoFilename, isAudioEnabled]);

  // Handle initial video playback
  useEffect(() => {
    if (currentVideoRef.current && !hasInitialized.current && isAudioEnabled && currentSrc) {
      hasInitialized.current = true;
      console.log('[AvatarDisplay] Initializing first video');
      currentVideoRef.current.play().catch(e => 
        console.error('[AvatarDisplay] Autoplay failed:', e)
      );
    }
  }, [currentSrc, isAudioEnabled]);

  // Handle the transition when next video is loaded
  useEffect(() => {
    if (isNextVideoReady && nextVideoRef.current && nextSrc) {
      console.log('[AvatarDisplay] Transitioning to next video');
      setIsTransitioning(true);
      
      // Start playing the next video
      nextVideoRef.current.play()
        .then(() => {
          // Once next video is playing, swap the videos
          setCurrentSrc(nextSrc);
          setNextSrc(null);
          setIsNextVideoReady(false);
          setIsTransitioning(false);
        })
        .catch(e => {
          console.error('[AvatarDisplay] Failed to play next video:', e);
          setIsTransitioning(false);
        });
    }
  }, [isNextVideoReady, nextSrc]);

  // Handle cleanup
  useEffect(() => {
    return () => {
      if (currentVideoRef.current) {
        currentVideoRef.current.pause();
        currentVideoRef.current.currentTime = 0;
      }
      if (nextVideoRef.current) {
        nextVideoRef.current.pause();
        nextVideoRef.current.currentTime = 0;
      }
      hasInitialized.current = false;
    };
  }, []);

  console.log('[AvatarDisplay] Rendering with props:', { 
    videoFilename, 
    isAudioEnabled,
    currentSrc,
    nextSrc,
    isNextVideoReady
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
      {/* Current visible video */}
      {currentSrc && (
        <video
          ref={currentVideoRef}
          className="w-full h-full absolute inset-0"
          autoPlay
          playsInline
          src={currentSrc}
          onError={(e) => console.error('[AvatarDisplay] Current video loading error:', e)}
          onLoadStart={() => console.log('[AvatarDisplay] Current video loading started')}
          onLoadedData={() => console.log('[AvatarDisplay] Current video loaded successfully')}
        />
      )}
      
      {/* Hidden video preloading the next content */}
      {nextSrc && (
        <video
          ref={nextVideoRef}
          className="w-full h-full absolute inset-0 opacity-0"
          playsInline
          src={nextSrc}
          preload="auto"
          onError={(e) => console.error('[AvatarDisplay] Next video loading error:', e)}
          onLoadStart={() => console.log('[AvatarDisplay] Next video loading started')}
          onLoadedData={() => {
            console.log('[AvatarDisplay] Next video loaded successfully');
            setIsNextVideoReady(true);
          }}
        />
      )}
    </Card>
  );
}