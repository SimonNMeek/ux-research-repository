"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import NodeDetails from '@/components/visualize/NodeDetails';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraphNode, GraphLink } from '@/lib/db/graph';

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  meta: {
    workspace: { id: number; slug: string; name: string };
    counts: { documents: number; tags: number; projects: number };
    filters: any;
    capped?: boolean;
  };
}

interface GraphViewProps {
  workspaceSlug: string;
  layoutMode: 'constellation' | 'solar';
  filters: any;
  onFavoriteToggle?: (documentId: string) => void;
  onTagFilter?: (tagName: string) => void;
}

export default function GraphView({ 
  workspaceSlug, 
  layoutMode, 
  filters,
  onFavoriteToggle,
  onTagFilter 
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Fetch graph data
  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters.project) params.set('project', filters.project);
      if (filters.tags) params.set('tags', filters.tags.join(','));
      if (filters.q) params.set('q', filters.q);
      if (filters.favorites) params.set('favorites', 'true');
      
      const response = await fetch(`/w/${workspaceSlug}/api/graph?${params}`);
      if (!response.ok) throw new Error('Failed to fetch graph data');
      
      const data = await response.json();
      setGraphData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, filters]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Create and destroy cytoscape instance
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Convert our nodes/links to cytoscape format
    const elements = [
      ...graphData.nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          projectSlug: node.projectSlug,
          favorite: node.favorite,
          created_at: node.created_at
        }
      })),
      ...graphData.links.map(link => ({
        data: {
          id: `${link.source}->${link.target}`,
          source: link.source,
          target: link.target,
          kind: link.kind
        }
      }))
    ];

    // Create cytoscape instance
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#6366f1',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'font-weight': 'bold',
            'color': '#fff',
            'width': '30px',
            'height': '30px',
            'border-width': 2,
            'border-color': '#1f2937'
          }
        },
        {
          selector: 'node[type="sol"]',
          style: {
            'background-color': '#f59e53',
            'width': '80px',
            'height': '80px',
            'font-size': '16px',
            'border-width': 3,
            'border-color': '#d97706'
          }
        },
        {
          selector: 'node[type="project"]',
          style: {
            'background-color': '#3b82f6',
            'width': '50px',
            'height': '50px',
            'font-size': '14px'
          }
        },
        {
          selector: 'node[type="tag"]',
          style: {
            'background-color': '#8b5cf6',
            'width': '40px',
            'height': '40px',
            'font-size': '11px'
          }
        },
        {
          selector: 'node[favorite="true"]',
          style: {
            'border-width': 3,
            'border-color': '#dc2626',
            'box-shadow': '0 0 10px #dc2626'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#6b7280',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle'
          }
        },
        {
          selector: 'edge[kind="ORBITS"]',
          style: {
            'line-color': '#f59e0b',
            'width': 3,
            'curve-style': 'straight',
            'target-arrow-shape': 'none'
          }
        },
        {
          selector: 'edge[kind="IN_PROJECT"]',
          style: {
            'line-color': '#3b82f6',
            'width': 2,
            'curve-style': 'bezier'
          }
        },
        {
          selector: 'edge[kind="TAGGED_WITH"]',
          style: {
            'line-color': '#8b5cf6',
            'width': 1,
            'curve-style': 'bezier',
            'line-dash-pattern': [5, 5]
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        randomize: false
      }
    });

    // Handle clicks
    cyRef.current.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data();
      if (nodeData.type === 'sol') {
        setSelectedNode({
          id: nodeData.id,
          type: nodeData.type,
          label: nodeData.label
        });
      } else {
        setSelectedNode({
          id: nodeData.id,
          type: nodeData.type,
          label: nodeData.label,
          projectSlug: nodeData.projectSlug,
          favorite: nodeData.favorite,
          created_at: nodeData.created_at
        });
      }
    });

    // Fit to view
    cyRef.current.fit();

    // Cleanup
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [graphData, layoutMode]);

  const handleResetView = () => {
    if (cyRef.current) {
      cyRef.current.fit();
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error</h3>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Data Found</h3>
        <p className="text-gray-600 dark:text-gray-400">
          No documents match your current filters. Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {graphData.meta.counts.documents} documents, {graphData.meta.counts.projects} projects, {graphData.meta.counts.tags} tags
          {graphData.meta.capped && (
            <Badge variant="outline" className="ml-2">Truncated</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleResetView}>
          Reset View
        </Button>
      </div>

      {/* Graph Container */}
      <div 
        ref={containerRef} 
        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ height: '600px', width: '100%' }}
      />

      {/* Node Details Modal */}
      <NodeDetails
        node={selectedNode}
        open={!!selectedNode}
        onOpenChange={(open) => !open && setSelectedNode(null)}
        onFavoriteToggle={onFavoriteToggle}
        onTagFilter={onTagFilter}
      />
    </div>
  );
}
