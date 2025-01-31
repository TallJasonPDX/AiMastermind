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

  return (
    <Card className="w-full aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        src={`https://api.heygen.com/v1/avatar/${avatarId}/stream`}
        className="w-full h-full"
        allow="autoplay; microphone"
        style={{ border: 'none' }}
      />
    </Card>
  );
}
