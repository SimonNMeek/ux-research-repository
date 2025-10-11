"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search, Tag, ArrowUpDown, Upload, Heart, Trash2, Eye, Edit3, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import Header from '@/components/Header';
import Breadcrumbs from '@/components/Breadcrumbs';
import AnonymizeStep from '@/components/AnonymizeStep';

interface Workspace {
  id: number;
  slug: string;
  name: string;
}

interface Project {
  id: number;
  workspace_id: number;
  slug: string;
  name: string;
  description: string;
}

interface Document {
  id: number;
  project_id: number;
  title: string;
  body: string;
  clean_text?: string;
  is_favorite: boolean;
  created_at: string;
  tags: { id: number; name: string }[];
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.ws as string;
  const projectSlug = params.projectSlug as string;
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date-newest' | 'date-oldest' | 'favorites-first'>('date-newest');
  
  // Upload state - atomic initialization
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadTags, setUploadTags] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [anonymizationConfig, setAnonymizationConfig] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Document management state
  const [viewingDocument, setViewingDocument] = useState<{ open: boolean; document: Document | null; loading: boolean }>({ 
    open: false, document: null, loading: false 
  });
  const [editingTags, setEditingTags] = useState<{ 
    open: boolean; documentId: number | null; currentTags: { id: number; name: string }[]; newTag: string 
  }>({ open: false, documentId: null, currentTags: [], newTag: '' });
  const [renaming, setRenaming] = useState<{ 
    open: boolean; documentId: number | null; currentTitle: string; newTitle: string 
  }>({ open: false, documentId: null, currentTitle: '', newTitle: '' });
  const [renamingProject, setRenamingProject] = useState<{
    open: boolean; currentName: string; newName: string 
  }>({ open: false, currentName: '', newName: '' });
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  // Safety checks - ensure all state is properly initialized
  const safeDocuments = documents || [];
  const safeWorkspace = workspace || null;
  const safeProject = project || null;

  // No helpers - direct access

  // Load workspace, project, and documents
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load workspace info
        const workspaceRes = await fetch(`/w/${workspaceSlug}/api/workspace`);
        if (!workspaceRes.ok) {
          throw new Error('Workspace not found');
        }
        const workspaceData = await workspaceRes.json();
        setWorkspace(workspaceData);

        // Load project documents
        const documentsRes = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents`);
        if (!documentsRes.ok) {
          throw new Error('Project not found or failed to load documents');
        }
        const documentsData = await documentsRes.json();
        setProject(documentsData.project);
        setDocuments(documentsData.documents);

        // Extract all unique tags
        const tags = new Set<string>();
        documentsData.documents.forEach((doc: Document) => {
          if (doc.tags && Array.isArray(doc.tags)) {
            doc.tags.forEach(tag => tags.add(tag.name));
          }
        });
        const finalTags = Array.from(tags).sort();
        const safeTags = finalTags.filter((tag, index, arr) => 
          typeof tag === 'string' && tag.trim() && arr.indexOf(tag) === index
        );
        setAllTags(safeTags);
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [workspaceSlug, projectSlug]);

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    if (!safeDocuments || !Array.isArray(safeDocuments)) {
      return [];
    }
    let filtered = safeDocuments;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        doc.body.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (tagFilter) {
      filtered = filtered.filter(doc => 
        doc.tags.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date-oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'favorites-first':
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return sorted;
  }, [safeDocuments, searchQuery, tagFilter, sortBy]);

  // Drag and drop handlers
  const prevent = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    prevent(e);
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    const validFiles = droppedFiles.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.md'));
    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
    }
  }, [prevent]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(file => 
        file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')
      );
      setUploadFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of uploadFiles) {
        const content = await file.text();
        
        const uploadData = {
          title: file.name,
          body: content,
          tags: uploadTags.split(',').map(tag => tag.trim()).filter(Boolean),
          ...(anonymizationConfig && { 
            anonymize: true, 
            anonymizationConfig 
          })
        };

        const response = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }

        const result = await response.json();
        setDocuments(prev => [result.document, ...prev]);
      }

      // Clear upload state
      setUploadFiles([]);
      setUploadTags('');
      setAnonymizationConfig(null);
      
      // Refresh tags from API
      try {
        const docsResponse = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents`);
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          const tags = new Set<string>();
          docsData.documents.forEach((doc: any) => {
            if (doc.tags && Array.isArray(doc.tags)) {
              doc.tags.forEach((tag: any) => {
                if (tag && typeof tag === 'object' && tag.name) {
                  tags.add(tag.name);
                } else if (typeof tag === 'string') {
                  tags.add(tag);
                }
              });
            }
          });
          const finalTags = Array.from(tags).sort();
          console.log('Setting allTags:', finalTags);
          // Ensure allTags contains only unique strings
          const safeTags = finalTags.filter((tag, index, arr) => 
            typeof tag === 'string' && tag.trim() && arr.indexOf(tag) === index
          );
          setAllTags(safeTags);
        }
      } catch (err) {
        console.error('Failed to refresh tags:', err);
      }
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }, [uploadFiles, uploadTags, anonymizationConfig, workspaceSlug, projectSlug, documents]);

  // Document actions
  const toggleFavorite = useCallback(async (documentId: number) => {
    // Optimistically update the UI
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, is_favorite: !doc.is_favorite }
        : doc
    ));

    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents/${documentId}/favorite`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        // Revert on error
        setDocuments(prev => prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, is_favorite: !doc.is_favorite }
            : doc
        ));
        throw new Error('Failed to toggle favorite');
      }
    } catch (err: any) {
      alert(err.message);
    }
  }, [workspaceSlug, projectSlug]);

  const deleteDocument = useCallback(async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents/${documentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (err: any) {
      alert(err.message);
    }
  }, [workspaceSlug, projectSlug]);

  const viewDocument = useCallback(async (documentId: number) => {
    setViewingDocument({ open: true, document: null, loading: true });
    
    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to load document');
      }
      
      const documentData = await response.json();
      setViewingDocument({ open: true, document: documentData.document, loading: false });
    } catch (err: any) {
      alert(err.message);
      setViewingDocument({ open: false, document: null, loading: false });
    }
  }, [workspaceSlug, projectSlug]);

  // Tag management functions
  const addTag = useCallback(async (documentId: number, tag: string) => {
    if (!tag.trim()) return;
    
    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents/${documentId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tag.trim() })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add tag');
      }
      
      // Refresh documents
      const documentsRes = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents`);
      if (documentsRes.ok) {
        const documentsData = await documentsRes.json();
        setDocuments(documentsData.documents);
        
        // Update all tags
        const tags = new Set<string>();
        documentsData.documents.forEach((doc: Document) => {
          doc.tags.forEach(tag => tags.add(tag.name));
        });
        const finalTags = Array.from(tags).sort();
        const safeTags = finalTags.filter((tag, index, arr) => 
          typeof tag === 'string' && tag.trim() && arr.indexOf(tag) === index
        );
        setAllTags(safeTags);

        // Update current editing modal tags if this was for the currently editing document
        if (editingTags.documentId === documentId) {
          const updatedDoc = documentsData.documents.find((d: Document) => d.id === documentId);
          if (updatedDoc) {
            setEditingTags(prev => ({ 
              ...prev, 
              currentTags: updatedDoc.tags || [] 
            }));
          }
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  }, [workspaceSlug, projectSlug, editingTags.documentId]);

  const removeTag = useCallback(async (documentId: number, tag: string) => {
    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents/${documentId}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove tag');
      }
      
      // Refresh documents
      const documentsRes = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents`);
      if (documentsRes.ok) {
        const documentsData = await documentsRes.json();
        setDocuments(documentsData.documents);
        
        // Update all tags
        const tags = new Set<string>();
        documentsData.documents.forEach((doc: Document) => {
          doc.tags.forEach(tag => tags.add(tag.name));
        });
        const finalTags = Array.from(tags).sort();
        const safeTags = finalTags.filter((tag, index, arr) => 
          typeof tag === 'string' && tag.trim() && arr.indexOf(tag) === index
        );
        setAllTags(safeTags);

        // Update current editing modal tags if this was for the currently editing document
        if (editingTags.documentId === documentId) {
          const updatedDoc = documentsData.documents.find((d: Document) => d.id === documentId);
          if (updatedDoc) {
            setEditingTags(prev => ({ 
              ...prev, 
              currentTags: updatedDoc.tags || [] 
            }));
          }
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  }, [workspaceSlug, projectSlug, editingTags.documentId]);

  // File renaming function
  const renameDocument = useCallback(async (documentId: number, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}/documents/${documentId}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      
      if (!response.ok) {
        throw new Error('Failed to rename document');
      }
      
      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, title: newTitle.trim() } : doc
      ));
      
      setRenaming({ open: false, documentId: null, currentTitle: '', newTitle: '' });
    } catch (err: any) {
      alert(err.message);
    }
  }, [workspaceSlug, projectSlug]);

  // Project renaming function
  const renameProject = useCallback(async (newName: string) => {
    if (!newName.trim() || !project) return;
    
    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects/${projectSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      
      if (!response.ok) {
        throw new Error('Failed to rename project');
      }
      
      // Update local state
      setProject({ ...project, name: newName.trim() });
      setRenamingProject({ open: false, currentName: '', newName: '' });
      
      // Also need to refresh projects list in workspace API - but for now just update local state
    } catch (err: any) {
      alert(err.message);
    }
  }, [workspaceSlug, projectSlug, project]);

  // Clean filename for display (remove Notion hashes and extensions)
  const cleanFilename = useCallback((filename: string) => {
    return filename
      .replace(/^.*[\/\\]/, '') // Remove path
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/\s+[a-f0-9]{32}$/i, '') // Remove Notion hash at end
      .replace(/\s+[a-f0-9]{8,}$/i, '') // Remove other long hashes
      .trim();
  }, []);

  // Memoized safe tags to prevent hydration issues
  const safeAllTags = useMemo(() => {
    if (!Array.isArray(allTags)) return [];
    return allTags.filter(tag => typeof tag === 'string' && tag.trim());
  }, [allTags]);

  // Tag suggestions
  const updateTagSuggestions = useCallback((input: string) => {
    if (!input.trim()) {
      setTagSuggestions([]);
      return;
    }
    
    const filtered = safeAllTags.filter(tag => 
      tag.toLowerCase().includes(input.toLowerCase()) &&
      !editingTags.currentTags.some(currentTag => currentTag.name === tag)
    ).slice(0, 5);
    
    setTagSuggestions(filtered);
  }, [safeAllTags, editingTags.currentTags]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !safeWorkspace || !safeProject) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: safeWorkspace?.name || 'Loading...', href: `/w/${workspaceSlug}` },
    { label: safeProject?.name || 'Loading...', current: true }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-6xl mx-auto p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">{project.name}</h1>
            <button
              onClick={() => setRenamingProject({ 
                open: true, 
                currentName: project.name, 
                newName: project.name 
              })}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Rename project"
            >
              <Edit3 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          {project.description && (
            <p className="text-gray-600 mb-4">{project.description}</p>
          )}
          <p className="text-sm text-gray-500">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="space-y-6">
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
              }`}
              onDrop={onDrop}
              onDragOver={(e) => { prevent(e); setDragActive(true); }}
              onDragEnter={prevent}
              onDragLeave={() => setDragActive(false)}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Drag a .txt/.md file here</p>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="mb-4"
              >
                Browse files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Selected Files */}
            {uploadFiles.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Selected Files ({uploadFiles.length})</h3>
                <div className="space-y-2">
                  {uploadFiles.map((file, index) => (
                    <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Tags */}
            {allTags.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Previous tags</Label>
                <div className="flex flex-wrap gap-2">
                  {safeAllTags
                    .slice(0, 10)
                    .map((tag, index) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = uploadTags.split(',').map(t => t.trim()).filter(Boolean);
                        if (!currentTags.includes(tag)) {
                          setUploadTags(prev => prev ? `${prev}, ${tag}` : tag);
                        }
                      }}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm hover:bg-blue-200 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* New Tag Field */}
            <div>
              <Label htmlFor="upload-tags" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Add new tag</Label>
              <Input
                id="upload-tags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="Enter tags separated by commas..."
                className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Anonymization */}
            <AnonymizeStep
              files={uploadFiles}
              onConfigChange={setAnonymizationConfig}
              onPreview={async (content, config) => {
                try {
                  // Call the anonymization API for preview
                  const formData = new FormData();
                  formData.append('text', content);
                  formData.append('config', JSON.stringify(config));
                  
                  const response = await fetch('/api/anonymize-preview', {
                    method: 'POST',
                    body: formData
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to anonymize preview');
                  }
                  
                  const result = await response.json();
                  return {
                    anonymizedText: result.anonymizedText,
                    matches: result.matches || [],
                    summary: result.summary || { totalReplacements: 0, byType: {}, byStrategy: {} }
                  };
                } catch (error) {
                  console.error('Anonymization preview failed:', error);
                  // Return original content as fallback
                  return {
                    anonymizedText: content,
                    matches: [],
                    summary: { totalReplacements: 0, byType: {}, byStrategy: {} }
                  };
                }
              }}
            />

            {/* Upload Button */}
            {uploadFiles.length > 0 && (
              <div className="flex gap-3">
                <Button 
                  onClick={() => setUploadFiles([])} 
                  disabled={uploading}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {uploading ? 'Uploading...' : `Upload ${uploadFiles.length} ${uploadFiles.length === 1 ? 'file' : 'files'}`}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="flex-1 relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Filter by tag..."
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="pl-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-newest">Date (newest first)</SelectItem>
                <SelectItem value="date-oldest">Date (oldest first)</SelectItem>
                <SelectItem value="favorites-first">Favourites first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Documents List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(filteredAndSortedDocuments || []).map(document => (
            <div key={document.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <button
                  onClick={() => viewDocument(document.id)}
                  className="font-semibold text-gray-900 dark:text-gray-100 flex-1 break-words leading-tight text-left hover:text-blue-600 transition-colors"
                >
                  {cleanFilename(document.title)}
                </button>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(document.id)}
                    className="p-1 h-auto"
                  >
                    <Heart className={`w-4 h-4 ${document.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <span>{new Date(document.created_at).toLocaleDateString()}</span>
              </div>

              {document.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {document.tags.map(tag => (
                    <span key={tag.id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewDocument(document.id)}
                    className="p-1 h-auto"
                    title="View document"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTags({ 
                      open: true, 
                      documentId: document.id, 
                      currentTags: document.tags || [], 
                      newTag: '' 
                    })}
                    className="p-1 h-auto"
                    title="Edit tags"
                  >
                    <Tag className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRenaming({ 
                      open: true, 
                      documentId: document.id, 
                      currentTitle: document.title, 
                      newTitle: cleanFilename(document.title) 
                    })}
                    className="p-1 h-auto"
                    title="Rename file"
                  >
                    <Edit3 className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDocument(document.id)}
                    className="p-1 h-auto"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4 text-gray-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(filteredAndSortedDocuments || []).length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500">
              {searchQuery || tagFilter ? 'No documents match your search criteria.' : 'No documents in this project yet.'}
            </p>
          </div>
        )}

        {/* Document Viewer Modal */}
        <Dialog 
          open={viewingDocument.open} 
          onOpenChange={(open) => setViewingDocument({ open, document: null, loading: false })}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle>
                {viewingDocument.document?.title || 'Loading...'}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {viewingDocument.loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ) : viewingDocument.document ? (
                <div className="prose max-w-none prose-gray dark:prose-invert">
                  <ReactMarkdown>
                    {viewingDocument.document.clean_text || viewingDocument.document.body}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Failed to load document</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Tag Editor Modal */}
        <Dialog 
          open={editingTags.open} 
          onOpenChange={(open) => {
            setEditingTags({ open, documentId: null, currentTags: [], newTag: '' });
            setTagSuggestions([]);
          }}
        >
          <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-gray-100">Edit Tags</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-gray-900 dark:text-gray-100">Current Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editingTags.currentTags.map(tag => (
                    <span key={tag.id} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {tag.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editingTags.documentId && removeTag(editingTags.documentId, tag.name)}
                        className="p-0 h-auto text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </span>
                  ))}
                  {editingTags.currentTags.length === 0 && (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">No tags yet</span>
                  )}
                </div>
              </div>

              {/* Existing Tags */}
              {allTags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Existing tags</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {safeAllTags
                      .filter(tag => !editingTags.currentTags.some(currentTag => currentTag.name === tag))
                      .slice(0, 15)
                      .map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (editingTags.documentId) {
                              addTag(editingTags.documentId, tag);
                              // Remove the tag from suggestions after adding
                              setTagSuggestions(prev => prev.filter(t => t !== tag));
                            }
                          }}
                          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                  </div>
                  {allTags.filter(tag => !editingTags.currentTags.some(currentTag => currentTag.name === tag)).length === 0 && (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">All existing tags are already added</span>
                  )}
                </div>
              )}
              
              <div className="relative">
                <Label htmlFor="new-tag" className="text-gray-900 dark:text-gray-100">Add New Tag</Label>
                <div className="flex gap-2 mt-1">
                  <div className="flex-1 relative">
                    <Input
                      id="new-tag"
                      value={editingTags.newTag}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditingTags(prev => ({ ...prev, newTag: value }));
                        updateTagSuggestions(value);
                      }}
                      placeholder="Enter tag name..."
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && editingTags.newTag.trim() && editingTags.documentId) {
                          addTag(editingTags.documentId, editingTags.newTag);
                          setEditingTags(prev => ({ ...prev, newTag: '' }));
                          setTagSuggestions([]);
                        }
                      }}
                    />
                    {tagSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 mt-1">
                        {tagSuggestions.map(tag => (
                          <button
                            key={tag}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
                            onClick={() => {
                              if (editingTags.documentId) {
                                addTag(editingTags.documentId, tag);
                                setEditingTags(prev => ({ ...prev, newTag: '' }));
                                setTagSuggestions([]);
                              }
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      if (editingTags.newTag.trim() && editingTags.documentId) {
                        addTag(editingTags.documentId, editingTags.newTag);
                        setEditingTags(prev => ({ ...prev, newTag: '' }));
                        setTagSuggestions([]);
                      }
                    }}
                    disabled={!editingTags.newTag.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename Modal */}
        <Dialog 
          open={renaming.open} 
          onOpenChange={(open) => setRenaming({ open, documentId: null, currentTitle: '', newTitle: '' })}
        >
          <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle>Rename File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="new-filename">New Filename</Label>
                <Input
                  id="new-filename"
                  value={renaming.newTitle}
                  onChange={(e) => setRenaming(prev => ({ ...prev, newTitle: e.target.value }))}
                  placeholder="Enter new filename..."
                  className="mt-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && renaming.newTitle.trim() && renaming.documentId) {
                      renameDocument(renaming.documentId, renaming.newTitle);
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setRenaming({ open: false, documentId: null, currentTitle: '', newTitle: '' })}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (renaming.newTitle.trim() && renaming.documentId) {
                      renameDocument(renaming.documentId, renaming.newTitle);
                    }
                  }}
                  disabled={!renaming.newTitle.trim()}
                >
                  Rename
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Project Rename Modal */}
        <Dialog open={renamingProject.open} onOpenChange={(open) => !open && setRenamingProject({ open: false, currentName: '', newName: '' })}>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle>Rename Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="current-project-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Current name</Label>
                <p className="mt-1 text-gray-600">{renamingProject.currentName}</p>
              </div>
              <div>
                <Label htmlFor="new-project-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">New name</Label>
                <Input
                  id="new-project-name"
                  value={renamingProject.newName}
                  onChange={(e) => setRenamingProject(prev => ({ ...prev, newName: e.target.value }))}
                  placeholder="Enter new project name..."
                  className="mt-1 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && renamingProject.newName.trim()) {
                      renameProject(renamingProject.newName);
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setRenamingProject({ open: false, currentName: '', newName: '' })}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (renamingProject.newName.trim()) {
                      renameProject(renamingProject.newName);
                    }
                  }}
                  disabled={!renamingProject.newName.trim()}
                >
                  Rename
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
