
import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  videoFilename?: string;
  isAudioEnabled: boolean;
}

export function AvatarDisplay({ videoFilename, isAudioEnabled }: AvatarDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoRef.current && videoFilename && isAudioEnabled && !isPlaying) {
      setIsPlaying(true);
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          console.error('[AvatarDisplay] Playback error:', e);
          setIsPlaying(false);
        });
      }

      // Reset playing state when video ends
      videoRef.current.onended = () => setIsPlaying(false);
    }
  }, [videoFilename, isAudioEnabled, isPlaying]);

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
        playsInline
        src={`/videos/${videoFilename}`}
        onError={(e) => console.error('[AvatarDisplay] Video loading error:', e)}
      />
    </Card>
  );
}
