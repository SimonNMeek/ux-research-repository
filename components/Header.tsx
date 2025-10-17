"use client";
import { useState, useRef, useEffect } from 'react';
import { User, Settings, CreditCard, LogOut, ChevronDown, Building2, Moon, Sun, Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { useDarkMode } from '@/hooks/useDarkMode';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';

interface AuthUser {
  id: number;
  email: string;
  name: string;
  is_active: number;
  system_role?: string;
}

interface Workspace {
  id: number;
  slug: string;
  name: string;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useDarkMode();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);

  // Load user info and workspaces
  useEffect(() => {
    const loadUserAndWorkspaces = async () => {
      // Load user info
      try {
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.user);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
      }

      // Load workspaces
      try {
        const response = await fetch('/api/workspaces');
        if (response.ok) {
          const data = await response.json();
          setWorkspaces(data.workspaces || []);
        } else {
          console.warn('Failed to load workspaces from API, falling back to known workspaces');
          // Fallback to known workspaces
          const knownWorkspaces = ['demo-co', 'client-x'];
          const workspaceData: Workspace[] = [];

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
          setWorkspaces(workspaceData);
        }
      } catch (err) {
        console.error('Failed to load workspaces:', err);
        setWorkspaces([]);
      }

      // Detect current workspace from URL
      const match = pathname.match(/^\/w\/([^\/]+)/);
      if (match) {
        const currentSlug = match[1];
        const current = workspaces.find(w => w.slug === currentSlug);
        if (current) {
          setCurrentWorkspace(current);
        }
      }
    };

    loadUserAndWorkspaces();
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(event.target as Node)) {
        setWorkspaceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWorkspaceChange = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setWorkspaceDropdownOpen(false);
    router.push(`/w/${workspace.slug}`);
  };

  const handleWorkspaceCreated = (newWorkspace: Workspace) => {
    setWorkspaces(prev => [...prev, newWorkspace]);
    setCurrentWorkspace(newWorkspace);
    router.push(`/w/${newWorkspace.slug}`);
  };

  const reloadWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces');
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (err) {
      console.error('Failed to reload workspaces:', err);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        setUser(null);
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between">
      {/* Left side - Logo placeholder */}
      <button 
        onClick={() => router.push('/')}
        className="flex items-center hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center relative">
          <div className="w-5 h-5 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/60"></div>
        </div>
        <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Sol</span>
      </button>

      {/* Right side - Workspace selector and Avatar dropdown */}
      <div className="flex items-center space-x-4">
        {/* Workspace Selector */}
        <div className="relative" ref={workspaceDropdownRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
            className="flex items-center space-x-2 h-8 px-3 text-sm"
          >
            <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {currentWorkspace ? currentWorkspace.name : 'Workspaces'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </Button>

          {/* Workspace Dropdown */}
          {workspaceDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Switch Workspace</p>
              </div>
              
              {workspaces.length > 0 ? (
                workspaces.map((workspace) => (
                  <button
                    key={workspace.slug}
                    onClick={() => handleWorkspaceChange(workspace)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center ${
                      currentWorkspace?.slug === workspace.slug ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                    <div>
                      <div className="font-medium">{workspace.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">/{workspace.slug}</div>
                    </div>
                    {currentWorkspace?.slug === workspace.slug && (
                      <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Loading workspaces...</div>
              )}
              
              <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
              
              {/* Only show Create Workspace for admins */}
              {(user?.system_role === 'super_admin' || user?.system_role === 'admin') && (
                <button
                  onClick={() => {
                    setWorkspaceDropdownOpen(false);
                    setCreateWorkspaceOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                  Create Workspace
                </button>
              )}
              
              <button
                onClick={() => {
                  setWorkspaceDropdownOpen(false);
                  router.push('/workspaces');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              >
                <Building2 className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                All Workspaces
              </button>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="h-8 px-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          ) : (
            <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          )}
        </Button>

        {/* Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 h-8 px-2 hover:bg-gray-100"
        >
          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <img 
              src="https://i.pravatar.cc/150?img=1" 
              alt="Tony James" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling.style.display = 'flex';
              }}
            />
            <User className="w-4 h-4 text-gray-600 hidden" />
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">{user?.name || 'Loading...'}</span>
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </Button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name || 'Loading...'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || 'Loading...'}</p>
            </div>
            
            <button 
              onClick={() => {
                setDropdownOpen(false);
                router.push('/profile');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <User className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
              Profile
            </button>

            <button 
              onClick={() => {
                setDropdownOpen(false);
                router.push('/profile/api-keys');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <CreditCard className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
              API Keys
            </button>
            
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
              <Settings className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
              Settings
            </button>
            
            {/* Organization Admin Section */}
            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
            <button 
              onClick={() => {
                setDropdownOpen(false);
                router.push('/org/users');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
            >
              <User className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
              Organization Users
            </button>
            
            {/* Super Admin Section */}
            {(user?.system_role === 'super_admin') && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push('/admin/users');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Shield className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                  All Users
                </button>
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push('/admin/organizations');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <Building2 className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500" />
                  All Organizations
                </button>
              </>
            )}
            
            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
            
            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
            >
              <LogOut className="w-4 h-4 mr-3 text-red-500 dark:text-red-400" />
              Sign out
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        open={createWorkspaceOpen}
        onOpenChange={setCreateWorkspaceOpen}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </header>
  );
}
