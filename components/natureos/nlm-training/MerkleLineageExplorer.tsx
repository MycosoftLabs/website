'use client';

import { useState, useEffect, useRef } from 'react';
import { useAllFrames } from '@/lib/nlm/firebase-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Shield, Clock, Database, Info, Maximize2, Minimize2, Search, Filter } from 'lucide-react';
import * as d3 from 'd3';

interface FrameNode extends d3.HierarchyNode<any> {
  x: number;
  y: number;
}

interface MerkleLineageExplorerProps {
  modelId?: string;
  userId?: string;
  isAdmin?: boolean;
}

export function MerkleLineageExplorer({ modelId, userId, isAdmin }: MerkleLineageExplorerProps) {
  const { frames, loading } = useAllFrames(userId, isAdmin);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedFrame = frames.find(f => f.id === selectedFrameId);

  useEffect(() => {
    if (loading || frames.length === 0 || !svgRef.current) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = 600;

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create hierarchy
    // We need to find the root(s). A root has no parent_frame_root or its parent is not in the list.
    const frameMap = new Map(frames.map(f => [f.frame_root, f]));

    // For simplicity, we'll build a forest and then a single root if needed,
    // but d3.stratify expects a single root or we handle multiple.
    // Let's filter frames that have parents not in the current set to be our "roots"
    const roots = frames.filter(f => !frameMap.has(f.parent_frame_root));

    let data: any[] = [];
    if (roots.length > 1) {
      // Add a virtual root
      data = [
        { frame_root: 'VIRTUAL_ROOT', parentId: null, id: 'virtual', uncertainty: 0 },
        ...frames.map(f => ({
          ...f,
          parentId: frameMap.has(f.parent_frame_root) ? f.parent_frame_root : 'VIRTUAL_ROOT'
        }))
      ];
    } else {
      data = frames.map(f => ({
        ...f,
        parentId: frameMap.has(f.parent_frame_root) ? f.parent_frame_root : null
      }));
    }

    try {
      const stratify = d3.stratify<any>()
        .id(d => d.frame_root)
        .parentId(d => d.parentId);

      const root = stratify(data);

      const treeLayout = d3.tree().size([width - 100, height - 200]);
      treeLayout(root);

      const g = svg.append('g')
        .attr('transform', 'translate(50, 50)');

      // Links
      g.selectAll('.link')
        .data(root.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', d3.linkVertical()
          .x((d: any) => d.x)
          .y((d: any) => d.y) as any)
        .attr('fill', 'none')
        .attr('stroke', '#27272a')
        .attr('stroke-width', 2);

      // Nodes
      const node = g.selectAll('.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
        .on('click', (event, d: any) => {
          setSelectedFrameId(d.data.id);
        })
        .style('cursor', 'pointer');

      node.append('circle')
        .attr('r', 8)
        .attr('fill', (d: any) => d.data.id === selectedFrameId ? '#fff' : '#18181b')
        .attr('stroke', (d: any) => d.data.uncertainty < 0.2 ? '#10b981' : '#f59e0b')
        .attr('stroke-width', 2);

      node.append('text')
        .attr('dy', '1.5em')
        .attr('text-anchor', 'middle')
        .text((d: any) => d.data.frame_root.slice(0, 8) + '...')
        .attr('fill', '#71717a')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace');

    } catch (e) {
      console.error("D3 Stratify Error:", e);
      // Fallback for disconnected components or multiple roots
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#71717a')
        .text("Complex lineage detected. Stratification failed.");
    }

  }, [frames, loading, selectedFrameId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tight text-white">Merkle Lineage</h2>
          <p className="text-zinc-500 text-lg">Trace the provenance and causal chain of cognitive states.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-all"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <span className="px-2 text-[10px] font-mono text-zinc-500">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white transition-all"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
          <button className="p-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Lineage Map */}
        <div className="lg:col-span-3 relative bg-zinc-950 border border-zinc-800 rounded-[40px] overflow-hidden group h-[600px]" ref={containerRef}>
          <div className="absolute top-6 left-8 flex items-center gap-3 z-10">
            <div className="px-3 py-1 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-full text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <GitBranch className="w-3 h-3" />
              Causal Chain
            </div>
            <div className="px-3 py-1 bg-emerald-900/20 border border-emerald-800/50 rounded-full text-[10px] font-mono text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-3 h-3" />
              AVANI Verified
            </div>
          </div>

          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin" />
            </div>
          ) : frames.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-12">
              <GitBranch className="w-12 h-12 text-zinc-800 mb-4" />
              <h3 className="text-xl font-semibold text-zinc-300">No lineage data</h3>
              <p className="text-zinc-500 mt-2 max-w-xs">Ingest nature frames to visualize their causal relationships.</p>
            </div>
          ) : (
            <svg
              ref={svgRef}
              className="w-full h-full transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
            />
          )}

          {/* Legend */}
          <div className="absolute bottom-6 left-8 flex items-center gap-6 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Low Uncertainty</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>High Uncertainty</span>
            </div>
          </div>
        </div>

        {/* Provenance Inspector */}
        <div className="lg:col-span-1 space-y-6">
          <AnimatePresence mode="wait">
            {selectedFrame ? (
              <motion.div
                key={selectedFrame.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 bg-zinc-900/40 border border-zinc-800 rounded-[32px] space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Provenance Inspector
                  </h3>
                  <p className="text-xs text-zinc-500">Rooted cognitive state analysis.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Frame Root</span>
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-white break-all">
                      {selectedFrame.frame_root}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: 'Self Root', value: selectedFrame.self_root, icon: Database },
                      { label: 'World Root', value: selectedFrame.world_root, icon: Shield },
                      { label: 'Event Root', value: selectedFrame.event_root, icon: Clock },
                    ].map((root) => (
                      <div key={root.label} className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-2 group hover:border-zinc-700 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{root.label}</span>
                          <root.icon className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                        </div>
                        <p className="text-[10px] font-mono text-zinc-400 truncate">{root.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Uncertainty</span>
                      <span className={selectedFrame.uncertainty < 0.2 ? 'text-emerald-500' : 'text-amber-500'}>
                        {(selectedFrame.uncertainty * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${selectedFrame.uncertainty < 0.2 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${selectedFrame.uncertainty * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="p-8 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4 h-full">
                <Info className="w-12 h-12 text-zinc-800" />
                <p className="text-sm text-zinc-500">Select a node in the causal chain to inspect its provenance.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
