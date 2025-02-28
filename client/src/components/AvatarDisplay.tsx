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
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadVideoRef = useRef<HTMLVideoElement>(null);
  const hasInitialized = useRef<boolean>(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Handle main video playback
  useEffect(() => {
    if (videoRef.current && !hasInitialized.current && isAudioEnabled) {
      hasInitialized.current = true;
      console.log('[AvatarDisplay] Initializing video for first time');
      videoRef.current.play().catch(e => 
        console.error('[AvatarDisplay] Autoplay failed:', e)
      );
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      hasInitialized.current = false;
    };
  }, [videoFilename, isAudioEnabled]);

  // Preload next video when available
  useEffect(() => {
    if (nextVideoFilename && preloadVideoRef.current) {
      console.log(`[AvatarDisplay] Preloading next video: ${nextVideoFilename}`);
      // Setting src will trigger browser to preload the video
      preloadVideoRef.current.src = `../../videos/${nextVideoFilename}`;
      // We don't need to play it, just load it into cache
      preloadVideoRef.current.load();
    }
  }, [nextVideoFilename]);

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
    isVideoLoaded
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
      <video
        ref={videoRef}
        className="w-full h-full absolute inset-0"
        autoPlay
        playsInline
        src={`../../videos/${videoFilename}`}
        onError={(e) => console.error('[AvatarDisplay] Video loading error:', e)}
        onLoadStart={() => console.log('[AvatarDisplay] Video loading started')}
        onLoadedData={() => {
          console.log('[AvatarDisplay] Video loaded successfully');
          setIsVideoLoaded(true);
        }}
      />
      
      {/* Hidden video element for preloading the next video */}
      {nextVideoFilename && (
        <video 
          ref={preloadVideoRef}
          style={{ display: 'none' }} 
          preload="auto"
        />
      )}
    </Card>
  );
}