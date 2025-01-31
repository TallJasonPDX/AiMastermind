import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendIcon } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ChatInterfaceProps {
  configId?: number;
  isAudioEnabled: boolean;
}

export function ChatInterface({ configId, isAudioEnabled }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

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
    <Card className="mt-4 p-4">
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
    </Card>
  );
}
