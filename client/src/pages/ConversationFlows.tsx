import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { Config, ConversationFlow } from '@/lib/types';

export default function ConversationFlows() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [editingFlow, setEditingFlow] = useState<Partial<ConversationFlow> | null>(null);

  // Fetch configurations
  const { data: configs } = useQuery<Config[]>({
    queryKey: ['configs'],
    queryFn: async () => {
      const response = await fetch('/api/configs');
      return response.json();
    }
  });

  // Fetch conversation flows for selected config
  const { data: flows } = useQuery<ConversationFlow[]>({
    queryKey: ['conversation-flows', selectedConfigId],
    queryFn: async () => {
      const response = await fetch(`/api/configs/${selectedConfigId}/flows`);
      return response.json();
    },
    enabled: !!selectedConfigId
  });

  // Fetch available videos
  const { data: videos } = useQuery<string[]>({
    queryKey: ['videos'],
    queryFn: async () => {
      const response = await fetch('/api/videos');
      return response.json();
    }
  });

  const { mutate: saveFlow } = useMutation({
    mutationFn: async (flow: Partial<ConversationFlow>) => {
      const response = await fetch(`/api/configs/${selectedConfigId}/flows${flow.id ? `/${flow.id}` : ''}`, {
        method: flow.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-flows', selectedConfigId] });
      setEditingFlow(null);
      toast({
        title: "Success",
        description: "Conversation flow saved successfully",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfigId || !editingFlow) return;
    
    saveFlow({
      ...editingFlow,
      configId: selectedConfigId,
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Conversation Flows</h1>
          <Select value={selectedConfigId?.toString()} onValueChange={(value) => setSelectedConfigId(Number(value))}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a configuration" />
            </SelectTrigger>
            <SelectContent>
              {configs?.map(config => (
                <SelectItem key={config.id} value={config.id.toString()}>
                  {config.pageTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedConfigId && (
          <div className="space-y-6">
            <Button onClick={() => setEditingFlow({})}>Add New Flow</Button>

            {editingFlow && (
              <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium mb-1">Order</label>
                      <Input
                        type="number"
                        value={editingFlow.order || ''}
                        onChange={e => setEditingFlow(prev => ({ ...prev, order: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Video File</label>
                      <Select 
                        value={editingFlow.videoFilename} 
                        onValueChange={(value) => setEditingFlow(prev => ({ ...prev, videoFilename: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a video" />
                        </SelectTrigger>
                        <SelectContent>
                          {videos?.map(video => (
                            <SelectItem key={video} value={video}>
                              {video}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label className="block font-medium mb-1">System Prompt</label>
                      <Input
                        value={editingFlow.systemPrompt || ''}
                        onChange={e => setEditingFlow(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-medium mb-1">Agent Question</label>
                      <Input
                        value={editingFlow.agentQuestion || ''}
                        onChange={e => setEditingFlow(prev => ({ ...prev, agentQuestion: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Pass Next</label>
                      <Input
                        type="number"
                        value={editingFlow.passNext || ''}
                        onChange={e => setEditingFlow(prev => ({ ...prev, passNext: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Fail Next</label>
                      <Input
                        type="number"
                        value={editingFlow.failNext || ''}
                        onChange={e => setEditingFlow(prev => ({ ...prev, failNext: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingFlow.videoOnly || false}
                        onCheckedChange={checked => setEditingFlow(prev => ({ ...prev, videoOnly: checked }))}
                      />
                      <label>Video Only</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingFlow.showForm || false}
                        onCheckedChange={checked => setEditingFlow(prev => ({ ...prev, showForm: checked }))}
                      />
                      <label>Show Form</label>
                    </div>
                    {editingFlow.showForm && (
                      <div className="col-span-2">
                        <label className="block font-medium mb-1">Form Name</label>
                        <Input
                          value={editingFlow.formName || ''}
                          onChange={e => setEditingFlow(prev => ({ ...prev, formName: e.target.value }))}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block font-medium mb-1">Input Delay (seconds)</label>
                      <Input
                        type="number"
                        value={editingFlow.inputDelay || ''}
                        onChange={e => setEditingFlow(prev => ({ ...prev, inputDelay: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setEditingFlow(null)}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </Card>
            )}

            {flows && (
              <div className="space-y-4">
                {flows.map(flow => (
                  <Card key={flow.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">Order: {flow.order}</p>
                        <p className="text-sm">Video: {flow.videoFilename}</p>
                        <p className="text-sm">Question: {flow.agentQuestion}</p>
                      </div>
                      <Button variant="outline" onClick={() => setEditingFlow(flow)}>Edit</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
