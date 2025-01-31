import { useEffect, useState } from 'react';
import { AudioModal } from '@/components/AudioModal';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { ChatInterface } from '@/components/ChatInterface';
import { Card } from '@/components/ui/card';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Config } from '@/lib/types';

export default function Home() {
  const [showAudioModal, setShowAudioModal] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const configId = searchParams.get('id');

  const { data: config } = useQuery<Config>({
    queryKey: ['/api/config', configId],
    queryFn: async () => {
      console.log('[Home] Page loaded');
      console.log('[Home] ConfigId from URL:', configId);
      let id = configId;
      
      if (!id) {
        console.log('[Home] No ID in query string, finding default');
        console.log('[Home] Fetching from /api/config/active');
        const response = await fetch('/api/config/active');
        console.log('[Home] Active config response status:', response.status);
        const data = await response.json();
        console.log('[Home] Active config raw response:', data);
        
        if (data.error) {
          console.error('[Home] Error loading active config:', data.error);
          throw new Error(data.error);
        }
        
        return data;
      }
      
      console.log(`[Home] Loading configuration ${id}`);
      const response = await fetch(`/api/config/${id}`);
      console.log('[Home] Config response status:', response.status);
      const data = await response.json();
      console.log(`[Home] Configuration ${id} raw response:`, data);
      
      if (data.error) {
        console.error('[Home] Error loading config:', data.error);
        throw new Error(data.error);
      }
      
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AudioModal 
        isOpen={showAudioModal} 
        onConfirm={() => {
          setShowAudioModal(false);
          setAudioEnabled(true);
        }}
        onExit={() => {
          window.location.href = "javascript:window.external.AddFavorite(location.href, document.title)";
        }}
      />

      <header className="fixed top-0 w-full bg-card/80 backdrop-blur-sm z-10 border-b">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-bold">{config?.pageTitle || 'West Linn AI Mastermind'}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-16 pb-24">
        <Card className="mt-4 p-4">
          <AvatarDisplay
            heygenSceneId={config?.heygenSceneId}
            isAudioEnabled={audioEnabled}
          />
          <ChatInterface 
            configId={config?.id}
            isAudioEnabled={audioEnabled}
          />
        </Card>
      </main>
    </div>
  );
}