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
  isLoading?: boolean;
}

export function ChatInterface({ configId, isEnabled, onSubmit, agentQuestion, isLoading }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [localProcessing, setLocalProcessing] = useState(false);
  
  // Component state tracking
  useEffect(() => {
    // Reset message and processing state when config changes
    setMessage('');
    setLocalProcessing(false);
  }, [configId]);

  // Clear local processing state when parent indicates loading is done
  useEffect(() => {
    if (!isLoading && localProcessing) {
      console.log('[ChatInterface] Parent loading complete, resetting local processing state');
      setLocalProcessing(false);
    }
  }, [isLoading, localProcessing]);

  const handleSubmit = async () => {
    if (!message.trim() || !isEnabled || localProcessing) return;

    try {
      console.log('[ChatInterface] Submitting message:', message);
      // Store the message for reference
      const userMessage = message;
      
      // Clear the input field immediately for better UX
      setMessage('');
      
      // Set local processing state to true
      setLocalProcessing(true);
      
      // Send the message to the parent component
      onSubmit(userMessage);
    } catch (error) {
      console.error('[ChatInterface] Error sending message:', error);
      setLocalProcessing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2">
      {/* Question Display Area */}
      <div className="min-h-[50px] p-3">
        {agentQuestion && isEnabled && (
          <div className="text-foreground text-base pb-2">
            {agentQuestion}
          </div>
        )}
      </div>

      {/* Message Input Area */}
      <div className="flex gap-2">
        <Textarea
          placeholder={(isLoading || localProcessing) ? "Processing your response..." : "Type your message..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (message.trim() && isEnabled && !isLoading && !localProcessing) {
                handleSubmit();
              }
            }
          }}
          className="resize-none"
          rows={2}
          disabled={!isEnabled || isLoading || localProcessing}
        />
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || !isEnabled || isLoading || localProcessing}
          size="icon"
          className="h-auto"
        >
          {(isLoading || localProcessing) ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <SendIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}