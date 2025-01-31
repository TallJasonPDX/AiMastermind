import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  avatarId?: string;
  isAudioEnabled: boolean;
}

export function AvatarDisplay({ avatarId, isAudioEnabled }: AvatarDisplayProps) {
  if (!avatarId) {
    return (
      <Skeleton className="w-full aspect-video rounded-lg" />
    );
  }

  // Only show iframe when audio is enabled
  if (!isAudioEnabled) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <p className="text-white">Please enable audio to interact with the avatar</p>
      </Card>
    );
  }

  return (
    <Card className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
      <iframe
        key={avatarId} // Force iframe refresh when avatarId changes
        src={`https://api.heygen.com/v1/avatar/${avatarId}/stream`}
        className="w-full h-full absolute inset-0"
        allow="autoplay; microphone"
        style={{ border: 'none' }}
      />
    </Card>
  );
}