
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Config } from '@/lib/types';

export default function Config() {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [formData, setFormData] = useState<Partial<Config>>({});

  const { data: configs } = useQuery<Config[]>({
    queryKey: ['configs'],
    queryFn: async () => {
      const response = await fetch('/api/configs');
      return response.json();
    }
  });

  const { mutate: updateConfig } = useMutation({
    mutationFn: async (data: Partial<Config>) => {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
      setEditMode(false);
      setSelectedConfig(null);
    },
  });

  const { mutate: deleteConfig } = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/config/${id}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configs'] });
    },
  });

  const handleEdit = (config: Config) => {
    setSelectedConfig(config);
    setFormData(config);
    setEditMode(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      deleteConfig(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({ ...formData, id: selectedConfig?.id });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Configuration Management</h1>
        
        {!editMode ? (
          <div className="grid gap-4">
            {configs?.map(config => (
              <Card key={config.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{config.pageTitle}</h3>
                    <p className="text-sm text-gray-500">ID: {config.avatarId}</p>
                  </div>
                  <div className="space-x-2">
                    <Button variant="outline" onClick={() => handleEdit(config)}>Edit</Button>
                    <Button variant="destructive" onClick={() => handleDelete(config.id)}>Delete</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <h4 className="font-semibold">System Prompt</h4>
                    <p className="text-sm">{config.openaiAgentConfig.systemPrompt}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Page Title</label>
                <Input
                  value={formData.pageTitle || ''}
                  onChange={e => setFormData(prev => ({ ...prev, pageTitle: e.target.value }))}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Avatar ID</label>
                <Input
                  value={formData.avatarId || ''}
                  onChange={e => setFormData(prev => ({ ...prev, avatarId: e.target.value }))}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">System Prompt</label>
                <Textarea
                  value={formData.openaiAgentConfig?.systemPrompt || ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    openaiAgentConfig: { ...prev.openaiAgentConfig, systemPrompt: e.target.value }
                  }))}
                />
              </div>
              <div className="space-x-2">
                <Button type="submit">Save</Button>
                <Button variant="outline" onClick={() => {
                  setEditMode(false);
                  setSelectedConfig(null);
                }}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
