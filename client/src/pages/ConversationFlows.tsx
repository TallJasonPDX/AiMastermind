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

export default function ConversationFlows() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [editingFlow, setEditingFlow] = useState<Partial<ConversationFlow> | null>(null);

  // Fetch configurations
  const { data: configs, isLoading: isLoadingConfigs } = useQuery<Config[]>({
    queryKey: ['/api/configs'],
    queryFn: async () => {
      console.log("[ConversationFlows] Fetching configurations...");
      const response = await fetch("/api/configs");
      if (!response.ok) {
        const error = await response.text();
        console.error("[ConversationFlows] Error fetching configs:", error);
        throw new Error(error || "Failed to fetch configurations");
      }
      const data = await response.json();
      console.log("[ConversationFlows] Received configurations:", data);
      return data;
    },
    onSuccess: (data) => {
      // Set the first config as default if none is selected
      if (data?.length > 0 && !selectedConfigId) {
        console.log("[ConversationFlows] Setting default config:", data[0].id);
        setSelectedConfigId(data[0].id);
      }
    }
  });

  // Fetch conversation flows for selected config
  const { data: flows } = useQuery<ConversationFlow[]>({
    queryKey: ['/api/flows', selectedConfigId],
    queryFn: async () => {
      if (!selectedConfigId) return [];
      console.log("[ConversationFlows] Fetching flows for config:", selectedConfigId);
      const response = await fetch(`/api/configs/${selectedConfigId}/flows`);
      if (!response.ok) {
        const error = await response.text();
        console.error("[ConversationFlows] Error fetching flows:", error);
        throw new Error(error || "Failed to fetch flows");
      }
      const data = await response.json();
      console.log("[ConversationFlows] Received flows:", data);
      return data;
    },
    enabled: !!selectedConfigId,
  });

  // Fetch available videos
  const { data: videos, isLoading: isLoadingVideos } = useQuery<string[]>({
    queryKey: ['/api/videos'],
    queryFn: async () => {
      console.log("[ConversationFlows] Fetching videos...");
      const response = await fetch(`/api/videos`);
      if (!response.ok) {
        const error = await response.text();
        console.error("[ConversationFlows] Error fetching videos:", error);
        throw new Error(error || "Failed to fetch videos");
      }
      return response.json();
    },
  });

  const { mutate: deleteFlow } = useMutation({
    mutationFn: async (flowId: number) => {
      if (!selectedConfigId) throw new Error("No configuration selected");
      const response = await fetch(`/api/configs/${selectedConfigId}/flows/${flowId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete flow");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/flows', selectedConfigId] });
      toast({ title: "Success", description: "Flow deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { mutate: saveFlow, isPending: isSaving } = useMutation({
    mutationFn: async (flow: Partial<ConversationFlow>) => {
      if (!selectedConfigId) {
        throw new Error("No configuration selected");
      }

      const isEditing = Boolean(flow.id);
      const url = isEditing
        ? `/api/configs/${selectedConfigId}/flows/${flow.id}`
        : `/api/configs/${selectedConfigId}/flows`;

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flow),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to save flow");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/flows', selectedConfigId],
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
      videoFilename: editingFlow.videoFilename,
      systemPrompt: editingFlow.systemPrompt,
      agentQuestion: editingFlow.agentQuestion,
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
      configId: selectedConfigId,
    });
  };

  const handleEdit = (flow: ConversationFlow) => {
    setEditingFlow({
      id: flow.id,
      configId: flow.configId,
      order: flow.order,
      videoFilename: flow.videoFilename,
      systemPrompt: flow.systemPrompt,
      agentQuestion: flow.agentQuestion,
      passNext: flow.passNext,
      failNext: flow.failNext,
      videoOnly: flow.videoOnly,
      showForm: flow.showForm,
      formName: flow.formName,
      inputDelay: flow.inputDelay,
    });
  };

  const handleDelete = (flowId: number) => {
    if (window.confirm("Are you sure you want to delete this flow?")) {
      deleteFlow(flowId);
    }
  };

  // Update the select handling
  const handleConfigSelect = (value: string) => {
    console.log("[Select] Handling selection. Value:", value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setSelectedConfigId(numValue);
      console.log("[Select] Updated selectedConfigId to:", numValue);
    } else {
      setSelectedConfigId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Conversation Flows</h1>
          <div className="text-xs text-muted-foreground mb-2">
            Configs loaded: {configs?.length || 0},
            Selected: {selectedConfigId}
          </div>
          <div className="w-[300px]">
            <Select
              value={selectedConfigId?.toString() || ""}
              onValueChange={handleConfigSelect}
            >
              <SelectTrigger disabled={isLoadingConfigs}>
                <SelectValue placeholder={isLoadingConfigs ? "Loading..." : "Select a configuration"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" disabled>Choose a configuration</SelectItem>
                {configs?.map((config) => (
                  <SelectItem key={config.id} value={config.id.toString()}>
                    {config.pageTitle}
                  </SelectItem>
                ))}
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
                        value={editingFlow.videoFilename}
                        onValueChange={(value) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            videoFilename: value,
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
                      <Input
                        value={editingFlow.systemPrompt || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            systemPrompt: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-medium mb-1 text-red-500">
                        Agent Question *
                      </label>
                      <Input
                        value={editingFlow.agentQuestion || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            agentQuestion: e.target.value,
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
                        value={editingFlow.passNext || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            passNext: Number(e.target.value),
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
                        value={editingFlow.failNext || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            failNext: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingFlow.videoOnly || false}
                        onCheckedChange={(checked) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            videoOnly: checked,
                          }))
                        }
                      />
                      <label>Video Only</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingFlow.showForm || false}
                        onCheckedChange={(checked) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            showForm: checked,
                          }))
                        }
                      />
                      <label>Show Form</label>
                    </div>
                    {editingFlow.showForm && (
                      <div className="col-span-2">
                        <label className="block font-medium mb-1">
                          Form Name
                        </label>
                        <Input
                          value={editingFlow.formName || ""}
                          onChange={(e) =>
                            setEditingFlow((prev) => ({
                              ...prev,
                              formName: e.target.value,
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
                        value={editingFlow.inputDelay || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            inputDelay: Number(e.target.value),
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
                  {flows.sort((a, b) => a.order - b.order).map((flow) => (
                    <Card key={flow.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <p className="font-medium text-lg">Step {flow.order}</p>
                          <p className="text-sm">
                            <span className="font-medium">Video:</span> {flow.videoFilename}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">System Prompt:</span>{" "}
                            {flow.systemPrompt}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Question:</span>{" "}
                            {flow.agentQuestion}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Next Steps:</span> Pass →{" "}
                            {flow.passNext || "End"}, Fail → {flow.failNext || "End"}
                          </p>
                          {flow.showForm && (
                            <p className="text-sm">
                              <span className="font-medium">Form Name:</span>{" "}
                              {flow.formName}
                            </p>
                          )}
                          {flow.videoOnly && (
                            <p className="text-sm text-blue-600">Video Only Mode</p>
                          )}
                          {flow.inputDelay > 0 && (
                            <p className="text-sm">
                              <span className="font-medium">Input Delay:</span>{" "}
                              {flow.inputDelay}s
                            </p>
                          )}
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" onClick={() => handleEdit(flow)}>
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