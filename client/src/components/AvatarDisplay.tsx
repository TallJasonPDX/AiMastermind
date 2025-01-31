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

  // Create URL with authorization
  const avatarUrl = new URL(`https://api.heygen.com/v1/avatar/${avatarId}/stream`);
  avatarUrl.searchParams.set('key', import.meta.env.VITE_HEYGEN_API_KEY);

  return (
    <Card className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
      <iframe
        key={avatarId} // Force iframe refresh when avatarId changes
        src={avatarUrl.toString()}
        className="w-full h-full absolute inset-0"
        allow="autoplay; microphone"
        style={{ border: 'none' }}
      />
    </Card>
  );
}