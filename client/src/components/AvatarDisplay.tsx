import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  heygenSceneId?: string;
  isAudioEnabled: boolean;
}

export function AvatarDisplay({ heygenSceneId, isAudioEnabled }: AvatarDisplayProps) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeStream() {
      if (!heygenSceneId || !isAudioEnabled) return;

      const apiKey = import.meta.env.VITE_HEYGEN_API_KEY;
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        console.error('Invalid or missing HeyGen API key');
        setError('Missing or invalid HeyGen API key configuration');
        return;
      }

      try {
        const response = await fetch('https://api.heygen.com/v2/streaming/sessions', {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            template_id: heygenSceneId,
            voice_id: 'en-US-Neural2-C', // Default voice ID, you might want to make this configurable
            text: 'Hello! I am ready to chat.',
            livekit_room: `room_${heygenSceneId}`,
            livekit_identity: `user_${Date.now()}`
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({message: response.statusText})); //Attempt to get error details
          throw new Error(`HeyGen API error: ${errorData.message || response.statusText} (${response.status})`);
        }

        const data = await response.json();
        setStreamUrl(data.stream_url);
      } catch (err) {
        const errorDetails = err instanceof Error ? err.message : JSON.stringify(err);
        console.error(`[HeyGen API] Stream initialization failed: ${errorDetails}`);
        console.error('[HeyGen API] Full error:', err);
        setError('Failed to initialize avatar stream. Please check your API key and network connection.');
      }
    }

    initializeStream();
  }, [heygenSceneId, isAudioEnabled]);

  if (!heygenSceneId) {
    return <Skeleton className="w-full aspect-video rounded-lg" />;
  }

  if (!isAudioEnabled) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <p className="text-white">Please enable audio to interact with the avatar</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <p className="text-white">{error}</p>
      </Card>
    );
  }

  if (!streamUrl) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <p className="text-white">Initializing avatar...</p>
      </Card>
    );
  }

  return (
    <Card className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
      <iframe
        src={streamUrl}
        className="w-full h-full absolute inset-0"
        allow="autoplay; microphone"
        style={{ border: 'none' }}
      />
    </Card>
  );
}