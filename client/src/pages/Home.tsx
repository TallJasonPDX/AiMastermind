import { useEffect, useState } from "react";
import { AudioModal } from "@/components/AudioModal";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { ChatInterface } from "@/components/ChatInterface";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Config, ConversationFlow } from "@/lib/types";

// API request helper function
const apiRequest = async (method: string, url: string, body?: any) => {
  const response = await fetch(url.startsWith("/api/") ? url : `/api${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API request failed");
  }
  return response.json();
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
      if (firstFlow.inputDelay > 0) {
        setTimeout(() => setIsInputEnabled(true), firstFlow.inputDelay * 1000);
      } else {
        setIsInputEnabled(true);
      }
    }
  }, [flows, currentFlow]);

  console.log("[Home] Current flow:", currentFlow);

  const handleUserResponse = async (message: string) => {
    if (!currentFlow || !config) return;

    try {
      const data = await apiRequest("POST", "/api/openai/chat", {
        system_prompt: currentFlow.systemPrompt,
        agent_question: currentFlow.agentQuestion,
        user_message: message,
      });

      if (data.status === "pass" || data.status === "fail") {
        const nextFlowOrder =
          data.status === "pass" ? currentFlow.passNext : currentFlow.failNext;

        if (nextFlowOrder == null) {
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
      }
    } catch (error) {
      console.error("[Home] Error processing response:", error);
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
            videoFilename={currentFlow?.video_filename}
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
