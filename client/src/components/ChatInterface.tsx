import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
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

interface ChatInterfaceProps {
  configId?: number;
  isAudioEnabled: boolean;
}

export function ChatInterface({ configId, isAudioEnabled }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  // Fetch chat history
  const { data: chatHistory } = useQuery<{ messages: Message[], status: string }>({
    queryKey: [`/api/chat?configId=${configId}`, configId],
    enabled: !!configId,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', '/api/chat', {
        configId,
        message: content,
      });
      return res.json();
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: [`/api/chat?configId=${configId}`, configId] });
    },
  });

  // Get the latest assistant message
  const latestAssistantMessage = chatHistory?.messages
    ?.filter(msg => msg.role === 'assistant')
    ?.slice(-1)[0];

  return (
    <div className="flex flex-col space-y-4">
      {/* Response Display Area */}
      <ScrollArea className="h-[300px] rounded-md border p-4">
        {latestAssistantMessage ? (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">AI Response:</p>
              <p className="whitespace-pre-wrap">{latestAssistantMessage.content}</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            No messages yet. Start a conversation!
          </div>
        )}
      </ScrollArea>

      {/* Message Input Area */}
      <div className="flex gap-2 mt-4">
        <Textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none"
          rows={3}
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