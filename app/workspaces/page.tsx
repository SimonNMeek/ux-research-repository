"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Search, Users, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';

interface Workspace {
  id: number;
  slug: string;
  name: string;
  created_at: string;
  metadata: Record<string, any>;
}

interface WorkspaceStats {
  workspace: Workspace;
  project_count: number;
  document_count: number;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const response = await fetch('/api/workspaces');
        if (!response.ok) throw new Error('Failed to load workspaces');
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

  const navigateToWorkspace = (workspaceSlug: string) => {
    router.push(`/w/${workspaceSlug}`);
  };

  const handleWorkspaceCreated = (newWorkspace: { id: number; slug: string; name: string }) => {
    setWorkspaces(prev => [...prev, newWorkspace]);
    router.push(`/w/${newWorkspace.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Choose a Workspace</h1>
            <p className="text-gray-600">
              Select a workspace to access its research documents and projects
            </p>
          </div>
          <Button
            onClick={() => setCreateWorkspaceOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </Button>
        </div>

        {/* Workspaces Grid */}
        {workspaces.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Workspaces Found</h3>
            <p className="text-gray-600 mb-4">
              No workspaces are currently available. Contact your administrator to get access.
            </p>
            <Button onClick={() => setCreateWorkspaceOpen(true)} className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workspaces.map(workspace => (
              <div
                key={workspace.slug}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigateToWorkspace(workspace.slug)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                        {workspace.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">/{workspace.slug}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>Multi-project workspace</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Search className="w-4 h-4 mr-2" />
                    <span>Full-text search available</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2" />
                    <span>Research documents & insights</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Created {new Date(workspace.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToWorkspace(workspace.slug);
                    }}
                  >
                    Enter Workspace
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </div>
  );
}
