import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Config, ConversationFlow } from "@/lib/types";

export default function Flows() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [editingFlow, setEditingFlow] = useState<Partial<ConversationFlow> | null>(null);

  // Fetch configurations
  const { data: configs, isLoading: isLoadingConfigs } = useQuery<Config[]>({
    queryKey: ["/api/configs"],
  });

  // Fetch flows for selected config
  const { data: flows, isLoading: isLoadingFlows } = useQuery<ConversationFlow[]>({
    queryKey: ["/api/configs", selectedConfigId, "flows"],
    enabled: !!selectedConfigId,
    queryFn: async () => {
      if (!selectedConfigId) return [];
      const response = await fetch(`/api/configs/${selectedConfigId}/flows`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to fetch flows");
      }
      return response.json();
    }
  });

  // Create/Update flow mutation
  const { mutate: saveFlow, isPending: isSaving } = useMutation({
    mutationFn: async (flow: Partial<ConversationFlow>) => {
      if (!selectedConfigId) throw new Error("No configuration selected");

      const url = flow.id
        ? `/api/configs/${selectedConfigId}/flows/${flow.id}`
        : `/api/configs/${selectedConfigId}/flows`;

      // Transform to snake_case for API
      const apiPayload = {
        config_id: selectedConfigId,
        order: flow.order || 1,
        video_filename: flow.videoFilename || '',
        system_prompt: flow.systemPrompt || '',
        agent_question: flow.agentQuestion || '',
        pass_next: flow.passNext,
        fail_next: flow.failNext,
        video_only: flow.videoOnly || false,
        show_form: flow.showForm || false,
        form_name: flow.formName,
        input_delay: flow.inputDelay || 0
      };

      console.log('Saving flow:', JSON.stringify(apiPayload, null, 2));
      console.log('To URL:', url);

      const response = await fetch(url, {
        method: flow.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(errorText || "Failed to save flow");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configs", selectedConfigId, "flows"] });
      setEditingFlow(null);
      toast({
        title: "Success",
        description: "Flow saved successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete flow mutation
  const { mutate: deleteFlow, isPending: isDeleting } = useMutation({
    mutationFn: async (flowId: number) => {
      const response = await fetch(`/api/configs/${selectedConfigId}/flows/${flowId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to parse error response" }));
        throw new Error(error.detail || "Failed to delete flow");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configs", selectedConfigId, "flows"] });
      toast({
        title: "Success",
        description: "Flow deleted successfully",
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
    if (!selectedConfigId || !editingFlow) return;

    saveFlow(editingFlow);
  };

  if (isLoadingConfigs) {
    return <div>Loading configurations...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Conversation Flows</h1>
        <Select
          value={selectedConfigId?.toString()}
          onValueChange={(value) => setSelectedConfigId(Number(value))}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a configuration" />
          </SelectTrigger>
          <SelectContent>
            {configs?.map((config) => (
              <SelectItem key={config.id} value={config.id.toString()}>
                {config.pageTitle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedConfigId && (
        <div className="space-y-6">
          <Button onClick={() => setEditingFlow({})} disabled={isSaving}>
            Add New Flow
          </Button>

          {editingFlow && (
            <Card>
              <CardHeader>
                <CardTitle>{editingFlow.id ? "Edit Flow" : "New Flow"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="order">Order</Label>
                      <Input
                        id="order"
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

                    <div className="space-y-2">
                      <Label htmlFor="videoFilename">Video Filename</Label>
                      <Input
                        id="videoFilename"
                        value={editingFlow.videoFilename || ""}
                        onChange={(e) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            videoFilename: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="systemPrompt">System Prompt</Label>
                      <Textarea
                        id="systemPrompt"
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

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="agentQuestion">Agent Question</Label>
                      <Input
                        id="agentQuestion"
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

                    <div className="space-y-2">
                      <Label htmlFor="passNext">Pass Next</Label>
                      <Input
                        id="passNext"
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

                    <div className="space-y-2">
                      <Label htmlFor="failNext">Fail Next</Label>
                      <Input
                        id="failNext"
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

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingFlow.videoOnly || false}
                        onCheckedChange={(checked) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            videoOnly: checked,
                          }))
                        }
                      />
                      <Label>Video Only</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingFlow.showForm || false}
                        onCheckedChange={(checked) =>
                          setEditingFlow((prev) => ({
                            ...prev,
                            showForm: checked,
                          }))
                        }
                      />
                      <Label>Show Form</Label>
                    </div>

                    {editingFlow.showForm && (
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="formName">Form Name</Label>
                        <Input
                          id="formName"
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

                    <div className="space-y-2">
                      <Label htmlFor="inputDelay">Input Delay (seconds)</Label>
                      <Input
                        id="inputDelay"
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
                      type="button"
                      variant="outline"
                      onClick={() => setEditingFlow(null)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {isLoadingFlows ? (
            <div>Loading flows...</div>
          ) : (
            <div className="space-y-4">
              {flows?.map((flow) => (
                <Card key={flow.id}>
                  <CardContent className="flex justify-between items-start p-6">
                    <div className="space-y-2">
                      <div className="font-medium">Flow #{flow.order}</div>
                      <div className="text-sm">Video: {flow.videoFilename}</div>
                      <div className="text-sm">Question: {flow.agentQuestion}</div>
                      <div className="text-sm text-muted-foreground">
                        Pass → {flow.passNext || "End"} | Fail → {flow.failNext || "End"}
                      </div>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingFlow(flow)}
                        disabled={isSaving}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this flow?")) {
                            deleteFlow(flow.id);
                          }
                        }}
                        disabled={isSaving || isDeleting}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}