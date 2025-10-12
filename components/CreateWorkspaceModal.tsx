"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkspaceCreated?: (workspace: { id: number; slug: string; name: string }) => void;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
}

export default function CreateWorkspaceModal({ open, onOpenChange, onWorkspaceCreated }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Fetch user's organizations when modal opens
  useEffect(() => {
    if (open && organizations.length === 0) {
      setLoadingOrgs(true);
      fetch('/api/organizations')
        .then(res => res.json())
        .then(data => {
          if (data.organizations && data.organizations.length > 0) {
            setOrganizations(data.organizations);
            setOrganizationId(data.organizations[0].id);
          } else {
            setError('No organizations found. Please contact an administrator.');
          }
        })
        .catch(err => {
          console.error('Failed to fetch organizations:', err);
          setError('Failed to load organizations');
        })
        .finally(() => {
          setLoadingOrgs(false);
        });
    }
  }, [open, organizations.length]);

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
    if (!name.trim() || !slug.trim() || !organizationId) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          organizationId: organizationId
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

          <div>
            <Label htmlFor="organization">Organization</Label>
            {loadingOrgs ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading organizations...
              </div>
            ) : organizations.length > 1 ? (
              <Select
                value={organizationId?.toString()}
                onValueChange={(value) => setOrganizationId(parseInt(value))}
                disabled={creating}
              >
                <SelectTrigger id="organization">
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : organizations.length === 1 ? (
              <div className="py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
                {organizations[0].name}
              </div>
            ) : (
              <div className="py-2 px-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
                No organizations available
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Workspace will be created within this organization
            </p>
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
              disabled={creating || !name.trim() || !slug.trim() || !organizationId}
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
