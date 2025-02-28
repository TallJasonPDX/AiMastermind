// client/src/pages/Home.tsx
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioModal } from "@/components/AudioModal";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { ChatInterface } from "@/components/ChatInterface";
import { Card } from "@/components/ui/card";
import type { Config, ConversationFlow } from "@/lib/types";
import FormRenderer from "@/components/forms/FormRenderer";

// API request helper function
const apiRequest = async (method: string, url: string, body?: any) => {
  console.log(`[API Request] ${method} ${url} - Original URL`, url);
  console.log(`[API Request] Body:`, body);

  try {
    // Add /api prefix to all URLs - Express will handle the proxy logic
    const fullUrl = url.startsWith("/api") ? url : `/api${url}`;
    console.log(`[API Request] Processed URL:`, fullUrl);

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
      console.error(
        `[API Error] ${response.status}: ${errorText || "Unknown error"}`,
      );
      throw new Error(
        errorText || `API request failed with status ${response.status}`,
      );
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
    console.log("[Home] Component mounted - Resetting audio confirmation");
    queryClient.setQueryData(["audioConfirmed"], false);
    sessionStorage.removeItem("audioConfirmed");
  }, []);

  // Get config ID from URL or use null to fetch default
  const searchParams = new URLSearchParams(window.location.search);
  const configId = searchParams.get("id");
  console.log("[Home] Config ID from URL:", configId || "Not provided, will use default");

  // Fetch configuration
  const { data: config, isLoading: configLoading, error: configError } = useQuery<Config>({
    queryKey: [
      configId ? `/configurations/${configId}` : "/configurations/active",
    ],
    queryFn: () => {
      console.log("[Home] Fetching configuration:", configId ? `ID ${configId}` : "active (default)");
      return apiRequest(
        "GET",
        configId ? `/configurations/${configId}` : "/configurations/active",
      );
    },
    onSuccess: (data) => {
      console.log("[Home] Configuration loaded successfully:", data);
    },
    onError: (err) => {
      console.error("[Home] Error loading configuration:", err);
    }
  });

  // Fetch conversation flows for the config
  const { data: flows, isLoading: flowsLoading, error: flowsError } = useQuery<ConversationFlow[]>({
    queryKey: ["/conversation-flows", config?.id],
    queryFn: () => {
      if (config?.id) {
        console.log(`[Home] Fetching conversation flows for config ID ${config.id}`);
        return apiRequest("GET", `/conversation-flows?config_id=${config.id}`);
      } else {
        console.log("[Home] No config ID available, skipping flows fetch");
        return Promise.resolve([]);
      }
    },
    enabled: !!config?.id,
    onSuccess: (data) => {
      console.log(`[Home] Loaded ${data?.length || 0} conversation flows:`, data);
    },
    onError: (err) => {
      console.error("[Home] Error loading conversation flows:", err);
    }
  });

  // Initialize with first flow when flows are loaded
  useEffect(() => {
    console.log("[Home] Flow dependency changed:", { 
      flowsAvailable: !!flows?.length, 
      flowsCount: flows?.length || 0,
      currentFlowExists: !!currentFlow,
      currentFlowId: currentFlow?.id
    });
    
    if (flows?.length && !currentFlow) {
      const firstFlow = flows[0];
      console.log("[Home] Setting initial flow:", firstFlow);
      setCurrentFlow(firstFlow);
      
      // Reset input state for new flow
      setIsInputEnabled(false);
      console.log("[Home] Input initially disabled for new flow");
      
      if (firstFlow.input_delay > 0) {
        console.log(`[Home] Setting input delay timer for ${firstFlow.input_delay} seconds`);
        setTimeout(() => {
          console.log("[Home] Input delay timer completed, enabling input");
          setIsInputEnabled(true);
        }, firstFlow.input_delay * 1000);
      } else {
        console.log("[Home] No input delay specified, enabling input immediately");
        setIsInputEnabled(true);
      }
    } else if (!flows?.length) {
      console.log("[Home] No flows available yet");
    } else if (currentFlow) {
      console.log("[Home] Current flow already set:", currentFlow);
    }
  }, [flows, currentFlow]);

  // State to hold the current chat response and loading state
  const [currentResponse, setCurrentResponse] = useState<{
    response: string;
    status: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUserResponse = async (message: string) => {
    if (!currentFlow || !config) return;

    try {
      console.log("[Home] Sending user response to API:", message);
      console.log("[Home] Current flow details:", {
        id: currentFlow.id,
        order: currentFlow.order,
        system_prompt: currentFlow.system_prompt,
        agent_question: currentFlow.agent_question,
      });

      // Prepare request payload
      const payload = {
        system_prompt: currentFlow.system_prompt,
        agent_question: currentFlow.agent_question,
        user_message: message,
      };

      console.log("[Home] POST request payload:", payload);

      // Clear any previous response and set loading state
      setCurrentResponse(null);
      setIsLoading(true);

      // Now make the API request to OpenAI
      console.log("[Home] About to make POST request to /chat");
      const data = await apiRequest("POST", "/chat", payload);

      console.log("[Home] Received response from API:", data);

      // Set the response for display but maintain loading state
      // to keep input disabled during transition
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
          setIsLoading(false); // Only clear loading state here if conversation ends
          return;
        }

        const nextFlow = flows?.find((f) => f.order === nextFlowOrder);
        if (nextFlow) {
          console.log("[Home] Moving to next flow:", nextFlow);
          // Keep loading state active during transition
          // Add a slight delay before moving to next flow so user can see the response
          setTimeout(() => {
            // Set the new flow
            setCurrentFlow(nextFlow);
            setCurrentResponse(null); // Clear response when switching flows
            
            // Only enable input after the specified delay
            if (nextFlow.input_delay > 0) {
              setTimeout(() => {
                setIsLoading(false); // Finally clear loading state
                setIsInputEnabled(true);
              }, nextFlow.input_delay * 1000);
            } else {
              setIsLoading(false);
              setIsInputEnabled(true);
            }
          }, 2000); // 2 second delay
        } else {
          console.error("[Home] Next flow not found:", nextFlowOrder);
          setIsLoading(false); // Clear loading state on error
        }
      } else {
        // If we don't have a valid status, clear loading state
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[Home] Error processing response:", error);
      setIsLoading(false);
      setCurrentResponse({
        response:
          "Sorry, there was an error processing your message. Please try again.",
        status: "error",
      });
    }
  };

  // Determine if we should show chat based on current flow properties

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
              agentQuestion={isLoading ? "Processing your response..." : currentFlow?.agent_question}
              isLoading={isLoading}
            />
          )}
          {currentFlow?.show_form && (
            <div className="mt-4">
              <FormRenderer formName={currentFlow.form_name} />
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
