'use client';

import { useState, useEffect, useRef } from 'react';
import { useCognitiveGraphs, useModels } from '@/lib/nlm/firebase-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  User,
  Zap,
  Activity,
  Info,
  GitBranch,
  Shield,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  ChevronRight,
  Database,
  Share2,
  Cpu
} from 'lucide-react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  metadata?: any;
  lineage?: string[];
}

interface Edge extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  type: string;
  weight: number;
  provenance?: string;
  metadata?: any;
}

export function StateGraphConsole({ userId, modelId, isAdmin }: { userId: string; modelId?: string; isAdmin?: boolean }) {
  const { models } = useModels(userId, isAdmin);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(modelId || null);
  const [prevModelId, setPrevModelId] = useState<string | null>(modelId || null);
  const [graphType, setGraphType] = useState<'world' | 'self' | 'action'>('world');

  const currentModelIdFromProp = modelId || null;
  if (currentModelIdFromProp !== prevModelId) {
    setPrevModelId(currentModelIdFromProp);
    setSelectedModelId(currentModelIdFromProp);
  }

  const { graphs, loading } = useCognitiveGraphs(selectedModelId || models[0]?.id);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeGraph = graphs.find(g => g.type === graphType);

  const currentModelId = selectedModelId || models[0]?.id;

  useEffect(() => {
    if (loading || !activeGraph || !svgRef.current) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Prepare data
    const nodes: Node[] = activeGraph.nodes.map((n: any) => ({ ...n }));
    const links: Edge[] = activeGraph.edges.map((e: any) => ({ ...e }));

    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Edge>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Arrow markers
    svg.append('defs').selectAll('marker')
      .data(['causal', 'associative', 'hierarchical', 'temporal'])
      .enter().append('marker')
      .attr('id', d => `arrowhead-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d =>
        d === 'causal' ? '#f59e0b' :
        d === 'hierarchical' ? '#10b981' :
        d === 'temporal' ? '#0ea5e9' : '#71717a'
      );

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', d =>
        d.type === 'causal' ? '#f59e0b' :
        d.type === 'hierarchical' ? '#10b981' :
        d.type === 'temporal' ? '#0ea5e9' : '#27272a'
      )
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight || 1) * 2)
      .attr('marker-end', d => `url(#arrowhead-${d.type})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedEdge(d);
        setSelectedNode(null);
      });

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        setSelectedEdge(null);
      })
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any);

    node.append('circle')
      .attr('r', 20)
      .attr('fill', d =>
        d.type === 'entity' ? '#18181b' :
        d.type === 'event' ? '#0ea5e9' :
        d.type === 'concept' ? '#8b5cf6' : '#27272a'
      )
      .attr('stroke', d => selectedNode?.id === d.id ? '#fff' : '#3f3f46')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .text(d => d.label)
      .attr('fill', '#a1a1aa')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold');

    // Hyperedges (Visualized as hulls or special markers)
    if (activeGraph.hyperedges) {
      activeGraph.hyperedges.forEach((he: any) => {
        const heNodes = nodes.filter(n => he.nodes.includes(n.id));
        if (heNodes.length > 2) {
          // Draw a hull or a central node
          // For now, let's just highlight them or draw a faint circle around them
        }
      });
    }

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [activeGraph, loading, selectedNode, selectedEdge]);

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-white">State Graph Console</h2>
          <p className="text-zinc-500 text-lg">Inspect world, self, and action state topologies.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currentModelId || ''}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-white/10"
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            {[
              { id: 'world', label: 'WORLD', icon: Globe },
              { id: 'self', label: 'SELF', icon: User },
              { id: 'action', label: 'ACTION', icon: Zap },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setGraphType(type.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  graphType === type.id
                    ? 'bg-zinc-800 text-white shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <type.icon className="w-3.5 h-3.5" />
                {type.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.1))}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-all"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <span className="px-2 text-[10px] font-mono text-zinc-500">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(4, prev + 0.1))}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-all"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
        {/* Graph Canvas */}
        <div
          className="lg:col-span-3 relative bg-zinc-950 border border-zinc-800 rounded-[40px] overflow-hidden group"
          ref={containerRef}
          onClick={() => {
            setSelectedNode(null);
            setSelectedEdge(null);
          }}
        >
          <div className="absolute top-6 left-8 flex items-center gap-3 z-10">
            <div className="px-3 py-1 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-full text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Live Topology
            </div>
            {activeGraph && (
              <div className="px-3 py-1 bg-emerald-900/20 border border-emerald-800/50 rounded-full text-[10px] font-mono text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3 h-3" />
                {activeGraph.nodes.length} Nodes • {activeGraph.edges.length} Edges
              </div>
            )}
          </div>

          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
            </div>
          ) : !activeGraph ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-12">
              <Share2 className="w-12 h-12 text-zinc-800 mb-4" />
              <h3 className="text-xl font-semibold text-zinc-300">No {graphType} graph data</h3>
              <p className="text-zinc-500 mt-2 max-w-xs">Initialize training to begin generating cognitive state graphs.</p>
            </div>
          ) : (
            <svg
              ref={svgRef}
              className="w-full h-full"
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-6 left-8 flex items-center gap-6 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Causal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Hierarchical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Temporal</span>
            </div>
          </div>
        </div>

        {/* Inspectors */}
        <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={`node-${selectedNode.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[32px] space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Node Metadata
                  </h3>
                  <p className="text-xs text-zinc-500">Inspecting: {selectedNode.label}</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Type</p>
                      <p className="text-sm font-bold text-white capitalize">{selectedNode.type}</p>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">ID</p>
                      <p className="text-[10px] font-mono text-zinc-400 truncate">{selectedNode.id}</p>
                    </div>
                  </div>

                  {selectedNode.metadata && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Properties</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedNode.metadata).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                            <span className="text-[10px] text-zinc-500 font-mono">{key}</span>
                            <span className="text-xs text-zinc-300">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedNode.lineage && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2">
                        <GitBranch className="w-3 h-3" />
                        Graph Lineage
                      </h4>
                      <div className="space-y-2">
                        {selectedNode.lineage.map((root, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-zinc-950/30 border border-zinc-800/50 rounded-lg">
                            <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                            <span className="text-[9px] font-mono text-zinc-500 truncate">{root}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : selectedEdge ? (
              <motion.div
                key={`edge-${selectedEdge.source}-${selectedEdge.target}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[32px] space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Relation Provenance
                  </h3>
                  <p className="text-xs text-zinc-500">Inspecting causal link</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                    <div className="text-center">
                      <p className="text-[9px] text-zinc-500 uppercase font-bold">Source</p>
                      <p className="text-xs text-white font-mono">{(selectedEdge.source as Node).label}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700" />
                    <div className="text-center">
                      <p className="text-[9px] text-zinc-500 uppercase font-bold">Target</p>
                      <p className="text-xs text-white font-mono">{(selectedEdge.target as Node).label}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Type</p>
                      <p className="text-sm font-bold text-white capitalize">{selectedEdge.type}</p>
                    </div>
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Weight</p>
                      <p className="text-sm font-bold text-white">{(selectedEdge.weight || 0).toFixed(3)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Provenance Hash</h4>
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-[10px] text-zinc-400 break-all leading-relaxed">
                      {selectedEdge.provenance || '0x' + (selectedEdge.source as Node).id.slice(0, 8) + (selectedEdge.target as Node).id.slice(0, 8) + '...'}
                    </div>
                  </div>

                  {selectedEdge.metadata && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Metadata</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedEdge.metadata).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                            <span className="text-[10px] text-zinc-500 font-mono">{key}</span>
                            <span className="text-xs text-zinc-300">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="p-8 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4 h-full">
                <Cpu className="w-12 h-12 text-zinc-800" />
                <p className="text-sm text-zinc-500">Select a node or relation to inspect its metadata and provenance.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
