
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
  const [formData, setFormData] = useState<Partial<Config>>({});

  const { data: config } = useQuery<Config>({
    queryKey: ['/api/config/active'],
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
      queryClient.invalidateQueries({ queryKey: ['/api/config/active'] });
      setEditMode(false);
    },
  });

  const handleEdit = () => {
    setFormData(config || {});
    setEditMode(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(formData);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Configuration Management</h1>
        
        {!editMode ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Page Title</h3>
              <p>{config?.pageTitle}</p>
            </div>
            <div>
              <h3 className="font-semibold">Avatar ID</h3>
              <p>{config?.avatarId}</p>
            </div>
            <div>
              <h3 className="font-semibold">System Prompt</h3>
              <p>{config?.openaiAgentConfig?.systemPrompt}</p>
            </div>
            <Button onClick={handleEdit}>Edit Configuration</Button>
          </div>
        ) : (
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
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
