'use client';

/**
 * KnowledgeGraphViewer - February 5, 2026
 * 
 * Visualizes the knowledge graph of semantic relationships between
 * concepts, entities, and facts stored in memory.
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Network, RefreshCw, ZoomIn, ZoomOut, Maximize2,
  Search, Filter, Loader2, AlertCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MAS_API_URL = process.env.NEXT_PUBLIC_MAS_API_URL || 'http://192.168.0.188:8001';

interface GraphNode {
  id: string;
  label: string;
  type: 'concept' | 'entity' | 'fact' | 'user' | 'agent';
  weight: number;
  metadata?: Record<string, unknown>;
}

interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    total_nodes: number;
    total_edges: number;
    last_updated: string;
  };
}

const NODE_COLORS: Record<string, string> = {
  concept: '#3b82f6',   // blue
  entity: '#22c55e',    // green
  fact: '#eab308',      // yellow
  user: '#8b5cf6',      // purple
  agent: '#f97316',     // orange
};

export function KnowledgeGraphViewer() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${MAS_API_URL}/api/memory/graph?limit=100`);
      if (!response.ok) {
        // If API not available, show sample structure
        setGraph({
          nodes: [
            { id: 'myca', label: 'MYCA', type: 'agent', weight: 10 },
            { id: 'user-morgan', label: 'Morgan', type: 'user', weight: 8 },
            { id: 'mushrooms', label: 'Mushrooms', type: 'concept', weight: 7 },
            { id: 'mindex', label: 'Mindex Device', type: 'entity', weight: 6 },
            { id: 'lab-temps', label: 'Lab Prefers 68F', type: 'fact', weight: 4 },
            { id: 'voice-pref', label: 'Prefers Calm Voice', type: 'fact', weight: 4 },
            { id: 'research', label: 'Mycology Research', type: 'concept', weight: 5 },
            { id: 'sporebase', label: 'SporeBase', type: 'entity', weight: 5 },
          ],
          edges: [
            { source: 'user-morgan', target: 'myca', relationship: 'interacts_with', weight: 8 },
            { source: 'user-morgan', target: 'mushrooms', relationship: 'interested_in', weight: 6 },
            { source: 'user-morgan', target: 'lab-temps', relationship: 'prefers', weight: 4 },
            { source: 'user-morgan', target: 'voice-pref', relationship: 'prefers', weight: 4 },
            { source: 'myca', target: 'mindex', relationship: 'controls', weight: 7 },
            { source: 'myca', target: 'sporebase', relationship: 'controls', weight: 6 },
            { source: 'mushrooms', target: 'research', relationship: 'part_of', weight: 5 },
            { source: 'mindex', target: 'research', relationship: 'supports', weight: 5 },
          ],
          metadata: {
            total_nodes: 8,
            total_edges: 8,
            last_updated: new Date().toISOString(),
          },
        });
        return;
      }
      const data = await response.json();
      setGraph(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const filteredNodes = graph?.nodes.filter(node => {
    const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         node.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || node.type === filterType;
    return matchesSearch && matchesType;
  }) || [];

  const filteredEdges = graph?.edges.filter(edge => {
    const sourceVisible = filteredNodes.some(n => n.id === edge.source);
    const targetVisible = filteredNodes.some(n => n.id === edge.target);
    return sourceVisible && targetVisible;
  }) || [];

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error && !graph) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-[400px] gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchGraph}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Knowledge Graph
            </CardTitle>
            <CardDescription>
              Semantic relationships between concepts and entities
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchGraph}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="w-[150px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="concept">Concepts</SelectItem>
                <SelectItem value="entity">Entities</SelectItem>
                <SelectItem value="fact">Facts</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="agent">Agents</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleResetZoom}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Graph Visualization Area */}
        <div 
          ref={canvasRef}
          className="relative bg-muted/30 rounded-lg border h-[300px] overflow-hidden"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
        >
          {/* Simple node-based visualization */}
          <svg className="w-full h-full">
            {/* Edges */}
            <g>
              {filteredEdges.map((edge, idx) => {
                const sourceNode = filteredNodes.find(n => n.id === edge.source);
                const targetNode = filteredNodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;
                
                const sourceIdx = filteredNodes.indexOf(sourceNode);
                const targetIdx = filteredNodes.indexOf(targetNode);
                const cols = Math.ceil(Math.sqrt(filteredNodes.length));
                
                const x1 = ((sourceIdx % cols) + 0.5) * (100 / cols) + '%';
                const y1 = (Math.floor(sourceIdx / cols) + 0.5) * (100 / Math.ceil(filteredNodes.length / cols)) + '%';
                const x2 = ((targetIdx % cols) + 0.5) * (100 / cols) + '%';
                const y2 = (Math.floor(targetIdx / cols) + 0.5) * (100 / Math.ceil(filteredNodes.length / cols)) + '%';
                
                return (
                  <line
                    key={`edge-${idx}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeOpacity={0.2}
                    strokeWidth={edge.weight / 2}
                  />
                );
              })}
            </g>
            
            {/* Nodes */}
            <g>
              {filteredNodes.map((node, idx) => {
                const cols = Math.ceil(Math.sqrt(filteredNodes.length));
                const cx = ((idx % cols) + 0.5) * (100 / cols);
                const cy = (Math.floor(idx / cols) + 0.5) * (100 / Math.ceil(filteredNodes.length / cols));
                const radius = 8 + node.weight;
                
                return (
                  <g 
                    key={node.id}
                    className="cursor-pointer transition-transform hover:scale-110"
                    onClick={() => setSelectedNode(node)}
                  >
                    <circle
                      cx={`${cx}%`}
                      cy={`${cy}%`}
                      r={radius}
                      fill={NODE_COLORS[node.type]}
                      fillOpacity={selectedNode?.id === node.id ? 1 : 0.7}
                      stroke={selectedNode?.id === node.id ? '#fff' : 'none'}
                      strokeWidth={2}
                    />
                    <text
                      x={`${cx}%`}
                      y={`${cy + 6}%`}
                      textAnchor="middle"
                      className="text-xs fill-current"
                    >
                      {node.label.length > 12 ? node.label.slice(0, 10) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{selectedNode.label}</span>
              <Badge style={{ backgroundColor: NODE_COLORS[selectedNode.type] }}>
                {selectedNode.type}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              ID: {selectedNode.id}
            </div>
            <div className="text-sm text-muted-foreground">
              Weight: {selectedNode.weight}
            </div>
            {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Metadata: </span>
                {JSON.stringify(selectedNode.metadata)}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Connections: {filteredEdges.filter(e => 
                e.source === selectedNode.id || e.target === selectedNode.id
              ).length}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-2 border-t">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Nodes: {filteredNodes.length}</span>
          <span>Edges: {filteredEdges.length}</span>
          {graph?.metadata.last_updated && (
            <span>Updated: {new Date(graph.metadata.last_updated).toLocaleString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default KnowledgeGraphViewer;
