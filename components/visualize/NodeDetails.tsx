"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, ExternalLink, Calendar, Building2, Tag } from 'lucide-react';
import { useState } from 'react';

export interface NodeData {
  id: string;
  type: 'document' | 'tag' | 'project' | 'sol';
  label: string;
  projectSlug?: string;
  favorite?: boolean;
  created_at?: string;
}

interface NodeDetailsProps {
  node: NodeData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFavoriteToggle?: (documentId: string) => void;
  onTagFilter?: (tagName: string) => void;
}

export default function NodeDetails({ 
  node, 
  open, 
  onOpenChange, 
  onFavoriteToggle,
  onTagFilter 
}: NodeDetailsProps) {
  const [toggling, setToggling] = useState(false);

  if (!node) return null;

  const handleFavoriteToggle = async () => {
    if (!node.projectSlug || node.type !== 'document') return;
    
    setToggling(true);
    try {
      // Extract document ID from node.id (format: "doc:123")
      const documentId = node.id.replace('doc:', '');
      
      // Call API to toggle favorite
      const response = await fetch(`/w/${node.projectSlug}/api/documents/${documentId}/favorite`, {
        method: 'POST'
      });
      
      if (response.ok && onFavoriteToggle) {
        onFavoriteToggle(node.id);
      }
    } catch (error) {
      console.error('Failed to toggle favourite:', error);
    } finally {
      setToggling(false);
    }
  };

  const handleOpenProject = () => {
    if (node.type === 'project' && node.projectSlug) {
      window.location.href = `/w/${node.projectSlug}`;
    } else if (node.type === 'document' && node.projectSlug) {
      const documentId = node.id.replace('doc:', '');
      window.location.href = `/w/${node.projectSlug}?highlight=${documentId}`;
    }
    onOpenChange(false);
  };

  const handleTagFilter = () => {
    if (node.type === 'tag' && onTagFilter) {
      onTagFilter(node.label);
    }
    onOpenChange(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {node.type === 'sol' && <span className="text-2xl">☀️</span>}
            {node.type === 'project' && <Building2 className="w-5 h-5 text-blue-600" />}
            {node.type === 'document' && <Tag className="w-5 h-5 text-green-600" />}
            {node.type === 'tag' && <Tag className="w-5 h-5 text-purple-600" />}
            {node.label}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Node type badge */}
          <div>
            <Badge variant="outline" className="capitalize">
              {node.type}
            </Badge>
          </div>

          {/* Created date */}
          {node.created_at && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              Created {formatDate(node.created_at)}
            </div>
          )}

          {/* Project info */}
          {node.projectSlug && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Building2 className="w-4 h-4" />
              Project: /{node.projectSlug}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {node.type === 'document' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFavoriteToggle}
                  disabled={toggling}
                  className="flex items-center gap-2"
                >
                  <Heart className={`w-4 h-4 ${node.favorite ? 'fill-red-500 text-red-500' : ''}`} />
                  {node.favorite ? 'Unfavourite' : 'Favourite'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenProject}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Document
                </Button>
              </>
            )}
            
            {node.type === 'project' && (
              <Button
                size="sm"
                onClick={handleOpenProject}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Project
              </Button>
            )}
            
            {node.type === 'tag' && (
              <Button
                size="sm"
                onClick={handleTagFilter}
                className="flex items-center gap-2"
              >
                Filter by Tag
              </Button>
            )}
            
            {node.type === 'sol' && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                The center of your research universe. All projects orbit around Sol, containing your documents and insights.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
