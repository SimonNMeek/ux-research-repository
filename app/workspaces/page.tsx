"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileBox, Search, Users, FileText, Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';

interface Workspace {
  id: number;
  slug: string;
  name: string;
  created_at: string;
  metadata: Record<string, any>;
  organization_id?: number;
  organization_name?: string;
  organization_slug?: string;
}

interface Project {
  id: number;
  slug: string;
  name: string;
  document_count: number;
}

interface WorkspaceStats {
  workspace: Workspace;
  project_count: number;
  document_count: number;
}

interface AuthUser {
  id: number;
  email: string;
  name: string;
  is_active: number;
  system_role?: string;
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<Record<string, Project[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');

  const loadProjectsForWorkspace = async (workspaceSlug: string): Promise<Project[]> => {
    try {
      const response = await fetch(`/w/${workspaceSlug}/api/projects`);
      if (response.ok) {
        const data = await response.json();
        return data.projects || [];
      }
    } catch (err) {
      console.warn(`Failed to load projects for workspace ${workspaceSlug}:`, err);
    }
    return [];
  };

  useEffect(() => {
    const loadUserAndWorkspaces = async () => {
      try {
        // Load user info first
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.user);
        }

        // Load workspaces
        const response = await fetch('/api/workspaces');
        let workspaceData: Workspace[] = [];
        
        if (response.ok) {
          const data = await response.json();
          workspaceData = data.workspaces || [];
        } else {
          // Fallback to known workspaces
          const knownWorkspaces = ['demo-co', 'client-x'];

          for (const slug of knownWorkspaces) {
            try {
              const response = await fetch(`/w/${slug}/api/workspace`);
              if (response.ok) {
                const workspace = await response.json();
                workspaceData.push(workspace);
              }
            } catch (err) {
              // Workspace might not exist, skip it
              console.warn(`Failed to load workspace ${slug}:`, err);
            }
          }
        }
        
        setWorkspaces(workspaceData);
        
        // Load projects for each workspace
        const projectsMap: Record<string, Project[]> = {};
        for (const workspace of workspaceData) {
          const projects = await loadProjectsForWorkspace(workspace.slug);
          projectsMap[workspace.slug] = projects;
        }
        setWorkspaceProjects(projectsMap);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndWorkspaces();
  }, []);

  const reloadWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces');
      let workspaceData: Workspace[] = [];
      
      if (response.ok) {
        const data = await response.json();
        workspaceData = data.workspaces || [];
      } else {
        // Fallback to known workspaces
        const knownWorkspaces = ['demo-co', 'client-x'];

        for (const slug of knownWorkspaces) {
          try {
            const response = await fetch(`/w/${slug}/api/workspace`);
            if (response.ok) {
              const workspace = await response.json();
              workspaceData.push(workspace);
            }
          } catch (err) {
            console.warn(`Failed to load workspace ${slug}:`, err);
          }
        }
      }
      
      setWorkspaces(workspaceData);
      
      // Load projects for each workspace
      const projectsMap: Record<string, Project[]> = {};
      for (const workspace of workspaceData) {
        const projects = await loadProjectsForWorkspace(workspace.slug);
        projectsMap[workspace.slug] = projects;
      }
      setWorkspaceProjects(projectsMap);
      
    } catch (err: any) {
      setError(err.message);
    }
  };

  const navigateToWorkspace = (workspaceSlug: string) => {
    router.push(`/w/${workspaceSlug}`);
  };

  const handleWorkspaceCreated = (newWorkspace: { id: number; slug: string; name: string }) => {
    setWorkspaces(prev => [...prev, newWorkspace]);
    router.push(`/w/${newWorkspace.slug}`);
  };

  const navigateToProject = (workspaceSlug: string, projectSlug: string) => {
    router.push(`/w/${workspaceSlug}/projects/${projectSlug}`);
  };

  // Helper functions for superadmin organization grouping
  const getUniqueOrganizations = () => {
    if (!user || user.system_role !== 'super_admin') return [];
    
    const orgs = new Set<string>();
    workspaces.forEach(workspace => {
      if (workspace.organization_name) {
        orgs.add(workspace.organization_name);
      }
    });
    return Array.from(orgs).sort();
  };

  const getFilteredWorkspaces = () => {
    if (!user || user.system_role !== 'super_admin' || selectedOrganization === 'all') {
      return workspaces;
    }
    return workspaces.filter(workspace => workspace.organization_name === selectedOrganization);
  };

  const getGroupedWorkspaces = () => {
    if (!user || user.system_role !== 'super_admin') {
      return { 'All Workspaces': getFilteredWorkspaces() };
    }

    const grouped: Record<string, Workspace[]> = {};
    const filteredWorkspaces = getFilteredWorkspaces();
    
    filteredWorkspaces.forEach(workspace => {
      const orgName = workspace.organization_name || 'Unknown Organization';
      if (!grouped[orgName]) {
        grouped[orgName] = [];
      }
      grouped[orgName].push(workspace);
    });

    return grouped;
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
                <div key={i} className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-6">
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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Choose a Workspace</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Select a workspace to access its research documents and projects
            </p>
          </div>
          <CreateWorkspaceModal onWorkspaceCreated={reloadWorkspaces} />
        </div>

        {/* Organization Filter for Superadmins */}
        {user?.system_role === 'super_admin' && getUniqueOrganizations().length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Organization:
              </label>
              <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {getUniqueOrganizations().map(orgName => (
                    <SelectItem key={orgName} value={orgName}>
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 mr-2" />
                        {orgName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Workspaces Grid */}
        {workspaces.length === 0 ? (
          <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <FileBox className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Workspaces Found</h3>
            <p className="text-gray-600 mb-4">
              No workspaces are currently available. Contact your administrator to get access.
            </p>
            <CreateWorkspaceModal onWorkspaceCreated={reloadWorkspaces} />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(getGroupedWorkspaces()).map(([groupName, groupWorkspaces]) => (
              <div key={groupName}>
                {/* Organization Header for Superadmins */}
                {user?.system_role === 'super_admin' && groupWorkspaces.length > 0 && (
                  <div className="flex items-center mb-4">
                    <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {groupName}
                    </h2>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      ({groupWorkspaces.length} workspace{groupWorkspaces.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupWorkspaces.map(workspace => (
                    <div
                      key={workspace.slug}
                      className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => navigateToWorkspace(workspace.slug)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <FileBox className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                              {workspace.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">/{workspace.slug}</p>
                            {/* Show organization name for superadmins */}
                            {user?.system_role === 'super_admin' && workspace.organization_name && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center mt-1">
                                <Building2 className="w-3 h-3 mr-1" />
                                {workspace.organization_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Projects</h4>
                        {workspaceProjects[workspace.slug] && workspaceProjects[workspace.slug].length > 0 ? (
                          <div className="space-y-2">
                            {workspaceProjects[workspace.slug].map(project => (
                              <div key={project.id} className="flex items-center justify-between text-sm">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToProject(workspace.slug, project.slug);
                                  }}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-left transition-colors"
                                >
                                  {project.name}
                                </button>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {project.document_count} {project.document_count === 1 ? 'file' : 'files'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No projects yet</p>
                        )}
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
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
