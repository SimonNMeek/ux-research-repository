"use client";
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Heart, Search, FolderOpen, Calendar, Star, Filter, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import Breadcrumbs from '@/components/Breadcrumbs';
import ReactMarkdown from 'react-markdown';

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
  created_at: string;
}

interface FavoriteDocument {
  id: number;
  title: string;
  project_slug: string;
  project_name: string;
  created_at: string;
  snippet?: string;
}

interface SearchResult {
  document_id: number;
  project_slug: string;
  title: string;
  snippet?: string;
  created_at: string;
  is_favorite: boolean;
}

interface SearchResponse {
  results: SearchResult[];
  workspace_slug: string;
  metadata: {
    duration_ms: number;
    scanned_count: number;
    mode: string;
    project_count: number;
  };
}

interface Document {
  id: number;
  project_id: number;
  title: string;
  body: string;
  clean_text?: string;
  is_favorite: boolean;
  project_slug: string;
  tags: string[];
}

export default function WorkspaceDashboard() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.ws as string;
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [favoriteDocuments, setFavoriteDocuments] = useState<FavoriteDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Project creation modal state
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<SearchResponse['metadata'] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Document viewer state
  const [viewingDocument, setViewingDocument] = useState<{ open: boolean; document: Document | null; loading: boolean }>({ 
    open: false, document: null, loading: false 
  });

  // Load workspace data
  useEffect(() => {
    const loadWorkspaceData = async () => {
      try {
        setLoading(true);
        
        // Load workspace info
        const workspaceRes = await fetch(`/w/${workspaceSlug}/api/workspace`);
        if (!workspaceRes.ok) {
          throw new Error('Workspace not found');
        }
        const workspaceData = await workspaceRes.json();
        setWorkspace(workspaceData);

        // Load projects
        const projectsRes = await fetch(`/w/${workspaceSlug}/api/projects`);
        if (!projectsRes.ok) {
          throw new Error('Failed to load projects');
        }
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects);

        // Load favorite documents
        const favoritesRes = await fetch(`/w/${workspaceSlug}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            q: '', 
            mode: 'favorites_only',
            limit: 10 
          })
        });
        
        if (favoritesRes.ok) {
          const favoritesData = await favoritesRes.json();
          // Transform search results to favorite documents
          const favorites: FavoriteDocument[] = favoritesData.results.map((result: any) => ({
            id: result.document_id,
            title: result.title,
            project_slug: result.project_slug,
            project_name: projectsData.projects.find((p: Project) => p.slug === result.project_slug)?.name || result.project_slug,
            created_at: result.created_at,
            snippet: result.snippet
          }));
          setFavoriteDocuments(favorites);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaceData();
  }, [workspaceSlug]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearchMetadata(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const searchBody = {
        q: searchQuery,
        mode: 'fulltext',
        ...(selectedProjects.length > 0 && { projectSlugs: selectedProjects })
      };

      const response = await fetch(`/w/${workspaceSlug}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data: SearchResponse = await response.json();
      setResults(data.results);
      setSearchMetadata(data.metadata);
    } catch (err: any) {
      setSearchError(err.message);
      setResults([]);
      setSearchMetadata(null);
    } finally {
      setSearchLoading(false);
    }
  }, [workspaceSlug, selectedProjects]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const toggleProject = (projectSlug: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectSlug)
        ? prev.filter(p => p !== projectSlug)
        : [...prev, projectSlug]
    );
  };

  const viewDocument = useCallback(async (documentId: number) => {
    setViewingDocument({ open: true, document: null, loading: true });
    
    try {
      // Find the project for this document
      const result = results.find(r => r.document_id === documentId);
      if (!result) {
        throw new Error('Document not found');
      }

      const response = await fetch(`/w/${workspaceSlug}/api/projects/${result.project_slug}/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to load document');
      }
      
      const documentData = await response.json();
      setViewingDocument({ open: true, document: documentData.document, loading: false });
    } catch (err: any) {
      alert(err.message);
      setViewingDocument({ open: false, document: null, loading: false });
    }
  }, [workspaceSlug, results]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const newProject = await response.json();
      setProjects(prev => [...prev, newProject.project]);
      setCreateProjectOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const navigateToProject = (projectSlug: string) => {
    router.push(`/w/${workspaceSlug}/projects/${projectSlug}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error</h2>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !workspace) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

    const breadcrumbItems = [
      { label: workspace.name, current: true }
    ];

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-6xl mx-auto p-6">
          {/* Breadcrumbs */}
          <Breadcrumbs items={breadcrumbItems} />

          {/* Workspace Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{workspace.name}</h1>
            <p className="text-gray-600">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} • {favoriteDocuments.length} favourite documents
            </p>
          </div>

        {/* Search Interface */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search research documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Project Filter */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Projects:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedProjects.length === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedProjects([])}
              >
                All Projects
              </Button>
              {projects.map(project => (
                <Button
                  key={project.slug}
                  variant={selectedProjects.includes(project.slug) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleProject(project.slug)}
                >
                  {project.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Search Metadata */}
          {searchMetadata && (
            <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
              Found {searchMetadata.scanned_count} results in {searchMetadata.duration_ms}ms 
              across {searchMetadata.project_count} projects
            </div>
          )}
        </div>

        {/* Search Results */}
        {query.trim() && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            <div className="space-y-4">
              {searchLoading && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              )}

              {!searchLoading && searchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">{searchError}</p>
                </div>
              )}

              {!searchLoading && results.length === 0 && query.trim() && !searchError && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No documents found matching "{query}"</p>
                  {selectedProjects.length > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      in projects: {selectedProjects.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {results.map(result => (
                <div key={result.document_id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                      {result.title}
                    </h3>
                    {result.is_favorite && (
                      <span className="text-red-500 ml-2">♥</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {projects.find(p => p.slug === result.project_slug)?.name || result.project_slug}
                    </span>
                    <span>{new Date(result.created_at).toLocaleDateString()}</span>
                  </div>

                  {result.snippet && (
                    <div 
                      className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4"
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                    />
                  )}

                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewDocument(result.document_id)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Document
                    </Button>
                    <span className="text-xs text-gray-400">ID: {result.document_id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8">
          <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="project-description">Description (optional)</Label>
                  <textarea
                    id="project-description"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Describe what this project is about..."
                    className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCreateProjectOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateProject}
                    disabled={creating || !newProjectName.trim()}
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Projects</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{projects.length} total</span>
            </div>
            
            {projects.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No projects yet</h3>
                <p className="text-gray-600 mb-4">Create your first project to start organising your research documents.</p>
                <Button onClick={() => setCreateProjectOpen(true)} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Project
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(project => (
                  <div 
                    key={project.slug} 
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigateToProject(project.slug)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">{project.name}</h3>
                      <FolderOpen className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                    
                    {project.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{project.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">{project.slug}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Favorites Sidebar */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Favourites
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{favoriteDocuments.length} total</span>
            </div>
            
            {favoriteDocuments.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                <Star className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">No favourites yet</h3>
                <p className="text-sm text-gray-600">Star documents to see them here for quick access.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {favoriteDocuments.map(doc => (
                  <div 
                    key={doc.id} 
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => {
                      // TODO: Navigate to document view
                      console.log('View favorite document:', doc.id);
                    }}
                  >
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2 line-clamp-2">{doc.title}</h4>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {doc.project_name}
                      </span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {doc.snippet && (
                      <p className="text-xs text-gray-600 line-clamp-2">{doc.snippet}</p>
                    )}
                  </div>
                ))}
                
                {favoriteDocuments.length >= 10 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={navigateToSearch}
                  >
                    View All Favourites
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document Viewer Modal */}
        <Dialog 
          open={viewingDocument.open} 
          onOpenChange={(open) => setViewingDocument({ open, document: null, loading: false })}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewingDocument.document?.title || 'Loading...'}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {viewingDocument.loading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : viewingDocument.document ? (
                <div className="prose max-w-none">
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
      </div>
    </div>
  );
}
