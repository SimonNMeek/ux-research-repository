"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Search, Filter, ArrowUpDown, Upload, Heart, Tag, Trash2, Eye, Edit3, X, Plus } from 'lucide-react';
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

interface SearchResult {
  document_id: number;
  project_slug: string;
  title: string;
  snippet?: string;
  created_at: string;
  is_favorite: boolean;
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

export default function WorkspaceSearchPage() {
  const params = useParams();
  const workspaceSlug = params.ws as string;
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<SearchResponse['metadata'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Upload functionality
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProject, setUploadProject] = useState<string>('');
  const [uploadTags, setUploadTags] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [anonymizationConfig, setAnonymizationConfig] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Document management
  const [viewingDocument, setViewingDocument] = useState<{ open: boolean; document: Document | null; loading: boolean }>({ 
    open: false, document: null, loading: false 
  });
  const [editingTags, setEditingTags] = useState<{ 
    open: boolean; documentId: number | null; currentTags: string[]; newTag: string 
  }>({ open: false, documentId: null, currentTags: [], newTag: '' });
  const [allTags, setAllTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date-newest' | 'date-oldest' | 'favorites-first'>('date-newest');

  // Load workspace and projects
  useEffect(() => {
    const loadWorkspaceData = async () => {
      try {
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
      } catch (err: any) {
        setError(err.message);
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

    setLoading(true);
    setError(null);

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
      setError(err.message);
      setResults([]);
      setSearchMetadata(null);
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: workspace.name, href: `/w/${workspaceSlug}` },
    { label: 'Search', current: true }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Workspace Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{workspace.name}</h1>
          <p className="text-gray-600">Search across {projects.length} projects</p>
        </div>

        {/* Search Interface */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
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
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by Projects:</span>
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
            <div className="text-xs text-gray-500 border-t pt-2">
              Found {searchMetadata.scanned_count} results in {searchMetadata.duration_ms}ms 
              across {searchMetadata.project_count} projects
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-500">No documents found matching "{query}"</p>
              {selectedProjects.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  in projects: {selectedProjects.join(', ')}
                </p>
              )}
            </div>
          )}

          {!loading && results.length === 0 && !query.trim() && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-500">Enter a search query to find research documents</p>
            </div>
          )}

          {results.map(result => (
            <div key={result.document_id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">
                  {result.title}
                </h3>
                {result.is_favorite && (
                  <span className="text-red-500 ml-2">♥</span>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                  {projects.find(p => p.slug === result.project_slug)?.name || result.project_slug}
                </span>
                <span>{new Date(result.created_at).toLocaleDateString()}</span>
              </div>

              {result.snippet && (
                <div 
                  className="text-gray-700 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />
              )}

              <div className="mt-4 flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Open document modal or navigate to document page
                    console.log('View document:', result.document_id);
                  }}
                >
                  View Document
                </Button>
                <span className="text-xs text-gray-400">ID: {result.document_id}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Projects Overview */}
        {projects.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Projects in {workspace.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(project => (
                <div key={project.slug} className="border border-gray-100 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  <p className="text-xs text-gray-400 mt-2">Slug: {project.slug}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
