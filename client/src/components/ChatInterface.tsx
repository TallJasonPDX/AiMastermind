import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ScrollArea } from "@/components/ui/scroll-area";

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
    queryKey: ['/api/chat', configId],
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
      queryClient.invalidateQueries({ queryKey: ['/api/chat', configId] });
    },
  });

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        {/* Messages display */}
        <ScrollArea className="h-[300px] mb-4 pr-4">
          <div className="space-y-4">
            {chatHistory?.messages?.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

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