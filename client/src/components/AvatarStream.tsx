import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Room, RoomEvent, RemoteParticipant, RemoteTrackPublication, Track } from 'livekit-client';

interface StreamingSession {
  room_name: string;
  token: string;
  socket_url: string;
  voice_id: string;
}

export function AvatarStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const roomRef = useRef<Room | null>(null);

  const { data: session, isError, isLoading } = useQuery<StreamingSession>({
    queryKey: ['/api/heygen/streaming/sessions'],
    retry: 1,
  });

  useEffect(() => {
    if (!session || !videoRef.current) return;

    const connectToRoom = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        room
          .on(RoomEvent.TrackSubscribed, (track: any, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            if (track.kind === Track.Kind.Video && videoRef.current) {
              track.attach(videoRef.current);
            }
          })
          .on(RoomEvent.TrackUnsubscribed, (track: any) => {
            track.detach();
          })
          .on(RoomEvent.ConnectionStateChanged, (state: any) => {
            if (state === 'disconnected' || state === 'failed') {
              setError('Connection lost. Please refresh the page to reconnect.');
            }
          });

        await room.connect(session.socket_url, session.token);
        roomRef.current = room;
        setIsConnecting(false);
      } catch (err) {
        console.error('Failed to connect to room:', err);
        setError('Failed to connect to streaming service. Please try again.');
        setIsConnecting(false);
      }
    };

    connectToRoom();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [session]);

  if (isLoading || isConnecting) {
    return <div className="flex items-center justify-center min-h-[300px]">Loading avatar...</div>;
  }

  if (isError || error) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-red-500">
        {error || 'Failed to load avatar streaming. Please refresh the page.'}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video max-w-2xl mx-auto">
      <video 
        ref={videoRef}
        className="w-full h-full object-cover rounded-lg"
        autoPlay
        playsInline
      />
    </div>
  );
}
