"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Star } from 'lucide-react';

interface Project {
  id: number;
  slug: string;
  name: string;
}

interface Tag {
  id: number;
  name: string;
}

interface ControlsProps {
  workspaceSlug: string;
  layoutMode: 'constellation' | 'solar';
  onLayoutModeChange: (mode: 'constellation' | 'solar') => void;
  onFiltersChange: (filters: GraphFilters) => void;
  onResetFilters: () => void;
}

export interface GraphFilters {
  project?: string;
  tags?: string[];
  q?: string;
  favorites?: boolean;
}

export default function Controls({
  workspaceSlug,
  layoutMode,
  onLayoutModeChange,
  onFiltersChange,
  onResetFilters
}: ControlsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch(`/w/${workspaceSlug}/api/projects`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    
    loadProjects();
  }, [workspaceSlug]);

  // Load tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await fetch(`/w/${workspaceSlug}/api/tags`);
        if (response.ok) {
          const data = await response.json();
          setTags(data.tags || []);
        }
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };
    
    loadTags();
  }, [workspaceSlug]);

  // Persist settings in localStorage
  useEffect(() => {
    const settingsKey = `graph-settings-${workspaceSlug}`;
    const saved = localStorage.getItem(settingsKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      onLayoutModeChange(parsed.layoutMode || 'constellation');
    }
  }, [workspaceSlug, onLayoutModeChange]);

  // Save settings and update filters
  useEffect(() => {
    const settingsKey = `graph-settings-${workspaceSlug}`;
    localStorage.setItem(settingsKey, JSON.stringify({
      layoutMode,
      selectedProject,
      selectedTags,
      searchQuery,
      favoritesOnly
    }));
    
    onFiltersChange({
      project: selectedProject || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      q: searchQuery.trim() || undefined,
      favorites: favoritesOnly || undefined
    });
  }, [workspaceSlug, layoutMode, selectedProject, selectedTags, searchQuery, favoritesOnly, onFiltersChange]);

  const addCustomTag = () => {
    const tag = customTagInput.trim();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setCustomTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const resetFilters = () => {
    setSelectedProject('');
    setSelectedTags([]);
    setSearchQuery('');
    setFavoritesOnly(false);
    setCustomTagInput('');
    onResetFilters();
  };

  const handleLayoutModeChange = (value: string) => {
    const mode = value as 'constellation' | 'solar';
    onLayoutModeChange(mode);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="space-y-6">
        {/* Layout Mode */}
        <div>
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
            Layout Mode
          </Label>
          <Tabs value={layoutMode} onValueChange={handleLayoutModeChange}>
            <TabsList>
              <TabsTrigger value="constellation">Constellation</TabsTrigger>
              <TabsTrigger value="solar">Solar System</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-xs text-gray-500 mt-2">
            {layoutMode === 'constellation' 
              ? 'Force-directed graph where documents are stars connected by tags' 
              : 'Projects orbit around Sol like planets with documents as moons'
            }
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Project Filter */}
          <div>
            <Label htmlFor="project-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Project
            </Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.slug}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div>
            <Label htmlFor="search-query" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Search
            </Label>
            <Input
              id="search-query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
            />
          </div>

          {/* Favorites */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Documents
            </Label>
            <Button
              variant={favoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className="w-full justify-start"
            >
              <Star className={`w-4 h-4 mr-2 ${favoritesOnly ? 'fill-current' : ''}`} />
              Favorites only
            </Button>
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tag-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Tags ({selectedTags.length})
            </Label>
            <div className="space-y-2">
              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              {/* Add Tag */}
              <div className="flex gap-1">
                <Input
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                  placeholder="Add tag"
                  className="text-sm"
                />
                <Button size="sm" onClick={addCustomTag}>
                  +
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Reset Filters */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
