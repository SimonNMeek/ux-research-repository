'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Calendar, Paperclip, Eye, Trash2, Download } from 'lucide-react';
import { Card, Attachment, Priority } from '@/lib/kanban/types';
import { PriorityBadge } from './PriorityBadge';
import ReactMarkdown from 'react-markdown';
import { nanoid } from 'nanoid';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
  attachments: Record<string, Attachment>;
  onUpdate: (card: Card) => void;
  onDelete: (cardId: string) => void;
}

export function SidePanel({
  isOpen,
  onClose,
  card,
  attachments,
  onUpdate,
  onDelete,
}: SidePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('None');
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setPriority(card.priority);
      setIsEditing(false);
    }
  }, [card]);

  const handleSave = () => {
    if (!card) return;
    
    const updatedCard: Card = {
      ...card,
      title,
      description,
      priority,
      updatedAt: new Date().toISOString(),
    };
    
    onUpdate(updatedCard);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setPriority(card.priority);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!card) return;
    if (confirm('Are you sure you want to delete this card?')) {
      onDelete(card.id);
      onClose();
    }
  };

  const cardAttachments = card ? card.attachmentIds.map(id => attachments[id]).filter(Boolean) : [];

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">Card Details</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              {isEditing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter card title..."
                />
              ) : (
                <h3 className="text-lg font-medium">{card.title}</h3>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              {isEditing ? (
                <Select value={priority} onValueChange={(value: Priority) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="V2">V2</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <PriorityBadge priority={card.priority} />
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                {!isEditing && description && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {showMarkdownPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter card description..."
                  rows={8}
                />
              ) : (
                <div className="space-y-3">
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {description || 'No description provided.'}
                  </div>
                  {showMarkdownPreview && description && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Markdown Preview:</h4>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{description}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attachments */}
            {cardAttachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments ({cardAttachments.length})
                </label>
                <div className="space-y-3">
                  {cardAttachments.map((attachment) => {
                    // For Markdown files, show inline preview
                    if (attachment.type === 'markdown') {
                      const markdownContent = attachment.dataUrl.startsWith('data:text/markdown;base64,') 
                        ? atob(attachment.dataUrl.split(',')[1])
                        : attachment.dataUrl;
                      
                      return (
                        <div key={attachment.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <Paperclip className="h-4 w-4 text-gray-400" />
                              <div className="text-sm font-medium">{attachment.name}</div>
                              <span className="text-xs text-gray-500">({attachment.type})</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = attachment.dataUrl;
                                link.download = attachment.name;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="prose prose-sm max-w-none border-t pt-3">
                            <ReactMarkdown>{markdownContent}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    }
                    
                    // For other file types, show download button
                    return (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{attachment.name}</div>
                            <div className="text-xs text-gray-500">
                              {attachment.type} • {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = attachment.dataUrl;
                            link.download = attachment.name;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Created:</span>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(card.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(card.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Card
              </Button>
              
              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Card
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
