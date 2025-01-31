import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  response: string;
  messages: Message[];
  status: string;
}

interface ChatInterfaceProps {
  configId?: number;
  isAudioEnabled: boolean;
}

export function ChatInterface({ configId, isAudioEnabled }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  
  useEffect(() => {
    // Reset chat response when component mounts
    setChatResponse(null);
    // Send empty message to initialize new thread
    if (configId) {
      sendMessage.mutate('');
    }
  }, [configId]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', '/api/chat', {
        configId,
        message: content,
      });
      return res.json() as Promise<ChatResponse>;
    },
    onSuccess: (data) => {
      setMessage('');
      setChatResponse(data);
    },
  });

  return (
    <div className="flex flex-col space-y-2">
      {/* Response Display Area */}
      <ScrollArea className="min-h-[80px] max-h-[160px] rounded-md border p-3">
        {chatResponse?.response ? (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-1">AI Response:</p>
            <p className="whitespace-pre-wrap text-sm">{chatResponse.response}</p>
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-2">
            No messages yet. Start a conversation!
          </div>
        )}
      </ScrollArea>

      {/* Message Input Area */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none"
          rows={2}
        />
        <Button
          onClick={() => sendMessage.mutate(message)}
          disabled={!message.trim() || sendMessage.isPending || !isAudioEnabled}
          size="icon"
          className="h-auto"
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}