import { useEffect, useState, useCallback } from "react";
import { AudioModal } from "@/components/AudioModal";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { ChatInterface } from "@/components/ChatInterface";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Config, ConversationFlow } from "@/lib/types";

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
  const { data: config, error: configError } = useQuery<Config>({
    queryKey: [configId ? `/api/configurations/${configId}` : "/api/configurations/active"],
    queryFn: async () => {
      if (!configId) {
        const response = await fetch("/api/configurations/active");
        if (!response.ok) {
          throw new Error("Failed to fetch active config");
        }
        return response.json();
      }

      const response = await fetch(`/api/configurations/${configId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch config");
      }
      return response.json();
    },
  });

  // Fetch conversation flows for the config
  const { data: flows } = useQuery<ConversationFlow[]>({
    queryKey: ["/api/conversation-flows", config?.id],
    queryFn: async () => {
      if (!config?.id) return [];
      const response = await fetch(`/api/conversation-flows?config_id=${config.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch flows");
      }
      const data = await response.json();
      console.log("[Home] Fetched flows:", data);
      return data.sort(
        (a: ConversationFlow, b: ConversationFlow) => a.order - b.order,
      );
    },
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
      if (firstFlow.inputDelay > 0) {
        setTimeout(() => setIsInputEnabled(true), firstFlow.inputDelay * 1000);
      } else {
        setIsInputEnabled(true);
      }
    }
  }, [flows]);

  const handleUserResponse = async (message: string) => {
    if (!currentFlow || !config) return;

    console.log("Sending user response:", message);
    const controller = new AbortController();
    const timeoutDuration = 25000; // 25 second timeout to match backend
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutDuration);

      const response = await fetch("/api/openai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_prompt: currentFlow.systemPrompt,
          agent_question: currentFlow.agentQuestion,
          user_message: message,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error("Response not OK:", response);
        throw new Error("Failed to process response");
      }

      const data = await response.json();
      console.log("[Home] Chat response:", data);

      if (data.status === "pass" || data.status === "fail") {
        const nextFlowOrder =
          data.status === "pass" ? currentFlow.passNext : currentFlow.failNext;

        if (nextFlowOrder == null) {
          // Check for both null or undefined
          console.log("[Home] End of conversation. No next flow.");
          setCurrentFlow(null);
          return;
        }

        const nextFlow = flows?.find((f) => f.order === nextFlowOrder);
        if (nextFlow) {
          console.log("[Home] Moving to next flow:", nextFlow);
          setCurrentFlow(nextFlow);
          setIsInputEnabled(false);
          if (nextFlow.inputDelay > 0) {
            setTimeout(
              () => setIsInputEnabled(true),
              nextFlow.inputDelay * 1000,
            );
          } else {
            setIsInputEnabled(true);
          }
        } else {
          console.error("[Home] Next flow not found:", nextFlowOrder);
        }
      } else {
        console.error("[Home] Unexpected status in response:", data.status);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.error("Request timed out after 25 seconds");
        } else {
          console.error("Error processing response:", error);
        }
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  console.log("[Home] Render state:", {
    currentFlow,
    shouldShowChat: !currentFlow?.videoOnly && currentFlow?.systemPrompt,
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
            {config?.pageTitle || "AI Conversation"}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-16 pb-24">
        <Card className="mt-4 p-4">
          <AvatarDisplay
            videoFilename={currentFlow?.videoFilename}
            isAudioEnabled={audioEnabled}
          />
          {!currentFlow?.videoOnly && currentFlow?.systemPrompt && (
            <ChatInterface
              isEnabled={isInputEnabled}
              onSubmit={handleUserResponse}
              configId={config?.id}
              agentQuestion={currentFlow?.agentQuestion}
            />
          )}
          {currentFlow?.showForm && (
            <div className="mt-4">
              {/* Dynamic form component will be rendered here */}
              {currentFlow.formName && (
                <div className="text-center text-muted-foreground">
                  Form placeholder: {currentFlow.formName}
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}