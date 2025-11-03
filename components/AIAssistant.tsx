'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Send, Sparkles, User, FileText, Loader2, Copy, Check, GripVertical, Trash2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    id: number;
    title: string;
    project: string;
  }>;
  timestamp: Date;
}

interface AIAssistantProps {
  workspaceSlug: string;
  workspaceName: string;
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: () => void; // Optional callback when a project is created
}

export default function AIAssistant({ workspaceSlug, workspaceName, isOpen, onClose, onProjectCreated }: AIAssistantProps) {
  // Load messages from localStorage on mount
  const storageKey = `ai-assistant-${workspaceSlug}`;
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (e) {
      console.error('Failed to load messages from localStorage:', e);
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(() => {
    // Load panel width from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ai-assistant-panel-width');
        return stored ? parseInt(stored, 10) : 384;
      } catch {
        return 384;
      }
    }
    return 384;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  
  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveMessageId, setSaveMessageId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ id: number; slug: string; name: string; description?: string }>>([]);
  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string>('');
  const [createNewProject, setCreateNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use overlay on mobile, push on desktop
  const useOverlay = isMobile;

  // Detect when header scrolls out of view (desktop push mode only)
  useEffect(() => {
    if (useOverlay) return; // Only needed for desktop push mode

    const header = document.querySelector('header');
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeaderVisible(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px' }
    );

    observer.observe(header);

    return () => observer.disconnect();
  }, [useOverlay]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        console.error('Failed to save messages to localStorage:', e);
      }
    }
  }, [messages, storageKey]);

  // Save panel width to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('ai-assistant-panel-width', panelWidth.toString());
    } catch (e) {
      console.error('Failed to save panel width to localStorage:', e);
    }
  }, [panelWidth]);

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      // Constrain between 320px (min) and 50% of viewport (max)
      const minWidth = 320;
      const maxWidth = window.innerWidth * 0.5;
      setPanelWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Set CSS variable for workspace content to adjust (desktop push mode only)
  useEffect(() => {
    if (!useOverlay && isOpen) {
      document.documentElement.style.setProperty('--ai-panel-width', `${panelWidth}px`);
      return () => {
        document.documentElement.style.removeProperty('--ai-panel-width');
      };
    }
  }, [panelWidth, useOverlay, isOpen]);

  // Clean up CSS variable when closed
  useEffect(() => {
    if (!isOpen) {
      document.documentElement.style.removeProperty('--ai-panel-width');
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Always use MCP agent
      const response = await fetch('/api/agent-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          workspaceSlug,
          conversationHistory: messages.slice(-10).map(msg => ({ // Last 10 messages for context
            role: msg.role,
            content: msg.content,
            sources: msg.sources
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Server error (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('quota exceeded') || error.message.includes('billing')) {
          errorContent = 'AI service quota exceeded. Please check your OpenAI billing details.';
        } else if (error.message.includes('invalid_api_key')) {
          errorContent = 'AI service configuration error. Please contact support.';
        } else if (error.message.includes('Database connection timeout')) {
          errorContent = 'The database is temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('AI service temporarily unavailable')) {
          errorContent = 'The AI service is temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('Unauthorized')) {
          errorContent = 'Please refresh the page and try again.';
        } else if (error.message.includes('Server error')) {
          errorContent = 'Server error occurred. Please try again.';
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    if (confirm('Clear conversation history? This cannot be undone.')) {
      setMessages([]);
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.error('Failed to clear messages from localStorage:', e);
      }
    }
  };

  // Fetch projects for save dialog
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Open save dialog
  const handleSaveClick = (messageId: string) => {
    setSaveMessageId(messageId);
    setSaveDialogOpen(true);
    fetchProjects();
    
    // Generate default title from message content
    const message = messages.find(m => m.id === messageId);
    if (message) {
      const timestamp = new Date().toLocaleDateString();
      const preview = message.content.substring(0, 50).replace(/\n/g, ' ');
      setSaveTitle(`AI Synthesis - ${timestamp}${preview ? `: ${preview}...` : ''}`);
    }
  };

  // Handle saving the insight
  const handleSaveInsight = async () => {
    if (!saveMessageId) return;
    
    const message = messages.find(m => m.id === saveMessageId);
    if (!message || message.role !== 'assistant') return;

    let projectSlug = selectedProjectSlug;

    // If creating new project, do that first
    if (createNewProject) {
      if (!newProjectName.trim()) {
        alert('Please enter a project name');
        return;
      }

      setSaving(true);
      try {
        const slug = newProjectName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        const createResponse = await fetch(`/w/${workspaceSlug}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: slug,
            name: newProjectName.trim(),
            description: newProjectDescription.trim()
          })
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.error || 'Failed to create project');
        }

        const projectData = await createResponse.json();
        projectSlug = projectData.project.slug;
        
        // Refresh projects list
        await fetchProjects();
        
        // Notify parent component to refresh its projects list
        if (onProjectCreated) {
          onProjectCreated();
        }
      } catch (error: any) {
        alert(error.message || 'Failed to create project');
        setSaving(false);
        return;
      }
    }

    if (!projectSlug) {
      alert('Please select or create a project');
      return;
    }

    if (!saveTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: saveTitle.trim(),
          body: message.content,
          tags: ['synthesized-insight']
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save insight');
      }

      // Success!
      setSaveDialogOpen(false);
      setSaveMessageId(null);
      setSelectedProjectSlug('');
      setCreateNewProject(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setSaveTitle('');
      
      // Show success message (you could use a toast library here)
      alert('Insight saved successfully!');
    } catch (error: any) {
      console.error('Error saving insight:', error);
      alert(error.message || 'Failed to save insight');
    } finally {
      setSaving(false);
    }
  };

  // Always render the dialog (even when panel is closed)
  const dialogContent = (
    <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Save as Insight</DialogTitle>
              <DialogDescription>
                Save this AI-generated insight as a document in your workspace. It will be tagged as "synthesized-insight".
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="save-title">Title</Label>
                <Input
                  id="save-title"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Enter a title for this insight..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-select">Project</Label>
                {!createNewProject ? (
                  <div className="space-y-2">
                    <Select value={selectedProjectSlug} onValueChange={setSelectedProjectSlug}>
                      <SelectTrigger id="project-select">
                        <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.slug}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateNewProject(true)}
                      className="w-full"
                    >
                      + Create New Project
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Project name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                    />
                    <Textarea
                      placeholder="Project description (optional)"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      rows={2}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCreateNewProject(false);
                        setNewProjectName('');
                        setNewProjectDescription('');
                      }}
                      className="w-full"
                    >
                      ← Select existing project
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSaveDialogOpen(false);
                  setCreateNewProject(false);
                  setNewProjectName('');
                  setNewProjectDescription('');
                  setSelectedProjectSlug('');
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveInsight}
                disabled={saving || !saveTitle.trim() || (!createNewProject && !selectedProjectSlug) || (createNewProject && !newProjectName.trim())}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save Insight
                  </>
                )}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
  );

  // Overlay mode (mobile)
  if (useOverlay) {
    return (
      <>
        <div 
          className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200"
          style={{ opacity: isOpen ? 1 : 0 }}
          onClick={onClose}
        >
          <div 
            className="fixed right-0 top-0 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col transition-transform duration-200 ease-out"
            style={{ 
              width: '100%', 
              maxWidth: '384px',
              transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
              opacity: isOpen ? 1 : 0
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Ask about {workspaceName}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearConversation}
                  className="h-8 w-8 p-0"
                  title="Clear conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm font-medium mb-2">
                  Ask me anything about your research in {workspaceName}
                </p>
                <p className="text-xs mb-4">
                  I can help you explore documents, analyze findings, summarize research, and answer questions about your projects.
                </p>
                <div className="text-xs space-y-1">
                  <p className="font-medium">Try asking:</p>
                  <p>• "What are the main findings in this workspace?"</p>
                  <p>• "Summarize the Product Research project"</p>
                  <p>• "What documents mention user feedback?"</p>
                  <p>• "Help me understand the key themes"</p>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <Card className={`p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </Card>
                  
                  {message.role === 'assistant' && (
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(message.content);
                          setCopiedMessageId(message.id);
                          setTimeout(() => setCopiedMessageId(null), 2000);
                        }}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title="Copy response"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleSaveClick(message.id)}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title="Save as insight"
                      >
                        <Bookmark className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Sources:</p>
                      {message.sources.map((source) => (
                        <div key={source.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <FileText className="h-3 w-3" />
                          <span>{source.title}</span>
                          <span className="text-gray-400">({source.project})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <Card className="p-3 bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your research..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save as Insight</DialogTitle>
            <DialogDescription>
              Save this AI-generated insight as a document in your workspace. It will be tagged as "synthesized-insight".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-title">Title</Label>
              <Input
                id="save-title"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Enter a title for this insight..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-select">Project</Label>
              {!createNewProject ? (
                <div className="space-y-2">
                  <Select value={selectedProjectSlug} onValueChange={setSelectedProjectSlug}>
                    <SelectTrigger id="project-select">
                      <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.slug}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateNewProject(true)}
                    className="w-full"
                  >
                    + Create New Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Project description (optional)"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreateNewProject(false);
                      setNewProjectName('');
                      setNewProjectDescription('');
                    }}
                    className="w-full"
                  >
                    ← Select existing project
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false);
                setCreateNewProject(false);
                setNewProjectName('');
                setNewProjectDescription('');
                setSelectedProjectSlug('');
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveInsight}
              disabled={saving || !saveTitle.trim() || (!createNewProject && !selectedProjectSlug) || (createNewProject && !newProjectName.trim())}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Insight
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // Push mode (desktop) - no overlay
  // When header is visible, panel starts below it; when header scrolls away, panel goes full height
  const panelTop = headerVisible ? '4rem' : '0';
  const panelHeight = headerVisible ? 'calc(100vh - 4rem)' : '100vh';

  return (
    <>
    <div 
      className="fixed right-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col z-40 transition-all duration-200 ease-out"
      style={{ 
        width: `${panelWidth}px`, 
        minWidth: '320px',
        top: panelTop,
        height: panelHeight,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        opacity: isOpen ? 1 : 0
      }}
    >
      {/* Resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors group"
        style={{ userSelect: 'none' }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-5 w-5 text-blue-500" />
        </div>
      </div>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Ask about {workspaceName}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                className="h-8 w-8 p-0"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm font-medium mb-2">
                Ask me anything about your research in {workspaceName}
              </p>
              <p className="text-xs mb-4">
                I can help you explore documents, analyze findings, summarize research, and answer questions about your projects.
              </p>
              <div className="text-xs space-y-1">
                <p className="font-medium">Try asking:</p>
                <p>• "What are the main findings in this workspace?"</p>
                <p>• "Summarize the Product Research project"</p>
                <p>• "What documents mention user feedback?"</p>
                <p>• "Help me understand the key themes"</p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              )}
              
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                <Card className={`p-3 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}>
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </Card>
                
                {message.role === 'assistant' && (
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(message.content);
                        setCopiedMessageId(message.id);
                        setTimeout(() => setCopiedMessageId(null), 2000);
                      }}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      title="Copy response"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSaveClick(message.id)}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      title="Save as insight"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sources:</p>
                    {message.sources.map((source) => (
                      <div key={source.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <FileText className="h-3 w-3" />
                        <span>{source.title}</span>
                        <span className="text-gray-400">({source.project})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <Card className="p-3 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your research..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save as Insight</DialogTitle>
            <DialogDescription>
              Save this AI-generated insight as a document in your workspace. It will be tagged as "synthesized-insight".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-title">Title</Label>
              <Input
                id="save-title"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Enter a title for this insight..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-select">Project</Label>
              {!createNewProject ? (
                <div className="space-y-2">
                  <Select value={selectedProjectSlug} onValueChange={setSelectedProjectSlug}>
                    <SelectTrigger id="project-select">
                      <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select a project"} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.slug}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateNewProject(true)}
                    className="w-full"
                  >
                    + Create New Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <Textarea
                    placeholder="Project description (optional)"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    rows={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreateNewProject(false);
                      setNewProjectName('');
                      setNewProjectDescription('');
                    }}
                    className="w-full"
                  >
                    ← Select existing project
                  </Button>
                </div>
              )}
      </div>
    </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false);
                setCreateNewProject(false);
                setNewProjectName('');
                setNewProjectDescription('');
                setSelectedProjectSlug('');
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveInsight}
              disabled={saving || !saveTitle.trim() || (!createNewProject && !selectedProjectSlug) || (createNewProject && !newProjectName.trim())}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Insight
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
