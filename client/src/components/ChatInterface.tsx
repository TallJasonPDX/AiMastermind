import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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
  const { data: chatHistory } = useQuery<{ messages: Message[] }>({
    queryKey: [`/api/chat?configId=${configId}`, configId],
    enabled: !!configId,
  });

  // Get the latest assistant message
  const latestAssistantMessage = chatHistory?.messages
    ?.filter(msg => msg.role === 'assistant')
    ?.slice(-1)[0];

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

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        {/* Latest response display */}
        {latestAssistantMessage && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">AI Response:</p>
            <p>{latestAssistantMessage.content}</p>
          </div>
        )}

        {/* Message input */}
        <div className="flex gap-2">
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
      </CardContent>
    </Card>
  );
}