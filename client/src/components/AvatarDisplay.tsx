
import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  videoFilename?: string;
  isAudioEnabled: boolean;
}

export function AvatarDisplay({ videoFilename, isAudioEnabled }: AvatarDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasInitialized = useRef<boolean>(false);

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

  console.log('[AvatarDisplay] Rendering with props:', { videoFilename, isAudioEnabled });

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
        controls
        autoPlay
        playsInline
        src={`/videos/${videoFilename}`}
        onError={(e) => console.error('[AvatarDisplay] Video loading error:', e)}
        onLoadStart={() => console.log('[AvatarDisplay] Video loading started')}
        onLoadedData={() => console.log('[AvatarDisplay] Video loaded successfully')}
      />
    </Card>
  );
}
