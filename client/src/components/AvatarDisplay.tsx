import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  videoFilename?: string;
  isAudioEnabled: boolean;
}

export function AvatarDisplay({ videoFilename, isAudioEnabled }: AvatarDisplayProps) {
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
        ref={(el) => {
          if (el) {
            el.load(); // Force reload when src changes
            const playPromise = el.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => console.error('[AvatarDisplay] Playback error:', e));
            }
          }
        }}
        className="w-full h-full absolute inset-0"
        controls
        playsInline
        src={`/videos/${videoFilename}`}
        onError={(e) => console.error('[AvatarDisplay] Video loading error:', e)}
        onLoadStart={() => console.log('[AvatarDisplay] Video loading started')}
        onLoadedData={() => console.log('[AvatarDisplay] Video loaded successfully')}
      />
    </Card>
  );
}