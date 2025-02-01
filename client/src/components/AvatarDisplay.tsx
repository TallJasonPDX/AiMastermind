import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AvatarDisplayProps {
  heygenSceneId?: string;
  voiceId?: string;
  isAudioEnabled: boolean;
}

export function AvatarDisplay({ heygenSceneId, isAudioEnabled }: AvatarDisplayProps) {
  console.log('[AvatarDisplay] Rendering with props:', { heygenSceneId, isAudioEnabled });
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[AvatarDisplay] Effect triggered with:', { heygenSceneId, isAudioEnabled });
    async function initializeStream() {
      console.log('[AvatarDisplay] Initializing stream');
      if (!heygenSceneId || !isAudioEnabled) return;

      const apiKey = import.meta.env.VITE_HEYGEN_API_KEY;
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        console.error('Invalid or missing HeyGen API key');
        setError('Missing or invalid HeyGen API key configuration');
        return;
      }

      try {
        console.log('[AvatarDisplay] Making HeyGen API request with key:', apiKey ? 'Present' : 'Missing');
        const response = await fetch('/api/heygen/streaming/sessions', {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            template_id: heygenSceneId,
            voice_id: voiceId || '9d7ba6d68d2940579a07c4a0d934f914',
            text: 'Hello! I am ready to chat.',
            livekit_room: `room_${heygenSceneId}`,
            livekit_identity: `user_${Date.now()}`
          })
        });

          if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            console.error('[HeyGen API] Request failed:', {
              status: response.status,
              statusText: response.statusText,
              error: errorText
            });
            throw new Error(`API request failed: ${response.status} ${errorText}`);
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