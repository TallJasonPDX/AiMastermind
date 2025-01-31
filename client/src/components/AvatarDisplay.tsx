import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  heygenSceneId?: string;
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

  const apiKey = import.meta.env.VITE_HEYGEN_API_KEY;
  if (!apiKey) {
    console.error('Missing HeyGen API key');
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <p className="text-white">Error: Missing API key</p>
      </Card>
    );
  }

  // Create URL with authorization and streaming parameters
  const avatarUrl = new URL(`https://api.heygen.com/v1/avatar/${avatarId}/stream`);
  avatarUrl.searchParams.set('key', apiKey);
  avatarUrl.searchParams.set('mode', 'stream');
  avatarUrl.searchParams.set('streaming', 'true');
  avatarUrl.searchParams.set('format', 'video');
  avatarUrl.searchParams.set('quality', 'high');

  console.log('Attempting to load avatar with ID:', avatarId);

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