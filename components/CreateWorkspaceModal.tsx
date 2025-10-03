"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2 } from 'lucide-react';

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkspaceCreated?: (workspace: { id: number; slug: string; name: string }) => void;
}

export default function CreateWorkspaceModal({ open, onOpenChange, onWorkspaceCreated }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workspace');
      }

      const result = await response.json();
      
      // Call success callback
      if (onWorkspaceCreated) {
        onWorkspaceCreated(result.workspace);
      }

      // Reset form
      setName('');
      setDescription('');
      setSlug('');
      
      // Close modal
      onOpenChange(false);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setName('');
      setDescription('');
      setSlug('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Create New Workspace
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Acme Corp Research"
              disabled={creating}
              required
            />
          </div>

          <div>
            <Label htmlFor="workspace-slug">URL Slug</Label>
            <Input
              id="workspace-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., acme-corp"
              disabled={creating}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be used in the URL: /w/{slug}
            </p>
          </div>

          <div>
            <Label htmlFor="workspace-description">Description (Optional)</Label>
            <Input
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this workspace"
              disabled={creating}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={creating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !name.trim() || !slug.trim()}
              className="flex-1"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Workspace'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
