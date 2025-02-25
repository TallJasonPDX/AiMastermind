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
  isEnabled: boolean;
  onSubmit: (message: string) => void;
  agentQuestion?: string;
  chatResponse?: ChatResponse | null;
}

export function ChatInterface({ configId, isEnabled, onSubmit, agentQuestion, chatResponse: externalChatResponse }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const [internalChatResponse, setInternalChatResponse] = useState<ChatResponse | null>(null);
  
  // Use either the external chat response from props or the internal state
  const chatResponse = externalChatResponse || internalChatResponse;

  useEffect(() => {
    // Reset internal chat response when component mounts or configId changes
    setInternalChatResponse(null);
  }, [configId]);
  
  // Update internal state when external prop changes
  useEffect(() => {
    if (externalChatResponse) {
      console.log('[ChatInterface] Received chat response:', externalChatResponse);
      setInternalChatResponse(null); // Clear any internal state
    }
  }, [externalChatResponse]);

  const handleSubmit = async () => {
    if (!message.trim() || !isEnabled) return;

    try {
      console.log('[ChatInterface] Submitting message:', message);
      // Store the message for reference
      const userMessage = message;
      
      // Clear the input field immediately for better UX
      setMessage('');
      
      // Send the message to the parent component
      onSubmit(userMessage);
    } catch (error) {
      console.error('[ChatInterface] Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      {/* Response Display Area */}
      <ScrollArea className="min-h-[80px] max-h-[160px] rounded-md border p-3">
        {chatResponse?.response ? (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-1">AI Response:</p>
            <p className="whitespace-pre-wrap text-sm">{chatResponse.response}</p>
          </div>
        ) : isEnabled && agentQuestion ? (
          <div className="text-center text-muted-foreground text-sm py-2">
            {agentQuestion}
          </div>
        ) : null}
      </ScrollArea>

      {/* Message Input Area */}
      <div className="flex gap-2">
        <Textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none"
          rows={2}
          disabled={!isEnabled}
        />
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || !isEnabled}
          size="icon"
          className="h-auto"
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}