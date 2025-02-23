import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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

export default function ConversationFlows() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [editingFlow, setEditingFlow] =
    useState<Partial<ConversationFlow> | null>(null);

  // Fetch configurations
  const { data: configs, isLoading: isLoadingConfigs } = useQuery<Config[]>({
    queryKey: ["/api/configurations"],
    queryFn: () => apiRequest("GET", "/api/configurations"),
  });

  // Fetch conversation flows for selected config
  const { data: flows } = useQuery<ConversationFlow[]>({
    queryKey: ["/api/conversation-flows", selectedConfigId],
    queryFn: () =>
      selectedConfigId
        ? apiRequest(
            "GET",
            `/api/conversation-flows?config_id=${selectedConfigId}`,
          )
        : Promise.resolve([]),
    enabled: !!selectedConfigId,
  });

  // Fetch available videos
  const { data: videos, isLoading: isLoadingVideos } = useQuery<string[]>({
    queryKey: ["/api/videos"],
    queryFn: () => apiRequest("GET", "/api/videos"),
  });

  const { mutate: deleteFlow } = useMutation({
    mutationFn: async (flowId: number) =>
      apiRequest("DELETE", `/api/conversation-flows/${flowId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/conversation-flows", selectedConfigId],
      });
      toast({ title: "Success", description: "Flow deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: saveFlow, isPending: isSaving } = useMutation({
    mutationFn: async (flow: Partial<ConversationFlow>) => {
      const isEditing = Boolean(flow.id);
      return apiRequest(
        isEditing ? "PUT" : "POST",
        isEditing
          ? `/api/conversation-flows/${flow.id}`
          : "/api/conversation-flows",
        flow,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/conversation-flows", selectedConfigId],
      });
      setEditingFlow(null);
      toast({
        title: "Success",
        description: "Conversation flow saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update the select handling
  const handleConfigSelect = (value: string) => {
    console.log("[Select] Handling selection. Value:", value);
    if (value === "placeholder") {
      setSelectedConfigId(null);
      return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setSelectedConfigId(numValue);
      console.log("[Select] Updated selectedConfigId to:", numValue);
    } else {
      setSelectedConfigId(null);
    }
  };

  const handleEdit = (flow: ConversationFlow) => {
    setEditingFlow({
      id: flow.id,
      config_id: flow.config_id,
      order: flow.order,
      video_filename: flow.video_filename,
      system_prompt: flow.system_prompt,
      agent_question: flow.agent_question,
      pass_next: flow.pass_next,
      fail_next: flow.fail_next,
      video_only: flow.video_only,
      show_form: flow.show_form,
      form_name: flow.form_name,
      input_delay: flow.input_delay,
    });
  };

  const handleDelete = (flowId: number) => {
    if (window.confirm("Are you sure you want to delete this flow?")) {
      deleteFlow(flowId);
    }
  };

  // Debug output for rendering
  console.log("[ConversationFlows] Render state:", {
    configs,
    selectedConfigId,
    isLoadingConfigs,
    configsLength: configs?.length,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfigId || !editingFlow) {
      toast({
        title: "Error",
        description: "Please select a configuration and fill out the form",
        variant: "destructive",
      });
      return;
    }

    const requiredFields = {
      order: editingFlow.order,
      video_filename: editingFlow.video_filename,
      system_prompt: editingFlow.system_prompt,
      agent_question: editingFlow.agent_question,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      toast({
        title: "Error",
        description: `Please fill out the following required fields: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    saveFlow({
      ...editingFlow,
      config_id: selectedConfigId,
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Conversation Flows</h1>
          <div className="w-[300px]">
            <Select
              value={selectedConfigId?.toString() || "placeholder"}
              onValueChange={handleConfigSelect}
            >
              <SelectTrigger disabled={isLoadingConfigs}>
                <SelectValue
                  placeholder={
                    isLoadingConfigs ? "Loading..." : "Select a configuration"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>
                  Choose a configuration
                </SelectItem>
                {configs && configs.length > 0 ? (
                  configs.map((config) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.page_title}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-configs" disabled>
                    No configurations available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedConfigId && (
          <div className="space-y-6">
            <Button onClick={() => setEditingFlow({})} disabled={isSaving}>
              Add New Flow
            </Button>

            {editingFlow && (
              <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium mb-1 text-red-500">
                        Order *
                      </label>
                      <Input
                        type="number"
                        value={editingFlow.order || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            order: Number(e.target.value),
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1 text-red-500">
                        Video File *
                      </label>
                      <Select
                        value={editingFlow.video_filename}
                        onValueChange={(value) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            video_filename: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingVideos
                                ? "Loading videos..."
                                : "Select a video"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingVideos ? (
                            <SelectItem value="loading" disabled>
                              Loading available videos...
                            </SelectItem>
                          ) : videos && videos.length > 0 ? (
                            videos.map((video) => (
                              <SelectItem key={video} value={video}>
                                {video}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-videos" disabled>
                              No videos available. Add files to the videos
                              folder.
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label className="block font-medium mb-1 text-red-500">
                        System Prompt *
                      </label>
                      <textarea
                        value={editingFlow.system_prompt || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            system_prompt: e.target.value,
                          }))
                        }
                        required
                        className="border rounded p-2 w-full bg-black text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-medium mb-1 text-red-500">
                        Agent Question *
                      </label>
                      <Input
                        value={editingFlow.agent_question || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            agent_question: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">
                        Pass Next
                      </label>
                      <Input
                        type="number"
                        value={editingFlow.pass_next || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            pass_next: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">
                        Fail Next
                      </label>
                      <Input
                        type="number"
                        value={editingFlow.fail_next || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            fail_next: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingFlow.video_only || false}
                        onCheckedChange={(checked) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            video_only: checked,
                          }))
                        }
                      />
                      <label>Video Only</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingFlow.show_form || false}
                        onCheckedChange={(checked) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            show_form: checked,
                          }))
                        }
                      />
                      <label>Show Form</label>
                    </div>
                    {editingFlow.show_form && (
                      <div className="col-span-2">
                        <label className="block font-medium mb-1">
                          Form Name
                        </label>
                        <Input
                          value={editingFlow.form_name || ""}
                          onChange={(e) =>
                            setEditingFlow((prev) => ({
                              ...prev,
                              form_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                    <div>
                      <label className="block font-medium mb-1">
                        Input Delay (seconds)
                      </label>
                      <Input
                        type="number"
                        value={editingFlow.input_delay || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            input_delay: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditingFlow(null)}
                      type="button"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold mb-4">Conversation Flows</h2>
              {flows?.length ? (
                <div className="space-y-4">
                  {flows
                    .sort((a, b) => a.order - b.order)
                    .map((flow) => (
                      <Card
                        key={flow.id}
                        className="p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <p className="font-medium text-lg">
                              Step {flow.order}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Video:</span>{" "}
                              {flow.video_filename}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">
                                System Prompt:
                              </span>{" "}
                              {flow.system_prompt}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Question:</span>{" "}
                              {flow.agent_question}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Next Steps:</span>{" "}
                              Pass → {flow.pass_next || "End"}, Fail →{" "}
                              {flow.fail_next || "End"}
                            </p>
                            {flow.show_form && (
                              <p className="text-sm">
                                <span className="font-medium">Form Name:</span>{" "}
                                {flow.form_name}
                              </p>
                            )}
                            {flow.video_only && (
                              <p className="text-sm text-blue-600">
                                Video Only Mode
                              </p>
                            )}
                            {flow.input_delay > 0 && (
                              <p className="text-sm">
                                <span className="font-medium">
                                  Input Delay:
                                </span>{" "}
                                {flow.input_delay}s
                              </p>
                            )}
                          </div>
                          <div className="space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => handleEdit(flow)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(flow.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No flows created yet. Use the form above to add a new flow.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}