"use client";

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Header from '@/components/Header';
import Breadcrumbs from '@/components/Breadcrumbs';
import Controls from '@/components/visualize/Controls';
import GraphView from './GraphView';

export default function VisualizePage() {
  const params = useParams();
  const workspaceSlug = params.ws as string;
  
  const [layoutMode, setLayoutMode] = useState<'constellation' | 'solar'>('constellation');
  const [filters, setFilters] = useState<any>({});

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleFavoriteToggle = (documentId: string) => {
    // Refresh the graph data
    // This could be optimized by updating local state instead
  };

  const handleTagFilter = (tagName: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags ? [...prev.tags, tagName] : [tagName]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto p-6">
        {/* Breadcrumbs */}
        <div className="mb-4">
          <Breadcrumbs />
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Visualization
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore your research universe with interactive visualizations of documents, projects, and insights.
          </p>
        </div>

        {/* Controls */}
        <Controls
          workspaceSlug={workspaceSlug}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
          onFiltersChange={handleFiltersChange}
          onResetFilters={handleResetFilters}
        />

        {/* Graph View */}
        <GraphView
          workspaceSlug={workspaceSlug}
          layoutMode={layoutMode}
          filters={filters}
          onFavoriteToggle={handleFavoriteToggle}
          onTagFilter={handleTagFilter}
        />

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">How to Use</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• <strong>Sol</strong> (☀️) represents the center of your research universe</li>
            <li>• <strong>Projects</strong> (blue circles) orbit around Sol</li>
            <li>• <strong>Documents</strong> (purple circles) are arranged within their projects</li>
            <li>• <strong>Tags</strong> (small circles) connect related documents</li>
            <li>• <strong>Solid lines</strong> show project relationships; <strong>dashed lines</strong> show tag connections</li>
            <li>• Click any node to see details and take actions</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
