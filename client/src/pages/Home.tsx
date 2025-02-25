import { useEffect, useState } from "react";
import { AudioModal } from "@/components/AudioModal";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { ChatInterface } from "@/components/ChatInterface";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Config, ConversationFlow } from "@/lib/types";

// API request helper function
const apiRequest = async (method: string, url: string, body?: any) => {
  console.log(`[API Request] ${method} ${url}`, body ? { body } : '');
  
  try {
    const fullUrl = url.startsWith("/api/") ? url : `/api${url}`;
    const response = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    console.log(`[API Response] Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Error] ${response.status}: ${errorText || "Unknown error"}`);
      throw new Error(errorText || `API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[API Response] Data:`, data);
    return data;
  } catch (error) {
    console.error(`[API Error] Failed to ${method} ${url}:`, error);
    throw error;
  }
};

export default function Home() {
  const queryClient = useQueryClient();
  const [currentFlow, setCurrentFlow] = useState<ConversationFlow | null>(null);
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Reset audio confirmation on mount
  useEffect(() => {
    queryClient.setQueryData(["audioConfirmed"], false);
    sessionStorage.removeItem("audioConfirmed");
  }, []);

  // Get config ID from URL or use null to fetch default
  const searchParams = new URLSearchParams(window.location.search);
  const configId = searchParams.get("id");

  // Fetch configuration
  const { data: config } = useQuery<Config>({
    queryKey: [
      configId
        ? `/api/configurations/${configId}`
        : "/api/configurations/active",
    ],
    queryFn: () =>
      apiRequest(
        "GET",
        configId
          ? `/api/configurations/${configId}`
          : "/api/configurations/active",
      ),
  });

  // Fetch conversation flows for the config
  const { data: flows } = useQuery<ConversationFlow[]>({
    queryKey: ["/api/conversation-flows", config?.id],
    queryFn: () =>
      config?.id
        ? apiRequest("GET", `/api/conversation-flows?config_id=${config.id}`)
        : Promise.resolve([]),
    enabled: !!config?.id,
  });

  // Initialize with first flow when flows are loaded
  useEffect(() => {
    if (flows?.length && !currentFlow) {
      const firstFlow = flows[0];
      console.log("[Home] Setting initial flow:", firstFlow);
      setCurrentFlow(firstFlow);
      // Reset input state for new flow
      setIsInputEnabled(false);
      if (firstFlow.input_delay > 0) {
        setTimeout(() => setIsInputEnabled(true), firstFlow.input_delay * 1000);
      } else {
        setIsInputEnabled(true);
      }
    }
  }, [flows, currentFlow]);

  console.log("[Home] Current flow:", currentFlow);

  // State to hold the current chat response and loading state
  const [currentResponse, setCurrentResponse] = useState<{ response: string; status: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUserResponse = async (message: string) => {
    if (!currentFlow || !config) return;

    try {
      console.log("[Home] Sending user response to API:", message);
      
      // Clear any previous response and set loading state
      setCurrentResponse(null);
      setIsLoading(true);
      
      // Make the API request to OpenAI
      const data = await apiRequest("POST", "/api/openai/chat", {
        system_prompt: currentFlow.system_prompt,
        agent_question: currentFlow.agent_question,
        user_message: message,
      });
      
      console.log("[Home] Received response from API:", data);
      
      // Clear loading state and set the response for display
      setIsLoading(false);
      setCurrentResponse(data);

      if (data.status === "pass" || data.status === "fail") {
        console.log(`[Home] Response status: ${data.status}`);
        
        const nextFlowOrder =
          data.status === "pass"
            ? currentFlow.pass_next
            : currentFlow.fail_next;

        if (nextFlowOrder == null) {
          console.log("[Home] End of conversation. No next flow.");
          setCurrentFlow(null);
          return;
        }

        const nextFlow = flows?.find((f) => f.order === nextFlowOrder);
        if (nextFlow) {
          console.log("[Home] Moving to next flow:", nextFlow);
          // Add a slight delay before moving to next flow so user can see the response
          setTimeout(() => {
            setCurrentFlow(nextFlow);
            setIsInputEnabled(false);
            setCurrentResponse(null); // Clear response when switching flows
            if (nextFlow.input_delay > 0) {
              setTimeout(
                () => setIsInputEnabled(true),
                nextFlow.input_delay * 1000,
              );
            } else {
              setIsInputEnabled(true);
            }
          }, 2000); // 2 second delay
        } else {
          console.error("[Home] Next flow not found:", nextFlowOrder);
        }
      }
    } catch (error) {
      console.error("[Home] Error processing response:", error);
      setIsLoading(false);
      setCurrentResponse({
        response: "Sorry, there was an error processing your message. Please try again.",
        status: "error"
      });
    }
  };

  console.log("[Home] Render state:", {
    currentFlow,
    shouldShowChat: !currentFlow?.video_only && currentFlow?.system_prompt,
    isInputEnabled,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AudioModal
        isOpen={showAudioModal}
        onConfirm={() => {
          setShowAudioModal(false);
          setAudioEnabled(true);
          localStorage.setItem("audioConfirmed", "true");
        }}
        onExit={() => {
          window.location.href = "/";
        }}
      />

      <header className="fixed top-0 w-full bg-card/80 backdrop-blur-sm z-10 border-b">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-bold">
            {config?.page_title || "AI Conversation"}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-16 pb-24">
        <Card className="mt-4 p-4">
          <AvatarDisplay
            videoFilename={currentFlow?.video_filename}
            isAudioEnabled={audioEnabled}
          />
          {!currentFlow?.video_only && currentFlow?.system_prompt && (
            <ChatInterface
              isEnabled={isInputEnabled && !isLoading}
              onSubmit={handleUserResponse}
              configId={config?.id}
              agentQuestion={currentFlow?.agent_question}
              isLoading={isLoading}
              chatResponse={currentResponse ? 
                {
                  response: currentResponse.response,
                  messages: [],
                  status: currentResponse.status
                } : null}
            />
          )}
          {currentFlow?.show_form && (
            <div className="mt-4">
              {/* Dynamic form component will be rendered here */}
              {currentFlow.form_name && (
                <div className="text-center text-muted-foreground">
                  Form placeholder: {currentFlow.form_name}
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
