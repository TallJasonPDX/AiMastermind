// client/src/pages/Home.tsx
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
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
  const [showChat, setShowChat] = useState(false); // Default to hiding chat
  const [chatInitialized, setChatInitialized] = useState(false); // Track if chat has ever been initialized
  const [nextVideoToLoad, setNextVideoToLoad] = useState<string | undefined>(undefined);

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
      ) as Promise<Config>;
    }
  });

  // Log config on successful load
  useEffect(() => {
    if (config) {
      console.log("[Home] Configuration loaded successfully:", config);
    }
  }, [config]);

  // Fetch conversation flows for the config
  const { data: flows, isLoading: flowsLoading, error: flowsError } = useQuery<ConversationFlow[]>({
    queryKey: ["/conversation-flows", config?.id],
    queryFn: () => {
      if (config?.id) {
        console.log(`[Home] Fetching conversation flows for config ID ${config.id}`);
        return apiRequest("GET", `/conversation-flows?config_id=${config.id}`) as Promise<ConversationFlow[]>;
      } else {
        console.log("[Home] No config ID available, skipping flows fetch");
        return Promise.resolve([] as ConversationFlow[]);
      }
    },
    enabled: !!config?.id
  });

  // Log flows on successful load
  useEffect(() => {
    if (flows) {
      console.log(`[Home] Loaded ${flows.length || 0} conversation flows:`, flows);
    }
  }, [flows]);

  // Handle errors in useEffect
  useEffect(() => {
    if (configError) {
      console.error("[Home] Error loading configuration:", configError);
    }
    if (flowsError) {
      console.error("[Home] Error loading conversation flows:", flowsError);
    }
  }, [configError, flowsError]);

  // Function to preload next video based on current flow
  const preloadNextVideo = (currentFlowId: number, status: 'pass' | 'fail' | null = null) => {
    if (!flows || !flows.length) return;

    // Type check to ensure flows is treated as an array
    const flowsArray = Array.isArray(flows) ? flows : [];
    if (flowsArray.length === 0) return;

    const currentFlowIndex = flowsArray.findIndex(flow => flow.id === currentFlowId);
    if (currentFlowIndex === -1) return;

    // Early return if we're already preloading this video
    const currentFlow = flowsArray[currentFlowIndex];
    if (nextVideoToLoad === currentFlow.video_filename) {
      console.log(`[Home] Already preloading video: ${nextVideoToLoad}`);
      return;
    }

    let nextFlowId: number | null = null;

    // If status is provided, use pass_next or fail_next
    if (status === 'pass' && flowsArray[currentFlowIndex].pass_next) {
      nextFlowId = flowsArray[currentFlowIndex].pass_next;
    } else if (status === 'fail' && flowsArray[currentFlowIndex].fail_next) {
      nextFlowId = flowsArray[currentFlowIndex].fail_next;
    } else {
      // Default: preload the next sequential flow if no status provided
      if (currentFlowIndex + 1 < flowsArray.length) {
        const nextFlow = flowsArray[currentFlowIndex + 1];
        if (nextFlow && nextFlow.video_filename) {
          setNextVideoToLoad(nextFlow.video_filename);
          console.log(`[Home] Preloading next sequential video: ${nextFlow.video_filename}`);
          return;
        }
      }
    }

    if (nextFlowId) {
      const nextFlow = flowsArray.find(flow => flow.order === nextFlowId);
      if (nextFlow && nextFlow.video_filename) {
        setNextVideoToLoad(nextFlow.video_filename);
        console.log(`[Home] Preloading next video based on ${status}: ${nextFlow.video_filename}`);
      }
    }
  };

  // Initialize with first flow when flows are loaded
  useEffect(() => {
    console.log("[Home] Flow dependency changed:", { 
      flowsAvailable: !!flows?.length, 
      flowsCount: flows?.length || 0,
      currentFlowExists: !!currentFlow,
      currentFlowId: currentFlow?.id
    });

    // Skip if we don't have flows yet or already have a current flow
    if (!flows || currentFlow) {
      if (!flows) {
        console.log("[Home] No flows available yet");
      } else if (currentFlow) {
        console.log("[Home] Current flow already set:", currentFlow);
      }
      return;
    }

    // Type check to ensure flows is treated as an array
    const flowsArray = Array.isArray(flows) ? flows : [];
    if (flowsArray.length === 0) return;

    // Set initial flow only once
    const firstFlow = flowsArray[0];
    console.log("[Home] Setting initial flow:", firstFlow);
    setCurrentFlow(firstFlow);

    // Reset input state for new flow
    setIsInputEnabled(false);
    setShowChat(false); // Initially hide chat until delay passes
    console.log("[Home] Input initially disabled for new flow");

    // Preload next video if available
    if (flowsArray.length > 1) {
      const nextFlow = flowsArray[1];
      if (nextFlow && nextFlow.video_filename) {
        setNextVideoToLoad(nextFlow.video_filename);
        console.log(`[Home] Preloading second video: ${nextFlow.video_filename}`);
      }
    }

    // Set up input delay timer
    if (firstFlow.input_delay > 0) {
      console.log(`[Home] Setting input delay timer for ${firstFlow.input_delay} seconds`);
      const timerId = setTimeout(() => {
        console.log("[Home] Input delay timer completed, enabling input");
        setIsInputEnabled(true);
        // For video-only flows that have forms, we need special handling
        if (firstFlow.video_only && firstFlow.show_form) {
          console.log(`[Home] Video-only flow with form detected, keeping input enabled but chat hidden`);
          setIsInputEnabled(true);
        }
        // Only show chat if it's not a video-only flow
        else if (!firstFlow.video_only) {
          console.log(`[Home] Showing chat interface after delay`);
          setShowChat(true);
        }
      }, firstFlow.input_delay * 1000);

      // Clean up timer if component unmounts
      return () => clearTimeout(timerId);
    } else {
      console.log("[Home] No input delay specified, enabling input immediately");
      setIsInputEnabled(true);
      // For video-only flows that have forms, we need special handling
      if (firstFlow.video_only && firstFlow.show_form) {
        console.log(`[Home] Video-only flow with form detected, keeping input enabled but chat hidden`);
        setIsInputEnabled(true);
      }
      // Only show chat if it's not a video-only flow
      else if (!firstFlow.video_only) {
        console.log(`[Home] Showing chat interface immediately`);
        setShowChat(true);
      }
    }
  }, [flows]);

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

        // Type check to ensure flows is treated as an array
        const flowsArray = Array.isArray(flows) ? flows : [];
        const nextFlow = flowsArray.find((f) => f.order === nextFlowOrder);

        if (nextFlow) {
          console.log("[Home] Moving to next flow:", nextFlow);

          // Preload next potential videos based on this next flow
          preloadNextVideo(nextFlow.id, null);

          // Hide chat immediately during transition
          setShowChat(false);

          // Keep loading state active during transition
          // Add a slight delay before moving to next flow so user can see the response
          setTimeout(() => {
            // Set the new flow
            setCurrentFlow(nextFlow);
            setCurrentResponse(null); // Clear response when switching flows
            setIsInputEnabled(false); // Disable input during transition

            // Only enable input and show chat after the specified delay
            if (nextFlow.input_delay > 0) {
              console.log(`[Home] Setting delay timer for next flow: ${nextFlow.input_delay} seconds`);
              setTimeout(() => {
                console.log("[Home] Delay timer complete, enabling input and showing chat");
                setIsLoading(false); // Finally clear loading state
                setIsInputEnabled(true);
                if (!nextFlow.video_only) {
                  setShowChat(true); // Only show chat if not video_only
                }
              }, nextFlow.input_delay * 1000);
            } else {
              console.log("[Home] No delay for next flow, enabling input and showing chat immediately");
              setIsLoading(false);
              setIsInputEnabled(true);
              if (!nextFlow.video_only) {
                setShowChat(true); // Only show chat if not video_only
              }
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
      setShowChat(true); // Show chat again on error
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
          <h1 className="text-xl font-bold text-center">
            {config?.page_title || "AI Conversation"}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-16 pb-24">
        <div className="max-w-[750px] mx-auto">
          <Card className="mt-4 p-4">
            <AvatarDisplay
              videoFilename={currentFlow?.video_filename}
              nextVideoFilename={nextVideoToLoad}
              isAudioEnabled={audioEnabled}
              onVideoLoaded={() => {
                // If this is the first load and we haven't preloaded any next videos yet
                if (currentFlow && flows && flows.length > 1 && !nextVideoToLoad) {
                  console.log("[Home] Initial video loaded, preloading next potential videos");
                  preloadNextVideo(currentFlow.id);
                }
              }}
            />

            {/* 
              Only show chat interface if:
              1. showChat is true (managed by delay timers)
              2. Not a video-only flow
              3. Has a system prompt
              4. Not in a loading/transition state 
            */}
            {showChat && !currentFlow?.video_only && currentFlow?.system_prompt && (
              <div className="transition-opacity duration-500" style={{ opacity: isInputEnabled ? 1 : 0 }}>
                <ChatInterface
                  isEnabled={isInputEnabled && !isLoading}
                  onSubmit={handleUserResponse}
                  configId={config?.id}
                  agentQuestion={isLoading ? "Processing your response..." : currentFlow?.agent_question}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Show form if the current flow specifies it (regardless of chat visibility) */}
            {currentFlow?.show_form && isInputEnabled && (
              <div className="mt-4 transition-opacity duration-500" style={{ opacity: isInputEnabled ? 1 : 0 }}>
                <FormRenderer 
                  formName={currentFlow.form_name} 
                  inputDelay={currentFlow.input_delay} 
                />
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}